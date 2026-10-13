import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Download, FileSpreadsheet, Package, PackageCheck, Plus, RotateCcw, Truck, Upload, Clock } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { navigate } from "../lib/router";
import { DISTRICTS, STATUS, ZONE, date, num, startOfToday, tk, zoneFor, type Zone } from "../lib/format";
import { parseCsv } from "../lib/csv";
import { Button, Card, Empty, PageHeader, Spinner, StatCard } from "../components/ui";
import { TrendChart } from "../components/TrendChart";
import { PayoutHistory, StatementTable } from "./admin";
import { MerchantPicker } from "../components/ParcelForm";

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
        title={`Hello, ${me.businessName ?? me.name}`}
        subtitle="Your parcels and payments at a glance."
        actions={
          <>
            <Button variant="outline" icon={Upload} onClick={() => navigate("/app/parcels/bulk")}>Bulk upload</Button>
            <Button icon={Plus} onClick={() => navigate("/app/parcels/new")}>Create parcel</Button>
          </>
        }
      />
      <Card className="sunrise mb-6 overflow-hidden border-0 p-6 text-white">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-white/70">Current balance</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight">{tk(d.balance)}</p>
            <p className="mt-1 text-sm text-white/60">Will be paid in your next payout</p>
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-white/60">Total received</p>
              <p className="text-lg font-bold text-sun">{tk(d.totalPaid)}</p>
            </div>
            <div>
              <p className="text-white/60">Last payout</p>
              <p className="text-lg font-bold">{d.lastPayout ? `${tk(d.lastPayout.amount)} · ${date(d.lastPayout.at)}` : "—"}</p>
            </div>
          </div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total parcels" value={num(total)} icon={Package} hint={`${d.todayCreated} today`} />
        <StatCard label="In progress" value={num(c("pending", "picked_up", "at_hub", "out_for_delivery", "hold"))} icon={Truck} accent="brand" />
        <StatCard label="Delivered" value={num(delivered)} icon={PackageCheck} accent="green" hint={rate !== null ? `${rate}% success rate` : undefined} />
        <StatCard label="Returned" value={num(c("returned", "returning"))} icon={RotateCcw} accent="red" />
      </div>
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-bold">Last 14 days</h2>
          <TrendChart data={d.trend} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-bold">By status</h2>
          <div className="space-y-1">
            {(Object.keys(STATUS) as (keyof typeof STATUS)[]).filter((s) => (d.counts[s] ?? 0) > 0).map((s) => (
              <button key={s} onClick={() => navigate(`/app/parcels?status=${s}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-page">
                <span className={`size-2.5 rounded-full ${STATUS[s].dot}`} />
                <span className="flex-1 font-semibold">{STATUS[s].label}</span>
                <span className="font-bold">{d.counts[s]}</span>
              </button>
            ))}
            {total === 0 && <p className="py-6 text-center text-sm text-ink-3">No parcels yet — create your first one!</p>}
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
      <PageHeader title="Payments" subtitle="Your balance and payout history." />
      <Card className="mb-8 p-6">
        {!st ? (
          <Spinner />
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-page p-4">
                <p className="text-xs text-ink-3">Collected (unpaid)</p>
                <p className="text-xl font-bold">{tk(st.collected)}</p>
              </div>
              <div className="rounded-2xl bg-page p-4">
                <p className="text-xs text-ink-3">Charges</p>
                <p className="text-xl font-bold">− {tk(st.charges)}</p>
              </div>
              <div className="rounded-2xl bg-brand-50 p-4">
                <p className="text-xs text-brand-700">Next payout</p>
                <p className="text-xl font-extrabold text-brand-700">{tk(st.net)}</p>
              </div>
            </div>
            {st.count === 0 ? <p className="text-center text-sm text-ink-3">No unpaid parcels.</p> : <StatementTable rows={st.parcels} />}
          </>
        )}
      </Card>
      <h2 className="mb-3 font-bold">Payout history</h2>
      <PayoutHistory rows={history} />
    </>
  );
}

/* ------------------------------------------------------------ bulk upload */

const TEMPLATE_HEADER = "invoice,customer_name,customer_phone,address,district,zone,weight_kg,cod_amount,item,note";
const TEMPLATE_ROW = 'INV-1001,Rahim Uddin,01712345678,"House 12, Road 5, Mirpur 10",Dhaka,inside,1,1250,2 T-shirts,Call before delivery';

const ZONE_ALIASES: Record<string, Zone> = {
  inside: "inside_dhaka",
  inside_dhaka: "inside_dhaka",
  "inside dhaka": "inside_dhaka",
  sub: "sub_dhaka",
  sub_dhaka: "sub_dhaka",
  "sub dhaka": "sub_dhaka",
  outside: "outside_dhaka",
  outside_dhaka: "outside_dhaka",
  "outside dhaka": "outside_dhaka",
};

type Row = {
  invoice?: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  district: string;
  zone: Zone;
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
      setProblems(["The file has no data rows."]);
      setRows(null);
      return;
    }
    const head = table[0].map((h) => h.trim().toLowerCase());
    const col = (name: string) => head.indexOf(name);
    const need = ["customer_name", "customer_phone", "address", "cod_amount"];
    const missing = need.filter((n) => col(n) < 0);
    if (missing.length) {
      setProblems([`Missing column(s): ${missing.join(", ")}. Use the template.`]);
      setRows(null);
      return;
    }
    const issues: string[] = [];
    const out: Row[] = [];
    table.slice(1).forEach((r, i) => {
      if (r.every((c) => !c.trim())) return;
      const get = (n: string) => (col(n) >= 0 ? (r[col(n)] ?? "").trim() : "");
      const districtRaw = get("district") || "Dhaka";
      const district = DISTRICTS.find((d) => d.toLowerCase() === districtRaw.toLowerCase()) ?? districtRaw;
      const zone = ZONE_ALIASES[get("zone").toLowerCase()] ?? zoneFor(district);
      const cod = Number(get("cod_amount") || 0);
      const weight = Number(get("weight_kg") || 1);
      if (!get("customer_name") || !get("customer_phone") || !get("address")) issues.push(`Row ${i + 2}: name, phone and address are required.`);
      if (!Number.isFinite(cod) || cod < 0) issues.push(`Row ${i + 2}: cod_amount must be a number.`);
      if (!Number.isFinite(weight) || weight <= 0) issues.push(`Row ${i + 2}: weight_kg must be a positive number.`);
      out.push({
        invoice: get("invoice") || undefined,
        recipientName: get("customer_name"),
        recipientPhone: get("customer_phone"),
        recipientAddress: get("address"),
        district,
        zone,
        weightKg: weight,
        codAmount: cod,
        itemDescription: get("item") || undefined,
        note: get("note") || undefined,
      });
    });
    if (out.length > 200) issues.push("At most 200 parcels per upload — split the file.");
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
        title="Bulk upload"
        subtitle="Create up to 200 parcels at once from a CSV file (Excel → Save as CSV)."
        actions={<Button variant="outline" icon={Download} onClick={downloadTemplate}>Download template</Button>}
      />
      {me.role === "admin" && (
        <Card className="mb-4 p-6">
          <MerchantPicker value={merchantId} onChange={setMerchantId} />
        </Card>
      )}
      <Card className="p-6">
        <label className="flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-line px-6 py-12 text-center transition hover:border-brand hover:bg-brand-50/40">
          <FileSpreadsheet className="size-10 text-brand" />
          <span className="mt-3 font-bold">Choose a CSV file</span>
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
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2">Address</th>
                    <th className="px-3 py-2">Zone</th>
                    <th className="px-3 py-2 text-right">Kg</th>
                    <th className="px-3 py-2 text-right">COD</th>
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
                {rows.length} parcels · total COD {tk(rows.reduce((s, r) => s + r.codAmount, 0))}
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
                    toast.ok(`${r.length} parcels created.`);
                    navigate("/app/parcels");
                  } catch (e) {
                    toast.error(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Create {rows.length} parcels
              </Button>
            </div>
          </>
        )}
        {!rows && problems.length === 0 && (
          <Empty icon={Clock} title="Waiting for a file" text="Tip: download the template, fill it in Excel or Google Sheets, then save as CSV." />
        )}
      </Card>
    </>
  );
}

