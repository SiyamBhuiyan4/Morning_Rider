import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";
import { merchantNet } from "./lib/parcel";

/*
  `dayStart` is the start of "today" in the viewer's timezone, passed in by
  the client: a query must not read the wall clock, or it would never
  refresh when the day rolls over.
*/

async function statusCounts(ctx: Parameters<typeof requireUser>[0], scope: string) {
  const rows = await ctx.db
    .query("statusCounts")
    .withIndex("by_scope_and_status", (q) => q.eq("scope", scope))
    .take(20);
  const out: Partial<Record<Doc<"parcels">["status"], number>> = {};
  for (const r of rows) out[r.status] = r.count;
  return out;
}

function lastDays(parcels: Doc<"parcels">[], dayStart: number, days: number) {
  const DAY = 86_400_000;
  const buckets = Array.from({ length: days }, (_, i) => ({
    day: dayStart - (days - 1 - i) * DAY,
    created: 0,
    delivered: 0,
  }));
  for (const p of parcels) {
    const idx = Math.floor((p.createdAt - buckets[0].day) / DAY);
    if (idx >= 0 && idx < days) buckets[idx].created++;
    if (p.finalAt && (p.status === "delivered" || p.status === "partial_delivered")) {
      const d = Math.floor((p.finalAt - buckets[0].day) / DAY);
      if (d >= 0 && d < days) buckets[d].delivered++;
    }
  }
  return buckets;
}

export const admin = query({
  args: { token: v.string(), dayStart: v.number() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const DAY = 86_400_000;
    const recent = await ctx.db
      .query("parcels")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", args.dayStart - 13 * DAY))
      .take(10000);
    const today = recent.filter((p) => p.createdAt >= args.dayStart);
    const withRiders = await ctx.db
      .query("parcels")
      .withIndex("by_cashState", (q) => q.eq("cashState", "with_rider"))
      .take(8000);
    const unpaid = await ctx.db
      .query("parcels")
      .withIndex("by_settlement", (q) => q.eq("settlement", "unpaid"))
      .take(8000);
    const pendingMerchants = await ctx.db
      .query("users")
      .withIndex("by_role_and_status", (q) => q.eq("role", "merchant").eq("status", "pending"))
      .take(100);
    // Morning Rider's own earnings: delivery + COD charges (or return charge) on parcels closed today.
    const closedToday = await ctx.db
      .query("parcels")
      .withIndex("by_finalAt", (q) => q.gte("finalAt", args.dayStart))
      .take(8000);
    const revenue = closedToday.reduce((s, p) => s + (p.collectedAmount - merchantNet(p)), 0);

    const payoutRequests = await ctx.db
      .query("payoutRequests")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "open"))
      .take(100);
    return {
      openPayoutRequests: payoutRequests.length,
      counts: await statusCounts(ctx, "all"),
      todayCreated: today.length,
      todayCod: today.reduce((s, p) => s + p.codAmount, 0),
      todayRevenue: revenue,
      cashWithRiders: withRiders.reduce((s, p) => s + p.collectedAmount, 0),
      payableToMerchants: unpaid.reduce((s, p) => s + merchantNet(p), 0),
      pendingMerchants: pendingMerchants.length,
      trend: lastDays(recent, args.dayStart, 14),
    };
  },
});

export const merchant = query({
  args: { token: v.string(), dayStart: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["merchant"]);
    const DAY = 86_400_000;
    const recent = await ctx.db
      .query("parcels")
      .withIndex("by_merchantId_and_createdAt", (q) =>
        q.eq("merchantId", user._id).gte("createdAt", args.dayStart - 13 * DAY),
      )
      .take(5000);
    const unpaid = await ctx.db
      .query("parcels")
      .withIndex("by_merchantId_and_settlement", (q) => q.eq("merchantId", user._id).eq("settlement", "unpaid"))
      .take(2000);
    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", user._id))
      .order("desc")
      .take(500);

    return {
      counts: await statusCounts(ctx, user._id),
      todayCreated: recent.filter((p) => p.createdAt >= args.dayStart).length,
      balance: unpaid.reduce((s, p) => s + merchantNet(p), 0),
      totalPaid: payouts.reduce((s, p) => s + p.amount, 0),
      lastPayout: payouts[0] ? { amount: payouts[0].amount, at: payouts[0].createdAt } : null,
      trend: lastDays(recent, args.dayStart, 14),
    };
  },
});
