import { mutation, query, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import {
  clean,
  derive,
  timingSafeEqual,
  hashPassword,
  normalisePhone,
  required,
  requireUser,
  revokeSessions,
  temporaryPassword,
} from "./lib/auth";
import { payoutMethod, role, userStatus } from "./schema";
import { removeChat } from "./chat";
import { assertEmailFree, cleanEmail, removeSupportRecords, setPasswordAndEmail } from "./lib/email";

/** Everything about a user except the password fields. */
function publicUser(u: Doc<"users">) {
  const { passwordHash: _h, passwordSalt: _s, passwordIterations: _i, ...rest } = u;
  return rest;
}

/** True once a rider has been on any parcel or handed in any cash. */
async function riderHasHistory(ctx: QueryCtx, riderId: Id<"users">) {
  const parcel =
    (await ctx.db
      .query("parcels")
      .withIndex("by_pickupRiderId_and_status", (q) => q.eq("pickupRiderId", riderId))
      .first()) ??
    (await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_status", (q) => q.eq("deliveryRiderId", riderId))
      .first());
  if (parcel) return true;
  const deposit = await ctx.db
    .query("cashDeposits")
    .withIndex("by_riderId_and_createdAt", (q) => q.eq("riderId", riderId))
    .first();
  return deposit !== null;
}

export const list = query({
  args: { token: v.string(), role, status: v.optional(userStatus) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const statuses = args.status ? [args.status] : (["pending", "active", "suspended"] as const);
    const out = [];
    for (const status of statuses) {
      const rows = await ctx.db
        .query("users")
        .withIndex("by_role_and_status", (q) => q.eq("role", args.role).eq("status", status))
        .take(500);
      out.push(...rows);
    }
    out.sort((a, b) => b.createdAt - a.createdAt);

    if (args.role !== "rider") {
      return out.map((u) => ({ ...publicUser(u), cashInHand: 0, activeTasks: 0, canDelete: false }));
    }

    // Batch query active parcels across riders in 3 indexed queries instead of 3 * N queries
    const [allCash, allDelivering, allPickups] = await Promise.all([
      ctx.db
        .query("parcels")
        .withIndex("by_cashState", (q) => q.eq("cashState", "with_rider"))
        .take(2000),
      ctx.db
        .query("parcels")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", "out_for_delivery"))
        .take(2000),
      ctx.db
        .query("parcels")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", "pending"))
        .take(2000),
    ]);

    const cashByRider = new Map<string, number>();
    for (const p of allCash) {
      if (p.deliveryRiderId) {
        cashByRider.set(p.deliveryRiderId, (cashByRider.get(p.deliveryRiderId) ?? 0) + p.collectedAmount);
      }
    }
    const deliveringByRider = new Map<string, number>();
    for (const p of allDelivering) {
      if (p.deliveryRiderId) {
        deliveringByRider.set(p.deliveryRiderId, (deliveringByRider.get(p.deliveryRiderId) ?? 0) + 1);
      }
    }
    const pickupsByRider = new Map<string, number>();
    for (const p of allPickups) {
      if (p.pickupRiderId) {
        pickupsByRider.set(p.pickupRiderId, (pickupsByRider.get(p.pickupRiderId) ?? 0) + 1);
      }
    }

    return await Promise.all(
      out.map(async (u) => {
        const cashInHand = cashByRider.get(u._id) ?? 0;
        const activeTasks = (deliveringByRider.get(u._id) ?? 0) + (pickupsByRider.get(u._id) ?? 0);
        const canDelete = activeTasks === 0 && cashInHand === 0 ? !(await riderHasHistory(ctx, u._id)) : false;
        return {
          ...publicUser(u),
          cashInHand,
          activeTasks,
          canDelete,
        };
      }),
    );
  },
});

/** Active merchants or riders, for pickers. */
export const options = query({
  args: { token: v.string(), role: v.union(v.literal("merchant"), v.literal("rider")) },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const rows = await ctx.db
      .query("users")
      .withIndex("by_role_and_status", (q) => q.eq("role", args.role).eq("status", "active"))
      .take(1000);
    return rows
      .map((u) => ({ _id: u._id, label: u.businessName ?? u.name, phone: u.phone, area: u.riderArea }))
      .sort((a, b) => a.label.localeCompare(b.label));
  },
});

export const setStatus = mutation({
  args: { token: v.string(), userId: v.id("users"), status: userStatus },
  handler: async (ctx, args) => {
    const admin = await requireUser(ctx, args.token, ["admin"]);
    if (admin._id === args.userId) throw new ConvexError("You cannot change your own status.");
    const user = await ctx.db.get("users", args.userId);
    if (!user) throw new ConvexError("User not found.");
    await ctx.db.patch(
      "users",
      user._id,
      // Activating clears an automatic lock and its wrong-password count.
      args.status === "active" ? { status: args.status, failedLogins: 0, lockedByLogin: undefined } : { status: args.status, lockedByLogin: undefined },
    );
    if (args.status !== "active") await revokeSessions(ctx, user._id);
    return null;
  },
});

/** Admin creates a rider or a merchant. There is one admin account, set from the CLI. */
export const create = mutation({
  args: {
    token: v.string(),
    role: v.union(v.literal("merchant"), v.literal("rider")),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    password: v.string(),
    businessName: v.optional(v.string()),
    pickupAddress: v.optional(v.string()),
    riderArea: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const phone = normalisePhone(args.phone);
    const clash = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (clash) throw new ConvexError("This phone number already has an account. Please log in.");
    const email = cleanEmail(args.email, args.role === "merchant");
    await assertEmailFree(ctx, email);
    await ctx.db.insert("users", {
      name: required(args.name, 80, "Name"),
      phone,
      email: email || undefined,
      role: args.role,
      status: "active",
      businessName:
        args.role === "merchant" ? required(args.businessName, 100, "Business name") : undefined,
      pickupAddress: args.role === "merchant" ? clean(args.pickupAddress, 300, "Pickup address") : undefined,
      riderArea: args.role === "rider" ? clean(args.riderArea, 80, "Area") || undefined : undefined,
      ...(await hashPassword(args.password.trim())),
      createdAt: Date.now(),
    });
    return null;
  },
});

