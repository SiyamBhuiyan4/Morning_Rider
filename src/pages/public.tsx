import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Bike,
  CheckCircle2,
  Circle,
  Copy,
  Lock,
  Menu,
  PackageSearch,
  Phone,
  Search,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Link, navigate } from "../lib/router";
import { useSession } from "../lib/session";
import { errorText, useToast } from "../lib/toast";
import { CATEGORY, PAYOUT_METHOD, STATUS, ZONE, dateTime, num, tk } from "../lib/format";
import { CONTACT } from "../lib/contact";
import { Button, Card, Field, Input, Logo, PasswordInput, Select, StatusBadge, Textarea, Wordmark, cx } from "../components/ui";
import { IS_ADMIN_PORTAL } from "../lib/portal";
import { Prefs } from "../components/Prefs";
import { t, translateServer } from "../lib/prefs";
import { PublicNav as LandingNav } from "../components/landing/PublicNav";
import { HeroSection } from "../components/landing/HeroSection";
import { ThreeJobsSection } from "../components/landing/ThreeJobsSection";
import { ParcelJourneySection } from "../components/landing/ParcelJourneySection";
import { RateCalculatorSection } from "../components/landing/RateCalculatorSection";
import { ServicesSection } from "../components/landing/ServicesSection";
import { RiskCheckDemoSection } from "../components/landing/RiskCheckDemoSection";
import { CoverageDirectorySection } from "../components/landing/CoverageDirectorySection";
import { BookingShowcaseSection } from "../components/landing/BookingShowcaseSection";
import { BusinessPerksSection } from "../components/landing/BusinessPerksSection";
import { RiderRecruitmentSection } from "../components/landing/RiderRecruitmentSection";
import { TestimonialsSection } from "../components/landing/TestimonialsSection";
import { FaqSection as LandingFaqSection } from "../components/landing/FaqSection";
import { CtaBanner } from "../components/landing/CtaBanner";
import { PublicFooter } from "../components/landing/PublicFooter";

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
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <header className="relative z-30 mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5">
      <Link href="/" className="flex items-center gap-3">
        <Logo size={46} className="ring-2 ring-white/25 shadow-lg" />
        <span className="hidden sm:block">
          <Wordmark dark />
        </span>
      </Link>
      <nav className="hidden items-center gap-1.5 sm:gap-2 lg:flex">
        <a href="/#services" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
          {t("Services")}
        </a>
        <a href="/#pricing" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
          {t("Pricing")}
        </a>
        <a href="/#join" className="rounded-xl px-3 py-2 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">
          {t("Join as rider")}
        </a>
        <Prefs onDark />
        <Button onClick={() => navigate("/login")}>{t("Merchant login")}</Button>
      </nav>

      {/* Mobile controls */}
      <div className="flex items-center gap-2 lg:hidden">
        <Prefs onDark />
        <Button size="sm" onClick={() => navigate("/login")}>{t("Merchant login")}</Button>
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="grid size-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
          aria-label={t("Menu")}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="animate-rise absolute inset-x-4 top-20 z-40 rounded-3xl border border-white/15 bg-navy-950/95 p-5 shadow-2xl backdrop-blur-xl lg:hidden">
          <div className="flex flex-col gap-1.5">
            <a
              href="/#services"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              {t("Services")}
            </a>
            <a
              href="/#pricing"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              {t("Pricing")}
            </a>
            <a
              href="/#join"
              onClick={() => setMobileOpen(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
            >
              {t("Join as rider")}
            </a>
            <div className="my-2 border-t border-white/10" />
            <a
              href={`tel:${CONTACT.phone}`}
              className="flex items-center gap-2.5 rounded-xl bg-brand/20 px-4 py-2.5 text-sm font-bold text-brand transition hover:bg-brand/30"
            >
              <Phone className="size-4" /> {t("Hotline")}: {CONTACT.phone}
            </a>
          </div>
        </div>
      )}
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

const DEFAULT_PUBLIC_RATES = {
  uttara: 60,
  dhakaCity: 70,
  gazipurCity: 90,
  narayanganjCity: 110,
  extraPerKg: 15,
  extraPerKgOutside: 20,
  codPercent: 0,
  codPercentOutside: 1,
  returnPercent: 50,
};

