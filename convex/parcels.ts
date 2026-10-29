import { mutation, query, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Doc, Id } from "./_generated/dataModel";
import { clean, normalisePhone, required, requireUser } from "./lib/auth";
import {
  allowedMoves,
  changeStatus,
  computeCharges,
  countParcel,
  FINAL,
  getRates,
  logEvent,
  newTrackingCode,
  requireActiveRider,
  resolveRatesForMerchant,
  type Rates,
} from "./lib/parcel";
import { category, parcelStatus, zone } from "./schema";

const parcelInput = v.object({
  invoice: v.optional(v.string()),
  recipientName: v.string(),
  recipientPhone: v.string(),
  recipientAddress: v.string(),
  district: v.string(),
  zone,
  category: v.optional(category),
  weightKg: v.number(),
  codAmount: v.number(),
  itemDescription: v.optional(v.string()),
  note: v.optional(v.string()),
});
type ParcelInput = typeof parcelInput.type;

function validateInput(input: ParcelInput) {
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > 50) {
    throw new ConvexError("Weight must be between 0.1 and 50 kg.");
  }
  if (!Number.isFinite(input.codAmount) || input.codAmount < 0 || input.codAmount > 500_000) {
    throw new ConvexError("COD amount must be between 0 and 5,00,000 taka.");
  }
  return {
    invoice: clean(input.invoice, 60, "Invoice") || undefined,
    recipientName: required(input.recipientName, 80, "Customer name"),
    recipientPhone: normalisePhone(input.recipientPhone),
    recipientAddress: required(input.recipientAddress, 300, "Address"),
    district: required(input.district, 60, "Area"),
    zone: input.zone,
    category: input.category,
    weightKg: Math.round(input.weightKg * 10) / 10,
    codAmount: Math.round(input.codAmount),
    itemDescription: clean(input.itemDescription, 120, "Item description") || undefined,
    note: clean(input.note, 300, "Note") || undefined,
  };
}

function searchTextOf(p: { trackingCode: string; invoice?: string; recipientName: string; recipientPhone: string }) {
  return [p.trackingCode, p.invoice ?? "", p.recipientName, p.recipientPhone].join(" ");
}

export async function insertParcel(
  ctx: MutationCtx,
  rates: Rates,
  merchant: Doc<"users">,
  creator: Doc<"users">,
  raw: ParcelInput,
) {
  const input = validateInput(raw);
  const trackingCode = await newTrackingCode(ctx);
  const now = Date.now();
  const effectiveRates = resolveRatesForMerchant(rates, merchant.customRates);
  const doc = {
    ...input,
    trackingCode,
    merchantId: merchant._id,
    ...computeCharges(effectiveRates, input.zone, input.weightKg, input.codAmount),
    status: "pending" as const,
    collectedAmount: 0,
    settlement: "open" as const,
    cashState: "none" as const,
    searchText: searchTextOf({ ...input, trackingCode }),
    createdAt: now,
    updatedAt: now,
  };
  const id = await ctx.db.insert("parcels", doc);
  await countParcel(ctx, { ...doc, _id: id, _creationTime: now }, null, "pending");
  await logEvent(ctx, id, "pending", creator, "Parcel created");
  return { id, trackingCode };
}

async function resolveMerchant(ctx: MutationCtx, user: Doc<"users">, merchantId?: Id<"users">) {
  if (user.role === "merchant") {
    // Business verification gate (see verification.ts). Admins booking for a merchant are not blocked.
    if (user.verification !== "approved") throw new ConvexError("Verify your business before sending parcels.");
    return user;
  }
  if (!merchantId) throw new ConvexError("Choose a merchant.");
  const merchant = await ctx.db.get("users", merchantId);
  if (!merchant || merchant.role !== "merchant" || merchant.status !== "active") {
    throw new ConvexError("That merchant is not active.");
  }
  return merchant;
}

/* ------------------------------------------------------------------ reads */

