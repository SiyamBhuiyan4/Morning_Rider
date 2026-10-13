import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { randomHex, hashPassword, requireUser } from "./lib/auth";
import { removeVerification } from "./verification";
import { changeStatus, codCharge, computeCharges, getRates, merchantNet, type Status } from "./lib/parcel";
import { insertParcel } from "./parcels";
import { removeChat } from "./chat";

/*
  Sample data so every admin page has something on it while Siyam learns the
  system. Every demo account carries `demo: true`, and everything else demo
  (parcels, events, payouts, cash hand-overs) hangs off those accounts — so
  "Clear demo data" deletes exactly that and can never touch a real record.

  Demo accounts share one random password nobody knows. To look at the merchant or
  rider panel, use "Reset password" on a demo account in the admin panel.
*/

const DAY = 86_400_000;
const HOUR = 3_600_000;

type PayoutMethod = NonNullable<Doc<"users">["payoutMethod"]>;
type Verification = Doc<"users">["verification"];
type UserStatus = Doc<"users">["status"];

/*
  12 of everything, each a little different, so every page shows the cases
  Siyam will meet: verified / under review / rejected / unverified merchants,
  active / suspended riders with full, partial and empty profiles, new and
  interview-stage applicants, 12+ parcels in every status, payouts, payout
  requests in every state, cash hand-overs, and 12 repeat customers whose
  Fraud check risk runs from low to high.
*/
const MERCHANTS: {
  name: string;
  businessName: string;
  pickupAddress: string;
  payoutMethod: PayoutMethod;
  payoutAccount: string;
  status: UserStatus;
  verification: Verification;
  email?: string;
}[] = [
  { name: "Rakib Hasan", businessName: "Demo Fashion House", pickupAddress: "House 12, Road 7, Dhanmondi, Dhaka", payoutMethod: "bkash", payoutAccount: "01300000101", status: "active", verification: "approved", email: "fashion.house@example.com" },
  { name: "Nusrat Jahan", businessName: "Demo Gadget Shop", pickupAddress: "Shop 34, Bashundhara City, Panthapath, Dhaka", payoutMethod: "nagad", payoutAccount: "01300000102", status: "active", verification: "approved" },
  { name: "Tanvir Ahmed", businessName: "Demo Organic Food", pickupAddress: "House 5, Road 2, Sector 7, Uttara", payoutMethod: "bank", payoutAccount: "City Bank 1234567890", status: "pending", verification: "submitted" },
  { name: "Sharmin Akter", businessName: "Demo Beauty Corner", pickupAddress: "Shop 8, Mirpur 2 Market, Dhaka", payoutMethod: "rocket", payoutAccount: "013000001048", status: "active", verification: "approved", email: "beauty.corner@example.com" },
  { name: "Fahim Chowdhury", businessName: "Demo Book House", pickupAddress: "Nilkhet Book Market, Shop 112, Dhaka", payoutMethod: "bkash", payoutAccount: "01300000105", status: "active", verification: "submitted" },
  { name: "Jannatul Ferdous", businessName: "Demo Home Bakers", pickupAddress: "House 40, Road 12, Sector 13, Uttara", payoutMethod: "nagad", payoutAccount: "01300000106", status: "active", verification: "approved" },
  { name: "Arif Hossain", businessName: "Demo Mobile Zone", pickupAddress: "Chowrasta, Gazipur Sadar", payoutMethod: "bank", payoutAccount: "Dutch-Bangla Bank 7012345678", status: "active", verification: "approved" },
  { name: "Mehedi Hasan", businessName: "Demo Frozen Foods", pickupAddress: "Chashara, Narayanganj", payoutMethod: "cash", payoutAccount: "", status: "active", verification: "approved", email: "frozen.foods@example.com" },
  { name: "Sadia Islam", businessName: "Demo Kids Toys", pickupAddress: "Road 11, Banani, Dhaka", payoutMethod: "bkash", payoutAccount: "01300000109", status: "active", verification: "rejected" },
  { name: "Kamrul Islam", businessName: "Demo Pharma Plus", pickupAddress: "Town Hall, Mohammadpur, Dhaka", payoutMethod: "rocket", payoutAccount: "013000001109", status: "active", verification: undefined },
  { name: "Lamia Rahman", businessName: "Demo Gift Gallery", pickupAddress: "Gulshan 2 Circle, Dhaka", payoutMethod: "nagad", payoutAccount: "01300000111", status: "pending", verification: undefined },
  { name: "Zahid Hasan", businessName: "Demo Electronics BD", pickupAddress: "Elephant Road, Dhaka", payoutMethod: "bkash", payoutAccount: "01300000112", status: "suspended", verification: "approved" },
];
const merchantPhone = (i: number) => `013000001${String(i + 1).padStart(2, "0")}`;

/** Merchants that send the sample parcels (active and verified), with what they mostly sell. */
const SENDERS: { index: number; categories: Category[]; items: string[] }[] = [
  { index: 0, categories: ["shopping", "gift", "home"], items: ["2 T-shirts", "Ladies kurti", "Bed sheet set", "Gift-wrapped saree"] },
  { index: 1, categories: ["electronics", "business"], items: ["Bluetooth earbuds", "Power bank 20000mAh", "Office router", "Smart watch"] },
  { index: 3, categories: ["cosmetics", "medicine"], items: ["Face wash + serum", "Lipstick set", "Sunscreen + vitamin C", "Perfume 50ml"] },
  { index: 5, categories: ["bakery", "food"], items: ["Birthday cake 2 lb", "Cookies box", "Home-made biryani", "Brownies 12 pcs"] },
  { index: 6, categories: ["electronics", "document", "parcel"], items: ["Used phone (boxed)", "Warranty papers", "Phone covers x3", "Earphones"] },
  { index: 7, categories: ["frozen", "food"], items: ["Frozen chicken nuggets", "Frozen paratha 20 pcs", "Prawn 1 kg", "Beef 2 kg"] },
];

const RIDERS = [
  { name: "Demo Rider Karim", riderArea: "Mirpur" },
  { name: "Demo Rider Sohel", riderArea: "Dhanmondi" },
  { name: "Demo Rider Jamal", riderArea: "Uttara" },
  { name: "Demo Rider Rubel", riderArea: "Gulshan" },
  { name: "Demo Rider Nayeem", riderArea: "Gazipur" },
  { name: "Demo Rider Sumon", riderArea: "Narayanganj" },
  { name: "Demo Rider Biplob", riderArea: "Banani" },
  { name: "Demo Rider Tushar", riderArea: "Mohammadpur" },
  { name: "Demo Rider Rasel", riderArea: "Uttara" },
  { name: "Demo Rider Arafat", riderArea: "Tongi" },
  { name: "Demo Rider Liton", riderArea: "Badda" },
  { name: "Demo Rider Shuvo", riderArea: "Bashundhara" },
];
const riderPhone = (i: number) => `013000002${String(i + 1).padStart(2, "0")}`;
const SUSPENDED_RIDER = 11; // Shuvo: suspended, kept for history
const NO_PROFILE_RIDER = 10; // Liton: profile not filled in yet

