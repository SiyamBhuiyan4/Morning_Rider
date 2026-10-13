import { useSyncExternalStore } from "react";
import { BN } from "./bn";

/*
  Two user preferences that live in the browser: theme (light/dark) and
  language (English/Bangla). Both are tiny external stores so non-React code
  (toasts, error messages) can read them too.
*/

export type Theme = "light" | "dark";
export type Lang = "en" | "bn";

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

let theme: Theme = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
let lang: Lang = (() => {
  try {
    return localStorage.getItem("mr.lang") === "bn" ? "bn" : "en";
  } catch {
    return "en";
  }
})();

export function setTheme(next: Theme) {
  theme = next;
  document.documentElement.setAttribute("data-theme", next);
  try {
    localStorage.setItem("mr.theme", next);
  } catch {
    /* private mode */
  }
  emit();
}

export function setLang(next: Lang) {
  lang = next;
  document.documentElement.lang = next;
  try {
    localStorage.setItem("mr.lang", next);
  } catch {
    /* private mode */
  }
  emit();
}

export const useTheme = () => useSyncExternalStore(subscribe, () => theme);
export const useLang = () => useSyncExternalStore(subscribe, () => lang);
export const getLang = () => lang;

/**
 * Translate. Keys are the English text itself, so a missing Bangla entry
 * falls back to English instead of showing a key. `{name}` placeholders are
 * filled from `vars`.
 *
 * The app root is keyed on the language, so switching re-renders everything.
 */
export function t(en: string, vars?: Record<string, string | number>): string {
  let out = lang === "bn" ? (BN[en] ?? en) : en;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      // Plain numbers follow the language; strings (codes, phones, names) stay as given.
      out = out.replaceAll(`{${k}}`, typeof v === "number" && lang === "bn" ? bnDigits(String(v)) : String(v));
    }
  }
  return out;
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export function bnDigits(s: string) {
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/*
  Server messages arrive in English. Fixed ones translate directly; the few
  that carry a number or name are matched by pattern.
*/
const SERVER_PATTERNS: [RegExp, string][] = [
  [/^Wrong phone number or password\. (\d+) tr(?:y|ies) left\.$/, "Wrong phone number or password. {1} tries left."],
  [/^Wrong passcode\. (\d+) tr(?:y|ies) left\.$/, "Wrong passcode. {1} tries left."],
  [/^Cannot move this parcel from "(.+)" to "(.+)"\.$/, "This status change is not allowed."],
  [/^Row (\d+): (.+)$/, "Row {1}: {2}"],
  [/^The balance changed to (.+)\. Review it and confirm again\.$/, "The balance changed to {1}. Review it and confirm again."],
  [/^The amount changed to (.+)\. Review it and confirm again\.$/, "The amount changed to {1}. Review it and confirm again."],
  [/^Collected amount must be between 0 and (\d+) for a partial delivery\.$/, "Collected amount must be between 0 and {1} for a partial delivery."],
  [/^Password must be at least (\d+) characters\.$/, "Password must be at least {1} characters."],
  [/^(.+) is too long \(max (\d+) characters\)\.$/, "{1} is too long (max {2} characters)."],
  [/^(.+) is required\.$/, "{1} is required."],
  [/^Phone (\S+) is already used by a real account\.$/, "Phone {1} is already used by a real account."],
  [/^Real parcel (\S+) is assigned to (.+)\. Give it to a real rider first, then clear the demo data\.$/, "Real parcel {1} is assigned to {2}. Give it to a real rider first, then clear the demo data."],
  [/^Each rate must be between 0 and (\d+)\.$/, "Each rate must be between 0 and {1}."],
  [/^Add at most (\d+) other documents\.$/, "Add at most {1} other documents."],
  [/^(.+): enter a valid Bangladeshi mobile number \(01XXXXXXXXX\)\.$/, "{1}: enter a valid Bangladeshi mobile number (01XXXXXXXXX)."],
];

export function translateServer(msg: string): string {
  if (lang === "en") return msg;
  if (BN[msg]) return BN[msg];
  for (const [re, key] of SERVER_PATTERNS) {
    const m = msg.match(re);
    if (m) {
      let out = BN[key] ?? key;
      m.slice(1).forEach((g, i) => {
        out = out.replace(`{${i + 1}}`, serverValue(g));
      });
      return out;
    }
  }
  return msg;
}

/* Field names the server puts into "… is required." style messages. */
const FIELD_LABELS = new Set([
  "Address", "Area", "Business name", "Customer name", "Email", "Interview place", "Invoice",
  "Item description", "Name", "Note", "Payment account", "Pickup address", "Reason", "Reference",
  "NID number", "TIN number", "Trade licence number",
  "WhatsApp", "Father's phone", "Mother's phone", "Guardian's phone", "Date of birth", "ID number", "Institution",
  "Blood group", "Facebook", "Father's name", "Mother's name", "Guardian's name", "Relation", "Present address",
  "Permanent address", "Motorcycle number", "Driving licence number", "Notes",
]);

/**
 * One captured value inside a server message. Amounts and counts get Bangla
 * digits; field names and nested messages ("Row 3: <message>") are
 * translated; anything else — a phone number, tracking code or person's
 * name — is shown exactly as given, so a rider called "Cash" stays "Cash".
 */
function serverValue(g: string) {
  if (/^0\d{10}$/.test(g)) return g; // phone number
  if (/^৳?[\d,.]+$/.test(g)) return bnDigits(g); // amount or count
  if (FIELD_LABELS.has(g)) return BN[g] ?? g;
  if (/[.!?]$/.test(g)) return translateServer(g); // a whole nested message
  return g;
}
