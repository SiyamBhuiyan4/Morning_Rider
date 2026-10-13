import { query } from "./_generated/server";
import { v } from "convex/values";
import { currentUser } from "./lib/auth";

/*
  Parcel tracking — signed-in only (Siyam's rule): a merchant can track only
  their own parcels, a rider only parcels assigned to them, an admin any.
  Anyone else gets "not found", exactly as for a code that doesn't exist, so
  the page never confirms whether someone else's code is real.
*/
export const byCode = query({
  args: { token: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx, args.token);
    if (!user) return { signedIn: false as const };

    const code = args.code.trim().toUpperCase().slice(0, 20);
    if (!/^MR[A-Z0-9]{8}$/.test(code)) return { signedIn: true as const, parcel: null };
    const p = await ctx.db
      .query("parcels")
      .withIndex("by_trackingCode", (q) => q.eq("trackingCode", code))
      .unique();
    const allowed =
      p &&
      (user.role === "admin" ||
        (user.role === "merchant" && p.merchantId === user._id) ||
        (user.role === "rider" && (p.pickupRiderId === user._id || p.deliveryRiderId === user._id)));
    if (!p || !allowed) return { signedIn: true as const, parcel: null };

    const merchant = await ctx.db.get("users", p.merchantId);
    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcelId_and_at", (q) => q.eq("parcelId", p._id))
      .order("desc")
      .take(30);
    // Only status changes, not internal notes like "Details edited".
    const seen = new Set<string>();
    const timeline = [];
    for (const e of [...events].reverse()) {
      if (seen.has(e.status)) continue;
      seen.add(e.status);
      timeline.push({ status: e.status, at: e.at });
    }
    return {
      signedIn: true as const,
      parcel: {
        trackingCode: p.trackingCode,
        status: p.status,
        merchantName: merchant?.businessName ?? "",
        recipientName: p.recipientName,
        area: p.district,
        zone: p.zone,
        category: p.category,
        codAmount: p.status === "delivered" || p.status === "partial_delivered" ? p.collectedAmount : p.codAmount,
        createdAt: p.createdAt,
        timeline: timeline.reverse(),
      },
    };
  },
});
