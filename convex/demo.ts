import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { randomHex, hashPassword, requireUser } from "./lib/auth";
import { codCharge, computeCharges, getRates, merchantNet, type Status } from "./lib/parcel";

/*
  Sample data so every admin page has something on it while Siyam learns the
  system. Every demo account carries `demo: true`, and everything else demo
  (parcels, events, payouts, cash hand-overs) hangs off those accounts — so
  "Clear demo data" deletes exactly that and can never touch a real record.

  Demo accounts get random passwords nobody knows. To look at the merchant or
  rider panel, use "Reset password" on a demo account in the admin panel.
*/

const DAY = 86_400_000;

const MERCHANTS = [
  { name: "Rakib Hasan", businessName: "Demo Fashion House", phone: "01300000101", pickupAddress: "House 12, Road 7, Dhanmondi, Dhaka", payoutMethod: "bkash" as const, payoutAccount: "01300000101", status: "active" as const },
  { name: "Nusrat Jahan", businessName: "Demo Gadget Shop", phone: "01300000102", pickupAddress: "Shop 34, Bashundhara City, Panthapath, Dhaka", payoutMethod: "nagad" as const, payoutAccount: "01300000102", status: "active" as const },
  { name: "Tanvir Ahmed", businessName: "Demo Organic Food", phone: "01300000103", pickupAddress: "Sector 7, Uttara, Dhaka", payoutMethod: "bank" as const, payoutAccount: "City Bank 1234567890", status: "pending" as const },
];

const RIDERS = [
  { name: "Demo Rider Karim", phone: "01300000201", riderArea: "Mirpur" },
  { name: "Demo Rider Sohel", phone: "01300000202", riderArea: "Dhanmondi" },
  { name: "Demo Rider Jamal", phone: "01300000203", riderArea: "Uttara" },
];

const CUSTOMERS = [
  ["Ayesha Siddika", "House 14, Road 7, Sector 4", "Uttara", "uttara"],
  ["Mahmud Hossain", "House 8, Block C", "Banani", "dhaka_city"],
  ["Farhana Akter", "College Road", "Tongi, Gazipur", "gazipur_city"],
  ["Shakil Khan", "Chashara", "Narayanganj Sadar", "narayanganj_city"],
  ["Rumana Islam", "Flat 5A, Road 3", "Mirpur 10", "dhaka_city"],
  ["Imran Kabir", "House 22, Road 11, Sector 9", "Uttara", "uttara"],
  ["Sabbir Rahman", "Joydebpur Chowrasta", "Gazipur Sadar", "gazipur_city"],
  ["Tania Sultana", "Road 27", "Dhanmondi", "dhaka_city"],
  ["Hasan Mahmud", "Gulshan Avenue", "Gulshan 1", "dhaka_city"],
  ["Mitu Begum", "Sector 11", "Uttara", "uttara"],
] as const;

const CATEGORIES = ["shopping", "electronics", "frozen", "bakery", "medicine", "food", "gift", "document"] as const;

const ITEMS = ["2 T-shirts", "Bluetooth earbuds", "Frozen chicken nuggets", "Birthday cake 2 lb", "Paracetamol + saline", "Home-made biryani", "Gift box", "Office documents"];

/** Status, how many days ago it was booked, and what the money side looks like. */
const PLAN: { status: Status; daysAgo: number; partial?: number; cashIn?: boolean; paid?: boolean }[] = [
  { status: "pending", daysAgo: 0 },
  { status: "pending", daysAgo: 0 },
  { status: "pending", daysAgo: 0 },
  { status: "picked_up", daysAgo: 0 },
  { status: "picked_up", daysAgo: 1 },
  { status: "at_hub", daysAgo: 1 },
  { status: "at_hub", daysAgo: 1 },
  { status: "out_for_delivery", daysAgo: 1 },
  { status: "out_for_delivery", daysAgo: 1 },
  { status: "out_for_delivery", daysAgo: 2 },
  { status: "hold", daysAgo: 2 },
  { status: "delivered", daysAgo: 0 },
  { status: "delivered", daysAgo: 1 },
  { status: "delivered", daysAgo: 2 },
  { status: "delivered", daysAgo: 3, cashIn: true },
  { status: "delivered", daysAgo: 4, cashIn: true },
  { status: "delivered", daysAgo: 6, cashIn: true, paid: true },
  { status: "delivered", daysAgo: 7, cashIn: true, paid: true },
  { status: "delivered", daysAgo: 8, cashIn: true, paid: true },
  { status: "delivered", daysAgo: 9, cashIn: true, paid: true },
  { status: "partial_delivered", daysAgo: 3, partial: 500, cashIn: true },
  { status: "returning", daysAgo: 2 },
  { status: "returned", daysAgo: 5 },
  { status: "returned", daysAgo: 10, paid: true },
  { status: "cancelled", daysAgo: 4 },
];

