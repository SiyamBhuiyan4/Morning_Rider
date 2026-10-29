import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Banknote,
  Bike,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  Search,
  Store,
  UserCheck,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { dateTime, num, tk } from "../lib/format";
import {
  Button,
  Card,
  Empty,
  Input,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  cx,
} from "../components/ui";
import { RangePills, useDateRange } from "../components/RangePicker";
import { exportToCsv } from "../lib/csv";
import { t } from "../lib/prefs";

/* -------------------------------------------------------------------------- */
/*                                RIDER VIEW                                  */
/* -------------------------------------------------------------------------- */

export function RiderCommissions() {
  const { token } = useAuthed();
  const toast = useToast();
  const [statusFilter, setStatusFilter] = useState<"all" | "earned" | "paid">("all");
  const [search, setSearch] = useState("");

  const stats = useQuery(api.commissions.riderStats, { token });
  const commissions = useQuery(api.commissions.myCommissions, {
    token,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 500,
  });

  const filtered = useMemo(() => {
    if (!commissions) return [];
    if (!search.trim()) return commissions;
    const q = search.trim().toLowerCase();
    return commissions.filter(
      (c) =>
        c.trackingCode.toLowerCase().includes(q) ||
        (c.recipientName && c.recipientName.toLowerCase().includes(q)) ||
        (c.recipientPhone && c.recipientPhone.includes(q)) ||
        (c.zone && c.zone.toLowerCase().includes(q)),
    );
  }, [commissions, search]);

  const handleExportCsv = () => {
    if (!filtered || filtered.length === 0) {
      toast.error(t("No commission records to export."));
      return;
    }

    const headers = [
      t("Tracking Code"),
      t("Recipient"),
      t("Phone"),
      t("Zone"),
      t("Parcel COD (Tk)"),
      t("Commission (Tk)"),
      t("Status"),
      t("Earned Date"),
      t("Settled Date"),
    ];

    const rows = filtered.map((c) => [
      c.trackingCode,
      c.recipientName ?? "—",
      c.recipientPhone ?? "—",
      c.zone ?? "—",
      c.codAmount ?? 0,
      c.amount,
      c.status === "paid" ? t("Paid") : t("Earned (Unpaid)"),
      dateTime(c.createdAt),
      c.paidAt ? dateTime(c.paidAt) : "—",
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`my-commissions-${dateStr}.csv`, headers, rows);
    toast.ok(t("Exported {n} commission records to CSV.", { n: filtered.length }));
  };

  if (!stats || commissions === undefined) {
    return <Spinner />;
  }

  return (
    <>
      <PageHeader
        title={t("My Delivery Commissions")}
        subtitle={t("Delivery commission earnings per completed order and settlement balances.")}
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
          >
            {t("Export CSV")}
          </Button>
        }
      />

      {/* Summary KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          label={t("Total Earned")}
          value={tk(stats.totalEarned)}
          accent="brand"
          hint={t("Cumulative delivery commissions")}
        />
        <StatCard
          icon={Clock}
          label={t("Uncollected Balance")}
          value={tk(stats.uncollectedBalance)}
          accent="sun"
          hint={t("Pending office settlement")}
        />
        <StatCard
          icon={CheckCircle2}
          label={t("Paid & Settled")}
          value={tk(stats.paidBalance)}
          accent="green"
          hint={t("Disbursed to your account")}
        />
        <StatCard
          icon={Bike}
          label={t("Total Deliveries")}
          value={num(stats.deliveryCount)}
          accent="navy"
          hint={t("Rewarded parcels")}
        />
      </div>

      {/* Filters & Search */}
      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={cx(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                statusFilter === "all"
                  ? "bg-brand text-white shadow-sm"
                  : "bg-page text-ink-2 hover:bg-navy-50 hover:text-ink",
              )}
            >
              {t("All")}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("earned")}
              className={cx(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                statusFilter === "earned"
                  ? "bg-brand text-white shadow-sm"
                  : "bg-page text-ink-2 hover:bg-navy-50 hover:text-ink",
              )}
            >
              {t("Uncollected / Earned")}
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("paid")}
              className={cx(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition cursor-pointer",
                statusFilter === "paid"
                  ? "bg-brand text-white shadow-sm"
                  : "bg-page text-ink-2 hover:bg-navy-50 hover:text-ink",
              )}
            >
              {t("Paid")}
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search tracking or customer...")}
              className="h-9 pl-9 text-xs"
            />
          </div>
        </div>
      </Card>

      {/* Commissions Table */}
      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <Empty
            icon={Coins}
            title={t("No commission records")}
            text={
              search
                ? t("No results match your search criteria.")
                : t("Earned delivery commissions will appear here as you complete orders.")
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-page text-[12px] font-semibold text-ink-3 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">{t("Tracking Code")}</th>
                  <th className="px-4 py-3">{t("Recipient")}</th>
                  <th className="px-4 py-3">{t("Parcel COD")}</th>
                  <th className="px-4 py-3">{t("Commission")}</th>
                  <th className="px-4 py-3">{t("Status")}</th>
                  <th className="px-4 py-3 text-right">{t("Date")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((item) => (
                  <tr key={item._id} className="transition hover:bg-navy-50/50">
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-ink">{item.trackingCode}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-ink font-medium">{item.recipientName ?? "—"}</div>
                      <div className="text-xs text-ink-3">
                        {item.recipientPhone ?? ""}
                        {item.zone ? ` · ${item.zone}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-ink-2">
                      {item.codAmount !== undefined ? tk(item.codAmount) : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        +{tk(item.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {item.status === "paid" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          {t("Paid")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          {t("Earned")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right text-xs text-ink-3">
                      <div>{dateTime(item.createdAt)}</div>
                      {item.paidAt && (
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          {t("Settled")}: {dateTime(item.paidAt)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                                ADMIN VIEW                                  */
/* -------------------------------------------------------------------------- */

export function AdminCommissions() {
  const { token } = useAuthed();
  const toast = useToast();

  const [roleFilter, setRoleFilter] = useState<"all" | "rider" | "agent">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "earned" | "paid">("all");
  const [range, setRange] = useDateRange("commissions", "30d");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<Id<"commissions">>>(new Set());
  const [settling, setSettling] = useState(false);

  // Query commissions matching filters
  const commissions = useQuery(api.commissions.adminListCommissions, {
    token,
    userRole: roleFilter === "all" ? undefined : roleFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    startDate: range.preset === "all" ? undefined : range.from,
    endDate: range.preset === "all" ? undefined : range.to,
  });

  const settleMutation = useMutation(api.commissions.settleCommission);

  // Search filter
  const filtered = useMemo(() => {
    if (!commissions) return [];
    if (!search.trim()) return commissions;
    const q = search.trim().toLowerCase();
    return commissions.filter(
      (c) =>
        c.trackingCode.toLowerCase().includes(q) ||
        c.userName.toLowerCase().includes(q) ||
        c.userPhone.includes(q),
    );
  }, [commissions, search]);

  // Platform stats computed from current filtered dataset
  const stats = useMemo(() => {
    if (!commissions) {
      return { totalAmount: 0, earnedAmount: 0, paidAmount: 0, count: 0, unsettledCount: 0 };
    }
    let totalAmount = 0;
    let earnedAmount = 0;
    let paidAmount = 0;
    let unsettledCount = 0;

    for (const c of commissions) {
      totalAmount += c.amount;
      if (c.status === "earned") {
        earnedAmount += c.amount;
        unsettledCount++;
      } else if (c.status === "paid") {
        paidAmount += c.amount;
      }
    }

    return {
      totalAmount,
      earnedAmount,
      paidAmount,
      count: commissions.length,
      unsettledCount,
    };
  }, [commissions]);

  // Toggle selection for all visible unsettled commissions
  const unsettledInView = useMemo(
    () => filtered.filter((c) => c.status === "earned"),
    [filtered],
  );

  const allUnsettledSelected =
    unsettledInView.length > 0 && unsettledInView.every((c) => selectedIds.has(c._id));

  const toggleSelectAll = () => {
    if (allUnsettledSelected) {
      setSelectedIds(new Set());
    } else {
      const next = new Set<Id<"commissions">>();
      for (const c of unsettledInView) {
        next.add(c._id);
      }
      setSelectedIds(next);
    }
  };

  const toggleSelectOne = (id: Id<"commissions">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Settle single commission
  const handleSettleSingle = async (commissionId: Id<"commissions">) => {
    try {
      setSettling(true);
      const res = await settleMutation({
        token,
        commissionId,
      });
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(commissionId);
        return next;
      });
      toast.ok(t("Settled {count} commission totaling {amount}.", { count: res.settledCount, amount: tk(res.totalSettledAmount) }));
    } catch (err) {
      toast.error(err);
    } finally {
      setSettling(false);
    }
  };

  // Batch settle selected commissions
  const handleBatchSettle = async () => {
    if (selectedIds.size === 0) return;
    try {
      setSettling(true);
      const res = await settleMutation({
        token,
        commissionIds: Array.from(selectedIds),
      });
      setSelectedIds(new Set());
      toast.ok(t("Successfully settled {count} commissions totaling {amount}.", { count: res.settledCount, amount: tk(res.totalSettledAmount) }));
    } catch (err) {
      toast.error(err);
    } finally {
      setSettling(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!filtered || filtered.length === 0) {
      toast.error(t("No commission records to export."));
      return;
    }

    const headers = [
      t("Commission ID"),
      t("Tracking Code"),
      t("User Name"),
      t("User Phone"),
      t("Role"),
      t("Amount (Tk)"),
      t("Status"),
      t("Created At"),
      t("Paid At"),
    ];

    const rows = filtered.map((c) => [
      c._id,
      c.trackingCode,
      c.userName,
      c.userPhone,
      c.userRole === "rider" ? t("Rider") : t("Hub Agent"),
      c.amount,
      c.status === "paid" ? t("Paid") : t("Earned (Unpaid)"),
      dateTime(c.createdAt),
      c.paidAt ? dateTime(c.paidAt) : "—",
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`commissions-report-${dateStr}.csv`, headers, rows);
    toast.ok(t("Exported {n} commission records to CSV.", { n: filtered.length }));
  };

  return (
    <>
      <PageHeader
        title={t("Delivery Commissions")}
        subtitle={t("Manage rider and agent delivery commissions, uncollected balances, and settlements.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="primary"
                size="sm"
                icon={UserCheck}
                loading={settling}
                onClick={handleBatchSettle}
              >
                {t("Settle Selected ({n})", { n: selectedIds.size })}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
            >
              {t("Export CSV")}
            </Button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          label={t("Total Commissions")}
          value={tk(stats.totalAmount)}
          accent="brand"
          hint={t("{n} delivery records", { n: stats.count })}
        />
        <StatCard
          icon={Clock}
          label={t("Uncollected Balance")}
          value={tk(stats.earnedAmount)}
          accent="sun"
          hint={t("{n} pending payouts", { n: stats.unsettledCount })}
        />
        <StatCard
          icon={CheckCircle2}
          label={t("Settled & Paid")}
          value={tk(stats.paidAmount)}
          accent="green"
          hint={t("Disbursed to riders & agents")}
        />
        <StatCard
          icon={Banknote}
          label={t("Total Records")}
          value={num(stats.count)}
          accent="navy"
          hint={t("Matching current filters")}
        />
      </div>

      {/* Filter and Date Bar */}
      <Card className="mb-6 space-y-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <RangePills value={range} onChange={setRange} withAll />

          <div className="flex flex-wrap items-center gap-3">
            <div className="w-36">
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as "all" | "rider" | "agent")}
                className="h-9 text-xs"
              >
                <option value="all">{t("All Roles")}</option>
                <option value="rider">{t("Riders Only")}</option>
                <option value="agent">{t("Hub Agents")}</option>
              </Select>
            </div>

            <div className="w-36">
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | "earned" | "paid")}
                className="h-9 text-xs"
              >
                <option value="all">{t("All Statuses")}</option>
                <option value="earned">{t("Earned (Unpaid)")}</option>
                <option value="paid">{t("Paid / Settled")}</option>
              </Select>
            </div>

            <div className="relative w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search name, code, phone...")}
                className="h-9 pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Selected batch bar if items are selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-brand-50 px-4 py-2.5 text-xs font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand">
            <div className="flex items-center gap-2">
              <UserCheck className="size-4" />
              <span>{t("{n} commissions selected for settlement", { n: selectedIds.size })}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-ink-3 underline hover:text-ink cursor-pointer"
              >
                {t("Clear selection")}
              </button>
              <Button
                variant="primary"
                size="sm"
                loading={settling}
                onClick={handleBatchSettle}
              >
                {t("Settle Now")}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Commissions Table */}
      <Card className="overflow-hidden">
        {commissions === undefined ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty
            icon={Coins}
            title={t("No commissions found")}
            text={
              search
                ? t("No commissions match your search query.")
                : t("No commission records found for the selected role, status, or date range.")
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-page text-[12px] font-semibold text-ink-3 uppercase tracking-wider">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allUnsettledSelected}
                      onChange={toggleSelectAll}
                      disabled={unsettledInView.length === 0}
                      className="size-4 cursor-pointer rounded border-line text-brand accent-brand focus:ring-brand/30"
                      title={t("Select all unpaid")}
                    />
                  </th>
                  <th className="px-4 py-3">{t("Tracking Code")}</th>
                  <th className="px-4 py-3">{t("Recipient / Staff")}</th>
                  <th className="px-4 py-3">{t("Role")}</th>
                  <th className="px-4 py-3">{t("Amount")}</th>
                  <th className="px-4 py-3">{t("Status")}</th>
                  <th className="px-4 py-3">{t("Date")}</th>
                  <th className="px-4 py-3 text-right">{t("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((item) => {
                  const isSelected = selectedIds.has(item._id);
                  const isUnpaid = item.status === "earned";

                  return (
                    <tr
                      key={item._id}
                      className={cx(
                        "transition hover:bg-navy-50/50",
                        isSelected && "bg-brand-50/30 dark:bg-brand-500/5",
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item._id)}
                          disabled={!isUnpaid}
                          className="size-4 cursor-pointer rounded border-line text-brand accent-brand focus:ring-brand/30 disabled:opacity-30 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono font-bold text-ink">{item.trackingCode}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-ink">{item.userName}</div>
                        <div className="text-xs text-ink-3">{item.userPhone}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-page px-2 py-0.5 text-xs font-medium text-ink-2">
                          {item.userRole === "rider" ? (
                            <>
                              <Bike className="size-3 text-brand" />
                              {t("Rider")}
                            </>
                          ) : (
                            <>
                              <Store className="size-3 text-sky-600" />
                              {t("Hub Agent")}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-ink">{tk(item.amount)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {item.status === "paid" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <span className="size-1.5 rounded-full bg-emerald-500" />
                            {t("Paid")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400">
                            <span className="size-1.5 rounded-full bg-amber-500" />
                            {t("Earned")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-ink-3">
                        <div>{dateTime(item.createdAt)}</div>
                        {item.paidAt && (
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            {t("Settled")}: {dateTime(item.paidAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {isUnpaid ? (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={settling}
                            onClick={() => handleSettleSingle(item._id)}
                          >
                            {t("Settle")}
                          </Button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-3">
                            <CheckCircle2 className="size-3.5 text-emerald-600" />
                            {t("Settled")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/*                               MAIN EXPORT                                  */
/* -------------------------------------------------------------------------- */

export function CommissionsPage() {
  const { me } = useAuthed();
  if (me.role === "admin") {
    return <AdminCommissions />;
  }
  return <RiderCommissions />;
}

export const Commissions = CommissionsPage;
export default CommissionsPage;
