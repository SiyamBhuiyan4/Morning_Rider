import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";

/*
  Messages between the office and a merchant, inside the app.

  Anti-spam rules (Siyam's):
  - a merchant can send at most MERCHANT_LIMIT messages in a row;
  - the count goes back to 0 when the office replies, or when the office
    presses "Seen, allow 5 more";
  - a message is at most MAX_WORDS words.
*/
export const MERCHANT_LIMIT = 5;
export const MAX_WORDS = 1000;
const MAX_CHARS = 8000;

function cleanBody(raw: string) {
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (!body) throw new ConvexError("Write a message first.");
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > MAX_WORDS) throw new ConvexError(`A message can have at most ${MAX_WORDS} words.`);
  if (body.length > MAX_CHARS) throw new ConvexError("This message is too long.");
  return body;
}

const preview = (body: string) => (body.length > 90 ? body.slice(0, 90) + "…" : body);

async function threadOf(ctx: QueryCtx | MutationCtx, merchantId: Id<"users">) {
  return await ctx.db
    .query("chatThreads")
    .withIndex("by_merchantId", (q) => q.eq("merchantId", merchantId))
    .unique();
}

async function messagesOf(ctx: QueryCtx, merchantId: Id<"users">) {
  const rows = await ctx.db
    .query("chatMessages")
    .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", merchantId))
    .order("desc")
    .take(150);
  return rows.reverse().map((m) => ({ _id: m._id, from: m.from, body: m.body, createdAt: m.createdAt }));
}

/* ---------------------------------------------------------------- merchant */

/** The merchant's own conversation with the office. */
export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.token, ["merchant"]);
    const thread = await threadOf(ctx, me._id);
    return {
      messages: await messagesOf(ctx, me._id),
      unread: thread?.merchantUnread ?? 0,
      left: MERCHANT_LIMIT - (thread?.merchantSent ?? 0),
      limit: MERCHANT_LIMIT,
      maxWords: MAX_WORDS,
      officeSeenAt: thread?.adminSeenAt ?? null,
    };
  },
});

export const send = mutation({
  args: { token: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.token, ["merchant"]);
    const body = cleanBody(args.body);
    const thread = await threadOf(ctx, me._id);
    if ((thread?.merchantSent ?? 0) >= MERCHANT_LIMIT) {
      throw new ConvexError(`You can send ${MERCHANT_LIMIT} messages until Morning Rider replies.`);
    }
    const now = Date.now();
    await ctx.db.insert("chatMessages", { merchantId: me._id, from: "merchant", body, createdAt: now });
    if (thread) {
      await ctx.db.patch("chatThreads", thread._id, {
        lastMessageAt: now,
        lastBody: preview(body),
        lastFrom: "merchant",
        adminUnread: thread.adminUnread + 1,
        merchantSent: thread.merchantSent + 1,
        merchantUnread: 0,
        merchantSeenAt: now,
      });
    } else {
      await ctx.db.insert("chatThreads", {
        merchantId: me._id,
        lastMessageAt: now,
        lastBody: preview(body),
        lastFrom: "merchant",
        adminUnread: 1,
        merchantUnread: 0,
        merchantSent: 1,
        merchantSeenAt: now,
      });
    }
    return { left: MERCHANT_LIMIT - ((thread?.merchantSent ?? 0) + 1) };
  },
});

/** Merchant opened the chat: office messages are now read. */
export const markSeen = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.token, ["merchant"]);
    const thread = await threadOf(ctx, me._id);
    if (thread && thread.merchantUnread > 0) {
      await ctx.db.patch("chatThreads", thread._id, { merchantUnread: 0, merchantSeenAt: Date.now() });
    }
    return null;
  },
});

/* ------------------------------------------------------------------- admin */

