import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cx } from "../ui";
import { t } from "../../lib/prefs";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: t("How fast does Morning Rider deliver parcels?"),
      a: t(
        "Inside Uttara, our Express service delivers within 3 hours for orders booked between 6 AM and 12 noon. Across all of Dhaka City, Gazipur City, and Narayanganj City, regular parcels are delivered same day, 7 days a week, starting early at 6 AM."
      ),
    },
    {
      q: t("When and how do merchants receive COD payouts?"),
      a: t(
        "Collected cash on delivery is deposited automatically the very next morning directly into your bKash, Nagad, Rocket, or designated Bank account. You receive itemized payment vouchers and downloadable invoices with every settlement."
      ),
    },
    {
      q: t("How does the 6-hour cold chain delivery work?"),
      a: t(
        "We carry frozen meats, seafood, chicken, dairy, ice cream, pastries, and delicate birthday cakes in specialized temperature-insulated thermal carriers with cold packs. We ensure the cold chain remains unbroken from shop pickup to customer door."
      ),
    },
    {
      q: t("What is the Delivery Risk Check and how do merchants use it?"),
      a: t(
        "Our built-in risk assessment engine lets merchants check any buyer's past courier delivery performance before dispatching. If a customer has a history of high order returns or cancellations, you can ask for the delivery fee in advance to safeguard against lost shipping costs."
      ),
    },
    {
      q: t("Is there any registration fee or monthly subscription?"),
      a: t(
        "No. Merchant registration is 100% free with no monthly fees, setup costs, or minimum order commitments. You only pay transparent per-parcel delivery charges when you ship."
      ),
    },
    {
      q: t("What happens if a customer refuses or returns a parcel?"),
      a: t(
        "If a recipient cannot be reached or refuses delivery, our rider calls you immediately to seek instructions. For confirmed returns, only a fair 50% return charge applies, with 0% COD fee deducted."
      ),
    },
    {
      q: t("Can I upload orders in bulk using an Excel file?"),
      a: t(
        "Yes! Merchants can upload up to 500 orders at once using an Excel (.xlsx) or CSV file. Every parcel automatically receives a unique tracking barcode and printable shipping labels in seconds."
      ),
    },
  ];

  return (
    <section id="faq" className="py-20 bg-surface dark:bg-navy-950/70 border-t border-line scroll-mt-10">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("Got Questions?")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("Frequently Asked Questions")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t("Everything you need to know about shipping with Morning Rider Courier.")}
          </p>
        </div>

        <div className="mt-12 space-y-3.5">
          {faqs.map((f, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={f.q}
                className={cx(
                  "overflow-hidden rounded-2xl border transition-all duration-200",
                  isOpen
                    ? "border-brand/40 bg-page shadow-sm dark:bg-navy-900 dark:border-brand/40"
                    : "border-line bg-page/60 hover:border-brand/20 dark:bg-navy-900/40 dark:border-white/10"
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left font-bold text-ink dark:text-white cursor-pointer"
                >
                  <span className="text-sm sm:text-base">{f.q}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-ink-3 dark:bg-navy-950 dark:text-white/70">
                    {isOpen ? (
                      <ChevronUp className="size-4 text-brand" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs sm:text-sm leading-relaxed text-ink-2 dark:text-white/75">
                    <p className="border-t border-line/60 pt-3 dark:border-white/10">{f.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
