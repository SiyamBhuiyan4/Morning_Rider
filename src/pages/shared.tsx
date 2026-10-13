import { useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Printer, Search, ShieldCheck } from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuthed, useSession } from "../lib/session";
import { useToast } from "../lib/toast";
import { navigate } from "../lib/router";
import { PAYOUT_METHOD } from "../lib/format";
import { Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Spinner } from "../components/ui";
import { MerchantPicker, ParcelForm, type ParcelFields } from "../components/ParcelForm";
import { ParcelList } from "../components/ParcelList";
import { FraudSummary } from "../components/FraudSummary";

export function ParcelsPage() {
  const { me } = useAuthed();
  return (
    <>
      <PageHeader
        title={me.role === "admin" ? "All parcels" : "My parcels"}
        subtitle="Click a parcel for details, history and actions. Tick parcels to print labels in bulk."
        actions={<Button onClick={() => navigate("/app/parcels/new")}>Create parcel</Button>}
      />
      <ParcelList />
    </>
  );
}

export function NewParcel() {
  const { token, me } = useAuthed();
  const create = useMutation(api.parcels.create);
  const [merchantId, setMerchantId] = useState<Id<"users"> | "">("");
  const [created, setCreated] = useState<{ id: Id<"parcels">; trackingCode: string } | null>(null);
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <PageHeader title="Create parcel" subtitle="Fill in the customer and parcel details — we'll calculate the charges." />
      <ParcelForm
        key={formKey}
        submitLabel="Create parcel"
        merchantPicker={me.role === "admin" ? <MerchantPicker value={merchantId} onChange={setMerchantId} /> : undefined}
        onSubmit={async (parcel) => {
          const r = await create({ token, parcel, merchantId: merchantId || undefined });
          setCreated(r);
        }}
      />
      <Modal
        open={!!created}
        onClose={() => {
          setCreated(null);
          setFormKey((k) => k + 1);
        }}
        title="Parcel created"
      >
        <div className="text-center">
          <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
          <p className="mt-3 text-sm text-ink-2">Tracking ID</p>
          <p className="font-mono text-2xl font-extrabold tracking-wider">{created?.trackingCode}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Button variant="outline" icon={Printer} onClick={() => window.open(`/print/labels?ids=${created?.id}`, "_blank", "noopener")}>
              Print label
            </Button>
            <Button
              onClick={() => {
                setCreated(null);
                setFormKey((k) => k + 1);
              }}
            >
              Create another
            </Button>
            <Button variant="ghost" onClick={() => navigate("/app/parcels")}>
              View parcels
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function EditParcel({ id }: { id: Id<"parcels"> }) {
  const { token } = useAuthed();
  const toast = useToast();
  const data = useQuery(api.parcels.get, { token, id });
  const update = useMutation(api.parcels.update);
  if (data === undefined) return <Spinner />;
  if (data === null || !data.canEdit) {
    return (
      <Card>
        <Empty icon={ShieldCheck} title="This parcel can't be edited" text="Only parcels that are not yet delivered or returned can be changed." />
      </Card>
    );
  }
  const p = data.parcel;
  const initial: ParcelFields = {
    invoice: p.invoice ?? "",
    recipientName: p.recipientName,
    recipientPhone: p.recipientPhone,
    recipientAddress: p.recipientAddress,
    district: p.district,
    zone: p.zone,
    weightKg: String(p.weightKg),
    codAmount: String(p.codAmount),
    itemDescription: p.itemDescription ?? "",
    note: p.note ?? "",
  };
  return (
    <>
      <PageHeader title={`Edit ${p.trackingCode}`} />
      <ParcelForm
        initial={initial}
        submitLabel="Save changes"
        onSubmit={async (parcel) => {
          await update({ token, id, parcel });
          toast.ok("Parcel updated.");
          navigate("/app/parcels");
        }}
      />
    </>
  );
}

export function FraudCheck() {
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("");
  return (
    <>
      <PageHeader title="Fraud check" subtitle="See a customer's delivery record across Morning Rider before you ship." />
      <Card className="max-w-2xl p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPhone(input.trim());
          }}
          className="flex gap-2"
        >
          <Input type="tel" placeholder="Customer phone, 01XXXXXXXXX" value={input} onChange={(e) => setInput(e.target.value)} />
          <Button type="submit" icon={Search}>
            Check
          </Button>
        </form>
        {phone && (
          <div className="mt-5">
            <FraudResult phone={phone} />
          </div>
        )}
      </Card>
    </>
  );
}

