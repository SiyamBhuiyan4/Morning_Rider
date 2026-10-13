import { useState } from "react";
import { t } from "../lib/prefs";

type Point = { day: number; created: number; delivered: number };

/** Paired bars per day: parcels booked (navy) and delivered (orange). */
export function TrendChart({ data }: { data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.delivered]));
  const label = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

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
            {label(data[hover].day)}: {data[hover].created} {t("Booked")} · {data[hover].delivered} {t("Delivered")}
          </span>
        )}
      </div>
      <div className="flex h-44 items-end gap-1.5" onMouseLeave={() => setHover(null)}>
        {data.map((d, i) => (
          <div
            key={d.day}
            className="group flex h-full flex-1 flex-col justify-end"
            onMouseEnter={() => setHover(i)}
          >
            <div className="flex h-full items-end justify-center gap-[3px]">
              <div
                className="w-full max-w-3 rounded-t-[4px] bg-navy-800 transition-opacity group-hover:opacity-80"
                style={{ height: `${(d.created / max) * 100}%`, minHeight: d.created ? 3 : 0 }}
              />
              <div
                className="w-full max-w-3 rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
                style={{ height: `${(d.delivered / max) * 100}%`, minHeight: d.delivered ? 3 : 0 }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-3">
        <span>{label(data[0].day)}</span>
        <span>{t("Today")}</span>
      </div>
    </div>
  );
}
