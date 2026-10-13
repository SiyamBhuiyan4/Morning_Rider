import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  KeyRound,
  Package,
  PackageCheck,
  Plus,
  Printer,
  RotateCcw,
  Store,
  Truck,
  UserCheck,
  UserX,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { navigate } from "../lib/router";
import { PAYOUT_METHOD, STATUS, date, dateTime, num, startOfToday, tk } from "../lib/format";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Spinner, StatCard, StatusBadge } from "../components/ui";
import { TrendChart } from "../components/TrendChart";
import { t } from "../lib/prefs";

/* -------------------------------------------------------------- dashboard */

export function AdminDashboard() {
  const { token } = useAuthed();
  const dayStart = useMemo(startOfToday, []);
  const d = useQuery(api.dashboard.admin, { token, dayStart });
  if (!d) return <Spinner />;
  const c = (s: keyof typeof STATUS) => d.counts[s] ?? 0;

  return (
    <>
      <PageHeader
        title={t(new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening")}
        subtitle={t("Here's what's moving at Morning Rider today.")}
        actions={<Button icon={Plus} onClick={() => navigate("/app/parcels/new")}>{t("New parcel")}</Button>}
      />
      {d.pendingMerchants > 0 && (
        <button
          onClick={() => navigate("/app/merchants")}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-sun-100 px-5 py-3.5 text-left text-sm font-semibold text-amber-900 ring-1 ring-sun/50 hover:bg-sun/30"
        >
          <Store className="size-5" />
          {t("{n} merchant(s) waiting for approval →", { n: d.pendingMerchants })}
        </button>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Booked today")} value={num(d.todayCreated)} icon={Package} hint={`COD ${tk(d.todayCod)}`} />
        <StatCard label={t("Revenue today")} value={tk(d.todayRevenue)} icon={TrendingUp} accent="green" hint={t("Delivery + COD charges")} />
        <StatCard label={t("Cash with riders")} value={tk(d.cashWithRiders)} icon={Banknote} accent="sun" hint={t("Collect from riders")} />
        <StatCard label={t("Payable to merchants")} value={tk(d.payableToMerchants)} icon={Wallet} accent="brand" hint={t("Unpaid balance")} />
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="p-6">
          <h2 className="mb-4 font-bold">{t("Last 14 days")}</h2>
          <TrendChart data={d.trend} />
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-bold">{t("Parcel pipeline")}</h2>
          <div className="space-y-2">
            {[
              { s: "pending", icon: Clock },
              { s: "picked_up", icon: Package },
              { s: "at_hub", icon: Store },
              { s: "out_for_delivery", icon: Truck },
              { s: "hold", icon: Clock },
              { s: "returning", icon: RotateCcw },
              { s: "delivered", icon: PackageCheck },
              { s: "returned", icon: RotateCcw },
            ].map(({ s, icon: Icon }) => (
              <button
                key={s}
                onClick={() => navigate(`/app/parcels?status=${s}`)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-page"
              >
                <span className={`grid size-8 place-items-center rounded-lg ${STATUS[s as keyof typeof STATUS].tone}`}>
                  <Icon className="size-4" />
                </span>
                <span className="flex-1 text-sm font-semibold">{STATUS[s as keyof typeof STATUS].label}</span>
                <span className="font-bold">{num(c(s as keyof typeof STATUS))}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- merchants */

export function Merchants() {
  const { token } = useAuthed();
  const toast = useToast();
  const [tab, setTab] = useState<"pending" | "active" | "suspended">("active");
  const rows = useQuery(api.users.list, { token, role: "merchant", status: tab });
  const pending = useQuery(api.users.list, { token, role: "merchant", status: "pending" });
  const setStatus = useMutation(api.users.setStatus);
  const [creating, setCreating] = useState(false);
  const [reset, setReset] = useState<{ name: string; password: string } | null>(null);
  const resetPassword = useMutation(api.users.resetPassword);

  async function act(userId: Id<"users">, status: "active" | "suspended", msg: string) {
    try {
      await setStatus({ token, userId, status });
      toast.ok(msg);
    } catch (e) {
      toast.error(e);
    }
  }

  return (
    <>
      <PageHeader title={t("Merchants")} subtitle={t("Businesses that send parcels with Morning Rider.")} actions={<Button icon={Plus} onClick={() => setCreating(true)}>{t("Add merchant")}</Button>} />
      <div className="mb-4 flex gap-2">
        {(["active", "pending", "suspended"] as const).map((k) => (
          <Button key={k} size="sm" variant={tab === k ? "dark" : "outline"} onClick={() => setTab(k)}>
            {k === "pending"
              ? `${t("Waiting approval")}${pending?.length ? ` (${pending.length})` : ""}`
              : k === "active"
                ? t("Active")
                : t("Suspended")}
          </Button>
        ))}
      </div>
      <Card className="overflow-hidden">
        {!rows ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Empty icon={Store} title={t("No merchants here")} />
        ) : (
          <div className="divide-y divide-line">
            {rows.map((m) => (
              <div key={m._id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="grid size-11 place-items-center rounded-xl bg-navy-50 font-bold text-navy-700">
                  {(m.businessName ?? m.name).slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-48 flex-1">
                  <p className="font-bold">{m.businessName}</p>
                  <p className="text-sm text-ink-2">
                    {m.name} · {m.phone}
                    {m.email && ` · ${m.email}`}
                  </p>
                  <p className="text-xs text-ink-3">
                    {m.pickupAddress} · {m.payoutMethod ? PAYOUT_METHOD[m.payoutMethod] : ""} {m.payoutAccount} · {t("joined")} {date(m.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {m.status === "pending" && (
                    <Button size="sm" icon={UserCheck} onClick={() => act(m._id, "active", t("{name} approved.", { name: m.businessName ?? m.name }))}>
                      {t("Approve")}
                    </Button>
                  )}
                  {m.status === "suspended" && (
                    <Button size="sm" variant="outline" icon={UserCheck} onClick={() => act(m._id, "active", t("Merchant re-activated."))}>
                      {t("Activate")}
                    </Button>
                  )}
                  {m.status === "active" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/app/payouts?merchant=${m._id}`)}>
                        {t("Statement")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={KeyRound}
                        onClick={async () => {
                          try {
                            const r = await resetPassword({ token, userId: m._id });
                            setReset({ name: m.businessName ?? m.name, password: r.password });
                          } catch (e) {
                            toast.error(e);
                          }
                        }}
                      >
                        {t("Reset password")}
                      </Button>
                    </>
                  )}
                  {m.status !== "suspended" && (
                    <Button size="sm" variant="ghost" icon={UserX} onClick={() => act(m._id, "suspended", m.status === "pending" ? t("Application rejected.") : t("Merchant suspended."))}>
                      {m.status === "pending" ? t("Reject") : t("Suspend")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <CreateUserModal role="merchant" open={creating} onClose={() => setCreating(false)} />
      <TempPasswordModal value={reset} onClose={() => setReset(null)} />
    </>
  );
}

function TempPasswordModal({ value, onClose }: { value: { name: string; password: string } | null; onClose: () => void }) {
  return (
    <Modal open={!!value} onClose={onClose} title={t("Temporary password")} footer={<Button onClick={onClose}>{t("Done")}</Button>}>
      <p className="text-sm text-ink-2">
        {t("Give this password to {name}. They have been signed out everywhere and should change it after signing in.", { name: value?.name ?? "" })}
      </p>
      <p className="mt-4 rounded-2xl bg-navy-50 py-4 text-center font-mono text-2xl font-bold tracking-wider select-all">{value?.password}</p>
      <p className="mt-3 text-xs text-ink-3">{t("This is shown only once.")}</p>
    </Modal>
  );
}

function CreateUserModal({ role, open, onClose }: { role: "merchant" | "rider"; open: boolean; onClose: () => void }) {
  const { token } = useAuthed();
  const toast = useToast();
  const create = useMutation(api.users.create);
  const [f, setF] = useState({ name: "", phone: "", password: "", businessName: "", pickupAddress: "", riderArea: "" });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({ token, role, ...f });
      toast.ok(t("{name} added.", { name: f.name }));
      setF({ name: "", phone: "", password: "", businessName: "", pickupAddress: "", riderArea: "" });
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add ${role}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={t("Full name")}>{(id) => <Input id={id} value={f.name} onChange={set("name")} required />}</Field>
        <Field label={t("Phone number (login)")}>{(id) => <Input id={id} type="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set("phone")} required />}</Field>
        {role === "merchant" && (
          <>
            <Field label={t("Business name")}>{(id) => <Input id={id} value={f.businessName} onChange={set("businessName")} required />}</Field>
            <Field label={t("Pickup address")}>{(id) => <Input id={id} value={f.pickupAddress} onChange={set("pickupAddress")} />}</Field>
          </>
        )}
        {role === "rider" && (
          <Field label={t("Working area (optional)")}>{(id) => <Input id={id} value={f.riderArea} onChange={set("riderArea")} placeholder={t("e.g. Mirpur, Uttara")} />}</Field>
        )}
        <Field label={t("Password")} hint={t("At least 8 characters with a letter and a number. Share it privately.")}>
          {(id) => <Input id={id} type="text" autoComplete="off" value={f.password} onChange={set("password")} required minLength={8} />}
        </Field>
        <Button type="submit" loading={busy} className="w-full">
          {t("Create account")}
        </Button>
      </form>
    </Modal>
  );
}

/* ----------------------------------------------------------------- riders */

export function Riders() {
  const { token } = useAuthed();
  const toast = useToast();
  const rows = useQuery(api.users.list, { token, role: "rider" });
  const setStatus = useMutation(api.users.setStatus);
  const resetPassword = useMutation(api.users.resetPassword);
  const [creating, setCreating] = useState(false);
  const [reset, setReset] = useState<{ name: string; password: string } | null>(null);

  return (
    <>
      <PageHeader
        title={t("Riders")}
        subtitle={t("Your delivery team.")}
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>{t("Add rider")}</Button>}
      />
      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Card>
          <Empty icon={Bike} title={t("No riders yet")} text={t("Add your first rider so you can assign pickups and deliveries.")} />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <Card key={r._id} className="p-5">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand">
                  <Bike className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{r.name}</p>
                  <p className="text-sm text-ink-2">{r.phone}{r.riderArea && ` · ${r.riderArea}`}</p>
                </div>
                {r.status !== "active" && <Badge tone="red">{t("Suspended")}</Badge>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-page p-3">
                  <p className="text-xs text-ink-3">{t("Active tasks")}</p>
                  <p className="font-bold">{r.activeTasks}</p>
                </div>
                <div className="rounded-xl bg-sun-100/70 p-3">
                  <p className="text-xs text-amber-800">{t("Cash in hand")}</p>
                  <p className="font-bold text-amber-900">{tk(r.cashInHand)}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.cashInHand > 0 && (
                  <Button size="sm" variant="dark" onClick={() => navigate(`/app/cash?rider=${r._id}`)}>{t("Receive cash")}</Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  icon={KeyRound}
                  onClick={async () => {
                    try {
                      setReset({ name: r.name, password: (await resetPassword({ token, userId: r._id })).password });
                    } catch (e) {
                      toast.error(e);
                    }
                  }}
                >
                  {t("Reset password")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await setStatus({ token, userId: r._id, status: r.status === "active" ? "suspended" : "active" });
                    } catch (e) {
                      toast.error(e);
                    }
                  }}
                >
                  {r.status === "active" ? t("Suspend") : t("Activate")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateUserModal role="rider" open={creating} onClose={() => setCreating(false)} />
      <TempPasswordModal value={reset} onClose={() => setReset(null)} />
    </>
  );
}

/* ---------------------------------------------------------------- payouts */

export function Payouts() {
  const { token } = useAuthed();
  const balances = useQuery(api.money.balances, { token });
  const history = useQuery(api.money.payouts, { token });
  const [paying, setPaying] = useState<Id<"users"> | null>(
    () => (new URLSearchParams(location.search).get("merchant") as Id<"users"> | null) ?? null,
  );

  return (
    <>
      <PageHeader title={t("Merchant payouts")} subtitle={t("Pay merchants their collected COD minus Morning Rider charges.")} />
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-4 font-bold">{t("Unpaid balances")}</div>
        {!balances ? (
          <Spinner />
        ) : balances.length === 0 ? (
          <Empty icon={CheckCircle2} title={t("All settled")} text={t("No merchant has an unpaid balance right now.")} />
        ) : (
          <div className="divide-y divide-line">
            {balances.map((b) => (
              <div key={b.merchantId} className="flex flex-wrap items-center gap-4 p-4">
                <div className="min-w-48 flex-1">
                  <p className="font-bold">{b.merchantName}</p>
                  <p className="text-xs text-ink-3">
                    {t("{n} parcels · collected {collected} · charges {charges}", { n: b.count, collected: tk(b.collected), charges: tk(b.charges) })}
                    {b.payoutMethod && ` · ${PAYOUT_METHOD[b.payoutMethod]} ${b.payoutAccount ?? ""}`}
                  </p>
                </div>
                <p className={`text-lg font-extrabold ${b.net < 0 ? "text-red-600" : "text-ink"}`}>{tk(b.net)}</p>
                <Button size="sm" onClick={() => setPaying(b.merchantId)}>
                  {t("Review & pay")}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <h2 className="mb-3 mt-8 font-bold">{t("Payout history")}</h2>
      <PayoutHistory rows={history} showMerchant />
      <PayModal merchantId={paying} onClose={() => setPaying(null)} />
    </>
  );
}

export function PayoutHistory({
  rows,
  showMerchant,
}: {
  rows: (typeof api.money.payouts._returnType) | undefined;
  showMerchant?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <Empty icon={Wallet} title={t("No payouts yet")} />
      ) : (
        <div className="divide-y divide-line">
          {rows.map((p) => (
            <div key={p._id} className="flex flex-wrap items-center gap-4 p-4 text-sm">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <Wallet className="size-5" />
              </div>
              <div className="min-w-40 flex-1">
                <p className="font-semibold">{showMerchant ? p.merchantName : `${PAYOUT_METHOD[p.method]} ${t("payment")}`}</p>
                <p className="text-xs text-ink-3">
                  {dateTime(p.createdAt)} · {t("{n} parcels", { n: p.parcelCount })} · {PAYOUT_METHOD[p.method]}
                  {p.reference && ` · ${t("Ref")} ${p.reference}`}
                </p>
              </div>
              <p className="font-extrabold">{tk(p.amount)}</p>
              <Button size="sm" variant="outline" icon={Printer} onClick={() => window.open(`/print/payout/${p._id}`, "_blank", "noopener")}>
                {t("Invoice")}
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PayModal({ merchantId, onClose }: { merchantId: Id<"users"> | null; onClose: () => void }) {
  const { token } = useAuthed();
  const toast = useToast();
  const st = useQuery(api.money.statement, merchantId ? { token, merchantId } : "skip");
  const balances = useQuery(api.money.balances, merchantId ? { token } : "skip");
  const info = balances?.find((b) => b.merchantId === merchantId);
  const pay = useMutation(api.money.createPayout);
  const [method, setMethod] = useState<keyof typeof PAYOUT_METHOD | "">("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const chosen = method || info?.payoutMethod || "bkash";

  return (
    <Modal
      open={!!merchantId}
      onClose={onClose}
      wide
      title={t("Pay {name}", { name: info?.merchantName ?? t("merchant") })}
      footer={
        st && st.count > 0 ? (
          <Button
            loading={busy}
            disabled={st.net <= 0}
            onClick={async () => {
              setBusy(true);
              try {
                await pay({ token, merchantId: merchantId!, method: chosen, reference: reference || undefined, expectedAmount: st.net });
                toast.ok(t("Payout of {amount} recorded.", { amount: tk(st.net) }));
                onClose();
              } catch (e) {
                toast.error(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            {t("Confirm payment of {amount}", { amount: tk(st.net) })}
          </Button>
        ) : undefined
      }
    >
      {!st ? (
        <Spinner />
      ) : st.count === 0 ? (
        <p className="py-8 text-center text-ink-2">{t("Nothing to pay for this merchant.")}</p>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-page p-3">
              <p className="text-xs text-ink-3">{t("Collected")}</p>
              <p className="font-bold">{tk(st.collected)}</p>
            </div>
            <div className="rounded-2xl bg-page p-3">
              <p className="text-xs text-ink-3">{t("Charges")}</p>
              <p className="font-bold">− {tk(st.charges)}</p>
            </div>
            <div className="rounded-2xl bg-brand-50 p-3">
              <p className="text-xs text-brand-700">{t("Pay")}</p>
              <p className="font-extrabold text-brand-700">{tk(st.net)}</p>
            </div>
          </div>
          {st.net <= 0 && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{t("The balance is zero or negative (return charges exceed collections), so there is nothing to pay yet.")}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Paid via")}>
              {(id) => (
                <Select id={id} value={chosen} onChange={(e) => setMethod(e.target.value as keyof typeof PAYOUT_METHOD)}>
                  {Object.entries(PAYOUT_METHOD).map(([k, l]) => (
                    <option key={k} value={k}>{l}</option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("Transaction ID / reference")}>
              {(id) => <Input id={id} value={reference} onChange={(e) => setReference(e.target.value)} placeholder={info?.payoutAccount ? `${t("To")} ${info.payoutAccount}` : ""} />}
            </Field>
          </div>
          <StatementTable rows={st.parcels} />
        </div>
      )}
    </Modal>
  );
}

export function StatementTable({ rows }: { rows: (typeof api.money.statement._returnType)["parcels"] }) {
  return (
    <div className="max-h-80 overflow-auto rounded-2xl border border-line">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-page text-left text-xs font-bold text-ink-3 uppercase">
          <tr>
            <th className="px-3 py-2">{t("Parcel")}</th>
            <th className="px-3 py-2">{t("Status")}</th>
            <th className="px-3 py-2 text-right">{t("Collected")}</th>
            <th className="px-3 py-2 text-right">{t("Charges")}</th>
            <th className="px-3 py-2 text-right">{t("Net")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p._id} className="border-t border-line">
              <td className="px-3 py-2">
                <p className="font-mono font-semibold">{p.trackingCode}</p>
                <p className="text-xs text-ink-3">{p.recipientName}</p>
              </td>
              <td className="px-3 py-2"><StatusBadge status={p.status} /></td>
              <td className="px-3 py-2 text-right">{tk(p.collectedAmount)}</td>
              <td className="px-3 py-2 text-right text-ink-2">{tk(p.deliveryCharge + p.codCharge)}</td>
              <td className={`px-3 py-2 text-right font-bold ${p.net < 0 ? "text-red-600" : ""}`}>{tk(p.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------ rider cash */

export function RiderCashAdmin() {
  const { token } = useAuthed();
  const toast = useToast();
  const riders = useQuery(api.users.list, { token, role: "rider", status: "active" });
  const [riderId, setRiderId] = useState<Id<"users"> | "">(
    () => (new URLSearchParams(location.search).get("rider") as Id<"users"> | null) ?? "",
  );
  const cash = useQuery(api.money.riderCash, riderId ? { token, riderId } : "skip");
  const receive = useMutation(api.money.receiveCash);
  const [busy, setBusy] = useState(false);
  const withCash = riders?.filter((r) => r.cashInHand > 0) ?? [];

  return (
    <>
      <PageHeader title={t("Rider cash")} subtitle={t("COD money riders have collected and must hand over to the office.")} />
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="h-fit overflow-hidden">
          <div className="border-b border-line px-5 py-4 font-bold">{t("Riders holding cash")}</div>
          {!riders ? (
            <Spinner />
          ) : withCash.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-3">{t("No rider is holding cash.")}</p>
          ) : (
            withCash.map((r) => (
              <button
                key={r._id}
                onClick={() => setRiderId(r._id)}
                className={`flex w-full items-center justify-between border-b border-line px-5 py-3 text-left last:border-0 hover:bg-page ${riderId === r._id ? "bg-brand-50" : ""}`}
              >
                <span className="font-semibold">{r.name}</span>
                <span className="font-bold text-amber-700">{tk(r.cashInHand)}</span>
              </button>
            ))
          )}
        </Card>
        <Card className="p-6">
          {!riderId ? (
            <Empty icon={Banknote} title={t("Choose a rider")} text={t("Pick a rider on the left to see the parcels behind their cash.")} />
          ) : !cash ? (
            <Spinner />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-ink-3">{t("Cash to receive")}</p>
                  <p className="text-3xl font-extrabold">{tk(cash.total)}</p>
                </div>
                {cash.total > 0 && (
                  <Button
                    size="lg"
                    loading={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const r = await receive({ token, riderId: riderId as Id<"users">, expectedAmount: cash.total });
                        toast.ok(t("Received {amount}.", { amount: tk(r.amount) }));
                      } catch (e) {
                        toast.error(e);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t("Mark {amount} received", { amount: tk(cash.total) })}
                  </Button>
                )}
              </div>
              <div className="mt-5 divide-y divide-line rounded-2xl border border-line">
                {cash.parcels.map((p) => (
                  <div key={p._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>
                      <span className="font-mono font-semibold">{p.trackingCode}</span> · {p.recipientName}
                    </span>
                    <span className="font-bold">{tk(p.collectedAmount)}</span>
                  </div>
                ))}
                {cash.parcels.length === 0 && <p className="p-4 text-center text-sm text-ink-3">{t("Nothing pending.")}</p>}
              </div>
              {cash.deposits.length > 0 && (
                <>
                  <p className="mb-2 mt-6 text-sm font-bold">{t("Recent hand-overs")}</p>
                  {cash.deposits.map((d) => (
                    <p key={d._id} className="text-sm text-ink-2">
                      {dateTime(d.createdAt)} — {tk(d.amount)} ({t("{n} parcels", { n: d.parcelCount })})
                    </p>
                  ))}
                </>
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- settings */

export function RateSettings() {
  const { token } = useAuthed();
  const rates = useQuery(api.settings.rates, { token });
  if (!rates) return <Spinner />;
  return <RateForm initial={rates} />;
}

function RateForm({ initial }: { initial: typeof api.settings.rates._returnType }) {
  const { token } = useAuthed();
  const toast = useToast();
  const save = useMutation(api.settings.updateRates);
  const [f, setF] = useState(() => ({
    insideDhaka: String(initial.insideDhaka),
    subDhaka: String(initial.subDhaka),
    outsideDhaka: String(initial.outsideDhaka),
    extraPerKgInside: String(initial.extraPerKgInside),
    extraPerKgOutside: String(initial.extraPerKgOutside),
    codPercent: String(initial.codPercent),
    returnPercent: String(initial.returnPercent),
  }));
  const [busy, setBusy] = useState(false);
  const fields: [keyof typeof f, string, string][] = [
    ["insideDhaka", "Inside Dhaka (up to 1 kg)", "৳"],
    ["subDhaka", "Dhaka Sub-area (up to 1 kg)", "৳"],
    ["outsideDhaka", "Outside Dhaka (up to 1 kg)", "৳"],
    ["extraPerKgInside", "Each extra kg — inside Dhaka", "৳"],
    ["extraPerKgOutside", "Each extra kg — sub-area & outside", "৳"],
    ["codPercent", "COD charge", "%"],
    ["returnPercent", "Return charge (of delivery charge)", "%"],
  ];

  return (
    <>
      <PageHeader title={t("Delivery rates")} subtitle={t("New parcels are charged with these rates. Existing parcels keep the charge they were booked with.")} />
      <Card className="max-w-2xl p-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await save({ token, ...(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, Number(v)])) as Record<keyof typeof f, number>) });
              toast.ok(t("Rates saved."));
            } catch (err) {
              toast.error(err);
            } finally {
              setBusy(false);
            }
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {fields.map(([k, label, unit]) => (
            <Field key={k} label={`${t(label)} (${unit})`}>
              {(id) => <Input id={id} type="number" min={0} step="any" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} required />}
            </Field>
          ))}
          <Button type="submit" loading={busy} className="sm:col-span-2">
            {t("Save rates")}
          </Button>
        </form>
      </Card>
    </>
  );
}
