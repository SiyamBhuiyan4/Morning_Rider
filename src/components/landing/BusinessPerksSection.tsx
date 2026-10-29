import { FileSpreadsheet, ShieldAlert, Zap, Headphones, BarChart3, Wallet, ArrowRight } from "lucide-react";
import { Button } from "../ui";
import { navigate } from "../../lib/router";
import { t } from "../../lib/prefs";

export function BusinessPerksSection() {
  const perks = [
    {
      icon: FileSpreadsheet,
      title: t("500 orders in one spreadsheet"),
      desc: t(
        "Upload an Excel or CSV file in seconds. Every parcel instantly gets an auto-generated tracking barcode and printable shipping labels."
      ),
    },
    {
      icon: ShieldAlert,
      title: t("Built-in Delivery Risk Check"),
      desc: t(
        "Screen recipient phone numbers before dispatching to identify chronic returners and protect your store against bogus COD orders."
      ),
    },
    {
      icon: Wallet,
      title: t("Next-day automated cash payouts"),
      desc: t(
        "No waiting weeks for your money. Cash on delivery collected today is settled tomorrow morning directly to bKash, Nagad, or Bank."
      ),
    },
    {
      icon: Zap,
      title: t("0% COD charge inside Dhaka"),
      desc: t(
        "Keep more profit in your business. We charge 0% COD inside Dhaka City and Uttara, with the lowest transparent rates outside."
      ),
    },
    {
      icon: BarChart3,
      title: t("Detailed statements & printable invoices"),
      desc: t(
        "Itemized disbursement summaries, printable payment vouchers, and CSV reconciliation reports for smooth bookkeeping."
      ),
    },
    {
      icon: Headphones,
      title: t("Dedicated merchant account manager"),
      desc: t(
        "Direct WhatsApp and phone hotline access to resolve special delivery requests, address corrections, or hold instructions instantly."
      ),
    },
  ];

  return (
    <section id="business" className="py-20 bg-page dark:bg-navy-950/40 scroll-mt-10 border-t border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("Merchant Ecosystem")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("The courier network powering Dhaka's leading merchants")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t(
              "Everything you need to scale your e-commerce shop, organic food brand, boutique, or restaurant delivery smoothly."
            )}
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((p) => (
            <div
              key={p.title}
              className="group rounded-3xl border border-line bg-surface p-7 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg dark:bg-navy-900/60 dark:border-white/10"
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-white dark:bg-brand/20 dark:text-sun">
                <p.icon className="size-6" />
              </div>
              <h3 className="mt-5 text-lg font-extrabold text-ink dark:text-white">
                {p.title}
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-2 dark:text-white/70">
                {p.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Highlight Banner */}
        <div className="mt-12 rounded-3xl bg-surface border border-line p-6 sm:p-8 dark:bg-navy-900/80 dark:border-white/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-brand uppercase tracking-wider">
                {t("Transparent Returns Guarantee")}
              </span>
              <h4 className="text-xl font-extrabold text-ink dark:text-white">
                {t("Only 50% delivery charge on returned parcels — 0% COD fee")}
              </h4>
              <p className="text-xs sm:text-sm text-ink-2 dark:text-white/70 max-w-2xl">
                {t(
                  "If a customer cancels or refuses an order, our rider will contact you first. Returned parcels incur no COD deduction whatsoever."
                )}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate("/register")}
              className="shrink-0 shadow-glow"
            >
              <span>{t("Open free merchant account")}</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