/** Conversations, newest first, for the Messages page. */
export const threads = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const rows = await ctx.db.query("chatThreads").withIndex("by_lastMessageAt").order("desc").take(200);
    const out = [];
    for (const r of rows) {
      const m = await ctx.db.get("users", r.merchantId);
      if (!m) continue;
      out.push({
        merchantId: r.merchantId,
        name: m.businessName ?? m.name,
        owner: m.name,
        phone: m.phone,
        demo: m.demo ?? false,
        lastMessageAt: r.lastMessageAt,
        lastBody: r.lastBody,
        lastFrom: r.lastFrom,
        unread: r.adminUnread,
        merchantSent: r.merchantSent,
      });
    }
    return out;
  },
});

/** How many conversations have unread merchant messages (red dot in the menu). */
export const unreadCount = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const rows = await ctx.db.query("chatThreads").withIndex("by_lastMessageAt").order("desc").take(500);
    return rows.filter((r) => r.adminUnread > 0).length;
  },
});

export const conversation = query({
  args: { token: v.string(), merchantId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const m = await ctx.db.get("users", args.merchantId);
    if (!m || m.role !== "merchant") return null;
    const thread = await threadOf(ctx, m._id);
    return {
      merchant: { _id: m._id, name: m.businessName ?? m.name, owner: m.name, phone: m.phone, status: m.status },
      messages: await messagesOf(ctx, m._id),
      unread: thread?.adminUnread ?? 0,
      merchantSent: thread?.merchantSent ?? 0,
      limit: MERCHANT_LIMIT,
      maxWords: MAX_WORDS,
      merchantSeenAt: thread?.merchantSeenAt ?? null,
    };
  },
});

async function requireMerchant(ctx: MutationCtx, merchantId: Id<"users">): Promise<Doc<"users">> {
  const m = await ctx.db.get("users", merchantId);
  if (!m || m.role !== "merchant") throw new ConvexError("Merchant not found.");
  return m;
}

/** Office reply. Also gives the merchant their 5 messages back. */
export const adminSend = mutation({
  args: { token: v.string(), merchantId: v.id("users"), body: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const m = await requireMerchant(ctx, args.merchantId);
    const body = cleanBody(args.body);
    const now = Date.now();
    await ctx.db.insert("chatMessages", { merchantId: m._id, from: "admin", body, createdAt: now });
    const thread = await threadOf(ctx, m._id);
    if (thread) {
      await ctx.db.patch("chatThreads", thread._id, {
        lastMessageAt: now,
        lastBody: preview(body),
        lastFrom: "admin",
        merchantUnread: thread.merchantUnread + 1,
        adminUnread: 0,
        adminSeenAt: now,
        merchantSent: 0,
      });
    } else {
      await ctx.db.insert("chatThreads", {
        merchantId: m._id,
        lastMessageAt: now,
        lastBody: preview(body),
        lastFrom: "admin",
        adminUnread: 0,
        merchantUnread: 1,
        merchantSent: 0,
        adminSeenAt: now,
      });
    }
    return null;
  },
});

/** Office opened the conversation: the merchant's messages are now seen. */
export const adminMarkSeen = mutation({
  args: { token: v.string(), merchantId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const thread = await threadOf(ctx, args.merchantId);
    if (thread && thread.adminUnread > 0) {
      await ctx.db.patch("chatThreads", thread._id, { adminUnread: 0, adminSeenAt: Date.now() });
    }
    return null;
  },
});

/** "Seen, allow 5 more": the merchant can send 5 messages again without a reply. */
export const resetLimit = mutation({
  args: { token: v.string(), merchantId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const thread = await threadOf(ctx, args.merchantId);
    if (!thread) throw new ConvexError("No conversation with this merchant yet.");
    await ctx.db.patch("chatThreads", thread._id, { merchantSent: 0, adminUnread: 0, adminSeenAt: Date.now() });
    return null;
  },
});

/** Removes a merchant's whole conversation (used when demo data is cleared). */
export async function removeChat(ctx: MutationCtx, merchantId: Id<"users">) {
  const thread = await threadOf(ctx, merchantId);
  if (thread) await ctx.db.delete("chatThreads", thread._id);
  const msgs = await ctx.db
    .query("chatMessages")
    .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", merchantId))
    .take(2000);
  for (const m of msgs) await ctx.db.delete("chatMessages", m._id);
}