const FATHERS = ["Abdul Karim", "Mokbul Hossain", "Sunil Das", "Abul Kalam", "Nurul Islam", "Joseph Gomes", "Harun Mia", "Shafiqul Alam", "Ratan Barua", "Mofiz Uddin", "Delwar Hossain", "Anwar Hossain"];
const MOTHERS = ["Rahima Begum", "Salma Khatun", "Mala Das", "Nasima Akter", "Rokeya Begum", "Mary Gomes", "Parvin Akter", "Hasina Begum", "Shanti Barua", "Jahanara Begum", "Kohinoor Begum", "Fatema Begum"];
const HOMES = ["Mymensingh", "Comilla", "Sylhet", "Bogura", "Barishal", "Gazipur", "Rangpur", "Khulna", "Chattogram", "Faridpur", "Tangail", "Noakhali"];
const RELIGIONS = ["islam", "islam", "hinduism", "islam", "christianity", "islam", "islam", "islam", "buddhism", "islam", "islam", "hinduism"] as const;
const MARITAL = ["married", "single", "single", "married", "divorced", "single", "married", "single", "married", "widowed", "single", "single"] as const;
const EDUCATION = ["hsc", "ssc", "jsc", "bachelor", "diploma", "primary", "hsc", "masters", "ssc", "none", "hsc", "ssc"] as const;
const BLOOD = ["B+", "O+", "A+", "AB+", "O-", "B-", "A-", "O+", "B+", "AB-", "A+", "O+"];
const BIRTH_YEARS = [1990, 1998, 2004, 1995, 1988, 2002, 1993, 1985, 1999, 1979, 2003, 2001];

function riderProfile(i: number, phone: string) {
  const young = BIRTH_YEARS[i] >= 2004;
  const base = {
    dateOfBirth: `${BIRTH_YEARS[i]}-${String((i % 12) + 1).padStart(2, "0")}-${String(((i * 7) % 27) + 1).padStart(2, "0")}`,
    idType: young ? ("birth_certificate" as const) : ("nid" as const),
    idNumber: young ? `${BIRTH_YEARS[i]}${String(i + 1).padStart(13, "0")}` : String(1990000000001 + i * 1111111),
    maritalStatus: MARITAL[i],
    religion: RELIGIONS[i],
    education: EDUCATION[i],
    bloodGroup: BLOOD[i],
    whatsapp: phone,
    fatherName: FATHERS[i],
    fatherPhone: `013000003${String(i * 2 + 1).padStart(2, "0")}`,
    presentAddress: `${RIDERS[i].riderArea}, Dhaka`,
    permanentAddress: `Sadar, ${HOMES[i]}`,
  };
  // A partly filled profile, to show how gaps look.
  if (i === 9) return { ...base, education: undefined, bloodGroup: undefined, permanentAddress: undefined };
  return {
    ...base,
    institution: ["hsc", "bachelor", "masters", "diploma"].includes(EDUCATION[i]) ? `${HOMES[i]} College` : undefined,
    facebook: i % 3 === 2 ? undefined : `facebook.com/demo.rider${i + 1}`,
    motherName: i % 4 === 1 ? undefined : MOTHERS[i],
    motherPhone: i % 4 === 1 ? undefined : `013000003${String(i * 2 + 2).padStart(2, "0")}`,
    ...(i % 4 === 1 || i === 8
      ? { guardianName: `${FATHERS[(i + 5) % 12]}`, guardianRelation: i === 8 ? "Elder brother" : "Uncle", guardianPhone: `013000004${String(i + 1).padStart(2, "0")}` }
      : {}),
    bikeNumber: i % 5 === 4 ? undefined : `Dhaka Metro-${["HA", "LA", "GA", "BHA"][i % 4]} ${11 + i}-${String(1000 + i * 37)}`,
    licenseNumber: i % 5 === 4 ? undefined : `DK${String(1000000 + i * 4321)}`,
    notes: i === 0 ? "Most reliable rider. Knows Mirpur very well." : i === SUSPENDED_RIDER ? "Suspended: did not hand over cash on time twice." : undefined,
  };
}

const APPLICANTS = [
  { name: "Rahim Uddin", area: "Mirpur 10", hasBike: true, hasLicense: false, email: "rahim.demo@example.com", note: "I know Mirpur and Uttara roads well." },
  { name: "Saiful Islam", area: "Uttara Sector 10", hasBike: true, hasLicense: true },
  { name: "Habib Rahman", area: "Gazipur Sadar", hasBike: false, hasLicense: false, note: "I can ride a cycle." },
  { name: "Monir Hossain", area: "Banani", hasBike: true, hasLicense: true, email: "monir.demo@example.com" },
  { name: "Shahin Alam", area: "Narayanganj Sadar", hasBike: false, hasLicense: true, note: "Can join from next week." },
  { name: "Rony Das", area: "Mohammadpur", hasBike: true, hasLicense: false },
  { name: "Polash Mia", area: "Tongi", hasBike: true, hasLicense: true, note: "2 years with another courier." },
  { name: "Asif Iqbal", area: "Uttara Sector 4", hasBike: true, hasLicense: true, email: "asif.demo@example.com" },
  { name: "Mamun Sarkar", area: "Badda", hasBike: false, hasLicense: false },
  { name: "Jewel Rana", area: "Dhanmondi", hasBike: true, hasLicense: true, note: "Only evenings." },
  { name: "Sagor Ahmed", area: "Khilgaon", hasBike: true, hasLicense: false },
  { name: "Ridoy Hasan", area: "Uttara Sector 13", hasBike: true, hasLicense: true, email: "ridoy.demo@example.com", note: "Full time." },
];
const applicantPhone = (i: number) => `013000005${String(i + 1).padStart(2, "0")}`;

type Zone = Doc<"parcels">["zone"];
type Category = NonNullable<Doc<"parcels">["category"]>;

