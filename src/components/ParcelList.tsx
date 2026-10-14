import { useEffect, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Package, PackagePlus, Printer, Search, X } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { navigate } from "../lib/router";
import { STATUS, STATUS_ORDER, dateTime, tk, type Status } from "../lib/format";
import { Button, Card, Empty, Input, Select, Spinner, StatusBadge, cx } from "./ui";
import { ParcelDetail, RiderSelect } from "./ParcelDetail";
import { RangePills, useDateRange } from "./RangePicker";
import { t } from "../lib/prefs";

export function ParcelList() {
  const { token, me } = useAuthed();
  const toast = useToast();
  const isAdmin = me.role === "admin";
  const [status, setStatus] = useState<Status | "">(() => (new URLSearchParams(location.search).get("status") as Status) ?? "");
  const [merchantId, setMerchantId] = useState<Id<"users"> | "">(
    () => (new URLSearchParams(location.search).get("merchant") as Id<"users"> | null) ?? "",
  );
  const [range, setRange] = useDateRange("parcels", "all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Id<"parcels"> | null>(null);
  const [selected, setSelected] = useState<Set<Id<"parcels">>>(new Set());
  const [bulkRider, setBulkRider] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);
  useEffect(() => setSelected(new Set()), [status, merchantId, search, range.from, range.to]);

  const merchants = useQuery(api.users.options, isAdmin ? { token, role: "merchant" } : "skip");
  const { results, status: loadState, loadMore } = usePaginatedQuery(
    api.parcels.list,
    {
      token,
      status: status || undefined,
      merchantId: merchantId || undefined,
      search: search || undefined,
      from: range.preset === "all" ? undefined : range.from,
      to: range.preset === "all" ? undefined : range.to,
    },
    { initialNumItems: 25 },
  );
  const bulkStatus = useMutation(api.parcels.bulkUpdateStatus);
  const assignPickup = useMutation(api.parcels.assignPickup);

  const toggle = (id: Id<"parcels">) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allSelected = results.length > 0 && results.every((p) => selected.has(p._id));

  function runBulk(kind: "pickup" | Status) {
    const ids = [...selected];
    const riderId = bulkRider as Id<"users">;
    if (kind === "pickup") {
      toast.undoable(t("Pickup assigned for {n} parcel(s).", { n: ids.length }), () => assignPickup({ token, ids, riderId }));
    } else {
      toast.undoable(t("{n} parcel(s) marked as {status}.", { n: ids.length, status: STATUS[kind].label }), async () => {
        const r = await bulkStatus({ token, ids, to: kind, deliveryRiderId: kind === "out_for_delivery" ? riderId : undefined });
        // Only worth a second message when some couldn't move.
        if (r.skipped.length) {
          toast.ok(t("{done} updated, {skipped} skipped (not allowed from their status).", { done: r.done, skipped: r.skipped.length }));
        }
      });
    }
    setSelected(new Set());
  }

  return (
    <>
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-60 flex-1">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("Search tracking ID, customer name, phone, invoice…")}
              className="pl-10"
            />
          </div>
          {isAdmin && (
            <Select value={merchantId} onChange={(e) => setMerchantId(e.target.value as Id<"users">)} className="w-auto min-w-48">
              <option value="">{t("All merchants")}</option>
              {merchants?.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.label}
                </option>
              ))}
            </Select>
          )}
        </div>
        <div className="mt-3">
          <RangePills value={range} onChange={setRange} withAll />
        </div>
        {!search && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["", ...STATUS_ORDER] as const).map((s) => (
              <button
                key={s || "all"}
                onClick={() => setStatus(s)}
                className={cx(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  status === s ? "bg-navy-900 text-white" : "bg-page text-ink-2 hover:bg-navy-50",
                )}
              >
                {s ? STATUS[s].label : t("All")}
              </button>
            ))}
          </div>
        )}
      </Card>

      {selected.size > 0 && (
        <Card className="animate-rise sticky top-16 z-20 mb-4 flex flex-wrap items-center gap-2 border-brand/40 bg-brand-50 p-3 lg:top-4">
          <span className="px-2 text-sm font-bold text-brand-700">{t("{n} selected", { n: selected.size })}</span>
          <Button size="sm" variant="outline" icon={Printer} onClick={() => window.open(`/print/labels?ids=${[...selected].join(",")}`, "_blank", "noopener")}>
            {t("Print labels")}
          </Button>
          {isAdmin && (
            <>
              <div className="w-60">
                <RiderSelect value={bulkRider} onChange={setBulkRider} />
              </div>
              <Button size="sm" disabled={!bulkRider} onClick={() => runBulk("pickup")}>
                {t("Assign pickup")}
              </Button>
              <Button size="sm" disabled={!bulkRider} onClick={() => runBulk("out_for_delivery")}>
                {t("Send out for delivery")}
              </Button>
              <Button size="sm" variant="dark" onClick={() => runBulk("picked_up")}>
                {t("Mark picked up")}
              </Button>
              <Button size="sm" variant="dark" onClick={() => runBulk("at_hub")}>
                {t("Mark at hub")}
              </Button>
            </>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-auto rounded-lg p-1.5 text-ink-2 hover:bg-white" aria-label={t("Clear selection")}>
            <X className="size-4" />
          </button>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loadState === "LoadingFirstPage" ? (
          <Spinner />
        ) : results.length === 0 ? (
          <Empty
            icon={Package}
            title={t("No parcels here")}
            text={search ? t("Nothing matches your search.") : t("Parcels will show up here once they are created.")}
            action={!search && <Button icon={PackagePlus} onClick={() => navigate("/app/parcels/new")}>{t("Create parcel")}</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-page text-left text-[11px] font-bold uppercase tracking-widest text-ink-3">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--color-brand)]"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(results.map((p) => p._id)))}
                      aria-label={t("Select all")}
                    />
                  </th>
                  <th className="px-3 py-3">{t("Parcel")}</th>
                  <th className="px-3 py-3">{t("Customer")}</th>
                  {isAdmin && <th className="px-3 py-3">{t("Merchant")}</th>}
                  <th className="px-3 py-3 text-right">{t("COD")}</th>
                  <th className="px-3 py-3 text-right">{t("Charge")}</th>
                  <th className="px-3 py-3">{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {results.map((p) => (
                  <tr
                    key={p._id}
                    onClick={() => setOpen(p._id)}
                    className={cx(
                      "cursor-pointer border-b border-line/70 transition-colors duration-100 last:border-0 hover:bg-brand-50/50",
                      selected.has(p._id) && "bg-brand-50/70",
                    )}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="size-4 accent-[var(--color-brand)]" checked={selected.has(p._id)} onChange={() => toggle(p._id)} aria-label={t("Select {code}", { code: p.trackingCode })} />
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-mono font-bold">{p.trackingCode}</p>
                      <p className="text-xs text-ink-3">
                        {dateTime(p.createdAt)}
                        {p.invoice && ` · ${p.invoice}`}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-semibold">{p.recipientName}</p>
                      <p className="text-xs text-ink-3">
                        {p.recipientPhone} · {p.district}
                      </p>
                    </td>
                    {isAdmin && <td className="px-3 py-3 text-ink-2">{p.merchantName}</td>}
                    <td className="px-3 py-3 text-right font-semibold">{tk(p.codAmount)}</td>
                    <td className="px-3 py-3 text-right text-ink-2">{tk(p.deliveryCharge + p.codCharge)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={p.status} />
                      {p.riderName && <p className="mt-1 text-xs text-ink-3">{p.riderName}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {loadState === "CanLoadMore" && (
          <div className="border-t border-line p-3 text-center">
            <Button variant="ghost" onClick={() => loadMore(50)}>
              {t("Load more")}
            </Button>
          </div>
        )}
        {loadState === "LoadingMore" && <Spinner className="py-4" />}
      </Card>

      <ParcelDetail id={open} onClose={() => setOpen(null)} />
    </>
  );
}
