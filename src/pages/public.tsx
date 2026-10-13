import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Bike,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  MapPin,
  MessageCircle,
  PackageCheck,
  PackageSearch,
  Phone,
  Search,
  ShieldCheck,
  Snowflake,
  Sunrise,
  ThumbsUp,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Link, navigate } from "../lib/router";
import { useSession } from "../lib/session";
import { errorText, useToast } from "../lib/toast";
import { CATEGORY, PAYOUT_METHOD, STATUS, ZONE, dateTime, tk, type Category } from "../lib/format";
import { CONTACT } from "../lib/contact";
import { Button, Card, Field, Input, Logo, Select, StatusBadge, Textarea, Wordmark, cx } from "../components/ui";
import { IS_ADMIN_PORTAL } from "../lib/portal";
import { Prefs } from "../components/Prefs";
import { getLang, t, translateServer } from "../lib/prefs";

/** Only same-site paths may be used as a post-login destination. */
export function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/app";
}
const nextParam = () => new URLSearchParams(location.search).get("next");
const withNext = (path: string) => {
  const n = nextParam();
  return n ? `${path}?next=${encodeURIComponent(n)}` : path;
};

/* ------------------------------------------------------------------ nav */

function PublicNav() {
  const { me } = useSession();
  return (
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5">
      <Link href="/" className="flex items-center gap-3">
        <Logo size={46} className="ring-2 ring-white/25" />
        <span className="hidden sm:block">
          <Wordmark dark />
        </span>
      </Link>
      <nav className="flex items-center gap-1.5 sm:gap-2">
        <a href="/#services" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/75 hover:text-white lg:block">
          {t("Services")}
        </a>
        <a href="/#pricing" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/75 hover:text-white lg:block">
          {t("Pricing")}
        </a>
        <a href="/#join" className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-white/75 hover:text-white lg:block">
          {t("Join as rider")}
        </a>
        <Prefs onDark />
        {me ? (
          <Button onClick={() => navigate("/app")}>{t("Dashboard")}</Button>
        ) : (
          <Button onClick={() => navigate("/login")}>{t("Merchant login")}</Button>
        )}
      </nav>
    </header>
  );
}

function TrackBox({ big }: { big?: boolean }) {
  const [code, setCode] = useState("");
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const c = code.trim().toUpperCase();
          if (c) navigate(`/track/${encodeURIComponent(c)}`);
        }}
        className={cx("flex w-full gap-2 rounded-2xl bg-surface p-2 shadow-[var(--shadow-pop)]", big && "sm:p-2.5")}
      >
        <div className="flex flex-1 items-center gap-2 pl-3">
          <PackageSearch className="size-5 shrink-0 text-brand" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("Enter tracking ID, e.g. MR7K2Q9XPA")}
            className="h-11 w-full min-w-0 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-ink-3"
            maxLength={20}
          />
        </div>
        <Button type="submit" size="lg" icon={Search}>
          {t("Track")}
        </Button>
      </form>
      <p className="mt-2 flex items-center gap-1.5 text-xs text-white/55">
        <Lock className="size-3" /> {t("Merchants and riders can track their own parcels after logging in.")}
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- home */

const SERVICES: Category[] = [
  "parcel",
  "document",
  "food",
  "medicine",
  "shopping",
  "electronics",
  "cosmetics",
  "gift",
  "frozen",
  "bakery",
  "home",
  "business",
];

const COVERAGE = [
  "Uttara",
  "Gulshan",
  "Banani",
  "Dhanmondi",
  "Mirpur",
  "Mohammadpur",
  "Bashundhara",
  "Badda",
  "Tejgaon",
  "Motijheel",
  "Jatrabari",
  "Khilgaon",
  "Tongi",
  "Gazipur Sadar",
  "Board Bazar",
  "Narayanganj Sadar",
];

function SectionTitle({ kicker, title, text }: { kicker: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">{kicker}</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-ink-2">{text}</p>}
    </div>
  );
}

