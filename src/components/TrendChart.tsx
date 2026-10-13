import { useState } from "react";
import { getLang, t } from "../lib/prefs";
import { shortDate } from "../lib/format";

type Point = { day: number; created: number; delivered: number; month?: boolean };

/** Paired bars per day: parcels booked (navy) and delivered (orange). */
export function TrendChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.delivered]));
  const monthly = data.some((d) => d.month);
  const label = (ms: number) =>
    monthly ? new Date(ms).toLocaleDateString(getLang() === "bn" ? "bn-BD" : "en-GB", { month: "short", year: "2-digit" }) : shortDate(ms);
  const many = data.length > 31;

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-xs font-semibold text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-navy-800" /> {t("Booked")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand" /> {t("Delivered")}
        </span>
        {hover !== null && (
          <span className="ml-auto text-ink">
            {label(data[hover].day)}: {t("{booked} booked · {delivered} delivered", { booked: data[hover].created, delivered: data[hover].delivered })}
          </span>
        )}
      </div>
      <div className={`flex h-44 items-end ${many ? "gap-0.5" : "gap-1.5"}`} onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={d.day}
            className="group flex h-full flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
          >
            <div className={`flex h-full items-end justify-center ${many ? "gap-px" : "gap-[3px]"}`}>
              <div
                className="animate-grow w-full max-w-3 rounded-t-[4px] bg-navy-800 transition-[height,opacity] duration-700 group-hover:opacity-80"
                style={{ animationDelay: `${Math.min(i * 40, 900)}ms`, height: `${(d.created / max) * 100}%`, minHeight: d.created ? 3 : 0 }}
              />
              <div
                className="animate-grow w-full max-w-3 rounded-t-[4px] bg-brand transition-[height,opacity] duration-700 group-hover:opacity-80"
                style={{ animationDelay: `${Math.min(i * 40, 900) + 20}ms`, height: `${(d.delivered / max) * 100}%`, minHeight: d.delivered ? 3 : 0 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-3">
        <span>{label(data[0].day)}</span>
        <span>{monthly ? label(data[data.length - 1].day) : t("Today")}</span>
      </div>
    </div>
  );
}
