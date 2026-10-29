import { Bike, Building2, QrCode, Wallet2, CheckCircle2 } from "lucide-react";
import { t } from "../../lib/prefs";

export function ParcelJourneySection() {
  const steps = [
    {
      step: 1,
      icon: Bike,
      title: t("Pickup every day"),
      tagline: t("A rider comes to your doorstep"),
      description: t(
        "No minimum volume required. Our rider arrives at your shop or home, scans each parcel out, and issues an immediate digital receipt."
      ),
      highlight: t("Scan out at pickup"),
    },
    {
      step: 2,
      icon: Building2,
      title: t("Routed through hub"),
      tagline: t("Fast sorting & barcode scan"),
      description: t(
        "Parcels are immediately routed through our central division sorting hub, barcoded, weighed, and queued for dawn dispatch."
      ),
      highlight: t("Division hub check-in"),
    },
    {
      step: 3,
      icon: QrCode,
      title: t("A scan at every step"),
      tagline: t("Live transparency for buyer & seller"),
      description: t(
        "Pickup, hub arrival, out-for-delivery, and handover — every milestone is logged in the system with SMS notifications to the receiver."
      ),
      highlight: t("Real-time SMS alerts"),
    },
    {
      step: 4,
      icon: Wallet2,
      title: t("Payout the next day"),
      tagline: t("Reconciled & transferred"),
      description: t(
        "Cash collected upon delivery is automatically reconciled in your merchant panel and transferred to your bKash, Nagad, or Bank account next day."
      ),
      highlight: t("0% COD inside Dhaka"),
    },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-page dark:bg-navy-950/40 scroll-mt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("End-To-End Fulfillment")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("The road a parcel actually takes")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t(
              "Pickup to hub, hub to customer doorstep — a trained person and a verified scan at every stage."
            )}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((st) => (
            <div
              key={st.step}
              className="relative flex flex-col justify-between rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg dark:bg-navy-900/60 dark:border-white/10"
            >
              {/* Step indicator watermark */}
              <span className="absolute top-4 right-5 text-4xl sm:text-5xl font-black text-navy-50/80 dark:text-white/5 select-none pointer-events-none">
                0{st.step}
              </span>

              <div>
                <div className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand dark:bg-brand/20 dark:text-sun">
                  <st.icon className="size-6" />
                </div>

                <div className="mt-5">
                  <span className="inline-block rounded-md bg-page px-2 py-0.5 text-[11px] font-bold text-brand uppercase tracking-wider dark:bg-navy-950">
                    {st.tagline}
                  </span>
                  <h3 className="mt-2 text-lg font-extrabold text-ink dark:text-white">
                    {st.title}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-2 dark:text-white/70">
                    {st.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line/60 dark:border-white/10">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-3.5" />
                  <span>{st.highlight}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
