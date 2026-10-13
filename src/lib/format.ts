import type { Doc } from "../../convex/_generated/dataModel";
import { t } from "./prefs";

export type Status = Doc<"parcels">["status"];
export type Zone = Doc<"parcels">["zone"];

const taka = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
export const tk = (n: number) => `৳${taka.format(n)}`;
export const num = (n: number) => taka.format(n);

export const dateTime = (t: number) =>
  new Date(t).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const date = (t: number) =>
  new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

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

export const ZONE: Record<Zone, string> = {
  get inside_dhaka() {
    return t("Inside Dhaka");
  },
  get sub_dhaka() {
    return t("Dhaka Sub-area");
  },
  get outside_dhaka() {
    return t("Outside Dhaka");
  },
};

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

export const DISTRICTS = [
  "Dhaka", "Gazipur", "Narayanganj", "Munshiganj", "Manikganj", "Narsingdi", "Faridpur", "Gopalganj",
  "Kishoreganj", "Madaripur", "Rajbari", "Shariatpur", "Tangail", "Chattogram", "Cox's Bazar", "Cumilla",
  "Brahmanbaria", "Chandpur", "Feni", "Lakshmipur", "Noakhali", "Khagrachhari", "Rangamati", "Bandarban",
  "Rajshahi", "Bogura", "Joypurhat", "Naogaon", "Natore", "Chapai Nawabganj", "Pabna", "Sirajganj",
  "Khulna", "Bagerhat", "Chuadanga", "Jashore", "Jhenaidah", "Kushtia", "Magura", "Meherpur", "Narail",
  "Satkhira", "Barishal", "Barguna", "Bhola", "Jhalokati", "Patuakhali", "Pirojpur", "Sylhet",
  "Habiganj", "Moulvibazar", "Sunamganj", "Rangpur", "Dinajpur", "Gaibandha", "Kurigram", "Lalmonirhat",
  "Nilphamari", "Panchagarh", "Thakurgaon", "Mymensingh", "Jamalpur", "Netrokona", "Sherpur",
];

/** Best guess of the zone from the district; the merchant can still change it. */
export function zoneFor(district: string): Zone {
  if (district === "Dhaka") return "inside_dhaka";
  if (["Gazipur", "Narayanganj", "Munshiganj", "Manikganj"].includes(district)) return "sub_dhaka";
  return "outside_dhaka";
}