/** The steps a parcel went through to reach `status`. */
function pathTo(status: Status): Status[] {
  const base: Status[] = ["pending"];
  switch (status) {
    case "pending":
      return base;
    case "cancelled":
      return [...base, "cancelled"];
    case "picked_up":
      return [...base, "picked_up"];
    case "at_hub":
      return [...base, "picked_up", "at_hub"];
    case "out_for_delivery":
      return [...base, "picked_up", "at_hub", "out_for_delivery"];
    case "hold":
      return [...base, "picked_up", "at_hub", "out_for_delivery", "hold"];
    case "delivered":
    case "partial_delivered":
      return [...base, "picked_up", "at_hub", "out_for_delivery", status];
    case "returning":
      return [...base, "picked_up", "at_hub", "out_for_delivery", "returning"];
    case "returned":
      return [...base, "picked_up", "at_hub", "out_for_delivery", "returning", "returned"];
  }
}

async function demoUsers(ctx: MutationCtx | Parameters<typeof requireUser>[0]) {
  const out: Doc<"users">[] = [];
  for (const role of ["merchant", "rider"] as const) {
    for (const status of ["pending", "active", "suspended"] as const) {
      const rows = await ctx.db
        .query("users")
        .withIndex("by_role_and_status", (q) => q.eq("role", role).eq("status", status))
        .take(1000);
      out.push(...rows.filter((u) => u.demo));
    }
  }
  return out;
}

