import { internalMutation } from "./_generated/server";

/*
  One-off: the old Steadfast-style zones (inside/sub/outside Dhaka) become
  Morning Rider's real city zones. Safe to run more than once.

    npx convex run migrations:zonesV2
    npx convex run --prod migrations:zonesV2
*/
const MAP = {
  inside_dhaka: "dhaka_city",
  sub_dhaka: "gazipur_city",
  outside_dhaka: "narayanganj_city",
} as const;

// Done on dev and prod on 2026-10-13; the legacy zone values are gone from the
// schema now, so this is kept only as a record and reports nothing to do.
export const zonesV2 = internalMutation({
  args: {},
  handler: async (ctx) => {
    let legacy = 0;
    for await (const p of ctx.db.query("parcels")) if ((p.zone as string) in MAP) legacy++;
    return `${legacy} parcel(s) still on legacy zones.`;
  },
});

/*
  Merchant sign-up stopped needing approval on 2026-10-13. Anyone who signed
  up before that and is still pending is activated. Demo accounts are left
  alone so the demo keeps an example of every state.

    npx convex run --prod migrations:activatePendingMerchants
*/
export const activatePendingMerchants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const pending = await ctx.db
      .query("users")
      .withIndex("by_role_and_status", (q) => q.eq("role", "merchant").eq("status", "pending"))
      .take(500);
    const real = pending.filter((u) => !u.demo);
    for (const u of real) await ctx.db.patch("users", u._id, { status: "active" });
    return real.map((u) => `${u.phone} ${u.businessName ?? u.name}`);
  },
});
