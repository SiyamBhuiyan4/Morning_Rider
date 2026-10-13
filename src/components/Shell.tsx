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
  type LucideIcon,
} from "lucide-react";
import { Link, useLocation } from "../lib/router";
import { useAuthed, useSession } from "../lib/session";
import { Logo, Wordmark, cx } from "./ui";

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
  ],
  rider: [
    { href: "/app", label: "My tasks", icon: ClipboardList },
    { href: "/app/cash", label: "Cash in hand", icon: Banknote },
  ],
};

export function Shell({ children }: { children: ReactNode }) {
  const { me } = useAuthed();
  const { signOut } = useSession();
  const { path } = useLocation();
  const [open, setOpen] = useState(false);
  const items = [...NAV[me.role], { href: "/app/account", label: "Account", icon: UserCircle }];

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3">
      {items.map((it) => {
        const active = path === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={cx(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition",
              active ? "bg-brand text-white shadow-lg shadow-brand/25" : "text-white/70 hover:bg-white/8 hover:text-white",
            )}
          >
            <it.icon className={cx("size-[18px]", active ? "text-white" : "text-white/50 group-hover:text-sun")} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );

  const roleLabel = me.role === "admin" ? "Admin" : me.role === "merchant" ? "Merchant" : "Rider";

  const sidebar = (
    <div className="sunrise flex h-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-6 pt-6">
        <Logo size={44} className="ring-2 ring-white/20" />
        <Wordmark dark />
      </div>
      {me.role === "admin" && (
        <p className="-mt-3 mb-4 px-5 text-[11px] font-bold tracking-[0.2em] text-sun">ADMIN PANEL</p>
      )}
      {nav}
      <div className="m-3 rounded-2xl bg-white/6 p-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-full bg-sun font-bold text-navy-900">
            {(me.businessName ?? me.name).slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{me.businessName ?? me.name}</p>
            <p className="text-xs text-white/50">{roleLabel}</p>
          </div>
          <button
            onClick={() => void signOut()}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-full lg:pl-64">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{sidebar}</aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-navy-50" aria-label="Menu">
          <Menu className="size-6" />
        </button>
        <Logo size={32} />
        <Wordmark />
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <div className="animate-slide-in absolute inset-y-0 left-0 w-72">
            {sidebar}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-white/70 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
