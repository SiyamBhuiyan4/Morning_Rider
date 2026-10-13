import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUser } from "./lib/auth";

/*
  Messages between the office and a merchant or a rider, inside the app.
  Merchants and riders are separate inboxes for the office.

  Anti-spam rules (Siyam's):
  - a merchant can send at most 5 messages in a row, a rider at most 100;
  - the count goes back to 0 when the office replies, or when the office
    presses "Seen, allow more";
  - a message is at most MAX_WORDS words.
*/
export const LIMIT = { merchant: 5, rider: 100 } as const;
export const MAX_WORDS = 1000;
const MAX_CHARS = 8000;

type ChatRole = keyof typeof LIMIT;
const chatRole = v.union(v.literal("merchant"), v.literal("rider"));

function cleanBody(raw: string) {
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (!body) throw new ConvexError("Write a message first.");
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words > MAX_WORDS) throw new ConvexError(`A message can have at most ${MAX_WORDS} words.`);
  if (body.length > MAX_CHARS) throw new ConvexError("This message is too long.");
  return body;
}

const preview = (body: string) => (body.length > 90 ? body.slice(0, 90) + "…" : body);

async function threadOf(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db
    .query("chatThreads")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
}

async function messagesOf(ctx: QueryCtx, userId: Id<"users">) {
  const rows = await ctx.db
    .query("chatMessages")
    .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
    .order("desc")
    .take(150);
  return rows.reverse().map((m) => ({ _id: m._id, from: m.from, body: m.body, createdAt: m.createdAt }));
}

/* ------------------------------------------------- merchant or rider (own) */

/** The signed-in merchant's or rider's own conversation with the office. */
export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.token, ["merchant", "rider"]);
    const role = me.role as ChatRole;
    const thread = await threadOf(ctx, me._id);
    return {
      messages: await messagesOf(ctx, me._id),
      unread: thread?.userUnread ?? 0,
      left: LIMIT[role] - (thread?.userSent ?? 0),
      limit: LIMIT[role],
      maxWords: MAX_WORDS,
      officeSeenAt: thread?.adminSeenAt ?? null,
    };
  },
});

export const send = mutation({
  args: { token: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.token, ["merchant", "rider"]);
    const role = me.role as ChatRole;
    const body = cleanBody(args.body);
    const thread = await threadOf(ctx, me._id);
    if ((thread?.userSent ?? 0) >= LIMIT[role]) {
      throw new ConvexError(`You can send ${LIMIT[role]} messages until Morning Rider replies.`);
    }
    const now = Date.now();
    await ctx.db.insert("chatMessages", { userId: me._id, from: "user", body, createdAt: now });
    if (thread) {
      await ctx.db.patch("chatThreads", thread._id, {
        lastMessageAt: now,
        lastBody: preview(body),
        lastFrom: "user",
        adminUnread: thread.adminUnread + 1,
        userSent: thread.userSent + 1,
        userUnread: 0,
        userSeenAt: now,
      });
    } else {
      await ctx.db.insert("chatThreads", {
        userId: me._id,
        role,
        lastMessageAt: now,
        lastBody: preview(body),
        lastFrom: "user",
        adminUnread: 1,
        userUnread: 0,
        userSent: 1,
        userSeenAt: now,
      });
    }
    return { left: LIMIT[role] - ((thread?.userSent ?? 0) + 1) };
  },
});

/** Opened the chat: the office's messages are now read. */
export const markSeen = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.token, ["merchant", "rider"]);
    const thread = await threadOf(ctx, me._id);
    if (thread && thread.userUnread > 0) {
      await ctx.db.patch("chatThreads", thread._id, { userUnread: 0, userSeenAt: Date.now() });
    }
    return null;
  },
});

/* ------------------------------------------------------------------- admin */

/** One inbox (merchants or riders), newest first. */
export const threads = query({
  args: { token: v.string(), role: chatRole },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const rows = await ctx.db
      .query("chatThreads")
      .withIndex("by_role_and_lastMessageAt", (q) => q.eq("role", args.role))
      .order("desc")
      .take(200);
    const out = [];
    for (const r of rows) {
      const u = await ctx.db.get("users", r.userId);
      if (!u) continue;
      out.push({
        userId: r.userId,
        name: u.businessName ?? u.name,
        owner: u.name,
        phone: u.phone,
        demo: u.demo ?? false,
        lastMessageAt: r.lastMessageAt,
        lastBody: r.lastBody,
        lastFrom: r.lastFrom,
        unread: r.adminUnread,
        userSent: r.userSent,
      });
    }
    return out;
  },
});

