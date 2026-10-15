import { useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import {
  Ban,
  CalendarRange,
  CheckCircle2,
  Clock,
  HandCoins,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  RotateCcw,
  Truck,
  Wallet,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { navigate } from "../lib/router";
import { PAYOUT_METHOD, date, num, tk } from "../lib/format";
import { Badge, Button, Modal, Spinner, StatusBadge, cx } from "../components/ui";
import { RangePills, rangeLabel, useDateRange, type DateRange } from "../components/RangePicker";
import { ParcelDetail } from "../components/ParcelDetail";
import { t } from "../lib/prefs";
import { VerificationBadge } from "./adminVerify";

/** One merchant at a glance: contact, parcels, money. Opens from the Merchants list. */
export function MerchantProfileModal({ merchantId, onClose }: { merchantId: Id<"users"> | null; onClose: () => void }) {
  const { token } = useAuthed();
  const [range, setRange] = useDateRange("merchant-profile", "30d");
  const data = useQuery(
    api.merchantProfile.get,
    merchantId ? { token, merchantId, from: range.from, to: range.to } : "skip",
  );

  return (
    <Modal open={merchantId !== null} onClose={onClose} title={t("Merchant details")} wide>
      {data === undefined ? (
        <Spinner />
      ) : data === null ? (
        <p className="text-sm text-ink-2">{t("Merchant not found.")}</p>
      ) : (
        <Details data={data} range={range} setRange={setRange} onClose={onClose} />
      )}
    </Modal>
  );
}

type Data = NonNullable<ReturnType<typeof useQuery<typeof api.merchantProfile.get>>>;

function Details({
  data,
  range,
  setRange,
  onClose,
}: {
  data: Data;
  range: DateRange;
  setRange: (r: DateRange) => void;
  onClose: () => void;
}) {
  const { merchant: m, counts: c, money } = data;
  const owe = money.balance;
  const [parcel, setParcel] = useState<Id<"parcels"> | null>(null);
  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-xl font-extrabold text-brand">
          {(m.businessName ?? m.name).slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {m.businessName ?? m.name}
            {m.demo && <Badge tone="brand">{t("Demo")}</Badge>}
            <VerificationBadge status={m.verification} />
            {m.status !== "active" && (
              <Badge tone={m.status === "pending" ? "amber" : "red"}>
                {m.status === "pending" ? t("Waiting approval") : t("Suspended")}
              </Badge>
            )}
          </p>
          <p className="text-sm text-ink-2">
            {m.name} · {m.phone}
          </p>
          <p className="text-xs text-ink-3">
            {t("joined {date}", { date: date(m.createdAt) })}
            {data.lastOrderAt && ` · ${t("last order {date}", { date: date(data.lastOrderAt) })}`}
          </p>
        </div>
      </div>

      {/* contact */}
      <div className="grid grid-cols-3 gap-2">
        <Contact href={`tel:${m.phone}`} icon={Phone} label={t("Call")} tone="bg-emerald-500 hover:bg-emerald-600" />
        <button
          type="button"
          onClick={() => go(`/app/messages?merchant=${m._id}`)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-600 cursor-pointer"
        >
          <MessageSquare className="size-4" /> {t("Message")}
        </button>
        <Contact
          href={`https://wa.me/88${m.phone}`}
          external
          icon={MessageCircle}
          label={t("WhatsApp")}
          tone="bg-[#25D366] hover:bg-[#1ebe5a]"
        />
      </div>

      {/* balance */}
      <div
        className={cx(
          "rounded-3xl p-5 ring-1",
          owe > 0
            ? "bg-amber-50 ring-amber-200 dark:bg-amber-500/10 dark:ring-amber-500/30"
            : owe < 0
              ? "bg-red-50 ring-red-200 dark:bg-red-500/10 dark:ring-red-500/30"
              : "bg-emerald-50 ring-emerald-200 dark:bg-emerald-500/10 dark:ring-emerald-500/30",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink-2">
              {owe > 0 ? t("We owe this merchant") : owe < 0 ? t("This merchant owes us") : t("All settled")}
            </p>
            <p
              className={cx(
                "text-3xl font-black tracking-tight",
                owe > 0 ? "text-amber-700 dark:text-amber-400" : owe < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {tk(Math.abs(owe))}
            </p>
            <p className="text-xs text-ink-2">
              {money.unpaidCount > 0 ? t("from {n} finished parcels not paid out yet", { n: money.unpaidCount }) : t("Nothing waiting to be paid.")}
            </p>
            {data.openRequest && (
              <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                {t("Asked for a payout of {amount} on {date}", { amount: tk(data.openRequest.amount), date: date(data.openRequest.createdAt) })}
              </p>
            )}
          </div>
          {money.unpaidCount > 0 && (
            <Button size="sm" variant="dark" onClick={() => go(`/app/payouts?merchant=${m._id}`)}>
              {t("Statement")}
            </Button>
          )}
        </div>
      </div>

      {/* Date Range Performance & Activity Filter */}
      <div className="rounded-2xl border border-line bg-page/60 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-brand/10 text-brand">
              <CalendarRange className="size-4" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-ink">{t("Performance & orders in range")}</h3>
              <p className="text-[11px] font-semibold text-brand">{rangeLabel(range)}</p>
            </div>
          </div>
          <RangePills value={range} onChange={setRange} withAll />
        </div>
      </div>

      {/* money */}
      <Section title={`${t("Money")} · ${rangeLabel(range)}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile icon={HandCoins} tone="text-brand" label={t("We earned (range)")} value={tk(money.earned)} />
          <Tile icon={HandCoins} label={t("Earned this month")} value={tk(money.earnedThisMonth)} />
          <Tile icon={Truck} label={t("COD collected for them")} value={tk(money.codCollected)} />
          <Tile icon={Wallet} tone="text-emerald-600 dark:text-emerald-400" label={t("Paid to them")} value={tk(money.paidOut)} sub={t("{n} payouts", { n: money.payoutCount })} />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
          <span>{t("Delivery charges")}: <b className="text-ink">{tk(money.deliveryEarned)}</b></span>
          <span>{t("COD charges")}: <b className="text-ink">{tk(money.codEarned)}</b></span>
          <span>{t("Return charges")}: <b className="text-ink">{tk(money.returnEarned)}</b></span>
        </div>
      </Section>

      {/* parcels */}
      <Section title={`${t("Parcels")} · ${rangeLabel(range)}`}>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          <Tile icon={Package} label={t("Total orders")} value={num(c.total)} />
          <Tile icon={CheckCircle2} tone="text-emerald-600 dark:text-emerald-400" label={t("Completed")} value={num(c.delivered)} />
          <Tile icon={RotateCcw} tone="text-red-600 dark:text-red-400" label={t("Returned")} value={num(c.returned)} />
          <Tile icon={Ban} label={t("Cancelled")} value={num(c.cancelled)} />
          <Tile icon={Clock} tone="text-sky-600 dark:text-sky-400" label={t("In progress")} value={num(c.inProgress)} />
        </div>
        {c.total > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 flex justify-between text-xs text-ink-2">
              <span>{t("Success rate")}</span>
              <b className="text-ink">{c.successRate === null ? "—" : `${num(c.successRate)}%`}</b>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-page">
              {(
                [
                  [c.delivered, "bg-emerald-500"],
                  [c.returned, "bg-red-500"],
                  [c.cancelled, "bg-slate-400"],
                  [c.inProgress, "bg-sky-500"],
                ] as const
              ).map(([n, color], i) =>
                n > 0 ? <div key={i} className={color} style={{ width: `${(n / c.total) * 100}%` }} /> : null,
              )}
            </div>
          </div>
        )}
      </Section>

      {/* details */}
      <Section title={t("Details")}>
        <div className="divide-y divide-line rounded-xl border border-line">
          <Row label={t("Owner")}>{m.name}</Row>
          <Row label={t("Phone")}>{m.phone}</Row>
          <Row label={t("Email")}>{m.email ?? "—"}</Row>
          <Row label={t("Pickup address")}>{m.pickupAddress || "—"}</Row>
          <Row label={t("Gets paid by")}>
            {m.payoutMethod ? `${PAYOUT_METHOD[m.payoutMethod]} ${m.payoutAccount ?? ""}` : "—"}
          </Row>
        </div>
      </Section>

      {data.recentParcels.length > 0 && (
        <Section title={`${t("Parcels in this period")} (${num(data.recentParcels.length)})`}>
          <div className="divide-y divide-line rounded-xl border border-line">
            {data.recentParcels.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => setParcel(p._id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-page cursor-pointer"
              >
                <span className="font-mono text-xs text-brand font-bold hover:underline">{p.trackingCode}</span>
                <span className="min-w-0 flex-1 truncate">{p.recipientName}</span>
                <span className="hidden text-xs text-ink-3 sm:inline">{date(p.createdAt)}</span>
                <span className="font-semibold">{tk(p.codAmount)}</span>
                <StatusBadge status={p.status} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => go(`/app/parcels?merchant=${m._id}`)} className="mt-2 text-sm font-semibold text-brand hover:underline cursor-pointer">
            {t("See all parcels")} →
          </button>
        </Section>
      )}


      {data.recentPayouts.length > 0 && (
        <Section title={t("Latest payouts")}>
          <div className="divide-y divide-line rounded-xl border border-line">
            {data.recentPayouts.map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => go("/app/payouts")}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-page"
              >
                <span className="flex-1">{date(p.createdAt)}</span>
                <span className="text-xs text-ink-3">
                  {PAYOUT_METHOD[p.method]} · {t("{n} parcels", { n: p.parcelCount })}
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{tk(p.amount)}</span>
              </button>
            ))}
          </div>
        </Section>
      )}
      <ParcelDetail id={parcel} onClose={() => setParcel(null)} />
    </div>
  );
}

function Contact({
  href,
  icon: Icon,
  label,
  tone,
  external,
}: {
  href: string;
  icon: typeof Phone;
  label: string;
  tone: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cx("flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white shadow-sm transition", tone)}
    >
      <Icon className="size-4" /> {label}
    </a>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold tracking-wide text-ink-3 uppercase">{title}</h3>
      {children}
    </div>
  );
}

function Tile({ icon: Icon, label, value, sub, tone }: { icon: typeof Phone; label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3.5">
      <Icon className={cx("size-4", tone ?? "text-ink-3")} />
      <p className={cx("mt-1.5 text-lg font-extrabold", tone ?? "text-ink")}>{value}</p>
      <p className="text-[11px] leading-tight text-ink-2">{label}</p>
      {sub && <p className="text-[11px] text-ink-3">{sub}</p>}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 px-4 py-2.5 text-sm">
      <span className="text-ink-2">{label}</span>
      <span className="min-w-0 break-words text-ink">{children}</span>
    </div>
  );
}