/* Places across all four zones, used for one-off customers. */
const PLACES: [string, string, Zone][] = [
  ["House 14, Road 7, Sector 4", "Uttara Sector 4", "uttara"],
  ["House 22, Road 11, Sector 9", "Uttara Sector 9", "uttara"],
  ["Road 3, Sector 13", "Uttara Sector 13", "uttara"],
  ["Sector 11, Rabindra Sarani", "Uttara Sector 11", "uttara"],
  ["Diabari Main Road", "Diabari", "uttara"],
  ["House 8, Block C", "Banani", "dhaka_city"],
  ["Flat 5A, Road 3", "Mirpur 10", "dhaka_city"],
  ["Road 27", "Dhanmondi", "dhaka_city"],
  ["Gulshan Avenue", "Gulshan 1", "dhaka_city"],
  ["Shyamoli Ring Road", "Shyamoli", "dhaka_city"],
  ["Malibagh Chowdhury Para", "Malibagh", "dhaka_city"],
  ["Block D, Bashundhara R/A", "Bashundhara", "dhaka_city"],
  ["College Road", "Tongi", "gazipur_city"],
  ["Joydebpur Chowrasta", "Gazipur Sadar", "gazipur_city"],
  ["Board Bazar Main Road", "Board Bazar", "gazipur_city"],
  ["Chashara", "Narayanganj Sadar", "narayanganj_city"],
  ["Fatullah Bazar", "Fatullah", "narayanganj_city"],
  ["Siddhirganj Power House Road", "Siddhirganj", "narayanganj_city"],
];
const FIRST = ["Ayesha", "Mahmud", "Farhana", "Shakil", "Rumana", "Imran", "Sabbir", "Tania", "Hasan", "Mitu", "Rafi", "Nadia", "Tareq", "Sumaiya", "Rashed", "Anika", "Babul", "Shirin", "Kawsar", "Popy"];
const LAST = ["Siddika", "Hossain", "Akter", "Khan", "Islam", "Kabir", "Rahman", "Sultana", "Mahmud", "Begum", "Chowdhury", "Ahmed"];

/*
  12 customers who order again and again. Letters are their parcels, newest
  first: D delivered, P partial, R returned, G returning, C cancelled,
  p pending, u picked up, h at hub, o out for delivery, H hold.
*/
const REPEAT_CUSTOMERS: { phone: string; name: string; place: number; history: string }[] = [
  { phone: "01710000777", name: "Nadia Chowdhury", place: 1, history: "DDDDDD" },
  { phone: "01710000601", name: "Rafi Ahmed", place: 6, history: "pDDDD" },
  { phone: "01710000602", name: "Sumaiya Islam", place: 13, history: "DPDD" },
  { phone: "01710000603", name: "Tareq Rahman", place: 8, history: "DRD" },
  { phone: "01710000604", name: "Anika Sultana", place: 2, history: "RDD" },
  { phone: "01710000605", name: "Babul Mia", place: 15, history: "RDRD" },
  { phone: "01710000606", name: "Shirin Akter", place: 10, history: "oDCC" },
  { phone: "01710000666", name: "Kawsar Hossain", place: 16, history: "uRRR" },
  { phone: "01710000607", name: "Popy Begum", place: 5, history: "GRD" },
  { phone: "01710000608", name: "Rashed Khan", place: 12, history: "RR" },
  { phone: "01710000609", name: "Imran Kabir", place: 3, history: "poH" },
  { phone: "01710000610", name: "Mitu Islam", place: 7, history: "CC" },
];
const LETTER: Record<string, Status> = {
  D: "delivered", P: "partial_delivered", R: "returned", G: "returning", C: "cancelled",
  p: "pending", u: "picked_up", h: "at_hub", o: "out_for_delivery", H: "hold",
};
const ALL_STATUSES: Status[] = ["pending", "picked_up", "at_hub", "out_for_delivery", "hold", "delivered", "partial_delivered", "returning", "returned", "cancelled"];
/** How long ago a parcel in this (unfinished) state was booked, in days. */
const OPEN_AGE: Partial<Record<Status, number>> = { pending: 0, picked_up: 0, at_hub: 1, out_for_delivery: 1, hold: 2, returning: 3 };

const COD = [650, 1200, 0, 850, 2400, 1500, 990, 3200, 450, 1800, 5200, 750];
const WEIGHTS = [0.5, 1, 1.5, 2, 3, 5, 0.3, 1, 2.5, 4, 0.8, 1.2];
const NOTES = [undefined, "Call before delivery", undefined, "Fragile, handle with care", "Deliver after 5 PM", undefined, "Office address, deliver before 6 PM", undefined, "Keep upright", "Customer prefers bKash, ask before"];
const HOLD_REASONS = ["Customer asked to deliver tomorrow", "Customer not at home", "Address not found, calling customer"];
const RETURN_REASONS = ["Customer not answering the phone", "Customer refused the parcel", "Customer says they never ordered", "Wrong size, customer refused"];

/** The steps a parcel went through to reach `status`. */
function pathTo(status: Status): Status[] {
  const base: Status[] = ["pending"];
  switch (status) {
    case "pending":
      return base;
    case "cancelled":
      return [...base, "cancelled"];
    case "picked_up":
      return [...base, "picked_up"];
    case "at_hub":
      return [...base, "picked_up", "at_hub"];
    case "out_for_delivery":
      return [...base, "picked_up", "at_hub", "out_for_delivery"];
    case "hold":
      return [...base, "picked_up", "at_hub", "out_for_delivery", "hold"];
    case "delivered":
    case "partial_delivered":
      return [...base, "picked_up", "at_hub", "out_for_delivery", status];
    case "returning":
      return [...base, "picked_up", "at_hub", "out_for_delivery", "returning"];
    case "returned":
      return [...base, "picked_up", "at_hub", "out_for_delivery", "returning", "returned"];
  }
}

async function demoUsers(ctx: MutationCtx | Parameters<typeof requireUser>[0]) {
  const out: Doc<"users">[] = [];
  for (const role of ["merchant", "rider"] as const) {
    for (const status of ["pending", "active", "suspended"] as const) {
      const rows = await ctx.db
        .query("users")
        .withIndex("by_role_and_status", (q) => q.eq("role", role).eq("status", status))
        .take(1000);
      out.push(...rows.filter((u) => u.demo));
    }
  }
  return out;
}

/** Sample documents for one merchant's business verification, already in storage. */
export const demoFiles = v.object({
  phone: v.string(),
  nidFront: v.id("_storage"),
  nidBack: v.id("_storage"),
  tinFile: v.optional(v.id("_storage")),
  tradeLicenseFile: v.optional(v.id("_storage")),
  otherFiles: v.array(v.id("_storage")),
});
type DemoFiles = typeof demoFiles.type;

