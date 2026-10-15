import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Bike,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageCircle,
  Search,
  Send,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { date, num } from "../lib/format";
import { getLang, t } from "../lib/prefs";
import { Logo, cx } from "./ui";
import { ago, useNow } from "./Live";

type Msg = { _id: string; from: "admin" | "user"; body: string; createdAt: number };

const wordsIn = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const time = (ms: number) =>
  new Date(ms).toLocaleTimeString(getLang() === "bn" ? "bn-BD" : "en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

/** The conversation itself: bubbles grouped by day, a "Seen" tick on the last message they've read. */
export function ChatMessages({
  messages,
  me,
  seenAt,
  empty,
  onDelete,
}: {
  messages: Msg[];
  me: "admin" | "user";
  seenAt: number | null;
  empty: string;
  onDelete?: (messageId: string) => Promise<unknown> | void;
}) {
  const toast = useToast();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
    <div className="space-y-2">
      {messages.map((m) => {
        const day = date(m.createdAt);
        const showDay = day !== lastDay;
        lastDay = day;
        const mine = m.from === me;
        const seen = mine && m._id === lastMine?._id && seenAt !== null && seenAt >= m.createdAt;
        return (
          <div key={m._id} className="group/bubble animate-bubble-rise">
            {showDay && (
              <p className="my-3 text-center text-[11px] font-semibold text-ink-3">
                <span className="rounded-full bg-page px-3 py-1 shadow-xs ring-1 ring-line/50">{day}</span>
              </p>
            )}
            <div className={cx("flex items-center gap-1.5", mine ? "justify-end" : "justify-start")}>
              {mine && onDelete && confirmDeleteId !== m._id && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(m._id)}
                  disabled={deletingId === m._id}
                  title={t("Unsend message")}
                  aria-label={t("Unsend message")}
                  className="rounded-lg p-1 text-ink-3 opacity-70 transition-opacity hover:bg-page hover:text-red-500 focus:opacity-100 cursor-pointer sm:opacity-0 sm:group-hover/bubble:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
              <div
                className={cx(
                  "max-w-[84%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm transition-all",
                  mine
                    ? "rounded-br-sm bg-gradient-to-br from-brand to-brand-600 text-white shadow-brand/20"
                    : "rounded-bl-sm bg-surface text-ink ring-1 ring-line shadow-xs",
                )}
              >
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
                <p className={cx("mt-0.5 text-right text-[10px]", mine ? "text-white/80" : "text-ink-3")}>{time(m.createdAt)}</p>
              </div>
              {!mine && onDelete && confirmDeleteId !== m._id && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(m._id)}
                  disabled={deletingId === m._id}
                  title={t("Unsend message")}
                  aria-label={t("Unsend message")}
                  className="rounded-lg p-1 text-ink-3 opacity-70 transition-opacity hover:bg-page hover:text-red-500 focus:opacity-100 cursor-pointer sm:opacity-0 sm:group-hover/bubble:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
            {confirmDeleteId === m._id && (
              <div className={cx("mt-1.5 flex items-center gap-2 text-xs", mine ? "justify-end" : "justify-start")}>
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-surface px-2.5 py-1.5 shadow-sm text-ink dark:border-red-900/40">
                  <span className="text-[11px] font-medium text-red-600 dark:text-red-400">
                    {t("Delete for everyone?")}
                  </span>
                  <button
                    type="button"
                    disabled={deletingId === m._id}
                    onClick={async () => {
                      try {
                        setDeletingId(m._id);
                        await onDelete?.(m._id);
                        setConfirmDeleteId(null);
                      } catch (e) {
                        toast.error(e);
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    className="rounded-lg bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-red-700 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === m._id ? (
                      <span className="inline-block size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      t("Yes, delete")
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-lg p-0.5 text-ink-3 hover:bg-page hover:text-ink transition cursor-pointer"
                    aria-label={t("Cancel")}
                    title={t("Cancel")}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            )}
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
          rows={Math.min(4, Math.max(1, text.split("\n").length))}
          placeholder={t("Write a message…")}
          className="max-h-28 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-page px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!text.trim() || over || busy}
          aria-label={t("Send")}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white shadow-md shadow-brand/30 transition hover:bg-brand-600 hover:scale-105 active:scale-95 disabled:opacity-40 cursor-pointer"
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
 * A merchant's or rider's chat with the office: a round button that always
 * sits at the bottom right, with a red dot when the office has written something new.
 */
export function OfficeChatButton({ className }: { className?: string }) {
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
        className="relative grid size-10 place-items-center rounded-full bg-gradient-to-tr from-brand-600 to-brand text-white shadow-lg shadow-brand/40 transition hover:scale-105 active:scale-95 hover:shadow-brand/60 cursor-pointer lg:size-12"
      >
        {open ? <X className="size-5 transition-transform duration-200" /> : <MessageCircle className="size-5" />}
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
        <div className="animate-chat-rise fixed inset-x-3 bottom-20 z-50 flex h-[min(35rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-pop)] lg:absolute lg:inset-x-auto lg:bottom-16 lg:right-0 lg:w-[25rem]">
          <div className="sunrise flex items-center gap-3 px-4 py-3.5 text-white">
            <Logo size={36} className="ring-2 ring-white/20" />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{t("Morning Rider office")}</p>
              <p className="text-xs text-white/70">{t("We usually reply within a few hours")}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 cursor-pointer" aria-label={t("Close")}>
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
            {data ? (
              <ChatMessages
                messages={data.messages}
                me="user"
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

/**
 * Admin floating chat launcher: opens a smooth drawer with merchant and rider inboxes,
 * live unread badges, and direct reply capability.
 */
export function AdminChatButton({ className }: { className?: string }) {
  const { token } = useAuthed();
  const unreadCounts = useQuery(api.chat.unreadCount, { token });
  const [open, setOpen] = useState(false);
  const [roleTab, setRoleTab] = useState<"merchant" | "rider">("merchant");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);

  const totalUnread = (unreadCounts?.merchant ?? 0) + (unreadCounts?.rider ?? 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (selectedUserId) setSelectedUserId(null);
        else setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, selectedUserId]);

  return (
    <div className={cx("no-print", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          if (open) setSelectedUserId(null);
        }}
        aria-label={t("Quick Messages")}
        title={t("Quick Messages")}
        className="relative grid size-10 place-items-center rounded-full bg-gradient-to-tr from-brand-600 to-brand text-white shadow-lg shadow-brand/40 transition hover:scale-105 active:scale-95 hover:shadow-brand/60 cursor-pointer lg:size-12"
      >
        {open ? <X className="size-5 transition-transform duration-200" /> : <MessageCircle className="size-5" />}
        {totalUnread > 0 && !open && (
          <span className="absolute -top-0.5 -right-0.5 flex size-5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-surface">
              {num(Math.min(totalUnread, 99))}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="animate-chat-rise fixed inset-x-3 bottom-20 z-50 flex h-[min(36rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow-pop)] lg:absolute lg:inset-x-auto lg:bottom-16 lg:right-0 lg:w-[26rem]">
          {selectedUserId ? (
            <AdminChatThreadView
              token={token}
              userId={selectedUserId}
              onBack={() => setSelectedUserId(null)}
              onClose={() => setOpen(false)}
            />
          ) : (
            <AdminChatListView
              token={token}
              roleTab={roleTab}
              setRoleTab={setRoleTab}
              unreadCounts={unreadCounts}
              onSelectUser={(id) => setSelectedUserId(id)}
              onClose={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function AdminChatThreadView({
  token,
  userId,
  onBack,
  onClose,
}: {
  token: string;
  userId: Id<"users">;
  onBack: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const data = useQuery(api.chat.conversation, { token, userId });
  const adminSend = useMutation(api.chat.adminSend);
  const adminMarkSeen = useMutation(api.chat.adminMarkSeen);
  const deleteMsg = useMutation(api.chat.deleteMessage);

  useEffect(() => {
    if (data && data.unread > 0) {
      void adminMarkSeen({ token, userId });
    }
  }, [data, adminMarkSeen, token, userId]);

  return (
    <div className="flex h-full flex-col">
      <div className="sunrise flex items-center gap-2.5 px-4 py-3 text-white">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
          title={t("Back to list")}
          aria-label={t("Back to list")}
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold text-sm leading-tight text-white">{data?.user.name ?? "…"}</p>
          <p className="text-[11px] text-white/70">
            {data?.user.phone} · {data?.user.role === "merchant" ? t("Merchant") : t("Rider")}
          </p>
        </div>
        <a
          href={data?.user.role === "merchant" ? `/app/messages?merchant=${userId}` : `/app/rider-messages?rider=${userId}`}
          className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
          title={t("Open in full page")}
          aria-label={t("Open in full page")}
        >
          <ExternalLink className="size-4" />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
          aria-label={t("Close")}
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
        {data ? (
          <ChatMessages
            messages={data.messages}
            me="admin"
            seenAt={data.userSeenAt}
            empty={t("No messages yet. Say hello to {name}.", { name: data.user.name })}
            onDelete={async (id) => {
              await deleteMsg({ token, messageId: id as Id<"chatMessages"> });
              toast.ok(t("Message deleted for everyone"));
            }}
          />
        ) : (
          <div className="m-auto size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        )}
      </div>

      {data && (
        <ChatComposer
          maxWords={data.maxWords}
          onSend={(body) => adminSend({ token, userId, body })}
          footer={t("Your reply gives them {n} messages again", { n: data.limit })}
        />
      )}
    </div>
  );
}

function AdminChatListView({
  token,
  roleTab,
  setRoleTab,
  unreadCounts,
  onSelectUser,
  onClose,
}: {
  token: string;
  roleTab: "merchant" | "rider";
  setRoleTab: (r: "merchant" | "rider") => void;
  unreadCounts: { merchant: number; rider: number } | undefined;
  onSelectUser: (id: Id<"users">) => void;
  onClose: () => void;
}) {
  const threads = useQuery(api.chat.threads, { token, role: roleTab });
  const [filter, setFilter] = useState("");
  const now = useNow(30_000);

  const shown = (threads ?? []).filter((th) => {
    const q = filter.trim().toLowerCase();
    return !q || th.name.toLowerCase().includes(q) || th.phone.includes(q);
  });

  return (
    <div className="flex h-full flex-col">
      <div className="sunrise px-4 pt-3.5 pb-3 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={28} className="ring-1 ring-white/20" />
            <div>
              <p className="font-bold text-sm leading-tight text-white">{t("Quick Messages")}</p>
              <p className="text-[11px] text-white/70">{t("Chat with merchants and riders")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label={t("Close")}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-3 flex rounded-xl bg-white/10 p-1">
          <button
            type="button"
            onClick={() => setRoleTab("merchant")}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer",
              roleTab === "merchant" ? "bg-white text-navy-900 shadow-sm" : "text-white/80 hover:text-white",
            )}
          >
            <Store className="size-3.5" />
            <span>{t("Merchants")}</span>
            {(unreadCounts?.merchant ?? 0) > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {num(unreadCounts!.merchant)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setRoleTab("rider")}
            className={cx(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition cursor-pointer",
              roleTab === "rider" ? "bg-white text-navy-900 shadow-sm" : "text-white/80 hover:text-white",
            )}
          >
            <Bike className="size-3.5" />
            <span>{t("Riders")}</span>
            {(unreadCounts?.rider ?? 0) > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {num(unreadCounts!.rider)}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="border-b border-line p-2.5">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-3" />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={roleTab === "merchant" ? t("Search merchants…") : t("Search riders…")}
            className="w-full rounded-xl border border-line bg-page py-1.5 pr-3 pl-8 text-xs text-ink placeholder:text-ink-3 outline-none focus:border-brand"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!threads ? (
          <div className="flex h-40 items-center justify-center">
            <div className="size-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : shown.length === 0 ? (
          <div className="p-8 text-center text-xs text-ink-3">{t("No conversations yet.")}</div>
        ) : (
          <div className="divide-y divide-line">
            {shown.map((th) => (
              <button
                key={th.userId}
                type="button"
                onClick={() => onSelectUser(th.userId)}
                className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left transition hover:bg-page cursor-pointer"
              >
                <div className="relative grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-100 to-brand-50 text-xs font-bold text-brand">
                  {th.name.slice(0, 1).toUpperCase()}
                  {th.unread > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-red-500 ring-2 ring-surface" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className={cx("truncate text-xs", th.unread > 0 ? "font-bold text-ink" : "font-semibold text-ink-2")}>
                      {th.name}
                    </p>
                    <span className="shrink-0 text-[10px] text-ink-3 tabular-nums">{ago(th.lastMessageAt, now)}</span>
                  </div>
                  <p className={cx("truncate text-[11px]", th.unread > 0 ? "font-semibold text-ink" : "text-ink-3")}>
                    {th.lastBody || t("No message content")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-line bg-page/70 p-2 text-center">
        <a
          href={roleTab === "merchant" ? "/app/messages" : "/app/rider-messages"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:text-brand-600"
        >
          <span>{t("Open full inbox")}</span>
          <ChevronRight className="size-3.5" />
        </a>
      </div>
    </div>
  );
}

/** Universal floating chat button for all roles. */
export function FloatingChatButton({ className }: { className?: string }) {
  const { me } = useAuthed();
  if (me.role === "admin") {
    return <AdminChatButton className={className} />;
  }
  return <OfficeChatButton className={className} />;
}

