import { mutation, query, type MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireAdmin, requireUser } from "./auth";
import { clean, normalisePhone, required } from "./lib/auth";
import { countParcel, logEvent } from "./lib/parcel";
import { manifestStatus, vehicleType } from "./schema";

/** Helper to generate a unique manifest code like MNF-YYYYMMDD-XXXX */
async function generateManifestNumber(ctx: MutationCtx): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let attempt = 0; attempt < 10; attempt++) {
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const manifestNumber = `MNF-${dateStr}-${rand}`;
    const clash = await ctx.db
      .query("manifests")
      .withIndex("by_manifestNumber", (q) => q.eq("manifestNumber", manifestNumber))
      .first();
    if (!clash) return manifestNumber;
  }
  throw new ConvexError("Could not generate a unique manifest number. Please try again.");
}

/**
 * Returns hubs, optionally filtered by status ('active', 'inactive', 'all'). Defaults to 'all'.
 */
export const list = query({
  args: {
    token: v.string(),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin", "merchant", "rider"]);
    let hubs: Doc<"hubs">[];
    if (args.status && args.status !== "all") {
      hubs = await ctx.db
        .query("hubs")
        .withIndex("by_status", (q) => q.eq("status", args.status as "active" | "inactive"))
        .collect();
    } else if (args.status === "all") {
      hubs = await ctx.db.query("hubs").collect();
    } else {
      hubs = await ctx.db.query("hubs").collect();
    }

    return await Promise.all(
      hubs.map(async (hub) => {
        const manager = hub.managerId ? await ctx.db.get(hub.managerId) : null;
        return {
          ...hub,
          managerName: manager?.name,
          managerPhone: manager?.phone,
        };
      })
    );
  },
});

/**
 * Returns a hub by id.
 */
export const get = query({
  args: { token: v.string(), id: v.id("hubs") },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin", "merchant", "rider"]);
    const hub = await ctx.db.get(args.id);
    if (!hub) return null;

    const manager = hub.managerId ? await ctx.db.get(hub.managerId) : null;
    return {
      ...hub,
      managerName: manager?.name,
      managerPhone: manager?.phone,
    };
  },
});

/**
 * Admin creates a new hub (name, code, address, city, phone, managerId).
 */
export const createHub = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    code: v.string(),
    address: v.string(),
    city: v.string(),
    phone: v.string(),
    managerId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const name = required(args.name, 100, "Hub name");
    const code = required(args.code, 50, "Hub code").toUpperCase();
    const address = required(args.address, 300, "Hub address");
    const city = required(args.city, 100, "City");
    const phone = normalisePhone(args.phone);

    const existing = await ctx.db
      .query("hubs")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (existing) {
      throw new ConvexError(`A hub with code "${code}" already exists.`);
    }

    if (args.managerId) {
      const manager = await ctx.db.get(args.managerId);
      if (!manager) throw new ConvexError("Hub manager user not found.");
    }

    return await ctx.db.insert("hubs", {
      name,
      code,
      address,
      city,
      phone,
      managerId: args.managerId,
      status: "active",
      createdAt: Date.now(),
    });
  },
});

/**
 * Updates hub details or status.
 */
