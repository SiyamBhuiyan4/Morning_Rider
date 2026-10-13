import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";

/*
  The admin dashboard's live panels. Convex pushes every change to these
  queries straight away, so the feed and the riders' board update on their
  own the moment anything happens anywhere.
*/

/** The latest things that happened to parcels, newest first. */
export const feed = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const events = await ctx.db.query("parcelEvents").withIndex("by_at").order("desc").take(14);
    const users = new Map<Id<"users">, Doc<"users"> | null>();
    const user = async (id: Id<"users"> | undefined) => {
      if (!id) return null;
      if (!users.has(id)) users.set(id, await ctx.db.get("users", id));
      return users.get(id) ?? null;
    };
    const out = [];
    for (const e of events) {
      const p = await ctx.db.get("parcels", e.parcelId);
      if (!p) continue;
      const merchant = await user(p.merchantId);
      const by = await user(e.byUserId);
      out.push({
        _id: e._id,
        parcelId: p._id,
        status: e.status,
        note: e.note,
        at: e.at,
        trackingCode: p.trackingCode,
        area: p.district,
        codAmount: p.codAmount,
        collectedAmount: p.collectedAmount,
        merchantName: merchant?.businessName ?? merchant?.name ?? "",
        byRole: e.byRole,
        byName: by ? (by.role === "merchant" ? (by.businessName ?? by.name) : by.role === "admin" ? "" : by.name) : "",
      });
    }
    return out;
  },
});

/** Riders who are working right now: what they're carrying and what they've done today. */
export const road = query({
  args: { token: v.string(), dayStart: v.number() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const riders = await ctx.db
      .query("users")
      .withIndex("by_role_and_status", (q) => q.eq("role", "rider").eq("status", "active"))
      .take(200);
    const rows = [];
    for (const r of riders) {
      const delivering = await ctx.db
        .query("parcels")
        .withIndex("by_deliveryRiderId_and_status", (q) => q.eq("deliveryRiderId", r._id).eq("status", "out_for_delivery"))
        .take(100);
      const pickups = await ctx.db
        .query("parcels")
        .withIndex("by_pickupRiderId_and_status", (q) => q.eq("pickupRiderId", r._id).eq("status", "pending"))
        .take(100);
      const deliveredToday = (
        await ctx.db
          .query("parcels")
          .withIndex("by_deliveryRiderId_and_status", (q) => q.eq("deliveryRiderId", r._id).eq("status", "delivered"))
          .order("desc")
          .take(300)
      ).filter((p) => (p.finalAt ?? 0) >= args.dayStart).length;
      const cash = await ctx.db
        .query("parcels")
        .withIndex("by_deliveryRiderId_and_cashState", (q) => q.eq("deliveryRiderId", r._id).eq("cashState", "with_rider"))
        .take(500);
      if (delivering.length + pickups.length === 0 && deliveredToday === 0) continue;
      rows.push({
        _id: r._id,
        name: r.name,
        area: r.riderArea,
        delivering: delivering.length,
        pickups: pickups.length,
        deliveredToday,
        cashInHand: cash.reduce((s, p) => s + p.collectedAmount, 0),
        nextStop: delivering[0]?.district ?? pickups[0]?.district ?? null,
      });
    }
    rows.sort((a, b) => b.delivering + b.pickups - (a.delivering + a.pickups));
    return { total: rows.length, rows: rows.slice(0, 6) };
  },
});
