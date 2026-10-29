import { useState, type FormEvent } from "react";
import { useQuery } from "convex/react";
import { Calculator, ShieldCheck, Sparkles } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { AREAS, CATEGORY, ZONE, ZONES, ZONE_TIME, tk, zoneFor, type Category, type Zone } from "../lib/format";
import { Button, Card, Field, Input, Modal, Select, Textarea } from "./ui";
import { FraudSummary } from "./FraudSummary";
import { t } from "../lib/prefs";
import { parseOrderText, predictDeliveryRisk, type DeliveryRiskResult } from "../lib/aiParser";

export type ParcelFields = {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  district: string; // the delivery area
  zone: Zone;
  category: Category | "";
  weightKg: string;
  codAmount: string;
  itemDescription: string;
  note: string;
};

export const emptyParcel: ParcelFields = {
  invoice: "",
  recipientName: "",
  recipientPhone: "",
  recipientAddress: "",
  district: "",
  zone: "dhaka_city",
  category: "",
  weightKg: "1",
  codAmount: "",
  itemDescription: "",
  note: "",
};

export function toPayload(f: ParcelFields) {
  return {
    invoice: f.invoice || undefined,
    recipientName: f.recipientName,
    recipientPhone: f.recipientPhone,
    recipientAddress: f.recipientAddress,
    district: f.district,
    zone: f.zone,
    category: f.category || undefined,
    weightKg: Number(f.weightKg),
    codAmount: Number(f.codAmount || 0),
    itemDescription: f.itemDescription || undefined,
    note: f.note || undefined,
  };
}

function getBriefRecommendation(risk: DeliveryRiskResult): string {
  const recLower = (risk.recommendation || "").toLowerCase();
  if (recLower.includes("advance") || recLower.includes("partial")) {
    return "Ask for delivery fee advance";
  }
  if (recLower.includes("valid") || recLower.includes("mobile") || recLower.includes("phone")) {
    return "Verify phone number";
  }
  if (recLower.includes("call") || recLower.includes("confirm")) {
    return "Call customer before dispatch";
  }
  return risk.recommendation || "Ask for delivery fee advance";
}

function AiDeliveryRiskBadge({ risk }: { risk: DeliveryRiskResult }) {
  if (risk.riskLevel === "low") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
        <span>🟢</span>
        <span>{t("Low Delivery Risk (Safe)")}</span>
      </span>
    );
  }

  if (risk.riskLevel === "medium") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
        <span>🟡</span>
        <span>{t("Medium Delivery Risk")}</span>
      </span>
    );
  }

  const rec = getBriefRecommendation(risk);
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
      <span className="inline-flex items-center gap-1.5">
        <span>🔴</span>
        <span>{t("High Delivery Risk")}</span>
      </span>
      <span className="font-normal text-red-800 dark:text-red-300">
        ({rec})
      </span>
    </div>
  );
}

/**
 * Create or edit a parcel. `onSubmit` receives the payload; the charge
 * preview comes from the server so it always matches what will be billed.
 */
