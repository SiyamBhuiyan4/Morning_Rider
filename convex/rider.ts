import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";

/** Everything a rider needs on their phone: pickups to collect and parcels to deliver. */
export const tasks = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const rider = await requireUser(ctx, args.token, ["rider"]);

    const pickups = await ctx.db
      .query("parcels")
      .withIndex("by_pickupRiderId_and_status", (q) => q.eq("pickupRiderId", rider._id).eq("status", "pending"))
      .take(300);
    const delivering = await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_status", (q) =>
        q.eq("deliveryRiderId", rider._id).eq("status", "out_for_delivery"),
      )
      .take(300);
    const onHold = await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_status", (q) => q.eq("deliveryRiderId", rider._id).eq("status", "hold"))
      .take(300);
    const cash = await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_cashState", (q) =>
        q.eq("deliveryRiderId", rider._id).eq("cashState", "with_rider"),
      )
      .take(1000);

    // Group pickups by merchant: one stop per shop.
    const stops = new Map<Id<"users">, Doc<"parcels">[]>();
    for (const p of pickups) stops.set(p.merchantId, [...(stops.get(p.merchantId) ?? []), p]);
    const pickupStops = [];
    for (const [merchantId, list] of stops) {
      const m = await ctx.db.get("users", merchantId);
      pickupStops.push({
        merchantName: m?.businessName ?? m?.name ?? "—",
        merchantPhone: m?.phone ?? "",
        pickupAddress: m?.pickupAddress ?? "",
        parcels: list.map((p) => ({ _id: p._id, trackingCode: p.trackingCode, weightKg: p.weightKg })),
      });
    }

    const card = (p: Doc<"parcels">) => ({
      _id: p._id,
      trackingCode: p.trackingCode,
      status: p.status,
      recipientName: p.recipientName,
      recipientPhone: p.recipientPhone,
      recipientAddress: p.recipientAddress,
      district: p.district,
      codAmount: p.codAmount,
      itemDescription: p.itemDescription,
      note: p.note,
    });

    return {
      pickupStops,
      deliveries: delivering.map(card),
      onHold: onHold.map(card),
      cashInHand: cash.reduce((s, p) => s + p.collectedAmount, 0),
      cashParcels: cash.length,
    };
  },
});