export const quote = query({
  args: { token: v.string(), zone, weightKg: v.number(), codAmount: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    const weight = Number.isFinite(args.weightKg) && args.weightKg > 0 ? args.weightKg : 1;
    const cod = Number.isFinite(args.codAmount) && args.codAmount > 0 ? args.codAmount : 0;
    const baseRates = await getRates(ctx);
    const effectiveRates = user.role === "merchant" ? resolveRatesForMerchant(baseRates, user.customRates) : baseRates;
    return computeCharges(effectiveRates, args.zone, weight, cod);
  },
});

export const list = query({
  args: {
    token: v.string(),
    paginationOpts: paginationOptsValidator,
    status: v.optional(parcelStatus),
    merchantId: v.optional(v.id("users")),
    search: v.optional(v.string()),
    // Booking-date range: from inclusive, to exclusive.
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    const from = args.from ?? 0;
    const to = args.to ?? Number.MAX_SAFE_INTEGER;
    // A merchant only ever sees their own parcels, whatever they pass.
    const merchantId = user.role === "merchant" ? user._id : args.merchantId;
    const search = (args.search ?? "").trim().slice(0, 60);

    let page;
    if (search) {
      page = await ctx.db
        .query("parcels")
        .withSearchIndex("search_text", (q) => {
          const s = q.search("searchText", search);
          return merchantId ? s.eq("merchantId", merchantId) : s;
        })
        .filter((q) => q.and(q.gte(q.field("createdAt"), from), q.lt(q.field("createdAt"), to)))
        .paginate(args.paginationOpts);
    } else if (merchantId && args.status) {
      page = await ctx.db
        .query("parcels")
        .withIndex("by_merchantId_and_status_and_createdAt", (q) =>
          q.eq("merchantId", merchantId).eq("status", args.status!).gte("createdAt", from).lt("createdAt", to),
        )
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (merchantId) {
      page = await ctx.db
        .query("parcels")
        .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", merchantId).gte("createdAt", from).lt("createdAt", to))
        .order("desc")
        .paginate(args.paginationOpts);
    } else if (args.status) {
      page = await ctx.db
        .query("parcels")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", args.status!).gte("createdAt", from).lt("createdAt", to))
        .order("desc")
        .paginate(args.paginationOpts);
    } else {
      page = await ctx.db
        .query("parcels")
        .withIndex("by_createdAt", (q) => q.gte("createdAt", from).lt("createdAt", to))
        .order("desc")
        .paginate(args.paginationOpts);
    }

    const names = new Map<string, string>();
    const nameOf = async (id?: Id<"users">) => {
      if (!id) return undefined;
      if (!names.has(id)) {
        const u = await ctx.db.get("users", id);
        names.set(id, u ? (u.businessName ?? u.name) : "—");
      }
      return names.get(id);
    };
    return {
      ...page,
      page: await Promise.all(
        page.page.map(async (p) => ({
          ...strip(p),
          merchantName: user.role === "admin" ? await nameOf(p.merchantId) : undefined,
          riderName: await nameOf(p.deliveryRiderId ?? p.pickupRiderId),
        })),
      ),
    };
  },
});

/** Drops internal fields the client never needs. */
function strip(p: Doc<"parcels">) {
  const { searchText: _s, ...rest } = p;
  return rest;
}

export const get = query({
  args: { token: v.string(), id: v.id("parcels") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant", "rider"]);
    const p = await ctx.db.get("parcels", args.id);
    if (!p || !canSee(p, user)) return null;

    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcelId_and_at", (q) => q.eq("parcelId", p._id))
      .order("desc")
      .take(50);
    const merchant = await ctx.db.get("users", p.merchantId);
    const pickupRider = p.pickupRiderId ? await ctx.db.get("users", p.pickupRiderId) : null;
    const deliveryRider = p.deliveryRiderId ? await ctx.db.get("users", p.deliveryRiderId) : null;
    const person = (u: Doc<"users"> | null) => (u ? { name: u.name, phone: u.phone } : null);

    return {
      parcel: strip(p),
      events: events.map((e) => ({ status: e.status, note: e.note, at: e.at, byRole: e.byRole })),
      merchant: merchant && {
        name: merchant.name,
        businessName: merchant.businessName,
        phone: merchant.phone,
        pickupAddress: merchant.pickupAddress,
      },
      pickupRider: person(pickupRider),
      deliveryRider: person(deliveryRider),
      moves: allowedMoves(p, user),
      canEdit: canEdit(p, user),
    };
  },
});

export const getByTrackingCode = query({
  args: { token: v.string(), code: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant", "rider"]);
    const code = args.code.trim().toUpperCase();
    if (!code) return null;
    const p = await ctx.db
      .query("parcels")
      .withIndex("by_trackingCode", (q) => q.eq("trackingCode", code))
      .unique();
    if (!p || !canSee(p, user)) return null;

    const events = await ctx.db
      .query("parcelEvents")
      .withIndex("by_parcelId_and_at", (q) => q.eq("parcelId", p._id))
      .order("desc")
      .take(20);
    const merchant = await ctx.db.get("users", p.merchantId);
    const pickupRider = p.pickupRiderId ? await ctx.db.get("users", p.pickupRiderId) : null;
    const deliveryRider = p.deliveryRiderId ? await ctx.db.get("users", p.deliveryRiderId) : null;
    const person = (u: Doc<"users"> | null) => (u ? { name: u.name, phone: u.phone } : null);

    return {
      parcel: strip(p),
      events: events.map((e) => ({ status: e.status, note: e.note, at: e.at, byRole: e.byRole })),
      merchant: merchant && {
        name: merchant.name,
        businessName: merchant.businessName,
        phone: merchant.phone,
        pickupAddress: merchant.pickupAddress,
      },
      pickupRider: person(pickupRider),
      deliveryRider: person(deliveryRider),
      moves: allowedMoves(p, user),
      canEdit: canEdit(p, user),
    };
  },
});

function canSee(p: Doc<"parcels">, user: Doc<"users">) {
  if (user.role === "admin") return true;
  if (user.role === "merchant") return p.merchantId === user._id;
  // Riders only see a parcel (and the customer's phone) while it is theirs to work on.
  if (p.pickupRiderId === user._id && p.status === "pending") return true;
  return p.deliveryRiderId === user._id && (p.status === "out_for_delivery" || p.status === "hold");
}

function canEdit(p: Doc<"parcels">, user: Doc<"users">) {
  if (user.role === "admin") return !FINAL.includes(p.status);
  if (user.role === "merchant") return p.merchantId === user._id && p.status === "pending";
  return false;
}

/** Parcels for printing labels — same visibility rules as `get`. */
export const labels = query({
  args: { token: v.string(), ids: v.array(v.id("parcels")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    const out = [];
    for (const id of args.ids.slice(0, 100)) {
      const p = await ctx.db.get("parcels", id);
      if (!p || !canSee(p, user)) continue;
      const m = await ctx.db.get("users", p.merchantId);
      out.push({
        ...strip(p),
        merchantName: m?.businessName ?? m?.name ?? "",
        merchantPhone: m?.phone ?? "",
      });
    }
    return out;
  },
});

/**
 * Delivery history for a phone number across all merchants — counts only, so
 * a merchant learns how reliable a customer is without seeing anyone else's
 * orders.
 */
export const fraudCheck = query({
  args: { token: v.string(), phone: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    let phone: string;
    try {
      phone = normalisePhone(args.phone);
    } catch {
      return null;
    }
    const rows = await ctx.db
      .query("parcels")
      .withIndex("by_recipientPhone", (q) => q.eq("recipientPhone", phone))
      .order("desc")
      .take(500);
    const is = (r: Doc<"parcels">, s: Doc<"parcels">["status"][]) => s.includes(r.status);
    const delivered = rows.filter((r) => is(r, ["delivered"])).length;
    const partial = rows.filter((r) => is(r, ["partial_delivered"])).length;
    const returned = rows.filter((r) => is(r, ["returned", "returning"])).length;
    const cancelled = rows.filter((r) => is(r, ["cancelled"])).length;
    const decided = delivered + partial + returned;
    const inProgress = rows.length - decided - cancelled;

    // Money: what was asked on parcels that reached an end, what was paid, what was refused.
    let collected = 0;
    let refused = 0;
    for (const r of rows) {
      if (is(r, ["delivered", "partial_delivered"])) {
        collected += r.collectedAmount;
        refused += Math.max(0, r.codAmount - r.collectedAmount);
      } else if (is(r, ["returned", "returning"])) refused += r.codAmount;
    }

    const risk = riskScore(rows, { delivered, partial, returned, cancelled, inProgress });
    return {
      phone,
      total: rows.length,
      delivered: delivered + partial,
      partial,
      returned,
      cancelled,
      inProgress,
      successRate: decided ? Math.round(((delivered + partial) / decided) * 100) : null,
      collected,
      refused,
      mine: user.role === "merchant" ? rows.filter((r) => r.merchantId === user._id).length : null,
      merchants: new Set(rows.map((r) => r.merchantId)).size,
      firstOrderAt: rows.at(-1)?.createdAt ?? null,
      lastOrderAt: rows[0]?.createdAt ?? null,
      ...risk,
    };
  },
});

type RiskLevel = "low" | "medium" | "high";

/*
  Risk of a customer refusing the parcel, 0–100. Starts from the share of
  parcels they did not take (a partial delivery counts as half), smoothed
  towards 20% so one return out of one parcel doesn't read as 100%. Recent
  behaviour, cancellations and a pile of open orders nudge it up or down.
  Under 30 is low, 30–59 medium, 60+ high.
*/
function riskScore(
  rows: Doc<"parcels">[], // newest first
  c: { delivered: number; partial: number; returned: number; cancelled: number; inProgress: number },
) {
  const decided = c.delivered + c.partial + c.returned;
  // Each reason is an English sentence with {a}/{b} slots, so the app can translate it.
  const reasons: { text: string; a?: number; b?: number }[] = [];
  const say = (text: string, a?: number, b?: number) => reasons.push({ text, a, b });
  if (decided === 0) {
    let score = 30;
    say("New customer — no finished deliveries yet");
    if (c.cancelled >= 2) {
      score += 10;
      say("Several orders cancelled before pickup");
    }
    if (c.inProgress >= 3) {
      score += 10;
      say("Many open orders at once");
    }
    return { riskScore: score, riskLevel: (score >= 60 ? "high" : "medium") as RiskLevel, reasons, isNew: true };
  }

  const failures = c.returned + c.partial * 0.5;
  let score = ((failures + 0.6) / (decided + 3)) * 100;

  const recent = rows.filter((r) =>
    ["delivered", "partial_delivered", "returned", "returning"].includes(r.status),
  );
  const last3 = recent.slice(0, 3);
  const returnedRecently = last3.filter((r) => r.status === "returned" || r.status === "returning").length;
  if (last3.length >= 2 && returnedRecently >= 2) {
    score += 15;
    say("Refused most of their latest parcels");
  } else if (last3.length === 3 && returnedRecently === 0) {
    score -= 8;
    say("Took their last 3 parcels");
  }
  if (c.returned === 0) say("Never refused a parcel");
  else say("Refused {a} of {b} parcels", c.returned, decided);
  if (c.partial > 0) say("Paid only part on {a} parcels", c.partial);
  if (c.cancelled >= 2) {
    score += Math.min(10, c.cancelled * 2);
    say("Several orders cancelled before pickup");
  }
  if (c.inProgress >= 3) {
    score += 5;
    say("Many open orders at once");
  }
  if (decided >= 10 && c.returned / decided < 0.1) {
    score -= 5;
    say("Long, clean delivery record");
  }

  const riskScore = Math.max(3, Math.min(100, Math.round(score))); // nobody is risk-free
  const riskLevel: RiskLevel = riskScore >= 60 ? "high" : riskScore >= 30 ? "medium" : "low";
  return { riskScore, riskLevel, reasons, isNew: false };
}

/* --------------------------------------------------------------- writes */

export const create = mutation({
  args: { token: v.string(), merchantId: v.optional(v.id("users")), parcel: parcelInput },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    const merchant = await resolveMerchant(ctx, user, args.merchantId);
    return await insertParcel(ctx, await getRates(ctx), merchant, user, args.parcel);
  },
});

/** Bulk upload. All-or-nothing: one bad row and nothing is created. */
export const createMany = mutation({
  args: { token: v.string(), merchantId: v.optional(v.id("users")), parcels: v.array(parcelInput) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    if (args.parcels.length === 0) throw new ConvexError("The file has no parcels.");
    if (args.parcels.length > 200) throw new ConvexError("Upload at most 200 parcels at a time.");
    const merchant = await resolveMerchant(ctx, user, args.merchantId);
    const rates = await getRates(ctx);
    const created = [];
    for (let i = 0; i < args.parcels.length; i++) {
      try {
        created.push(await insertParcel(ctx, rates, merchant, user, args.parcels[i]));
      } catch (e) {
        const msg = e instanceof ConvexError ? String(e.data) : "invalid data";
        throw new ConvexError(`Row ${i + 2}: ${msg}`);
      }
    }
    return created;
  },
});

export const update = mutation({
  args: { token: v.string(), id: v.id("parcels"), parcel: parcelInput },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant"]);
    const p = await ctx.db.get("parcels", args.id);
    if (!p || !canSee(p, user)) throw new ConvexError("Parcel not found.");
    if (!canEdit(p, user)) throw new ConvexError("This parcel can no longer be edited.");
    const input = validateInput(args.parcel);
    await ctx.db.patch("parcels", p._id, {
      ...input,
      ...computeCharges(await getRates(ctx), input.zone, input.weightKg, input.codAmount),
      searchText: searchTextOf({ ...input, trackingCode: p.trackingCode }),
      updatedAt: Date.now(),
    });
    await logEvent(ctx, p._id, p.status, user, "Details edited");
    return null;
  },
});

