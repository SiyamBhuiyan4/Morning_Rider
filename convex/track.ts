import { query } from "./_generated/server";
import { v } from "convex/values";

/*
  Public parcel tracking — no sign-in. Tracking codes are random (MR + 8
  characters from a 32-letter alphabet), so they cannot be enumerated, and
  even so this returns only what a customer needs: no full phone numbers,
  no address, no money beyond the amount to pay.
*/
export const byCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase().slice(0, 20);
    if (!/^MR[A-Z0-9]{8}$/.test(code)) return null;
    const p = await ctx.db
      .query("parcels")
      .withIndex("by_trackingCode", (q) => q.eq("trackingCode", code))
      .unique();
    if (!p) return null;
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
      trackingCode: p.trackingCode,
      status: p.status,
      merchantName: merchant?.businessName ?? "",
      recipientName: p.recipientName.split(" ")[0],
      district: p.district,
      codAmount: p.status === "delivered" || p.status === "partial_delivered" ? p.collectedAmount : p.codAmount,
      createdAt: p.createdAt,
      timeline: timeline.reverse(),
    };
  },
});
