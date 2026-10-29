import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Bike,
  Coins,
  Download,
  ExternalLink,
  Plus,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { dateTime, tk } from "../lib/format";
import { exportToCsv } from "../lib/csv";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  cx,
} from "../components/ui";
import { t } from "../lib/prefs";
import { RangePills, useDateRange } from "../components/RangePicker";

export type ExpenseVoucherCategory =
  | "office_rent"
  | "fuel_transport"
  | "rider_commission"
  | "staff_salary"
  | "utility"
  | "equipment"
  | "other";

export const EXPENSE_CATEGORIES: { value: ExpenseVoucherCategory; label: string }[] = [
  { value: "office_rent", get label() { return t("Office Rent"); } },
  { value: "fuel_transport", get label() { return t("Fuel & Transport"); } },
  { value: "rider_commission", get label() { return t("Rider Commission"); } },
  { value: "staff_salary", get label() { return t("Staff Salary"); } },
  { value: "utility", get label() { return t("Utility & Bills"); } },
  { value: "equipment", get label() { return t("Equipment & Supplies"); } },
  { value: "other", get label() { return t("Other"); } },
];

export const ALL_CATEGORIES = [
  { value: "", get label() { return t("All Categories"); } },
  { value: "delivery_fee", get label() { return t("Delivery Fee"); } },
  { value: "cod_fee", get label() { return t("COD Fee"); } },
  { value: "office_rent", get label() { return t("Office Rent"); } },
  { value: "fuel_transport", get label() { return t("Fuel & Transport"); } },
  { value: "rider_commission", get label() { return t("Rider Commission"); } },
  { value: "agent_commission", get label() { return t("Agent Commission"); } },
  { value: "staff_salary", get label() { return t("Staff Salary"); } },
  { value: "utility", get label() { return t("Utility & Bills"); } },
  { value: "equipment", get label() { return t("Equipment & Supplies"); } },
  { value: "other", get label() { return t("Other"); } },
];

export const CATEGORY_LABELS: Record<string, string> = {
  get delivery_fee() { return t("Delivery Fee"); },
  get cod_fee() { return t("COD Fee"); },
  get office_rent() { return t("Office Rent"); },
  get fuel_transport() { return t("Fuel & Transport"); },
  get rider_commission() { return t("Rider Commission"); },
  get agent_commission() { return t("Agent Commission"); },
  get staff_salary() { return t("Staff Salary"); },
  get utility() { return t("Utility & Bills"); },
  get equipment() { return t("Equipment & Supplies"); },
  get other() { return t("Other"); },
};

