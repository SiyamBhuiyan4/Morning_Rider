import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { clean, normalisePhone, required, requireUser } from "./lib/auth";

/*
  Merchant business verification (Siyam's rule): anyone can open a merchant
  account, but parcels can be sent only once an admin has checked the
  business documents.

    merchant uploads files (generateUploadUrl) → submit → "submitted"
    admin approves → "approved"   (parcels.create is unlocked)
    admin rejects with a reason → "rejected" → merchant fixes and resubmits

  `users.verification` is the source of truth for the gate; the
  `merchantVerifications` row holds the documents. A merchant has at most one
  row: resubmitting replaces the rejected row and deletes its files.

  Files are private. Only admins get URLs (signed, short-lived), and every
  file id is recorded in `verificationFiles` so an upload can't be claimed by
  a second merchant or reused across rows.
*/

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_OTHER_FILES = 5;
const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/** NID: 10 (smart card), 13 or 17 (old) digits. Spaces/dashes and Bangla digits are accepted. */
function normaliseNid(raw: string) {
  const digits = raw
    .replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)))
    .replace(/[\s-]/g, "");
  if (!/^(\d{10}|\d{13}|\d{17})$/.test(digits)) {
    throw new ConvexError("Enter a valid NID number (10, 13 or 17 digits).");
  }
  return digits;
}

async function latestRow(ctx: QueryCtx | MutationCtx, merchantId: Id<"users">) {
  return await ctx.db
    .query("merchantVerifications")
    .withIndex("by_merchantId_and_submittedAt", (q) => q.eq("merchantId", merchantId))
    .order("desc")
    .first();
}

function filesOf(row: Doc<"merchantVerifications">) {
  const out: (Id<"_storage"> | string)[] = [row.nidFront, row.nidBack];
  if (row.tinFile) out.push(row.tinFile);
  if (row.tradeLicenseFile) out.push(row.tradeLicenseFile);
  return [...out, ...row.otherFiles];
}

/** Deletes a stored file and its claim. Safe if either is already gone. */
async function deleteFile(ctx: MutationCtx, storageId: Id<"_storage"> | string) {
  const claims = await ctx.db
    .query("verificationFiles")
    .withIndex("by_storageId", (q) => q.eq("storageId", storageId))
    .take(10);
  for (const c of claims) await ctx.db.delete("verificationFiles", c._id);
  if (typeof storageId === "string" && (storageId.startsWith("http") || storageId.startsWith("BQAC"))) return;
  if (await ctx.db.system.get("_storage", storageId as Id<"_storage">)) await ctx.storage.delete(storageId as Id<"_storage">);
}

/** Removes every verification row and file of a merchant (demo clear, support reset). */
export async function removeVerification(ctx: MutationCtx, merchantId: Id<"users">) {
  const rows = await ctx.db
    .query("merchantVerifications")
    .withIndex("by_merchantId_and_submittedAt", (q) => q.eq("merchantId", merchantId))
    .take(50);
  for (const row of rows) {
    for (const f of filesOf(row)) await deleteFile(ctx, f);
    await ctx.db.delete("merchantVerifications", row._id);
  }
  // Uploads claimed but no longer in a row.
  const claims = await ctx.db
    .query("verificationFiles")
    .withIndex("by_merchantId", (q) => q.eq("merchantId", merchantId))
    .take(100);
  for (const c of claims) await deleteFile(ctx, c.storageId);
}

function canSubmit(user: Doc<"users">) {
  return user.verification === undefined || user.verification === "rejected";
}

/* -------------------------------------------------------------- merchant */

export const generateUploadUrl = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["merchant"]);
    if (!canSubmit(user)) throw new ConvexError("Your documents are already submitted.");
    return await ctx.storage.generateUploadUrl();
  },
});