/** Conversations with unread messages, per inbox (the red dots in the menu). */
export const unreadCount = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const count = async (role: ChatRole) =>
      (
        await ctx.db
          .query("chatThreads")
          .withIndex("by_role_and_lastMessageAt", (q) => q.eq("role", role))
          .order("desc")
          .take(500)
      ).filter((r) => r.adminUnread > 0).length;
    return { merchant: await count("merchant"), rider: await count("rider") };
  },
});

export const conversation = query({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const u = await ctx.db.get("users", args.userId);
    if (!u || (u.role !== "merchant" && u.role !== "rider")) return null;
    const thread = await threadOf(ctx, u._id);
    return {
      user: { _id: u._id, role: u.role, name: u.businessName ?? u.name, owner: u.name, phone: u.phone, status: u.status },
      messages: await messagesOf(ctx, u._id),
      unread: thread?.adminUnread ?? 0,
      userSent: thread?.userSent ?? 0,
      limit: LIMIT[u.role],
      maxWords: MAX_WORDS,
      userSeenAt: thread?.userSeenAt ?? null,
    };
  },
});

async function requireChatUser(ctx: MutationCtx, userId: Id<"users">): Promise<Doc<"users"> & { role: ChatRole }> {
  const u = await ctx.db.get("users", userId);
  if (!u || (u.role !== "merchant" && u.role !== "rider")) throw new ConvexError("User not found.");
  return u as Doc<"users"> & { role: ChatRole };
}

/** Office reply. Also gives them their full message allowance back. */
export const adminSend = mutation({
  args: { token: v.string(), userId: v.id("users"), body: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const u = await requireChatUser(ctx, args.userId);
    const body = cleanBody(args.body);
    const now = Date.now();
    await ctx.db.insert("chatMessages", { userId: u._id, from: "admin", body, createdAt: now });
    const thread = await threadOf(ctx, u._id);
    if (thread) {
      await ctx.db.patch("chatThreads", thread._id, {
        lastMessageAt: now,
        lastBody: preview(body),
        lastFrom: "admin",
        userUnread: thread.userUnread + 1,
        adminUnread: 0,
        adminSeenAt: now,
        userSent: 0,
      });
    } else {
      await ctx.db.insert("chatThreads", {
        userId: u._id,
        role: u.role,
        lastMessageAt: now,
        lastBody: preview(body),
        lastFrom: "admin",
        adminUnread: 0,
        userUnread: 1,
        userSent: 0,
        adminSeenAt: now,
      });
    }
    return null;
  },
});

/** Office opened the conversation: their messages are now seen. */
export const adminMarkSeen = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const thread = await threadOf(ctx, args.userId);
    if (thread && thread.adminUnread > 0) {
      await ctx.db.patch("chatThreads", thread._id, { adminUnread: 0, adminSeenAt: Date.now() });
    }
    return null;
  },
});

/** "Seen, allow more": they can send their full allowance again without a reply. */
export const resetLimit = mutation({
  args: { token: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const thread = await threadOf(ctx, args.userId);
    if (!thread) throw new ConvexError("No conversation with this person yet.");
    await ctx.db.patch("chatThreads", thread._id, { userSent: 0, adminUnread: 0, adminSeenAt: Date.now() });
    return null;
  },
});

/** Removes someone's whole conversation (demo clean-up, deleting a rider). */
export async function removeChat(ctx: MutationCtx, userId: Id<"users">) {
  const thread = await threadOf(ctx, userId);
  if (thread) await ctx.db.delete("chatThreads", thread._id);
  const msgs = await ctx.db
    .query("chatMessages")
    .withIndex("by_userId_and_createdAt", (q) => q.eq("userId", userId))
    .take(2000);
  for (const m of msgs) await ctx.db.delete("chatMessages", m._id);
}