type Planned = {
  status: Status;
  daysAgo: number;
  customer?: (typeof REPEAT_CUSTOMERS)[number];
};

/** Every parcel to create: the repeat customers' histories, then one-offs until each status has 12. */
function planParcels(): Planned[] {
  const out: Planned[] = [];
  for (const [c, customer] of REPEAT_CUSTOMERS.entries()) {
    [...customer.history].forEach((letter, k) => {
      const status = LETTER[letter];
      const daysAgo = OPEN_AGE[status] ?? 3 + k * 4 + (c % 3);
      out.push({ status, daysAgo, customer });
    });
  }
  for (const status of ALL_STATUSES) {
    let have = out.filter((p) => p.status === status).length;
    for (let n = 0; have < 12; n++, have++) {
      out.push({ status, daysAgo: OPEN_AGE[status] ?? 2 + ((n * 5 + status.length) % 27) });
    }
  }
  return out;
}

async function seed(ctx: MutationCtx, adminId: Id<"users"> | undefined, files: DemoFiles[]) {
  if ((await demoUsers(ctx)).length > 0) throw new ConvexError("Demo data is already loaded.");
  const phones = [...MERCHANTS.map((_, i) => merchantPhone(i)), ...RIDERS.map((_, i) => riderPhone(i))];
  for (const phone of phones) {
    const clash = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .unique();
    if (clash) throw new ConvexError(`Phone ${phone} is already used by a real account.`);
  }

  const now = Date.now();
  const rates = await getRates(ctx);
  // One random password nobody knows, shared by every demo account (hashing is slow).
  // "Reset password" / "Set password" in the admin panel gives access.
  const locked = await hashPassword("Demo" + randomHex(12) + "9");

  /* ---- merchants + verification */
  const merchantIds: Id<"users">[] = [];
  for (const [i, m] of MERCHANTS.entries()) {
    const phone = merchantPhone(i);
    const id = await ctx.db.insert("users", {
      name: m.name,
      businessName: m.businessName,
      phone,
      email: m.email,
      pickupAddress: m.pickupAddress,
      payoutMethod: m.payoutMethod,
      payoutAccount: m.payoutAccount || undefined,
      role: "merchant",
      status: m.status,
      verification: m.verification,
      demo: true,
      ...locked,
      createdAt: now - (40 - i * 2) * DAY,
    });
    merchantIds.push(id);
    const f = files.find((x) => x.phone === phone);
    if (m.verification && f) {
      const submittedAt = now - (m.verification === "submitted" ? 1 + (i % 3) : 30 - i) * DAY;
      await ctx.db.insert("merchantVerifications", {
        merchantId: id,
        nidNumber: String(1980000000000 + i * 7654321),
        nidFront: f.nidFront,
        nidBack: f.nidBack,
        tinNumber: f.tinFile ? String(100000000000 + i * 1234567) : undefined,
        tinFile: f.tinFile,
        tradeLicenseNumber: f.tradeLicenseFile ? `TRAD/DNCC/${String(10000 + i * 371)}/2026` : undefined,
        tradeLicenseFile: f.tradeLicenseFile,
        otherFiles: f.otherFiles,
        status: m.verification,
        reason: m.verification === "rejected" ? "The NID photo is blurry. Please upload a clear photo of both sides." : undefined,
        submittedAt,
        decidedAt: m.verification === "submitted" ? undefined : submittedAt + DAY,
      });
      for (const storageId of [f.nidFront, f.nidBack, f.tinFile, f.tradeLicenseFile, ...f.otherFiles]) {
        if (storageId) await ctx.db.insert("verificationFiles", { storageId, merchantId: id });
      }
    }
  }

  /* ---- riders + profiles */
  const riderIds: Id<"users">[] = [];
  for (const [i, r] of RIDERS.entries()) {
    const phone = riderPhone(i);
    const riderId = await ctx.db.insert("users", {
      ...r,
      phone,
      role: "rider",
      status: i === SUSPENDED_RIDER ? "suspended" : "active",
      demo: true,
      ...locked,
      createdAt: now - (60 - i * 4) * DAY,
    });
    riderIds.push(riderId);
    if (i !== NO_PROFILE_RIDER) {
      await ctx.db.insert("riderProfiles", { riderId, ...riderProfile(i, phone), updatedAt: now - i * DAY });
    }
  }
  const workingRiders = riderIds.filter((_, i) => i !== SUSPENDED_RIDER);

  /* ---- rider applications: 7 new, 5 invited to interview */
  for (const [i, a] of APPLICANTS.entries()) {
    const interview = i % 12 >= 7;
    await ctx.db.insert("riderApplications", {
      ...a,
      phone: applicantPhone(i),
      status: interview ? "interview" : "new",
      interviewAt: interview ? Math.round((now + (1 + (i % 3)) * DAY) / HOUR) * HOUR + (10 + (i % 5)) * HOUR : undefined,
      interviewPlace: interview ? "Morning Rider office, House 30, Road 9, Sector 9, Uttara" : undefined,
      demo: true,
      createdAt: now - (2 + i) * DAY,
    });
  }

  /* ---- parcels */
  const counts = new Map<string, number>();
  const bump = (scope: string, st: Status) => counts.set(`${scope}|${st}`, (counts.get(`${scope}|${st}`) ?? 0) + 1);
  const CODE = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const plan = planParcels();
  const finished: Doc<"parcels">[] = [];

  for (const [i, pl] of plan.entries()) {
    const sender = SENDERS[i % SENDERS.length];
    const merchantId = merchantIds[sender.index];
    const round = Math.floor(i / SENDERS.length);
    const category = sender.categories[round % sender.categories.length];
    const place = PLACES[pl.customer ? pl.customer.place : (i * 7) % PLACES.length];
    const [address, district, zone] = place;
    const recipientName = pl.customer?.name ?? `${FIRST[i % FIRST.length]} ${LAST[(i * 5) % LAST.length]}`;
    const recipientPhone = pl.customer?.phone ?? "017" + String(20000000 + ((i * 7919) % 79999999)).padStart(8, "0");
    const pickupRiderId = workingRiders[i % workingRiders.length];
    const deliveryRiderId = workingRiders[(i + 3) % workingRiders.length];
    const weightKg = WEIGHTS[i % WEIGHTS.length];
    let codAmount = COD[(i * 5) % COD.length];
    if (pl.status === "partial_delivered" && codAmount === 0) codAmount = 1600;
    const steps = pathTo(pl.status);
    const createdAt = now - pl.daysAgo * DAY - ((i % 9) + 1) * HOUR;
    const stepGap = Math.min(4 * HOUR, (now - createdAt) / (steps.length + 1));
    const lastAt = createdAt + (steps.length - 1) * stepGap;

    const isFinal = ["delivered", "partial_delivered", "returned", "cancelled"].includes(pl.status);
    const delivered = pl.status === "delivered" || pl.status === "partial_delivered";
    const collected =
      pl.status === "delivered"
        ? codAmount
        : pl.status === "partial_delivered"
          ? Math.round((codAmount * [0.5, 0.3, 0.7, 0.4][i % 4]) / 10) * 10
          : 0;
    const charges = computeCharges(rates, zone, weightKg, codAmount);
    const reachedDelivery = steps.includes("out_for_delivery");
    // Older finished parcels are already settled with the merchant / cash handed in.
    const paid = (delivered || pl.status === "returned") && pl.daysAgo >= 9;
    // Most cash is handed in after a few days; some riders are still holding theirs.
    const cashIn = delivered && collected > 0 && pl.daysAgo >= 4 && i % 4 !== 1;

    let trackingCode = "MR";
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    for (const b of bytes) trackingCode += CODE[b % 32];
    const invoice = `INV-${2001 + i}`;

    const doc = {
      trackingCode,
      merchantId,
      invoice,
      recipientName,
      recipientPhone,
      recipientAddress: address,
      district,
      zone,
      category,
      weightKg,
      codAmount,
      itemDescription: sender.items[round % sender.items.length],
      note: NOTES[i % NOTES.length],
      deliveryCharge: charges.deliveryCharge,
      codCharge: delivered ? codCharge(rates, zone, collected) : charges.codCharge,
      returnCharge: charges.returnCharge,
      status: pl.status,
      pickupRiderId: pl.status === "cancelled" ? undefined : pickupRiderId,
      deliveryRiderId: reachedDelivery ? deliveryRiderId : undefined,
      collectedAmount: collected,
      settlement: (paid ? "paid" : delivered || pl.status === "returned" ? "unpaid" : "open") as Doc<"parcels">["settlement"],
      cashState: (collected > 0 ? (cashIn ? "deposited" : "with_rider") : "none") as Doc<"parcels">["cashState"],
      searchText: [trackingCode, invoice, recipientName, recipientPhone].join(" "),
      createdAt,
      updatedAt: lastAt,
      finalAt: isFinal ? lastAt : undefined,
    };
    const id = await ctx.db.insert("parcels", doc);
    bump("all", pl.status);
    bump(merchantId, pl.status);
    if (isFinal) finished.push({ ...doc, _id: id, _creationTime: now });

    for (let st = 0; st < steps.length; st++) {
      const step = steps[st];
      await ctx.db.insert("parcelEvents", {
        parcelId: id,
        status: step,
        note:
          st === 0
            ? "Parcel created"
            : step === "hold"
              ? HOLD_REASONS[i % HOLD_REASONS.length]
              : step === "returning"
                ? RETURN_REASONS[i % RETURN_REASONS.length]
                : step === "partial_delivered"
                  ? "Customer kept only part of the order"
                  : step === "cancelled"
                    ? "Merchant cancelled before pickup"
                    : undefined,
        byUserId: st === 0 || step === "cancelled" ? merchantId : step === "at_hub" || step === "returned" ? adminId : deliveryRiderId,
        byRole: st === 0 || step === "cancelled" ? "merchant" : step === "at_hub" || step === "returned" ? "admin" : "rider",
        at: createdAt + st * stepGap,
      });
    }
  }

  for (const [key, count] of counts) {
    const [scope, st] = key.split("|") as [string, Status];
    const row = await ctx.db
      .query("statusCounts")
      .withIndex("by_scope_and_status", (q) => q.eq("scope", scope).eq("status", st))
      .unique();
    if (row) await ctx.db.patch("statusCounts", row._id, { count: row.count + count });
    else await ctx.db.insert("statusCounts", { scope, status: st, count });
  }

  /* ---- payouts: the settled parcels, two payouts per merchant (12 in all) */
  const payer = adminId ?? workingRiders[0];
  const payoutIds: Id<"payouts">[] = [];
  for (const sender of SENDERS) {
    const merchantId = merchantIds[sender.index];
    const m = MERCHANTS[sender.index];
    const settled = finished
      .filter((p) => p.merchantId === merchantId && p.settlement === "paid")
      .sort((a, b) => (a.finalAt ?? 0) - (b.finalAt ?? 0));
    // Two payouts, split where both come out positive (a batch of only returns can't be paid).
    const positive = (b: Doc<"parcels">[]) => b.reduce((sum, p) => sum + merchantNet(p), 0) > 0;
    let batches = [settled];
    for (let k = Math.ceil(settled.length / 2), tries = 0; tries < settled.length; tries++, k = (k % (settled.length - 1)) + 1) {
      const a = settled.slice(0, k);
      const b = settled.slice(k);
      if (a.length && b.length && positive(a) && positive(b)) {
        batches = [a, b];
        break;
      }
    }
    for (const batch of batches.filter((b) => b.length > 0)) {
      const collected = batch.reduce((sum, p) => sum + p.collectedAmount, 0);
      const net = batch.reduce((sum, p) => sum + merchantNet(p), 0);
      const payoutId = await ctx.db.insert("payouts", {
        merchantId,
        amount: net,
        parcelCount: batch.length,
        collected,
        charges: collected - net,
        method: m.payoutMethod,
        payoutAccount: m.payoutAccount || undefined,
        reference: m.payoutMethod === "cash" ? undefined : "DEMO-TX-" + randomHex(3).toUpperCase(),
        note: payoutIds.length % 3 === 0 ? "Demo payout" : undefined,
        createdBy: payer,
        createdAt: Math.max(...batch.map((p) => p.finalAt ?? 0)) + DAY,
      });
      payoutIds.push(payoutId);
      for (const p of batch) await ctx.db.patch("parcels", p._id, { payoutId });
    }
  }

  /* ---- payout requests: open, paid, rejected and cancelled (12 in all) */
  let requests = 0;
  const request = async (
    merchantIndex: number,
    amount: number,
    status: Doc<"payoutRequests">["status"],
    createdAt: number,
    extra: Partial<Doc<"payoutRequests">> = {},
  ) => {
    const m = MERCHANTS[merchantIndex];
    await ctx.db.insert("payoutRequests", {
      merchantId: merchantIds[merchantIndex],
      amount,
      method: m.payoutMethod,
      account: m.payoutAccount || "Cash at office",
      status,
      createdAt,
      ...extra,
    });
    requests++;
  };
  // Open: every sender still owed money, up to 4.
  let open = 0;
  for (const sender of SENDERS) {
    if (open >= 4) break;
    const balance = finished
      .filter((p) => p.merchantId === merchantIds[sender.index] && p.settlement === "unpaid")
      .reduce((sum, p) => sum + merchantNet(p), 0);
    if (balance > 0) {
      await request(sender.index, balance, "open", now - (2 + open * 5) * HOUR, {
        note: ["Please send today if possible", undefined, "Need it for stock purchase", undefined][open],
      });
      open++;
    }
  }
  // Paid: the request behind each of the first payouts.
  for (const payoutId of payoutIds.slice(0, 5)) {
    const po = await ctx.db.get("payouts", payoutId);
    if (!po) continue;
    const idx = merchantIds.indexOf(po.merchantId);
    await request(idx, po.amount, "paid", po.createdAt - 6 * HOUR, { payoutId, decidedAt: po.createdAt });
  }
  await request(0, 2500, "rejected", now - 20 * DAY, {
    reason: "The bKash number does not match the one on file.",
    decidedAt: now - 19 * DAY,
  });
  await request(3, 1800, "rejected", now - 14 * DAY, {
    reason: "Some parcels were still being returned. Please ask again next week.",
    decidedAt: now - 13 * DAY,
  });
  while (requests < 12) {
    await request(SENDERS[requests % SENDERS.length].index, 1000 + requests * 150, "cancelled", now - (10 + requests) * DAY, {
      decidedAt: now - (10 + requests) * DAY + HOUR,
    });
  }

  /* ---- cash hand-overs: deposited COD grouped by rider, split to 12 */
  const byRider = new Map<Id<"users">, Doc<"parcels">[]>();
  for (const p of finished) {
    if (p.cashState !== "deposited" || !p.deliveryRiderId) continue;
    byRider.set(p.deliveryRiderId, [...(byRider.get(p.deliveryRiderId) ?? []), p]);
  }
  const groups = [...byRider.entries()].map(([riderId, list]) => ({ riderId, list }));
  while (groups.length < 12) {
    groups.sort((a, b) => b.list.length - a.list.length);
    const big = groups[0];
    if (big.list.length < 2) break;
    const half = Math.ceil(big.list.length / 2);
    groups.push({ riderId: big.riderId, list: big.list.slice(half) });
    big.list = big.list.slice(0, half);
  }
  for (const g of groups) {
    await ctx.db.insert("cashDeposits", {
      riderId: g.riderId,
      amount: g.list.reduce((sum, p) => sum + p.collectedAmount, 0),
      parcelCount: g.list.length,
      receivedBy: payer,
      createdAt: Math.max(...g.list.map((p) => p.finalAt ?? 0)) + 6 * HOUR,
    });
  }

  /* ---- chats with the office: unread, answered, limit reached, settled */
  const MIN = 60_000;
  const CHATS: { m: number; msgs: [("a" | "m"), string, number][] }[] = [
    {
      m: 0,
      msgs: [
        ["m", "Assalamu alaikum. Can you pick up 15 parcels from Dhanmondi before 11 AM tomorrow?", 95],
        ["m", "Most of them are for Uttara and Mirpur.", 93],
      ],
    },
    {
      m: 1,
      msgs: [
        ["m", "My payout request is pending since morning. When will I get it?", 300],
        ["a", "Hi Nusrat apu, we checked it. It will be sent to your Nagad today before 6 PM.", 240],
      ],
    },
    {
      m: 3,
      msgs: [
        ["m", "One of my parcels was returned, but the customer says nobody called her.", 70],
        ["m", "Please check with the rider.", 66],
        ["m", "Hello?", 50],
        ["m", "I need an answer today, it's a regular customer.", 30],
        ["m", "Please reply.", 12],
      ],
    },
    {
      m: 5,
      msgs: [
        ["m", "Can you deliver cakes in Uttara within 3 hours?", 3 * 1440],
        ["a", "Yes! Uttara express is 3 hours if you book between 6 AM and 12 noon.", 3 * 1440 - 20],
        ["m", "Perfect, thank you.", 3 * 1440 - 25],
        ["a", "You're welcome. Mark cakes as Bakery so riders keep them upright.", 3 * 1440 - 30],
      ],
    },
    {
      m: 9,
      msgs: [["m", "What documents do I need for business verification? I only have NID.", 180]],
    },
  ];
  for (const c of CHATS) {
    const merchantId = merchantIds[c.m];
    let sentInRow = 0;
    let adminUnread = 0;
    let merchantUnread = 0;
    // Oldest first.
    const ordered = [...c.msgs].sort((a, b) => b[2] - a[2]);
    for (const [who, body, minsAgo] of ordered) {
      await ctx.db.insert("chatMessages", { merchantId, from: who === "a" ? "admin" : "merchant", body, createdAt: now - minsAgo * MIN });
      if (who === "m") {
        sentInRow++;
        adminUnread++;
        merchantUnread = 0;
      } else {
        sentInRow = 0;
        adminUnread = 0;
        merchantUnread++;
      }
    }
    const lastMsg = ordered[ordered.length - 1];
    // The settled chat has been read on both sides.
    const settled = c.m === 5;
    await ctx.db.insert("chatThreads", {
      merchantId,
      lastMessageAt: now - lastMsg[2] * MIN,
      lastBody: lastMsg[1].length > 90 ? lastMsg[1].slice(0, 90) + "…" : lastMsg[1],
      lastFrom: lastMsg[0] === "a" ? "admin" : "merchant",
      adminUnread: settled ? 0 : adminUnread,
      merchantUnread: settled ? 0 : merchantUnread,
      merchantSent: sentInRow,
      adminSeenAt: settled ? now - lastMsg[2] * MIN : undefined,
      merchantSeenAt: settled ? now - lastMsg[2] * MIN : undefined,
    });
  }

  return {
    merchants: merchantIds.length,
    riders: riderIds.length,
    applications: APPLICANTS.length,
    parcels: plan.length,
    payouts: payoutIds.length,
    payoutRequests: requests,
    cashDeposits: groups.length,
  };
}

