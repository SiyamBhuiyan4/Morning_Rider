import { ArrowRight, Package, PackageSearch, Store, CheckCircle2 } from "lucide-react";
import { cx } from "../ui";
import { navigate } from "../../lib/router";
import { t } from "../../lib/prefs";

export function ThreeJobsSection() {
  const jobs = [
    {
      id: "send",
      icon: Package,
      kicker: t("Doorstep Delivery"),
      title: t("Send a parcel"),
      description: t(
        "Person-to-person or shop-to-buyer anywhere in Dhaka, Gazipur, and Narayanganj. Reliable doorstep pickup and fast handover."
      ),
      points: [
        t("Free scheduled pickup"),
        t("3-hour express inside Uttara"),
        t("Same-day city delivery"),
      ],
      cta: t("Send now"),
      action: () => navigate("/register"),
      accent: "from-brand/20 via-brand/5 to-transparent border-brand/30",
      iconTone: "bg-brand text-white shadow-brand/30",
    },
    {
      id: "track",
      icon: PackageSearch,
      kicker: t("Live Transparency"),
      title: t("Track a parcel"),
      description: t(
        "No login required for customers. Just enter the tracking ID or click the link received in your SMS to see real-time rider updates."
      ),
      points: [
        t("Instant milestone status"),
        t("Assigned rider phone contact"),
        t("Live delivery confirmation"),
      ],
      cta: t("Track parcel"),
      action: () => navigate("/track"),
      accent: "from-sun/20 via-sun/5 to-transparent border-sun/30",
      iconTone: "bg-sun text-navy-950 shadow-sun/30",
    },
    {
      id: "business",
      icon: Store,
      kicker: t("E-Commerce & Merchants"),
      title: t("For business"),
      description: t(
        "Automated cash on delivery, daily free shop pickup, next-day bank or mobile wallet payout, and full API integration."
      ),
      points: [
        t("0% COD charge in Dhaka"),
        t("Daily automated payout"),
        t("Bulk 200+ parcel upload"),
      ],
      cta: t("Join as merchant"),
      action: () => navigate("/register"),
      accent: "from-navy-600/30 via-navy-600/10 to-transparent border-navy-400/30",
      iconTone: "bg-navy-900 text-white dark:bg-navy-700 shadow-navy-900/30",
    },
  ];

  return (
    <section className="relative z-10 py-16 sm:py-24 bg-surface dark:bg-navy-950/60 border-y border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("Unified Logistics Network")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("Three jobs, one network")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t(
              "One parcel or a thousand a day — the same dedicated riders, cold-chain assurance, and transparent live tracking."
            )}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={cx(
                "group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-gradient-to-b p-7 sm:p-8 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl",
                job.accent
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div
                    className={cx(
                      "grid size-12 place-items-center rounded-2xl shadow-lg transition-transform duration-300 group-hover:scale-110",
                      job.iconTone
                    )}
                  >
                    <job.icon className="size-6" />
                  </div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-3 dark:text-white/50">
                    {job.kicker}
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-extrabold text-ink sm:text-2xl dark:text-white">
                  {job.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-2 dark:text-white/70">
                  {job.description}
                </p>

                <ul className="mt-6 space-y-2.5">
                  {job.points.map((pt) => (
                    <li
                      key={pt}
                      className="flex items-center gap-2 text-xs font-semibold text-ink-2 dark:text-white/80"
                    >
                      <CheckCircle2 className="size-4 shrink-0 text-brand" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-line/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={job.action}
                  className="flex items-center gap-2 text-sm font-bold text-brand transition-colors hover:text-brand-600 group-hover:underline cursor-pointer"
                >
                  <span>{job.cta}</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
