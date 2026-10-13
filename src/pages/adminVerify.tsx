import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, ExternalLink, FileText, ShieldCheck, XCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { dateTime, num } from "../lib/format";
import { Badge, Button, Card, Field, Modal, Spinner, Textarea } from "../components/ui";
import { t } from "../lib/prefs";

type VerificationStatus = "submitted" | "approved" | "rejected";

/** Badge for a merchant's verification state (undefined = never submitted). */
export function VerificationBadge({ status }: { status: VerificationStatus | "none" | undefined }) {
  if (status === "approved") return <Badge tone="green">{t("Verified")}</Badge>;
  if (status === "submitted") return <Badge tone="amber">{t("Under review")}</Badge>;
  if (status === "rejected") return <Badge tone="red">{t("Rejected")}</Badge>;
  return <Badge tone="slate">{t("Not verified")}</Badge>;
}

/** Businesses that submitted documents and are waiting for an admin decision. */
export function VerificationQueue() {
  const { token } = useAuthed();
  const rows = useQuery(api.verification.pending, { token });
  const [reviewing, setReviewing] = useState<Id<"users"> | null>(null);
  if (!rows || rows.length === 0) return null;

  return (
    <Card className="mb-6 overflow-hidden ring-2 ring-sun/50">
      <div className="flex items-center gap-2 border-b border-line bg-sun-100 px-5 py-4 font-bold text-amber-900">
        <ShieldCheck className="size-5" /> {t("Business verification requests")}
        <Badge tone="amber">{num(rows.length)}</Badge>
      </div>
      <div className="divide-y divide-line">
        {rows.map((r) => (
          <div key={r.merchantId} className="flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-48 flex-1">
              <p className="font-bold">{r.businessName || r.merchantName}</p>
              <p className="text-sm text-ink-2">
                {r.merchantName} · {r.phone}
              </p>
              <p className="text-xs text-ink-3">{t("submitted {date}", { date: dateTime(r.submittedAt) })}</p>
            </div>
            <Button size="sm" icon={ShieldCheck} onClick={() => setReviewing(r.merchantId)}>
              {t("Review")}
            </Button>
          </div>
        ))}
      </div>
      {reviewing && <VerificationReviewModal merchantId={reviewing} onClose={() => setReviewing(null)} />}
    </Card>
  );
}

/** Full document review: info, numbers, every file, approve / reject with a reason. */
export function VerificationReviewModal({ merchantId, onClose }: { merchantId: Id<"users">; onClose: () => void }) {
  const { token } = useAuthed();
  const toast = useToast();
  const d = useQuery(api.verification.details, { token, merchantId });
  const approve = useMutation(api.verification.approve);
  const reject = useMutation(api.verification.reject);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);

  async function run(kind: "approve" | "reject") {
    if (kind === "reject" && !reason.trim()) return toast.error(t("Write the reason so the merchant knows what to fix."));
    setBusy(kind);
    try {
      if (kind === "approve") {
        await approve({ token, merchantId });
        toast.ok(t("Business verified. The merchant can now send parcels."));
      } else {
        await reject({ token, merchantId, reason: reason.trim() });
        toast.ok(t("Verification rejected. The merchant will see your reason."));
      }
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  }

  const footer = !d ? undefined : rejecting ? (
    <>
      <Button variant="ghost" onClick={() => setRejecting(false)}>{t("Back")}</Button>
      <Button variant="danger" icon={XCircle} loading={busy === "reject"} disabled={!reason.trim()} onClick={() => run("reject")}>
        {t("Reject")}
      </Button>
    </>
  ) : (
    <>
      {d.status !== "rejected" && (
        <Button variant="outline" icon={XCircle} onClick={() => setRejecting(true)} disabled={!!busy}>
          {t("Reject")}
        </Button>
      )}
      {d.status !== "approved" && (
        <Button icon={CheckCircle2} loading={busy === "approve"} onClick={() => run("approve")}>
          {t("Approve")}
        </Button>
      )}
    </>
  );

  return (
    <Modal open onClose={onClose} wide title={t("Business documents")} footer={footer}>
      {d === undefined ? (
        <Spinner />
      ) : d === null ? (
        <p className="py-8 text-center text-ink-2">{t("This merchant has not submitted any documents.")}</p>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-bold">{d.businessName || d.merchantName}</p>
              <p className="text-sm text-ink-2">
                {d.merchantName} · {d.phone}
              </p>
              {d.pickupAddress && <p className="text-xs text-ink-3">{d.pickupAddress}</p>}
              <p className="mt-1 text-xs text-ink-3">{t("submitted {date}", { date: dateTime(d.submittedAt) })}</p>
            </div>
            <VerificationBadge status={d.status} />
          </div>

          {d.status === "rejected" && d.reason && (
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              <span className="font-semibold">{t("Rejection reason")}:</span> {d.reason}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <Info label={t("NID number")} value={d.nidNumber} />
            <Info label={t("TIN number")} value={d.tinNumber} />
            <Info label={t("Trade licence number")} value={d.tradeLicenseNumber} />
          </div>

          <div>
            <p className="mb-2 text-[13px] font-semibold text-ink-2">{t("Uploaded files ({n})", { n: d.files.length })}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {d.files.map((f, i) => {
                const label = t(f.label);
                const isImage = !!f.contentType?.startsWith("image/");
                if (!f.url) {
                  return (
                    <div key={i} className="rounded-2xl border border-dashed border-line p-4 text-sm text-ink-3">
                      <p className="font-semibold text-ink-2">{label}</p>
                      {t("File not found")}
                    </div>
                  );
                }
                return isImage ? (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group block overflow-hidden rounded-2xl border border-line bg-page hover:border-brand"
                    title={t("Open full size")}
                  >
                    <img src={f.url} alt={label} loading="lazy" className="h-56 w-full object-contain sm:h-64" />
                    <span className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2 text-sm font-semibold">
                      {label}
                      <ExternalLink className="size-4 text-ink-3 group-hover:text-brand" />
                    </span>
                  </a>
                ) : (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-line bg-page p-4 hover:border-brand"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                      <FileText className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{label}</span>
                      <span className="block text-xs text-ink-3">{t("PDF — open in new tab")}</span>
                    </span>
                    <ExternalLink className="size-4 text-ink-3" />
                  </a>
                );
              })}
            </div>
          </div>

          {rejecting && (
            <Field label={t("Reason (the merchant will see this)")}>
              {(id) => (
                <Textarea
                  id={id}
                  autoFocus
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={300}
                  placeholder={t("e.g. NID photo is blurry, please upload a clear photo")}
                />
              )}
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl bg-page p-3">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="break-all font-mono font-semibold">{value || <span className="font-sans text-ink-3">{t("Not given")}</span>}</p>
    </div>
  );
}