async function seed(ctx: MutationCtx, adminId: Id<"users"> | undefined) {
  if ((await demoUsers(ctx)).length > 0) throw new ConvexError("Demo data is already loaded.");
  for (const m of [...MERCHANTS, ...RIDERS]) {
    const clash = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", m.phone))
      .unique();
    if (clash) throw new ConvexError(`Phone ${m.phone} is already used by a real account.`);
  }

  const now = Date.now();
  const rates = await getRates(ctx);
  // Nobody knows these passwords; "Reset password" in the admin panel gives access.
  const lockedPassword = async () => hashPassword("Demo" + randomHex(12) + "9");

  const merchantIds: Id<"users">[] = [];
  for (const m of MERCHANTS) {
    merchantIds.push(
      await ctx.db.insert("users", { ...m, role: "merchant", demo: true, ...(await lockedPassword()), createdAt: now - 12 * DAY }),
    );
  }
  const activeMerchants = merchantIds.slice(0, 2);
  const riderIds: Id<"users">[] = [];
  for (const r of RIDERS) {
    riderIds.push(
      await ctx.db.insert("users", { ...r, role: "rider", status: "active", demo: true, ...(await lockedPassword()), createdAt: now - 12 * DAY }),
    );
  }

  const counts = new Map<string, number>();
  const bump = (scope: string, s: Status) => counts.set(`${scope}|${s}`, (counts.get(`${scope}|${s}`) ?? 0) + 1);
  const paidByMerchant = new Map<Id<"users">, Doc<"parcels">["_id"][]>();
  const cashByRider = new Map<Id<"users">, { amount: number; count: number }>();
  const CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let i = 0; i < PLAN.length; i++) {
    const plan = PLAN[i];
    const [recipientName, address, district, zone] = CUSTOMERS[i % CUSTOMERS.length];
    const category = CATEGORIES[i % CATEGORIES.length];
    const merchantId = activeMerchants[i % activeMerchants.length];
    const pickupRiderId = riderIds[i % riderIds.length];
    const deliveryRiderId = riderIds[(i + 1) % riderIds.length];
    const weightKg = [0.5, 1, 1.5, 2, 3][i % 5];
    const codAmount = [650, 1200, 850, 2400, 1500, 990, 3200, 450][i % 8];
    const steps = pathTo(plan.status);
    const createdAt = now - plan.daysAgo * DAY - (i % 6) * 3600_000 - 2 * 3600_000;
    const stepGap = Math.min(4 * 3600_000, (now - createdAt) / (steps.length + 1));

    const final = ["delivered", "partial_delivered", "returned", "cancelled"].includes(plan.status);
    const delivered = plan.status === "delivered" || plan.status === "partial_delivered";
    const collected = plan.status === "delivered" ? codAmount : plan.status === "partial_delivered" ? (plan.partial ?? 0) : 0;
    const charges = computeCharges(rates, zone, weightKg, codAmount);
    const reachedDelivery = steps.includes("out_for_delivery");

    let trackingCode = "MR";
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    for (const b of bytes) trackingCode += CODE[b % 32];

    const phone = "017" + String(10000000 + ((i * 7919) % 89999999)).padStart(8, "0");
    const doc = {
      trackingCode,
      merchantId,
      invoice: `INV-${1001 + i}`,
      recipientName,
      recipientPhone: phone,
      recipientAddress: address,
      district,
      zone,
      category,
      weightKg,
      codAmount,
      itemDescription: ITEMS[i % ITEMS.length],
      note: i % 4 === 0 ? "Call before delivery" : undefined,
      deliveryCharge: charges.deliveryCharge,
      codCharge: delivered ? codCharge(rates, collected) : charges.codCharge,
      returnCharge: charges.returnCharge,
      status: plan.status,
      pickupRiderId: plan.status === "cancelled" ? undefined : pickupRiderId,
      deliveryRiderId: reachedDelivery ? deliveryRiderId : undefined,
      collectedAmount: collected,
      settlement: (plan.paid ? "paid" : delivered || plan.status === "returned" ? "unpaid" : "open") as Doc<"parcels">["settlement"],
      cashState: (collected > 0 ? (plan.cashIn ? "deposited" : "with_rider") : "none") as Doc<"parcels">["cashState"],
      searchText: [trackingCode, `INV-${1001 + i}`, recipientName, phone].join(" "),
      createdAt,
      updatedAt: createdAt + (steps.length - 1) * stepGap,
      finalAt: final ? createdAt + (steps.length - 1) * stepGap : undefined,
    };
    const id = await ctx.db.insert("parcels", doc);
    bump("all", plan.status);
    bump(merchantId, plan.status);

    for (let s = 0; s < steps.length; s++) {
      await ctx.db.insert("parcelEvents", {
        parcelId: id,
        status: steps[s],
        note:
          s === 0
            ? "Parcel created"
            : steps[s] === "hold"
              ? "Customer asked to deliver tomorrow"
              : steps[s] === "returning"
                ? "Customer not answering the phone"
                : undefined,
        byUserId: s === 0 ? merchantId : steps[s] === "at_hub" || steps[s] === "returned" ? adminId : deliveryRiderId,
        byRole: s === 0 ? "merchant" : steps[s] === "at_hub" || steps[s] === "returned" ? "admin" : "rider",
        at: createdAt + s * stepGap,
      });
    }
    if (plan.paid) paidByMerchant.set(merchantId, [...(paidByMerchant.get(merchantId) ?? []), id]);
    if (plan.cashIn && collected > 0) {
      const c = cashByRider.get(deliveryRiderId) ?? { amount: 0, count: 0 };
      cashByRider.set(deliveryRiderId, { amount: c.amount + collected, count: c.count + 1 });
    }
  }

  for (const [key, count] of counts) {
    const [scope, status] = key.split("|") as [string, Status];
    const row = await ctx.db
      .query("statusCounts")
      .withIndex("by_scope_and_status", (q) => q.eq("scope", scope).eq("status", status))
      .unique();
    if (row) await ctx.db.patch("statusCounts", row._id, { count: row.count + count });
    else await ctx.db.insert("statusCounts", { scope, status, count });
  }

  // One past payout per merchant, covering the "paid" parcels.
  const payer = adminId ?? riderIds[0];
  for (const [merchantId, ids] of paidByMerchant) {
    const parcels = (await Promise.all(ids.map((id) => ctx.db.get("parcels", id)))).filter((p) => p !== null);
    const collected = parcels.reduce((s, p) => s + p.collectedAmount, 0);
    const net = parcels.reduce((s, p) => s + merchantNet(p), 0);
    const m = await ctx.db.get("users", merchantId);
    const payoutId = await ctx.db.insert("payouts", {
      merchantId,
      amount: net,
      parcelCount: parcels.length,
      collected,
      charges: collected - net,
      method: m?.payoutMethod ?? "bkash",
      payoutAccount: m?.payoutAccount,
      reference: "DEMO-TX-" + randomHex(3).toUpperCase(),
      note: "Demo payout",
      createdBy: payer,
      createdAt: now - 5 * DAY,
    });
    for (const p of parcels) await ctx.db.patch("parcels", p._id, { payoutId });
  }

  for (const [riderId, c] of cashByRider) {
    await ctx.db.insert("cashDeposits", { riderId, amount: c.amount, parcelCount: c.count, receivedBy: payer, createdAt: now - 3 * DAY });
  }

  return { merchants: merchantIds.length, riders: riderIds.length, parcels: PLAN.length };
}

