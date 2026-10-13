import { useMemo, useState } from "react";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { getLang, t } from "../lib/prefs";
import { date, num, shortDate, startOfToday } from "../lib/format";
import { Button, Modal, cx } from "./ui";

const DAY = 86_400_000;
const MAX_CUSTOM_DAYS = 366;

export type RangePreset = "today" | "7d" | "30d" | "90d" | "12m" | "custom" | "all";

/** A date range: `from` inclusive, `to` exclusive, both local-midnight timestamps. */
export type DateRange = { preset: RangePreset; from: number; to: number; days: number };

const PRESETS: { key: Exclude<RangePreset, "custom">; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "90d", label: "90D" },
  { key: "12m", label: "12M" },
];

function addDays(ms: number, n: number) {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

function presetRange(preset: Exclude<RangePreset, "custom">): DateRange {
  const today = startOfToday();
  const tomorrow = addDays(today, 1);
  if (preset === "all") return { preset, from: 0, to: tomorrow, days: 0 };
  const days = { today: 1, "7d": 7, "30d": 30, "90d": 90, "12m": 365 }[preset];
  return { preset, from: addDays(tomorrow, -days), to: tomorrow, days };
}

/**
 * A range the page keeps while you move around: remembered per page for the
 * browser session, so going to a parcel and back doesn't lose it.
 */
export function useDateRange(key: string, initial: Exclude<RangePreset, "custom"> = "30d") {
  const storeKey = `mr.range.${key}`;
  const [range, setRangeState] = useState<DateRange>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storeKey) ?? "null") as DateRange | null;
      if (saved?.preset === "custom") return saved;
      if (saved?.preset) return presetRange(saved.preset as Exclude<RangePreset, "custom">);
    } catch {
      /* ignore */
    }
    return presetRange(initial);
  });
  const setRange = (r: DateRange) => {
    setRangeState(r);
    try {
      sessionStorage.setItem(storeKey, JSON.stringify(r));
    } catch {
      /* private mode */
    }
  };
  return [range, setRange] as const;
}

/** Short words for a range, e.g. "Today", "Last 7 days", "3 Oct – 9 Oct". */
export function rangeLabel(r: DateRange) {
  if (r.preset === "today") return t("Today");
  if (r.preset === "all") return t("All time");
  if (r.preset === "custom") {
    const last = addDays(r.to, -1);
    return r.from === last ? date(r.from) : `${shortDate(r.from)} – ${date(last)}`;
  }
  if (r.preset === "12m") return t("Last 12 months");
  return t("Last {n} days", { n: r.days });
}