/**
 * Admin sets a rider's (or merchant's) password to one the office chooses —
 * a permanent password the person collects from the office. Signs them out
 * everywhere so the old password stops working at once.
 */
export const setPassword = mutation({
  args: { token: v.string(), userId: v.id("users"), password: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireUser(ctx, args.token, ["admin"]);
    if (admin._id === args.userId) throw new ConvexError("Use Account → Change password for yourself.");
    const user = await ctx.db.get("users", args.userId);
    if (!user || user.role === "admin") throw new ConvexError("User not found.");
    // Emails the new password when they have an email address (see lib/email.ts).
    const logId = await setPasswordAndEmail(ctx, user, args.password);
    return { logId, email: user.email ?? null };
  },
});

/**
 * Deletes a rider added by mistake. Only allowed when the rider has never
 * touched a parcel or handed in cash, so no money record is left pointing at
 * a missing person. Anyone with history must be suspended instead.
 */
export const removeRider = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const user = await ctx.db.get("users", args.userId);
    if (!user || user.role !== "rider") throw new ConvexError("Rider not found.");
    if (await riderHasHistory(ctx, user._id)) {
      throw new ConvexError("This rider has parcel or cash history, so they can't be deleted. Suspend them instead.");
    }
    await revokeSessions(ctx, user._id);
    const apps = await ctx.db
      .query("riderApplications")
      .withIndex("by_phone", (q) => q.eq("phone", user.phone))
      .take(10);
    for (const a of apps) {
      if (a.riderId === user._id) await ctx.db.patch("riderApplications", a._id, { riderId: undefined });
    }
    const profile = await ctx.db
      .query("riderProfiles")
      .withIndex("by_riderId", (q) => q.eq("riderId", user._id))
      .unique();
    if (profile) await ctx.db.delete("riderProfiles", profile._id);
    await removeChat(ctx, user._id);
    await removeSupportRecords(ctx, user._id);
    await ctx.db.delete("users", user._id);
    return null;
  },
});

/** Gives the user a one-off password and signs them out everywhere. */
export const resetPassword = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const admin = await requireUser(ctx, args.token, ["admin"]);
    if (admin._id === args.userId) throw new ConvexError("Use Account → Change password for yourself.");
    const user = await ctx.db.get("users", args.userId);
    if (!user) throw new ConvexError("User not found.");
    const password = temporaryPassword();
    await ctx.db.patch("users", user._id, await hashPassword(password));
    await revokeSessions(ctx, user._id);
    return { password };
  },
});

const profileFields = {
  name: v.string(),
  email: v.optional(v.string()),
  businessName: v.optional(v.string()),
  pickupAddress: v.optional(v.string()),
  payoutMethod: v.optional(payoutMethod),
  payoutAccount: v.optional(v.string()),
  riderArea: v.optional(v.string()),
};

const profileArgs = v.object(profileFields);

function profilePatch(user: Doc<"users">, args: typeof profileArgs.type) {
  // Merchants must keep an email: forgotten passwords are sent there.
  const email = cleanEmail(args.email, user.role === "merchant");
  const patch: Partial<Doc<"users">> = { name: required(args.name, 80, "Name"), email: email || undefined };
  if (user.role === "merchant") {
    patch.businessName = required(args.businessName, 100, "Business name");
    patch.pickupAddress = required(args.pickupAddress, 300, "Pickup address");
    patch.payoutMethod = args.payoutMethod;
    patch.payoutAccount = clean(args.payoutAccount, 100, "Payment account") || undefined;
  }
  if (user.role === "rider") patch.riderArea = clean(args.riderArea, 80, "Area") || undefined;
  return patch;
}

export const updateProfile = mutation({
  args: { token: v.string(), currentPassword: v.optional(v.string()), ...profileFields },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["admin", "merchant", "rider"]);
    const patch = profilePatch(user, args);
    /*
      Where the money goes is the one profile field worth stealing a session
      for: change it and the next payout lands in someone else's wallet. So it
      needs the account password, not just a live session.
    */
    await assertEmailFree(ctx, patch.email ?? "", user._id);
    // The email is where a reset password goes, so changing it is guarded like payout details.
    const payoutChanged =
      user.role === "merchant" &&
      (patch.payoutMethod !== user.payoutMethod ||
        patch.payoutAccount !== user.payoutAccount ||
        (patch.email ?? undefined) !== (user.email ?? undefined));
    if (payoutChanged) {
      const candidate = await derive((args.currentPassword ?? "").slice(0, 128), user.passwordSalt, user.passwordIterations);
      if (!timingSafeEqual(candidate, user.passwordHash)) {
        throw new ConvexError("Enter your current password to change payment details or email.");
      }
    }
    await ctx.db.patch("users", user._id, patch);
    return null;
  },
});

export const adminUpdate = mutation({
  args: { token: v.string(), userId: v.id("users"), ...profileFields },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const user = await ctx.db.get("users", args.userId);
    if (!user) throw new ConvexError("User not found.");
    const patch = profilePatch(user, args);
    await assertEmailFree(ctx, patch.email ?? "", user._id);
    await ctx.db.patch("users", user._id, patch);
    return null;
  },
});
