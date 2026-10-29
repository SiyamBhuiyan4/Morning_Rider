import { Bike, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "../ui";
import { navigate } from "../../lib/router";
import { t } from "../../lib/prefs";

export function RiderRecruitmentSection() {
  const benefits = [
    t("Attractive per-delivery commission & performance bonuses"),
    t("Daily earning payouts directly to your mobile wallet"),
    t("Fuel & motorcycle maintenance allowance"),
    t("Flexible morning (6 AM) and afternoon shifts"),
    t("Safety equipment & professional branded delivery kit"),
    t("Respectful team culture with long-term career growth"),
  ];

  const requirements = [
    t("Personal motorcycle or bicycle in dependable condition"),
    t("Valid driving licence (for motorcycle riders)"),
    t("Original National ID card (NID)"),
    t("Android or iOS smartphone with continuous internet data"),
    t("Familiarity with Dhaka, Gazipur, or Narayanganj roadways"),
    t("Courteous, punctual, and disciplined customer conduct"),
  ];

  return (
    <section id="join" className="py-20 bg-surface dark:bg-navy-950/70 border-t border-line scroll-mt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-3xl border border-line shadow-2xl lg:grid-cols-2 dark:border-white/10">
          {/* Left Hero Box */}
          <div className="sunrise p-8 sm:p-12 text-white flex flex-col justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-sun ring-1 ring-white/15">
                <Bike className="size-3.5" />
                {t("Join our delivery team")}
              </span>
              <h3 className="mt-4 text-3xl sm:text-4xl font-extrabold italic tracking-tight text-white">
                {t("Become a Morning Rider")}
              </h3>
              <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed max-w-lg">
                {t(
                  "Have your own motorcycle and want high daily earnings? Join Morning Rider's trusted delivery network across Dhaka, Gazipur, and Narayanganj."
                )}
              </p>

              <div className="mt-8">
                <p className="text-xs font-bold text-sun uppercase tracking-wider">
                  {t("What you get:")}
                </p>
                <ul className="mt-3 space-y-2.5">
                  {benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2.5 text-xs sm:text-sm text-white/90">
                      <CheckCircle2 className="size-4 shrink-0 text-sun" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10">
              <span className="text-xs text-white/60">
                {t("Daily dawn dispatches starting at 6:00 AM • High order volume")}
              </span>
            </div>
          </div>

          {/* Right Requirements Box */}
          <div className="bg-page p-8 sm:p-12 flex flex-col justify-between dark:bg-navy-900/90">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-brand" />
                <h4 className="font-extrabold text-lg text-ink dark:text-white">
                  {t("Eligibility & Requirements")}
                </h4>
              </div>

              <ul className="mt-5 space-y-3">
                {requirements.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-xs sm:text-sm text-ink-2 dark:text-white/80">
                    <CheckCircle2 className="size-4 shrink-0 text-brand mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-2xl bg-surface border border-line p-4 text-xs text-ink-2 dark:bg-navy-950 dark:border-white/10 dark:text-white/70">
                {t(
                  "Apply online in under 3 minutes. Our recruitment team reviews your credentials and invites you to our Uttara central office for interview and onboarding."
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/join")} className="shadow-glow">
                <span>{t("Apply as a rider now")}</span>
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