/** Today / 7D / 30D / 90D / 12M / Custom, the same row the Ledger app uses. */
export function RangePills({
  value,
  onChange,
  withAll,
  className,
}: {
  value: DateRange;
  onChange: (r: DateRange) => void;
  withAll?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const items = withAll ? [...PRESETS, { key: "all" as const, label: "All" }] : PRESETS;
  return (
    <>
      <div
        role="group"
        aria-label={t("Date range")}
        className={cx("inline-flex flex-wrap items-center gap-1 rounded-2xl border border-line bg-surface p-1 shadow-sm", className)}
      >
        {items.map((p) => {
          const active = value.preset === p.key;
          return (
            <button
              key={p.key}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(presetRange(p.key))}
              className={cx(
                "h-8 rounded-xl px-3 text-[12.5px] font-bold transition",
                active ? "bg-brand text-white shadow-md shadow-brand/30" : "text-ink-3 hover:bg-page hover:text-ink",
              )}
            >
              {t(p.label)}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={value.preset === "custom"}
          onClick={() => setOpen(true)}
          className={cx(
            "flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-bold transition",
            value.preset === "custom" ? "bg-brand text-white shadow-md shadow-brand/30" : "text-ink-3 hover:bg-page hover:text-ink",
          )}
        >
          <CalendarRange className="size-3.5" />
          {value.preset === "custom" ? rangeLabel(value) : t("Custom")}
        </button>
      </div>
      {open && (
        <RangeCalendar
          initial={value}
          onClose={() => setOpen(false)}
          onApply={(from, lastDay) => {
            const to = addDays(lastDay, 1);
            onChange({ preset: "custom", from, to, days: Math.round((to - from) / DAY) });
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

/** Calendar weeks for one month, Saturday first (the Bangladeshi week). Days outside the month are null. */
function monthMatrix(year: number, month: number): (number | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (first.getDay() + 1) % 7; // Sat=0 … Fri=6
  const cells: (number | null)[] = Array(lead).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d).getTime());
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Pick a start day, then an end day; the span between lights up as you hover,
 * so you can see how long the range is before applying it.
 */
function RangeCalendar({
  initial,
  onClose,
  onApply,
}: {
  initial: DateRange;
  onClose: () => void;
  onApply: (from: number, lastDay: number) => void;
}) {
  const today = startOfToday();
  const locale = getLang() === "bn" ? "bn-BD" : "en-GB";
  const [from, setFrom] = useState<number | null>(initial.from > 0 ? initial.from : addDays(today, -6));
  const [last, setLast] = useState<number | null>(initial.from > 0 ? addDays(initial.to, -1) : today);
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState(() => new Date(last ?? today));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const weeks = useMemo(() => monthMatrix(year, month), [year, month]);
  const weekdays = useMemo(() => {
    const sat = new Date(2024, 0, 6); // a Saturday
    return Array.from({ length: 7 }, (_, i) => new Date(addDays(sat.getTime(), i)).toLocaleDateString(locale, { weekday: "short" }));
  }, [locale]);
  const atThisMonth = year === new Date(today).getFullYear() && month === new Date(today).getMonth();

  const end = last ?? hover;
  const lo = from !== null && end !== null ? Math.min(from, end) : null;
  const hi = from !== null && end !== null ? Math.max(from, end) : null;
  const span = from !== null && last !== null ? Math.round((last - from) / DAY) + 1 : null;

  const pick = (ts: number) => {
    if (from === null || last !== null) {
      setFrom(ts);
      setLast(null);
      return;
    }
    let a = Math.min(from, ts);
    let b = Math.max(from, ts);
    if (Math.round((b - a) / DAY) + 1 > MAX_CUSTOM_DAYS) {
      if (ts > from) b = addDays(a, MAX_CUSTOM_DAYS - 1);
      else a = addDays(b, -(MAX_CUSTOM_DAYS - 1));
    }
    setFrom(a);
    setLast(b);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Choose dates")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button disabled={from === null || last === null} onClick={() => from !== null && last !== null && onApply(from, last)}>
            {t("Apply")}
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-xs space-y-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label={t("Previous month")}
            className="grid size-9 place-items-center rounded-xl text-ink-3 hover:bg-page hover:text-ink"
          >
            <ChevronLeft className="size-5" />
          </button>
          <p className="font-bold">{cursor.toLocaleDateString(locale, { month: "long", year: "numeric" })}</p>
          <button
            type="button"
            disabled={atThisMonth}
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label={t("Next month")}
            className="grid size-9 place-items-center rounded-xl text-ink-3 hover:bg-page hover:text-ink disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        <div>
          <div className="grid grid-cols-7">
            {weekdays.map((w, i) => (
              <div key={i} className={cx("grid h-8 place-items-center text-[11px] font-bold text-ink-3", i === 6 && "text-brand")}>
                {w}
              </div>
            ))}
          </div>
          <div className="space-y-0.5" onMouseLeave={() => setHover(null)}>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
                {week.map((ts, di) => {
                  if (ts === null) return <div key={di} className="h-9" />;
                  const disabled = ts > today;
                  const isStart = lo !== null && ts === lo;
                  const isEnd = hi !== null && ts === hi;
                  const inside = lo !== null && hi !== null && ts > lo && ts < hi;
                  const single = isStart && isEnd;
                  return (
                    <div
                      key={di}
                      className={cx(
                        "relative grid h-9 place-items-center",
                        inside && "bg-brand/12",
                        isStart && !single && "rounded-l-full bg-brand/12",
                        isEnd && !single && "rounded-r-full bg-brand/12",
                      )}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => pick(ts)}
                        onMouseEnter={() => setHover(ts)}
                        className={cx(
                          "grid size-9 place-items-center rounded-full text-[13px] font-semibold transition",
                          disabled && "pointer-events-none text-ink-3/30",
                          !disabled && !(isStart || isEnd) && "text-ink-2 hover:bg-page",
                          (isStart || isEnd) && "bg-brand text-white shadow-md shadow-brand/30",
                          !disabled && ts === today && !(isStart || isEnd) && "ring-1 ring-brand/60 ring-inset",
                        )}
                      >
                        {num(new Date(ts).getDate())}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-page px-3 py-2.5 text-center text-sm">
          {from !== null && last !== null ? (
            <span className="font-semibold">
              {date(from)} – {date(last)} <span className="font-normal text-ink-3">· {t("{n} days", { n: span ?? 0 })}</span>
            </span>
          ) : (
            <span className="text-ink-3">{t("Now pick the last day")}</span>
          )}
        </div>
      </div>
    </Modal>
  );
}
