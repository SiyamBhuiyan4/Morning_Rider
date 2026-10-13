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
