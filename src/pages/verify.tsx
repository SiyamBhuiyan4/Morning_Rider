import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, BadgeCheck, Clock, FileText, Plus, ShieldCheck, Trash2, Upload, type LucideIcon } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { navigate } from "../lib/router";
import { dateTime, num } from "../lib/format";
import { Button, Card, Field, Input, PageHeader, Spinner, cx } from "../components/ui";
import { t, translateServer } from "../lib/prefs";

/* Same limits the server checks; checking here too saves a wasted upload. */
const MAX_BYTES = 5 * 1024 * 1024;
import { uploadToTelegramCdn } from "../lib/telegramCdn";

const TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ACCEPT = TYPES.join(",");
const MAX_OTHER = 5;

type Uploaded = { storageId: Id<"_storage"> | string; name: string; type: string; preview?: string };

export function VerifyBusiness() {
  const { token } = useAuthed();
  const mine = useQuery(api.verification.mine, { token });
  if (!mine) return <Spinner />;

  return (
    <>
      <PageHeader title={t("Business verification")} subtitle={t("We verify every business before its first parcel, to keep customers safe.")} />
      {mine.status === "submitted" && (
        <StateCard
          icon={Clock}
          tone="amber"
          title={t("Your documents are under review")}
          text={t("We'll check your documents soon. You'll be able to send parcels once they're approved.")}
          footnote={mine.submittedAt ? t("Submitted on {date}", { date: dateTime(mine.submittedAt) }) : undefined}
        />
      )}
      {mine.status === "approved" && (
        <StateCard
          icon={BadgeCheck}
          tone="green"
          title={t("Your business is verified")}
          text={t("You're all set — you can now send parcels with Morning Rider.")}
          action={<Button icon={Plus} onClick={() => navigate("/app/parcels/new")}>{t("Create your first parcel")}</Button>}
        />
      )}
      {mine.status === "rejected" && (
        <Card className="mb-6 border-red-200 bg-red-50 p-5 dark:border-red-900/50 dark:bg-red-950/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
            <div>
              <p className="font-bold text-red-700 dark:text-red-300">{t("Your verification was not approved")}</p>
              {mine.reason && <p className="mt-1 text-sm text-red-700 dark:text-red-300">{t("Reason: {reason}", { reason: mine.reason })}</p>}
              <p className="mt-2 text-sm text-ink-2">{t("Please fix the problem and send your documents again below.")}</p>
            </div>
          </div>
        </Card>
      )}
      {(mine.status === "none" || mine.status === "rejected") && <VerifyForm />}
    </>
  );
}

