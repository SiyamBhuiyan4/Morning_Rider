import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { CATEGORY, PAYOUT_METHOD, STATUS, ZONE, date, dateTime, tk } from "../lib/format";
import { Button, Spinner } from "../components/ui";
import { t } from "../lib/prefs";

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) JsBarcode(ref.current, value, { format: "CODE128", height: 46, width: 1.8, displayValue: false, margin: 0 });
  }, [value]);
  return <svg ref={ref} />;
}

/** Labels and invoices are printed on white paper whatever the screen theme. */
function useLightPage() {
  useEffect(() => {
    const root = document.documentElement;
    const before = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => {
      if (before) root.setAttribute("data-theme", before);
    };
  }, []);
}

function PrintBar({ ready }: { ready: boolean }) {
  useLightPage();
  return (
    <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-6 py-3">
      <span className="font-bold">{t("Print preview")}</span>
      <Button icon={Printer} disabled={!ready} onClick={() => window.print()}>{t("Print")}</Button>
    </div>
  );
}

export function PrintLabels({ ids }: { ids: Id<"parcels">[] }) {
  const { token } = useAuthed();
  const rows = useQuery(api.parcels.labels, { token, ids });
  return (
    <div className="min-h-full bg-white">
      <PrintBar ready={!!rows} />
      {!rows ? (
        <Spinner />
      ) : (
        <div className="mx-auto grid max-w-[210mm] grid-cols-2 gap-3 p-4 print:p-0">
          {rows.map((p) => (
            <div key={p._id} className="break-inside-avoid rounded-xl border-2 border-navy-900 p-3 text-[11px] leading-snug text-black">
              <div className="flex items-center justify-between border-b border-dashed border-black/40 pb-2">
                <div className="flex items-center gap-2">
                  <img src="/brand/logo-192.png" alt="" className="size-9 rounded-full" />
                  <div>
                    <p className="text-[13px] font-extrabold italic">
                      MORNING <span className="text-brand">{t("RIDER")}</span>
                    </p>
                    <p className="text-[9px] tracking-widest">{t("COURIER SERVICE")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[9px]">{t("COD")}</p>
                  <p className="text-lg font-extrabold">{tk(p.codAmount)}</p>
                </div>
              </div>
              <div className="flex flex-col items-center py-2">
                <Barcode value={p.trackingCode} />
                <p className="mt-1 font-mono text-sm font-bold tracking-[0.2em]">{p.trackingCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-dashed border-black/40 pt-2">
                <div>
                  <p className="font-bold uppercase">{t("To")}</p>
                  <p className="font-bold">{p.recipientName}</p>
                  <p>{p.recipientPhone}</p>
                  <p>{p.recipientAddress}</p>
                  <p className="font-semibold">{p.district} · {ZONE[p.zone]}</p>
                </div>
                <div>
                  <p className="font-bold uppercase">{t("From")}</p>
                  <p className="font-bold">{p.merchantName}</p>
                  <p>{p.merchantPhone}</p>
                  {p.invoice && <p>{t("Invoice")}: {p.invoice}</p>}
                  <p>{p.weightKg} {t("kg")} · {date(p.createdAt)}</p>
                  {p.itemDescription && <p>{p.itemDescription}</p>}
                </div>
              </div>
              {p.category && CATEGORY[p.category].careful && (
                <p className="mt-2 rounded border-2 border-black px-2 py-1 text-center font-extrabold uppercase">
                  {CATEGORY[p.category].emoji} {CATEGORY[p.category].careful}
                </p>
              )}
              {p.zone === "uttara" && <p className="mt-2 rounded bg-black px-2 py-1 text-center font-extrabold text-white">⚡ {t("3-hour express")}</p>}
              {p.note && <p className="mt-2 rounded bg-black/5 px-2 py-1">{t("Note")}: {p.note}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PrintPayout({ id }: { id: Id<"payouts"> }) {
  const { token } = useAuthed();
  const data = useQuery(api.money.payout, { token, id });
  return (
    <div className="min-h-full bg-white">
      <PrintBar ready={!!data} />
      {data === undefined ? (
        <Spinner />
      ) : data === null ? (
        <p className="p-10 text-center">{t("Invoice not found.")}</p>
      ) : (
        <div className="mx-auto max-w-[210mm] p-8 text-sm text-black print:p-0">
          <div className="flex items-start justify-between border-b-4 border-brand pb-5">
            <div className="flex items-center gap-3">
              <img src="/brand/logo-192.png" alt="" className="size-16 rounded-full" />
              <div>
                <p className="text-2xl font-extrabold italic text-navy-900">
                  MORNING <span className="text-brand">{t("RIDER")}</span>
                </p>
                <p className="text-xs tracking-widest">{t("COURIER SERVICE · FAST • SAFE • ON TIME")}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">{t("PAYMENT INVOICE")}</p>
              <p className="font-mono text-xs">#{data.payout._id.slice(-8).toUpperCase()}</p>
              <p>{dateTime(data.payout.createdAt)}</p>
            </div>
          </div>
          <div className="mt-5 flex justify-between">
            <div>
              <p className="text-xs font-bold text-ink-3 uppercase">{t("Paid to")}</p>
              <p className="font-bold">{data.merchant?.businessName}</p>
              <p>{data.merchant?.name} · {data.merchant?.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-ink-3 uppercase">{t("Method")}</p>
              <p className="font-bold">{PAYOUT_METHOD[data.payout.method]}</p>
              {data.payout.reference && <p>Ref: {data.payout.reference}</p>}
            </div>
          </div>
          <table className="mt-6 w-full">
            <thead>
              <tr className="border-b-2 border-black text-left text-xs uppercase">
                <th className="py-2">{t("Tracking")}</th>
                <th className="py-2">{t("Customer")}</th>
                <th className="py-2">{t("Status")}</th>
                <th className="py-2 text-right">{t("Collected")}</th>
                <th className="py-2 text-right">{t("Charges")}</th>
                <th className="py-2 text-right">{t("Net")}</th>
              </tr>
            </thead>
            <tbody>
              {data.parcels.map((p) => (
                <tr key={p.trackingCode} className="border-b border-black/10">
                  <td className="py-1.5 font-mono">{p.trackingCode}</td>
                  <td className="py-1.5">{p.recipientName}</td>
                  <td className="py-1.5">{STATUS[p.status].label}</td>
                  <td className="py-1.5 text-right">{tk(p.collectedAmount)}</td>
                  <td className="py-1.5 text-right">{tk(p.deliveryCharge + p.codCharge)}</td>
                  <td className="py-1.5 text-right font-semibold">{tk(p.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-5 ml-auto w-72 space-y-1">
            <div className="flex justify-between"><span>{t("Total collected")}</span><span>{tk(data.payout.collected)}</span></div>
            <div className="flex justify-between"><span>{t("Morning Rider charges")}</span><span>− {tk(data.payout.charges)}</span></div>
            <div className="flex justify-between border-t-2 border-black pt-1 text-lg font-extrabold"><span>{t("Paid")}</span><span>{tk(data.payout.amount)}</span></div>
          </div>
          <p className="mt-12 text-center text-xs text-black/60">{t("Thank you for shipping with Morning Rider.")}</p>
        </div>
      )}
    </div>
  );
}
