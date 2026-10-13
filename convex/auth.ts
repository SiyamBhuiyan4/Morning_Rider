import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  clean,
  currentUser,
  derive,
  hashPassword,
  issueSession,
  normalisePhone,
  required,
  revokeSessions,
  sha256Hex,
  timingSafeEqual,
  PBKDF2_ITERATIONS,
  ADMIN_SESSION_TTL_MS,
  type Role,
} from "./lib/auth";
import { payoutMethod } from "./schema";

/*
  Brute-force throttle, per phone number. Five wrong passwords inside the
  window and that account refuses every attempt until the window passes.

  A Convex mutation is a transaction and a throw rolls back every write in it,
  so `login` reports failure by *returning* — otherwise the failure row would
  be discarded together with the error and the count would never grow.
*/
const MAX_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60 * 1000;

/** A fixed salt for the decoy derivation when the phone has no account. */
const DECOY_SALT = "6d6f726e696e67726964657264656379";

type LoginResult = { ok: true; token: string; expiresAt: number } | { ok: false; error: string };

/*
  Two front doors. The main website signs in merchants and riders only; the
  separate admin website signs in admins only. An account knocking at the
  wrong door gets exactly the same answer as a wrong password — and counts as
  a failure — so the main site cannot be used to find or guess admin logins.
*/

/** Main website: merchants and riders. */
export const login = mutation({
  args: { phone: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<LoginResult> => attemptLogin(ctx, args, ["merchant", "rider"]),
});

/** Admin website only. */
export const adminLogin = mutation({
  args: { phone: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<LoginResult> => attemptLogin(ctx, args, ["admin"]),
});

async function attemptLogin(
  ctx: MutationCtx,
  args: { phone: string; password: string },
  roles: Role[],
): Promise<LoginResult> {
  let phone: string;
  try {
    phone = normalisePhone(args.phone);
  } catch {
    return { ok: false, error: "Wrong phone number or password." };
  }
  if (args.password.length > 128) return { ok: false, error: "Wrong phone number or password." };

  const now = Date.now();
  const since = now - FAILURE_WINDOW_MS;
  const recent = await ctx.db
    .query("loginFailures")
    .withIndex("by_phone_and_at", (q) => q.eq("phone", phone).gte("at", since))
    .take(MAX_FAILURES + 1);
  if (recent.length >= MAX_FAILURES) {
    return {
      ok: false,
      error: "Too many wrong attempts. This account is locked for 15 minutes.",
    };
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .unique();

  /*
    Unknown phone still pays for a full derivation, so the response time
    does not reveal which numbers have accounts.
  */
  const candidate = await derive(
    args.password,
    user?.passwordSalt ?? DECOY_SALT,
    user?.passwordIterations ?? PBKDF2_ITERATIONS,
  );
  if (!user || !timingSafeEqual(candidate, user.passwordHash) || !roles.includes(user.role)) {
    await ctx.db.insert("loginFailures", { phone, at: now });
    const old = await ctx.db
      .query("loginFailures")
      .withIndex("by_at", (q) => q.lt("at", since))
      .take(100);
    for (const f of old) await ctx.db.delete("loginFailures", f._id);
    const left = MAX_FAILURES - recent.length - 1;
    return {
      ok: false,
      error:
        left > 0
          ? `Wrong phone number or password. ${left} ${left === 1 ? "try" : "tries"} left.`
          : "Too many wrong attempts. This account is locked for 15 minutes.",
    };
  }

  if (user.status === "pending") {
    return { ok: false, error: "Your account is waiting for admin approval." };
  }
  if (user.status === "suspended") {
    return { ok: false, error: "This account has been suspended. Contact Morning Rider." };
  }

  for (const f of recent) await ctx.db.delete("loginFailures", f._id);
  const session = await issueSession(ctx, user._id, user.role === "admin" ? ADMIN_SESSION_TTL_MS : undefined);
  return { ok: true, ...session };
}

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx, args.token);
    if (!user) return null;
    const tokenHash = await sha256Hex(args.token);
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (session) await ctx.db.delete("sessions", session._id);
    return null;
  },
});

/** The signed-in user's safe profile, or null. Never returns password fields. */
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx, args.token);
    if (!user) return null;
    return {
      _id: user._id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      businessName: user.businessName,
      pickupAddress: user.pickupAddress,
      payoutMethod: user.payoutMethod,
      payoutAccount: user.payoutAccount,
      riderArea: user.riderArea,
    };
  },
});

/** Public merchant sign-up. The account stays `pending` until an admin approves it. */
export const registerMerchant = mutation({
  args: {
    name: v.string(),
    businessName: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    pickupAddress: v.string(),
    payoutMethod,
    payoutAccount: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const phone = normalisePhone(args.phone);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (existing) throw new ConvexError("An account with this phone number already exists.");

    const email = clean(args.email, 120, "Email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError("Enter a valid email address.");
    }

    await ctx.db.insert("users", {
      name: required(args.name, 80, "Name"),
      businessName: required(args.businessName, 100, "Business name"),
      phone,
      email: email || undefined,
      pickupAddress: required(args.pickupAddress, 300, "Pickup address"),
      payoutMethod: args.payoutMethod,
      payoutAccount: required(args.payoutAccount, 100, "Payment account"),
      role: "merchant",
      status: "pending",
      ...(await hashPassword(args.password)),
      createdAt: Date.now(),
    });
    return null;
  },
});

export const changePassword = mutation({
  args: { token: v.string(), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await currentUser(ctx, args.token);
    if (!user) throw new ConvexError("Not signed in.");
    const candidate = await derive(
      args.currentPassword.slice(0, 128),
      user.passwordSalt,
      user.passwordIterations,
    );
    if (!timingSafeEqual(candidate, user.passwordHash)) {
      throw new ConvexError("Current password is wrong.");
    }
    await ctx.db.patch("users", user._id, await hashPassword(args.newPassword));
    // Sign out every other device; this one gets a fresh session.
    await revokeSessions(ctx, user._id);
    return await issueSession(ctx, user._id, user.role === "admin" ? ADMIN_SESSION_TTL_MS : undefined);
  },
});

/**
 * Creates (or resets) an admin. Internal on purpose — there is no public way
 * to become an admin. Run with the Convex CLI:
 *
 *   npx convex run --prod auth:createAdmin '{"name":"Siyam","phone":"01XXXXXXXXX","password":"..."}'
 */
export const createAdmin = internalMutation({
  args: { name: v.string(), phone: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const phone = normalisePhone(args.phone);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    const fields = {
      name: required(args.name, 80, "Name"),
      role: "admin" as const,
      status: "active" as const,
      ...(await hashPassword(args.password)),
    };
    if (existing) {
      await ctx.db.patch("users", existing._id, fields);
      await revokeSessions(ctx, existing._id);
      return `Admin ${phone} updated.`;
    }
    await ctx.db.insert("users", { ...fields, phone, createdAt: Date.now() });
    return `Admin ${phone} created.`;
  },
});
