import { ArrowRight, MessageCircle, Phone, Sparkles } from "lucide-react";
import { Button } from "../ui";
import { navigate } from "../../lib/router";
import { CONTACT } from "../../lib/contact";
import { t } from "../../lib/prefs";

export function CtaBanner() {
  return (
    <section className="relative overflow-hidden py-16 sm:py-20 sunrise text-white">
      {/* Decorative Blur Circles */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-10 size-72 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute top-1/2 right-10 size-72 rounded-full bg-sun/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-sun ring-1 ring-white/15">
          <Sparkles className="size-3.5" />
          {t("Scale your deliveries today")}
        </span>

        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
          {t("Ready to experience reliable morning delivery?")}
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-white/80 leading-relaxed">
          {t(
            "Join hundreds of satisfied merchants across Dhaka, Gazipur, and Narayanganj. Free sign-up, zero setup charges, and next-day automated payouts."
          )}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            size="lg"
            onClick={() => navigate("/register")}
            className="shadow-glow"
          >
            <span>{t("Become a merchant — it's free")}</span>
            <ArrowRight className="size-4" />
          </Button>

          <a
            href={CONTACT.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-emerald-600 px-6 text-[15px] font-bold text-white shadow-lg transition hover:bg-emerald-700"
          >
            <MessageCircle className="size-4" />
            <span>{t("Chat on WhatsApp")}</span>
          </a>

          <a
            href={`tel:${CONTACT.phone}`}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-white/10 px-5 text-[15px] font-bold text-white backdrop-blur-md transition hover:bg-white/20"
          >
            <Phone className="size-4 text-sun" />
            <span>{CONTACT.phone}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
