import { CATEGORY, type Category } from "../../lib/format";
import { cx } from "../ui";
import { t } from "../../lib/prefs";
import { CheckCircle2, Snowflake, ArrowRight } from "lucide-react";
import { navigate } from "../../lib/router";

const SERVICES_LIST: Category[] = [
  "parcel",
  "document",
  "food",
  "medicine",
  "shopping",
  "electronics",
  "cosmetics",
  "gift",
  "frozen",
  "bakery",
  "home",
  "business",
];

export function ServicesSection() {
  return (
    <section id="services" className="py-20 bg-surface dark:bg-navy-950/40 scroll-mt-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-brand uppercase">
            {t("Comprehensive Logistics")}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl dark:text-white">
            {t("Tailored delivery for every product category")}
          </h2>
          <p className="mt-3 text-base text-ink-2 dark:text-white/70">
            {t(
              "Your merchandise, our utmost responsibility — from urgent legal documents to sensitive cold-chain perishables."
            )}
          </p>
        </div>

        {/* 12 Category Interactive Grid */}
        <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SERVICES_LIST.map((key) => {
            const cat = CATEGORY[key];
            const isSpecial = key === "frozen" || key === "bakery";
            return (
              <div
                key={key}
                className={cx(
                  "group relative flex flex-col items-center justify-center rounded-3xl border p-5 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer",
                  isSpecial
                    ? "border-brand/40 bg-brand-50/20 dark:bg-brand/10 dark:border-brand/50"
                    : "border-line bg-page hover:border-brand/30 dark:bg-navy-900/60 dark:border-white/10"
                )}
                onClick={() => navigate("/register")}
              >
                {isSpecial && (
                  <span className="absolute top-2.5 right-2.5 rounded-full bg-brand px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                    {key === "frozen" ? "6H COLD" : "DELICATE"}
                  </span>
                )}
                <div className="grid size-14 place-items-center rounded-2xl bg-surface text-3xl shadow-xs transition-transform duration-200 group-hover:scale-110 dark:bg-navy-950">
                  {cat.emoji}
                </div>
                <p className="mt-3 text-xs sm:text-sm font-bold text-ink dark:text-white leading-snug">
                  {cat.label}
                </p>
                {cat.careful && (
                  <p className="mt-1 line-clamp-1 text-[10px] text-ink-3 dark:text-white/50">
                    {cat.careful}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Cold-Chain & Bakery Superpower Feature Spotlight */}
        <div className="mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c234a] via-[#08152e] to-navy-950 border border-white/15 p-8 text-white sm:p-12 shadow-2xl relative">
          <Snowflake className="absolute -right-8 -top-8 size-64 text-white/5 pointer-events-none" />
          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/20 border border-sky-400/30 px-3.5 py-1 text-xs font-bold text-sky-300">
                <Snowflake className="size-3.5 animate-spin-slow" />
                <span>{t("Signature Cold-Chain Delivery Service")}</span>
              </div>
              <h3 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                {t("Frozen food & delicate cakes delivered in 6 hours")}
              </h3>
              <p className="text-sm sm:text-base text-white/80 leading-relaxed max-w-xl">
                {t(
                  "Raw meat, marinated chicken, frozen fish, prawns, ice cream, artisanal pastries, and multi-tier birthday cakes. Carried inside insulated thermal boxes that keep food at optimal refrigeration temperatures throughout transit."
                )}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand-600 cursor-pointer"
                >
                  <span>{t("Ship frozen items")}</span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Checklist of cold-chain standards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: t("Thermal-Insulated Boxes"), desc: t("Specialized cold packs maintain sub-zero chills") },
                { title: t("Unbroken Cold Chain"), desc: t("Guaranteed below-temperature window across 3 cities") },
                { title: t("Flat & Upright Care"), desc: t("Bakery items kept perfectly level without tipping") },
                { title: t("6-Hour Express Dispatch"), desc: t("Delivered same day directly to customer kitchen") },
              ].map((c) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2 text-sun font-bold text-sm">
                    <CheckCircle2 className="size-4 shrink-0 text-sun" />
                    <span>{c.title}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-white/70 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