function StateCard({
  icon: Icon,
  tone,
  title,
  text,
  footnote,
  action,
}: {
  icon: LucideIcon;
  tone: "amber" | "green";
  title: string;
  text: string;
  footnote?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="p-8 text-center">
      <div
        className={cx(
          "mx-auto grid size-16 place-items-center rounded-2xl",
          tone === "amber" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600",
        )}
      >
        <Icon className="size-8" />
      </div>
      <p className="mt-4 text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">{text}</p>
      {footnote && <p className="mt-3 text-xs text-ink-3">{footnote}</p>}
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

function VerifyForm() {
  const { token } = useAuthed();
  const toast = useToast();
  const submit = useMutation(api.verification.submit);
  const [nidNumber, setNidNumber] = useState("");
  const [nidFront, setNidFront] = useState<Uploaded | null>(null);
  const [nidBack, setNidBack] = useState<Uploaded | null>(null);
  const [tinNumber, setTinNumber] = useState("");
  const [tinFile, setTinFile] = useState<Uploaded | null>(null);
  const [tradeNumber, setTradeNumber] = useState("");
  const [tradeFile, setTradeFile] = useState<Uploaded | null>(null);
  const [others, setOthers] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);

  const nidDigits = nidNumber.replace(/\D/g, "");
  const nidOk = [10, 13, 17].includes(nidDigits.length);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nidOk) return toast.error(t("NID number must be 10, 13 or 17 digits."));
    if (!nidFront || !nidBack) return toast.error(t("Please upload both sides of your NID."));
    setBusy(true);
    try {
      await submit({
        token,
        nidNumber: nidDigits,
        nidFront: nidFront.storageId,
        nidBack: nidBack.storageId,
        tinNumber: tinNumber.trim() || undefined,
        tinFile: tinFile?.storageId,
        tradeLicenseNumber: tradeNumber.trim() || undefined,
        tradeLicenseFile: tradeFile?.storageId,
        otherFiles: others.map((o) => o.storageId),
      });
      toast.ok(t("Documents sent. They are now under review."));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-6">
        <SectionTitle icon={ShieldCheck} title={t("National ID (required)")} text={t("The NID of the business owner. Make sure the photos are clear and every corner is visible.")} />
        <Field label={t("NID number")} hint={t("10, 13 or 17 digits")}>
          {(id) => (
            <Input
              id={id}
              value={nidNumber}
              onChange={(e) => setNidNumber(e.target.value)}
              inputMode="numeric"
              autoComplete="off"
              maxLength={25}
              required
              placeholder="1234567890"
            />
          )}
        </Field>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <FileSlot label={t("NID front photo")} value={nidFront} onChange={setNidFront} />
          <FileSlot label={t("NID back photo")} value={nidBack} onChange={setNidBack} />
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle icon={FileText} title={t("More documents (optional)")} text={t("These help us verify you faster, but you can leave them out.")} />
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <Field label={t("TIN number")}>
              {(id) => <Input id={id} value={tinNumber} onChange={(e) => setTinNumber(e.target.value)} maxLength={30} autoComplete="off" />}
            </Field>
            <FileSlot label={t("TIN certificate")} value={tinFile} onChange={setTinFile} />
          </div>
          <div className="space-y-3">
            <Field label={t("Trade licence number")}>
              {(id) => <Input id={id} value={tradeNumber} onChange={(e) => setTradeNumber(e.target.value)} maxLength={50} autoComplete="off" />}
            </Field>
            <FileSlot label={t("Trade licence")} value={tradeFile} onChange={setTradeFile} />
          </div>
        </div>
        <div className="mt-6">
          <p className="text-[13px] font-semibold text-ink-2">{t("Other valid documents")}</p>
          <p className="mb-2 text-xs text-ink-3">{t("Up to {n} files — e.g. bank statement, utility bill, shop photo.", { n: num(MAX_OTHER) })}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {others.map((o, i) => (
              <Preview key={o.storageId} file={o} onRemove={() => setOthers((s) => s.filter((_, j) => j !== i))} />
            ))}
            {others.length < MAX_OTHER && <Picker compact onUploaded={(f) => setOthers((s) => [...s, f].slice(0, MAX_OTHER))} />}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-3">{t("Photos (JPG, PNG, WebP) or PDF, up to 5 MB each. Only Morning Rider staff can see them.")}</p>
        <Button type="submit" size="lg" icon={Upload} loading={busy} disabled={!nidOk || !nidFront || !nidBack} className="w-full sm:w-auto">
          {t("Submit for verification")}
        </Button>
      </div>
    </form>
  );
}

function SectionTitle({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm text-ink-2">{text}</p>
      </div>
    </div>
  );
}

/** One labelled document: the picker until something is uploaded, then its preview. */
function FileSlot({ label, value, onChange }: { label: string; value: Uploaded | null; onChange: (f: Uploaded | null) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-semibold text-ink-2">{label}</p>
      {value ? <Preview file={value} onRemove={() => onChange(null)} /> : <Picker onUploaded={onChange} />}
    </div>
  );
}