async function clear(ctx: MutationCtx) {
  const users = await demoUsers(ctx);
  if (users.length === 0) throw new ConvexError("There is no demo data to clear.");
  const demoIds = new Set<string>(users.map((u) => u._id));

  // Refuse rather than orphan real work that was handed to a demo rider.
  for (const u of users.filter((x) => x.role === "rider")) {
    const asPickup = await ctx.db
      .query("parcels")
      .withIndex("by_pickupRiderId_and_status", (q) => q.eq("pickupRiderId", u._id))
      .take(500);
    const asDelivery = await ctx.db
      .query("parcels")
      .withIndex("by_deliveryRiderId_and_status", (q) => q.eq("deliveryRiderId", u._id))
      .take(500);
    const real = [...asPickup, ...asDelivery].find((p) => !demoIds.has(p.merchantId));
    if (real) {
      throw new ConvexError(
        `Real parcel ${real.trackingCode} is assigned to ${u.name}. Give it to a real rider first, then clear the demo data.`,
      );
    }
  }

  let parcels = 0;
  const lost = new Map<string, number>();
  for (const u of users) {
    if (u.role === "merchant") {
      const rows = await ctx.db
        .query("parcels")
        .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", u._id))
        .take(2000);
      for (const p of rows) {
        const events = await ctx.db
          .query("parcelEvents")
          .withIndex("by_parcelId_and_at", (q) => q.eq("parcelId", p._id))
          .take(200);
        for (const e of events) await ctx.db.delete("parcelEvents", e._id);
        for (const scope of ["all", p.merchantId as string]) {
          lost.set(`${scope}|${p.status}`, (lost.get(`${scope}|${p.status}`) ?? 0) + 1);
        }
        await ctx.db.delete("parcels", p._id);
        parcels++;
      }
      const payouts = await ctx.db
        .query("payouts")
        .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", u._id))
        .take(500);
      for (const p of payouts) await ctx.db.delete("payouts", p._id);
      const requests = await ctx.db
        .query("payoutRequests")
        .withIndex("by_merchantId_and_createdAt", (q) => q.eq("merchantId", u._id))
        .take(500);
      for (const r of requests) await ctx.db.delete("payoutRequests", r._id);
      const counters = await ctx.db
        .query("statusCounts")
        .withIndex("by_scope_and_status", (q) => q.eq("scope", u._id))
        .take(20);
      for (const c of counters) await ctx.db.delete("statusCounts", c._id);
      await removeVerification(ctx, u._id);
      await removeChat(ctx, u._id);
    } else {
      const deposits = await ctx.db
        .query("cashDeposits")
        .withIndex("by_riderId_and_createdAt", (q) => q.eq("riderId", u._id))
        .take(500);
      for (const d of deposits) await ctx.db.delete("cashDeposits", d._id);
      const profile = await ctx.db
        .query("riderProfiles")
        .withIndex("by_riderId", (q) => q.eq("riderId", u._id))
        .unique();
      if (profile) await ctx.db.delete("riderProfiles", profile._id);
    }
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_userId", (q) => q.eq("userId", u._id))
      .take(100);
    for (const s of sessions) await ctx.db.delete("sessions", s._id);
    await ctx.db.delete("users", u._id);
  }

  for (const st of ["new", "interview", "hired", "rejected"] as const) {
    const apps = await ctx.db
      .query("riderApplications")
      .withIndex("by_status_and_createdAt", (q) => q.eq("status", st))
      .take(1000);
    for (const a of apps.filter((x) => x.demo)) await ctx.db.delete("riderApplications", a._id);
  }

  for (const [key, n] of lost) {
    const [scope, status] = key.split("|") as [string, Status];
    if (scope !== "all") continue; // per-merchant rows were deleted above
    const row = await ctx.db
      .query("statusCounts")
      .withIndex("by_scope_and_status", (q) => q.eq("scope", scope).eq("status", status))
      .unique();
    if (row) await ctx.db.patch("statusCounts", row._id, { count: Math.max(0, row.count - n) });
  }
  return { users: users.length, parcels };
}

