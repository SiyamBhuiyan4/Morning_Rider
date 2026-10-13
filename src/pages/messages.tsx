import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, CheckCheck, MessageCircle, Phone, Plus, RotateCcw, Search } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { num } from "../lib/format";
import { t } from "../lib/prefs";
import { Badge, Button, Card, Empty, Input, PageHeader, Select, Spinner, cx } from "../components/ui";
import { ChatComposer, ChatMessages } from "../components/Chat";
import { ago, useNow } from "../components/Live";

/**
 * Admin inbox for one group (merchants or riders): conversations on the left,
 * the open one on the right.
 */
export function Messages({ role }: { role: "merchant" | "rider" }) {
  const { token } = useAuthed();
  const threads = useQuery(api.chat.threads, { token, role });
  const people = useQuery(api.users.options, { token, role });
  const [current, setCurrent] = useState<Id<"users"> | null>(
    () => (new URLSearchParams(location.search).get(role) as Id<"users"> | null) ?? null,
  );
  const riders = role === "rider";
  const [filter, setFilter] = useState("");
  const [starting, setStarting] = useState(false);
  const now = useNow(30_000);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (threads ?? []).filter((th) => !q || th.name.toLowerCase().includes(q) || th.phone.includes(q) || th.owner.toLowerCase().includes(q));
  }, [threads, filter]);
  const unreadTotal = (threads ?? []).reduce((s, th) => s + (th.unread > 0 ? 1 : 0), 0);

  return (
    <>
      <PageHeader
        title={riders ? t("Rider messages") : t("Merchant messages")}
        subtitle={
          unreadTotal > 0
            ? t("{n} conversation(s) waiting for your reply", { n: unreadTotal })
            : riders
              ? t("Chat with your riders.")
              : t("Chat with your merchants.")
        }
      />
      <Card className="grid h-[calc(100vh-11rem)] min-h-[30rem] overflow-hidden lg:grid-cols-[20rem_1fr]">
        {/* list */}
        <div className={cx("flex min-h-0 flex-col border-line lg:border-r", current && "hidden lg:flex")}>
          <div className="space-y-2 border-b border-line p-3">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
              <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder={riders ? t("Search riders…") : t("Search merchants…")} className="h-10 pl-9" />
            </div>
            {starting ? (
              <Select
                autoFocus
                value=""
                onChange={(e) => {
                  if (e.target.value) setCurrent(e.target.value as Id<"users">);
                  setStarting(false);
                }}
                onBlur={() => setStarting(false)}
                className="h-10"
              >
                <option value="">{riders ? t("Choose a rider…") : t("Choose a merchant…")}</option>
                {people?.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            ) : (
              <Button size="sm" variant="outline" icon={Plus} className="w-full" onClick={() => setStarting(true)}>
                {t("New message")}
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {!threads ? (
              <Spinner />
            ) : shown.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-3">{t("No conversations yet.")}</p>
            ) : (
              shown.map((th) => (
                <button
                  key={th.userId}
                  type="button"
                  onClick={() => setCurrent(th.userId)}
                  className={cx(
                    "flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition hover:bg-page",
                    current === th.userId && "bg-brand/8",
                  )}
                >
                  <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand">
                    {th.name.slice(0, 1).toUpperCase()}
                    {th.unread > 0 && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-red-500 ring-2 ring-surface" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cx("truncate text-sm", th.unread > 0 ? "font-extrabold text-ink" : "font-semibold text-ink")}>{th.name}</span>
                      <span className="shrink-0 text-[10px] text-ink-3">{ago(th.lastMessageAt, now)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={cx("truncate text-xs", th.unread > 0 ? "font-semibold text-ink-2" : "text-ink-3")}>
                        {th.lastFrom === "admin" && <span className="text-ink-3">{t("You")}: </span>}
                        {th.lastBody}
                      </span>
                      {th.unread > 0 && (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {num(th.unread)}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* conversation */}
        <div className={cx("min-h-0 flex-col", current ? "flex" : "hidden lg:flex")}>
          {current ? (
            <Conversation key={current} userId={current} onBack={() => setCurrent(null)} />
          ) : (
            <Empty
              icon={MessageCircle}
              title={t("Pick a conversation")}
              text={riders ? t("Riders' messages show up here the moment they're sent.") : t("Merchants' messages show up here the moment they're sent.")}
            />
          )}
        </div>
      </Card>
    </>
  );
}

function Conversation({ userId, onBack }: { userId: Id<"users">; onBack: () => void }) {
  const { token } = useAuthed();
  const toast = useToast();
  const data = useQuery(api.chat.conversation, { token, userId });
  const send = useMutation(api.chat.adminSend);
  const markSeen = useMutation(api.chat.adminMarkSeen);
  const reset = useMutation(api.chat.resetLimit);

  // Opening the conversation marks the merchant's messages as seen (red dot goes away).
  useEffect(() => {
    if (data && data.unread > 0) void markSeen({ token, userId });
  }, [data, markSeen, token, userId]);

  if (data === undefined) return <Spinner />;
  if (data === null) return <p className="p-6 text-sm text-ink-3">{t("Not found.")}</p>;
  const used = data.userSent;
  const who = data.user;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button type="button" onClick={onBack} className="rounded-lg p-1.5 text-ink-3 hover:bg-page lg:hidden" aria-label={t("Back")}>
          <ArrowLeft className="size-5" />
        </button>
        <span className="grid size-10 place-items-center rounded-full bg-brand-50 font-bold text-brand">{who.name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{who.name}</p>
          <p className="text-xs text-ink-3">
            {who.owner} · {who.phone}
          </p>
        </div>
        <a href={`tel:${who.phone}`} className="rounded-xl p-2 text-ink-3 hover:bg-page hover:text-ink" title={t("Call")} aria-label={t("Call")}>
          <Phone className="size-5" />
        </a>
      </div>

      {used > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-amber-500/10 px-4 py-2 text-xs">
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            {used >= data.limit
              ? t("{name} has used all {limit} messages and is waiting for you.", { name: who.name, limit: data.limit })
              : t("{name} has sent {n} of {limit} messages.", { name: who.name, n: used, limit: data.limit })}
          </span>
          <Button
            size="sm"
            variant="outline"
            icon={RotateCcw}
            onClick={async () => {
              try {
                await reset({ token, userId });
                toast.ok(t("Seen. They can send {n} more messages.", { n: data.limit }));
              } catch (e) {
                toast.error(e);
              }
            }}
          >
            {t("Seen, allow {n} more", { n: data.limit })}
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
        <ChatMessages
          messages={data.messages}
          me="admin"
          seenAt={data.userSeenAt}
          empty={t("No messages yet. Say hello to {name}.", { name: who.name })}
        />
      </div>
      <ChatComposer
        maxWords={data.maxWords}
        onSend={(body) => send({ token, userId, body })}
        footer={
          <span className="inline-flex items-center gap-1">
            <CheckCheck className="size-3" /> {t("Your reply gives them {n} messages again", { n: data.limit })}
          </span>
        }
      />
      {who.status !== "active" && (
        <p className="border-t border-line px-4 py-1.5 text-center text-[11px] text-ink-3">
          <Badge tone="amber">{who.status === "pending" ? t("Waiting approval") : t("Suspended")}</Badge>
        </p>
      )}
    </>
  );
}
