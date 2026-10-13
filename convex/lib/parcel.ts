import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { Role } from "./auth";

export type Status = Doc<"parcels">["status"];
export type Zone = Doc<"parcels">["zone"];
export type Rates = Omit<Doc<"rates">, "_id" | "_creationTime">;

/* Starting prices until the admin sets real ones in Delivery rates. */
export const DEFAULT_RATES: Rates = {
  uttara: 60,
  dhakaCity: 70,
  gazipurCity: 80,
  narayanganjCity: 90,
  extraPerKg: 15,
  codPercent: 1,
  returnPercent: 50,
  updatedAt: 0,
};

export function zoneBase(rates: Rates, zone: Zone) {
  switch (zone) {
    case "uttara":
      return rates.uttara;
    case "gazipur_city":
      return rates.gazipurCity;
    case "narayanganj_city":
      return rates.narayanganjCity;
    case "dhaka_city":
      return rates.dhakaCity;
  }
}

export async function getRates(ctx: QueryCtx | MutationCtx): Promise<Rates> {
  const row = await ctx.db.query("rates").first();
  return row ?? DEFAULT_RATES;
}

/** All money is whole taka. */
export function computeCharges(rates: Rates, zone: Zone, weightKg: number, codAmount: number) {
  const extraKg = Math.max(0, Math.ceil(weightKg - 1));
  const deliveryCharge = zoneBase(rates, zone) + extraKg * rates.extraPerKg;
  return {
    deliveryCharge,
    codCharge: codCharge(rates, codAmount),
    returnCharge: Math.round((deliveryCharge * rates.returnPercent) / 100),
  };
}

export function codCharge(rates: Rates, amount: number) {
  return Math.round((amount * rates.codPercent) / 100);
}

/** What the merchant is owed (positive) or owes (negative) for a final parcel. */
export function merchantNet(p: Doc<"parcels">) {
  if (p.status === "returned") return -p.returnCharge;
  if (p.status === "delivered" || p.status === "partial_delivered") {
    return p.collectedAmount - p.deliveryCharge - p.codCharge;
  }
  return 0;
}

/*
  Allowed moves. Final states (delivered, partial_delivered, returned,
  cancelled) have no way out — money has been settled against them.
*/
const ADMIN_MOVES: Record<Status, Status[]> = {
  pending: ["picked_up", "cancelled"],
  picked_up: ["at_hub", "returning"],
  at_hub: ["out_for_delivery", "hold", "returning"],
  out_for_delivery: ["delivered", "partial_delivered", "hold", "returning", "at_hub"],
  hold: ["out_for_delivery", "at_hub", "returning"],
  returning: ["returned", "at_hub"],
  delivered: [],
  partial_delivered: [],
  returned: [],
  cancelled: [],
};

const RIDER_DELIVERY_MOVES: Partial<Record<Status, Status[]>> = {
  out_for_delivery: ["delivered", "partial_delivered", "hold", "returning"],
  hold: ["out_for_delivery"],
};

export function allowedMoves(p: Doc<"parcels">, user: Doc<"users">): Status[] {
  if (user.role === "admin") return ADMIN_MOVES[p.status];
  if (user.role === "merchant") {
    return p.merchantId === user._id && p.status === "pending" ? ["cancelled"] : [];
  }
  // rider
  const moves: Status[] = [];
  if (p.status === "pending" && p.pickupRiderId === user._id) moves.push("picked_up");
  if (p.deliveryRiderId === user._id) moves.push(...(RIDER_DELIVERY_MOVES[p.status] ?? []));
  return moves;
}

export const FINAL: Status[] = ["delivered", "partial_delivered", "returned", "cancelled"];

async function bump(ctx: MutationCtx, scope: string, status: Status, delta: number) {
  const row = await ctx.db
    .query("statusCounts")
    .withIndex("by_scope_and_status", (q) => q.eq("scope", scope).eq("status", status))
    .unique();
  if (row) await ctx.db.patch("statusCounts", row._id, { count: Math.max(0, row.count + delta) });
  else if (delta > 0) await ctx.db.insert("statusCounts", { scope, status, count: delta });
}