export const updateHub = mutation({
  args: {
    token: v.string(),
    id: v.id("hubs"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    phone: v.optional(v.string()),
    managerId: v.optional(v.id("users")),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const hub = await ctx.db.get(args.id);
    if (!hub) throw new ConvexError("Hub not found.");

    const patch: Partial<Doc<"hubs">> = {};

    if (args.name !== undefined) {
      patch.name = required(args.name, 100, "Hub name");
    }

    if (args.code !== undefined) {
      const code = required(args.code, 50, "Hub code").toUpperCase();
      const existing = await ctx.db
        .query("hubs")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (existing && existing._id !== args.id) {
        throw new ConvexError(`A hub with code "${code}" already exists.`);
      }
      patch.code = code;
    }

    if (args.address !== undefined) {
      patch.address = required(args.address, 300, "Hub address");
    }

    if (args.city !== undefined) {
      patch.city = required(args.city, 100, "City");
    }

    if (args.phone !== undefined) {
      patch.phone = normalisePhone(args.phone);
    }

    if (args.managerId !== undefined) {
      const manager = await ctx.db.get(args.managerId);
      if (!manager) throw new ConvexError("Hub manager user not found.");
      patch.managerId = args.managerId;
    }

    if (args.status !== undefined) {
      patch.status = args.status;
    }

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

/**
 * Returns all fleet vehicles / transports.
 */
export const listTransports = query({
  args: {
    token: v.string(),
    status: v.optional(v.union(v.literal("available"), v.literal("in_transit"), v.literal("maintenance"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let transports: Doc<"transports">[];
    if (args.status) {
      transports = await ctx.db
        .query("transports")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      transports = await ctx.db.query("transports").collect();
    }

    // Attach current hub info for convenience
    return await Promise.all(
      transports.map(async (t) => {
        const hub = t.currentHubId ? await ctx.db.get(t.currentHubId) : null;
        return {
          ...t,
          currentHubName: hub?.name,
          currentHubCode: hub?.code,
        };
      })
    );
  },
});

/**
 * Creates transport (vehicleNumber, vehicleType, driverName, driverPhone, capacityKg, currentHubId).
 */
export const createTransport = mutation({
  args: {
    token: v.string(),
    vehicleNumber: v.string(),
    vehicleType,
    driverName: v.string(),
    driverPhone: v.string(),
    capacityKg: v.number(),
    currentHubId: v.optional(v.id("hubs")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const vehicleNumber = required(args.vehicleNumber, 50, "Vehicle number").toUpperCase();
    const driverName = required(args.driverName, 80, "Driver name");
    const driverPhone = normalisePhone(args.driverPhone);

    if (!Number.isFinite(args.capacityKg) || args.capacityKg <= 0) {
      throw new ConvexError("Capacity must be greater than 0 kg.");
    }

    if (args.currentHubId) {
      const hub = await ctx.db.get(args.currentHubId);
      if (!hub) throw new ConvexError("Assigned hub not found.");
    }

    return await ctx.db.insert("transports", {
      vehicleNumber,
      vehicleType: args.vehicleType,
      driverName,
      driverPhone,
      capacityKg: args.capacityKg,
      status: "available",
      currentHubId: args.currentHubId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Change vehicle status (available, in_transit, maintenance).
 */
export const updateTransportStatus = mutation({
  args: {
    token: v.string(),
    id: v.id("transports"),
    status: v.union(v.literal("available"), v.literal("in_transit"), v.literal("maintenance")),
    currentHubId: v.optional(v.id("hubs")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const transport = await ctx.db.get(args.id);
    if (!transport) throw new ConvexError("Transport vehicle not found.");

    const patch: Partial<Doc<"transports">> = { status: args.status };
    if (args.currentHubId !== undefined) {
      const hub = await ctx.db.get(args.currentHubId);
      if (!hub) throw new ConvexError("Hub not found.");
      patch.currentHubId = args.currentHubId;
    }

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

/**
 * List manifests with optional status filter (created, dispatched, received).
 */
export const listManifests = query({
  args: {
    token: v.string(),
    status: v.optional(manifestStatus),
    sourceHubId: v.optional(v.id("hubs")),
    destinationHubId: v.optional(v.id("hubs")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let manifests: Doc<"manifests">[];
    if (args.status) {
      manifests = await ctx.db
        .query("manifests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else if (args.sourceHubId) {
      manifests = await ctx.db
        .query("manifests")
        .withIndex("by_sourceHubId", (q) => q.eq("sourceHubId", args.sourceHubId!))
        .order("desc")
        .collect();
    } else if (args.destinationHubId) {
      manifests = await ctx.db
        .query("manifests")
        .withIndex("by_destinationHubId", (q) => q.eq("destinationHubId", args.destinationHubId!))
        .order("desc")
        .collect();
    } else {
      manifests = await ctx.db.query("manifests").order("desc").collect();
    }

    if (args.sourceHubId && args.status) {
      manifests = manifests.filter((m) => m.sourceHubId === args.sourceHubId);
    }
    if (args.destinationHubId && (args.status || args.sourceHubId)) {
      manifests = manifests.filter((m) => m.destinationHubId === args.destinationHubId);
    }

    return await Promise.all(
      manifests.map(async (m) => {
        const [sourceHub, destinationHub, transport] = await Promise.all([
          ctx.db.get(m.sourceHubId),
          ctx.db.get(m.destinationHubId),
          m.transportId ? ctx.db.get(m.transportId) : null,
        ]);
        return {
          ...m,
          sourceHubName: sourceHub?.name ?? "Unknown Hub",
          sourceHubCode: sourceHub?.code ?? "",
          destinationHubName: destinationHub?.name ?? "Unknown Hub",
          destinationHubCode: destinationHub?.code ?? "",
          transportVehicleNumber: transport?.vehicleNumber,
        };
      })
    );
  },
});

/**
 * Packages a list of parcels (parcelIds) into a new manifest
 * (sourceHubId, destinationHubId, transportId, driverName, driverPhone, notes).
 * Generates unique manifestNumber like MNF-YYYYMMDD-XXXX.
 */
export const createManifest = mutation({
  args: {
    token: v.string(),
    sourceHubId: v.id("hubs"),
    destinationHubId: v.id("hubs"),
    parcelIds: v.array(v.id("parcels")),
    transportId: v.optional(v.id("transports")),
    driverName: v.optional(v.string()),
    driverPhone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    if (args.sourceHubId === args.destinationHubId) {
      throw new ConvexError("Source hub and destination hub cannot be the same.");
    }

    const [sourceHub, destinationHub] = await Promise.all([
      ctx.db.get(args.sourceHubId),
      ctx.db.get(args.destinationHubId),
    ]);
    if (!sourceHub) throw new ConvexError("Source hub not found.");
    if (!destinationHub) throw new ConvexError("Destination hub not found.");

    if (args.parcelIds.length === 0) {
      throw new ConvexError("Manifest must contain at least one parcel.");
    }

    // Verify all parcels exist
    await Promise.all(
      args.parcelIds.map(async (id) => {
        const p = await ctx.db.get(id);
        if (!p) throw new ConvexError(`Parcel not found: ${id}`);
      })
    );

    let driverName = clean(args.driverName, 80, "Driver name") || undefined;
    let driverPhone = args.driverPhone ? normalisePhone(args.driverPhone) : undefined;

    if (args.transportId) {
      const transport = await ctx.db.get(args.transportId);
      if (!transport) throw new ConvexError("Transport vehicle not found.");
      if (!driverName) driverName = transport.driverName;
      if (!driverPhone) driverPhone = transport.driverPhone;
    }

    const manifestNumber = await generateManifestNumber(ctx);

    return await ctx.db.insert("manifests", {
      manifestNumber,
      sourceHubId: args.sourceHubId,
      destinationHubId: args.destinationHubId,
      transportId: args.transportId,
      driverName,
      driverPhone,
      parcelIds: args.parcelIds,
      parcelCount: args.parcelIds.length,
      status: "created",
      notes: clean(args.notes, 500, "Notes") || undefined,
      createdAt: Date.now(),
    });
  },
});

/**
 * Marks manifest as dispatched (sets dispatchedAt: Date.now()).
 */
export const dispatchManifest = mutation({
  args: {
    token: v.string(),
    id: v.id("manifests"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const manifest = await ctx.db.get(args.id);
    if (!manifest) throw new ConvexError("Manifest not found.");

    if (manifest.status !== "created") {
      throw new ConvexError(`Cannot dispatch manifest with status "${manifest.status}".`);
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "dispatched",
      dispatchedAt: now,
    });

    if (manifest.transportId) {
      await ctx.db.patch(manifest.transportId, {
        status: "in_transit",
      });
    }

    return args.id;
  },
});

/**
 * Marks manifest as received, and updates all parcels in parcelIds to at_hub status,
 * recording history event "Received at Destination Hub via Manifest".
 */
export const receiveManifest = mutation({
  args: {
    token: v.string(),
    id: v.id("manifests"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);

    const manifest = await ctx.db.get(args.id);
    if (!manifest) throw new ConvexError("Manifest not found.");

    if (manifest.status === "received") {
      throw new ConvexError("Manifest has already been received.");
    }

    const now = Date.now();
    await ctx.db.patch(args.id, {
      status: "received",
      receivedAt: now,
    });

    if (manifest.transportId) {
      await ctx.db.patch(manifest.transportId, {
        status: "available",
        currentHubId: manifest.destinationHubId,
      });
    }

    // Update all parcels to at_hub and record event history
    for (const parcelId of manifest.parcelIds) {
      const parcel = await ctx.db.get(parcelId);
      if (!parcel) continue;

      if (parcel.status !== "at_hub") {
        await ctx.db.patch(parcel._id, {
          status: "at_hub",
          updatedAt: now,
        });
        await countParcel(ctx, parcel, parcel.status, "at_hub");
      }

      await logEvent(ctx, parcel._id, "at_hub", admin, "Received at Destination Hub via Manifest");
    }

    return args.id;
  },
});

/**
 * Returns parcels ready to be packed into transit manifests (status 'at_hub' or 'picked_up').
 */
export const packableParcels = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const [atHub, pickedUp] = await Promise.all([
      ctx.db
        .query("parcels")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", "at_hub"))
        .order("desc")
        .take(200),
      ctx.db
        .query("parcels")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", "picked_up"))
        .order("desc")
        .take(200),
    ]);

    return [...atHub, ...pickedUp].map((p) => ({
      _id: p._id,
      trackingCode: p.trackingCode,
      recipientName: p.recipientName,
      recipientPhone: p.recipientPhone,
      recipientAddress: p.recipientAddress,
      district: p.district,
      zone: p.zone,
      weightKg: p.weightKg,
      codAmount: p.codAmount,
      status: p.status,
      createdAt: p.createdAt,
    }));
  },
});

/**
 * Returns parcel details for a given manifest's parcelIds.
 */
export const manifestParcels = query({
  args: {
    token: v.string(),
    parcelIds: v.array(v.id("parcels")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const list = await Promise.all(
      args.parcelIds.slice(0, 300).map(async (id) => {
        const p = await ctx.db.get(id);
        if (!p) return null;
        return {
          _id: p._id,
          trackingCode: p.trackingCode,
          recipientName: p.recipientName,
          recipientPhone: p.recipientPhone,
          recipientAddress: p.recipientAddress,
          district: p.district,
          weightKg: p.weightKg,
          codAmount: p.codAmount,
          status: p.status,
        };
      })
    );

    return list.filter((p): p is NonNullable<typeof p> => p !== null);
  },
});

