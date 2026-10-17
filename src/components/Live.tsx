import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import {
  Ban,
  Bike,
  Building2,
  CheckCircle2,
  Clock,
  Package,
  PackageCheck,
  PauseCircle,
  RotateCcw,
  Truck,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { num, tk } from "../lib/format";
import { getLang, t } from "../lib/prefs";
import { Card, cx } from "./ui";
import { ParcelDetail } from "./ParcelDetail";

/** Re-renders every `ms` so relative times and clocks keep moving. */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

/** "just now", "5 min ago", "2 h ago". */
export function ago(at: number, now: number) {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return t("just now");
  const m = Math.round(s / 60);
  if (m < 60) return t("{n} min ago", { n: m });
  const h = Math.round(m / 60);
  if (h < 24) return t("{n} h ago", { n: h });
  return t("{n} d ago", { n: Math.round(h / 24) });
}

/** Pulsing "LIVE" pill with a ticking Dhaka clock. */
export function LiveBadge() {
  const now = useNow(1000);
  const time = new Date(now).toLocaleTimeString(getLang() === "bn" ? "bn-BD" : "en-GB", {
    timeZone: "Asia/Dhaka",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return (
    <span className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-1.5 pr-3.5 pl-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
      </span>
      <span className="keep-tracking tracking-[0.14em]">LIVE</span>
      <span className="font-mono font-semibold text-ink-2 tabular-nums">{time}</span>
    </span>
  );
}

/**
 * A number that counts up (or down) to its new value and flashes when it
 * changes, so live updates are easy to notice.
 */
export function Ticker({ value, format = num }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const current = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    const start = current.current;
    let flashOff: ReturnType<typeof setTimeout> | undefined;
    if (mounted.current && start !== value) {
      setFlash(value > start ? "up" : "down");
      flashOff = setTimeout(() => setFlash(null), 1400);
    }
    mounted.current = true;
    if (start === value) return;
    const began = performance.now();
    let raf = 0;
    const step = (at: number) => {
      const k = Math.min(1, (at - began) / 900);
      const next = Math.round(start + (value - start) * (1 - Math.pow(1 - k, 3)));
      current.current = next;
      setShown(next);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      if (flashOff) clearTimeout(flashOff);
    };
  }, [value]);

  return (
    <span
      className={cx(
        "tabular-nums transition-colors duration-700",
        flash === "up" && "text-emerald-500",
        flash === "down" && "text-rose-500",
      )}
    >
      {format(shown)}
    </span>
  );
}

const FEED_ICON: Record<Doc<"parcels">["status"], { icon: LucideIcon; tone: string }> = {
  pending: { icon: Package, tone: "bg-slate-500/15 text-slate-500 dark:text-slate-300" },
  picked_up: { icon: Bike, tone: "bg-sky-500/15 text-sky-500" },
  at_hub: { icon: Building2, tone: "bg-indigo-500/15 text-indigo-500 dark:text-indigo-300" },
  out_for_delivery: { icon: Truck, tone: "bg-brand/15 text-brand" },
  hold: { icon: PauseCircle, tone: "bg-amber-500/15 text-amber-500" },
  delivered: { icon: CheckCircle2, tone: "bg-emerald-500/15 text-emerald-500" },
  partial_delivered: { icon: PackageCheck, tone: "bg-teal-500/15 text-teal-500" },
  returning: { icon: Undo2, tone: "bg-rose-500/15 text-rose-500" },
  returned: { icon: RotateCcw, tone: "bg-red-500/15 text-red-500" },
  cancelled: { icon: Ban, tone: "bg-zinc-500/15 text-zinc-500" },
};

type FeedItem = NonNullable<ReturnType<typeof useQuery<typeof api.live.feed>>>[number];

function sentence(e: FeedItem) {
  const who = e.byName || t("Office");
  switch (e.status) {
    case "pending":
      return t("{merchant} booked a parcel to {area}", { merchant: e.merchantName, area: e.area });
    case "picked_up":
      return t("{rider} picked up a parcel from {merchant}", { rider: who, merchant: e.merchantName });
    case "at_hub":
      return t("Parcel from {merchant} reached the hub", { merchant: e.merchantName });
    case "out_for_delivery":
      return t("Out for delivery to {area}", { area: e.area });
    case "delivered":
      return e.collectedAmount > 0
        ? t("{rider} delivered in {area} and collected {amount}", { rider: who, area: e.area, amount: tk(e.collectedAmount) })
        : t("{rider} delivered in {area}", { rider: who, area: e.area });
    case "partial_delivered":
      return t("{rider} made a partial delivery, collected {amount}", { rider: who, amount: tk(e.collectedAmount) });
    case "hold":
      return t("Delivery put on hold in {area}", { area: e.area });
    case "returning":
      return t("Customer in {area} didn't take it, returning", { area: e.area });
    case "returned":
      return t("Returned to {merchant}", { merchant: e.merchantName });
    case "cancelled":
      return t("{merchant} cancelled a parcel", { merchant: e.merchantName });
  }
}

/** Everything happening to parcels, as it happens. New lines slide in at the top. */
export function LiveFeed() {
  const { token } = useAuthed();
  const items = useQuery(api.live.feed, { token });
  const now = useNow(15_000);
  const seen = useRef<Set<string> | null>(null);
  const [open, setOpen] = useState<Id<"parcels"> | null>(null);

  // Items that weren't there on the previous render get the "new" animation.
  const fresh = new Set<string>();
  if (items) {
    if (seen.current) for (const e of items) if (!seen.current.has(e._id)) fresh.add(e._id);
  }
  useEffect(() => {
    if (items) seen.current = new Set(items.map((e) => e._id));
  }, [items]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 font-bold">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-brand" />
          </span>
          {t("Live activity")}
        </h2>
        <span className="text-xs text-ink-3">{t("Updates by itself")}</span>
      </div>
      {!items ? (
        <div className="h-72 animate-pulse bg-page/50" />
      ) : items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-3">{t("No recent activity to show.")}</p>
      ) : (
        <ul className="max-h-[26rem] divide-y divide-line overflow-y-auto">
          {items.map((e) => {
            const I = FEED_ICON[e.status];
            return (
              <li key={e._id} className={cx(fresh.has(e._id) && "animate-feed-in")}>
                <button
                  type="button"
                  onClick={() => setOpen(e.parcelId)}
                  className="flex w-full items-start gap-3 px-5 py-3 text-left transition hover:bg-page"
                >
                  <span className={cx("mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl", I.tone)}>
                    <I.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm leading-snug text-ink">{sentence(e)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-3">
                      <span className="font-mono">{e.trackingCode}</span>
                      {e.note && e.note !== "Parcel created" && <span className="truncate">· {t(e.note)}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-ink-3 tabular-nums">{ago(e.at, now)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <ParcelDetail id={open} onClose={() => setOpen(null)} />
    </Card>
  );
}

/** Riders out working, each riding along a little road. */
export function RidersOnRoad({ dayStart }: { dayStart: number }) {
  const { token } = useAuthed();
  const road = useQuery(api.live.road, { token, dayStart });
  const rows = road?.rows;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 font-bold">
          <Bike className="size-5 text-brand" /> {t("Riders on the road")}
        </h2>
        {road && <span className="text-xs font-semibold text-ink-3">{t("{n} working", { n: road.total })}</span>}
      </div>
      {!rows ? (
        <div className="h-72 animate-pulse bg-page/50" />
      ) : rows.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-3">{t("No rider is out right now.")}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r, i) => {
            const busy = r.delivering + r.pickups;
            return (
              <li key={r._id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-semibold text-ink">{r.name}</span>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-ink-2">
                    {r.delivering > 0 && (
                      <span className="flex items-center gap-1">
                        <Truck className="size-3.5 text-brand" /> {num(r.delivering)}
                      </span>
                    )}
                    {r.pickups > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5 text-sky-500" /> {num(r.pickups)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="size-3.5 text-emerald-500" /> {num(r.deliveredToday)}
                    </span>
                    {r.cashInHand > 0 && <span className="font-semibold text-amber-600 dark:text-amber-400">{tk(r.cashInHand)}</span>}
                  </span>
                </div>
                <div className="relative mt-2.5 h-8 overflow-hidden rounded-full bg-page">
                  {/* dashed centre line drifting backwards = moving road */}
                  <div className="road-lines absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-60" style={busy ? undefined : { animation: "none" }} />
                  {busy > 0 ? (
                    <span
                      className="ride absolute top-1/2 z-10 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-brand text-white shadow-md ring-2 shadow-brand/40 ring-white/70 dark:ring-navy-950/70"
                      style={{ animationDuration: `${7 + (i % 4) * 1.5}s`, animationDelay: `${-i * 1.3}s` }}
                    >
                      <Bike className="size-4" strokeWidth={2.5} />
                    </span>
                  ) : (
                    <span className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded-full bg-emerald-500 text-white">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                  )}
                  {r.nextStop && busy > 0 && (
                    <span className="absolute top-1/2 right-1.5 -translate-y-1/2 truncate rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-ink-2 ring-1 ring-line">
                      → {r.nextStop}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