export function Home() {
  const rates = useQuery(api.settings.publicRates);
  const bn = getLang() === "bn";

  return (
    <div className="min-h-full bg-page">
      {/* ---------------- hero */}
      <section className="sunrise relative overflow-hidden pb-28">
        <PublicNav />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pt-8 lg:grid-cols-[1.15fr_1fr] lg:pt-14">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-sun ring-1 ring-white/15">
              <Zap className="size-3.5" /> {t("FAST • SAFE • ON TIME")}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold italic leading-[1.08] tracking-tight text-white sm:text-6xl">
              {bn ? (
                <>
                  ডেলিভারি নিয়ে
                  <br />
                  আর <span className="text-brand">টেনশন নেই!</span>
                </>
              ) : (
                <>
                  Your parcel,
                  <br />
                  <span className="text-brand">delivered</span> by morning.
                </>
              )}
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-white/70">
              {t(
                "Morning Rider delivers parcels, food, medicine, frozen items and more across Dhaka, Gazipur and Narayanganj — 7 days a week, starting at 6 AM.",
              )}
            </p>
            <div className="mt-7 max-w-xl">
              <TrackBox big />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/register")}>
                {t("Become a merchant")} <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
          <div className="relative mx-auto hidden w-full max-w-md lg:block">
            <div className="absolute -inset-10 rounded-full bg-sun/25 blur-3xl" />
            <img src="/brand/logo.png" alt="" className="relative w-full rounded-full shadow-2xl ring-8 ring-white/10" />
          </div>
        </div>

        {/* quick facts */}
        <div className="relative z-10 mx-auto mt-12 grid max-w-6xl grid-cols-2 gap-3 px-5 lg:grid-cols-4">
          {[
            { icon: CalendarDays, title: t("7 days a week"), text: t("Delivery every day") },
            { icon: Sunrise, title: t("From 6 AM"), text: t("Morning delivery") },
            { icon: Zap, title: t("3-hour delivery"), text: t("Inside Uttara") },
            { icon: MapPin, title: t("3 cities"), text: t("Dhaka • Gazipur • Narayanganj") },
          ].map((f) => (
            <div key={f.title} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10 backdrop-blur">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
                <f.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-white">{f.title}</p>
                <p className="truncate text-xs text-white/60">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="speed-lines absolute bottom-10 left-0 w-1/2 opacity-60" />
      </section>

      {/* ---------------- delivery speeds */}
      <section className="mx-auto -mt-14 grid max-w-6xl gap-4 px-5 md:grid-cols-3">
        {[
          {
            icon: Zap,
            badge: t("Express"),
            title: t("3-hour delivery in Uttara"),
            text: t("Order between 6 AM and 12 noon and it reaches anywhere in Uttara within 3 hours."),
            accent: "bg-brand text-white",
          },
          {
            icon: Snowflake,
            badge: t("Cold chain"),
            title: t("Frozen items in 6 hours"),
            text: t("Meat, fish, ice cream and ready food carried cold, across Dhaka and Gazipur city."),
            accent: "bg-sky-500 text-white",
          },
          {
            icon: Truck,
            badge: t("Same day"),
            title: t("Dhaka, Gazipur & Narayanganj"),
            text: t("Regular parcels delivered the same day inside the city corporations."),
            accent: "bg-navy-900 text-white",
          },
        ].map((c) => (
          <Card key={c.title} className="relative z-10 p-6">
            <div className="flex items-center justify-between">
              <div className={cx("grid size-12 place-items-center rounded-2xl", c.accent)}>
                <c.icon className="size-6" />
              </div>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{c.badge}</span>
            </div>
            <p className="mt-5 text-lg font-extrabold tracking-tight">{c.title}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{c.text}</p>
          </Card>
        ))}
      </section>

      {/* ---------------- services */}
      <section id="services" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-20">
        <SectionTitle
          kicker={t("Our services")}
          title={t("We deliver all kinds of products")}
          text={t("Your product, our responsibility — from a single document to your whole shop's orders.")}
        />
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SERVICES.map((c) => (
            <Card key={c} className="group p-5 text-center transition hover:-translate-y-0.5 hover:ring-2 hover:ring-brand/40">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-3xl transition group-hover:scale-110">
                {CATEGORY[c].emoji}
              </div>
              <p className="mt-3 text-sm font-bold leading-snug">{CATEGORY[c].label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ---------------- frozen spotlight */}
      <section className="mx-auto max-w-6xl px-5">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-[#0b1b38] p-8 text-white sm:p-10">
          <Snowflake className="absolute -right-6 -top-6 size-48 text-white/10" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                <Snowflake className="size-3.5" /> {t("Frozen & bakery delivery")}
              </span>
              <h3 className="mt-4 text-3xl font-extrabold tracking-tight">{t("Fresh, safe and on time")}</h3>
              <p className="mt-3 max-w-lg text-white/80">
                {t(
                  "Frozen meat, chicken, fish, prawns, vegetables, snacks, ice cream, ready food, cakes and bakery items — kept at the right temperature until they reach your door.",
                )}
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                t("Carried at the right temperature"),
                t("Cold chain kept unbroken"),
                t("On-time delivery"),
                t("Clean, secure packaging"),
              ].map((x) => (
                <li key={x} className="flex items-center gap-2.5 rounded-2xl bg-white/10 p-3.5 text-sm font-semibold ring-1 ring-white/15">
                  <CheckCircle2 className="size-5 shrink-0 text-sun" /> {x}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------- pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-20">
        <SectionTitle kicker={t("Pricing")} title={t("Simple, honest pricing")} text={t("Up to 1 kg. No hidden charges.")} />
        <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { zone: "uttara" as const, value: rates?.uttara, time: t("Within 3 hours"), hot: true },
            { zone: "dhaka_city" as const, value: rates?.dhakaCity, time: t("Same day") },
            { zone: "gazipur_city" as const, value: rates?.gazipurCity, time: t("Same day") },
            { zone: "narayanganj_city" as const, value: rates?.narayanganjCity, time: t("Same day"), isNew: true },
          ].map((r) => (
            <Card key={r.zone} className={cx("relative p-6 text-center", r.hot && "ring-2 ring-brand")}>
              {r.hot && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-white">
                  {t("Fastest")}
                </span>
              )}
              {r.isNew && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sun px-3 py-1 text-[11px] font-bold text-[#0b1b38]">
                  {t("New area")}
                </span>
              )}
              <p className="text-sm font-semibold text-ink-2">{ZONE[r.zone]}</p>
              <p className="mt-3 text-4xl font-extrabold tracking-tight text-navy-900 dark:text-white">
                {r.value === undefined ? "—" : tk(r.value)}
              </p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-ink-3">
                <Clock className="size-3.5" /> {r.time}
              </p>
            </Card>
          ))}
        </div>
        {rates && (
          <div className="mx-auto mt-8 grid max-w-3xl gap-3 text-sm sm:grid-cols-3">
            {[
              {
                title: t("Each extra kg"),
                text: t("{inside} in Dhaka · {outside} in Gazipur & Narayanganj", { inside: tk(rates.extraPerKg), outside: tk(rates.extraPerKgOutside) }),
              },
              {
                title: t("COD charge"),
                text:
                  rates.codPercent === 0
                    ? t("Free inside Dhaka · {pct}% in Gazipur & Narayanganj", { pct: rates.codPercentOutside })
                    : t("{inside}% in Dhaka · {outside}% in Gazipur & Narayanganj", { inside: rates.codPercent, outside: rates.codPercentOutside }),
              },
              { title: t("Return"), text: t("{pct}% of the delivery charge", { pct: rates.returnPercent }) },
            ].map((x) => (
              <div key={x.title} className="rounded-2xl bg-surface p-4 text-center ring-1 ring-line">
                <p className="font-bold">{x.title}</p>
                <p className="mt-1 text-ink-3">{x.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- how it works + coverage */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-5">
          <SectionTitle kicker={t("How it works")} title={t("From your shop to your customer")} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: PackageCheck, title: t("Book the parcel"), text: t("Create it in your merchant panel or send it on WhatsApp.") },
              { icon: Bike, title: t("We pick it up"), text: t("Our rider collects it from your shop.") },
              { icon: Truck, title: t("We deliver"), text: t("Fast, safe delivery with live status at every step.") },
              { icon: Wallet, title: t("You get paid"), text: t("Collected cash is paid to your bKash, Nagad or bank.") },
            ].map((s, i) => (
              <div key={s.title} className="relative rounded-2xl border border-line p-6">
                <span className="absolute right-5 top-5 text-4xl font-extrabold text-navy-50 dark:text-white/5">{i + 1}</span>
                <div className="grid size-11 place-items-center rounded-xl bg-[#0b1b38] text-sun">
                  <s.icon className="size-5" />
                </div>
                <p className="mt-4 font-bold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink-2">{s.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-3xl bg-page p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-brand uppercase">{t("Delivery areas")}</p>
                <h3 className="mt-1 text-2xl font-extrabold tracking-tight">{t("Dhaka, Gazipur and Narayanganj city corporations")}</h3>
              </div>
              <span className="rounded-full bg-sun-100 px-3.5 py-1.5 text-sm font-bold text-amber-800">{t("New: Narayanganj City")}</span>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {COVERAGE.map((a) => (
                <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3.5 py-2 text-sm font-semibold ring-1 ring-line">
                  <MapPin className="size-3.5 text-brand" /> {a}
                </span>
              ))}
              <span className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-3">{t("and many more areas")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- join as rider */}
      <section id="join" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-20">
        <div className="grid overflow-hidden rounded-3xl shadow-[var(--shadow-card)] lg:grid-cols-2">
          <div className="sunrise p-8 text-white sm:p-10">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sun ring-1 ring-white/15">{t("We're hiring")}</span>
            <h3 className="mt-4 text-3xl font-extrabold italic tracking-tight">{t("Become a Morning Rider")}</h3>
            <p className="mt-3 text-white/75">{t("Have your own motorcycle and a valid licence? Join our delivery team in Dhaka and Gazipur.")}</p>
            <p className="mt-6 text-sm font-bold text-sun">{t("Benefits")}</p>
            <ul className="mt-2 space-y-2 text-sm">
              {[t("Attractive pay"), t("Fuel allowance (by condition)"), t("Daily earning opportunity"), t("On-time payment"), t("Incentives for good performance"), t("Long-term career")].map((x) => (
                <li key={x} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-sun" /> {x}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface p-8 sm:p-10">
            <p className="font-bold">{t("What you need")}</p>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-2">
              {[
                t("Your own motorcycle (in good condition)"),
                t("Valid driving licence"),
                t("National ID card (NID)"),
                t("Smartphone with internet"),
                t("Know the roads of Dhaka city"),
                t("Honest, responsible and hard-working"),
              ].map((x) => (
                <li key={x} className="flex items-center gap-2.5">
                  <ShieldCheck className="size-4 shrink-0 text-brand" /> {x}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-2xl bg-page p-3.5 text-xs leading-relaxed text-ink-2">
              {t("Apply online — our team reviews every application and invites you for an interview. Your rider account is created after you are hired.")}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/join")}>
                {t("Apply now")} <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/rider")}>
                {t("Rider login")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- contact */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <Card className="grid gap-6 p-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <h3 className="text-2xl font-extrabold tracking-tight">{t("Order today, relax!")}</h3>
            <p className="mt-2 text-ink-2">{t("Call or WhatsApp us — we'll pick up your product and deliver it safely.")}</p>
            <p className="mt-4 flex items-start gap-2 text-sm text-ink-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand" /> {t("Office")}: {CONTACT.address}
            </p>
          </div>
          <div className="grid gap-3">
            <a href={`tel:${CONTACT.phone}`} className="flex items-center gap-3 rounded-2xl bg-brand p-4 font-bold text-white hover:bg-brand-600">
              <Phone className="size-5" /> {t("Call")} {CONTACT.phone}
            </a>
            <a href={CONTACT.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-emerald-600 p-4 font-bold text-white hover:bg-emerald-700">
              <MessageCircle className="size-5" /> WhatsApp {CONTACT.phone}
            </a>
            <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-2xl bg-[#0b1b38] p-4 font-bold text-white ring-1 ring-white/10 hover:bg-[#12284f]">
              <ThumbsUp className="size-5" /> {t("Facebook page")}
            </a>
          </div>
        </Card>
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <Wordmark />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
            <Link href="/login" className="hover:text-brand">{t("Merchant login")}</Link>
            <Link href="/rider" className="hover:text-brand">{t("Rider login")}</Link>
            <Link href="/join" className="hover:text-brand">{t("Join as rider")}</Link>
            <span>
              {t("Hotline")}: {CONTACT.phone}, {CONTACT.phone2}
            </span>
          </div>
          <p className="w-full text-sm text-ink-3">
            © {new Date().getFullYear()} Morning Rider Courier Service · {t("Your trust is our inspiration.")}
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- auth */

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-full lg:grid-cols-2">
      <div className="sunrise relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <Link href="/" className="flex items-center gap-3">
          <Logo size={46} className="ring-2 ring-white/25" />
          <Wordmark dark />
        </Link>
        <div className="relative">
          <img src="/brand/logo.png" alt="" className="mx-auto w-80 rounded-full shadow-2xl ring-8 ring-white/10" />
        </div>
        <p className="text-lg font-semibold italic text-white/80">
          Fast <span className="text-brand">•</span> Safe <span className="text-brand">•</span> On time
        </p>
      </div>
      <div className="relative flex items-center justify-center p-6">
        <Prefs className="absolute right-5 top-5" />
        <div className="animate-rise w-full max-w-md">
          <Link href="/" className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo size={44} />
            <Wordmark />
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          <p className="mt-2 text-ink-2">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * One sign-in form, three doors: merchants on /login, riders on /rider and
 * the admin passcode on the admin website. Each calls its own endpoint, and
 * the server refuses any account that is not that door's role.
 */
function SignIn({ door }: { door: "merchant" | "rider" | "admin" }) {
  const login = useMutation(api.auth.login);
  const riderLogin = useMutation(api.auth.riderLogin);
  const adminLogin = useMutation(api.auth.adminLogin);
  const { signIn } = useSession();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r =
        door === "admin"
          ? await adminLogin({ passcode: password })
          : door === "rider"
            ? await riderLogin({ phone, password })
            : await login({ phone, password });
      if (r.ok) {
        signIn(r.token, r.expiresAt);
        navigate(safeNext(nextParam()), { replace: true });
      } else setError(translateServer(r.error));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const copy = {
    merchant: { title: t("Merchant login"), subtitle: t("Sign in to send and track your parcels.") },
    rider: { title: t("Rider login"), subtitle: t("For Morning Rider delivery staff only.") },
    admin: { title: t("Admin panel"), subtitle: t("Restricted area. Authorised Morning Rider staff only.") },
  }[door];

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      {door === "rider" && (
        <div className="-mt-4 mb-6 flex items-center gap-3 rounded-2xl bg-brand-50 p-3.5 text-sm font-semibold text-brand-700">
          <Bike className="size-5 shrink-0" /> {t("Riders get their account from the Morning Rider office.")}
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        {door !== "admin" && (
          <Field label={t("Phone number")}>
            {(id) => (
              <Input id={id} type="tel" inputMode="tel" autoComplete="username" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            )}
          </Field>
        )}
        <Field label={door === "admin" ? t("Admin passcode") : t("Password")}>
          {(id) => (
            <Input
              id={id}
              type="password"
              inputMode={door === "admin" ? "numeric" : undefined}
              autoComplete="current-password"
              autoFocus={door === "admin"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>
        {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>}
        <Button type="submit" size="lg" loading={busy} variant={door === "rider" ? "dark" : "primary"} className="w-full">
          {t("Sign in")}
        </Button>
      </form>
      {door === "merchant" && (
        <>
          <p className="mt-6 text-center text-sm text-ink-2">
            {t("New merchant?")}{" "}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              {t("Create an account")}
            </Link>
          </p>
          <p className="mt-3 text-center text-sm text-ink-2">
            {t("Are you a rider?")}{" "}
            <Link href={withNext("/rider")} className="font-semibold text-brand hover:underline">
              {t("Rider login")}
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-ink-3">{t("Forgot your password? Contact Morning Rider to reset it.")}</p>
        </>
      )}
      {door === "rider" && (
        <>
          <p className="mt-6 text-center text-sm text-ink-2">
            {t("Want to work with us?")}{" "}
            <Link href="/join" className="font-semibold text-brand hover:underline">
              {t("Apply as a rider")}
            </Link>
          </p>
          <p className="mt-3 text-center text-sm text-ink-2">
            {t("Are you a merchant?")}{" "}
            <Link href={withNext("/login")} className="font-semibold text-brand hover:underline">
              {t("Merchant login")}
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}

export function Login() {
  return <SignIn door={IS_ADMIN_PORTAL ? "admin" : "merchant"} />;
}

export function RiderLogin() {
  return <SignIn door="rider" />;
}

export function Register() {
  const register = useMutation(api.auth.registerMerchant);
  const { signIn } = useSession();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    name: "",
    businessName: "",
    phone: "",
    email: "",
    pickupAddress: "",
    payoutMethod: "bkash" as keyof typeof PAYOUT_METHOD,
    payoutAccount: "",
    password: "",
    confirm: "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (f.password !== f.confirm) return;
    setBusy(true);
    setError("");
    try {
      const { confirm: _c, ...rest } = f;
      // No approval step: the account opens and the merchant is signed in.
      const session = await register({ ...rest, email: rest.email || undefined });
      signIn(session.token, session.expiresAt);
      navigate("/app", { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const mismatch = f.confirm.length > 0 && f.password !== f.confirm;
  return (
    <AuthLayout title={t("Become a merchant")} subtitle={t("Send parcels across Dhaka, Gazipur and Narayanganj with Morning Rider.")}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Your name")}>{(id) => <Input id={id} value={f.name} onChange={set("name")} required maxLength={80} />}</Field>
        <Field label={t("Business / page name")}>
          {(id) => <Input id={id} value={f.businessName} onChange={set("businessName")} required maxLength={100} />}
        </Field>
        <Field label={t("Phone number")}>
          {(id) => <Input id={id} type="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set("phone")} required />}
        </Field>
        <Field label={t("Email (optional)")}>{(id) => <Input id={id} type="email" value={f.email} onChange={set("email")} />}</Field>
        <Field label={t("Pickup address")} className="sm:col-span-2">
          {(id) => <Input id={id} value={f.pickupAddress} onChange={set("pickupAddress")} required maxLength={300} placeholder={t("House, road, area, city")} />}
        </Field>
        <Field label={t("Get paid by")}>
          {(id) => (
            <Select id={id} value={f.payoutMethod} onChange={set("payoutMethod")}>
              {Object.entries(PAYOUT_METHOD).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={f.payoutMethod === "bank" ? t("Bank account details") : t("Account number")}>
          {(id) => <Input id={id} value={f.payoutAccount} onChange={set("payoutAccount")} required maxLength={100} />}
        </Field>
        <Field label={t("Password")} hint={t("At least 8 characters, with a letter and a number.")}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={f.password} onChange={set("password")} required minLength={8} />}
        </Field>
        <Field label={t("Confirm password")} hint={mismatch ? <span className="text-red-600">{t("Passwords do not match.")}</span> : undefined}>
          {(id) => <Input id={id} type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} required />}
        </Field>
        {error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 sm:col-span-2">
            {error}{" "}
            {error === t("This phone number already has an account. Please log in.") ? (
              <Link href="/login" className="font-bold underline">
                {t("Log in")}
              </Link>
            ) : null}
          </p>
        )}
        <Button type="submit" size="lg" loading={busy} disabled={mismatch} className="sm:col-span-2">
          {t("Create merchant account")}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-2">
        {t("Already have an account?")}{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          {t("Sign in")}
        </Link>
      </p>
    </AuthLayout>
  );
}

/* ------------------------------------------------------------ join (rider) */

/**
 * Rider job application. This never creates an account: the admin reviews
 * it, invites the person for an interview, and only creates the rider
 * account after hiring them.
 */
export function Join() {
  const apply = useMutation(api.riderApplications.apply);
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", phone: "", email: "", area: "", hasBike: "yes", hasLicense: "yes", note: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  if (done) {
    return (
      <AuthLayout title={t("Application sent")} subtitle={t("Thank you for applying to Morning Rider.")}>
        <Card className="p-6">
          <CheckCircle2 className="size-10 text-emerald-500" />
          <p className="mt-4 font-semibold">{t("Our team will review your application.")}</p>
          <p className="mt-1 text-sm text-ink-2">
            {t("If you are selected, we will invite you for an interview by email, phone or WhatsApp. Your rider account is created after you are hired.")}
          </p>
          <Button className="mt-6" onClick={() => navigate("/")}>
            {t("Back to home")}
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t("Become a Morning Rider")} subtitle={t("Fill in this form. If you are selected, we will invite you for an interview.")}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await apply({
              name: f.name,
              phone: f.phone,
              email: f.email || undefined,
              area: f.area,
              hasBike: f.hasBike === "yes",
              hasLicense: f.hasLicense === "yes",
              note: f.note || undefined,
            });
            setDone(true);
          } catch (err) {
            toast.error(err);
          } finally {
            setBusy(false);
          }
        }}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label={t("Full name")}>{(id) => <Input id={id} value={f.name} onChange={set("name")} required maxLength={80} />}</Field>
        <Field label={t("Phone number")}>
          {(id) => <Input id={id} type="tel" placeholder="01XXXXXXXXX" value={f.phone} onChange={set("phone")} required />}
        </Field>
        <Field label={t("Email")} hint={t("We send the interview invitation here.")}>
          {(id) => <Input id={id} type="email" value={f.email} onChange={set("email")} required maxLength={120} />}
        </Field>
        <Field label={t("Where do you live?")}>
          {(id) => <Input id={id} value={f.area} onChange={set("area")} required maxLength={80} placeholder={t("e.g. Mirpur, Uttara")} />}
        </Field>
        <Field label={t("Own motorcycle?")}>
          {(id) => (
            <Select id={id} value={f.hasBike} onChange={set("hasBike")}>
              <option value="yes">{t("Yes")}</option>
              <option value="no">{t("No")}</option>
            </Select>
          )}
        </Field>
        <Field label={t("Driving licence?")}>
          {(id) => (
            <Select id={id} value={f.hasLicense} onChange={set("hasLicense")}>
              <option value="yes">{t("Yes")}</option>
              <option value="no">{t("No")}</option>
            </Select>
          )}
        </Field>
        <Field label={t("Anything else? (optional)")} className="sm:col-span-2">
          {(id) => <Textarea id={id} value={f.note} onChange={set("note")} maxLength={300} />}
        </Field>
        <Button type="submit" size="lg" loading={busy} className="sm:col-span-2">
          {t("Send application")}
        </Button>
      </form>
    </AuthLayout>
  );
}

/* --------------------------------------------------------------- track */

const JOURNEY = ["pending", "picked_up", "at_hub", "out_for_delivery", "delivered"] as const;

export function Track({ code }: { code?: string }) {
  const { token, me } = useSession();
  const result = useQuery(api.track.byCode, code && token ? { token, code } : "skip");

  // Tracking needs an account: send signed-out visitors to log in, then back here.
  useEffect(() => {
    if (code && me === null) navigate(`/login?next=${encodeURIComponent(`/track/${code}`)}`, { replace: true });
  }, [code, me]);

  const parcel = result && "parcel" in result ? result.parcel : undefined;

  return (
    <div className="min-h-full bg-page">
      <section className="sunrise pb-16">
        <PublicNav />
        <div className="mx-auto max-w-2xl px-5 pt-8 text-center">
          <h1 className="text-3xl font-extrabold italic tracking-tight text-white sm:text-4xl">{t("Track your parcel")}</h1>
          <p className="mt-2 text-white/70">{t("Enter the tracking ID from your parcel label or SMS.")}</p>
          <div className="mt-6 text-left">
            <TrackBox />
          </div>
        </div>
      </section>
      <div className="mx-auto -mt-8 max-w-2xl px-5 pb-16">
        {!code || !me ? null : result === undefined ? (
          <Card className="p-10 text-center text-ink-3">{t("Looking up {code}…", { code })}</Card>
        ) : !parcel ? (
          <Card className="p-10 text-center">
            <PackageSearch className="mx-auto size-10 text-ink-3" />
            <p className="mt-3 font-bold">{t("No parcel found")}</p>
            <p className="mt-1 text-sm text-ink-2">{t("You can only track parcels that belong to you or are assigned to you.")}</p>
          </Card>
        ) : (
          <Card className="animate-rise overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
              <div>
                <p className="text-xs font-semibold tracking-wider text-ink-3">{t("TRACKING ID")}</p>
                <p className="mt-1 font-mono text-xl font-bold">{parcel.trackingCode}</p>
              </div>
              <StatusBadge status={parcel.status} className="px-3.5 py-1.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-line p-6 text-sm sm:grid-cols-3">
              <div>
                <p className="text-ink-3">{t("From")}</p>
                <p className="font-semibold">{parcel.merchantName || "—"}</p>
              </div>
              <div>
                <p className="text-ink-3">{t("To")}</p>
                <p className="font-semibold">
                  {parcel.recipientName}, {parcel.area}
                </p>
                <p className="text-xs text-ink-3">{ZONE[parcel.zone]}</p>
              </div>
              <div>
                <p className="text-ink-3">{parcel.status === "delivered" ? t("Paid") : t("Amount to pay")}</p>
                <p className="font-semibold">{tk(parcel.codAmount)}</p>
                {parcel.category && (
                  <p className="text-xs text-ink-3">
                    {CATEGORY[parcel.category].emoji} {CATEGORY[parcel.category].label}
                  </p>
                )}
              </div>
            </div>
            <JourneyBar status={parcel.status} />
            <ol className="space-y-0 p-6">
              {parcel.timeline.map((e, i) => (
                <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < parcel.timeline.length - 1 && <span className="absolute left-[9px] top-6 h-full w-0.5 bg-line" />}
                  {i === 0 ? (
                    <CheckCircle2 className="relative z-10 size-5 shrink-0 text-brand" />
                  ) : (
                    <Circle className="relative z-10 size-5 shrink-0 fill-surface text-ink-3" />
                  )}
                  <div>
                    <p className={cx("font-semibold", i === 0 ? "text-ink" : "text-ink-2")}>{STATUS[e.status].label}</p>
                    <p className="text-xs text-ink-3">{dateTime(e.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </div>
    </div>
  );
}

function JourneyBar({ status }: { status: keyof typeof STATUS }) {
  const idx = JOURNEY.indexOf(status as (typeof JOURNEY)[number]);
  const step = status === "partial_delivered" ? 4 : status === "hold" ? 3 : idx;
  if (step < 0) return null;
  const labels = [t("Booked"), t("Picked"), t("Hub"), t("On the way"), t("Delivered")];
  return (
    <div className="border-b border-line px-6 py-5">
      <div className="flex items-center">
        {JOURNEY.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div
              className={cx(
                "grid size-8 place-items-center rounded-full text-xs font-bold",
                i <= step ? "bg-brand text-white" : "bg-navy-50 text-ink-3",
              )}
            >
              {i + 1}
            </div>
            {i < JOURNEY.length - 1 && <div className={cx("mx-1 h-1 flex-1 rounded", i < step ? "bg-brand" : "bg-navy-50")} />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-medium text-ink-3">
        {labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  );
}
