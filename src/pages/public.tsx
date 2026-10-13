import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  PackageSearch,
  Search,
  ShieldCheck,
  Wallet,
  Zap,
  Circle,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { Link, navigate } from "../lib/router";
import { useSession } from "../lib/session";
import { errorText, useToast } from "../lib/toast";
import { PAYOUT_METHOD, STATUS, dateTime, tk } from "../lib/format";
import { Button, Card, Field, Input, Logo, Select, StatusBadge, Wordmark, cx } from "../components/ui";
import { IS_ADMIN_PORTAL } from "../lib/portal";
import { Prefs } from "../components/Prefs";
import { getLang, translateServer } from "../lib/prefs";
import { t } from "../lib/prefs";

function PublicNav() {
  const { me } = useSession();
  return (
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <Link href="/" className="flex items-center gap-3">
        <Logo size={46} className="ring-2 ring-white/25" />
        <Wordmark dark />
      </Link>
      <nav className="flex items-center gap-2">
        <Prefs onDark />
        <Link href="/track" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-white/80 hover:text-white sm:block">
          {t("Track parcel")}
        </Link>
        {me ? (
          <Button onClick={() => navigate("/app")}>{t("Dashboard")}</Button>
        ) : (
          <>
            <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-semibold text-white/90 hover:text-white">
              {t("Login")}
            </Link>
            <Button onClick={() => navigate("/register")} className="hidden sm:inline-flex">
              {t("Become a merchant")}
            </Button>
          </>
        )}
      </nav>
    </header>
  );
}

function TrackBox({ big }: { big?: boolean }) {
  const [code, setCode] = useState("");
  return (
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
          className="h-11 w-full bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-ink-3"
          maxLength={20}
        />
      </div>
      <Button type="submit" size="lg" icon={Search}>
        {t("Track")}
      </Button>
    </form>
  );
}

