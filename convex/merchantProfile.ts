import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUser } from "./lib/auth";
import { merchantNet } from "./lib/parcel";

/*
  Everything the office needs about one merchant on one screen: contact
  details, how many parcels they sent and how those ended, what Morning Rider
  earned from them, what was paid out, and the balance right now (positive =
  we owe them, negative = they owe us). Admin only.
*/
export const get = query({
  args: { token: v.string(), merchantId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const m = await ctx.db.get("users", args.merchantId);
    if (!m || m.role !== "merchant") return null;

    const parcels = await ctx.db
      .query("parcels")
      .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", m._id))
      .order("desc")
      .take(5000);

    let delivered = 0;
    let partial = 0;
    let returned = 0;
    let cancelled = 0;
    let inProgress = 0;
    let codCollected = 0;
    let deliveryEarned = 0;
    let codEarned = 0;
    let returnEarned = 0;
    let balance = 0;
    let unpaidCount = 0;
    // Start of this month in Dhaka time (UTC+6, no daylight saving).
    const DHAKA = 6 * 3_600_000;
    const dhakaNow = new Date(Date.now() + DHAKA);
    const monthStart = Date.UTC(dhakaNow.getUTCFullYear(), dhakaNow.getUTCMonth(), 1) - DHAKA;
    let earnedThisMonth = 0;

    for (const p of parcels) {
      let earned = 0;
      if (p.status === "delivered" || p.status === "partial_delivered") {
        if (p.status === "delivered") delivered++;
        else partial++;
        codCollected += p.collectedAmount;
        deliveryEarned += p.deliveryCharge;
        codEarned += p.codCharge;
        earned = p.deliveryCharge + p.codCharge;
      } else if (p.status === "returned") {
        returned++;
        returnEarned += p.returnCharge;
        earned = p.returnCharge;
      } else if (p.status === "cancelled") cancelled++;
      else inProgress++;
      if ((p.finalAt ?? 0) >= monthStart) earnedThisMonth += earned;
      if (p.settlement === "unpaid") {
        balance += merchantNet(p);
        unpaidCount++;
      }
    }

    const payouts = await ctx.db
      .query("payouts")
      .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", m._id))
      .order("desc")
      .take(500);
    const openRequest = await ctx.db
      .query("payoutRequests")
      .withIndex("by_merchantId_and_status", (q) => q.eq("merchantId", m._id).eq("status", "open"))
      .first();

    const finished = delivered + partial + returned;
    return {
      merchant: {
        _id: m._id,
        name: m.name,
        businessName: m.businessName,
        phone: m.phone,
        email: m.email,
        pickupAddress: m.pickupAddress,
        payoutMethod: m.payoutMethod,
        payoutAccount: m.payoutAccount,
        status: m.status,
        verification: m.verification,
        demo: m.demo,
        createdAt: m.createdAt,
      },
      counts: {
        total: parcels.length,
        delivered: delivered + partial,
        partial,
        returned,
        cancelled,
        inProgress,
        successRate: finished ? Math.round(((delivered + partial) / finished) * 100) : null,
      },
      money: {
        earned: deliveryEarned + codEarned + returnEarned,
        deliveryEarned,
        codEarned,
        returnEarned,
        earnedThisMonth,
        codCollected,
        paidOut: payouts.reduce((s, p) => s + p.amount, 0),
        payoutCount: payouts.length,
        balance,
        unpaidCount,
      },
      openRequest: openRequest ? { amount: openRequest.amount, createdAt: openRequest.createdAt } : null,
      lastOrderAt: parcels[0]?.createdAt ?? null,
      recentParcels: parcels.slice(0, 8).map((p) => ({
        _id: p._id,
        trackingCode: p.trackingCode,
        recipientName: p.recipientName,
        status: p.status,
        codAmount: p.codAmount,
        createdAt: p.createdAt,
      })),
      recentPayouts: payouts.slice(0, 5).map((p) => ({
        _id: p._id,
        amount: p.amount,
        parcelCount: p.parcelCount,
        method: p.method,
        createdAt: p.createdAt,
      })),
    };
  },
});