export const status = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    const users = await demoUsers(ctx);
    return {
      loaded: users.length > 0,
      merchants: users.filter((u) => u.role === "merchant").length,
      riders: users.filter((u) => u.role === "rider").length,
    };
  },
});

/*
  Loading runs as an action because the sample verification documents are
  real files in storage, and only actions can create files. The action makes
  the files, then one mutation writes everything else; if that fails the files
  are deleted again.
*/
export const load = action({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<SeedResult> => {
    await ctx.runQuery(internal.demo.canLoad, { token: args.token });
    return await loadWith(ctx, args.token);
  },
});

/** CLI: npx convex run --prod demo:loadInternal */
export const loadInternal = internalAction({
  args: {},
  handler: async (ctx): Promise<SeedResult> => {
    await ctx.runQuery(internal.demo.canLoad, {});
    return await loadWith(ctx, undefined);
  },
});

type SeedResult = Awaited<ReturnType<typeof seed>>;

async function loadWith(ctx: ActionCtx, token: string | undefined): Promise<SeedResult> {
  const files: DemoFiles[] = [];
  const stored: Id<"_storage">[] = [];
  const store = async (title: string, lines: string[]) => {
    const id = await ctx.storage.store(samplePdf(title, lines));
    stored.push(id);
    return id;
  };
  try {
    for (const [i, m] of MERCHANTS.entries()) {
      if (!m.verification) continue;
      const who = [`Name: ${m.name}`, `Business: ${m.businessName}`, `NID: ${1980000000000 + i * 7654321}`];
      files.push({
        phone: merchantPhone(i),
        nidFront: await store("NID card - front (SAMPLE)", who),
        nidBack: await store("NID card - back (SAMPLE)", [...who, "Address: Dhaka"]),
        tinFile: i % 2 === 0 ? await store("TIN certificate (SAMPLE)", [`Taxpayer: ${m.name}`, `TIN: ${100000000000 + i * 1234567}`]) : undefined,
        tradeLicenseFile:
          i % 3 !== 2 ? await store("Trade licence (SAMPLE)", [`Business: ${m.businessName}`, m.pickupAddress, "Valid until June 2027"]) : undefined,
        otherFiles: i === 0 ? [await store("Shop photo (SAMPLE)", [m.businessName, m.pickupAddress])] : [],
      });
    }
    return await ctx.runMutation(internal.demo.seedInternal, { token, files });
  } catch (e) {
    for (const id of stored) await ctx.storage.delete(id);
    throw e;
  }
}

