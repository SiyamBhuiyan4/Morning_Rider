import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { clean, normalisePhone, requireUser } from "./lib/auth";
import { education, maritalStatus, religion } from "./schema";

/*
  A rider's full profile for the office: account, work numbers and the
  personal details in `riderProfiles`. Admin only — this holds NID numbers
  and family phone numbers, so it is never sent to riders or merchants.
*/
export const get = query({
  args: { token: v.string(), riderId: v.id("users") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const rider = await ctx.db.get("users", args.riderId);
    if (!rider || rider.role !== "rider") return null;
    const profile = await ctx.db
      .query("riderProfiles")
      .withIndex("by_riderId", (q) => q.eq("riderId", rider._id))
      .unique();
    const delivered = await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_status", (q) => q.eq("deliveryRiderId", rider._id).eq("status", "delivered"))
      .take(5000);
    const partial = await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_status", (q) =>
        q.eq("deliveryRiderId", rider._id).eq("status", "partial_delivered"),
      )
      .take(5000);
    const returned = await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_status", (q) => q.eq("deliveryRiderId", rider._id).eq("status", "returned"))
      .take(5000);
    const deposits = await ctx.db
      .query("cashDeposits")
      .withIndex("by_riderId_and_createdAt", (q) => q.eq("riderId", rider._id))
      .take(5000);
    return {
      rider: {
        _id: rider._id,
        name: rider.name,
        phone: rider.phone,
        email: rider.email,
        riderArea: rider.riderArea,
        status: rider.status,
        demo: rider.demo,
        createdAt: rider.createdAt,
      },
      profile,
      stats: {
        delivered: delivered.length + partial.length,
        returned: returned.length,
        cashDeposited: deposits.reduce((s, d) => s + d.amount, 0),
      },
    };
  },
});

const optionalPhone = (raw: string | undefined, field: string) => {
  const out = clean(raw, 20, field);
  if (!out) return undefined;
  try {
    return normalisePhone(out);
  } catch {
    throw new ConvexError(`${field}: enter a valid Bangladeshi mobile number (01XXXXXXXXX).`);
  }
};

export const save = mutation({
  args: {
    token: v.string(),
    riderId: v.id("users"),
    name: v.string(),
    email: v.optional(v.string()),
    riderArea: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
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
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const rider = await ctx.db.get("users", args.riderId);
    if (!rider || rider.role !== "rider") throw new ConvexError("Rider not found.");

    const name = clean(args.name, 80, "Name");
    if (!name) throw new ConvexError("Name is required.");
    const email = clean(args.email, 120, "Email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ConvexError("Enter a valid email address.");

    const dob = clean(args.dateOfBirth, 10, "Date of birth");
    if (dob) {
      const d = new Date(dob + "T00:00:00Z");
      const year = Number(dob.slice(0, 4));
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob) || isNaN(d.getTime()) || d.getTime() > Date.now() || year < 1940) {
        throw new ConvexError("Enter a valid date of birth.");
      }
    }
    const idNumber = clean(args.idNumber, 20, "ID number").replace(/\s/g, "");
    if (idNumber && !/^\d{10}$|^\d{13}$|^\d{17}$/.test(idNumber)) {
      throw new ConvexError("NID / birth certificate number must be 10, 13 or 17 digits.");
    }
    const facebook = clean(args.facebook, 200, "Facebook");
    // A username, or a link on facebook.com / fb.com — nothing else, since the profile page links to it.
    if (
      facebook &&
      !/^@?[\w.]{3,80}$/.test(facebook) &&
      !/^(https?:\/\/)?((www|m|web)\.)?(facebook\.com|fb\.com)\/[\w.\-/?=&%]+$/i.test(facebook)
    ) {
      throw new ConvexError("Enter a valid Facebook link or username.");
    }

    const text = (value: string | undefined, max: number, field: string) => clean(value, max, field) || undefined;
    const profile = {
      dateOfBirth: dob || undefined,
      idType: idNumber ? (args.idType ?? "nid") : undefined,
      idNumber: idNumber || undefined,
      maritalStatus: args.maritalStatus,
      religion: args.religion,
      education: args.education,
      institution: text(args.institution, 120, "Institution"),
      bloodGroup: text(args.bloodGroup, 4, "Blood group"),
      whatsapp: optionalPhone(args.whatsapp, "WhatsApp"),
      facebook: facebook || undefined,
      fatherName: text(args.fatherName, 80, "Father's name"),
      fatherPhone: optionalPhone(args.fatherPhone, "Father's phone"),
      motherName: text(args.motherName, 80, "Mother's name"),
      motherPhone: optionalPhone(args.motherPhone, "Mother's phone"),
      guardianName: text(args.guardianName, 80, "Guardian's name"),
      guardianRelation: text(args.guardianRelation, 40, "Relation"),
      guardianPhone: optionalPhone(args.guardianPhone, "Guardian's phone"),
      presentAddress: text(args.presentAddress, 300, "Present address"),
      permanentAddress: text(args.permanentAddress, 300, "Permanent address"),
      bikeNumber: text(args.bikeNumber, 40, "Motorcycle number"),
      licenseNumber: text(args.licenseNumber, 40, "Driving licence number"),
      notes: text(args.notes, 1000, "Notes"),
      updatedAt: Date.now(),
    } satisfies Omit<Doc<"riderProfiles">, "_id" | "_creationTime" | "riderId">;

    await ctx.db.patch("users", rider._id, {
      name,
      email: email || undefined,
      riderArea: clean(args.riderArea, 80, "Area") || undefined,
    });
    const existing = await ctx.db
      .query("riderProfiles")
      .withIndex("by_riderId", (q) => q.eq("riderId", rider._id))
      .unique();
    if (existing) await ctx.db.replace("riderProfiles", existing._id, { riderId: rider._id, ...profile });
    else await ctx.db.insert("riderProfiles", { riderId: rider._id, ...profile });
    return null;
  },
});
