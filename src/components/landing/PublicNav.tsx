import { useState, useEffect } from "react";
import { Link, navigate } from "../../lib/router";
import { Button, Logo, Wordmark, cx } from "../ui";
import { Prefs } from "../Prefs";
import { t } from "../../lib/prefs";
import { CONTACT } from "../../lib/contact";
import { Menu, Phone, X } from "lucide-react";

export function PublicNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/#services", label: t("Services") },
    { href: "/#rates", label: t("Rates") },
    { href: "/#coverage", label: t("Coverage") },
    { href: "/#how-it-works", label: t("How it works") },
    { href: "/#business", label: t("Business") },
    { href: "/#risk-check", label: t("Risk check") },
    { href: "/#faq", label: t("FAQ") },
  ];

  return (
    <header
      className={cx(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "bg-navy-950/90 shadow-xl backdrop-blur-md border-b border-white/10 py-3"
          : "bg-transparent py-4 sm:py-5"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <Logo size={42} className="ring-2 ring-white/20 shadow-md" />
          <Wordmark dark />
        </Link>

        {/* Desktop Links */}
        <nav className="hidden items-center gap-1 xl:gap-2 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-xl px-2.5 py-1.5 text-[13px] xl:text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <a
            href={`tel:${CONTACT.phone}`}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/15"
          >
            <Phone className="size-3.5 text-brand" />
            <span>{CONTACT.phone}</span>
          </a>

          <Prefs onDark />

          <Button
            size="sm"
            variant="outline"
            className="border-white/20 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            onClick={() => navigate("/login")}
          >
            {t("Sign in")}
          </Button>

          <Button
            size="sm"
            onClick={() => navigate("/register")}
            className="shadow-glow"
          >
            {t("Become a merchant")}
          </Button>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <Prefs onDark />
          <Button
            size="sm"
            variant="primary"
            onClick={() => navigate("/register")}
            className="text-xs px-2.5 py-1 min-h-7"
          >
            {t("Register")}
          </Button>
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="grid size-9 place-items-center rounded-xl bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
            aria-label={t("Menu")}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="animate-rise absolute inset-x-4 top-16 z-50 rounded-3xl border border-white/15 bg-navy-950/95 p-5 shadow-2xl backdrop-blur-2xl lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div className="my-2 border-t border-white/10" />
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full justify-center border-white/20 bg-white/5 text-white hover:bg-white/15"
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/login");
                }}
              >
                {t("Sign in")}
              </Button>
              <Button
                className="w-full justify-center"
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/register");
                }}
              >
                {t("Become a merchant")}
              </Button>
              <a
                href={`tel:${CONTACT.phone}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-brand/20 py-2.5 text-xs font-bold text-brand transition hover:bg-brand/30"
              >
                <Phone className="size-3.5" /> {t("Hotline")}: {CONTACT.phone}
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
