import { internalMutation, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { expenseCategory } from "./schema";
import { requireAdmin } from "./auth";

/**
 * Computes company financial health and key performance indicators.
 * - Total COD Collected (from cashDeposits & delivered parcels)
 * - Total Delivery Charge Revenue (deliveryCharge from delivered parcels)
 * - Total Rider Commissions Earned / Paid (from commissions table)
 * - Total Operational Expenses (from accountsTransactions where type == 'expense')
 * - Total Merchant Payouts Completed (from payouts where status == 'paid')
 * - Net Company Profit = (Delivery Charge Revenue + COD margin) - (Rider Commissions + Operational Expenses)
 */
export const getFinancialSummary = query({
  args: {
    token: v.string(),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    // 1. Delivered parcels
    const parcels = await ctx.db.query("parcels").collect();
    const deliveredParcels = parcels.filter((p) => {
      if (p.status !== "delivered" && p.status !== "partial_delivered") return false;
      const ts = p.finalAt ?? p.updatedAt ?? p.createdAt;
      if (args.from !== undefined && ts < args.from) return false;
      if (args.to !== undefined && ts >= args.to) return false;
      return true;
    });

    const totalCodFromDeliveredParcels = deliveredParcels.reduce(
      (sum, p) => sum + (p.collectedAmount || 0),
      0,
    );
    const totalDeliveryChargeRevenue = deliveredParcels.reduce(
      (sum, p) => sum + (p.deliveryCharge || 0),
      0,
    );
    const codMargin = deliveredParcels.reduce(
      (sum, p) => sum + (p.codCharge || 0),
      0,
    );

    // 2. Cash deposits collected from riders
    const deposits = await ctx.db.query("cashDeposits").collect();
    const filteredDeposits = deposits.filter((d) => {
      if (args.from !== undefined && d.createdAt < args.from) return false;
      if (args.to !== undefined && d.createdAt >= args.to) return false;
      return true;
    });
    const totalCashDeposits = filteredDeposits.reduce(
      (sum, d) => sum + (d.amount || 0),
      0,
    );

    // Total COD collected (from delivered parcels)
    const totalCodCollected = totalCodFromDeliveredParcels;

    // 3. Rider & Hub Agent commissions earned / paid
    const commissions = await ctx.db.query("commissions").collect();
    const filteredCommissions = commissions.filter((c) => {
      if (args.from !== undefined && c.createdAt < args.from) return false;
      if (args.to !== undefined && c.createdAt >= args.to) return false;
      return true;
    });
    const totalRiderCommissionsEarned = filteredCommissions
      .filter((c) => c.status === "earned")
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalRiderCommissionsPaid = filteredCommissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalRiderCommissions = filteredCommissions.reduce(
      (sum, c) => sum + (c.amount || 0),
      0,
    );

    // 4. Operational expenses from accountsTransactions (type == 'expense')
    const expenses = await ctx.db
      .query("accountsTransactions")
      .withIndex("by_type_and_createdAt", (q) => q.eq("type", "expense"))
      .collect();
    const filteredExpenses = expenses.filter((t) => {
      if (args.from !== undefined && t.createdAt < args.from) return false;
      if (args.to !== undefined && t.createdAt >= args.to) return false;
      return true;
    });
    const totalOperationalExpenses = filteredExpenses.reduce(
      (sum, t) => sum + (t.amount || 0),
      0,
    );

    // 5. Merchant payouts completed (from payouts table where status == 'paid')
    const payouts = await ctx.db.query("payouts").collect();
    const filteredPayouts = payouts.filter((p) => {
      if ((p as { status?: string }).status !== undefined && (p as { status?: string }).status !== "paid") {
        return false;
      }
      if (args.from !== undefined && p.createdAt < args.from) return false;
      if (args.to !== undefined && p.createdAt >= args.to) return false;
      return true;
    });
    const totalMerchantPayoutsCompleted = filteredPayouts.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );

    // 6. Net company profit = (Delivery Charge Revenue + COD margin) - (Rider Commissions + Operational Expenses)
    const netCompanyProfit =
      totalDeliveryChargeRevenue + codMargin - (totalRiderCommissions + totalOperationalExpenses);

    return {
      totalCodCollected,
      totalCashDeposits,
      codWithRiders: Math.max(0, totalCodFromDeliveredParcels - totalCashDeposits),
      totalDeliveryChargeRevenue,
      codMargin,
      totalRiderCommissionsEarned,
      totalRiderCommissionsPaid,
      totalRiderCommissions,
      totalOperationalExpenses,
      totalMerchantPayoutsCompleted,
      netCompanyProfit,
      deliveredParcelCount: deliveredParcels.length,
      cashDepositCount: filteredDeposits.length,
      commissionCount: filteredCommissions.length,
      expenseCount: filteredExpenses.length,
      payoutCount: filteredPayouts.length,
    };
  },
});