export const updateStatus = mutation({
  args: {
    token: v.string(),
    id: v.id("parcels"),
    to: parcelStatus,
    note: v.optional(v.string()),
    collectedAmount: v.optional(v.number()),
    deliveryRiderId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant", "rider"]);
    const p = await ctx.db.get("parcels", args.id);
    if (!p || !canSee(p, user)) throw new ConvexError("Parcel not found.");
    await changeStatus(ctx, p, user, args.to, {
      note: clean(args.note, 300, "Note"),
      collectedAmount: args.collectedAmount,
      deliveryRiderId: user.role === "admin" ? args.deliveryRiderId : undefined,
    });
    return null;
  },
});

/** Admin: move many parcels at once (e.g. a whole pickup run reaching the hub). */
export const bulkUpdateStatus = mutation({
  args: {
    token: v.string(),
    ids: v.array(v.id("parcels")),
    to: parcelStatus,
    deliveryRiderId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin"]);
    if (args.ids.length > 200) throw new ConvexError("Select at most 200 parcels.");
    if (args.to === "partial_delivered") throw new ConvexError("Partial delivery must be done one by one.");
    let done = 0;
    const skipped: string[] = [];
    for (const id of args.ids) {
      const p = await ctx.db.get("parcels", id);
      if (!p) continue;
      if (!allowedMoves(p, user).includes(args.to)) {
        skipped.push(p.trackingCode);
        continue;
      }
      await changeStatus(ctx, p, user, args.to, { deliveryRiderId: args.deliveryRiderId });
      done++;
    }
    return { done, skipped };
  },
});

/** Admin: give a rider the pickup for these pending parcels. */
export const assignPickup = mutation({
  args: { token: v.string(), ids: v.array(v.id("parcels")), riderId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin"]);
    const rider = await requireActiveRider(ctx, args.riderId);
    let done = 0;
    for (const id of args.ids.slice(0, 200)) {
      const p = await ctx.db.get("parcels", id);
      if (!p || p.status !== "pending") continue;
      await ctx.db.patch("parcels", p._id, { pickupRiderId: rider._id, updatedAt: Date.now() });
      await logEvent(ctx, p._id, "pending", user, `Pickup assigned to ${rider.name}`);
      done++;
    }
    return { done };
  },
});
