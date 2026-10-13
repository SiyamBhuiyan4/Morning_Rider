import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

/*
  Phone + password sign-in for admins, merchants and riders.

  What is stored:
    - a PBKDF2-SHA256 derivation of each password with a per-user random salt.
      The password itself never touches the database or a log.
    - for each session, the SHA-256 of the token. The token goes to the browser
      once and is never stored, so leaking the sessions table logs no one in.

  Convex functions are public HTTP endpoints, so the UI hiding a page protects
  nothing. Every data function calls `requireUser` with the roles it allows,
  and every merchant/rider read is further scoped to that user's own rows.
*/

export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Admins hold the keys to money and accounts, so their sessions are short. */
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const PBKDF2_ITERATIONS = 210_000;
/** Stored in the admin account's phone field. Not a phone number, so it never collides. */
export const ADMIN_LOGIN_ID = "admin";
export const MIN_PASSWORD_LENGTH = 8;

export type Role = Doc<"users">["role"];
export type Ctx = QueryCtx | MutationCtx;

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): ArrayBuffer {
  const buffer = new ArrayBuffer(hex.length / 2);
  const out = new Uint8Array(buffer);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return buffer;
}

export async function derive(password: string, saltHex: string, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function sha256Hex(input: string) {
  return toHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input)));
}

/** Constant-time compare, so a wrong guess cannot be timed. */
export function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function randomHex(bytes: number) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string) {
  checkPasswordStrength(password);
  const passwordSalt = randomHex(16);
  return {
    passwordSalt,
    passwordIterations: PBKDF2_ITERATIONS,
    passwordHash: await derive(password, passwordSalt, PBKDF2_ITERATIONS),
  };
}

export function checkPasswordStrength(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ConvexError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > 128) throw new ConvexError("Password is too long.");
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new ConvexError("Password needs at least one letter and one number.");
  }
}

/** Accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX → 01XXXXXXXXX. */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  const local = digits.startsWith("880") ? "0" + digits.slice(3) : digits;
  if (!/^01[3-9]\d{8}$/.test(local)) {
    throw new ConvexError("Enter a valid Bangladeshi mobile number (01XXXXXXXXX).");
  }
  return local;
}

/**
 * Resolves the session token to an active user with one of `roles`, or throws.
 * The only way any data function learns who is calling.
 */
export async function requireUser(ctx: Ctx, token: string, roles: Role[]) {
  const user = await currentUser(ctx, token);
  if (!user) throw new ConvexError("Not signed in.");
  if (!roles.includes(user.role)) throw new ConvexError("You do not have access to this.");
  return user;
}

/** Same lookup as `requireUser`, but returns null instead of throwing. */
export async function currentUser(ctx: Ctx, token: string) {
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const tokenHash = await sha256Hex(token);
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_tokenHash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!session || session.expiresAt <= Date.now()) return null;
  const user = await ctx.db.get("users", session.userId);
  if (!user || user.status !== "active") return null;
  return user;
}

export async function issueSession(ctx: MutationCtx, userId: Doc<"users">["_id"], ttlMs = SESSION_TTL_MS) {
  const stale = await ctx.db
    .query("sessions")
    .withIndex("by_expiresAt", (q) => q.lt("expiresAt", Date.now()))
    .take(50);
  for (const s of stale) await ctx.db.delete("sessions", s._id);

  const token = randomHex(32);
  const expiresAt = Date.now() + ttlMs;
  await ctx.db.insert("sessions", { userId, tokenHash: await sha256Hex(token), expiresAt });
  return { token, expiresAt };
}

export async function revokeSessions(ctx: MutationCtx, userId: Doc<"users">["_id"]) {
  const sessions = await ctx.db
    .query("sessions")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .take(200);
  for (const s of sessions) await ctx.db.delete("sessions", s._id);
}

/** Trims and caps free text coming from the client. */
export function clean(value: string | undefined, max: number, field: string) {
  const out = (value ?? "").trim();
  if (out.length > max) throw new ConvexError(`${field} is too long (max ${max} characters).`);
  return out;
}

export function required(value: string | undefined, max: number, field: string) {
  const out = clean(value, max, field);
  if (!out) throw new ConvexError(`${field} is required.`);
  return out;
}

/** A one-off password handed out by an admin; the user should change it. */
export function temporaryPassword() {
  return "Mr" + randomHex(4) + "-" + randomHex(2) + "7";
}