export function ParcelForm({
  initial = emptyParcel,
  submitLabel,
  onSubmit,
  merchantPicker,
}: {
  initial?: ParcelFields;
  submitLabel: string;
  onSubmit: (payload: ReturnType<typeof toPayload>) => Promise<unknown>;
  merchantPicker?: React.ReactNode;
}) {
  const { token } = useAuthed();
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [quickPasteOpen, setQuickPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const set = (k: keyof ParcelFields) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const quote = useQuery(api.parcels.quote, {
    token,
    zone: f.zone,
    weightKg: Number(f.weightKg) || 1,
    codAmount: Number(f.codAmount) || 0,
  });
  const cod = Number(f.codAmount) || 0;
  const phoneReady = /^(\+?88)?01[3-9]\d{8}$/.test(f.recipientPhone.replace(/[\s-]/g, ""));

  const fraud = useQuery(api.parcels.fraudCheck, phoneReady ? { token, phone: f.recipientPhone } : "skip");

  const deliveryRisk =
    f.recipientPhone.trim() && cod > 0
      ? predictDeliveryRisk({
          phone: f.recipientPhone,
          codAmount: cod,
          successRate: fraud?.successRate ?? undefined,
          totalOrders: fraud?.total ?? undefined,
        })
      : null;

  function handleAiParse() {
    if (!pasteText.trim()) return;
    const parsed = parseOrderText(pasteText);

    setF((prev) => {
      const next = { ...prev };
      if (parsed.recipientName) next.recipientName = parsed.recipientName;
      if (parsed.recipientPhone) next.recipientPhone = parsed.recipientPhone;
      if (parsed.zone) {
        next.zone = parsed.zone;
        const matchedArea = AREAS.find((a) => parsed.deliveryAddress?.toLowerCase().includes(a.toLowerCase()));
        if (matchedArea) {
          next.district = matchedArea;
        } else if (!next.district) {
          next.district =
            parsed.zone === "uttara"
              ? "Uttara"
              : parsed.zone === "gazipur_city"
                ? "Gazipur Sadar"
                : parsed.zone === "narayanganj_city"
                  ? "Narayanganj Sadar"
                  : "Dhaka";
        }
      }
      if (parsed.deliveryAddress) next.recipientAddress = parsed.deliveryAddress;
      if (parsed.amountToCollect !== null) next.codAmount = String(parsed.amountToCollect);
      if (parsed.notes) next.note = parsed.notes;
      return next;
    });

    setQuickPasteOpen(false);
    setPasteText("");
    toast.ok("Order details extracted with AI!");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await onSubmit(toPayload(f));
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* AI Quick Paste Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-gradient-to-r from-brand-50/70 via-surface to-brand-50/30 p-4 shadow-xs dark:border-brand-500/20 dark:from-brand-950/20 dark:via-surface dark:to-surface">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white shadow-xs">
                <Sparkles className="size-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-ink">{t("AI Order Parser")}</p>
                <p className="text-xs text-ink-3">
                  {t("Paste order text from chat or SMS to auto-complete customer details instantly")}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setQuickPasteOpen(true)}
              className="gap-1.5 shadow-xs"
            >
              <span>✨</span> AI Quick Paste
            </Button>
          </div>

          {merchantPicker && <Card className="p-6">{merchantPicker}</Card>}

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">{t("Customer")}</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickPasteOpen(true)}
                className="gap-1.5 text-xs text-brand hover:border-brand/40 hover:bg-brand-50/50"
              >
                <span>✨</span> AI Quick Paste
              </Button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t("Customer name")}>
                {(id) => <Input id={id} value={f.recipientName} onChange={set("recipientName")} required maxLength={80} />}
              </Field>
              <div>
                <Field label={t("Customer phone")}>
                  {(id) => <Input id={id} type="tel" placeholder="01XXXXXXXXX" value={f.recipientPhone} onChange={set("recipientPhone")} required />}
                </Field>
                {deliveryRisk && (
                  <div className="mt-2">
                    <AiDeliveryRiskBadge risk={deliveryRisk} />
                  </div>
                )}
              </div>
              <Field label={t("Full address")} className="sm:col-span-2">
                {(id) => <Textarea id={id} value={f.recipientAddress} onChange={set("recipientAddress")} required maxLength={300} placeholder={t("House, road, area, thana")} />}
              </Field>
              <Field label={t("Area")} hint={t("Type or pick (in English or Bangla), e.g. Uttara Sector 7, Mirpur 10")}>
                {(id) => (
                  <>
                    <Input
                      id={id}
                      list="mr-areas"
                      value={f.district}
                      onChange={(e) => {
                        const v = e.target.value;
                        setF((s) => ({ ...s, district: v, zone: v.trim() ? zoneFor(v) : s.zone }));
                      }}
                      required
                      maxLength={60}
                    />
                    <datalist id="mr-areas">
                      {AREAS.map((a) => (
                        <option key={a} value={a} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
              <Field label={t("Delivery zone")} hint={ZONE_TIME[f.zone as (typeof ZONES)[number]]}>
                {(id) => (
                  <Select id={id} value={f.zone} onChange={set("zone")}>
                    {ZONES.map((k) => (
                      <option key={k} value={k}>
                        {ZONE[k]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            {phoneReady && (
              <div className="mt-4">
                <FraudSummary phone={f.recipientPhone} compact />
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-bold">{t("Parcel")}</h2>
            <p className="mt-4 text-[13px] font-semibold text-ink-2">{t("What is inside?")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(CATEGORY) as Category[]).map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setF((s) => ({ ...s, category: s.category === c ? "" : c }))}
                  className={
                    "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition " +
                    (f.category === c ? "bg-brand text-white ring-brand" : "bg-surface text-ink-2 ring-line hover:ring-brand/50")
                  }
                >
                  {CATEGORY[c].emoji} {CATEGORY[c].label}
                </button>
              ))}
            </div>
            {f.category && CATEGORY[f.category].careful && (
              <p className="mt-2 rounded-xl bg-sun-100 px-3 py-2 text-xs font-semibold text-amber-800">{CATEGORY[f.category].careful}</p>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Field label={t("Cash to collect (COD)")} hint={t("Enter 0 if already paid.")}>
                  {(id) => <Input id={id} type="number" min={0} step={1} inputMode="numeric" value={f.codAmount} onChange={set("codAmount")} required placeholder="0" />}
                </Field>
                {deliveryRisk && (
                  <div className="mt-2">
                    <AiDeliveryRiskBadge risk={deliveryRisk} />
                  </div>
                )}
              </div>
              <Field label={t("Weight (kg)")}>
                {(id) => <Input id={id} type="number" min={0.1} max={50} step={0.1} value={f.weightKg} onChange={set("weightKg")} required />}
              </Field>
              <Field label={t("Invoice / order ID (optional)")}>
                {(id) => <Input id={id} value={f.invoice} onChange={set("invoice")} maxLength={60} />}
              </Field>
              <Field label={t("Item description (optional)")}>
                {(id) => <Input id={id} value={f.itemDescription} onChange={set("itemDescription")} maxLength={120} placeholder={t("e.g. 2 T-shirts")} />}
              </Field>
              <Field label={t("Note for rider (optional)")} className="sm:col-span-2">
                {(id) => <Input id={id} value={f.note} onChange={set("note")} maxLength={300} placeholder={t("e.g. Call before delivery")} />}
              </Field>
            </div>
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden">
            <div className="sunrise flex items-center gap-2 px-5 py-4 text-white">
              <Calculator className="size-5 text-sun" />
              <span className="font-bold">{t("Charge summary")}</span>
            </div>
            <dl className="space-y-3 p-5 text-sm">
              <Row label={t("Cash collection")} value={tk(cod)} />
              <Row label={t("Delivery charge")} value={quote ? `− ${tk(quote.deliveryCharge)}` : "…"} />
              <Row label={t("COD charge")} value={quote ? `− ${tk(quote.codCharge)}` : "…"} />
              <div className="border-t border-dashed border-line pt-3">
                <Row label={<span className="font-bold text-ink">{t("You will receive")}</span>} value={<span className="text-lg font-extrabold text-brand">{quote ? tk(cod - quote.deliveryCharge - quote.codCharge) : "…"}</span>} />
              </div>
            </dl>
            <div className="px-5 pb-5">
              <Button type="submit" size="lg" loading={busy} className="w-full">
                {submitLabel}
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-3">
                <ShieldCheck className="size-3.5" /> {t("Charges are calculated by Morning Rider")}
              </p>
            </div>
          </Card>
        </div>
      </form>

      <Modal
        open={quickPasteOpen}
        onClose={() => setQuickPasteOpen(false)}
        title="✨ AI Quick Paste"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-xs text-ink-3">
              {t("Bangla & English supported")}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setQuickPasteOpen(false)}
              >
                {t("Cancel")}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleAiParse}
                disabled={!pasteText.trim()}
                className="gap-1.5"
              >
                <Sparkles className="size-4" />
                AI Parse & Auto-fill
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <label htmlFor="ai-quick-paste-input" className="block text-xs font-semibold text-ink-2">
            Paste customer order message (Facebook, WhatsApp, SMS, or Bengali text)
          </label>
          <Textarea
            id="ai-quick-paste-input"
            rows={7}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`e.g.\nনাম: তানভীর আহমেদ\nমোবাইল: 01712345678\nঠিকানা: রোড ৪, সেক্টর ৩, উত্তরা, ঢাকা\nক্যাশ অন ডেলিভারি: ১৫০০ টাকা\nনোট: আসার আগে কল দিবেন`}
            className="font-mono text-sm leading-relaxed"
            autoFocus
          />
          <p className="text-[11px] text-ink-3">
            {t("Extracts recipient name, phone, delivery zone, full address, COD amount, and notes automatically.")}
          </p>
        </div>
      </Modal>
    </>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-2">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

export function MerchantPicker({ value, onChange }: { value: Id<"users"> | ""; onChange: (id: Id<"users"> | "") => void }) {
  const { token } = useAuthed();
  const merchants = useQuery(api.users.options, { token, role: "merchant" });
  return (
    <Field label={t("Merchant")}>
      {(id) => (
        <Select id={id} value={value} onChange={(e) => onChange(e.target.value as Id<"users">)} required>
          <option value="">{t("Choose merchant…")}</option>
          {merchants?.map((m) => (
            <option key={m._id} value={m._id}>
              {m.label} — {m.phone}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
