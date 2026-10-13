import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const role = v.union(v.literal("admin"), v.literal("merchant"), v.literal("rider"));
export const userStatus = v.union(
  v.literal("pending"), // merchant signed up, waiting for admin approval
  v.literal("active"),
  v.literal("suspended"),
);

/*
  Where Morning Rider delivers (from its Facebook page): Uttara gets the
  3-hour express, the rest of Dhaka and Gazipur city corporations same day,
  and Narayanganj city is the newest area. Each zone has its own price.
*/
export const zone = v.union(
  v.literal("uttara"),
  v.literal("dhaka_city"),
  v.literal("gazipur_city"),
  v.literal("narayanganj_city"),
);

/** What is inside the parcel — riders handle frozen and bakery items differently. */
export const category = v.union(
  v.literal("parcel"),
  v.literal("document"),
  v.literal("food"),
  v.literal("medicine"),
  v.literal("shopping"),
  v.literal("electronics"),
  v.literal("cosmetics"),
  v.literal("gift"),
  v.literal("frozen"),
  v.literal("bakery"),
  v.literal("home"),
  v.literal("business"),
);

/*
  Parcel lifecycle. The allowed moves between these live in
  `convex/lib/status.ts` — every status change goes through there.
*/
export const parcelStatus = v.union(
  v.literal("pending"), // created by merchant, waiting for pickup
  v.literal("picked_up"), // rider has it from the merchant
  v.literal("at_hub"), // sorted at the Morning Rider hub
  v.literal("out_for_delivery"), // with a delivery rider
  v.literal("hold"), // customer asked for a later date
  v.literal("delivered"),
  v.literal("partial_delivered"),
  v.literal("returning"), // delivery failed, going back to merchant
  v.literal("returned"), // handed back to merchant
  v.literal("cancelled"), // cancelled before pickup
);

export const payoutMethod = v.union(
  v.literal("bkash"),
  v.literal("nagad"),
  v.literal("rocket"),
  v.literal("bank"),
  v.literal("cash"),
);

