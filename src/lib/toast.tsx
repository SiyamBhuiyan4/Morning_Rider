import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ConvexError } from "convex/values";
import { CheckCircle2, AlertCircle, Undo2 } from "lucide-react";
import { t, translateServer } from "./prefs";

/*
  Messages at the bottom of the screen.

  Undoable actions (Siyam's rule: everything gets an Undo) are NOT sent to
  the server straight away. The message shows "Undo" for UNDO_MS; only when
  that runs out is the action really saved. Pressing Undo simply drops it, so
  nothing ever has to be reversed (no money moved back, no records deleted).
  While an action waits, anything keyed to it can show itself as pending.
*/
export const UNDO_MS = 5000;

type Toast =
  | { id: number; kind: "ok" | "error"; text: string }
  | { id: number; kind: "undo"; text: string; key?: string; until: number };

type Api = {
  push: (kind: "ok" | "error", text: string) => void;
  undoable: (text: string, run: () => Promise<unknown>, key?: string) => void;
  pending: Set<string>;
};
const Ctx = createContext<Api>({ push: () => {}, undoable: () => {}, pending: new Set() });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const [pending, setPending] = useState<Set<string>>(new Set());
  // Actions waiting to be saved, by toast id.
  const waiting = useRef(new Map<number, { run: () => Promise<unknown>; timer: ReturnType<typeof setTimeout>; key?: string }>());

  const remove = useCallback((id: number) => setItems((s) => s.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (kind: "ok" | "error", text: string) => {
      const id = Date.now() + Math.random();
      setItems((s) => [...s, { id, kind, text }]);
      setTimeout(() => remove(id), kind === "error" ? 6000 : 3500);
    },
    [remove],
  );

  const finish = useCallback((id: number) => {
    const w = waiting.current.get(id);
    if (!w) return;
    waiting.current.delete(id);
    clearTimeout(w.timer);
    if (w.key) {
      const key = w.key;
      setPending((p) => {
        const n = new Set(p);
        n.delete(key);
        return n;
      });
    }
    return w;
  }, []);

  const commit = useCallback(
    async (id: number) => {
      const w = finish(id);
      remove(id);
      if (!w) return;
      try {
        await w.run();
      } catch (e) {
        push("error", errorText(e));
      }
    },
    [finish, remove, push],
  );

  const undoable = useCallback(
    (text: string, run: () => Promise<unknown>, key?: string) => {
      const id = Date.now() + Math.random();
      const timer = setTimeout(() => void commit(id), UNDO_MS);
      waiting.current.set(id, { run, timer, key });
      if (key) setPending((p) => new Set(p).add(key));
      setItems((s) => [...s, { id, kind: "undo", text, key, until: Date.now() + UNDO_MS }]);
    },
    [commit],
  );

  const undo = (id: number) => {
    finish(id);
    remove(id);
    push("ok", t("Undone. Nothing was changed."));
  };

  // Leaving the page while something waits: warn, and if they leave anyway, save it now.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (waiting.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const flush = () => {
      for (const id of [...waiting.current.keys()]) void commit(id);
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("pagehide", flush);
    };
  }, [commit]);

  return (
    <Ctx.Provider value={{ push, undoable, pending }}>
      {children}
      <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4">
        {items.map((item) =>
          item.kind === "undo" ? (
            <UndoToast key={item.id} text={item.text} until={item.until} onUndo={() => undo(item.id)} />
          ) : (
            <div
              key={item.id}
              className={`animate-rise pointer-events-auto flex max-w-md items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-[var(--shadow-pop)] ${
                item.kind === "ok" ? "bg-navy-900" : "bg-red-600"
              }`}
            >
              {item.kind === "ok" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sun" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
              {item.text}
            </div>
          ),
        )}
      </div>
    </Ctx.Provider>
  );
}

/** "Marked as Delivered.  [Undo 4]" with a shrinking bar. */
function UndoToast({ text, until, onUndo }: { text: string; until: number; onUndo: () => void }) {
  const [left, setLeft] = useState(() => Math.max(0, until - Date.now()));
  useEffect(() => {
    const id = setInterval(() => setLeft(Math.max(0, until - Date.now())), 200);
    return () => clearInterval(id);
  }, [until]);
  return (
    <div className="animate-rise pointer-events-auto relative flex max-w-md items-center gap-3 overflow-hidden rounded-xl bg-navy-900 py-2.5 pr-2.5 pl-4 text-sm font-medium text-white shadow-[var(--shadow-pop)]">
      <CheckCircle2 className="size-4 shrink-0 text-sun" />
      <span className="flex-1">{text}</span>
      <button
        type="button"
        onClick={onUndo}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/12 px-3 py-1.5 text-[13px] font-bold text-sun transition hover:bg-white/20"
      >
        <Undo2 className="size-3.5" />
        {t("Undo")}
        <span className="grid size-5 place-items-center rounded-full bg-white/15 text-[11px] tabular-nums">{Math.ceil(left / 1000)}</span>
      </button>
      <span
        className="absolute bottom-0 left-0 h-0.5 bg-sun transition-[width] duration-200 ease-linear"
        style={{ width: `${(left / UNDO_MS) * 100}%` }}
      />
    </div>
  );
}

export function useToast() {
  const { push, undoable } = useContext(Ctx);
  return {
    ok: (text: string) => push("ok", text),
    error: (e: unknown) => push("error", errorText(e)),
    /** Shows `text` with Undo for 5 s, then runs `run`. Undo cancels it completely. */
    undoable,
  };
}

/** All keys of undoable actions still waiting (for lists, where one hook per row isn't possible). */
export function usePendingKeys() {
  return useContext(Ctx).pending;
}

/** True while an undoable action with this key is waiting to be saved. */
export function usePending(key: string | undefined) {
  const { pending } = useContext(Ctx);
  return key ? pending.has(key) : false;
}

export function errorText(e: unknown) {
  if (typeof e === "string") return t(e);
  if (e instanceof ConvexError) return translateServer(String(e.data));
  return t("Something went wrong. Please try again.");
}
