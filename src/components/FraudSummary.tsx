import { useQuery } from "convex/react";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useAuthed } from "../lib/session";
import { date, num } from "../lib/format";
import { cx } from "./ui";
import { t } from "../lib/prefs";

/** A customer's delivery record across Morning Rider, by phone number. */
export function FraudSummary({ phone, compact }: { phone: string; compact?: boolean }) {
  const { token } = useAuthed();
  const r = useQuery(api.parcels.fraudCheck, { token, phone });
  if (!r) return null;

  const risk =
    r.successRate === null ? "new" : r.successRate >= 80 ? "good" : r.successRate >= 50 ? "medium" : "bad";
  const Icon = risk === "good" ? ShieldCheck : risk === "new" ? ShieldQuestion : ShieldAlert;
  const tone = {
    good: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    medium: "bg-amber-50 text-amber-800 ring-amber-200",
    bad: "bg-red-50 text-red-800 ring-red-200",
    new: "bg-navy-50 text-navy-800 ring-navy-100",
  }[risk];
  const headline = {
    good: "Trusted customer",
    medium: "Some returns — be careful",
    bad: "High return risk",
    new: "New customer — no history yet",
  }[risk];

  return (
    <div className={cx("rounded-2xl p-4 ring-1", tone)}>
      <div className="flex items-center gap-3">
        <Icon className="size-6 shrink-0" />
        <div className="flex-1">
          <p className="font-bold">{t(headline)}</p>
          {r.successRate !== null && (
            <p className="text-sm opacity-80">
              {t("{rate}% success · {n} parcels", { rate: r.successRate, n: r.total })}
              {r.lastOrderAt && ` · ${t("last order {date}", { date: date(r.lastOrderAt) })}`}
            </p>
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {[
            ["Total", r.total],
            ["Delivered", r.delivered],
            ["Returned", r.returned],
            ["Cancelled", r.cancelled],
          ].map(([l, n]) => (
            <div key={l} className="rounded-xl bg-white/70 py-3 dark:bg-white/5">
              <p className="text-xl font-extrabold">{num(Number(n))}</p>
              <p className="text-[11px] leading-tight font-medium opacity-70">{t(String(l))}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
