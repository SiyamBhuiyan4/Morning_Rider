import {
  useEffect,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { Loader2, X, type LucideIcon } from "lucide-react";
import { STATUS, type Status } from "../lib/format";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: LucideIcon;
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  icon: Icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-[15px]",
        variant === "primary" && "bg-brand text-white shadow-sm shadow-brand/30 hover:bg-brand-600",
        variant === "dark" && "bg-navy-900 text-white hover:bg-navy-800",
        variant === "outline" && "border border-line bg-surface text-ink hover:border-navy-100 hover:bg-navy-50",
        variant === "ghost" && "text-ink-2 hover:bg-navy-50 hover:text-ink",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : Icon ? <Icon className="size-4" /> : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

const control =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-3 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 disabled:bg-page";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(control, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(control, "min-h-20 py-2.5", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(control, "h-11 cursor-pointer pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const s = STATUS[status];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        s.tone,
        className,
      )}
    >
      <span className={cx("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function Badge({ tone = "slate", children }: { tone?: "slate" | "green" | "amber" | "red" | "brand"; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "slate" && "bg-slate-100 text-slate-700",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "brand" && "bg-brand-50 text-brand-700",
      )}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "navy",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  accent?: "navy" | "brand" | "sun" | "green" | "red";
  hint?: ReactNode;
}) {
  return (
    <Card className="animate-rise p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-3">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold tracking-tight text-ink">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
        </div>
        <div
          className={cx(
            "grid size-11 shrink-0 place-items-center rounded-xl",
            accent === "navy" && "bg-navy-50 text-navy-700",
            accent === "brand" && "bg-brand-50 text-brand",
            accent === "sun" && "bg-sun-100 text-amber-600",
            accent === "green" && "bg-emerald-50 text-emerald-600",
            accent === "red" && "bg-red-50 text-red-600",
          )}
        >
          <Icon className="size-5" />
        </div>
      </div>
    </Card>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/50 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
        className={cx(
          "animate-rise flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface shadow-[var(--shadow-pop)] sm:rounded-3xl",
          wide ? "sm:max-w-3xl" : "sm:max-w-lg",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-navy-50 hover:text-ink" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: LucideIcon; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand">
        <Icon className="size-7" />
      </div>
      <p className="mt-4 font-bold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-2">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cx("flex justify-center py-16", className)}>
      <Loader2 className="size-6 animate-spin text-brand" />
    </div>
  );
}

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/brand/logo-192.png"
      alt="Morning Rider"
      width={size}
      height={size}
      className={cx("shrink-0 rounded-full bg-white", className)}
    />
  );
}

export function Wordmark({ dark }: { dark?: boolean }) {
  return (
    <div className="leading-none">
      <div className={cx("text-[17px] font-extrabold italic tracking-tight", dark ? "text-white" : "text-navy-900")}>
        MORNING <span className="text-brand">RIDER</span>
      </div>
      <div className={cx("mt-1 text-[10px] font-semibold tracking-[0.2em]", dark ? "text-white/60" : "text-ink-3")}>
        COURIER SERVICE
      </div>
    </div>
  );
}
