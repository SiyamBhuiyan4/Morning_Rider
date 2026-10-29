import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  ArrowRight,
  Barcode,
  Bike,
  Building2,
  Camera,
  CameraOff,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Flashlight,
  FlashlightOff,
  Keyboard,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  Truck,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { CATEGORY, STATUS, dateTime, tk, type Status } from "../lib/format";
import { Button, Card, Select, Spinner, StatusBadge, cx } from "./ui";
import { t } from "../lib/prefs";

interface DetectedBarcode {
  rawValue: string;
  format: string;
}

interface BarcodeDetectorInstance {
  detect(source: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => BarcodeDetectorInstance;

export interface SmartScannerModalProps {
  open: boolean;
  onClose: () => void;
  onSelectParcel?: (parcelId: Id<"parcels">) => void;
  initialCode?: string;
}

interface SessionScanItem {
  id: string;
  code: string;
  recipientName: string;
  status: Status;
  updatedStatus?: Status;
  timestamp: number;
}

export function SmartScannerModal({
  open,
  onClose,
  onSelectParcel,
  initialCode = "",
}: SmartScannerModalProps) {
  const { token, me } = useAuthed();
  const toast = useToast();

  // Active searched code & input
  const [inputCode, setInputCode] = useState(initialCode);
  const [activeCode, setActiveCode] = useState(initialCode.trim().toUpperCase());

  // Scanner hardware state
  const [cameraActive, setCameraActive] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [copied, setCopied] = useState(false);

  // Status dispatch state
  const [updatingStatus, setUpdatingStatus] = useState<Status | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string>("");
  const [recentScans, setRecentScans] = useState<SessionScanItem[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScannedRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Queries & mutations
  const parcelData = useQuery(
    api.parcels.getByTrackingCode,
    activeCode && token ? { token, code: activeCode } : "skip",
  );
  const riders = useQuery(api.users.options, me.role === "admin" ? { token, role: "rider" } : "skip");
  const updateStatusMutation = useMutation(api.parcels.updateStatus);

  // Check if browser BarcodeDetector is available
  const hasDetector = typeof window !== "undefined" && "BarcodeDetector" in window;

  // Synthesized Web Audio API sound generator
  const playBeep = useCallback(
    (type: "scan" | "success" | "error" = "scan") => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (type === "scan") {
          // Sharp POS barcode beep (1650 Hz chirp)
          osc.type = "sine";
          osc.frequency.setValueAtTime(1650, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.08);
        } else if (type === "success") {
          // Upbeat two-tone dispatch confirmation (880 Hz -> 1320 Hz)
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.09);
          gain.gain.setValueAtTime(0.22, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.2);
        } else {
          // Low buzz for not found / error
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(240, ctx.currentTime);
          gain.gain.setValueAtTime(0.18, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.2);
        }

        setTimeout(() => {
          try {
            void ctx.close();
          } catch {}
        }, 350);
      } catch (err) {
        console.debug("AudioContext error:", err);
      }
    },
    [soundEnabled],
  );

  // Normalize scanned string (extract MRXXXXXXXX or uppercase)
  const extractTrackingCode = (raw: string): string => {
    const trimmed = raw.trim();
    const mrMatch = trimmed.match(/MR[A-Z0-9]{8}/i);
    if (mrMatch) return mrMatch[0].toUpperCase();
    return trimmed.toUpperCase();
  };

