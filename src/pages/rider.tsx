import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Banknote, MapPin, Package, PackageCheck, Phone, Store, Truck } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { dateTime, tk } from "../lib/format";
import { Button, Card, Empty, PageHeader, Spinner, StatusBadge, cx } from "../components/ui";
import { StatusActions } from "../components/ParcelDetail";

export function RiderTasks() {
  const { token, me } = useAuthed();
  const toast = useToast();
  const t = useQuery(api.rider.tasks, { token });
  const update = useMutation(api.parcels.updateStatus);
  const [tab, setTab] = useState<"deliver" | "pickup" | "hold">("deliver");
  const [busyStop, setBusyStop] = useState<number | null>(null);
  if (!t) return <Spinner />;

  const tabs = [
    { key: "deliver" as const, label: "Deliver", count: t.deliveries.length, icon: Truck },
    { key: "pickup" as const, label: "Pickup", count: t.pickupStops.reduce((s, x) => s + x.parcels.length, 0), icon: Store },
    { key: "hold" as const, label: "On hold", count: t.onHold.length, icon: Package },
  ];

  return (
    <>
      <PageHeader title={`Hi, ${me.name.split(" ")[0]} 👋`} subtitle="Your tasks for today." />
      <Card className="sunrise mb-5 flex items-center justify-between border-0 p-5 text-white">
        <div>
          <p className="text-sm text-white/70">Cash in hand</p>
          <p className="text-3xl font-extrabold">{tk(t.cashInHand)}</p>
        </div>
        <div className="text-right text-sm text-white/70">
          <Banknote className="ml-auto size-7 text-sun" />
          {t.cashParcels} parcel{t.cashParcels === 1 ? "" : "s"}
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-surface p-1.5 shadow-[var(--shadow-card)]">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={cx(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition",
              tab === x.key ? "bg-navy-900 text-white" : "text-ink-2 hover:bg-page",
            )}
          >
            <x.icon className="size-4" />
            {x.label}
            <span className={cx("rounded-full px-1.5 text-xs", tab === x.key ? "bg-brand" : "bg-page")}>{x.count}</span>
          </button>
        ))}
      </div>

      {tab === "pickup" &&
        (t.pickupStops.length === 0 ? (
          <Card><Empty icon={Store} title="No pickups assigned" /></Card>
        ) : (
          <div className="space-y-4">
            {t.pickupStops.map((s, i) => (
              <Card key={i} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">{s.merchantName}</p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-brand" /> {s.pickupAddress}
                    </p>
                  </div>
                  <a href={`tel:${s.merchantPhone}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" aria-label="Call merchant">
                    <Phone className="size-5" />
                  </a>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.parcels.map((p) => (
                    <span key={p._id} className="rounded-lg bg-page px-2 py-1 font-mono text-xs font-semibold">{p.trackingCode}</span>
                  ))}
                </div>
                <Button
                  className="mt-4 w-full"
                  size="lg"
                  loading={busyStop === i}
                  onClick={async () => {
                    setBusyStop(i);
                    try {
                      for (const p of s.parcels) await update({ token, id: p._id, to: "picked_up" });
                      toast.ok(`${s.parcels.length} parcel(s) picked up.`);
                    } catch (e) {
                      toast.error(e);
                    } finally {
                      setBusyStop(null);
                    }
                  }}
                >
                  Picked up all {s.parcels.length}
                </Button>
              </Card>
            ))}
          </div>
        ))}

      {tab !== "pickup" &&
        ((tab === "deliver" ? t.deliveries : t.onHold).length === 0 ? (
          <Card>
            <Empty icon={PackageCheck} title={tab === "deliver" ? "No deliveries right now" : "Nothing on hold"} text="New parcels assigned to you will appear here." />
          </Card>
        ) : (
          <div className="space-y-4">
            {(tab === "deliver" ? t.deliveries : t.onHold).map((p) => (
              <Card key={p._id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold">{p.trackingCode}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="mt-2 text-lg font-bold">{p.recipientName}</p>
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-ink-2">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-brand" /> {p.recipientAddress}, {p.district}
                    </p>
                    {p.itemDescription && <p className="mt-1 text-xs text-ink-3">Item: {p.itemDescription}</p>}
                    {p.note && <p className="mt-1 rounded-lg bg-sun-100 px-2 py-1 text-xs font-medium text-amber-900">Note: {p.note}</p>}
                  </div>
                  <a href={`tel:${p.recipientPhone}`} className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-500 text-white" aria-label="Call customer">
                    <Phone className="size-5" />
                  </a>
                </div>
                <div className="my-4 flex items-center justify-between rounded-xl bg-brand-50 px-4 py-3">
                  <span className="text-sm font-semibold text-brand-700">Collect</span>
                  <span className="text-xl font-extrabold text-brand-700">{tk(p.codAmount)}</span>
                </div>
                <StatusActions
                  parcelId={p._id}
                  codAmount={p.codAmount}
                  moves={p.status === "out_for_delivery" ? ["delivered", "partial_delivered", "hold", "returning"] : ["out_for_delivery"]}
                />
              </Card>
            ))}
          </div>
        ))}
    </>
  );
}

export function RiderCash() {
  const { token } = useAuthed();
  const cash = useQuery(api.money.riderCash, { token });
  if (!cash) return <Spinner />;
  return (
    <>
      <PageHeader title="Cash in hand" subtitle="Hand this over at the office. The admin will mark it received." />
      <Card className="sunrise mb-5 border-0 p-6 text-white">
        <p className="text-sm text-white/70">Total to hand over</p>
        <p className="text-4xl font-extrabold">{tk(cash.total)}</p>
      </Card>
      <Card className="divide-y divide-line">
        {cash.parcels.length === 0 ? (
          <Empty icon={Banknote} title="No cash to hand over" />
        ) : (
          cash.parcels.map((p) => (
            <div key={p._id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-mono font-bold">{p.trackingCode}</p>
                <p className="text-ink-3">{p.recipientName}{p.finalAt && ` · ${dateTime(p.finalAt)}`}</p>
              </div>
              <p className="font-bold">{tk(p.collectedAmount)}</p>
            </div>
          ))
        )}
      </Card>
      {cash.deposits.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 font-bold">Handed over</h2>
          <Card className="divide-y divide-line">
            {cash.deposits.map((d) => (
              <div key={d._id} className="flex items-center justify-between p-4 text-sm">
                <span className="text-ink-2">{dateTime(d.createdAt)} · {d.parcelCount} parcels</span>
                <span className="font-bold text-emerald-700">{tk(d.amount)}</span>
              </div>
            ))}
          </Card>
        </>
      )}
    </>
  );
}

