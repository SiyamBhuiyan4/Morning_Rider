import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bike, Loader2, Pencil, Printer, Store, User } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { usePending, useToast } from "../lib/toast";
import { navigate } from "../lib/router";
import { CATEGORY, STATUS, ZONE, dateTime, dec, tk, type Status } from "../lib/format";
import { Button, Field, Input, Modal, Select, Spinner, StatusBadge, cx } from "./ui";
import { t } from "../lib/prefs";

const MOVE_STYLE: Partial<Record<Status, "primary" | "dark" | "outline" | "danger">> = {
  delivered: "primary",
  out_for_delivery: "primary",
  picked_up: "primary",
  at_hub: "dark",
  returned: "dark",
  cancelled: "danger",
  returning: "outline",
  hold: "outline",
  partial_delivered: "outline",
};

export function RiderSelect({ value, onChange }: { value: string; onChange: (v: Id<"users">) => void }) {
  const { token } = useAuthed();
  const riders = useQuery(api.users.options, { token, role: "rider" });
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value as Id<"users">)}>
      <option value="">{t("Choose rider…")}</option>
      {riders?.map((r) => (
        <option key={r._id} value={r._id}>
          {r.label} {r.area ? `(${r.area})` : ""} — {r.phone}
        </option>
      ))}
    </Select>
  );
}

/**
 * The status-change control: pick a move, fill in what it needs (rider,
 * collected amount, a note), confirm. Shared by the parcel detail and the
 * rider's task cards.
 */
