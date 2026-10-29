import { ShieldCheck, Star } from "lucide-react";
import { t } from "../../lib/prefs";

export function TestimonialsSection() {
  const trustBadges = [
    {
      title: t("e-CAB Guidelines Compliant"),
      desc: t("Adhering strictly to Bangladesh e-Commerce Association fair delivery practices"),
    },
    {
      title: t("100% NID-Verified Riders"),
      desc: t("Every rider undergoes physical address verification and background screening"),
    },
    {
      title: t("Dedicated Cold-Chain Quality"),
      desc: t("Sub-zero insulated carry compliance for perishable meat, fish, and dairy"),
    },
    {
      title: t("Direct Bank & MFS Settlement"),
      desc: t("Safe, audited cash management directly deposited to verified merchant accounts"),
    },
  ];

  const testimonials = [
    {
      quote: t(
        "Morning Rider’s 6-hour cold chain delivery solved our biggest operational bottleneck. Our frozen marinated meats and seafood reach customer doors in Uttara and Dhanmondi ice-cold."
      ),
      author: "Tanvir Ahmed",
      role: t("Founder, Premium Frozen Foods"),
      area: "Uttara, Dhaka",
    },
    {
      quote: t(
        "The 3-hour express delivery inside Uttara is unmatched. Our customers receive custom celebration cakes intact, flat, and right on schedule. No damaged toppings ever."
      ),
      author: "Farhana Yasmin",
      role: t("Head Pastry Chef, Artisanal Bakehouse"),
      area: "Sector 4, Uttara",
    },
    {
      quote: t(
        "The Delivery Risk Check is a lifesaver. We used to lose thousands on fake COD orders. Now we know exactly when to ask for an advance courier fee."
      ),
      author: "Mahmud Hasan",
      role: t("Owner, Urban Trends Clothing"),
      area: "Mirpur, Dhaka",
    },
  ];

  return (
    <section className="py-20 bg-page dark:bg-navy-950/50 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("Trust & Assurance")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("Why Bangladesh merchants trust Morning Rider")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t(
              "Trusted every morning by e-commerce brands, food artisans, and daily businesses."
            )}
          </p>
        </div>

        {/* 4 Trust Standards */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustBadges.map((badge) => (
            <div
              key={badge.title}
              className="rounded-3xl border border-line bg-surface p-6 shadow-xs dark:bg-navy-900/60 dark:border-white/10"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-brand/10 text-brand dark:bg-brand/20 dark:text-sun">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="mt-4 font-extrabold text-sm text-ink dark:text-white">
                {badge.title}
              </h3>
              <p className="mt-1.5 text-xs text-ink-2 dark:text-white/70 leading-relaxed">
                {badge.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Merchant Reviews */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((test) => (
            <div
              key={test.author}
              className="flex flex-col justify-between rounded-3xl border border-line bg-surface p-7 shadow-xs transition hover:shadow-md dark:bg-navy-900/60 dark:border-white/10"
            >
              <div>
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-xs sm:text-sm text-ink-2 dark:text-white/80 leading-relaxed italic">
                  "{test.quote}"
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-xs sm:text-sm text-ink dark:text-white">
                    {test.author}
                  </p>
                  <p className="text-[11px] text-brand dark:text-sun">{test.role}</p>
                </div>
                <span className="text-[10px] text-ink-3 dark:text-white/50">{test.area}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
