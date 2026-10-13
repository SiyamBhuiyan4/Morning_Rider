import type { Doc } from "../../convex/_generated/dataModel";
import { getLang, t } from "./prefs";

export type Status = Doc<"parcels">["status"];
export type Zone = Doc<"parcels">["zone"];

/*
  Numbers and dates follow the chosen language: Bangla mode shows Bangla
  digits and month names everywhere, so a sentence never mixes "১৪ দিন" with
  "13 Oct". (The app re-mounts on a language switch, so these re-run.)
*/
const locale = () => (getLang() === "bn" ? "bn-BD" : "en-GB");
const numberLocale = () => (getLang() === "bn" ? "bn-BD" : "en-IN");

export const num = (n: number) => new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 0 }).format(n);
export const tk = (n: number) => `৳${num(n)}`;
/** Up to one decimal place, e.g. weights like 2.5 kg. */
export const dec = (n: number) => new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 1 }).format(n);

// Bangla mode uses 24-hour time: browsers print "PM" in Latin letters for bn-BD.
const hour12 = () => getLang() !== "bn";

export const dateTime = (ms: number) =>
  new Date(ms).toLocaleString(locale(), { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: hour12() });
export const date = (ms: number) =>
  new Date(ms).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
export const shortDate = (ms: number) => new Date(ms).toLocaleDateString(locale(), { day: "numeric", month: "short" });
// Date and time formatted separately: bn-BD otherwise inserts a stray "এ" between them.
export const longDateTime = (ms: number) => {
  const d = new Date(ms);
  const day = d.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long" });
  const time = d.toLocaleTimeString(locale(), { hour: "numeric", minute: "2-digit", hour12: hour12() });
  return `${day}, ${time}`;
};

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const STATUS: Record<Status, { label: string; tone: string; dot: string }> = {
  pending: { get label() { return t("Pending"); }, tone: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  picked_up: { get label() { return t("Picked up"); }, tone: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  at_hub: { get label() { return t("At hub"); }, tone: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-500" },
  out_for_delivery: { get label() { return t("Out for delivery"); }, tone: "bg-brand-50 text-brand-700", dot: "bg-brand" },
  hold: { get label() { return t("On hold"); }, tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  delivered: { get label() { return t("Delivered"); }, tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  partial_delivered: { get label() { return t("Partial delivered"); }, tone: "bg-teal-50 text-teal-700", dot: "bg-teal-500" },
  returning: { get label() { return t("Returning"); }, tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  returned: { get label() { return t("Returned"); }, tone: "bg-red-50 text-red-700", dot: "bg-red-500" },
  cancelled: { get label() { return t("Cancelled"); }, tone: "bg-zinc-100 text-zinc-500", dot: "bg-zinc-400" },
};

export const STATUS_ORDER: Status[] = [
  "pending",
  "picked_up",
  "at_hub",
  "out_for_delivery",
  "hold",
  "delivered",
  "partial_delivered",
  "returning",
  "returned",
  "cancelled",
];

export const ZONES = ["uttara", "dhaka_city", "gazipur_city", "narayanganj_city"] as const;

export const ZONE: Record<Zone, string> = {
  get uttara() {
    return t("Uttara (3-hour express)");
  },
  get dhaka_city() {
    return t("Dhaka City");
  },
  get gazipur_city() {
    return t("Gazipur City");
  },
  get narayanganj_city() {
    return t("Narayanganj City");
  },
};

/** How fast each zone is delivered — from Morning Rider's own posters. */
export const ZONE_TIME: Record<(typeof ZONES)[number], string> = {
  get uttara() {
    return t("Within 3 hours");
  },
  get dhaka_city() {
    return t("Same day");
  },
  get gazipur_city() {
    return t("Same day");
  },
  get narayanganj_city() {
    return t("Same day");
  },
};

export type Category = NonNullable<Doc<"parcels">["category"]>;

export const CATEGORY: Record<Category, { label: string; emoji: string; careful?: string }> = {
  parcel: { get label() { return t("Parcel"); }, emoji: "📦" },
  document: { get label() { return t("Documents"); }, emoji: "📄" },
  food: { get label() { return t("Food"); }, emoji: "🍔", get careful() { return t("Food — deliver quickly, keep upright"); } },
  medicine: { get label() { return t("Medicine"); }, emoji: "💊", get careful() { return t("Medicine — urgent"); } },
  shopping: { get label() { return t("Shopping"); }, emoji: "🛍️" },
  electronics: { get label() { return t("Electronics"); }, emoji: "📱", get careful() { return t("Fragile — handle with care"); } },
  cosmetics: { get label() { return t("Cosmetics & beauty"); }, emoji: "💄" },
  gift: { get label() { return t("Gift"); }, emoji: "🎁" },
  frozen: { get label() { return t("Frozen item"); }, emoji: "❄️", get careful() { return t("Frozen — keep cold, deliver within 6 hours"); } },
  bakery: { get label() { return t("Cake & bakery"); }, emoji: "🎂", get careful() { return t("Cake — keep flat, handle with care"); } },
  home: { get label() { return t("Home & kitchen"); }, emoji: "🏠" },
  business: { get label() { return t("Shop / business goods"); }, emoji: "🏪" },
};

/** Area suggestions for the address form (free text is still allowed). */
export const AREAS = [
  "Uttara", "Uttara Sector 1", "Uttara Sector 3", "Uttara Sector 4", "Uttara Sector 7", "Uttara Sector 9",
  "Uttara Sector 10", "Uttara Sector 11", "Uttara Sector 13", "Uttara Sector 14", "Diabari", "Abdullahpur",
  "Airport", "Khilkhet", "Nikunja", "Bashundhara", "Badda", "Rampura", "Banani", "Gulshan 1", "Gulshan 2",
  "Baridhara", "Mohakhali", "Tejgaon", "Farmgate", "Karwan Bazar", "Mirpur 1", "Mirpur 2", "Mirpur 10",
  "Mirpur 11", "Mirpur 12", "Pallabi", "Kafrul", "Mohammadpur", "Shyamoli", "Dhanmondi", "Lalmatia",
  "New Market", "Motijheel", "Paltan", "Malibagh", "Moghbazar", "Khilgaon", "Basabo", "Jatrabari",
  "Demra", "Old Dhaka", "Keraniganj", "Tongi", "Gazipur Sadar", "Joydebpur", "Board Bazar", "Konabari",
  "Kashimpur", "Narayanganj Sadar", "Chashara", "Fatullah", "Siddhirganj",
];

/** Best guess of the zone from the area; the sender can still change it. */
export function zoneFor(area: string): (typeof ZONES)[number] {
  // English or Bangla spellings of the area both work.
  // NFC so য়/ড় typed either way (one code point or two) still match.
  const a = area.normalize("NFC").toLowerCase();
  if (/uttara|diabari|abdullahpur|উত্তরা|দিয়াবাড়ি|আব্দুল্লাহপুর/.test(a)) return "uttara";
  if (/gazipur|tongi|joydebpur|board bazar|konabari|kashimpur|গাজীপুর|টঙ্গী|জয়দেবপুর|বোর্ড বাজার|কোনাবাড়ি|কাশিমপুর/.test(a)) return "gazipur_city";
  if (/narayanganj|chashara|fatullah|siddhirganj|নারায়ণগঞ্জ|চাষাড়া|ফতুল্লা|সিদ্ধিরগঞ্জ/.test(a)) return "narayanganj_city";
  return "dhaka_city";
}

export const PAYOUT_METHOD: Record<"bkash" | "nagad" | "rocket" | "bank" | "cash", string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  get bank() {
    return t("Bank transfer");
  },
  get cash() {
    return t("Cash");
  },
};