function FraudResult({ phone }: { phone: string }) {
  const { token } = useAuthed();
  const r = useQuery(api.parcels.fraudCheck, { token, phone });
  if (r === undefined) return <Spinner className="py-6" />;
  if (r === null) return <p className="text-sm font-medium text-red-600">Enter a valid Bangladeshi mobile number.</p>;
  return <FraudSummary phone={phone} />;
}

export function Account() {
  const { token, me } = useAuthed();
  const { signIn } = useSession();
  const toast = useToast();
  const updateProfile = useMutation(api.users.updateProfile);
  const changePassword = useMutation(api.auth.changePassword);
  const [p, setP] = useState({
    name: me.name,
    email: me.email ?? "",
    businessName: me.businessName ?? "",
    pickupAddress: me.pickupAddress ?? "",
    payoutMethod: me.payoutMethod ?? "bkash",
    payoutAccount: me.payoutAccount ?? "",
    riderArea: me.riderArea ?? "",
  });
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [busy, setBusy] = useState<"profile" | "pw" | null>(null);
  const set = (k: keyof typeof p) => (e: { target: { value: string } }) => setP({ ...p, [k]: e.target.value });

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy("profile");
    try {
      await updateProfile({
        token,
        name: p.name,
        email: p.email || undefined,
        businessName: p.businessName || undefined,
        pickupAddress: p.pickupAddress || undefined,
        payoutMethod: me.role === "merchant" ? p.payoutMethod : undefined,
        payoutAccount: p.payoutAccount || undefined,
        riderArea: p.riderArea || undefined,
      });
      toast.ok("Profile saved.");
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.next !== pw.confirm) return toast.error("New passwords do not match.");
    setBusy("pw");
    try {
      const s = await changePassword({ token, currentPassword: pw.current, newPassword: pw.next });
      signIn(s.token, s.expiresAt);
      setPw({ current: "", next: "", confirm: "" });
      toast.ok("Password changed. Other devices have been signed out.");
    } catch (err) {
      toast.error(err);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader title="Account" subtitle={`Signed in as ${me.phone}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-bold">Profile</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <Field label="Name">{(id) => <Input id={id} value={p.name} onChange={set("name")} required />}</Field>
            <Field label="Email (optional)">{(id) => <Input id={id} type="email" value={p.email} onChange={set("email")} />}</Field>
            {me.role === "merchant" && (
              <>
                <Field label="Business name">{(id) => <Input id={id} value={p.businessName} onChange={set("businessName")} required />}</Field>
                <Field label="Pickup address">{(id) => <Input id={id} value={p.pickupAddress} onChange={set("pickupAddress")} required />}</Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Get paid by">
                    {(id) => (
                      <Select id={id} value={p.payoutMethod} onChange={set("payoutMethod")}>
                        {Object.entries(PAYOUT_METHOD).map(([k, l]) => (
                          <option key={k} value={k}>{l}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Field label="Account">{(id) => <Input id={id} value={p.payoutAccount} onChange={set("payoutAccount")} />}</Field>
                </div>
              </>
            )}
            {me.role === "rider" && <Field label="Working area">{(id) => <Input id={id} value={p.riderArea} onChange={set("riderArea")} />}</Field>}
            <Button type="submit" loading={busy === "profile"}>Save profile</Button>
          </form>
        </Card>
        <Card className="h-fit p-6">
          <h2 className="mb-4 font-bold">Change password</h2>
          <form onSubmit={savePassword} className="space-y-4">
            <Field label="Current password">{(id) => <Input id={id} type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} required />}</Field>
            <Field label="New password" hint="At least 8 characters with a letter and a number.">
              {(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} required minLength={8} />}
            </Field>
            <Field label="Confirm new password">{(id) => <Input id={id} type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />}</Field>
            <Button type="submit" variant="dark" loading={busy === "pw"}>Change password</Button>
          </form>
        </Card>
      </div>
    </>
  );
}

