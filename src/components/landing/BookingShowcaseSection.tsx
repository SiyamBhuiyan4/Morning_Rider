import { CheckCircle2, Clock, Bike } from "lucide-react";
import { cx } from "../ui";
import { t } from "../../lib/prefs";

export function BookingShowcaseSection() {
  return (
    <section className="py-20 bg-surface dark:bg-navy-950/70 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("Simple & Transparent")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("From booking to doorstep in three easy steps")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t(
              "No confusing processes. Book in 2 minutes, get rider pickup at your doorstep, and follow live progress."
            )}
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-3">
          {/* Step 1: 2 Minutes to Book */}
          <div className="flex flex-col justify-between rounded-3xl border border-line bg-page p-6 sm:p-7 shadow-sm transition hover:shadow-lg dark:bg-navy-900/60 dark:border-white/10">
            <div>
              {/* Mock Form Visual */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs dark:bg-navy-950 dark:border-white/10">
                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between border-b border-line pb-2 dark:border-white/10">
                    <span className="font-bold text-ink dark:text-white">{t("Quick Parcel Entry")}</span>
                    <span className="text-[10px] font-bold text-brand">{t("Form: 1 min")}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-3 dark:text-white/50">{t("Receiver Name")}</span>
                    <p className="font-bold text-ink dark:text-white">Sadia Rahman</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-3 dark:text-white/50">{t("Phone Number")}</span>
                    <p className="font-mono font-bold text-ink dark:text-white">01712-345678</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-ink-3 dark:text-white/50">{t("Delivery Address")}</span>
                    <p className="font-semibold text-ink dark:text-white">House 12, Road 4, Sector 7, Uttara</p>
                  </div>
                  <div className="pt-2">
                    <span className="block w-full rounded-xl bg-brand py-2 text-center text-xs font-bold text-white shadow-xs">
                      {t("Book Pickup")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-extrabold text-brand uppercase dark:bg-brand/20">
                  {t("Step 1")}
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-ink dark:text-white">
                  {t("Two minutes to book")}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-ink-2 dark:text-white/70 leading-relaxed">
                  {t(
                    "Customer name, phone number, address and COD amount — that is the whole form. Or upload hundreds at once via Excel."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Step 2: A Rider Comes to You */}
          <div className="flex flex-col justify-between rounded-3xl border border-line bg-page p-6 sm:p-7 shadow-sm transition hover:shadow-lg dark:bg-navy-900/60 dark:border-white/10">
            <div>
              {/* Mock Rider Assignment Card */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs dark:bg-navy-950 dark:border-white/10">
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="grid size-9 place-items-center rounded-xl bg-brand/10 text-brand">
                        <Bike className="size-5" />
                      </div>
                      <div>
                        <p className="font-extrabold text-ink dark:text-white">Rider Rafiqul</p>
                        <p className="text-[10px] text-ink-3 font-mono">ID: MR-R-0842</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/60">
                      {t("On the way")}
                    </span>
                  </div>

                  <div className="rounded-xl bg-page p-2.5 text-[11px] text-ink-2 dark:bg-navy-900 dark:text-white/70">
                    <p className="flex items-center gap-1.5 font-bold text-ink dark:text-white">
                      <Clock className="size-3.5 text-brand" />
                      {t("Arrival in ~15 mins")}
                    </p>
                    <p className="mt-0.5 text-ink-3 dark:text-white/50">
                      {t("Rider calls before pickup")}
                    </p>
                  </div>

                  <div className="pt-1 flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-ink-3 dark:text-white/50">{t("Pickup point:")}</span>
                    <span className="font-bold text-ink dark:text-white">Sector 9, Uttara</span>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <span className="rounded-md bg-sun-100 px-2 py-0.5 text-[11px] font-extrabold text-amber-700 uppercase dark:bg-amber-500/20 dark:text-amber-300">
                  {t("Step 2")}
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-ink dark:text-white">
                  {t("A rider comes to you")}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-ink-2 dark:text-white/70 leading-relaxed">
                  {t(
                    "Same day in Dhaka, Gazipur and Narayanganj. The assigned rider calls you ahead of time and scans each barcode upon handover."
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Step 3: Follow it to the Door */}
          <div className="flex flex-col justify-between rounded-3xl border border-line bg-page p-6 sm:p-7 shadow-sm transition hover:shadow-lg dark:bg-navy-900/60 dark:border-white/10">
            <div>
              {/* Mock Timeline Visual */}
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs dark:bg-navy-950 dark:border-white/10">
                <div className="space-y-3 text-xs">
                  {[
                    { label: t("Picked up from merchant"), time: "07:30 AM", done: true },
                    { label: t("Scanned at central hub"), time: "09:15 AM", done: true },
                    { label: t("Out for delivery with rider"), time: "10:45 AM", done: true },
                    { label: t("Handed over & COD received"), time: "11:20 AM", done: true, active: true },
                  ].map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2
                          className={cx(
                            "size-4 shrink-0",
                            s.active ? "text-emerald-500" : "text-brand"
                          )}
                        />
                        <span className="font-semibold text-ink dark:text-white text-[11px]">
                          {s.label}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-ink-3 dark:text-white/50">{s.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700 uppercase dark:bg-emerald-950/60 dark:text-emerald-400">
                  {t("Step 3")}
                </span>
                <h3 className="mt-2 text-xl font-extrabold text-ink dark:text-white">
                  {t("Follow it to the door")}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-ink-2 dark:text-white/70 leading-relaxed">
                  {t(
                    "An automated SMS is sent at every milestone. Your customer can track their delivery without creating an account or logging in."
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
