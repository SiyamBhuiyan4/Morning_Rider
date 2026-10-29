import { useState, type FormEvent } from "react";
import { ArrowRight, Lock, MessageCircle, PackageSearch, Search, ShieldCheck, Truck } from "lucide-react";
import { Button, cx } from "../ui";
import { navigate } from "../../lib/router";
import { t } from "../../lib/prefs";
import { CONTACT } from "../../lib/contact";

export function HeroSection() {
  const [trackCode, setTrackCode] = useState("");

  const handleTrack = (e: FormEvent) => {
    e.preventDefault();
    const clean = trackCode.trim().toUpperCase();
    if (clean) {
      navigate(`/track/${encodeURIComponent(clean)}`);
    }
  };

  const sampleCodes = ["MR7K2Q9XPA", "MR8N3B4V2C"];

  return (
    <section className="relative overflow-hidden pt-6 pb-20 sm:pt-10 sm:pb-28">
      {/* Background visual accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-brand/15 blur-[120px]" />
        <div className="absolute top-1/3 right-10 size-[450px] rounded-full bg-sun/15 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.25fr_0.95fr] lg:gap-14">
          {/* Left Column: Headlines & Tracking */}
          <div className="animate-rise space-y-6 text-left">
            {/* Announcement Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-sun backdrop-blur-md">
              <span className="flex size-2 rounded-full bg-brand animate-pulse" />
              <span>{t("6:00 AM Morning Dispatch • 3-Hour Express • Cold-Chain")}</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-[64px] leading-[1.08]">
                {t("Anywhere in Dhaka, Gazipur & Narayanganj —")}{" "}
                <span className="bg-gradient-to-r from-brand via-amber-400 to-sun bg-clip-text text-transparent">
                  {t("on time.")}
                </span>
              </h1>
              <p className="max-w-2xl text-base sm:text-lg font-medium text-white/75 leading-relaxed pt-2">
                {t(
                  "From documents to frozen foods, cakes and e-commerce parcels — Morning Rider ensures safe doorstep delivery 7 days a week, starting from dawn at 6 AM."
                )}
              </p>
            </div>

            {/* Steadfast-Grade Hero Tracking Box */}
            <div className="rounded-3xl border border-white/20 bg-surface/95 p-3 sm:p-3.5 shadow-2xl backdrop-blur-xl dark:bg-navy-900/95">
              <form onSubmit={handleTrack} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-3 px-3">
                  <PackageSearch className="size-5 shrink-0 text-brand" />
                  <input
                    type="text"
                    value={trackCode}
                    onChange={(e) => setTrackCode(e.target.value)}
                    placeholder={t("Paste tracking link or code (e.g. MR7K2Q9XPA)")}
                    className="h-12 w-full bg-transparent text-sm sm:text-base font-semibold text-ink outline-none placeholder:text-ink-3 dark:text-white"
                  />
                </div>
                <Button type="submit" size="lg" icon={Search} className="h-12 px-6 sm:shrink-0">
                  {t("Track Parcel")}
                </Button>
              </form>

              {/* Helper & Quick Try Chips */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/60 pt-2.5 px-3 text-xs text-ink-3 dark:border-white/10 dark:text-white/60">
                <div className="flex items-center gap-1.5">
                  <Lock className="size-3 text-brand" />
                  <span>{t("Use link from SMS. No account needed.")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-ink-2 dark:text-white/70">{t("Try sample:")}</span>
                  {sampleCodes.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTrackCode(c)}
                      className="rounded-md bg-page px-2 py-0.5 font-mono text-[11px] font-bold text-brand transition hover:bg-brand/10 dark:bg-navy-950"
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="lg" onClick={() => navigate("/register")} className="shadow-glow group">
                <span>{t("Become a merchant")}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <a
                href={CONTACT.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 text-[15px] font-bold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                <MessageCircle className="size-4 text-emerald-400" />
                <span>{t("Book via WhatsApp")}</span>
              </a>
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate("/join")}
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                {t("Join as rider")}
              </Button>
            </div>
          </div>

          {/* Right Column: Hero Visual Card Showcase */}
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
            {/* Glowing Backdrop */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-brand/30 via-sun/20 to-transparent blur-2xl" />

            {/* Visual Dashboard Mockup Card */}
            <div className="relative rounded-3xl border border-white/20 bg-navy-950/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-brand text-white shadow-md shadow-brand/40">
                    <Truck className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white/60">{t("Live Dispatch Network")}</p>
                    <p className="text-sm font-extrabold text-white">{t("Morning Express In-Transit")}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-400">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {t("System Live")}
                </span>
              </div>

              {/* Mock Step Stream */}
              <div className="mt-5 space-y-3.5">
                {[
                  {
                    code: "MR7K2Q9XPA",
                    area: t("Uttara Sector 9 ➔ Gulshan 2"),
                    status: t("Out for delivery"),
                    time: t("Estimated by 11:30 AM"),
                    speed: t("3h Express"),
                    color: "text-brand bg-brand-50/15 border-brand/30",
                  },
                  {
                    code: "MR8N3B4V2C",
                    area: t("Mirpur 10 ➔ Gazipur City"),
                    status: t("Frozen Meat in Cold-Box"),
                    time: t("6h Temperature Safe"),
                    speed: t("Cold Chain"),
                    color: "text-sky-400 bg-sky-500/15 border-sky-400/30",
                  },
                  {
                    code: "MR9L1Z8Y3W",
                    area: t("Dhanmondi ➔ Narayanganj Sadar"),
                    status: t("COD ৳2,450 Collected"),
                    time: t("Payout tomorrow 9 AM"),
                    speed: t("Same Day"),
                    color: "text-emerald-400 bg-emerald-500/15 border-emerald-400/30",
                  },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 transition hover:bg-white/10"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-sun">{item.code}</span>
                        <span className={cx("rounded-md border px-1.5 py-0.5 text-[10px] font-bold", item.color)}>
                          {item.speed}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-white/90">{item.area}</p>
                      <p className="text-[11px] text-white/55">{item.time}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Feature Pill in Card */}
              <div className="mt-5 flex items-center justify-between rounded-xl bg-brand/15 border border-brand/30 px-3.5 py-2.5 text-xs text-brand-100">
                <span className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="size-4 text-brand" /> {t("100% Cash Guarantee")}
                </span>
                <span className="text-white/80">{t("Automated Next-Day Payout")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Steadfast-Grade Metric Counter Strip */}
        <div className="mt-14 sm:mt-16 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { value: "25,000+", label: t("Successful Deliveries"), sub: t("Parcels safely delivered") },
            { value: "99.4%", label: t("On-Time Success"), sub: t("Within target window") },
            { value: "3", label: t("City Corporations"), sub: t("Dhaka, Gazipur, Narayanganj") },
            { value: "120+", label: t("Delivery Hubs"), sub: t("Comprehensive coverage") },
            { value: "6:00 AM", label: t("Dawn Dispatch"), sub: t("Beat Dhaka morning traffic") },
          ].map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-2xl p-4 transition-all duration-200 hover:bg-white/[0.12] hover:scale-[1.02]"
            >
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{stat.value}</p>
              <p className="mt-1 text-xs font-bold text-sun">{stat.label}</p>
              <p className="text-[11px] text-white/60">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
