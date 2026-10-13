import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCheck, MessageCircle, Send, X } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { date, num } from "../lib/format";
import { getLang, t } from "../lib/prefs";
import { Logo, cx } from "./ui";

type Msg = { _id: string; from: "admin" | "merchant"; body: string; createdAt: number };

const wordsIn = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const time = (ms: number) =>
  new Date(ms).toLocaleTimeString(getLang() === "bn" ? "bn-BD" : "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

/** The conversation itself: bubbles grouped by day, a "Seen" tick on the last message they've read. */
export function ChatMessages({
  messages,
  me,
  seenAt,
  empty,
}: {
  messages: Msg[];
  me: "admin" | "merchant";
  seenAt: number | null;
  empty: string;
}) {
  const end = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  if (messages.length === 0) {
    return <p className="m-auto max-w-60 py-10 text-center text-sm text-ink-3">{empty}</p>;
  }
  const lastMine = [...messages].reverse().find((m) => m.from === me);
  let lastDay = "";
  return (
    <div className="space-y-1.5">
      {messages.map((m) => {
        const day = date(m.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        const mine = m.from === me;
        const seen = mine && m._id === lastMine?._id && seenAt !== null && seenAt >= m.createdAt;
        return (
          <div key={m._id} className="animate-rise">
            {showDay && (
              <p className="my-3 text-center text-[11px] font-semibold text-ink-3">
                <span className="rounded-full bg-page px-3 py-1">{day}</span>
              </p>
            )}
            <div className={cx("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cx(
                  "max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
                  mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-page text-ink ring-1 ring-line",
                )}
              >
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
                <p className={cx("mt-0.5 text-right text-[10px]", mine ? "text-white/75" : "text-ink-3")}>{time(m.createdAt)}</p>
              </div>
            </div>
            {seen && (
              <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] font-semibold text-emerald-500">
                <CheckCheck className="size-3" /> {t("Seen")}
              </p>
            )}
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

/** Text box with word counter. Enter sends, Shift+Enter makes a new line. */
export function ChatComposer({
  onSend,
  maxWords,
  disabledReason,
  footer,
}: {
  onSend: (body: string) => Promise<unknown>;
  maxWords: number;
  disabledReason?: string;
  footer?: ReactNode;
}) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const words = wordsIn(text);
  const over = words > maxWords;

  const send = async () => {
    if (!text.trim() || over || busy || disabledReason) return;
    setBusy(true);
    try {
      await onSend(text);
      setText("");
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  if (disabledReason) {
    return <div className="border-t border-line bg-amber-500/10 px-4 py-3 text-center text-sm font-medium text-amber-700 dark:text-amber-300">{disabledReason}</div>;
  }
  return (
    <div className="border-t border-line bg-surface p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={Math.min(5, Math.max(1, text.split("\n").length))}
          placeholder={t("Write a message…")}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-page px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!text.trim() || over || busy}
          aria-label={t("Send")}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-md shadow-brand/30 transition hover:bg-brand-600 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between gap-2 px-1 text-[11px] text-ink-3">
        <span>{footer}</span>
        <span className={cx("tabular-nums", over && "font-bold text-red-500")}>
          {t("{n}/{max} words", { n: words, max: maxWords })}
        </span>
      </div>
    </div>
  );
}

/**
 * The merchant's chat with the office: a round button that always sits at the
 * top right, with a red dot when the office has written something new.
 */
export function MerchantChatButton({ className }: { className?: string }) {
  const { token } = useAuthed();
  const data = useQuery(api.chat.mine, { token });
  const send = useMutation(api.chat.send);
  const markSeen = useMutation(api.chat.markSeen);
  const [open, setOpen] = useState(false);

  // While the panel is open, anything new from the office counts as read.
  useEffect(() => {
    if (open && data && data.unread > 0) void markSeen({ token });
  }, [open, data, markSeen, token]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const unread = data?.unread ?? 0;
  return (
    <div className={cx("no-print", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("Message Morning Rider")}
        title={t("Message Morning Rider")}
        className="relative grid size-10 place-items-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 transition hover:scale-105 hover:bg-brand-600 lg:size-12"
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        {unread > 0 && !open && (
          <span className="absolute -top-0.5 -right-0.5 flex size-5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-surface">
              {num(Math.min(unread, 9))}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="animate-rise fixed inset-x-3 top-16 z-50 flex h-[min(34rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-pop)] lg:absolute lg:inset-x-auto lg:top-14 lg:right-0 lg:w-[23rem]">
          <div className="sunrise flex items-center gap-3 px-4 py-3.5 text-white">
            <Logo size={36} className="ring-2 ring-white/20" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{t("Morning Rider office")}</p>
              <p className="text-xs text-white/70">{t("We usually reply within a few hours")}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10" aria-label={t("Close")}>
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
            {data ? (
              <ChatMessages
                messages={data.messages}
                me="merchant"
                seenAt={data.officeSeenAt}
                empty={t("Ask us anything about pickups, deliveries or payments.")}
              />
            ) : (
              <div className="m-auto size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
            )}
          </div>
          {data && (
            <ChatComposer
              maxWords={data.maxWords}
              onSend={(body) => send({ token, body })}
              disabledReason={
                data.left <= 0 ? t("You've sent {n} messages. You can write again when Morning Rider replies.", { n: data.limit }) : undefined
              }
              footer={t("{left} of {limit} messages left until we reply", { left: data.left, limit: data.limit })}
            />
          )}
        </div>
      )}
    </div>
  );
}
