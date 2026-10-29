import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./auth";
import { ConvexError, v } from "convex/values";

export const DEFAULT_RIDER_COMMISSION = 25; // 25 Tk per delivery
export const DEFAULT_AGENT_COMMISSION = 15; // 15 Tk per delivery

/**
 * Rider or hub agent views their commission history and uncollected/paid status.
 */
export const myCommissions = query({
  args: {
    token: v.string(),
    status: v.optional(v.union(v.literal("earned"), v.literal("paid"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["rider", "admin"]);

    const rows = await ctx.db
      .query("commissions")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit ?? 500);

    const filtered = args.status ? rows.filter((r) => r.status === args.status) : rows;

    return await Promise.all(
      filtered.map(async (c) => {
        const parcel = await ctx.db.get("parcels", c.parcelId);
        return {
          ...c,
          isPaid: c.status === "paid",
          recipientName: parcel?.recipientName,
          recipientPhone: parcel?.recipientPhone,
          zone: parcel?.zone,
          codAmount: parcel?.codAmount,
        };
      }),
    );
  },
});

/**
 * Rider commission stats: total earned, uncollected balance, and delivery count.
 */
export const riderStats = query({
  args: {
    token: v.string(),
    riderId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["rider", "admin"]);
    const targetUserId = user.role === "admin" && args.riderId ? args.riderId : user._id;

    const list = await ctx.db
      .query("commissions")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", targetUserId))
      .collect();

    let totalEarned = 0;
    let uncollectedBalance = 0;
    let paidBalance = 0;
    const deliveryCount = list.length;

    for (const c of list) {
      totalEarned += c.amount;
      if (c.status === "earned") {
        uncollectedBalance += c.amount;
      } else if (c.status === "paid") {
        paidBalance += c.amount;
      }
    }

    return {
      totalEarned,
      uncollectedBalance,
      paidBalance,
      deliveryCount,
    };
  },
});

/**
 * Admin views commissions with filters by user, status, and date range.
 */
export const adminListCommissions = query({
  args: {
    token: v.string(),
    userId: v.optional(v.id("users")),
    userRole: v.optional(v.union(v.literal("rider"), v.literal("agent"))),
    status: v.optional(v.union(v.literal("earned"), v.literal("paid"))),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);

    let rows: Doc<"commissions">[];

    if (args.userId) {
      rows = await ctx.db
        .query("commissions")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(args.limit ?? 1000);
    } else if (args.status) {
      rows = await ctx.db
        .query("commissions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(args.limit ?? 1000);
    } else {
      rows = await ctx.db
        .query("commissions")
        .order("desc")
        .take(args.limit ?? 1000);
    }

    // Apply in-memory filtering for combined parameters
    const filtered = rows.filter((c) => {
      if (args.userId && c.userId !== args.userId) return false;
      if (args.status && c.status !== args.status) return false;
      if (args.userRole && c.userRole !== args.userRole) return false;
      if (args.startDate !== undefined && c.createdAt < args.startDate) return false;
      if (args.endDate !== undefined && c.createdAt > args.endDate) return false;
      return true;
    });

    const userMap = new Map<Id<"users">, Doc<"users"> | null>();

    return await Promise.all(
      filtered.map(async (c) => {
        let u = userMap.get(c.userId);
        if (u === undefined) {
          u = await ctx.db.get("users", c.userId);
          userMap.set(c.userId, u);
        }

        return {
          ...c,
          userName: u?.name ?? "—",
          userPhone: u?.phone ?? "",
        };
      }),
    );
  },
});

/**
 * Admin marks commission records as paid with paidAt: Date.now().
 */
export const settleCommission = mutation({
  args: {
    token: v.string(),
    commissionId: v.optional(v.id("commissions")),
    commissionIds: v.optional(v.array(v.id("commissions"))),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);

    const targetIds = new Set<Id<"commissions">>();

    if (args.commissionId) {
      targetIds.add(args.commissionId);
    }

    if (args.commissionIds) {
      for (const id of args.commissionIds) {
        targetIds.add(id);
      }
    }

    if (args.userId && !args.commissionId && !args.commissionIds) {
      const userUnpaid = await ctx.db
        .query("commissions")
        .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", args.userId!))
        .filter((q) => q.eq(q.field("status"), "earned"))
        .collect();

      for (const c of userUnpaid) {
        targetIds.add(c._id);
      }
    }

    if (targetIds.size === 0) {
      throw new ConvexError("No commissions found to settle.");
    }

    const now = Date.now();
    let settledCount = 0;
    let totalSettledAmount = 0;

    for (const id of targetIds) {
      const comm = await ctx.db.get("commissions", id);
      if (!comm || comm.status === "paid") continue;

      await ctx.db.patch("commissions", id, {
        status: "paid",
        paidAt: now,
      });

      settledCount++;
      totalSettledAmount += comm.amount;
    }

    return {
      settledCount,
      totalSettledAmount,
      paidAt: now,
    };
  },
});

/**
 * Internal / export function to credit delivery commissions.
 * - Credits the rider commission (standard 25 Tk or rider's commissionPerDelivery)
 * - If hubAgentId is present, credits hub agent commission (standard 15 Tk or agent's commissionPerDelivery)
 * - Inserts entries into commissions table with status 'earned'.
 */
export async function recordDeliveryCommission(
  ctx: MutationCtx,
  args: {
    parcelId: Id<"parcels">;
    trackingCode: string;
    riderId?: Id<"users">;
    hubAgentId?: Id<"users">;
  },
) {
  const now = Date.now();
  let riderCommissionId: Id<"commissions"> | null = null;
  let hubAgentCommissionId: Id<"commissions"> | null = null;

  // 1. Credit rider commission
  if (args.riderId) {
    const existingRiderComm = await ctx.db
      .query("commissions")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", args.riderId!))
      .filter((q) => q.eq(q.field("parcelId"), args.parcelId))
      .first();

    if (!existingRiderComm) {
      const rider = await ctx.db.get("users", args.riderId);
      const amount = rider?.commissionPerDelivery ?? DEFAULT_RIDER_COMMISSION;

      riderCommissionId = await ctx.db.insert("commissions", {
        userId: args.riderId,
        userRole: "rider",
        parcelId: args.parcelId,
        trackingCode: args.trackingCode,
        amount,
        status: "earned",
        createdAt: now,
      });
    }
  }

  // 2. Credit hub agent commission if present
  if (args.hubAgentId) {
    const existingAgentComm = await ctx.db
      .query("commissions")
      .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", args.hubAgentId!))
      .filter((q) => q.eq(q.field("parcelId"), args.parcelId))
      .first();

    if (!existingAgentComm) {
      const agent = await ctx.db.get("users", args.hubAgentId);
      const amount = agent?.commissionPerDelivery ?? DEFAULT_AGENT_COMMISSION;

      hubAgentCommissionId = await ctx.db.insert("commissions", {
        userId: args.hubAgentId,
        userRole: "agent",
        parcelId: args.parcelId,
        trackingCode: args.trackingCode,
        amount,
        status: "earned",
        createdAt: now,
      });
    }
  }

  return {
    riderCommissionId,
    hubAgentCommissionId,
  };
}

/**
 * Internal mutation wrapper for recordDeliveryCommission.
 */
export const recordCommission = internalMutation({
  args: {
    parcelId: v.id("parcels"),
    trackingCode: v.string(),
    riderId: v.optional(v.id("users")),
    hubAgentId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    return await recordDeliveryCommission(ctx, args);
  },
});