async function clear(ctx: MutationCtx) {
  const users = await demoUsers(ctx);
  if (users.length === 0) throw new ConvexError("There is no demo data to clear.");
  const demoIds = new Set<string>(users.map((u) => u._id));

  // Refuse rather than orphan real work that was handed to a demo rider.
  for (const u of users.filter((x) => x.role === "rider")) {
    const asPickup = await ctx.db
      .query("parcels")
      .withIndex("by_pickupRiderId_and_status", (q) => q.eq("pickupRiderId", u._id))
      .take(500);
    const asDelivery = await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_status", (q) => q.eq("deliveryRiderId", u._id))
      .take(500);
    const real = [...asPickup, ...asDelivery].find((p) => !demoIds.has(p.merchantId));
    if (real) {
      throw new ConvexError(
        `Real parcel ${real.trackingCode} is assigned to ${u.name}. Give it to a real rider first, then clear the demo data.`,
      );
    }
  }

  let parcels = 0;
  const lost = new Map<string, number>();
  for (const u of users) {
    if (u.role === "merchant") {
      const rows = await ctx.db
        .query("parcels")
        .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", u._id))
        .take(2000);
      for (const p of rows) {
        const events = await ctx.db
          .query("parcelEvents")
          .withIndex("by_parcelId_and_at", (q) => q.eq("parcelId", p._id))
          .take(200);
        for (const e of events) await ctx.db.delete("parcelEvents", e._id);
        for (const scope of ["all", p.merchantId as string]) {
          lost.set(`${scope}|${p.status}`, (lost.get(`${scope}|${p.status}`) ?? 0) + 1);
        }
        await ctx.db.delete("parcels", p._id);
        parcels++;
      }
      const payouts = await ctx.db
        .query("payouts")
        .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", u._id))
        .take(500);
      for (const p of payouts) await ctx.db.delete("payouts", p._id);
      const counters = await ctx.db
        .query("statusCounts")
        .withIndex("by_scope_and_status", (q) => q.eq("scope", u._id))
        .take(20);
      for (const c of counters) await ctx.db.delete("statusCounts", c._id);
    } else {
      const deposits = await ctx.db
        .query("cashDeposits")
        .withIndex("by_riderId_and_createdAt", (q) => q.eq("riderId", u._id))
        .take(500);
      for (const d of deposits) await ctx.db.delete("cashDeposits", d._id);
    }
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", u._id))
      .take(100);
    for (const s of sessions) await ctx.db.delete("sessions", s._id);
    await ctx.db.delete("users", u._id);
  }

  for (const [key, n] of lost) {
    const [scope, status] = key.split("|") as [string, Status];
    if (scope !== "all") continue; // per-merchant rows were deleted above
    const row = await ctx.db
      .query("statusCounts")
      .withIndex("by_scope_and_status", (q) => q.eq("scope", scope).eq("status", status))
      .unique();
    if (row) await ctx.db.patch("statusCounts", row._id, { count: Math.max(0, row.count - n) });
  }
  return { users: users.length, parcels };
}

export const status = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const users = await demoUsers(ctx);
    return {
      loaded: users.length > 0,
      merchants: users.filter((u) => u.role === "merchant").length,
      riders: users.filter((u) => u.role === "rider").length,
    };
  },
});

export const load = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireUser(ctx, args.token, ["admin"]);
    return await seed(ctx, admin._id);
  },
});

export const remove = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    return await clear(ctx);
  },
});

/** CLI: npx convex run --prod demo:loadInternal */
export const loadInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    const admin = await ctx.db
      .query("users")
      .withIndex("by_role_and_status", (q) => q.eq("role", "admin").eq("status", "active"))
      .first();
    return await seed(ctx, admin?._id);
  },
});

/** CLI: npx convex run --prod demo:removeInternal */
export const removeInternal = internalMutation({
  args: {},
  handler: async (ctx) => await clear(ctx),
});
