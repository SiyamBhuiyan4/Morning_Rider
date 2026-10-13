import { useState, type FormEvent } from "react";
import { useQuery } from "convex/react";
import { Calculator, ShieldCheck } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { AREAS, CATEGORY, ZONE, ZONES, ZONE_TIME, tk, zoneFor, type Category, type Zone } from "../lib/format";
import { Button, Card, Field, Input, Select, Textarea } from "./ui";
import { FraudSummary } from "./FraudSummary";
import { t } from "../lib/prefs";

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
  const set = (k: keyof ParcelFields) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));

  const quote = useQuery(api.parcels.quote, {
    token,
    zone: f.zone,
    weightKg: Number(f.weightKg) || 1,
    codAmount: Number(f.codAmount) || 0,
  });
  const cod = Number(f.codAmount) || 0;
  const phoneReady = /^(\+?88)?01[3-9]\d{8}$/.test(f.recipientPhone.replace(/[\s-]/g, ""));

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
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {merchantPicker && <Card className="p-6">{merchantPicker}</Card>}
        <Card className="p-6">
          <h2 className="font-bold">{t("Customer")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t("Customer name")}>
              {(id) => <Input id={id} value={f.recipientName} onChange={set("recipientName")} required maxLength={80} />}
            </Field>
            <Field label={t("Customer phone")}>
              {(id) => <Input id={id} type="tel" placeholder="01XXXXXXXXX" value={f.recipientPhone} onChange={set("recipientPhone")} required />}
            </Field>
            <Field label={t("Full address")} className="sm:col-span-2">
              {(id) => <Textarea id={id} value={f.recipientAddress} onChange={set("recipientAddress")} required maxLength={300} placeholder={t("House, road, area, thana")} />}
            </Field>
            <Field label={t("Area")} hint={t("Type or pick, e.g. Uttara Sector 7, Mirpur 10")}>
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
            <Field label={t("Cash to collect (COD)")} hint={t("Enter 0 if already paid.")}>
              {(id) => <Input id={id} type="number" min={0} step={1} inputMode="numeric" value={f.codAmount} onChange={set("codAmount")} required placeholder="0" />}
            </Field>
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
