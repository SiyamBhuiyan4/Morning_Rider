import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, KeyRound, Loader2, Mail, XCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { generatePassword } from "../lib/password";
import { t } from "../lib/prefs";
import { Button, Field, Input, Modal } from "./ui";

export type Person = { _id: Id<"users">; name: string; phone: string; role: "merchant" | "rider" };
export type GivenLogin = {
  name: string;
  phone: string;
  password: string;
  role: "merchant" | "rider";
  logId?: Id<"emailLog"> | null;
  email?: string | null;
};

/** Password box with a Generate button. */
export function PasswordField({ value, onChange, hint }: { value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <Field label={t("New password")} hint={hint ?? t("At least 8 characters with a letter and a number.")}>
      {(id) => (
        <div className="flex gap-2">
          <Input id={id} type="text" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} className="font-mono" required minLength={8} />
          <Button type="button" variant="outline" className="shrink-0 whitespace-nowrap" onClick={() => onChange(generatePassword())}>
            {t("Generate")}
          </Button>
        </div>
      )}
    </Field>
  );
}

/**
 * The office sets a new password for a merchant or rider. It is emailed to
 * them automatically when they have an email address. With `requestId` it
 * also closes that "forgot password" request.
 */
export function SetPasswordModal({
  person,
  email,
  requestId,
  onClose,
  onDone,
}: {
  person: Person | null;
  email?: string | null;
  requestId?: Id<"passwordRequests">;
  onClose: () => void;
  onDone: (v: GivenLogin) => void;
}) {
  const { token } = useAuthed();
  const toast = useToast();
  const setPassword = useMutation(api.users.setPassword);
  const resolve = useMutation(api.support.resolve);
  const [password, setPw] = useState(() => generatePassword());
  const [busy, setBusy] = useState(false);
  if (!person) return null;

  const save = async () => {
    setBusy(true);
    try {
      const r = requestId
        ? await resolve({ token, requestId, password })
        : await setPassword({ token, userId: person._id, password });
      toast.ok(t("Password saved."));
      onDone({ name: person.name, phone: person.phone, password: password.trim(), role: person.role, logId: r.logId, email: r.email });
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t("Set password for {name}", { name: person.name })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("Back")}
          </Button>
          <Button loading={busy} icon={KeyRound} onClick={save}>
            {email ? t("Save and email it") : t("Save password")}
          </Button>
        </>
      }
    >
      <PasswordField value={password} onChange={setPw} />
      <div className="mt-4 flex items-start gap-2 rounded-xl bg-page p-3 text-sm text-ink-2">
        <Mail className="mt-0.5 size-4 shrink-0 text-brand" />
        {email ? (
          <span>{t("The new password will be emailed to {email}.", { email })}</span>
        ) : (
          <span>{t("No email address on this account. Give the password yourself (call or WhatsApp).")}</span>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-3">{t("They are signed out on every device and must use the new password.")}</p>
    </Modal>
  );
}

/** Live "Sending… / Emailed ✓ / Not sent" line for one email. */
export function EmailStatus({ logId }: { logId: Id<"emailLog"> }) {
  const { token } = useAuthed();
  const s = useQuery(api.support.emailStatus, { token, logId });
  if (!s || s.status === "queued") {
    return (
      <p className="flex items-center gap-2 text-sm text-ink-2">
        <Loader2 className="size-4 animate-spin text-brand" /> {t("Sending email to {email}…", { email: s?.to ?? "" })}
      </p>
    );
  }
  if (s.status === "sent") {
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="size-4" /> {t("Emailed to {email}", { email: s.to })}
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
      <XCircle className="mt-0.5 size-4 shrink-0" />
      <span>
        {t("Email not sent: {reason}", { reason: t(s.error ?? "") })} {t("Give the password yourself.")}
      </span>
    </p>
  );
}

/** After a password is set: the login details to hand over, and the email result. */
export function LoginDetailsModal({ value, onClose }: { value: GivenLogin | null; onClose: () => void }) {
  return (
    <Modal open={!!value} onClose={onClose} title={t("Login details")} footer={<Button onClick={onClose}>{t("Done")}</Button>}>
      {value && (
        <>
          <p className="text-sm text-ink-2">
            {value.role === "rider"
              ? t("Give these to {name}. They sign in on the rider login page with this phone number and password.", { name: value.name })
              : t("{name} signs in on the merchant login page with this phone number and password.", { name: value.name })}
          </p>
          <div className="mt-4 space-y-2 rounded-2xl bg-navy-50 p-4 text-center">
            <p className="font-mono text-lg font-bold select-all">{value.phone}</p>
            <p className="font-mono text-2xl font-bold select-all">{value.password}</p>
          </div>
          <div className="mt-4">{value.logId ? <EmailStatus logId={value.logId} /> : null}</div>
        </>
      )}
    </Modal>
  );
}