export function StatusActions({
  parcelId,
  moves,
  codAmount,
  currentRiderId,
  onDone,
}: {
  parcelId: Id<"parcels">;
  moves: Status[];
  codAmount: number;
  currentRiderId?: Id<"users">;
  onDone?: () => void;
}) {
  const { token, me } = useAuthed();
  const toast = useToast();
  const update = useMutation(api.parcels.updateStatus);
  const [move, setMove] = useState<Status | null>(null);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [rider, setRider] = useState<string>(currentRiderId ?? "");
  const waiting = usePending(`parcel:${parcelId}`);

  if (moves.length === 0) return null;

  function confirm() {
    if (!move) return;
    // Check what we can here, so a mistake shows now and not after the Undo time.
    const collected = Number(amount);
    if (move === "partial_delivered" && !(amount !== "" && Number.isInteger(collected) && collected >= 0 && collected < codAmount)) {
      toast.error(t("Collected amount must be between 0 and {max} for a partial delivery.", { max: codAmount - 1 }));
      return;
    }
    if (move === "out_for_delivery" && me.role === "admin" && !rider) {
      toast.error(t("Assign a delivery rider first."));
      return;
    }
    const args = {
      token,
      id: parcelId,
      to: move,
      note: note || undefined,
      collectedAmount: move === "partial_delivered" ? collected : undefined,
      deliveryRiderId: move === "out_for_delivery" && rider ? (rider as Id<"users">) : undefined,
    };
    toast.undoable(t("Marked as {status}.", { status: STATUS[move].label }), () => update(args), `parcel:${parcelId}`);
    setMove(null);
    setNote("");
    setAmount("");
    onDone?.();
  }

  if (waiting) {
    return (
      <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
        <Loader2 className="size-4 animate-spin" /> {t("Saving in a few seconds… press Undo below to cancel.")}
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {moves.map((m) => (
          <Button
            key={m}
            size="sm"
            variant={move === m ? "dark" : (MOVE_STYLE[m] ?? "outline")}
            onClick={() => setMove(move === m ? null : m)}
          >
            {m === "out_for_delivery" && me.role === "rider" ? t("Retry delivery") : STATUS[m].label}
          </Button>
        ))}
      </div>
      {move && (
        <div className="animate-rise mt-3 space-y-3 rounded-2xl border border-line bg-page p-4">
          {move === "out_for_delivery" && me.role === "admin" && (
            <Field label={t("Delivery rider")}>{() => <RiderSelect value={rider} onChange={setRider} />}</Field>
          )}
          {move === "partial_delivered" && (
            <Field label={t("Amount collected (less than {amount})", { amount: tk(codAmount) })}>
              {(id) => <Input id={id} type="number" min={0} max={codAmount - 1} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />}
            </Field>
          )}
          {move === "delivered" && codAmount > 0 && (
            <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">
              {t("Collect {amount} from the customer.", { amount: tk(codAmount) })}
            </p>
          )}
          <Field label={t("Note (optional)")}>
            {(id) => (
              <Input
                id={id}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder={move === "returning" || move === "hold" ? t("Reason, e.g. customer not answering") : ""}
              />
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button onClick={confirm} variant={move === "cancelled" ? "danger" : "primary"}>
              {t("Confirm: {status}", { status: STATUS[move].label })}
            </Button>
            <Button variant="ghost" onClick={() => setMove(null)}>
              {t("Back")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ParcelDetail({ id, onClose }: { id: Id<"parcels"> | null; onClose: () => void }) {
  const { token, me } = useAuthed();
  const toast = useToast();
  const data = useQuery(api.parcels.get, id ? { token, id } : "skip");
  const assignPickup = useMutation(api.parcels.assignPickup);
  const [pickupRider, setPickupRider] = useState("");

  return (
    <Modal open={!!id} onClose={onClose} title={t("Parcel details")} wide>
      {data === undefined ? (
        <Spinner />
      ) : data === null ? (
        <p className="py-10 text-center text-ink-2">{t("Parcel not found.")}</p>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-xl font-bold">{data.parcel.trackingCode}</p>
              <p className="text-sm text-ink-3">
                {t("Created {date}", { date: dateTime(data.parcel.createdAt) })}
                {data.parcel.invoice && ` · ${t("Invoice")} ${data.parcel.invoice}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={data.parcel.status} className="px-3 py-1.5 text-sm" />
              {me.role !== "rider" && (
                <Button size="sm" variant="outline" icon={Printer} onClick={() => window.open(`/print/labels?ids=${data.parcel._id}`, "_blank", "noopener")}>
                  {t("Label")}
                </Button>
              )}
              {data.canEdit && (
                <Button size="sm" variant="outline" icon={Pencil} onClick={() => navigate(`/app/parcels/edit/${data.parcel._id}`)}>
                  {t("Edit")}
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock icon={User} title={t("Customer")}>
              <p className="font-semibold">{data.parcel.recipientName}</p>
              <a href={`tel:${data.parcel.recipientPhone}`} className="font-medium text-brand hover:underline">
                {data.parcel.recipientPhone}
              </a>
              <p className="text-ink-2">{data.parcel.recipientAddress}</p>
              <p className="text-ink-3">
                {data.parcel.district} · {ZONE[data.parcel.zone]}
              </p>
            </InfoBlock>
            <InfoBlock icon={Store} title={t("Merchant")}>
              <p className="font-semibold">{data.merchant?.businessName ?? data.merchant?.name}</p>
              <p className="text-ink-2">{data.merchant?.phone}</p>
              <p className="text-ink-3">{data.merchant?.pickupAddress}</p>
            </InfoBlock>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Money label={t("COD")} value={tk(data.parcel.codAmount)} />
            <Money label={t("Collected")} value={tk(data.parcel.collectedAmount)} />
            <Money label={t("Delivery charge")} value={tk(data.parcel.deliveryCharge)} />
            <Money label={t("COD charge")} value={tk(data.parcel.codCharge)} />
          </div>
          <p className="-mt-3 text-xs text-ink-3">
            {data.parcel.category && `${CATEGORY[data.parcel.category].emoji} ${CATEGORY[data.parcel.category].label} · `}
            {dec(data.parcel.weightKg)} {t("kg")}{data.parcel.itemDescription && ` · ${data.parcel.itemDescription}`}
            {data.parcel.note && ` · ${t("Note")}: ${data.parcel.note}`}
            {data.parcel.settlement === "paid" && ` · ${t("Paid to merchant")}`}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoBlock icon={Bike} title={t("Pickup rider")}>
              {data.pickupRider ? (
                <p>
                  {data.pickupRider.name} · <a className="text-brand" href={`tel:${data.pickupRider.phone}`}>{data.pickupRider.phone}</a>
                </p>
              ) : (
                <p className="text-ink-3">{t("Not assigned")}</p>
              )}
              {me.role === "admin" && data.parcel.status === "pending" && (
                <div className="mt-2 flex gap-2">
                  <div className="flex-1">
                    <RiderSelect value={pickupRider} onChange={setPickupRider} />
                  </div>
                  <Button
                    className="shrink-0 whitespace-nowrap"
                    disabled={!pickupRider}
                    onClick={() => {
                      const args = { token, ids: [data.parcel._id], riderId: pickupRider as Id<"users"> };
                      toast.undoable(t("Pickup rider assigned."), () => assignPickup(args), `parcel:${data.parcel._id}`);
                    }}
                  >
                    {t("Assign")}
                  </Button>
                </div>
              )}
            </InfoBlock>
            <InfoBlock icon={Bike} title={t("Delivery rider")}>
              {data.deliveryRider ? (
                <p>
                  {data.deliveryRider.name} · <a className="text-brand" href={`tel:${data.deliveryRider.phone}`}>{data.deliveryRider.phone}</a>
                </p>
              ) : (
                <p className="text-ink-3">{t("Not assigned")}</p>
              )}
            </InfoBlock>
          </div>

          {data.moves.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-bold">{t("Update status")}</p>
              <StatusActions
                parcelId={data.parcel._id}
                moves={data.moves}
                codAmount={data.parcel.codAmount}
                currentRiderId={data.parcel.deliveryRiderId}
              />
            </div>
          )}

          <div>
            <p className="mb-3 text-sm font-bold">{t("History")}</p>
            <ol>
              {data.events.map((e, i) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < data.events.length - 1 && <span className="absolute left-[5px] top-4 h-full w-0.5 bg-line" />}
                  <span className={cx("relative z-10 mt-1.5 size-3 shrink-0 rounded-full ring-4 ring-white", STATUS[e.status].dot)} />
                  <div className="text-sm">
                    <p className="font-semibold">
                      {STATUS[e.status].label}
                      {e.byRole && <span className="font-normal text-ink-3"> · {t(e.byRole === "admin" ? "Admin" : e.byRole === "merchant" ? "Merchant" : "Rider")}</span>}
                    </p>
                    {e.note && <p className="text-ink-2">{e.note}</p>}
                    <p className="text-xs text-ink-3">{dateTime(e.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Modal>
  );
}

function InfoBlock({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line p-4 text-sm">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-ink-3 uppercase">
        <Icon className="size-3.5" /> {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Money({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-page p-3">
      <p className="text-xs font-medium text-ink-3">{label}</p>
      <p className="mt-0.5 font-bold">{value}</p>
    </div>
  );
}

