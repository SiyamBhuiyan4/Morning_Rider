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

/** Merchant business verification. A merchant can send parcels only once approved. */
export const verificationStatus = v.union(v.literal("submitted"), v.literal("approved"), v.literal("rejected"));

export const maritalStatus = v.union(
  v.literal("single"),
  v.literal("married"),
  v.literal("divorced"),
  v.literal("widowed"),
);
export const religion = v.union(
  v.literal("islam"),
  v.literal("hinduism"),
  v.literal("buddhism"),
  v.literal("christianity"),
  v.literal("other"),
);
export const education = v.union(
  v.literal("none"),
  v.literal("primary"),
  v.literal("jsc"),
  v.literal("ssc"),
  v.literal("hsc"),
  v.literal("diploma"),
  v.literal("bachelor"),
  v.literal("masters"),
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
    // merchant business verification; undefined = not submitted yet
    verification: v.optional(verificationStatus),
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
    extraPerKg: v.number(), // each kg above 1 — Uttara and Dhaka city
    extraPerKgOutside: v.number(), // each kg above 1 — Gazipur and Narayanganj
    codPercent: v.number(), // % of collected COD — Uttara and Dhaka city
    codPercentOutside: v.number(), // % of collected COD — Gazipur and Narayanganj
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
  })
    .index("by_parcelId_and_at", ["parcelId", "at"])
    .index("by_at", ["at"]),

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
    A merchant asking to be paid their balance. The admin either pays it
    (through the normal payout, which closes the request) or rejects it.
  */
  payoutRequests: defineTable({
    merchantId: v.id("users"),
    amount: v.number(), // balance when requested; the payout pays the balance at payment time
    method: payoutMethod,
    account: v.string(),
    note: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("paid"), v.literal("rejected"), v.literal("cancelled")),
    payoutId: v.optional(v.id("payouts")),
    reason: v.optional(v.string()), // why it was rejected
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_merchantId_and_status", ["merchantId", "status"])
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
    demo: v.optional(v.boolean()), // sample applicant, removed with the demo data
    createdAt: v.number(),
  })
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_phone", ["phone"]),

  /*
    A merchant's business documents, sent for review. A merchant has at most
    one live row: a resubmission after rejection replaces the old row (and
    its files). The NID is required; TIN, trade licence and other documents
    are optional.
  */
  merchantVerifications: defineTable({
    merchantId: v.id("users"),
    nidNumber: v.string(),
    nidFront: v.id("_storage"),
    nidBack: v.id("_storage"),
    tinNumber: v.optional(v.string()),
    tinFile: v.optional(v.id("_storage")),
    tradeLicenseNumber: v.optional(v.string()),
    tradeLicenseFile: v.optional(v.id("_storage")),
    otherFiles: v.array(v.id("_storage")), // max 5
    status: verificationStatus,
    reason: v.optional(v.string()), // why it was rejected, shown to the merchant
    submittedAt: v.number(),
    decidedAt: v.optional(v.number()),
  })
    .index("by_merchantId_and_submittedAt", ["merchantId", "submittedAt"])
    .index("by_status_and_submittedAt", ["status", "submittedAt"]),

  /* Every file ever put in a verification, so one upload can't be claimed twice. */
  verificationFiles: defineTable({
    storageId: v.id("_storage"),
    merchantId: v.id("users"),
  })
    .index("by_storageId", ["storageId"])
    .index("by_merchantId", ["merchantId"]),

  cashDeposits: defineTable({
    riderId: v.id("users"),
    amount: v.number(),
    parcelCount: v.number(),
    receivedBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_riderId_and_createdAt", ["riderId", "createdAt"]),

  /*
    Personal details the office keeps on each rider. Admin-only: never sent
    to the rider app or to merchants. Every field is optional so a profile
    can be filled in bit by bit.
  */
  riderProfiles: defineTable({
    riderId: v.id("users"),
    dateOfBirth: v.optional(v.string()), // YYYY-MM-DD
    idType: v.optional(v.union(v.literal("nid"), v.literal("birth_certificate"))),
    idNumber: v.optional(v.string()),
    maritalStatus: v.optional(maritalStatus),
    religion: v.optional(religion),
    education: v.optional(education),
    institution: v.optional(v.string()),
    bloodGroup: v.optional(v.string()),
    whatsapp: v.optional(v.string()),
    facebook: v.optional(v.string()),
    fatherName: v.optional(v.string()),
    fatherPhone: v.optional(v.string()),
    motherName: v.optional(v.string()),
    motherPhone: v.optional(v.string()),
    guardianName: v.optional(v.string()),
    guardianRelation: v.optional(v.string()),
    guardianPhone: v.optional(v.string()),
    presentAddress: v.optional(v.string()),
    permanentAddress: v.optional(v.string()),
    bikeNumber: v.optional(v.string()),
    licenseNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_riderId", ["riderId"]),

  /*
    Office chat with merchants and with riders: one thread per person. Each
    side may send a limited number of messages in a row (merchants 5, riders
    100): the counter resets when the office replies or presses "Seen, allow
    more". See convex/chat.ts.
  */
  chatThreads: defineTable({
    userId: v.id("users"),
    role: v.union(v.literal("merchant"), v.literal("rider")),
    lastMessageAt: v.number(),
    lastBody: v.string(), // short preview for the list
    lastFrom: v.union(v.literal("admin"), v.literal("user")),
    adminUnread: v.number(),
    userUnread: v.number(),
    userSent: v.number(), // messages since the last reset
    adminSeenAt: v.optional(v.number()),
    userSeenAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_role_and_lastMessageAt", ["role", "lastMessageAt"]),

  chatMessages: defineTable({
    userId: v.id("users"),
    from: v.union(v.literal("admin"), v.literal("user")),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_userId_and_createdAt", ["userId", "createdAt"]),
});
