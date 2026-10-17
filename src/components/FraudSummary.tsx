import { useQuery } from "convex/react";
import { Ban, CheckCircle2, Clock, Package, RotateCcw, ShieldAlert, ShieldCheck, ShieldQuestion, Store } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useAuthed } from "../lib/session";
import { date, num, tk } from "../lib/format";
import { cx } from "./ui";
import { t } from "../lib/prefs";

type Level = "low" | "medium" | "high";

const LEVEL: Record<Level, { color: string; text: string; ring: string; soft: string; label: string; advice: string }> = {
  low: {
    color: "#10b981",
    text: "text-emerald-600 dark:text-emerald-400",
    ring: "ring-emerald-200 dark:ring-emerald-500/30",
    soft: "bg-emerald-50 dark:bg-emerald-500/10",
    label: "Low risk",
    advice: "Safe to send.",
  },
  medium: {
    color: "#f59e0b",
    text: "text-amber-600 dark:text-amber-400",
    ring: "ring-amber-200 dark:ring-amber-500/30",
    soft: "bg-amber-50 dark:bg-amber-500/10",
    label: "Medium risk",
    advice: "Call the customer to confirm before sending.",
  },
  high: {
    color: "#ef4444",
    text: "text-red-600 dark:text-red-400",
    ring: "ring-red-200 dark:ring-red-500/30",
    soft: "bg-red-50 dark:bg-red-500/10",
    label: "High risk",
    advice: "Take the delivery charge in advance, or don't send.",
  },
};

