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
    if (events.length === 0) return [];

    // Parallel fetch parcel docs in a single round-trip
    const parcels = await Promise.all(events.map((e) => ctx.db.get("parcels", e.parcelId)));

    // Collect distinct user IDs to fetch in parallel
    const userIds = new Set<Id<"users">>();
    for (let i = 0; i < events.length; i++) {
      const p = parcels[i];
      if (!p) continue;
      if (p.merchantId) userIds.add(p.merchantId);
      if (events[i].byUserId) userIds.add(events[i].byUserId!);
    }

    const uniqueIds = [...userIds];
    const userDocs = await Promise.all(uniqueIds.map((id) => ctx.db.get("users", id)));
    const userMap = new Map<Id<"users">, Doc<"users"> | null>();
    uniqueIds.forEach((id, idx) => userMap.set(id, userDocs[idx]));

    const out = [];
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const p = parcels[i];
      if (!p) continue;
      const merchant = p.merchantId ? userMap.get(p.merchantId) : null;
      const by = e.byUserId ? userMap.get(e.byUserId) : null;
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

    // Aggregates active rider metrics in 4 indexed queries across active parcels
    // instead of querying 4 subqueries per rider (which caused up to 800+ queries).
    const [delivering, pickups, deliveredToday, cashParcels] = await Promise.all([
      ctx.db
        .query("parcels")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", "out_for_delivery"))
        .take(300),
      ctx.db
        .query("parcels")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", "pending"))
        .take(300),
      ctx.db
        .query("parcels")
        .withIndex("by_finalAt", (q) => q.gte("finalAt", args.dayStart))
        .take(500),
      ctx.db
        .query("parcels")
        .withIndex("by_cashState", (q) => q.eq("cashState", "with_rider"))
        .take(500),
    ]);

    type RiderAgg = {
      delivering: number;
      pickups: number;
      deliveredToday: number;
      cashInHand: number;
      nextStop: string | null;
    };
    const agg = new Map<Id<"users">, RiderAgg>();
    const getAgg = (id: Id<"users">): RiderAgg => {
      let r = agg.get(id);
      if (!r) {
        r = { delivering: 0, pickups: 0, deliveredToday: 0, cashInHand: 0, nextStop: null };
        agg.set(id, r);
      }
      return r;
    };

    for (const p of delivering) {
      if (!p.deliveryRiderId) continue;
      const s = getAgg(p.deliveryRiderId);
      s.delivering++;
      if (!s.nextStop && p.district) s.nextStop = p.district;
    }

    for (const p of pickups) {
      if (!p.pickupRiderId) continue;
      const s = getAgg(p.pickupRiderId);
      s.pickups++;
      if (!s.nextStop && p.district) s.nextStop = p.district;
    }

    for (const p of deliveredToday) {
      if ((p.status === "delivered" || p.status === "partial_delivered") && p.deliveryRiderId) {
        getAgg(p.deliveryRiderId).deliveredToday++;
      }
    }

    for (const p of cashParcels) {
      if (p.deliveryRiderId) {
        getAgg(p.deliveryRiderId).cashInHand += p.collectedAmount;
      }
    }

    // Only fetch user documents for active riders who have tasks
    const activeRiderIds = [...agg.keys()].filter((id) => {
      const s = agg.get(id)!;
      return s.delivering + s.pickups > 0 || s.deliveredToday > 0;
    });

    const riderDocs = await Promise.all(activeRiderIds.map((id) => ctx.db.get("users", id)));

    const rows = [];
    for (let i = 0; i < activeRiderIds.length; i++) {
      const r = riderDocs[i];
      if (!r || r.role !== "rider" || r.status !== "active") continue;
      const s = agg.get(activeRiderIds[i])!;
      rows.push({
        _id: r._id,
        name: r.name,
        area: r.riderArea,
        delivering: s.delivering,
        pickups: s.pickups,
        deliveredToday: s.deliveredToday,
        cashInHand: s.cashInHand,
        nextStop: s.nextStop,
      });
    }

    rows.sort((a, b) => b.delivering + b.pickups - (a.delivering + a.pickups));
    return { total: rows.length, rows: rows.slice(0, 6) };
  },
});
