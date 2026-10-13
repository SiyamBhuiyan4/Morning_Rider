import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { normalisePhone, requireUser } from "./lib/auth";
import { cleanEmail, setPasswordAndEmail } from "./lib/email";

/*
  "Forgot password" for merchants (Siyam's flow):
  1. On the login page the merchant finds their account by phone or email.
  2. They send ONE request to the office (no more until it's handled).
  3. The office sets a new password; it is emailed to the merchant.

  The public side only ever shows a masked name/email, and lookups are
  rate-limited site-wide so the form can't be used to list accounts.
*/
const LOOKUPS_PER_HOUR = 200;

function maskName(s: string) {
  return s
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w : w.slice(0, 2) + "•".repeat(Math.min(6, w.length - 2))))
    .join(" ");
}
function maskEmail(e: string | undefined) {
  if (!e) return null;
  const [user, domain] = e.split("@");
  return `${user.slice(0, 2)}${"•".repeat(Math.max(2, Math.min(6, user.length - 2)))}@${domain}`;
}
const maskPhone = (p: string) => `${p.slice(0, 3)}•••••${p.slice(-3)}`;

async function lookup(ctx: MutationCtx, raw: string): Promise<Doc<"users"> | null> {
  const hourAgo = Date.now() - 3_600_000;
  const recent = await ctx.db
    .query("supportLookups")
    .withIndex("by_at", (q) => q.gte("at", hourAgo))
    .take(LOOKUPS_PER_HOUR);
  if (recent.length >= LOOKUPS_PER_HOUR) {
    throw new ConvexError("Too many searches right now. Please try again in an hour or call Morning Rider.");
  }
  await ctx.db.insert("supportLookups", { at: Date.now() });
  const old = await ctx.db
    .query("supportLookups")
    .withIndex("by_at", (q) => q.lt("at", hourAgo))
    .take(50);
  for (const o of old) await ctx.db.delete("supportLookups", o._id);

  const q = raw.trim().slice(0, 120);
  let user: Doc<"users"> | null = null;
  if (q.includes("@")) {
    const email = cleanEmail(q, true);
    user = await ctx.db
      .query("users")
      .withIndex("by_email", (x) => x.eq("email", email))
      .first();
  } else {
    let phone: string;
    try {
      phone = normalisePhone(q);
    } catch {
      throw new ConvexError("Enter the phone number (01XXXXXXXXX) or email you signed up with.");
    }
    user = await ctx.db
      .query("users")
      .withIndex("by_phone", (x) => x.eq("phone", phone))
      .unique();
  }
  return user && user.role === "merchant" ? user : null;
}

async function openRequestOf(ctx: MutationCtx, user: Doc<"users">) {
  return await ctx.db
    .query("passwordRequests")
    .withIndex("by_userId_and_status", (q) => q.eq("userId", user._id).eq("status", "open"))
    .first();
}

/** Step 1: find the account. Shows only masked details. */
export const findAccount = mutation({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await lookup(ctx, args.query);
    if (!user) return { found: false as const };
    return {
      found: true as const,
      name: maskName(user.businessName ?? user.name),
      phone: maskPhone(user.phone),
      email: maskEmail(user.email),
      alreadyRequested: (await openRequestOf(ctx, user)) !== null,
    };
  },
});

/** Step 2: send the request to the office, once. */
export const requestReset = mutation({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await lookup(ctx, args.query);
    if (!user) throw new ConvexError("No merchant account found with that phone number or email.");
    if (await openRequestOf(ctx, user)) return { alreadyRequested: true };
    await ctx.db.insert("passwordRequests", { userId: user._id, status: "open", createdAt: Date.now() });
    return { alreadyRequested: false };
  },
});

/* ------------------------------------------------------------------ office */

export const openRequests = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const rows = await ctx.db
      .query("passwordRequests")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "open"))
      .order("desc")
      .take(100);
    const out = [];
    for (const r of rows) {
      const u = await ctx.db.get("users", r.userId);
      if (!u) continue;
      out.push({
        _id: r._id,
        userId: u._id,
        name: u.businessName ?? u.name,
        owner: u.name,
        phone: u.phone,
        email: u.email ?? null,
        createdAt: r.createdAt,
      });
    }
    return out;
  },
});

/** Set a new password for the person who asked; it is emailed to them. */
export const resolve = mutation({
  args: { token: v.string(), requestId: v.id("passwordRequests"), password: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const req = await ctx.db.get("passwordRequests", args.requestId);
    if (!req || req.status !== "open") throw new ConvexError("This request was already handled.");
    const user = await ctx.db.get("users", req.userId);
    if (!user) throw new ConvexError("User not found.");
    const logId = await setPasswordAndEmail(ctx, user, args.password);
    await ctx.db.patch("passwordRequests", req._id, { status: "done", doneAt: Date.now() });
    return { logId, email: user.email ?? null, phone: user.phone, name: user.businessName ?? user.name };
  },
});

export const dismiss = mutation({
  args: { token: v.string(), requestId: v.id("passwordRequests") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const req = await ctx.db.get("passwordRequests", args.requestId);
    if (req && req.status === "open") await ctx.db.patch("passwordRequests", req._id, { status: "dismissed", doneAt: Date.now() });
    return null;
  },
});

/** Live status of one email (queued → sent / failed), for the office's screen. */
export const emailStatus = query({
  args: { token: v.string(), logId: v.id("emailLog") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const log = await ctx.db.get("emailLog", args.logId);
    return log ? { status: log.status, to: log.to, error: log.error ?? null } : null;
  },
});

export const markEmail = internalMutation({
  args: { logId: v.id("emailLog"), status: v.union(v.literal("sent"), v.literal("failed")), error: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const log = await ctx.db.get("emailLog", args.logId);
    if (log) await ctx.db.patch("emailLog", log._id, { status: args.status, error: args.error });
    return null;
  },
});
