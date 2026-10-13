import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Download, FileSpreadsheet, Package, PackageCheck, Plus, RotateCcw, Truck, Upload, Clock } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { navigate } from "../lib/router";
import { CATEGORY, STATUS, ZONE, date, num, startOfToday, tk, zoneFor, type Category, type Zone } from "../lib/format";
import { parseCsv } from "../lib/csv";
import { Button, Card, Empty, PageHeader, Spinner, StatCard } from "../components/ui";
import { TrendChart } from "../components/TrendChart";
import { PayoutHistory, StatementTable } from "./admin";
import { MerchantPicker } from "../components/ParcelForm";
import { t } from "../lib/prefs";

export function MerchantDashboard() {
  const { token, me } = useAuthed();
  const dayStart = useMemo(startOfToday, []);
  const d = useQuery(api.dashboard.merchant, { token, dayStart });
  if (!d) return <Spinner />;
  const c = (...s: (keyof typeof STATUS)[]) => s.reduce((t, k) => t + (d.counts[k] ?? 0), 0);
  const total = Object.values(d.counts).reduce((a, b) => a + (b ?? 0), 0);
  const delivered = c("delivered", "partial_delivered");
  const returned = c("returned");
  const rate = delivered + returned ? Math.round((delivered / (delivered + returned)) * 100) : null;

  return (
    <>
      <PageHeader
        title={t("Hello, {name}", { name: me.businessName ?? me.name })}
        subtitle={t("Your parcels and payments at a glance.")}
        actions={
          <>
            <Button variant="outline" icon={Upload} onClick={() => navigate("/app/parcels/bulk")}>{t("Bulk upload")}</Button>
            <Button icon={Plus} onClick={() => navigate("/app/parcels/new")}>{t("Create parcel")}</Button>
          </>
        }
      />
      <Card className="sunrise mb-6 overflow-hidden border-0 p-6 text-white">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-white/70">{t("Current balance")}</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight">{tk(d.balance)}</p>
            <p className="mt-1 text-sm text-white/60">{t("Will be paid in your next payout")}</p>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-white/60">{t("Total received")}</p>
              <p className="text-lg font-bold text-sun">{tk(d.totalPaid)}</p>
            </div>
            <div>
              <p className="text-white/60">{t("Last payout")}</p>
              <p className="text-lg font-bold">{d.lastPayout ? `${tk(d.lastPayout.amount)} · ${date(d.lastPayout.at)}` : "—"}</p>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Total parcels")} value={num(total)} icon={Package} hint={`${d.todayCreated} today`} />
        <StatCard label={t("In progress")} value={num(c("pending", "picked_up", "at_hub", "out_for_delivery", "hold"))} icon={Truck} accent="brand" />
        <StatCard label={t("Delivered")} value={num(delivered)} icon={PackageCheck} accent="green" hint={rate !== null ? t("{rate}% success rate", { rate }) : undefined} />
        <StatCard label={t("Returned")} value={num(c("returned", "returning"))} icon={RotateCcw} accent="red" />
      </div>
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-bold">{t("Last 14 days")}</h2>
          <TrendChart data={d.trend} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-bold">{t("By status")}</h2>
          <div className="space-y-1">
            {(Object.keys(STATUS) as (keyof typeof STATUS)[]).filter((s) => (d.counts[s] ?? 0) > 0).map((s) => (
              <button key={s} onClick={() => navigate(`/app/parcels?status=${s}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-page">
                <span className={`size-2.5 rounded-full ${STATUS[s].dot}`} />
                <span className="flex-1 font-semibold">{STATUS[s].label}</span>
                <span className="font-bold">{d.counts[s]}</span>
              </button>
            ))}
            {total === 0 && <p className="py-6 text-center text-sm text-ink-3">{t("No parcels yet — create your first one!")}</p>}
          </div>
        </Card>
      </div>
    </>
  );
}

export function MerchantPayments() {
  const { token } = useAuthed();
  const st = useQuery(api.money.statement, { token });
  const history = useQuery(api.money.payouts, { token });
  return (
    <>
      <PageHeader title={t("Payments")} subtitle={t("Your balance and payout history.")} />
      <Card className="mb-8 p-6">
        {!st ? (
          <Spinner />
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-page p-4">
                <p className="text-xs text-ink-3">{t("Collected (unpaid)")}</p>
                <p className="text-xl font-bold">{tk(st.collected)}</p>
              </div>
              <div className="rounded-2xl bg-page p-4">
                <p className="text-xs text-ink-3">{t("Charges")}</p>
                <p className="text-xl font-bold">− {tk(st.charges)}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-xs text-brand-700">{t("Next payout")}</p>
                <p className="text-xl font-extrabold text-brand-700">{tk(st.net)}</p>
              </div>
            </div>
            {st.count === 0 ? <p className="text-center text-sm text-ink-3">{t("No unpaid parcels.")}</p> : <StatementTable rows={st.parcels} />}
          </>
        )}
      </Card>
      <h2 className="mb-3 font-bold">{t("Payout history")}</h2>
      <PayoutHistory rows={history} />
    </>
  );
}

/* ------------------------------------------------------------ bulk upload */

const TEMPLATE_HEADER = "invoice,customer_name,customer_phone,address,area,zone,category,weight_kg,cod_amount,item,note";
const TEMPLATE_ROW = 'INV-1001,Rahim Uddin,01712345678,"House 12, Road 5",Mirpur 10,dhaka,shopping,1,1250,2 T-shirts,Call before delivery';

/* Accepted spellings for the zone column; blank means "guess from the area". */
const ZONE_ALIASES: Record<string, Zone> = {
  uttara: "uttara",
  express: "uttara",
  dhaka: "dhaka_city",
  dhaka_city: "dhaka_city",
  "dhaka city": "dhaka_city",
  gazipur: "gazipur_city",
  gazipur_city: "gazipur_city",
  "gazipur city": "gazipur_city",
  narayanganj: "narayanganj_city",
  narayanganj_city: "narayanganj_city",
  "narayanganj city": "narayanganj_city",
};

type Row = {
  invoice?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  district: string;
  zone: Zone;
  category?: Category;
  weightKg: number;
  codAmount: number;
  itemDescription?: string;
  note?: string;
};

export function BulkUpload() {
  const { token, me } = useAuthed();
  const toast = useToast();
  const createMany = useMutation(api.parcels.createMany);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [merchantId, setMerchantId] = useState<Id<"users"> | "">("");

  function load(text: string) {
    const table = parseCsv(text);
    if (table.length < 2) {
      setProblems([t("The file has no data rows.")]);
      setRows(null);
      return;
    }
    const head = table[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => head.indexOf(name);
    const need = ["customer_name", "customer_phone", "address", "cod_amount"];
    const missing = need.filter((n) => col(n) < 0);
    if (missing.length) {
      setProblems([t("Missing column(s): {cols}. Use the template.", { cols: missing.join(", ") })]);
      setRows(null);
      return;
    }
    const issues: string[] = [];
    const out: Row[] = [];
    table.slice(1).forEach((r, i) => {
      if (r.every((c) => !c.trim())) return;
      const get = (n: string) => (col(n) >= 0 ? (r[col(n)] ?? "").trim() : "");
      // "district" is still accepted from older copies of the template
      const district = get("area") || get("district");
      const zoneRaw = get("zone").toLowerCase();
      const zone = ZONE_ALIASES[zoneRaw] ?? zoneFor(district);
      const categoryRaw = get("category").toLowerCase() as Category;
      const category = categoryRaw in CATEGORY ? categoryRaw : undefined;
      if (!district) issues.push(t("Row {row}: area is required.", { row: i + 2 }));
      if (zoneRaw && !ZONE_ALIASES[zoneRaw]) issues.push(t("Row {row}: zone must be uttara, dhaka, gazipur or narayanganj.", { row: i + 2 }));
      const cod = Number(get("cod_amount") || 0);
      const weight = Number(get("weight_kg") || 1);
      if (!get("customer_name") || !get("customer_phone") || !get("address")) issues.push(t("Row {row}: name, phone and address are required.", { row: i + 2 }));
      if (!Number.isFinite(cod) || cod < 0) issues.push(t("Row {row}: cod_amount must be a number.", { row: i + 2 }));
      if (!Number.isFinite(weight) || weight <= 0) issues.push(t("Row {row}: weight_kg must be a positive number.", { row: i + 2 }));
      out.push({
        invoice: get("invoice") || undefined,
        recipientName: get("customer_name"),
        recipientPhone: get("customer_phone"),
        recipientAddress: get("address"),
        district,
        zone,
        category,
        weightKg: weight,
        codAmount: cod,
        itemDescription: get("item") || undefined,
        note: get("note") || undefined,
      });
    });
    if (out.length > 200) issues.push(t("At most 200 parcels per upload — split the file."));
    setProblems(issues);
    setRows(out);
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_HEADER + "\n" + TEMPLATE_ROW + "\n"], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "morning-rider-bulk-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <PageHeader
        title={t("Bulk upload")}
        subtitle={t("Create up to 200 parcels at once from a CSV file (Excel → Save as CSV).")}
        actions={<Button variant="outline" icon={Download} onClick={downloadTemplate}>{t("Download template")}</Button>}
      />
      {me.role === "admin" && (
        <Card className="mb-4 p-6">
          <MerchantPicker value={merchantId} onChange={setMerchantId} />
        </Card>
      )}
      <Card className="p-6">
        <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center transition hover:border-brand hover:bg-brand-50/40">
          <FileSpreadsheet className="size-10 text-brand" />
          <span className="mt-3 font-bold">{t("Choose a CSV file")}</span>
          <span className="mt-1 text-sm text-ink-3">Columns: {TEMPLATE_HEADER.replaceAll(",", ", ")}</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 1_000_000) return toast.error("File is too large (max 1 MB).");
              load(await file.text());
              e.target.value = "";
            }}
          />
        </label>

        {problems.length > 0 && (
          <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            {problems.slice(0, 10).map((p) => (
              <p key={p}>• {p}</p>
            ))}
          </div>
        )}

        {rows && rows.length > 0 && (
          <>
            <div className="mt-5 max-h-96 overflow-auto rounded-2xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-page text-left text-xs font-bold text-ink-3 uppercase">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">{t("Customer")}</th>
                    <th className="px-3 py-2">{t("Address")}</th>
                    <th className="px-3 py-2">{t("Zone")}</th>
                    <th className="px-3 py-2 text-right">{t("Kg")}</th>
                    <th className="px-3 py-2 text-right">{t("COD")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-line">
                      <td className="px-3 py-2 text-ink-3">{i + 1}</td>
                      <td className="px-3 py-2">
                        <p className="font-semibold">{r.recipientName}</p>
                        <p className="text-xs text-ink-3">{r.recipientPhone}</p>
                      </td>
                      <td className="px-3 py-2 text-ink-2">{r.recipientAddress}, {r.district}</td>
                      <td className="px-3 py-2 text-ink-2">{ZONE[r.zone]}</td>
                      <td className="px-3 py-2 text-right">{r.weightKg}</td>
                      <td className="px-3 py-2 text-right font-semibold">{tk(r.codAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-ink-2">
                {t("{n} parcels · total COD {amount}", { n: rows.length, amount: tk(rows.reduce((s, r) => s + r.codAmount, 0)) })}
              </p>
              <Button
                size="lg"
                icon={Upload}
                loading={busy}
                disabled={problems.length > 0 || (me.role === "admin" && !merchantId)}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await createMany({ token, parcels: rows, merchantId: merchantId || undefined });
                    toast.ok(t("{n} parcels created.", { n: r.length }));
                    navigate("/app/parcels");
                  } catch (e) {
                    toast.error(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("Create {n} parcels", { n: rows.length })}
              </Button>
            </div>
          </>
        )}
        {!rows && problems.length === 0 && (
          <Empty icon={Clock} title={t("Waiting for a file")} text={t("Tip: download the template, fill it in Excel or Google Sheets, then save as CSV.")} />
        )}
      </Card>
    </>
  );
}