/**
 * Lists accountsTransactions with optional type and category filters.
 */
export const listTransactions = query({
  args: {
    token: v.string(),
    type: v.optional(
      v.union(
        v.literal("income"),
        v.literal("expense"),
        v.literal("payout"),
        v.literal("deposit"),
      ),
    ),
    category: v.optional(expenseCategory),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let rows;
    if (args.type) {
      rows = await ctx.db
        .query("accountsTransactions")
        .withIndex("by_type_and_createdAt", (q) => q.eq("type", args.type!))
        .order("desc")
        .collect();
      if (args.category) {
        rows = rows.filter((r) => r.category === args.category);
      }
    } else if (args.category) {
      rows = await ctx.db
        .query("accountsTransactions")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .collect();
    } else {
      rows = await ctx.db
        .query("accountsTransactions")
        .withIndex("by_createdAt")
        .order("desc")
        .collect();
    }

    if (args.limit && args.limit > 0) {
      rows = rows.slice(0, args.limit);
    }

    const userIds = [...new Set(rows.map((r) => r.createdBy))];
    const users = await Promise.all(userIds.map((id) => ctx.db.get("users", id)));
    const userMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!.name]));

    return rows.map((r) => ({
      ...r,
      createdByName: userMap.get(r.createdBy) ?? "Admin",
    }));
  },
});

/**
 * Admin records an expense voucher.
 */
export const addExpenseVoucher = mutation({
  args: {
    token: v.string(),
    category: expenseCategory,
    amount: v.number(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);

    if (args.amount <= 0) {
      throw new ConvexError("Amount must be greater than zero.");
    }
    const description = args.description.trim();
    if (!description) {
      throw new ConvexError("Description is required.");
    }

    return await ctx.db.insert("accountsTransactions", {
      type: "expense",
      category: args.category,
      amount: args.amount,
      description,
      referenceId: args.referenceId?.trim() || undefined,
      receiptUrl: args.receiptUrl?.trim() || undefined,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal / admin records any transaction (income, expense, payout, deposit).
 */
export const recordTransaction = mutation({
  args: {
    token: v.string(),
    type: v.union(
      v.literal("income"),
      v.literal("expense"),
      v.literal("payout"),
      v.literal("deposit"),
    ),
    category: expenseCategory,
    amount: v.number(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);

    if (args.amount <= 0) {
      throw new ConvexError("Amount must be greater than zero.");
    }
    const description = args.description.trim();
    if (!description) {
      throw new ConvexError("Description is required.");
    }

    return await ctx.db.insert("accountsTransactions", {
      type: args.type,
      category: args.category,
      amount: args.amount,
      description,
      referenceId: args.referenceId?.trim() || undefined,
      receiptUrl: args.receiptUrl?.trim() || undefined,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
  },
});

/**
 * Internal mutation for server-side callers to record transactions directly.
 */
export const internalRecordTransaction = internalMutation({
  args: {
    type: v.union(
      v.literal("income"),
      v.literal("expense"),
      v.literal("payout"),
      v.literal("deposit"),
    ),
    category: expenseCategory,
    amount: v.number(),
    description: v.string(),
    referenceId: v.optional(v.string()),
    receiptUrl: v.optional(v.string()),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.amount <= 0) {
      throw new ConvexError("Amount must be greater than zero.");
    }
    const description = args.description.trim();
    if (!description) {
      throw new ConvexError("Description is required.");
    }

    return await ctx.db.insert("accountsTransactions", {
      type: args.type,
      category: args.category,
      amount: args.amount,
      description,
      referenceId: args.referenceId?.trim() || undefined,
      receiptUrl: args.receiptUrl?.trim() || undefined,
      createdBy: args.createdBy,
      createdAt: Date.now(),
    });
  },
});
