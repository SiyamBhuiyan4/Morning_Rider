import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  Store,
  Bike,
  Wallet,
  Banknote,
  ShieldCheck,
  Settings,
  UserCircle,
  LogOut,
  Menu,
  X,
  Upload,
  ClipboardList,
  BadgeCheck,
  MessageCircle,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FloatingChatButton } from "./Chat";
import { Link, navigate, useLocation } from "../lib/router";
import { useAuthed, useSession } from "../lib/session";
import { Button, Logo, Wordmark, cx } from "./ui";
import { Prefs } from "./Prefs";
import { getLang, t } from "../lib/prefs";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: Record<"admin" | "merchant" | "rider", NavItem[]> = {
  admin: [
    { href: "/app", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/parcels", label: "Parcels", icon: Package },
    { href: "/app/parcels/new", label: "New parcel", icon: PackagePlus },
    { href: "/app/merchants", label: "Merchants", icon: Store },
    { href: "/app/riders", label: "Riders", icon: Bike },
    { href: "/app/payouts", label: "Merchant payouts", icon: Wallet },
    { href: "/app/cash", label: "Rider cash", icon: Banknote },
    { href: "/app/messages", label: "Merchant messages", icon: MessageCircle },
    { href: "/app/rider-messages", label: "Rider messages", icon: MessagesSquare },
    { href: "/app/fraud", label: "Fraud check", icon: ShieldCheck },
    { href: "/app/settings", label: "Delivery rates", icon: Settings },
  ],
  merchant: [
    { href: "/app", label: "Dashboard", icon: LayoutDashboard },
    { href: "/app/parcels/new", label: "Create parcel", icon: PackagePlus },
    { href: "/app/parcels/bulk", label: "Bulk upload", icon: Upload },
    { href: "/app/parcels", label: "My parcels", icon: Package },
    { href: "/app/payments", label: "Payments", icon: Wallet },
    { href: "/app/fraud", label: "Fraud check", icon: ShieldCheck },
    { href: "/app/verify", label: "Business verification", icon: BadgeCheck },
  ],
  rider: [
    { href: "/app", label: "My tasks", icon: ClipboardList },
    { href: "/app/cash", label: "Cash in hand", icon: Banknote },
  ],
};

/** Red dot with a count on the admin's message menu items. */
function UnreadDot({ role }: { role: "merchant" | "rider" }) {
  const { token } = useAuthed();
  const counts = useQuery(api.chat.unreadCount, { token });
  const n = counts?.[role] ?? 0;
  if (!n) return null;
  return (
    <span className="relative ml-auto flex size-5">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-60" />
      <span className="relative grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">{n > 9 ? "9+" : n}</span>
    </span>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { me } = useAuthed();
  const { signOut } = useSession();
  const { path } = useLocation();
  const [open, setOpen] = useState(false);
  const items = [...NAV[me.role], { href: "/app/account", label: "Account", icon: UserCircle }];

  const adminSections = [
    {
      title: t("Overview"),
      items: [
        { href: "/app", label: "Dashboard", icon: LayoutDashboard },
        { href: "/app/parcels", label: "Parcels", icon: Package },
        { href: "/app/parcels/new", label: "New parcel", icon: PackagePlus },
      ],
    },
    {
      title: t("Operations & People"),
      items: [
        { href: "/app/merchants", label: "Merchants", icon: Store },
        { href: "/app/riders", label: "Riders", icon: Bike },
        { href: "/app/messages", label: "Merchant messages", icon: MessageCircle },
        { href: "/app/rider-messages", label: "Rider messages", icon: MessagesSquare },
      ],
    },
    {
      title: t("Finance & Rates"),
      items: [
        { href: "/app/payouts", label: "Merchant payouts", icon: Wallet },
        { href: "/app/cash", label: "Rider cash", icon: Banknote },
        { href: "/app/fraud", label: "Fraud check", icon: ShieldCheck },
        { href: "/app/settings", label: "Delivery rates", icon: Settings },
      ],
    },
    {
      title: t("Account"),
      items: [{ href: "/app/account", label: "Account", icon: UserCircle }],
    },
  ];

  const nav = me.role === "admin" ? (
    <nav className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-3">
      {adminSections.map((sec) => (
        <div key={sec.title} className="space-y-0.5">
          <p className="px-3 pb-1 text-[10px] font-bold tracking-wider text-white/40 uppercase">
            {sec.title}
          </p>
          {sec.items.map((it) => {
            const active = path === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={cx(
                  "group flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition-all duration-150",
                  active
                    ? "bg-brand text-white shadow-md shadow-brand/30"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                <it.icon
                  className={cx(
                    "size-[17px] transition-colors duration-150",
                    active ? "text-white" : "text-white/50 group-hover:text-sun",
                  )}
                />
                <span className="flex-1">{t(it.label)}</span>
                {it.href === "/app/messages" && <UnreadDot role="merchant" />}
                {it.href === "/app/rider-messages" && <UnreadDot role="rider" />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  ) : (
    <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-3">
      {items.map((it) => {
        const active = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={cx(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-all duration-150",
              active
                ? "bg-brand text-white shadow-lg shadow-brand/30"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            <it.icon
              className={cx(
                "size-[18px] transition-colors duration-150",
                active ? "text-white" : "text-white/45 group-hover:text-sun",
              )}
            />
            {t(it.label)}
            {it.href === "/app/messages" && <UnreadDot role="merchant" />}
            {it.href === "/app/rider-messages" && <UnreadDot role="rider" />}
          </Link>
        );
      })}
    </nav>
  );

  const roleLabel = me.role === "admin" ? t("Admin") : me.role === "merchant" ? t("Merchant") : t("Rider");

  const sidebar = (
    <div className="sunrise flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <Logo size={44} className="ring-2 ring-white/20 shadow-lg" />
        <Wordmark dark />
      </div>
      {me.role === "admin" && (
        <p className={cx("-mt-2 mb-4 px-5 text-[11px] font-bold text-sun/80", getLang() !== "bn" && "tracking-[0.2em]")}>{t("ADMIN PANEL")}</p>
      )}
      {nav}
      <Prefs onDark className="mx-5 mt-4" />
      <div className="m-3 rounded-2xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sun to-brand font-bold text-navy-900 shadow-sm">
              {(me.businessName ?? me.name).slice(0, 1).toUpperCase()}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-navy-900 bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{me.businessName ?? me.name}</p>
            <p className="text-xs text-sun/80 font-medium">{roleLabel}</p>
          </div>
          <button
            onClick={() => void signOut()}
            className="rounded-lg p-2 text-white/50 transition hover:bg-white/15 hover:text-white cursor-pointer"
            title={t("Sign out")}
            aria-label={t("Sign out")}
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  const currentNav = items.find((it) => it.href === path) ?? items.find((it) => path.startsWith(it.href) && it.href !== "/app");
  const currentPage = currentNav ? t(currentNav.label) : undefined;

  return (
    <div className="min-h-full lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Desktop top bar */}
      <header className="no-print sticky top-0 z-20 hidden items-center justify-between border-b border-line bg-surface/80 px-8 py-3.5 backdrop-blur-md lg:flex">
        <div className="flex items-center gap-2.5 text-sm">
          <span className="font-bold text-ink">Morning Rider</span>
          <span className="text-ink-3">/</span>
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-bold text-brand-700">
            {roleLabel}
          </span>
          {currentPage && (
            <>
              <span className="text-ink-3">/</span>
              <span className="font-semibold text-ink-2">{currentPage}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {me.role === "admin" && (
            <div className="flex items-center gap-2.5">
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 xl:inline-flex">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {t("System Live")}
              </span>
              <Button size="sm" icon={PackagePlus} onClick={() => navigate("/app/parcels/new")}>
                {t("New parcel")}
              </Button>
            </div>
          )}
          {me.role === "merchant" && (
            <Button size="sm" icon={PackagePlus} onClick={() => navigate("/app/parcels/new")}>
              {t("New parcel")}
            </Button>
          )}
          <Prefs />
          <div className="flex items-center gap-2.5 border-l border-line pl-3">
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sun to-brand text-xs font-bold text-navy-900 shadow-sm">
              {(me.businessName ?? me.name).slice(0, 1).toUpperCase()}
            </div>
            <span className="max-w-40 truncate text-xs font-semibold text-ink">
              {me.businessName ?? me.name}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-navy-50" aria-label={t("Menu")}>
          <Menu className="size-6" />
        </button>
        <Logo size={32} />
        <Wordmark />
        <Prefs className="ml-auto" />
        <FloatingChatButton className="relative" />
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <div className="animate-slide-in absolute inset-y-0 left-0 w-72">
            {sidebar}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10"
              aria-label={t("Close menu")}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <FloatingChatButton className="fixed bottom-6 right-6 z-40 hidden lg:block" />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