export async function countParcel(ctx: MutationCtx, p: Doc<"parcels">, from: Status | null, to: Status) {
  for (const scope of ["all", p.merchantId as string]) {
    if (from) await bump(ctx, scope, from, -1);
    await bump(ctx, scope, to, 1);
  }
}

export async function logEvent(
  ctx: MutationCtx,
  parcelId: Id<"parcels">,
  status: Status,
  by: Doc<"users"> | null,
  note?: string,
) {
  await ctx.db.insert("parcelEvents", {
    parcelId,
    status,
    note: note || undefined,
    byUserId: by?._id,
    byRole: by?.role as Role | undefined,
    at: Date.now(),
  });
}

/**
 * The single place a parcel's status changes. Checks the move is allowed for
 * this user, applies the money side effects, logs the event and keeps the
 * dashboard counters right.
 */
export async function changeStatus(
  ctx: MutationCtx,
  p: Doc<"parcels">,
  user: Doc<"users">,
  to: Status,
  opts: { note?: string; collectedAmount?: number; deliveryRiderId?: Id<"users"> } = {},
) {
  if (!allowedMoves(p, user).includes(to)) {
    throw new ConvexError(`Cannot move this parcel from "${p.status}" to "${to}".`);
  }
  const now = Date.now();
  const patch: Partial<Doc<"parcels">> = { status: to, updatedAt: now };

  if (to === "out_for_delivery") {
    const riderId = opts.deliveryRiderId ?? p.deliveryRiderId;
    if (!riderId) throw new ConvexError("Assign a delivery rider first.");
    await requireActiveRider(ctx, riderId);
    patch.deliveryRiderId = riderId;
  }

  if (to === "picked_up" && user.role === "rider") patch.pickupRiderId = user._id;

  if (to === "delivered" || to === "partial_delivered") {
    const rates = await getRates(ctx);
    let collected = p.codAmount;
    if (to === "partial_delivered") {
      collected = Math.round(opts.collectedAmount ?? -1);
      if (!(collected >= 0 && collected < p.codAmount)) {
        throw new ConvexError(`Collected amount must be between 0 and ${p.codAmount - 1} for a partial delivery.`);
      }
    }
    patch.collectedAmount = collected;
    patch.codCharge = codCharge(rates, collected);
    patch.cashState = collected > 0 ? "with_rider" : "none";
    if (!p.deliveryRiderId && user.role === "rider") patch.deliveryRiderId = user._id;
    if (collected > 0 && !(patch.deliveryRiderId ?? p.deliveryRiderId)) {
      throw new ConvexError("Assign the delivery rider who collected the cash first.");
    }
  }

  if (to === "returned") {
    patch.collectedAmount = 0;
    patch.codCharge = 0;
  }

  if (to === "delivered" || to === "partial_delivered" || to === "returned") {
    patch.settlement = "unpaid";
    patch.finalAt = now;
  }
  if (to === "cancelled") patch.finalAt = now;

  await ctx.db.patch("parcels", p._id, patch);
  await countParcel(ctx, p, p.status, to);
  await logEvent(ctx, p._id, to, user, opts.note);
}

export async function requireActiveRider(ctx: QueryCtx | MutationCtx, riderId: Id<"users">) {
  const rider = await ctx.db.get("users", riderId);
  if (!rider || rider.role !== "rider" || rider.status !== "active") {
    throw new ConvexError("That rider is not available.");
  }
  return rider;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** MR + 8 unambiguous characters — about 1.1 trillion codes, so not guessable. */
export async function newTrackingCode(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    const code = "MR" + [...bytes].map((b) => CODE_ALPHABET[b % 32]).join("");
    const clash = await ctx.db
      .query("parcels")
      .withIndex("by_trackingCode", (q) => q.eq("trackingCode", code))
      .first();
    if (!clash) return code;
  }
  throw new ConvexError("Could not allocate a tracking code, try again.");
}