export const submit = mutation({
  args: {
    token: v.string(),
    nidNumber: v.string(),
    nidFront: v.union(v.id("_storage"), v.string()),
    nidBack: v.union(v.id("_storage"), v.string()),
    tinNumber: v.optional(v.string()),
    tinFile: v.optional(v.union(v.id("_storage"), v.string())),
    tradeLicenseNumber: v.optional(v.string()),
    tradeLicenseFile: v.optional(v.union(v.id("_storage"), v.string())),
    otherFiles: v.optional(v.array(v.union(v.id("_storage"), v.string()))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["merchant"]);
    if (user.verification === "submitted") throw new ConvexError("Your documents are already submitted.");
    if (user.verification === "approved") throw new ConvexError("Your business is already verified.");

    const nidNumber = normaliseNid(clean(args.nidNumber, 40, "NID number"));
    const tinNumber = clean(args.tinNumber, 30, "TIN number") || undefined;
    const tradeLicenseNumber = clean(args.tradeLicenseNumber, 50, "Trade licence number") || undefined;
    const otherFiles = args.otherFiles ?? [];
    if (otherFiles.length > MAX_OTHER_FILES) {
      throw new ConvexError(`Add at most ${MAX_OTHER_FILES} other documents.`);
    }

    const files = [args.nidFront, args.nidBack, ...otherFiles];
    if (args.tinFile) files.push(args.tinFile);
    if (args.tradeLicenseFile) files.push(args.tradeLicenseFile);
    if (new Set(files).size !== files.length) throw new ConvexError("The same file was added twice.");

    for (const id of files) {
      if (typeof id === "string" && (id.startsWith("http") || id.startsWith("BQAC"))) {
        // External Telegram CDN file
      } else {
        const meta = await ctx.db.system.get("_storage", id as Id<"_storage">);
        if (!meta) throw new ConvexError("A file was not uploaded. Please add it again.");
        if (meta.size > MAX_FILE_BYTES) throw new ConvexError("Each file must be 5 MB or smaller.");
        if (!meta.contentType || !FILE_TYPES.includes(meta.contentType)) {
          throw new ConvexError("Files must be JPG, PNG, WebP or PDF.");
        }
      }
      // A file already in a verification may only be carried over from this
      // merchant's own rejected submission.
      const claim = await ctx.db
        .query("verificationFiles")
        .withIndex("by_storageId", (q) => q.eq("storageId", id))
        .first();
      if (claim && claim.merchantId !== user._id) throw new ConvexError("A file is already used. Please upload it again.");
    }

    // Resubmission: drop the rejected row and every old file not carried over.
    const keep = new Set<string>(files);
    const old = await ctx.db
      .query("merchantVerifications")
      .withIndex("by_merchantId_and_submittedAt", (q) => q.eq("merchantId", user._id))
      .take(50);
    for (const row of old) {
      for (const f of filesOf(row)) if (!keep.has(f)) await deleteFile(ctx, f);
      await ctx.db.delete("merchantVerifications", row._id);
    }

    for (const id of files) {
      const claimed = await ctx.db
        .query("verificationFiles")
        .withIndex("by_storageId", (q) => q.eq("storageId", id))
        .first();
      if (!claimed) await ctx.db.insert("verificationFiles", { storageId: id, merchantId: user._id });
    }

    await ctx.db.insert("merchantVerifications", {
      merchantId: user._id,
      nidNumber,
      nidFront: args.nidFront,
      nidBack: args.nidBack,
      tinNumber,
      tinFile: args.tinFile,
      tradeLicenseNumber,
      tradeLicenseFile: args.tradeLicenseFile,
      otherFiles,
      status: "submitted",
      submittedAt: Date.now(),
    });
    await ctx.db.patch("users", user._id, { verification: "submitted" });
    return null;
  },
});

export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx, args.token, ["merchant"]);
    const row = await latestRow(ctx, user._id);
    const status = user.verification ?? "none";
    return {
      status,
      reason: status === "rejected" ? row?.reason : undefined,
      submittedAt: status === "none" ? undefined : row?.submittedAt,
    };
  },
});

/* ----------------------------------------------------------------- admin */

