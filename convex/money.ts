import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { clean, requireUser } from "./lib/auth";
import { merchantNet } from "./lib/parcel";
import { payoutMethod } from "./schema";

/*
  Two flows of money:

  1. COD cash: a rider collects it at the door (`cashState: with_rider`) and
     hands it to the office, where an admin marks it received (`deposited`).
  2. Merchant payouts: every final parcel is `unpaid` until an admin pays the
     merchant their net (collected − delivery − COD charge, or −return charge
     for a returned parcel). Paying marks those parcels `paid`.
*/

function totals(parcels: Doc<"parcels">[]) {
  let collected = 0;
  let charges = 0;
  for (const p of parcels) {
    collected += p.collectedAmount;
    charges += p.collectedAmount - merchantNet(p);
  }
  return { count: parcels.length, collected, charges, net: collected - charges };
}

async function unpaidFor(ctx: Parameters<typeof requireUser>[0], merchantId: Id<"users">) {
  return await ctx.db
    .query("parcels")
    .withIndex("by_merchantId_and_settlement", (q) => q.eq("merchantId", merchantId).eq("settlement", "unpaid"))
    .take(2000);
}

/** Admin: what is owed to each merchant right now. */
export const balances = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const unpaid = await ctx.db
      .query("parcels")
      .withIndex("by_settlement", (q) => q.eq("settlement", "unpaid"))
      .take(8000);
    const byMerchant = new Map<Id<"users">, Doc<"parcels">[]>();
    for (const p of unpaid) {
      const list = byMerchant.get(p.merchantId) ?? [];
      list.push(p);
      byMerchant.set(p.merchantId, list);
    }
    const rows = [];
    for (const [merchantId, list] of byMerchant) {
      const m = await ctx.db.get("users", merchantId);
      rows.push({
        merchantId,
        merchantName: m?.businessName ?? m?.name ?? "—",
        phone: m?.phone ?? "",
        payoutMethod: m?.payoutMethod,
        payoutAccount: m?.payoutAccount,
        ...totals(list),
      });
    }
    return rows.sort((a, b) => b.net - a.net);
  },
});

/** Unpaid parcels for one merchant. Merchants get their own; admins pass an id. */
export const statement = query({
  args: { token: v.string(), merchantId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    const merchantId = user.role === "merchant" ? user._id : args.merchantId;
    if (!merchantId) throw new ConvexError("Choose a merchant.");
    const list = await unpaidFor(ctx, merchantId);
    return {
      ...totals(list),
      parcels: list
        .sort((a, b) => (b.finalAt ?? 0) - (a.finalAt ?? 0))
        .map((p) => ({
          _id: p._id,
          trackingCode: p.trackingCode,
          invoice: p.invoice,
          recipientName: p.recipientName,
          status: p.status,
          codAmount: p.codAmount,
          collectedAmount: p.collectedAmount,
          deliveryCharge: p.status === "returned" ? p.returnCharge : p.deliveryCharge,
          codCharge: p.codCharge,
          net: merchantNet(p),
          finalAt: p.finalAt,
        })),
    };
  },
});

export const createPayout = mutation({
  args: {
    token: v.string(),
    merchantId: v.id("users"),
    method: payoutMethod,
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
    expectedAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireUser(ctx, args.token, ["admin"]);
    const merchant = await ctx.db.get("users", args.merchantId);
    if (!merchant || merchant.role !== "merchant") throw new ConvexError("Merchant not found.");
    const list = await unpaidFor(ctx, merchant._id);
    const t = totals(list);
    if (t.count === 0) throw new ConvexError("Nothing to pay for this merchant.");
    /*
      The admin confirmed a specific amount on screen. If a parcel was
      delivered in the meantime the total moved — refuse rather than pay a
      figure nobody looked at.
    */
    if (t.net !== args.expectedAmount) {
      throw new ConvexError(`The balance changed to ৳${t.net}. Review it and confirm again.`);
    }
    const payoutId = await ctx.db.insert("payouts", {
      merchantId: merchant._id,
      amount: t.net,
      parcelCount: t.count,
      collected: t.collected,
      charges: t.charges,
      method: args.method,
      payoutAccount: merchant.payoutAccount,
      reference: clean(args.reference, 100, "Reference") || undefined,
      note: clean(args.note, 300, "Note") || undefined,
      createdBy: admin._id,
      createdAt: Date.now(),
    });
    for (const p of list) await ctx.db.patch("parcels", p._id, { settlement: "paid", payoutId });
    return payoutId;
  },
});