export function Home() {
  const rates = useQuery(api.settings.publicRates);
  return (
    <div className="min-h-full bg-page">
      <section className="sunrise relative overflow-hidden pb-24">
        <PublicNav />
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-sun ring-1 ring-white/15">
              <Zap className="size-3.5" /> {t("FAST • SAFE • ON TIME")}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold italic leading-[1.05] tracking-tight text-white sm:text-6xl">
              {getLang() === "bn" ? (
                <>
                  আপনার পার্সেল,
                  <br />
                  <span className="text-brand">সকালেই</span> পৌঁছে যাবে।
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
                "Morning Rider is the courier partner for online businesses across Bangladesh — doorstep pickup, cash-on-delivery, live tracking and fast merchant payments.",
              )}
            </p>
            <div className="mt-8 max-w-xl">
              <TrackBox big />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/register")}>
                {t("Start sending parcels")} <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => navigate("/login")}>
                {t("Merchant / Rider login")}
              </Button>
            </div>
          </div>
          <div className="relative mx-auto hidden w-full max-w-md lg:block">
            <div className="absolute -inset-10 rounded-full bg-sun/25 blur-3xl" />
            <img src="/brand/logo.png" alt="" className="relative w-full rounded-full shadow-2xl ring-8 ring-white/10" />
          </div>
        </div>
        <div className="speed-lines absolute bottom-10 left-0 w-1/2 opacity-60" />
      </section>

      <section className="mx-auto -mt-14 grid max-w-6xl gap-4 px-5 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Bike, title: t("Doorstep pickup"), text: t("Our riders collect parcels from your shop every day.") },
          { icon: Wallet, title: t("Fast COD payment"), text: t("Collected cash is paid out to bKash, Nagad or bank.") },
          { icon: MapPin, title: t("Live tracking"), text: t("You and your customers can track every step.") },
          { icon: ShieldCheck, title: t("Fraud check"), text: t("See a customer's delivery history before you ship.") },
        ].map((f) => (
          <Card key={f.title} className="relative z-10 p-5">
            <div className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand">
              <f.icon className="size-5" />
            </div>
            <p className="mt-4 font-bold">{f.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-2">{f.text}</p>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight">{t("Simple, honest pricing")}</h2>
          <p className="mt-2 text-ink-2">{t("Up to 1 kg. No hidden charges.")}</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          {[
            { label: t("Inside Dhaka"), value: rates?.insideDhaka, time: t("24 hours") },
            { label: t("Dhaka Sub-area"), value: rates?.subDhaka, time: t("24–48 hours") },
            { label: t("Outside Dhaka"), value: rates?.outsideDhaka, time: t("48–72 hours") },
          ].map((r, i) => (
            <Card key={r.label} className={cx("p-6 text-center", i === 0 && "ring-2 ring-brand")}>
              <p className="text-sm font-semibold text-ink-2">{r.label}</p>
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
          <p className="mt-6 text-center text-sm text-ink-3">
            {t("COD charge {pct}% of the collected amount.", { pct: rates.codPercent })}
          </p>
        )}
      </section>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <Wordmark />
          </div>
          <p className="text-sm text-ink-3">© {new Date().getFullYear()} Morning Rider Courier Service</p>
        </div>
      </footer>
    </div>
  );
}

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
          Fast <span className="text-brand">•</span> {t("Safe")} <span className="text-brand">•</span> On time
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

export function Login() {
  const login = useMutation(api.auth.login);
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
      const r = IS_ADMIN_PORTAL ? await adminLogin({ passcode: password }) : await login({ phone, password });
      if (r.ok) {
        signIn(r.token, r.expiresAt);
        navigate("/app", { replace: true });
      } else setError(translateServer(r.error));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={IS_ADMIN_PORTAL ? t("Admin panel") : t("Welcome back")}
      subtitle={IS_ADMIN_PORTAL ? t("Restricted area. Authorised Morning Rider staff only.") : t("Sign in to your Morning Rider account.")}
    >
      <form onSubmit={submit} className="space-y-4">
        {!IS_ADMIN_PORTAL && (
          <Field label={t("Phone number")}>
            {(id) => (
              <Input id={id} type="tel" inputMode="tel" autoComplete="username" placeholder="01XXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            )}
          </Field>
        )}
        <Field label={IS_ADMIN_PORTAL ? t("Admin passcode") : t("Password")}>
          {(id) => (
            <Input
              id={id}
              type="password"
              inputMode={IS_ADMIN_PORTAL ? "numeric" : undefined}
              autoComplete="current-password"
              autoFocus={IS_ADMIN_PORTAL}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>
        {error && <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</p>}
        <Button type="submit" size="lg" loading={busy} className="w-full">
          {t("Sign in")}
        </Button>
      </form>
      {!IS_ADMIN_PORTAL && (
        <>
          <p className="mt-6 text-center text-sm text-ink-2">
            {t("New merchant?")}{" "}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              {t("Create an account")}
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-ink-3">{t("Forgot your password? Contact Morning Rider to reset it.")}</p>
        </>
      )}
    </AuthLayout>
  );
}

export function Register() {
  const register = useMutation(api.auth.registerMerchant);
  const toast = useToast();
  const [done, setDone] = useState(false);
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
    try {
      const { confirm: _c, ...rest } = f;
      await register({ ...rest, email: rest.email || undefined });
      setDone(true);
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthLayout title={t("Application received")} subtitle={t("Thank you for choosing Morning Rider.")}>
        <Card className="p-6">
          <CheckCircle2 className="size-10 text-emerald-500" />
          <p className="mt-4 font-semibold">{t("Your merchant account is waiting for approval.")}</p>
          <p className="mt-1 text-sm text-ink-2">
            {t("Our team will verify your details and activate your account. You can sign in as soon as it is approved.")}
          </p>
          <Button className="mt-6" onClick={() => navigate("/login")}>
            {t("Go to login")}
          </Button>
        </Card>
      </AuthLayout>
    );
  }

  const mismatch = f.confirm.length > 0 && f.password !== f.confirm;
  return (
    <AuthLayout title={t("Become a merchant")} subtitle={t("Send parcels anywhere in Bangladesh with Morning Rider.")}>
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

const JOURNEY = ["pending", "picked_up", "at_hub", "out_for_delivery", "delivered"] as const;

export function Track({ code }: { code?: string }) {
  const result = useQuery(api.track.byCode, code ? { code } : "skip");
  return (
    <div className="min-h-full bg-page">
      <section className="sunrise pb-16">
        <PublicNav />
        <div className="mx-auto max-w-2xl px-5 pt-8 text-center">
          <h1 className="text-3xl font-extrabold italic tracking-tight text-white sm:text-4xl">{t("Track your parcel")}</h1>
          <p className="mt-2 text-white/70">{t("Enter the tracking ID from your parcel label or SMS.")}</p>
          <div className="mt-6">
            <TrackBox />
          </div>
        </div>
      </section>
      <div className="mx-auto -mt-8 max-w-2xl px-5 pb-16">
        {!code ? null : result === undefined ? (
          <Card className="p-10 text-center text-ink-3">{t("Looking up {code}…", { code })}</Card>
        ) : result === null ? (
          <Card className="p-10 text-center">
            <PackageSearch className="mx-auto size-10 text-ink-3" />
            <p className="mt-3 font-bold">{t("No parcel found")}</p>
            <p className="mt-1 text-sm text-ink-2">{t("Check the tracking ID ({code}) and try again.", { code })}</p>
          </Card>
        ) : (
          <Card className="animate-rise overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-6">
              <div>
                <p className="text-xs font-semibold tracking-wider text-ink-3">{t("TRACKING ID")}</p>
                <p className="mt-1 font-mono text-xl font-bold">{result.trackingCode}</p>
              </div>
              <StatusBadge status={result.status} className="px-3.5 py-1.5 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4 border-b border-line p-6 text-sm sm:grid-cols-3">
              <div>
                <p className="text-ink-3">{t("From")}</p>
                <p className="font-semibold">{result.merchantName || "—"}</p>
              </div>
              <div>
                <p className="text-ink-3">{t("To")}</p>
                <p className="font-semibold">
                  {result.recipientName}, {result.district}
                </p>
              </div>
              <div>
                <p className="text-ink-3">{result.status === "delivered" ? t("Paid") : t("Amount to pay")}</p>
                <p className="font-semibold">{tk(result.codAmount)}</p>
              </div>
            </div>
            <JourneyBar status={result.status} />
            <ol className="space-y-0 p-6">
              {result.timeline.map((e, i) => (
                <li key={i} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < result.timeline.length - 1 && <span className="absolute left-[9px] top-6 h-full w-0.5 bg-line" />}
                  {i === 0 ? (
                    <CheckCircle2 className="relative z-10 size-5 shrink-0 text-brand" />
                  ) : (
                    <Circle className="relative z-10 size-5 shrink-0 fill-white text-ink-3" />
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
        <span>{t("Booked")}</span>
        <span>{t("Picked")}</span>
        <span>{t("Hub")}</span>
        <span>{t("On the way")}</span>
        <span>{t("Delivered")}</span>
      </div>
    </div>
  );
}
