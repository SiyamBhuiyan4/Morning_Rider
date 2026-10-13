import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { Bike, ExternalLink, MessageCircle, Pencil, Phone } from "lucide-react";
import { navigate } from "../lib/router";
import { generatePassword } from "../lib/password";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { date, num, tk } from "../lib/format";
import { Badge, Button, Field, Input, Modal, Select, Spinner, Textarea } from "../components/ui";
import { t } from "../lib/prefs";

type Profile = Doc<"riderProfiles">;
type Marital = NonNullable<Profile["maritalStatus"]>;
type Religion = NonNullable<Profile["religion"]>;
type Education = NonNullable<Profile["education"]>;

const MARITAL = (): Record<Marital, string> => ({
  single: t("Single"),
  married: t("Married"),
  divorced: t("Divorced"),
  widowed: t("Widowed"),
});
const RELIGION = (): Record<Religion, string> => ({
  islam: t("Islam"),
  hinduism: t("Hinduism"),
  buddhism: t("Buddhism"),
  christianity: t("Christianity"),
  other: t("Other"),
});
const EDUCATION = (): Record<Education, string> => ({
  none: t("No formal education"),
  primary: t("Primary (PSC)"),
  jsc: t("JSC / JDC"),
  ssc: t("SSC / Dakhil"),
  hsc: t("HSC / Alim"),
  diploma: t("Diploma"),
  bachelor: t("Bachelor's degree"),
  masters: t("Master's degree"),
});
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** Whole years between a YYYY-MM-DD birthday and today. */
function ageFrom(dob: string) {
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

function facebookUrl(v: string) {
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(www\.|m\.)?facebook\.com\//i.test(v) || /^fb\.com\//i.test(v)) return "https://" + v;
  return "https://facebook.com/" + v.replace(/^@/, "");
}

/**
 * Everything the office knows about a rider. Opens on the details view;
 * "Edit profile" switches to the form.
 */
export function RiderProfileModal({ riderId, onClose }: { riderId: Id<"users"> | null; onClose: () => void }) {
  const { token } = useAuthed();
  const data = useQuery(api.riderProfiles.get, riderId ? { token, riderId } : "skip");
  const [editing, setEditing] = useState(false);
  const close = () => {
    setEditing(false);
    onClose();
  };

  return (
    <Modal open={riderId !== null} onClose={close} title={editing ? t("Edit rider profile") : t("Rider profile")} wide>
      {data === undefined ? (
        <Spinner />
      ) : data === null ? (
        <p className="text-sm text-ink-2">{t("Rider not found.")}</p>
      ) : editing ? (
        <ProfileForm data={data} onDone={() => setEditing(false)} />
      ) : (
        <ProfileView
          data={data}
          onEdit={() => setEditing(true)}
          onMessage={() => {
            close();
            navigate(`/app/rider-messages?rider=${data.rider._id}`);
          }}
        />
      )}
    </Modal>
  );
}

type Data = NonNullable<ReturnType<typeof useQuery<typeof api.riderProfiles.get>>>;

function ProfileView({ data, onEdit, onMessage }: { data: Data; onEdit: () => void; onMessage: () => void }) {
  const { rider, profile: p, stats } = data;
  const empty = <span className="text-ink-3">—</span>;
  const tel = (v?: string) =>
    v ? (
      <a href={`tel:${v}`} className="font-medium text-brand hover:underline">
        {v}
      </a>
    ) : (
      empty
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand">
          <Bike className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-lg font-bold">
            {rider.name}
            {rider.demo && <Badge tone="brand">{t("Demo")}</Badge>}
            {rider.status === "active" ? <Badge tone="green">{t("Active")}</Badge> : <Badge tone="red">{t("Suspended")}</Badge>}
          </p>
          <p className="text-sm text-ink-2">
            {rider.phone}
            {rider.riderArea && ` · ${rider.riderArea}`} · {t("joined {date}", { date: date(rider.createdAt) })}
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`tel:${rider.phone}`}>
            <Button variant="outline" size="sm" icon={Phone} type="button">
              {t("Call")}
            </Button>
          </a>
          <Button variant="outline" size="sm" icon={MessageCircle} onClick={onMessage}>
            {t("Message")}
          </Button>
          <Button size="sm" icon={Pencil} onClick={onEdit}>
            {t("Edit profile")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("Delivered")} value={num(stats.delivered)} />
        <Stat label={t("Returned")} value={num(stats.returned)} />
        <Stat label={t("Cash handed in")} value={tk(stats.cashDeposited)} />
      </div>

      {!p && (
        <p className="rounded-xl bg-sun-100/70 p-3 text-sm text-amber-900">
          {t("No personal details saved yet. Press Edit profile to add them.")}
        </p>
      )}

      <Section title={t("Personal")}>
        <Row label={t("Date of birth")}>{p?.dateOfBirth ? date(Date.parse(p.dateOfBirth + "T00:00:00")) : empty}</Row>
        <Row label={t("Age")}>{p?.dateOfBirth ? t("{n} years", { n: ageFrom(p.dateOfBirth) }) : empty}</Row>
        <Row label={p?.idType === "birth_certificate" ? t("Birth certificate no.") : t("NID no.")}>
          {p?.idNumber ? <span className="font-mono">{p.idNumber}</span> : empty}
        </Row>
        <Row label={t("Marital status")}>{p?.maritalStatus ? MARITAL()[p.maritalStatus] : empty}</Row>
        <Row label={t("Religion")}>{p?.religion ? RELIGION()[p.religion] : empty}</Row>
        <Row label={t("Blood group")}>{p?.bloodGroup ?? empty}</Row>
        <Row label={t("Education")}>
          {p?.education ? EDUCATION()[p.education] + (p.institution ? ` · ${p.institution}` : "") : empty}
        </Row>
      </Section>

      <Section title={t("Contact")}>
        <Row label={t("Phone (login)")}>{tel(rider.phone)}</Row>
        <Row label={t("WhatsApp")}>
          {p?.whatsapp ? (
            <a
              href={`https://wa.me/88${p.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand hover:underline"
            >
              {p.whatsapp}
            </a>
          ) : (
            empty
          )}
        </Row>
        <Row label={t("Facebook")}>
          {p?.facebook ? (
            <a
              href={facebookUrl(p.facebook)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
            >
              {p.facebook} <ExternalLink className="size-3.5" />
            </a>
          ) : (
            empty
          )}
        </Row>
        <Row label={t("Email")}>{rider.email ?? empty}</Row>
        <Row label={t("Present address")}>{p?.presentAddress ?? empty}</Row>
        <Row label={t("Permanent address")}>{p?.permanentAddress ?? empty}</Row>
      </Section>

      <Section title={t("Family & guardian")}>
        <Row label={t("Father")}>
          {p?.fatherName ?? empty} {p?.fatherPhone && <>· {tel(p.fatherPhone)}</>}
        </Row>
        <Row label={t("Mother")}>
          {p?.motherName ?? empty} {p?.motherPhone && <>· {tel(p.motherPhone)}</>}
        </Row>
        <Row label={t("Guardian")}>
          {p?.guardianName ?? empty}
          {p?.guardianRelation && ` (${p.guardianRelation})`} {p?.guardianPhone && <>· {tel(p.guardianPhone)}</>}
        </Row>
      </Section>

      <Section title={t("Vehicle")}>
        <Row label={t("Motorcycle number")}>{p?.bikeNumber ?? empty}</Row>
        <Row label={t("Driving licence no.")}>{p?.licenseNumber ?? empty}</Row>
      </Section>

      {p?.notes && (
        <Section title={t("Office notes")}>
          <p className="whitespace-pre-wrap text-sm text-ink">{p.notes}</p>
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-page p-3">
      <p className="text-xs text-ink-3">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-3">{title}</h3>
      <div className="divide-y divide-line rounded-xl border border-line">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 px-4 py-2.5 text-sm">
      <span className="text-ink-2">{label}</span>
      <span className="min-w-0 break-words text-ink">{children}</span>
    </div>
  );
}

/**
 * The rider details form. With `data` it edits an existing rider; without it
 * it is the "Add rider" form, which also asks for the login phone and password
 * and creates the account and profile together.
 */
function ProfileForm({
  data,
  onDone,
  onCreated,
}: {
  data?: Data;
  onDone: () => void;
  onCreated?: (v: { name: string; phone: string; password: string }) => void;
}) {
  const { token } = useAuthed();
  const toast = useToast();
  const save = useMutation(api.riderProfiles.save);
  const create = useMutation(api.riderProfiles.create);
  const adding = !data;
  const p = data?.profile;
  const [login, setLogin] = useState({ phone: "", password: generatePassword() });
  const [f, setF] = useState({
    name: data?.rider.name ?? "",
    email: data?.rider.email ?? "",
    riderArea: data?.rider.riderArea ?? "",
    dateOfBirth: p?.dateOfBirth ?? "",
    idType: p?.idType ?? "nid",
    idNumber: p?.idNumber ?? "",
    maritalStatus: p?.maritalStatus ?? "",
    religion: p?.religion ?? "",
    education: p?.education ?? "",
    institution: p?.institution ?? "",
    bloodGroup: p?.bloodGroup ?? "",
    whatsapp: p?.whatsapp ?? "",
    facebook: p?.facebook ?? "",
    fatherName: p?.fatherName ?? "",
    fatherPhone: p?.fatherPhone ?? "",
    motherName: p?.motherName ?? "",
    motherPhone: p?.motherPhone ?? "",
    guardianName: p?.guardianName ?? "",
    guardianRelation: p?.guardianRelation ?? "",
    guardianPhone: p?.guardianPhone ?? "",
    presentAddress: p?.presentAddress ?? "",
    permanentAddress: p?.permanentAddress ?? "",
    bikeNumber: p?.bikeNumber ?? "",
    licenseNumber: p?.licenseNumber ?? "",
    notes: p?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const today = new Date().toISOString().slice(0, 10);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const form = {
        ...f,
        idType: f.idType as "nid" | "birth_certificate",
        maritalStatus: (f.maritalStatus || undefined) as Marital | undefined,
        religion: (f.religion || undefined) as Religion | undefined,
        education: (f.education || undefined) as Education | undefined,
      };
      if (data) {
        await save({ token, riderId: data.rider._id, ...form });
        toast.ok(t("Profile saved."));
        onDone();
      } else {
        const r = await create({ token, ...form, phone: login.phone, password: login.password });
        toast.ok(t("{name} added.", { name: f.name }));
        onCreated?.({ name: f.name, phone: r.phone, password: login.password.trim() });
      }
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  const text = (k: keyof typeof f, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label}>{(id) => <Input id={id} value={f[k]} onChange={set(k)} {...props} />}</Field>
  );
  const phone = (k: keyof typeof f, label: string) => text(k, label, { type: "tel", placeholder: "01XXXXXXXXX" });

  return (
    <form onSubmit={submit} className="space-y-6">
      <FormSection title={t("Basic")}>
        {text("name", t("Full name"), { required: true })}
        {text("riderArea", t("Working area"), { placeholder: t("e.g. Mirpur, Uttara") })}
        {adding && (
          <>
            <Field label={t("Phone number (login)")}>
              {(id) => (
                <Input
                  id={id}
                  type="tel"
                  inputMode="tel"
                  placeholder="01XXXXXXXXX"
                  value={login.phone}
                  onChange={(e) => setLogin({ ...login, phone: e.target.value })}
                  required
                />
              )}
            </Field>
            <Field label={t("Rider's password")} hint={t("At least 8 characters with a letter and a number. The rider collects it from the office.")}>
              {(id) => (
                <div className="flex gap-2">
                  <Input
                    id={id}
                    type="text"
                    autoComplete="off"
                    value={login.password}
                    onChange={(e) => setLogin({ ...login, password: e.target.value })}
                    className="font-mono"
                    required
                    minLength={8}
                  />
                  <Button type="button" variant="outline" className="shrink-0" onClick={() => setLogin({ ...login, password: generatePassword() })}>
                    {t("Generate")}
                  </Button>
                </div>
              )}
            </Field>
          </>
        )}
      </FormSection>

      <FormSection title={t("Personal")}>
        {text("dateOfBirth", t("Date of birth"), { type: "date", max: today, min: "1940-01-01" })}
        <Field label={t("Blood group")}>
          {(id) => (
            <Select id={id} value={f.bloodGroup} onChange={set("bloodGroup")}>
              <option value="">—</option>
              {BLOOD_GROUPS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("ID type")}>
          {(id) => (
            <Select id={id} value={f.idType} onChange={set("idType")}>
              <option value="nid">{t("National ID (NID)")}</option>
              <option value="birth_certificate">{t("Birth certificate")}</option>
            </Select>
          )}
        </Field>
        {text("idNumber", f.idType === "birth_certificate" ? t("Birth certificate no.") : t("NID no."), {
          inputMode: "numeric",
          placeholder: t("10, 13 or 17 digits"),
        })}
        <Field label={t("Marital status")}>
          {(id) => (
            <Select id={id} value={f.maritalStatus} onChange={set("maritalStatus")}>
              <option value="">—</option>
              {Object.entries(MARITAL()).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("Religion")}>
          {(id) => (
            <Select id={id} value={f.religion} onChange={set("religion")}>
              <option value="">—</option>
              {Object.entries(RELIGION()).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("Education")}>
          {(id) => (
            <Select id={id} value={f.education} onChange={set("education")}>
              <option value="">—</option>
              {Object.entries(EDUCATION()).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          )}
        </Field>
        {text("institution", t("School / college"))}
      </FormSection>

      <FormSection title={t("Contact")}>
        {phone("whatsapp", t("WhatsApp number"))}
        {text("facebook", t("Facebook link or username"), { placeholder: "facebook.com/..." })}
        {text("email", t("Email"), { type: "email" })}
        <div />
        <Field label={t("Present address")} className="sm:col-span-2">
          {(id) => <Textarea id={id} value={f.presentAddress} onChange={set("presentAddress")} rows={2} />}
        </Field>
        <Field label={t("Permanent address")} className="sm:col-span-2">
          {(id) => <Textarea id={id} value={f.permanentAddress} onChange={set("permanentAddress")} rows={2} />}
        </Field>
      </FormSection>

      <FormSection title={t("Family & guardian")}>
        {text("fatherName", t("Father's name"))}
        {phone("fatherPhone", t("Father's phone"))}
        {text("motherName", t("Mother's name"))}
        {phone("motherPhone", t("Mother's phone"))}
        {text("guardianName", t("Guardian's name"))}
        {text("guardianRelation", t("Relation"), { placeholder: t("e.g. Uncle, Brother") })}
        {phone("guardianPhone", t("Guardian's phone"))}
      </FormSection>

      <FormSection title={t("Vehicle")}>
        {text("bikeNumber", t("Motorcycle number"), { placeholder: "Dhaka Metro-HA 11-1234" })}
        {text("licenseNumber", t("Driving licence no."))}
      </FormSection>

      <Field label={t("Office notes")}>
        {(id) => <Textarea id={id} value={f.notes} onChange={set("notes")} rows={3} />}
      </Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>
          {t("Cancel")}
        </Button>
        <Button type="submit" loading={busy}>
          {adding ? t("Create rider") : t("Save profile")}
        </Button>
      </div>
    </form>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-3">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** "Add rider": login + every profile detail in one form. */
export function AddRiderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (v: { name: string; phone: string; password: string }) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={t("Add rider")} wide>
      {open && (
        <>
          <p className="mb-5 text-sm text-ink-2">
            {t("Only name, phone and password are required. Fill in the rest now or later from the rider's profile.")}
          </p>
          <ProfileForm onDone={onClose} onCreated={onCreated} />
        </>
      )}
    </Modal>
  );
}