export const payouts = query({
  args: { token: v.string(), merchantId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    const merchantId = user.role === "merchant" ? user._id : args.merchantId;
    const rows = merchantId
      ? await ctx.db
          .query("payouts")
          .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", merchantId))
          .order("desc")
          .take(200)
      : await ctx.db.query("payouts").withIndex("by_createdAt").order("desc").take(200);
    return await Promise.all(
      rows.map(async (r) => {
        const m = await ctx.db.get("users", r.merchantId);
        return { ...r, merchantName: m?.businessName ?? m?.name ?? "—" };
      }),
    );
  },
});

/** One payout with its parcels — the invoice view. */
export const payout = query({
  args: { token: v.string(), id: v.id("payouts") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    const payout = await ctx.db.get("payouts", args.id);
    if (!payout) return null;
    if (user.role === "merchant" && payout.merchantId !== user._id) return null;
    const merchant = await ctx.db.get("users", payout.merchantId);
    const parcels = await ctx.db
      .query("parcels")
      .withIndex("by_payoutId", (q) => q.eq("payoutId", payout._id))
      .take(2000);
    return {
      payout,
      merchant: merchant && {
        name: merchant.name,
        businessName: merchant.businessName,
        phone: merchant.phone,
        payoutAccount: payout.payoutAccount ?? merchant.payoutAccount,
      },
      parcels: parcels.map((p) => ({
        trackingCode: p.trackingCode,
        invoice: p.invoice,
        recipientName: p.recipientName,
        status: p.status,
        collectedAmount: p.collectedAmount,
        deliveryCharge: p.status === "returned" ? p.returnCharge : p.deliveryCharge,
        codCharge: p.codCharge,
        net: merchantNet(p),
      })),
    };
  },
});

/* ------------------------------------------------------------ rider cash */

async function cashWith(ctx: Parameters<typeof requireUser>[0], riderId: Id<"users">) {
  return await ctx.db
    .query("parcels")
    .withIndex("by_deliveryRiderId_and_cashState", (q) =>
      q.eq("deliveryRiderId", riderId).eq("cashState", "with_rider"),
    )
    .take(1000);
}

/** Cash a rider is holding. Riders see their own; admins pass an id. */
export const riderCash = query({
  args: { token: v.string(), riderId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "rider"]);
    const riderId = user.role === "rider" ? user._id : args.riderId;
    if (!riderId) throw new ConvexError("Choose a rider.");
    const parcels = await cashWith(ctx, riderId);
    const deposits = await ctx.db
      .query("cashDeposits")
      .withIndex("by_riderId_and_createdAt", (q) => q.eq("riderId", riderId))
      .order("desc")
      .take(30);
    return {
      total: parcels.reduce((s, p) => s + p.collectedAmount, 0),
      parcels: parcels.map((p) => ({
        _id: p._id,
        trackingCode: p.trackingCode,
        recipientName: p.recipientName,
        collectedAmount: p.collectedAmount,
        finalAt: p.finalAt,
      })),
      deposits,
    };
  },
});

export const receiveCash = mutation({
  args: { token: v.string(), riderId: v.id("users"), expectedAmount: v.number() },
  handler: async (ctx, args) => {
    const admin = await requireUser(ctx, args.token, ["admin"]);
    const parcels = await cashWith(ctx, args.riderId);
    const amount = parcels.reduce((s, p) => s + p.collectedAmount, 0);
    if (parcels.length === 0) throw new ConvexError("This rider has no cash to hand over.");
    if (amount !== args.expectedAmount) {
      throw new ConvexError(`The amount changed to ৳${amount}. Review it and confirm again.`);
    }
    for (const p of parcels) await ctx.db.patch("parcels", p._id, { cashState: "deposited" });
    await ctx.db.insert("cashDeposits", {
      riderId: args.riderId,
      amount,
      parcelCount: parcels.length,
      receivedBy: admin._id,
      createdAt: Date.now(),
    });
    return { amount };
  },
});