export function Accounts() {
  const { token, me } = useAuthed();
  const toast = useToast();

  // Date range for Financial Summary
  const [range, setRange] = useDateRange("accounts", "all");

  const summaryArgs = range.preset === "all" ? { token } : { token, from: range.from, to: range.to };
  const summary = useQuery(api.accounts.getFinancialSummary, summaryArgs);

  // Filters for Transactions Ledger
  const [typeFilter, setTypeFilter] = useState<"" | "income" | "expense" | "payout" | "deposit">("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseVoucherCategory>("office_rent");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [busy, setBusy] = useState(false);

  // Convex mutations
  const addExpenseVoucher = useMutation(api.accounts.addExpenseVoucher);

  // Ledger data query
  const transactions = useQuery(api.accounts.listTransactions, {
    token,
    type: typeFilter ? typeFilter : undefined,
    category: categoryFilter ? (categoryFilter as any) : undefined,
  });

  // Client search filter
  const q = search.trim().toLowerCase();
  const filteredTransactions = transactions?.filter((tx) => {
    if (!q) return true;
    return (
      tx.description.toLowerCase().includes(q) ||
      tx.createdByName.toLowerCase().includes(q) ||
      (tx.referenceId && tx.referenceId.toLowerCase().includes(q)) ||
      (CATEGORY_LABELS[tx.category] && CATEGORY_LABELS[tx.category].toLowerCase().includes(q))
    );
  });

  async function handleCreateVoucher() {
    const val = Number(amount);
    if (!val || val <= 0) {
      toast.error(t("Amount must be greater than zero."));
      return;
    }
    const cleanDesc = description.trim();
    if (!cleanDesc) {
      toast.error(t("Description is required."));
      return;
    }

    setBusy(true);
    try {
      await addExpenseVoucher({
        token,
        category,
        amount: val,
        description: cleanDesc,
        referenceId: referenceId.trim() || undefined,
        receiptUrl: receiptUrl.trim() || undefined,
      });
      toast.ok(t("Expense voucher recorded successfully."));
      setAddModalOpen(false);
      setCategory("office_rent");
      setAmount("");
      setDescription("");
      setReferenceId("");
      setReceiptUrl("");
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  }

  function handleExportCsv() {
    if (!filteredTransactions || filteredTransactions.length === 0) {
      toast.error(t("No transactions to export."));
      return;
    }

    const headers = [
      t("Date"),
      t("Type"),
      t("Category"),
      t("Description"),
      t("Amount (৳)"),
      t("Reference ID"),
      t("Receipt URL"),
      t("Created By"),
    ];

    const rows = filteredTransactions.map((tx) => [
      dateTime(tx.createdAt),
      tx.type.toUpperCase(),
      CATEGORY_LABELS[tx.category] ?? tx.category,
      tx.description,
      (tx.type === "expense" || tx.type === "payout" ? "-" : "+") + tx.amount,
      tx.referenceId ?? "",
      tx.receiptUrl ?? "",
      tx.createdByName,
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToCsv(`accounts-ledger-${dateStr}.csv`, headers, rows);
    toast.ok(t("Exported {n} transactions to CSV.", { n: filteredTransactions.length }));
  }

  if (me.role !== "admin") {
    return (
      <div className="py-12">
        <Empty
          icon={Receipt}
          title={t("Access restricted")}
          text={t("Smart Accounts Management is available to administrators only.")}
        />
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title={t("Smart Accounts Management")}
        subtitle={t("Financial health, double-entry expense vouchers, and operational ledgers.")}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <RangePills value={range} onChange={setRange} withAll />
            <Button
              icon={Plus}
              onClick={() => setAddModalOpen(true)}
              className="shadow-lg shadow-brand/30"
            >
              {t("Add Expense Voucher")}
            </Button>
          </div>
        }
      />

      {/* 1. Financial Summary KPI Cards */}
      {!summary ? (
        <Spinner />
      ) : (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* 1. Total Delivery Revenue */}
          <StatCard
            label={t("Total Delivery Revenue")}
            value={tk(summary.totalDeliveryChargeRevenue)}
            icon={Truck}
            accent="brand"
            hint={t("{n} delivered parcels", { n: summary.deliveredParcelCount })}
          />

          {/* 2. Total COD Margin */}
          <StatCard
            label={t("Total COD Margin")}
            value={tk(summary.codMargin)}
            icon={Coins}
            accent="navy"
            hint={t("From {cod} collected COD", { cod: tk(summary.totalCodCollected) })}
          />

          {/* 3. Rider Commissions Paid & Earned */}
          <StatCard
            label={t("Rider Commissions Paid & Earned")}
            value={tk(summary.totalRiderCommissionsPaid)}
            icon={Bike}
            accent="sun"
            hint={t("Paid: {paid} · Earned: {earned}", {
              paid: tk(summary.totalRiderCommissionsPaid),
              earned: tk(summary.totalRiderCommissionsEarned),
            })}
          />

          {/* 4. Total Operational Expenses */}
          <StatCard
            label={t("Total Operational Expenses")}
            value={tk(summary.totalOperationalExpenses)}
            icon={Receipt}
            accent="red"
            hint={t("{n} recorded vouchers", { n: summary.expenseCount })}
          />

          {/* 5. Merchant Payouts Disbursed */}
          <StatCard
            label={t("Merchant Payouts Disbursed")}
            value={tk(summary.totalMerchantPayoutsCompleted)}
            icon={Wallet}
            accent="navy"
            hint={t("{n} completed payouts", { n: summary.payoutCount })}
          />

          {/* 6. Net Company Profit (highlighted green if positive, red if negative) */}
          <Card
            className={cx(
              "animate-rise relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-default border-t-4",
              summary.netCompanyProfit >= 0
                ? "border-t-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-t-red-500 bg-red-50/40 dark:bg-red-950/20",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-bold text-ink-3 uppercase tracking-wider">
                    {t("Net Company Profit")}
                  </p>
                  <Badge tone={summary.netCompanyProfit >= 0 ? "green" : "red"}>
                    {summary.netCompanyProfit >= 0 ? t("Profitable") : t("Deficit")}
                  </Badge>
                </div>
                <p
                  className={cx(
                    "mt-2.5 truncate text-2xl font-black tracking-tight sm:text-3xl",
                    summary.netCompanyProfit >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {summary.netCompanyProfit >= 0
                    ? `+${tk(summary.netCompanyProfit)}`
                    : `-${tk(Math.abs(summary.netCompanyProfit))}`}
                </p>
                <p className="mt-1.5 text-xs font-medium text-ink-3">
                  {summary.netCompanyProfit >= 0
                    ? t("Operating at net positive profit")
                    : t("Expenses exceed gross revenue")}
                </p>
              </div>
              <div
                className={cx(
                  "grid size-12 shrink-0 place-items-center rounded-2xl shadow-xs transition-transform duration-200",
                  summary.netCompanyProfit >= 0
                    ? "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                    : "bg-red-100/70 text-red-700 dark:bg-red-500/20 dark:text-red-300",
                )}
              >
                {summary.netCompanyProfit >= 0 ? (
                  <TrendingUp className="size-6 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingDown className="size-6 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Accounts Transaction Ledger */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">
            {t("Accounts Transaction Ledger")}
          </h2>
          <p className="mt-0.5 text-xs text-ink-3">
            {t("Real-time journal of all revenue, expenses, disbursements, and deposits.")}
          </p>
        </div>
        <Button
          variant="outline"
          icon={Download}
          onClick={handleExportCsv}
          disabled={!filteredTransactions || filteredTransactions.length === 0}
        >
          {t("Export Ledger to CSV")}
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="mb-6 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Filter by Type */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-3">
              {t("Filter by Type")}
            </label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="h-10 text-xs"
            >
              <option value="">{t("All Types")}</option>
              <option value="income">{t("Income (+)")}</option>
              <option value="expense">{t("Expense (-)")}</option>
              <option value="payout">{t("Payout (-)")}</option>
              <option value="deposit">{t("Deposit (+)")}</option>
            </Select>
          </div>

          {/* Filter by Category */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-3">
              {t("Filter by Category")}
            </label>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 text-xs"
            >
              {ALL_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Search description / memo */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-3">
              {t("Search Description")}
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search by keyword, ref, or user…")}
                className="h-10 pl-9 text-xs"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Transaction Table */}
      <Card className="overflow-hidden">
        {!filteredTransactions ? (
          <Spinner />
        ) : filteredTransactions.length === 0 ? (
          <Empty
            icon={Receipt}
            title={t("No transactions found")}
            text={t("No accounts transactions match your current filters.")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-page text-xs font-bold text-ink-3 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">{t("Date & Time")}</th>
                  <th className="px-4 py-3.5">{t("Type")}</th>
                  <th className="px-4 py-3.5">{t("Category")}</th>
                  <th className="px-4 py-3.5">{t("Description / Memo")}</th>
                  <th className="px-4 py-3.5 text-right">{t("Amount (৳)")}</th>
                  <th className="px-4 py-3.5 text-right">{t("Created By")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredTransactions.map((tx) => {
                  const isNegative = tx.type === "expense" || tx.type === "payout";
                  return (
                    <tr key={tx._id} className="transition hover:bg-page/60">
                      {/* Date */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs text-ink-2">
                        {dateTime(tx.createdAt)}
                      </td>

                      {/* Type Badge */}
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {tx.type === "income" && <Badge tone="green">+{t("Income")}</Badge>}
                        {tx.type === "expense" && <Badge tone="red">-{t("Expense")}</Badge>}
                        {tx.type === "payout" && <Badge tone="amber">{t("Payout")}</Badge>}
                        {tx.type === "deposit" && <Badge tone="brand">+{t("Deposit")}</Badge>}
                      </td>

                      {/* Category */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-xs font-medium text-ink">
                        {CATEGORY_LABELS[tx.category] ?? tx.category}
                      </td>

                      {/* Description & Links */}
                      <td className="px-4 py-3.5 text-xs text-ink">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{tx.description}</span>
                          {tx.referenceId && (
                            <span className="rounded bg-navy-50 px-1.5 py-0.5 font-mono text-[11px] text-ink-2 dark:bg-navy-900">
                              #{tx.referenceId}
                            </span>
                          )}
                          {tx.receiptUrl && (
                            <a
                              href={tx.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-brand hover:underline"
                              title={t("View receipt attachment")}
                            >
                              <ExternalLink className="size-3" />
                              <span className="text-[11px] font-medium">{t("Receipt")}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-extrabold tabular-nums">
                        {isNegative ? (
                          <span className="text-red-600 dark:text-red-400">-{tk(tx.amount)}</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">+{tk(tx.amount)}</span>
                        )}
                      </td>

                      {/* Created By */}
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-xs text-ink-3">
                        {tx.createdByName || t("Admin")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 2. Add Expense Voucher Modal */}
      <Modal
        open={addModalOpen}
        onClose={() => !busy && setAddModalOpen(false)}
        title={t("Add Expense Voucher")}
        footer={
          <>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setAddModalOpen(false)}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              loading={busy}
              disabled={busy || !amount || !description.trim()}
              onClick={handleCreateVoucher}
            >
              {t("Save Voucher")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-ink-3">
            {t("Record an operational expense voucher for office, fleet, utility, staff, or maintenance.")}
          </p>

          {/* Category */}
          <Field label={t("Expense Category")}>
            {(id) => (
              <Select
                id={id}
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseVoucherCategory)}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {/* Amount */}
          <Field label={t("Amount (৳)")} hint={t("Voucher amount in BDT")}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min="1"
                step="any"
                required
                placeholder={t("e.g. 5000")}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            )}
          </Field>

          {/* Description */}
          <Field label={t("Description / Voucher Reason")} hint={t("Detailed explanation for this expense voucher")}>
            {(id) => (
              <Input
                id={id}
                required
                placeholder={t("e.g. Uttara Hub generator fuel and October office rent")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            )}
          </Field>

          {/* Reference ID */}
          <Field label={t("Reference ID / Voucher #")} hint={t("Optional paper receipt, memo, or bill number")}>
            {(id) => (
              <Input
                id={id}
                placeholder={t("e.g. VCH-2026-0042")}
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
              />
            )}
          </Field>

          {/* Receipt URL */}
          <Field label={t("Receipt URL")} hint={t("Optional link to scanned invoice, receipt, or photo")}>
            {(id) => (
              <Input
                id={id}
                type="url"
                placeholder="https://..."
                value={receiptUrl}
                onChange={(e) => setReceiptUrl(e.target.value)}
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}

export { Accounts as AccountsPage };
export default Accounts;
