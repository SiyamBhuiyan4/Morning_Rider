import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { clean, hashPassword, revokeSessions } from "./auth";

/** Lower-cased, trimmed email; checks the shape. Empty string if none and not required. */
export function cleanEmail(raw: string | undefined, isRequired: boolean) {
  const email = clean(raw, 120, "Email").toLowerCase();
  if (!email) {
    if (isRequired) throw new ConvexError("Email is required.");
    return "";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("Enter a valid email address.");
  return email;
}

/** Throws if another account already uses this email. */
export async function assertEmailFree(ctx: QueryCtx | MutationCtx, email: string, self?: Id<"users">) {
  if (!email) return;
  const other = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (other && other._id !== self) throw new ConvexError("This email is already used by another account.");
}

/**
 * Sets a new password chosen by the office, signs the person out everywhere
 * and, when they have an email address, emails them the new password.
 * Returns the email log id (or null when there is no email to send to).
 */
export async function setPasswordAndEmail(ctx: MutationCtx, user: Doc<"users">, password: string) {
  const pw = password.trim();
  await ctx.db.patch("users", user._id, { ...(await hashPassword(pw)), failedLogins: 0 });
  await revokeSessions(ctx, user._id);
  if (!user.email) return null;
  // example.com is reserved for examples (the demo accounts): never really send there.
  if (user.email.endsWith("@example.com")) {
    return await ctx.db.insert("emailLog", {
      userId: user._id,
      to: user.email,
      kind: "password",
      status: "failed",
      error: "Demo address (example.com), not sent.",
      at: Date.now(),
    });
  }
  const logId = await ctx.db.insert("emailLog", {
    userId: user._id,
    to: user.email,
    kind: "password",
    status: "queued",
    at: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.mailer.sendPassword, {
    logId,
    to: user.email,
    name: user.businessName ?? user.name,
    phone: user.phone,
    role: user.role === "rider" ? "rider" : "merchant",
    password: pw,
  });
  return logId;
}

/** Removes someone's password requests and email history (demo clean-up, deleting a rider). */
export async function removeSupportRecords(ctx: MutationCtx, userId: Id<"users">) {
  for (const st of ["open", "done", "dismissed"] as const) {
    const rows = await ctx.db
      .query("passwordRequests")
      .withIndex("by_userId_and_status", (q) => q.eq("userId", userId).eq("status", st))
      .take(200);
    for (const r of rows) await ctx.db.delete("passwordRequests", r._id);
  }
  const logs = await ctx.db
    .query("emailLog")
    .withIndex("by_userId_and_at", (q) => q.eq("userId", userId))
    .take(500);
  for (const l of logs) await ctx.db.delete("emailLog", l._id);
}