export function Home() {
  const rates = DEFAULT_PUBLIC_RATES;

  return (
    <div className="min-h-full bg-page text-ink selection:bg-brand/20">
      {/* Top Header & Hero */}
      <div className="sunrise">
        <LandingNav />
        <HeroSection />
      </div>

      {/* Steadfast-Grade Three Jobs, One Network */}
      <ThreeJobsSection />

      {/* The Road a Parcel Actually Takes */}
      <ParcelJourneySection />

      {/* Interactive Delivery Rate & Payout Calculator */}
      <RateCalculatorSection rates={rates} />

      {/* AI Delivery Risk & Customer Fraud Check */}
      <RiskCheckDemoSection />

      {/* Comprehensive 12-Service Grid + Cold-Chain & Bakery Spotlight */}
      <ServicesSection />

      {/* Complete City Corporation Coverage Directory with Live Search */}
      <CoverageDirectorySection />

      {/* Simple 3-Step Booking to Doorstep Showcase */}
      <BookingShowcaseSection />

      {/* Merchant Business Perks & Bulk Excel Upload */}
      <BusinessPerksSection />

      {/* Rider Career Recruitment */}
      <RiderRecruitmentSection />

      {/* Trust Standards & Merchant Reviews */}
      <TestimonialsSection />

      {/* Comprehensive Frequently Asked Questions */}
      <LandingFaqSection />

      {/* High-Impact Pre-Footer Conversion Banner */}
      <CtaBanner />

      {/* Modern 5-Column Public Footer */}
      <PublicFooter />
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
          {t("Fast")} <span className="text-brand">•</span> {t("Safe")} <span className="text-brand">•</span> {t("On time")}
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
  const setupInitialAdmin = useMutation(api.auth.setupInitialAdmin);
  const isSetupNeeded = useQuery(api.auth.isInitialSetupNeeded);
  const { signIn } = useSession();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState("");
  const [wrongDoor, setWrongDoor] = useState<"rider" | "merchant" | null>(null);
  const [busy, setBusy] = useState(false);

  const showSetup = door === "admin" && (isSetupNeeded === true || needsSetup);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setWrongDoor(null);
    try {
      if (showSetup) {
        if (password.length < 6) {
          setError(t("Passcode must be at least 6 characters."));
          setBusy(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t("Passcodes do not match."));
          setBusy(false);
          return;
        }
        const r = await setupInitialAdmin({ passcode: password });
        signIn(r.token, r.expiresAt);
        navigate(safeNext(nextParam()), { replace: true });
        return;
      }

      const r =
        door === "admin"
          ? await adminLogin({ passcode: password })
          : door === "rider"
            ? await riderLogin({ phone, password })
            : await login({ phone, password });
      if (r.ok) {
        signIn(r.token, r.expiresAt);
        navigate(safeNext(nextParam()), { replace: true });
      } else {
        setError(translateServer(r.error));
        if ("needsSetup" in r && r.needsSetup) {
          setNeedsSetup(true);
        }
        if ("wrongDoor" in r && r.wrongDoor) setWrongDoor(r.wrongDoor);
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const copy = {
    merchant: { title: t("Merchant login"), subtitle: t("Sign in to send and track your parcels.") },
    rider: { title: t("Rider login"), subtitle: t("For Morning Rider delivery staff only.") },
    admin: showSetup
      ? { title: t("Initial Admin Setup"), subtitle: t("Set up your master admin passcode to initialize the panel.") }
      : { title: t("Admin panel"), subtitle: t("Restricted area. Authorized Morning Rider staff only.") },
  }[door];

  return (
    <AuthLayout title={copy.title} subtitle={copy.subtitle}>
      {/* Portal door switcher */}
      <div className="-mt-2 mb-6 grid grid-cols-3 rounded-2xl bg-surface-2 p-1 text-xs sm:text-sm font-bold">
        <button
          type="button"
          onClick={() => navigate(withNext("/login"))}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-xl py-2 transition cursor-pointer",
            door === "merchant" ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
          )}
        >
          <Store className="size-4" /> <span>{t("Merchant")}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(withNext("/rider"))}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-xl py-2 transition cursor-pointer",
            door === "rider" ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
          )}
        >
          <Bike className="size-4" /> <span>{t("Rider")}</span>
        </button>
        <button
          type="button"
          onClick={() => navigate(withNext("/admin"))}
          className={cx(
            "flex items-center justify-center gap-1.5 rounded-xl py-2 transition cursor-pointer",
            door === "admin" ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink"
          )}
        >
          <ShieldCheck className="size-4" /> <span>{t("Admin")}</span>
        </button>
      </div>

      {door === "rider" && (
        <div className="-mt-2 mb-6 flex items-center gap-3 rounded-2xl bg-brand-50 p-3.5 text-sm font-semibold text-brand-700">
          <Bike className="size-5 shrink-0" /> {t("Riders get their account from the Morning Rider office.")}
        </div>
      )}

      {showSetup && (
        <div className="-mt-2 mb-6 flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 text-sm text-amber-800 dark:text-amber-200">
          <ShieldCheck className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">{t("Database initialization")}</p>
            <p className="mt-0.5 text-xs opacity-90">
              {t("No admin account was found in the database. Choose a secure master passcode (minimum 6 digits or characters) to set up your admin access.")}
            </p>
          </div>
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
        <Field label={door === "admin" ? (showSetup ? t("Set Admin Passcode") : t("Admin passcode")) : t("Password")}>
          {(id) => (
            <PasswordInput
              id={id}
              inputMode={door === "admin" ? "numeric" : undefined}
              autoComplete={showSetup ? "new-password" : "current-password"}
              autoFocus={door === "admin"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={showSetup ? t("Master passcode (min 6 characters)") : undefined}
              required
            />
          )}
        </Field>
        {showSetup && (
          <Field label={t("Confirm passcode")}>
            {(id) => (
              <PasswordInput
                id={id}
                inputMode="numeric"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("Confirm master passcode")}
                required
              />
            )}
          </Field>
        )}
        {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>}
        {wrongDoor && (
          <Link
            href={withNext(wrongDoor === "rider" ? "/rider" : "/login")}
            className="block rounded-xl bg-brand px-3.5 py-2.5 text-center text-sm font-bold text-white hover:bg-brand-600"
          >
            {wrongDoor === "rider" ? t("Go to Rider login →") : t("Go to Merchant login →")}
          </Link>
        )}
        <Button
          type="submit"
          size="lg"
          loading={busy}
          variant={door === "rider" ? "dark" : "primary"}
          className="w-full"
        >
          {showSetup ? t("Set Admin Passcode & Sign In") : t("Sign in")}
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
          <p className="mt-2 text-center text-sm text-ink-2">
            {t("Staff or Admin?")}{" "}
            <Link href={withNext("/admin")} className="font-semibold text-brand hover:underline">
              {t("Admin portal")}
            </Link>
          </p>
          <p className="mt-2 text-center text-sm">
            <Link href="/forgot" className="font-semibold text-brand hover:underline">
              {t("Forgot password?")}
            </Link>
          </p>
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
          <p className="mt-2 text-center text-sm text-ink-2">
            {t("Staff or Admin?")}{" "}
            <Link href={withNext("/admin")} className="font-semibold text-brand hover:underline">
              {t("Admin portal")}
            </Link>
          </p>
        </>
      )}
      {door === "admin" && (
        <>
          <p className="mt-6 text-center text-sm text-ink-2">
            {t("Are you a merchant?")}{" "}
            <Link href={withNext("/login")} className="font-semibold text-brand hover:underline">
              {t("Merchant login")}
            </Link>
          </p>
          <p className="mt-2 text-center text-sm text-ink-2">
            {t("Are you a rider?")}{" "}
            <Link href={withNext("/rider")} className="font-semibold text-brand hover:underline">
              {t("Rider login")}
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

export function AdminLogin() {
  return <SignIn door="admin" />;
}

/**
 * Merchant forgot their password: find the account by phone or email, then
 * send one request to the office. The office sets a new password, which is
 * emailed to the address on the account.
 */
export function ForgotPassword() {
  const find = useMutation(api.support.findAccount);
  const request = useMutation(api.support.requestReset);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<
    | null
    | { found: false }
    | { found: true; name: string; phone: string; email: string | null; alreadyRequested: boolean }
  >(null);
  const [sent, setSent] = useState<null | "sent" | "already">(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFound(null);
    setSent(null);
    try {
      setFound(await find({ query: q }));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    setBusy(true);
    setError("");
    try {
      const r = await request({ query: q });
      setSent(r.alreadyRequested ? "already" : "sent");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={t("Forgot password")} subtitle={t("Find your merchant account and ask Morning Rider for a new password.")}>
      <form onSubmit={search} className="space-y-4">
        <Field label={t("Phone number or email")} hint={t("The one you signed up with.")}>
          {(id) => (
            <Input
              id={id}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setFound(null);
                setSent(null);
              }}
              placeholder={t("01XXXXXXXXX or you@example.com")}
              autoComplete="username"
              required
            />
          )}
        </Field>
        <Button type="submit" size="lg" loading={busy && !found} className="w-full">
          {t("Find my account")}
        </Button>
      </form>

      {error && <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>}

      {found && !found.found && (
        <p className="mt-4 rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {t("No merchant account found with that phone number or email.")}
        </p>
      )}

      {found && found.found && (
        <div className="animate-rise mt-5 rounded-2xl border border-line bg-page p-4">
          <p className="text-xs font-semibold text-ink-3">{t("Account found")}</p>
          <p className="mt-1 text-lg font-bold">{found.name}</p>
          <p className="font-mono text-sm text-ink-2">{found.phone}</p>
          {found.email && <p className="font-mono text-sm text-ink-2">{found.email}</p>}

          {sent === "sent" ? (
            <p className="mt-4 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-700">
              {t("Request sent! Morning Rider will set a new password and email it to you.")}
            </p>
          ) : sent === "already" || found.alreadyRequested ? (
            <p className="mt-4 rounded-xl bg-amber-50 px-3.5 py-3 text-sm font-semibold text-amber-800">
              {t("You've already asked. Morning Rider will email your new password soon. You can ask again after the office handles it.")}
            </p>
          ) : (
            <>
              <p className="mt-3 text-sm text-ink-2">
                {found.email
                  ? t("Morning Rider will set a new password and email it to this address.")
                  : t("This account has no email. Morning Rider will call you with the new password.")}
              </p>
              <Button size="lg" className="mt-4 w-full" loading={busy} onClick={send}>
                {t("Send request to Morning Rider")}
              </Button>
            </>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-sm text-ink-2">
        <Link href="/login" className="font-semibold text-brand hover:underline">
          ← {t("Back to login")}
        </Link>
      </p>
    </AuthLayout>
  );
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
      const session = await register(rest);
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
        <Field label={t("Email")} hint={t("Needed to get a new password if you ever forget it.")}>
          {(id) => <Input id={id} type="email" autoComplete="email" value={f.email} onChange={set("email")} required />}
        </Field>
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
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={f.password} onChange={set("password")} required minLength={8} />}
        </Field>
        <Field label={t("Confirm password")} hint={mismatch ? <span className="text-red-600">{t("Passwords do not match.")}</span> : undefined}>
          {(id) => <PasswordInput id={id} autoComplete="new-password" value={f.confirm} onChange={set("confirm")} required />}
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
  const [copied, setCopied] = useState(false);

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
        {!code ? null : !me ? (
          <Card className="animate-rise p-8 text-center">
            <PackageSearch className="mx-auto size-12 text-brand" />
            <h2 className="mt-4 text-xl font-bold">{t("Sign in to track your parcel")}</h2>
            <p className="mt-2 text-sm text-ink-2">
              {t("For privacy and security, parcel tracking is available after logging into your merchant or rider account.")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => navigate(`/login?next=${encodeURIComponent(`/track/${code}`)}`)}>
                {t("Merchant login")}
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate(`/rider?next=${encodeURIComponent(`/track/${code}`)}`)}>
                {t("Rider login")}
              </Button>
            </div>
          </Card>
        ) : result === undefined ? (
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
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono text-xl font-bold">{parcel.trackingCode}</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(parcel.trackingCode);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink-2 shadow-xs transition hover:bg-page hover:text-ink active:scale-95"
                    title={t("Copy ID")}
                  >
                    {copied ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? t("Copied!") : t("Copy ID")}</span>
                  </button>
                </div>
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
              {num(i + 1)}
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