export default defineSchema({
  users: defineTable({
    name: v.string(),
    phone: v.string(), // normalised 01XXXXXXXXX — the login id
    email: v.optional(v.string()),
    role,
    status: userStatus,
    passwordHash: v.string(),
    passwordSalt: v.string(),
    passwordIterations: v.number(),
    // merchant profile
    businessName: v.optional(v.string()),
    pickupAddress: v.optional(v.string()),
    payoutMethod: v.optional(payoutMethod),
    payoutAccount: v.optional(v.string()),
    // rider profile
    riderArea: v.optional(v.string()),
    demo: v.optional(v.boolean()), // sample data, removable from the admin dashboard
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_role_and_status", ["role", "status"]),

  sessions: defineTable({
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
  })
    .index("by_tokenHash", ["tokenHash"])
    .index("by_userId", ["userId"])
    .index("by_expiresAt", ["expiresAt"]),

  loginFailures: defineTable({
    phone: v.string(),
    at: v.number(),
  })
    .index("by_phone_and_at", ["phone", "at"])
    .index("by_at", ["at"]),

  /* Single row: delivery charge rates. Edited by admin in Settings. */
  rates: defineTable({
    // base charge per zone, up to 1 kg
    uttara: v.number(),
    dhakaCity: v.number(),
    gazipurCity: v.number(),
    narayanganjCity: v.number(),
    extraPerKg: v.number(),
    codPercent: v.number(), // % of collected COD
    returnPercent: v.number(), // % of delivery charge billed on a returned parcel
    updatedAt: v.number(),
  }),

  parcels: defineTable({
    trackingCode: v.string(),
    merchantId: v.id("users"),
    invoice: v.optional(v.string()), // merchant's own order reference
    recipientName: v.string(),
    recipientPhone: v.string(),
    recipientAddress: v.string(),
    district: v.string(), // the delivery area, e.g. "Mirpur 10" (named district before areas were city-level)
    zone,
    category: v.optional(category),
    weightKg: v.number(),
    codAmount: v.number(), // amount to collect from the customer
    itemDescription: v.optional(v.string()),
    note: v.optional(v.string()),
    deliveryCharge: v.number(),
    codCharge: v.number(),
    returnCharge: v.number(), // charged only if returned
    status: parcelStatus,
    pickupRiderId: v.optional(v.id("users")),
    deliveryRiderId: v.optional(v.id("users")),
    collectedAmount: v.number(), // actually collected at the door
    /*
      Money state, kept separately from status so the balance views can be
      read off an index instead of scanning every parcel.
        open      not final yet
        unpaid    final, owed to / by the merchant, not yet in a payout
        paid      included in a payout
    */
    settlement: v.union(v.literal("open"), v.literal("unpaid"), v.literal("paid")),
    payoutId: v.optional(v.id("payouts")),
    /* COD cash: with the rider until the admin receives it. */
    cashState: v.union(v.literal("none"), v.literal("with_rider"), v.literal("deposited")),
    searchText: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    finalAt: v.optional(v.number()),
  })
    .index("by_trackingCode", ["trackingCode"])
    .index("by_createdAt", ["createdAt"])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_merchantId_and_createdAt", ["merchantId", "createdAt"])
    .index("by_merchantId_and_status_and_createdAt", ["merchantId", "status", "createdAt"])
    .index("by_merchantId_and_settlement", ["merchantId", "settlement"])
    .index("by_settlement", ["settlement"])
    .index("by_payoutId", ["payoutId"])
    .index("by_finalAt", ["finalAt"])
    .index("by_recipientPhone", ["recipientPhone"])
    .index("by_pickupRiderId_and_status", ["pickupRiderId", "status"])
    .index("by_deliveryRiderId_and_status", ["deliveryRiderId", "status"])
    .index("by_deliveryRiderId_and_cashState", ["deliveryRiderId", "cashState"])
    .index("by_cashState", ["cashState"])
    .searchIndex("search_text", { searchField: "searchText", filterFields: ["merchantId"] }),

  parcelEvents: defineTable({
    parcelId: v.id("parcels"),
    status: parcelStatus,
    note: v.optional(v.string()),
    byUserId: v.optional(v.id("users")),
    byRole: v.optional(role),
    at: v.number(),
  }).index("by_parcelId_and_at", ["parcelId", "at"]),

  /* Running per-status counts, so the dashboards never scan parcels. */
  statusCounts: defineTable({
    scope: v.string(), // "all" or a merchant id
    status: parcelStatus,
    count: v.number(),
  }).index("by_scope_and_status", ["scope", "status"]),

  payouts: defineTable({
    merchantId: v.id("users"),
    amount: v.number(),
    parcelCount: v.number(),
    collected: v.number(),
    charges: v.number(),
    method: payoutMethod,
    payoutAccount: v.optional(v.string()), // where it was sent, as it was at the time
    reference: v.optional(v.string()),
    note: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_merchantId_and_createdAt", ["merchantId", "createdAt"]),

  /*
    People applying to be riders from the public website. An application is
    never an account: the admin reviews it, invites the person for an
    interview, and creates the rider account only when hiring them.
  */
  riderApplications: defineTable({
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    area: v.string(),
    hasBike: v.boolean(),
    hasLicense: v.boolean(),
    note: v.optional(v.string()),
    status: v.union(v.literal("new"), v.literal("interview"), v.literal("hired"), v.literal("rejected")),
    interviewAt: v.optional(v.number()),
    interviewPlace: v.optional(v.string()),
    riderId: v.optional(v.id("users")), // the account created on hiring
    createdAt: v.number(),
  })
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_phone", ["phone"]),

  cashDeposits: defineTable({
    riderId: v.id("users"),
    amount: v.number(),
    parcelCount: v.number(),
    receivedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_riderId_and_createdAt", ["riderId", "createdAt"]),
});
