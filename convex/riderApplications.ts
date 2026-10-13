import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { clean, hashPassword, normalisePhone, required, requireUser, temporaryPassword } from "./lib/auth";

const MAX_PER_HOUR = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Public "Join our team" form. Creates an application, never an account. */
export const apply = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    area: v.string(),
    hasBike: v.boolean(),
    hasLicense: v.boolean(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const phone = normalisePhone(args.phone);
    const email = clean(args.email, 120, "Email");
    if (email && !EMAIL_RE.test(email)) throw new ConvexError("Enter a valid email address.");

    const hourAgo = Date.now() - 60 * 60 * 1000;
    const recent = await ctx.db
      .query("riderApplications")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "new").gte("createdAt", hourAgo))
      .take(MAX_PER_HOUR);
    if (recent.length >= MAX_PER_HOUR) {
      throw new ConvexError("Too many applications right now. Please try again in an hour.");
    }
    const earlier = await ctx.db
      .query("riderApplications")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .take(10);
    if (earlier.some((a) => a.status === "new" || a.status === "interview")) {
      throw new ConvexError("You have already applied. We will contact you soon.");
    }
    await ctx.db.insert("riderApplications", {
      name: required(args.name, 80, "Name"),
      phone,
      email: email || undefined,
      area: required(args.area, 80, "Area"),
      hasBike: args.hasBike,
      hasLicense: args.hasLicense,
      note: clean(args.note, 300, "Note") || undefined,
      status: "new",
      createdAt: Date.now(),
    });
    return null;
  },
});

/** Admin: open applications (new + invited to interview). */
export const list = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const fresh = await ctx.db
      .query("riderApplications")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "new"))
      .order("desc")
      .take(200);
    const invited = await ctx.db
      .query("riderApplications")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", "interview"))
      .order("desc")
      .take(200);
    return [...invited, ...fresh];
  },
});

/** Admin: record the interview invitation (the message itself goes out by email/WhatsApp). */
export const invite = mutation({
  args: { token: v.string(), id: v.id("riderApplications"), interviewAt: v.number(), place: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const app = await ctx.db.get("riderApplications", args.id);
    if (!app || app.status === "hired" || app.status === "rejected") throw new ConvexError("Application not found.");
    if (!Number.isFinite(args.interviewAt)) throw new ConvexError("Choose the interview date and time.");
    await ctx.db.patch("riderApplications", app._id, {
      status: "interview",
      interviewAt: args.interviewAt,
      interviewPlace: required(args.place, 200, "Interview place"),
    });
    return null;
  },
});

/** Admin: after a good interview — creates the rider account. */
export const hire = mutation({
  args: { token: v.string(), id: v.id("riderApplications") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const app = await ctx.db.get("riderApplications", args.id);
    if (!app || app.status === "hired" || app.status === "rejected") throw new ConvexError("Application not found.");
    const clash = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", app.phone))
      .unique();
    if (clash) throw new ConvexError("An account with this phone number already exists.");
    const password = temporaryPassword();
    const riderId = await ctx.db.insert("users", {
      name: app.name,
      phone: app.phone,
      email: app.email,
      role: "rider",
      status: "active",
      riderArea: app.area,
      ...(await hashPassword(password)),
      createdAt: Date.now(),
    });
    await ctx.db.patch("riderApplications", app._id, { status: "hired", riderId });
    // Shown to the admin once, to hand to the new rider.
    return { password };
  },
});

export const reject = mutation({
  args: { token: v.string(), id: v.id("riderApplications") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const app = await ctx.db.get("riderApplications", args.id);
    if (!app || app.status === "hired") throw new ConvexError("Application not found.");
    await ctx.db.patch("riderApplications", app._id, { status: "rejected" });
    return null;
  },
});
