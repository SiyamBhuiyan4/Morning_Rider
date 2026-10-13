import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireUser } from "./lib/auth";
import { getRates } from "./lib/parcel";

export const rates = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin", "merchant"]);
    return await getRates(ctx);
  },
});

/** Public price list for the home page — rates only, nothing private. */
export const publicRates = query({
  args: {},
  handler: async (ctx) => {
    const r = await getRates(ctx);
    return {
      uttara: r.uttara,
      dhakaCity: r.dhakaCity,
      gazipurCity: r.gazipurCity,
      narayanganjCity: r.narayanganjCity,
      extraPerKg: r.extraPerKg,
      extraPerKgOutside: r.extraPerKgOutside,
      codPercent: r.codPercent,
      codPercentOutside: r.codPercentOutside,
      returnPercent: r.returnPercent,
    };
  },
});

export const updateRates = mutation({
  args: {
    token: v.string(),
    uttara: v.number(),
    dhakaCity: v.number(),
    gazipurCity: v.number(),
    narayanganjCity: v.number(),
    extraPerKg: v.number(),
    extraPerKgOutside: v.number(),
    codPercent: v.number(),
    codPercentOutside: v.number(),
    returnPercent: v.number(),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const { token: _t, ...rates } = args;
    for (const [k, val] of Object.entries(rates)) {
      const max = k.endsWith("Percent") ? 100 : 5000;
      if (!Number.isFinite(val) || val < 0 || val > max) throw new ConvexError(`Each rate must be between 0 and ${max}.`);
    }
    const existing = await ctx.db.query("rates").first();
    const doc = { ...rates, updatedAt: Date.now() };
    if (existing) await ctx.db.replace("rates", existing._id, doc);
    else await ctx.db.insert("rates", doc);
    return null;
  },
});
