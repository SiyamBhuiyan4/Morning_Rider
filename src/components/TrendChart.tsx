import { useState } from "react";
import { getLang, t } from "../lib/prefs";
import { num, shortDate } from "../lib/format";

type Point = { day: number; created: number; delivered: number; month?: boolean };

/** Paired bars per day: parcels booked (navy) and delivered (orange). */
export function TrendChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.delivered]));
  const monthly = data.some((d) => d.month);
  const label = (ms: number) =>
    monthly ? new Date(ms).toLocaleDateString(getLang() === "bn" ? "bn-BD" : "en-GB", { month: "short", year: "2-digit" }) : shortDate(ms);
  const many = data.length > 31;

  const totalCreated = data.reduce((s, d) => s + d.created, 0);
  const totalDelivered = data.reduce((s, d) => s + d.delivered, 0);
  const rate = totalCreated > 0 ? Math.round((totalDelivered / totalCreated) * 100) : 0;

  return (
    <div>
      {/* Executive stats summary bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 text-xs">
        <div className="flex flex-wrap items-center gap-4 font-semibold text-ink-2">
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-navy-800 dark:bg-navy-600 shadow-sm" />
            <span className="text-ink-3">{t("Booked")}:</span>
            <span className="font-bold text-ink">{num(totalCreated)}</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-brand shadow-sm shadow-brand/30" />
            <span className="text-ink-3">{t("Delivered")}:</span>
            <span className="font-bold text-brand">{num(totalDelivered)}</span>
          </span>
          <span className="hidden items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 sm:inline-flex">
            <span>{rate}%</span>
            <span className="font-normal opacity-80">{t("Delivery rate")}</span>
          </span>
        </div>

        {hover !== null ? (
          <div className="rounded-lg bg-page px-3 py-1 font-semibold text-ink shadow-xs ring-1 ring-line">
            <span className="text-brand mr-1">{label(data[hover].day)}:</span>
            <span>
              {t("{booked} booked · {delivered} delivered", {
                booked: data[hover].created,
                delivered: data[hover].delivered,
              })}
            </span>
          </div>
        ) : (
          <span className="text-xs text-ink-3">{t("Hover bars to inspect day")}</span>
        )}
      </div>

      {/* Chart container with horizontal guideline reference lines */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-x-0 inset-y-0 flex flex-col justify-between opacity-30">
          <div className="border-b border-dashed border-line" />
          <div className="border-b border-dashed border-line" />
          <div className="border-b border-dashed border-line" />
          <div className="border-b border-line" />
        </div>

        <div className={`relative flex h-56 items-end pt-2 ${many ? "gap-0.5" : "gap-1.5"}`} onMouseLeave={() => setHover(null)}>
          {data.map((d, i) => (
            <div
              key={d.day}
              className={`group relative flex h-full flex-1 flex-col justify-end rounded-lg transition-colors duration-150 ${
                hover === i ? "bg-navy-50/70 dark:bg-white/[0.04]" : ""
              }`}
              onMouseEnter={() => setHover(i)}
            >
              <div className={`flex h-full items-end justify-center px-0.5 ${many ? "gap-px" : "gap-1"}`}>
                <div
                  className="animate-grow w-full max-w-3.5 rounded-t-[5px] bg-gradient-to-t from-navy-950 to-navy-700 transition-[height,opacity] duration-700 group-hover:brightness-110 dark:from-navy-800 dark:to-navy-600"
                  style={{ animationDelay: `${Math.min(i * 30, 800)}ms`, height: `${(d.created / max) * 100}%`, minHeight: d.created ? 4 : 0 }}
                  title={`${d.created} booked`}
                />
                <div
                  className="animate-grow w-full max-w-3.5 rounded-t-[5px] bg-gradient-to-t from-brand-700 to-brand transition-[height,opacity] duration-700 group-hover:brightness-110 shadow-xs shadow-brand/20"
                  style={{ animationDelay: `${Math.min(i * 30, 800) + 20}ms`, height: `${(d.delivered / max) * 100}%`, minHeight: d.delivered ? 4 : 0 }}
                  title={`${d.delivered} delivered`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Date footer */}
      <div className="mt-3 flex justify-between text-[11px] font-medium text-ink-3">
        <span>{label(data[0].day)}</span>
        {data.length > 6 && <span>{label(data[Math.floor(data.length / 2)].day)}</span>}
        <span>{monthly ? label(data[data.length - 1].day) : t("Today")}</span>
      </div>
    </div>
  );
}