  // Handle a new barcode detection (from camera or USB scanner)
  const handleBarcodeScanned = useCallback(
    (rawText: string) => {
      const code = extractTrackingCode(rawText);
      if (!code) return;

      const now = Date.now();
      // Throttle identical scans within 2 seconds
      if (lastScannedRef.current.code === code && now - lastScannedRef.current.time < 2000) {
        return;
      }

      lastScannedRef.current = { code, time: now };
      playBeep("scan");
      setInputCode(code);
      setActiveCode(code);
    },
    [playBeep],
  );

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setTorchOn(false);
    setHasTorch(false);
  }, []);

  // Initialize and run camera video stream
  useEffect(() => {
    if (!open || !cameraActive || scanMode !== "camera") {
      stopCamera();
      return;
    }

    let isMounted = true;
    let detector: BarcodeDetectorInstance | null = null;

    const startCamera = async () => {
      setCameraError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(t("Camera access is not supported on this device/browser."));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Inspect torch support on back camera
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack && "getCapabilities" in videoTrack) {
          const caps = (videoTrack.getCapabilities() as { torch?: boolean }) || {};
          setHasTorch(Boolean(caps.torch));
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Setup BarcodeDetector if available
        const DetectorClass = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor })
          .BarcodeDetector;
        if (DetectorClass) {
          try {
            detector = new DetectorClass({
              formats: ["code_128", "qr_code", "code_39", "ean_13", "ean_8", "upc_a"],
            });
          } catch {
            detector = new DetectorClass();
          }
        }

        // Video scan loop throttled to ~10 FPS for optimal battery and responsive detection
        let lastFrameTime = 0;
        const scanFrame = async (timestamp: number) => {
          if (!isMounted) return;

          if (detector && videoRef.current && videoRef.current.readyState >= 2) {
            if (timestamp - lastFrameTime > 120) {
              lastFrameTime = timestamp;
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0]?.rawValue) {
                  handleBarcodeScanned(barcodes[0].rawValue);
                }
              } catch {
                // Ignore transient frame detection drops
              }
            }
          }
          animFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("Permission denied") || message.includes("NotAllowedError")) {
          setCameraError(t("Camera permission was denied. Please allow camera access in browser settings."));
        } else if (message.includes("NotFoundError") || message.includes("DevicesNotFoundError")) {
          setCameraError(t("No camera found on this device."));
        } else {
          setCameraError(t("Could not start camera: {msg}", { msg: message }));
        }
      }
    };

    void startCamera();

    return () => {
      isMounted = false;
      stopCamera();
    };
  }, [open, cameraActive, scanMode, handleBarcodeScanned, stopCamera]);

  // Flashlight / Torch toggle
  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const nextState = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: nextState } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(nextState);
    } catch (err) {
      toast.error(t("Failed to toggle flashlight: {msg}", { msg: String(err) }));
    }
  };

  // Keyboard shortcut & USB Laser Barcode Scanner listener
  useEffect(() => {
    if (!open) return;

    let scanBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes modal
      if (e.key === "Escape") {
        onClose();
        return;
      }

      // Check if user is typing in standard input
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");

      const now = Date.now();
      // Rapid keyboard keystrokes (< 50ms interval) usually indicate a hardware USB laser barcode scanner
      if (e.key === "Enter") {
        if (!isInput && scanBuffer.length >= 4) {
          handleBarcodeScanned(scanBuffer);
          scanBuffer = "";
          e.preventDefault();
        }
      } else if (!isInput && e.key.length === 1) {
        if (now - lastKeyTime > 150) {
          scanBuffer = "";
        }
        scanBuffer += e.key;
        lastKeyTime = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, handleBarcodeScanned]);

  // Record scan in session history when parcel data arrives
  useEffect(() => {
    if (parcelData?.parcel) {
      setRecentScans((prev) => {
        if (prev.some((item) => item.code === parcelData.parcel.trackingCode)) {
          return prev;
        }
        return [
          {
            id: parcelData.parcel._id,
            code: parcelData.parcel.trackingCode,
            recipientName: parcelData.parcel.recipientName,
            status: parcelData.parcel.status,
            timestamp: Date.now(),
          },
          ...prev.slice(0, 9),
        ];
      });
      // Pre-fill rider if one is already assigned
      if (parcelData.parcel.deliveryRiderId) {
        setSelectedRiderId(parcelData.parcel.deliveryRiderId);
      }
    }
  }, [parcelData]);

  // Manual code submit
  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = extractTrackingCode(inputCode);
    if (!cleaned) return;
    playBeep("scan");
    setActiveCode(cleaned);
  };

  // Status Action button click
  const handleStatusUpdate = async (newStatus: Status) => {
    if (!parcelData?.parcel) return;
    const parcel = parcelData.parcel;

    // Check rider requirement for "out_for_delivery"
    let riderId: Id<"users"> | undefined = undefined;
    if (newStatus === "out_for_delivery") {
      if (me.role === "admin") {
        const idToUse = selectedRiderId || parcel.deliveryRiderId;
        if (!idToUse) {
          toast.error(t("Please select a delivery rider before marking Out for Delivery."));
          return;
        }
        riderId = idToUse as Id<"users">;
      }
    }

    setUpdatingStatus(newStatus);
    try {
      await updateStatusMutation({
        token,
        id: parcel._id,
        to: newStatus,
        deliveryRiderId: riderId,
        collectedAmount: newStatus === "delivered" ? parcel.codAmount : undefined,
      });

      playBeep("success");
      toast.ok(t("Status updated to {status}!", { status: STATUS[newStatus].label }));

      // Update session history entry
      setRecentScans((prev) =>
        prev.map((item) =>
          item.code === parcel.trackingCode ? { ...item, updatedStatus: newStatus } : item,
        ),
      );
    } catch (err) {
      playBeep("error");
      toast.error(err);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleCopyCode = () => {
    if (!activeCode) return;
    void navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetForNext = () => {
    setInputCode("");
    setActiveCode("");
    inputRef.current?.focus();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/80 backdrop-blur-md p-2 sm:p-4 animate-fade-in"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className="flex flex-col w-full max-w-2xl max-h-[94vh] rounded-3xl bg-surface border border-line shadow-[var(--shadow-pop)] overflow-hidden animate-rise"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4 bg-surface/90">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
              <QrCode className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-ink">{t("Smart Scanner")}</h2>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand uppercase tracking-wider">
                  {t("POS / Laser & Camera")}
                </span>
              </div>
              <p className="text-xs text-ink-3">
                {t("Scan barcodes, QR codes or type tracking numbers")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Audio Feedback Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className={cx(
                "p-2 rounded-xl transition-colors",
                soundEnabled
                  ? "bg-brand-50 text-brand hover:bg-brand-100 dark:bg-brand-500/15"
                  : "bg-page text-ink-3 hover:text-ink",
              )}
              title={soundEnabled ? t("Sound On (Click to Mute)") : t("Sound Off (Click to Enable)")}
              aria-label={t("Toggle Beep Sound")}
            >
              {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-ink-3 hover:bg-page hover:text-ink transition-colors"
              aria-label={t("Close")}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-5 space-y-4 flex-1">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-page p-1 border border-line">
            <button
              type="button"
              onClick={() => setScanMode("camera")}
              className={cx(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all",
                scanMode === "camera"
                  ? "bg-surface text-brand shadow-sm"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              <Camera className="size-4" />
              {t("Camera Stream")}
            </button>
            <button
              type="button"
              onClick={() => {
                setScanMode("manual");
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              className={cx(
                "flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all",
                scanMode === "manual"
                  ? "bg-surface text-brand shadow-sm"
                  : "text-ink-2 hover:text-ink",
              )}
            >
              <Keyboard className="size-4" />
              {t("USB Laser / Manual")}
            </button>
          </div>

          {/* Camera Viewport Area */}
          {scanMode === "camera" && (
            <div className="relative overflow-hidden rounded-2xl bg-navy-950 border border-line aspect-[16/10] sm:aspect-[16/9] flex items-center justify-center shadow-inner">
              {cameraActive && !cameraError ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                  />

                  {/* High-tech Viewfinder Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="relative w-64 h-40 sm:w-80 sm:h-48 border-2 border-white/20 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.6)]">
                      {/* Reticle Corner Marks */}
                      <span className="absolute top-0 left-0 size-5 border-t-4 border-l-4 border-brand rounded-tl-lg" />
                      <span className="absolute top-0 right-0 size-5 border-t-4 border-r-4 border-brand rounded-tr-lg" />
                      <span className="absolute bottom-0 left-0 size-5 border-b-4 border-l-4 border-brand rounded-bl-lg" />
                      <span className="absolute bottom-0 right-0 size-5 border-b-4 border-r-4 border-brand rounded-br-lg" />

                      {/* Animated Laser Scanning Line */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand to-transparent shadow-[0_0_12px_#f57a10] animate-scan-beam" />
                    </div>
                  </div>

                  {/* Browser BarcodeDetector Warning if unsupported */}
                  {!hasDetector && (
                    <div className="absolute top-3 inset-x-3 pointer-events-auto">
                      <div className="flex items-center gap-2 rounded-xl bg-amber-500/90 text-navy-950 text-xs font-semibold px-3 py-1.5 shadow-md">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>{t("Browser BarcodeDetector API not detected. Use manual or USB laser scanner below.")}</span>
                      </div>
                    </div>
                  )}

                  {/* Floating Camera Controls Toolbar */}
                  <div className="absolute bottom-3 inset-x-3 flex items-center justify-between pointer-events-auto">
                    <div className="flex items-center gap-1.5 bg-navy-900/80 backdrop-blur-md p-1 rounded-xl border border-white/10 text-white text-xs font-medium px-2.5 py-1">
                      <Barcode className="size-3.5 text-brand" />
                      <span>{t("Aim at label barcode")}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Torch Button */}
                      {hasTorch && (
                        <button
                          type="button"
                          onClick={toggleTorch}
                          className={cx(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md",
                            torchOn
                              ? "bg-sun text-navy-950"
                              : "bg-navy-900/80 backdrop-blur-md text-white hover:bg-navy-800 border border-white/10",
                          )}
                        >
                          {torchOn ? <Flashlight className="size-3.5" /> : <FlashlightOff className="size-3.5" />}
                          {torchOn ? t("Torch On") : t("Torch")}
                        </button>
                      )}

                      {/* Camera Pause Toggle */}
                      <button
                        type="button"
                        onClick={() => setCameraActive(false)}
                        className="p-2 rounded-xl bg-navy-900/80 backdrop-blur-md text-white hover:bg-navy-800 border border-white/10 transition-colors"
                        title={t("Pause camera")}
                      >
                        <CameraOff className="size-4" />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-white/10 text-brand">
                    <CameraOff className="size-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">
                      {cameraError ? t("Camera Unavailable") : t("Camera Paused")}
                    </p>
                    <p className="text-xs text-white/60 max-w-sm mt-1">
                      {cameraError || t("Camera stream is currently stopped. Turn it back on or use the USB laser scanner.")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Camera}
                    onClick={() => {
                      setCameraError(null);
                      setCameraActive(true);
                    }}
                  >
                    {t("Start Camera")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Input Box: Supports Instant Paste & USB Laser Barcode Scanner */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
                <Search className="size-4" />
              </div>
              <input
                ref={inputRef}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder={t("Scan barcode with USB scanner or paste MRXXXXXXXX…")}
                className="w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:bg-page h-11 pl-10 pr-24 font-mono font-medium tracking-wide uppercase"
                autoComplete="off"
                autoFocus={scanMode === "manual"}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {inputCode && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputCode("");
                      setActiveCode("");
                    }}
                    className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-navy-50"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
                <Button size="sm" type="submit">
                  {t("Lookup")}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-ink-3 flex items-center gap-1.5 px-1">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("USB Laser Scanners type and hit Enter automatically. Instant paste supported.")}
            </p>
          </form>

          {/* Matched Parcel Card Details */}
          {activeCode && (
            <div className="animate-rise space-y-4">
              {parcelData === undefined ? (
                <div className="rounded-2xl border border-line bg-page p-6 flex flex-col items-center justify-center">
                  <Spinner />
                  <p className="mt-2 text-xs text-ink-3">{t("Looking up parcel {code}…", { code: activeCode })}</p>
                </div>
              ) : parcelData === null ? (
                <div className="rounded-2xl border border-dashed border-red-300 bg-red-50/50 p-5 text-center dark:border-red-900 dark:bg-red-950/20">
                  <AlertCircle className="size-8 text-red-500 mx-auto" />
                  <p className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
                    {t("No parcel found for {code}", { code: activeCode })}
                  </p>
                  <p className="mt-1 text-xs text-ink-3">
                    {t("Check if the tracking code is correct or belongs to another merchant/rider.")}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={RefreshCw}
                    className="mt-3"
                    onClick={handleResetForNext}
                  >
                    {t("Clear & Scan Next")}
                  </Button>
                </div>
              ) : (
                <Card className="p-4 sm:p-5 border-brand/20 bg-surface space-y-4 shadow-md">
                  {/* Parcel Header & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <div className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand dark:bg-brand-500/15">
                        <Package className="size-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base sm:text-lg font-bold text-ink">
                            {parcelData.parcel.trackingCode}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyCode}
                            className="p-1 rounded-md text-ink-3 hover:text-ink hover:bg-page transition-colors"
                            title={t("Copy Tracking Code")}
                          >
                            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                          </button>
                        </div>
                        <p className="text-[11px] text-ink-3">
                          {t("Booked {date}", { date: dateTime(parcelData.parcel.createdAt) })}
                          {parcelData.parcel.invoice && ` · ${t("Inv")}: ${parcelData.parcel.invoice}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <StatusBadge status={parcelData.parcel.status} className="px-3 py-1 text-xs" />
                      {onSelectParcel && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectParcel(parcelData.parcel._id);
                            onClose();
                          }}
                          className="flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        >
                          {t("View Full")}
                          <ExternalLink className="size-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Parcel Information Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {/* Recipient Details */}
                    <div className="rounded-xl bg-page p-3 space-y-1.5 border border-line/60">
                      <div className="flex items-center gap-1.5 text-ink-3 text-xs font-semibold uppercase tracking-wider">
                        <User className="size-3.5" />
                        {t("Recipient")}
                      </div>
                      <p className="font-bold text-ink">{parcelData.parcel.recipientName}</p>
                      <a
                        href={`tel:${parcelData.parcel.recipientPhone}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                      >
                        <Phone className="size-3" />
                        {parcelData.parcel.recipientPhone}
                      </a>
                      <p className="text-xs text-ink-2 flex items-start gap-1 pt-1 leading-relaxed">
                        <MapPin className="size-3.5 shrink-0 mt-0.5 text-ink-3" />
                        <span>
                          {parcelData.parcel.recipientAddress}, {parcelData.parcel.district}
                        </span>
                      </p>
                    </div>

                    {/* Financials & Package Info */}
                    <div className="rounded-xl bg-page p-3 space-y-2 border border-line/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs text-ink-3 font-semibold uppercase tracking-wider">
                          <span>{t("COD To Collect")}</span>
                          <span className="text-ink-2 font-normal">
                            {parcelData.parcel.weightKg} kg · {CATEGORY[parcelData.parcel.category ?? "parcel"]?.label ?? parcelData.parcel.category}
                          </span>
                        </div>
                        <p className="text-2xl font-black text-brand mt-1">
                          {tk(parcelData.parcel.codAmount)}
                        </p>
                      </div>

                      {parcelData.merchant && (
                        <div className="border-t border-line/60 pt-2 text-xs text-ink-2 flex items-center justify-between">
                          <span className="text-ink-3">{t("Merchant")}:</span>
                          <span className="font-semibold text-ink truncate max-w-[150px]">
                            {parcelData.merchant.businessName || parcelData.merchant.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Dispatch Rider Selector (if needed for Out for Delivery) */}
                  {me.role === "admin" && (
                    <div className="rounded-xl bg-navy-50/70 dark:bg-navy-900/40 p-3 border border-navy-100 dark:border-navy-800 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-navy-800 dark:text-sky-300">
                        <span className="flex items-center gap-1.5">
                          <Bike className="size-3.5 text-brand" />
                          {t("Assigned Delivery Rider")}
                        </span>
                        {parcelData.deliveryRider && (
                          <span className="font-normal text-ink-3">
                            {t("Currently")}: {parcelData.deliveryRider.name}
                          </span>
                        )}
                      </div>
                      <Select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className="text-xs h-9 bg-surface"
                      >
                        <option value="">{t("Choose rider to dispatch…")}</option>
                        {riders?.map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.label} {r.area ? `(${r.area})` : ""} — {r.phone}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}

                  {/* 1-Click Fast Status Dispatch Actions */}
                  <div className="space-y-2 pt-1 border-t border-line">
                    <p className="text-xs font-bold text-ink-3 uppercase tracking-wider flex items-center gap-1.5">
                      <PackageCheck className="size-3.5 text-brand" />
                      {t("Quick 1-Click Status Update")}
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {/* Mark Picked Up */}
                      <button
                        type="button"
                        disabled={updatingStatus !== null || parcelData.parcel.status === "picked_up"}
                        onClick={() => handleStatusUpdate("picked_up")}
                        className={cx(
                          "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-150 active:scale-95 disabled:opacity-50",
                          parcelData.parcel.status === "picked_up"
                            ? "bg-sky-500/10 border-sky-400 text-sky-700 font-bold"
                            : "bg-surface hover:bg-sky-50 dark:hover:bg-sky-950/20 border-line text-ink hover:border-sky-300",
                        )}
                      >
                        <PackageCheck className="size-4 mb-1 text-sky-600" />
                        <span className="text-xs font-bold leading-tight">{t("Mark Picked Up")}</span>
                        {parcelData.parcel.status === "picked_up" && (
                          <span className="text-[10px] text-sky-600 font-medium mt-0.5">{t("Current")}</span>
                        )}
                      </button>

                      {/* Mark at Hub */}
                      <button
                        type="button"
                        disabled={updatingStatus !== null || parcelData.parcel.status === "at_hub"}
                        onClick={() => handleStatusUpdate("at_hub")}
                        className={cx(
                          "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-150 active:scale-95 disabled:opacity-50",
                          parcelData.parcel.status === "at_hub"
                            ? "bg-indigo-500/10 border-indigo-400 text-indigo-700 font-bold"
                            : "bg-surface hover:bg-indigo-50 dark:hover:bg-indigo-950/20 border-line text-ink hover:border-indigo-300",
                        )}
                      >
                        <Building2 className="size-4 mb-1 text-indigo-600" />
                        <span className="text-xs font-bold leading-tight">{t("Mark at Hub")}</span>
                        {parcelData.parcel.status === "at_hub" && (
                          <span className="text-[10px] text-indigo-600 font-medium mt-0.5">{t("Current")}</span>
                        )}
                      </button>

                      {/* Mark Out for Delivery */}
                      <button
                        type="button"
                        disabled={updatingStatus !== null || parcelData.parcel.status === "out_for_delivery"}
                        onClick={() => handleStatusUpdate("out_for_delivery")}
                        className={cx(
                          "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-150 active:scale-95 disabled:opacity-50",
                          parcelData.parcel.status === "out_for_delivery"
                            ? "bg-brand/10 border-brand text-brand font-bold"
                            : "bg-surface hover:bg-brand-50 dark:hover:bg-brand-500/10 border-line text-ink hover:border-brand-300",
                        )}
                      >
                        <Truck className="size-4 mb-1 text-brand" />
                        <span className="text-xs font-bold leading-tight">{t("Out for Delivery")}</span>
                        {parcelData.parcel.status === "out_for_delivery" && (
                          <span className="text-[10px] text-brand font-medium mt-0.5">{t("Current")}</span>
                        )}
                      </button>

                      {/* Mark Delivered */}
                      <button
                        type="button"
                        disabled={updatingStatus !== null || parcelData.parcel.status === "delivered"}
                        onClick={() => handleStatusUpdate("delivered")}
                        className={cx(
                          "flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-150 active:scale-95 disabled:opacity-50",
                          parcelData.parcel.status === "delivered"
                            ? "bg-emerald-500/10 border-emerald-400 text-emerald-700 font-bold"
                            : "bg-surface hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-line text-ink hover:border-emerald-300",
                        )}
                      >
                        <CheckCircle2 className="size-4 mb-1 text-emerald-600" />
                        <span className="text-xs font-bold leading-tight">{t("Mark Delivered")}</span>
                        {parcelData.parcel.status === "delivered" && (
                          <span className="text-[10px] text-emerald-600 font-medium mt-0.5">{t("Current")}</span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Scan Next Button */}
                  <div className="flex justify-end pt-2">
                    <Button
                      size="sm"
                      variant="dark"
                      icon={ArrowRight}
                      onClick={handleResetForNext}
                    >
                      {t("Scan Next Parcel")}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Recent Scans Session Log */}
          {recentScans.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-line">
              <div className="flex items-center justify-between text-xs text-ink-3">
                <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  {t("Recent Scans ({n})", { n: recentScans.length })}
                </span>
                <button
                  type="button"
                  onClick={() => setRecentScans([])}
                  className="hover:underline text-[11px]"
                >
                  {t("Clear Log")}
                </button>
              </div>

              <div className="divide-y divide-line/60 rounded-xl border border-line bg-page overflow-hidden">
                {recentScans.map((item) => (
                  <button
                    key={`${item.id}-${item.timestamp}`}
                    type="button"
                    onClick={() => {
                      setInputCode(item.code);
                      setActiveCode(item.code);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-surface transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Barcode className="size-3.5 text-ink-3" />
                      <span className="font-mono text-xs font-bold text-ink">{item.code}</span>
                      <span className="text-xs text-ink-2 truncate max-w-[120px] sm:max-w-[180px]">
                        {item.recipientName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.updatedStatus ? (
                        <StatusBadge status={item.updatedStatus} className="text-[10px] py-0.5 px-2" />
                      ) : (
                        <StatusBadge status={item.status} className="text-[10px] py-0.5 px-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-line bg-page px-5 py-3 flex items-center justify-between text-xs text-ink-3">
          <span className="hidden sm:inline">
            {t("Morning Rider Barcode Dispatch Engine")}
          </span>
          <Button size="sm" variant="ghost" onClick={onClose} className="ml-auto">
            {t("Done / Close")}
          </Button>
        </div>
      </div>
    </div>
  );
}