/** Waiting for review, oldest first. */
export const pending = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const rows = await ctx.db
      .query("merchantVerifications")
      .withIndex("by_status_and_submittedAt", (q) => q.eq("status", "submitted"))
      .take(200);
    const out = [];
    for (const r of rows) {
      const m = await ctx.db.get("users", r.merchantId);
      if (!m) continue;
      out.push({
        merchantId: r.merchantId,
        merchantName: m.name,
        businessName: m.businessName ?? "",
        phone: m.phone,
        submittedAt: r.submittedAt,
      });
    }
    return out;
  },
});

export const details = query({
  args: { token: v.string(), merchantId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const m = await ctx.db.get("users", args.merchantId);
    if (!m || m.role !== "merchant") return null;
    const row = await latestRow(ctx, m._id);
    if (!row) return null;

    const labelled: { label: "NID front" | "NID back" | "TIN" | "Trade licence" | "Other document"; id: Id<"_storage"> | string }[] = [
      { label: "NID front", id: row.nidFront },
      { label: "NID back", id: row.nidBack },
    ];
    if (row.tinFile) labelled.push({ label: "TIN", id: row.tinFile });
    if (row.tradeLicenseFile) labelled.push({ label: "Trade licence", id: row.tradeLicenseFile });
    for (const id of row.otherFiles) labelled.push({ label: "Other document", id });

    const files = [];
    for (const f of labelled) {
      let url: string | null = null;
      let contentType: string | null = null;
      if (typeof f.id === "string" && (f.id.startsWith("http") || f.id.startsWith("https"))) {
        url = f.id;
        contentType = f.id.toLowerCase().includes(".pdf") ? "application/pdf" : "image/jpeg";
      } else {
        const meta = await ctx.db.system.get("_storage", f.id as Id<"_storage">);
        url = meta ? await ctx.storage.getUrl(f.id as Id<"_storage">) : null;
        contentType = meta?.contentType ?? null;
      }
      files.push({
        label: f.label,
        url,
        contentType,
      });
    }
    return {
      merchantId: m._id,
      merchantName: m.name,
      businessName: m.businessName ?? "",
      phone: m.phone,
      pickupAddress: m.pickupAddress ?? "",
      status: row.status,
      reason: row.reason,
      submittedAt: row.submittedAt,
      nidNumber: row.nidNumber,
      tinNumber: row.tinNumber,
      tradeLicenseNumber: row.tradeLicenseNumber,
      files,
    };
  },
});

async function waitingRow(ctx: MutationCtx, merchantId: Id<"users">) {
  const m = await ctx.db.get("users", merchantId);
  const row = m && m.role === "merchant" ? await latestRow(ctx, m._id) : null;
  if (!m || !row || row.status !== "submitted") throw new ConvexError("There is no verification waiting for review.");
  return row;
}

export const approve = mutation({
  args: { token: v.string(), merchantId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const row = await waitingRow(ctx, args.merchantId);
    await ctx.db.patch("merchantVerifications", row._id, { status: "approved", reason: undefined, decidedAt: Date.now() });
    await ctx.db.patch("users", row.merchantId, { verification: "approved" });
    return null;
  },
});

export const reject = mutation({
  args: { token: v.string(), merchantId: v.id("users"), reason: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const reason = required(args.reason, 300, "Reason");
    const row = await waitingRow(ctx, args.merchantId);
    await ctx.db.patch("merchantVerifications", row._id, { status: "rejected", reason, decidedAt: Date.now() });
    await ctx.db.patch("users", row.merchantId, { verification: "rejected" });
    return null;
  },
});

/*
  Support/testing: wipe a merchant's verification so they start over.
    npx convex run verification:resetMerchant '{"phone":"01700000002"}'
*/
export const resetMerchant = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const phone = normalisePhone(args.phone);
    const m = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (!m || m.role !== "merchant") throw new ConvexError("Merchant not found.");
    await removeVerification(ctx, m._id);
    await ctx.db.patch("users", m._id, { verification: undefined });
    return null;
  },
});