export const canLoad = internalQuery({
  args: { token: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.token !== undefined) await requireUser(ctx, args.token, ["admin"]);
    if ((await demoUsers(ctx)).length > 0) throw new ConvexError("Demo data is already loaded.");
    return null;
  },
});

export const seedInternal = internalMutation({
  args: { token: v.optional(v.string()), files: v.array(demoFiles) },
  handler: async (ctx, args) => {
    const admin =
      args.token !== undefined
        ? await requireUser(ctx, args.token, ["admin"])
        : await ctx.db
            .query("users")
            .withIndex("by_role_and_status", (q) => q.eq("role", "admin").eq("status", "active"))
            .first();
    return await seed(ctx, admin?._id, args.files);
  },
});

/** A one-page PDF with a title and a few lines, clearly marked as a sample. */
function samplePdf(title: string, lines: string[]) {
  const esc = (t: string) => t.replace(/[^\x20-\x7e]/g, "?").replace(/[\\()]/g, (m) => "\\" + m);
  let content = "0.96 0.45 0.1 RG 4 w 30 30 535 782 re S\n";
  content += `BT /F1 24 Tf 50 770 Td (${esc(title)}) Tj ET\n`;
  lines.forEach((l, i) => (content += `BT /F1 14 Tf 50 ${725 - i * 24} Td (${esc(l)}) Tj ET\n`));
  content += "BT /F1 40 Tf 0.85 g 120 380 Td (DEMO - NOT REAL) Tj ET\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}endstream`,
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([out], { type: "application/pdf" });
}