/** A customer's delivery record across Morning Rider, by phone number, with a risk meter. */
export function FraudSummary({ phone, compact }: { phone: string; compact?: boolean }) {
  const { token } = useAuthed();
  const r = useQuery(api.parcels.fraudCheck, { token, phone });
  if (!r) return null;
  const L = LEVEL[r.riskLevel];
  const Icon = r.isNew ? ShieldQuestion : r.riskLevel === "low" ? ShieldCheck : ShieldAlert;

  if (compact) {
    return (
      <div className={cx("rounded-2xl p-3.5 ring-1", L.soft, L.ring)}>
        <div className="flex items-center gap-3">
          <Icon className={cx("size-6 shrink-0", L.text)} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center justify-between gap-2 font-bold">
              <span className={L.text}>{r.isNew ? t("No delivery history for this number yet") : t(L.label)}</span>
              <span className={cx("text-lg font-extrabold", L.text)}>{t("{n}% risk", { n: r.riskScore })}</span>
            </p>
            <RiskBar score={r.riskScore} />
            {r.total > 0 && (
              <p className="mt-1.5 text-xs text-ink-2">
                {t("{d} delivered · {ret} returned · {n} parcels", { d: r.delivered, ret: r.returned, n: r.total })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={cx("rounded-3xl p-5 ring-1 sm:p-6", L.soft, L.ring)}>
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <RiskGauge score={r.riskScore} color={L.color} />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-mono text-sm text-ink-2">{r.phone}</p>
            <p className={cx("mt-1 flex items-center justify-center gap-2 text-2xl font-extrabold sm:justify-start", L.text)}>
              <Icon className="size-7" /> {t(L.label)}
            </p>
            <p className="mt-1 text-sm font-medium text-ink">{r.isNew ? t("No delivery history for this number yet") : t(L.advice)}</p>
            <ul className="mt-3 space-y-1 text-sm text-ink-2">
              {r.reasons.map((x) => (
                <li key={x.text} className="flex items-start gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: L.color }} />
                  {t(x.text, { a: x.a ?? 0, b: x.b ?? 0 })}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile icon={Package} label={t("Total parcels")} value={num(r.total)} />
        <Tile icon={CheckCircle2} label={t("Received")} value={num(r.delivered)} tone="text-emerald-600 dark:text-emerald-400" />
        <Tile icon={RotateCcw} label={t("Refused / returned")} value={num(r.returned)} tone="text-red-600 dark:text-red-400" />
        <Tile icon={Ban} label={t("Cancelled")} value={num(r.cancelled)} />
      </div>

      {r.total > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">{t("Success rate")}</span>
            <span className="font-bold text-ink">{r.successRate === null ? "—" : `${num(r.successRate)}%`}</span>
          </div>
          <SplitBar delivered={r.delivered} returned={r.returned} cancelled={r.cancelled} inProgress={r.inProgress} />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
            <Legend color="bg-emerald-500" label={t("Received")} />
            <Legend color="bg-red-500" label={t("Returned")} />
            <Legend color="bg-slate-400" label={t("Cancelled")} />
            <Legend color="bg-sky-500" label={t("On the way ({n})", { n: r.inProgress })} />
          </div>
        </div>
      )}

      {r.total > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-ink-3">{t("Cash paid by customer")}</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{tk(r.collected)}</p>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="text-xs text-ink-3">{t("Cash refused (returns, short payments)")}</p>
            <p className="text-xl font-extrabold text-red-600 dark:text-red-400">{tk(r.refused)}</p>
          </div>
        </div>
      )}

      {r.total > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
          {r.mine !== null && (
            <span className="flex items-center gap-1.5">
              <Store className="size-3.5" /> {t("{n} of these were your parcels", { n: r.mine })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Store className="size-3.5" /> {t("Ordered from {n} businesses", { n: r.merchants })}
          </span>
          {r.firstOrderAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> {t("first order {date}", { date: date(r.firstOrderAt) })}
            </span>
          )}
          {r.lastOrderAt && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" /> {t("last order {date}", { date: date(r.lastOrderAt) })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Half-circle meter: green → yellow → red, with a needle at the score. */
function RiskGauge({ score, color }: { score: number; color: string }) {
  const r = 80;
  const cx0 = 100;
  const cy0 = 100;
  const angle = Math.PI * (1 - score / 100); // 180° at 0, 0° at 100
  const nx = cx0 + (r - 18) * Math.cos(angle);
  const ny = cy0 - (r - 18) * Math.sin(angle);
  const arc = `M ${cx0 - r} ${cy0} A ${r} ${r} 0 0 1 ${cx0 + r} ${cy0}`;
  const length = Math.PI * r;
  return (
    <div className="w-56 shrink-0" role="img" aria-label={t("{n}% risk", { n: score })}>
      <svg viewBox="0 0 200 112" className="w-full">
        <defs>
          <linearGradient id="risk-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="45%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d={arc} fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" className="text-black/10 dark:text-white/10" />
        <path
          d={arc}
          fill="none"
          stroke="url(#risk-grad)"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
        {[0, 30, 60, 100].map((v) => {
          const a = Math.PI * (1 - v / 100);
          return (
            <line
              key={v}
              x1={cx0 + (r + 11) * Math.cos(a)}
              y1={cy0 - (r + 11) * Math.sin(a)}
              x2={cx0 + (r + 15) * Math.cos(a)}
              y2={cy0 - (r + 15) * Math.sin(a)}
              stroke="currentColor"
              strokeWidth="2"
              className="text-ink-3"
            />
          );
        })}
        <line
          x1={cx0}
          y1={cy0}
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          style={{ transition: "all 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
        <circle cx={cx0} cy={cy0} r="8" fill={color} />
        <circle cx={cx0} cy={cy0} r="3.5" className="fill-surface" />
      </svg>
      <p className="-mt-1 text-center text-4xl leading-none font-black tracking-tight" style={{ color }}>
        {num(score)}%
      </p>
      <p className="mt-1 text-center text-xs font-semibold tracking-wide text-ink-3 uppercase">{t("Risk")}</p>
    </div>
  );
}

function RiskBar({ score }: { score: number }) {
  return (
    <div className="relative mt-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500">
      <span
        className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow"
        style={{ left: `${score}%` }}
      />
    </div>
  );
}

function SplitBar(p: { delivered: number; returned: number; cancelled: number; inProgress: number }) {
  const total = p.delivered + p.returned + p.cancelled + p.inProgress || 1;
  const parts: [number, string][] = [
    [p.delivered, "bg-emerald-500"],
    [p.returned, "bg-red-500"],
    [p.cancelled, "bg-slate-400"],
    [p.inProgress, "bg-sky-500"],
  ];
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-page">
      {parts.map(([n, c], i) => n > 0 && <div key={i} className={c} style={{ width: `${(n / total) * 100}%` }} />)}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cx("size-2.5 rounded-full", color)} /> {label}
    </span>
  );
}

function Tile({ icon: Icon, label, value, tone }: { icon: typeof Package; label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <Icon className={cx("size-5", tone ?? "text-ink-3")} />
      <p className={cx("mt-2 text-2xl font-extrabold", tone ?? "text-ink")}>{value}</p>
      <p className="text-xs text-ink-2">{label}</p>
    </div>
  );
}
