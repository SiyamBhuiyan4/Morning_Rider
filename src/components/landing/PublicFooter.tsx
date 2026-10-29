import { Link } from "../../lib/router";
import { Logo, Wordmark } from "../ui";
import { CONTACT } from "../../lib/contact";
import { t } from "../../lib/prefs";
import { MapPin, Phone, MessageCircle, ThumbsUp, ShieldCheck } from "lucide-react";

export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-surface dark:bg-navy-950 text-ink dark:text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Col 1 & 2: Brand Info */}
          <div className="space-y-4 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={42} />
              <Wordmark />
            </Link>
            <p className="max-w-sm text-xs sm:text-sm text-ink-2 dark:text-white/70 leading-relaxed">
              {t(
                "Morning Rider is Bangladesh's pioneering early morning logistics and cold-chain courier service. Delivering parcels, fresh food, medicine, and e-commerce shipments across Dhaka, Gazipur, and Narayanganj 7 days a week."
              )}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={CONTACT.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-9 place-items-center rounded-xl bg-page border border-line text-ink-2 hover:bg-brand hover:text-white transition dark:bg-navy-900 dark:border-white/10 dark:text-white/80"
                aria-label="Facebook"
              >
                <ThumbsUp className="size-4" />
              </a>
              <a
                href={CONTACT.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-9 place-items-center rounded-xl bg-page border border-line text-ink-2 hover:bg-emerald-600 hover:text-white transition dark:bg-navy-900 dark:border-white/10 dark:text-white/80"
                aria-label="WhatsApp"
              >
                <MessageCircle className="size-4" />
              </a>
              <a
                href={`tel:${CONTACT.phone}`}
                className="grid size-9 place-items-center rounded-xl bg-page border border-line text-ink-2 hover:bg-brand hover:text-white transition dark:bg-navy-900 dark:border-white/10 dark:text-white/80"
                aria-label="Call"
              >
                <Phone className="size-4" />
              </a>
            </div>
          </div>

          {/* Col 3: Services */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              {t("Delivery Services")}
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-ink-2 dark:text-white/70">
              <li>
                <a href="/#rates" className="hover:text-brand transition">
                  {t("Uttara 3-Hour Express")}
                </a>
              </li>
              <li>
                <a href="/#services" className="hover:text-brand transition">
                  {t("Cold-Chain in 6 Hours")}
                </a>
              </li>
              <li>
                <a href="/#rates" className="hover:text-brand transition">
                  {t("Same-Day City Delivery")}
                </a>
              </li>
              <li>
                <a href="/#coverage" className="hover:text-brand transition">
                  {t("Coverage Directory")}
                </a>
              </li>
              <li>
                <Link href="/track" className="hover:text-brand transition">
                  {t("Track a Parcel")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: For Business */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              {t("Merchant Solutions")}
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-ink-2 dark:text-white/70">
              <li>
                <Link href="/register" className="hover:text-brand transition">
                  {t("Merchant Registration")}
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand transition">
                  {t("Merchant Login")}
                </Link>
              </li>
              <li>
                <a href="/#risk-check" className="hover:text-brand transition">
                  {t("Delivery Risk Check")}
                </a>
              </li>
              <li>
                <a href="/#rates" className="hover:text-brand transition">
                  {t("Delivery Rate Calculator")}
                </a>
              </li>
              <li>
                <Link href="/join" className="hover:text-brand transition">
                  {t("Join as Rider")}
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-brand transition opacity-75">
                  {t("Admin Portal")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 5: Head Office & Contacts */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">
              {t("Headquarters")}
            </p>
            <div className="space-y-2.5 text-xs text-ink-2 dark:text-white/70 leading-relaxed">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand" />
                <span>{CONTACT.address}</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="size-4 shrink-0 text-brand" />
                <span>{CONTACT.phone}, {CONTACT.phone2}</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="size-4 shrink-0 text-brand" />
                <span>{t("Dispatch starts daily at 6:00 AM")}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-8 text-xs text-ink-3 dark:border-white/10 dark:text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Morning Rider Courier Service. {t("All rights reserved.")}</p>
          <div className="flex flex-wrap items-center gap-4">
            <span>{t("Your trust is our morning inspiration.")}</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" /> {t("Verified Secure Logistics")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