export const remove = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx, args.token, ["admin"]);
    return await clear(ctx);
  },
});

/** CLI: npx convex run --prod demo:removeInternal */
export const removeInternal = internalMutation({
  args: {},
  handler: async (ctx) => await clear(ctx),
});

/*
  Keeps the demo alive: every minute (see crons.ts) one or two demo parcels
  take their next step — picked up, at the hub, out for delivery, delivered,
  sometimes held or returned — and now and then a new demo order comes in.
  Moves go through changeStatus, exactly like a rider or the office pressing
  the button, so the money side stays right. Only demo parcels (those of demo
  merchants) are ever touched, and nothing runs when no demo data is loaded.
*/
const MOVING: Status[] = ["pending", "picked_up", "at_hub", "out_for_delivery", "hold", "returning"];

export const tick = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await demoUsers(ctx);
    if (users.length === 0) return null;
    const merchants = users.filter((u) => u.role === "merchant" && u.status === "active" && u.verification === "approved");
    const riders = users.filter((u) => u.role === "rider" && u.status === "active");
    const demoMerchant = new Set<string>(merchants.map((m) => m._id));
    const admin = await ctx.db
      .query("users")
      .withIndex("by_role_and_status", (q) => q.eq("role", "admin").eq("status", "active"))
      .first();
    if (!admin || riders.length === 0 || merchants.length === 0) return null;

    const moving: Doc<"parcels">[] = [];
    for (const status of MOVING) {
      const rows = await ctx.db
        .query("parcels")
        .withIndex("by_status_and_createdAt", (q) => q.eq("status", status))
        .order("asc")
        .take(200);
      moving.push(...rows.filter((p) => demoMerchant.has(p.merchantId)));
    }

    const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
    const steps = 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let n = 0; n < steps && moving.length > 0; n++) {
      // Pick a stage (deliveries a bit more often), then one of its oldest parcels.
      const weight: Partial<Record<Status, number>> = { out_for_delivery: 3, at_hub: 2, picked_up: 2, pending: 2, hold: 1, returning: 1 };
      const stages = MOVING.filter((st) => moving.some((x) => x.status === st));
      const total = stages.reduce((sum, st) => sum + (weight[st] ?? 1), 0);
      let r = Math.random() * total;
      const stage = stages.find((st) => (r -= weight[st] ?? 1) < 0) ?? stages[0];
      const inStage = moving.filter((x) => x.status === stage);
      const p = inStage[Math.floor(Math.random() * Math.min(inStage.length, 4))];
      moving.splice(moving.indexOf(p), 1);
      const pickupRider = riders.find((r) => r._id === p.pickupRiderId) ?? pick(riders);
      const deliveryRider = riders.find((r) => r._id === p.deliveryRiderId) ?? pick(riders);
      const roll = Math.random();
      try {
        if (p.status === "pending") {
          if (p.pickupRiderId !== pickupRider._id) await ctx.db.patch("parcels", p._id, { pickupRiderId: pickupRider._id });
          await changeStatus(ctx, { ...p, pickupRiderId: pickupRider._id }, pickupRider, "picked_up");
        } else if (p.status === "picked_up") {
          await changeStatus(ctx, p, admin, "at_hub");
        } else if (p.status === "at_hub") {
          await changeStatus(ctx, p, admin, "out_for_delivery", { deliveryRiderId: deliveryRider._id });
        } else if (p.status === "out_for_delivery") {
          if (!p.deliveryRiderId) continue;
          const rider = riders.find((r) => r._id === p.deliveryRiderId);
          if (!rider) continue;
          if (roll < 0.7) await changeStatus(ctx, p, rider, "delivered");
          else if (roll < 0.78 && p.codAmount > 1) {
            await changeStatus(ctx, p, rider, "partial_delivered", {
              collectedAmount: Math.floor(p.codAmount / 2 / 10) * 10,
              note: "Customer kept only part of the order",
            });
          } else if (roll < 0.9) await changeStatus(ctx, p, rider, "hold", { note: pick(HOLD_REASONS) });
          else await changeStatus(ctx, p, rider, "returning", { note: pick(RETURN_REASONS) });
        } else if (p.status === "hold") {
          const rider = riders.find((r) => r._id === p.deliveryRiderId);
          if (rider) await changeStatus(ctx, p, rider, "out_for_delivery");
        } else if (p.status === "returning") {
          await changeStatus(ctx, p, admin, "returned");
        }
      } catch {
        // A rule said no (e.g. rider changed); try another parcel next minute.
      }
    }

    // A new order now and then, while the pipeline isn't overflowing.
    if (Math.random() < 0.4 && moving.length < 70) {
      const sender = pick(SENDERS);
      const merchant = merchants.find((m) => m.phone === merchantPhone(sender.index));
      if (merchant) {
        const regular = Math.random() < 0.3 ? pick(REPEAT_CUSTOMERS) : undefined;
        const k = Math.floor(Math.random() * 1000);
        const [address, district, zone] = PLACES[regular ? regular.place : k % PLACES.length];
        const { id } = await insertParcel(ctx, await getRates(ctx), merchant, merchant, {
          invoice: `INV-${3000 + k}`,
          recipientName: regular?.name ?? `${pick(FIRST)} ${pick(LAST)}`,
          recipientPhone: regular?.phone ?? "017" + String(30000000 + k * 61 + Math.floor(Math.random() * 50)).padStart(8, "0"),
          recipientAddress: address,
          district,
          zone,
          category: pick(sender.categories),
          weightKg: pick(WEIGHTS),
          codAmount: pick(COD),
          itemDescription: pick(sender.items),
          note: pick(NOTES),
        });
        await ctx.db.patch("parcels", id, { pickupRiderId: pick(riders)._id });
      }
    }
    return null;
  },
});

