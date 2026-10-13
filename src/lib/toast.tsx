import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ConvexError } from "convex/values";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { t, translateServer } from "./prefs";

type Toast = { id: number; kind: "ok" | "error"; text: string };
const Ctx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s, { id, kind, text }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-rise pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-[var(--shadow-pop)] ${
              t.kind === "ok" ? "bg-navy-900" : "bg-red-600"
            }`}
          >
            {t.kind === "ok" ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sun" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const push = useContext(Ctx);
  return {
    ok: (text: string) => push("ok", text),
    error: (e: unknown) => push("error", errorText(e)),
  };
}

export function errorText(e: unknown) {
  if (typeof e === "string") return t(e);
  if (e instanceof ConvexError) return translateServer(String(e.data));
  return t("Something went wrong. Please try again.");
}