/** Checks the file, uploads it to Telegram CDN and hands back the storage id. */
function Picker({ onUploaded, compact }: { onUploaded: (f: Uploaded) => void; compact?: boolean }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function upload(file: File) {
    if (!TYPES.includes(file.type)) return toast.error(t("Only JPG, PNG, WebP or PDF files are allowed."));
    if (file.size > MAX_BYTES) return toast.error(t("File is too large (max 5 MB)."));
    setBusy(true);
    try {
      const { fileId, url, storageId } = await uploadToTelegramCdn(file);
      onUploaded({
        storageId: storageId || (fileId ? `tg:${fileId}` : url),
        name: file.name,
        type: file.type,
        preview: file.type.startsWith("image/") ? url : undefined,
      });
    } catch (e) {
      toast.error(e instanceof Error ? translateServer(e.message) : t("Upload failed. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <label
      className={cx(
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line px-3 text-center transition hover:border-brand hover:bg-brand-50/40",
        compact ? "aspect-square" : "h-36",
        busy && "pointer-events-none opacity-70",
      )}
    >
      {busy ? (
        <>
          <Spinner className="py-0" />
          <span className="mt-2 text-xs font-semibold text-ink-3">{t("Uploading…")}</span>
        </>
      ) : (
        <>
          <Upload className="size-6 text-brand" />
          <span className="mt-2 text-sm font-semibold">{compact ? t("Add file") : t("Choose photo or PDF")}</span>
          {!compact && <span className="mt-0.5 text-xs text-ink-3">{t("Max 5 MB")}</span>}
        </>
      )}
      <input
        type="file"
        accept={ACCEPT}
        className="hidden"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
    </label>
  );
}

function Preview({ file, onRemove }: { file: Uploaded; onRemove: () => void }) {
  // Free the local preview URL once the thumbnail goes away.
  const preview = useRef(file.preview);
  useEffect(() => () => void (preview.current && URL.revokeObjectURL(preview.current)), []);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-page">
      {file.preview ? (
        <img src={file.preview} alt={file.name} className="h-36 w-full object-cover" />
      ) : (
        <div className="flex h-36 flex-col items-center justify-center gap-2 px-3 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">
            <FileText className="size-3.5" /> PDF
          </span>
          <span className="line-clamp-2 break-all text-xs text-ink-2">{file.name}</span>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-surface/90 text-red-600 shadow hover:bg-red-50"
        title={t("Remove")}
        aria-label={t("Remove")}
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------- gating */

/**
 * Shown instead of the parcel forms until the merchant's business is
 * verified. The server refuses the parcels anyway; this just explains why.
 */
export function VerificationNeeded({ title }: { title: string }) {
  const { me } = useAuthed();
  const submitted = me.verification === "submitted";
  return (
    <>
      <PageHeader title={title} />
      <Card className="p-8 text-center">
        <div className={cx("mx-auto grid size-16 place-items-center rounded-2xl", submitted ? "bg-amber-50 text-amber-600" : "bg-brand-50 text-brand")}>
          {submitted ? <Clock className="size-8" /> : <ShieldCheck className="size-8" />}
        </div>
        <p className="mt-4 text-lg font-bold">{submitted ? t("Your documents are under review") : t("Verify your business to start sending parcels")}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">
          {submitted
            ? t("We'll check your documents soon. You'll be able to send parcels once they're approved.")
            : me.verification === "rejected"
              ? t("Your verification was not approved. Please fix the problem and send your documents again.")
              : t("We verify every business before its first parcel, to keep customers safe. It only takes your NID.")}
        </p>
        <div className="mt-6">
          <Button variant={submitted ? "outline" : "primary"} icon={BadgeCheck} onClick={() => navigate("/app/verify")}>
            {submitted ? t("View verification") : t("Verify my business")}
          </Button>
        </div>
      </Card>
    </>
  );
}

/** True when this user still has to be verified before creating parcels. Admins never are. */
export function needsVerification(me: { role: string; verification?: string }) {
  return me.role === "merchant" && me.verification !== "approved";
}

/** Dashboard banner nudging an unverified merchant towards /app/verify. */
export function VerificationBanner() {
  const { me } = useAuthed();
  if (!needsVerification(me)) return null;
  const state = me.verification;
  const look =
    state === "submitted"
      ? { box: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30", icon: Clock, iconCls: "text-amber-600" }
      : state === "rejected"
        ? { box: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30", icon: AlertCircle, iconCls: "text-red-600" }
        : { box: "border-brand/30 bg-brand-50 dark:bg-brand/10", icon: ShieldCheck, iconCls: "text-brand" };
  return (
    <Card className={cx("mb-6 flex flex-wrap items-center gap-4 p-5", look.box)}>
      <look.icon className={cx("size-8 shrink-0", look.iconCls)} />
      <div className="min-w-48 flex-1">
        <p className="font-bold">
          {state === "submitted"
            ? t("Your documents are under review")
            : state === "rejected"
              ? t("Your verification was not approved")
              : t("Verify your business to start sending parcels")}
        </p>
        <p className="text-sm text-ink-2">
          {state === "submitted"
            ? t("We'll check your documents soon. You'll be able to send parcels once they're approved.")
            : state === "rejected"
              ? t("See the reason and send your documents again.")
              : t("Upload your NID once — it only takes a minute.")}
        </p>
      </div>
      {state !== "submitted" && (
        <Button icon={BadgeCheck} onClick={() => navigate("/app/verify")}>
          {state === "rejected" ? t("Resubmit documents") : t("Verify my business")}
        </Button>
      )}
    </Card>
  );
}
