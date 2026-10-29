import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Bike,
  Building2,
  CheckCircle2,
  Eye,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  Phone,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Truck,
  User,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { dateTime, tk } from "../lib/format";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  StatCard,
  Textarea,
  cx,
} from "../components/ui";
import { t } from "../lib/prefs";

type HubTab = "hubs" | "fleet" | "manifests";

export function HubsPage() {
  const { token } = useAuthed();
  const [tab, setTab] = useState<HubTab>("hubs");

  // Load summary data for stat cards
  const hubs = useQuery(api.hubs.list, { token });
  const transports = useQuery(api.hubs.listTransports, { token });
  const manifests = useQuery(api.hubs.listManifests, { token });
  const packable = useQuery(api.hubs.packableParcels, { token });

  const activeHubsCount = useMemo(() => hubs?.filter((h) => h.status === "active").length ?? 0, [hubs]);
  const availableTransports = useMemo(() => transports?.filter((t) => t.status === "available").length ?? 0, [transports]);
  const inTransitManifests = useMemo(() => manifests?.filter((m) => m.status === "dispatched").length ?? 0, [manifests]);
  const packableCount = packable?.length ?? 0;

  return (
    <>
      <PageHeader
        title={t("Hub & Warehouse Logistics")}
        subtitle={t("Manage central & regional sorting hubs, transport fleet vehicles, and inter-hub dispatch manifests.")}
      />

      {/* KPI Stats Overview */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <StatCard
          label={t("Active Hubs")}
          value={activeHubsCount}
          icon={Building2}
          accent="navy"
          hint={t("{n} total registered", { n: hubs?.length ?? 0 })}
        />
        <StatCard
          label={t("Available Fleet")}
          value={availableTransports}
          icon={Truck}
          accent="green"
          hint={t("{n} total vehicles", { n: transports?.length ?? 0 })}
        />
        <StatCard
          label={t("Transit Manifests")}
          value={inTransitManifests}
          icon={Layers}
          accent="sun"
          hint={t("{n} dispatched on road", { n: inTransitManifests })}
        />
        <StatCard
          label={t("Ready at Hub")}
          value={packableCount}
          icon={Package}
          accent="brand"
          hint={t("Parcels ready for transfer")}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-surface p-1.5 shadow-[var(--shadow-card)]">
        {[
          { key: "hubs" as const, label: t("Hubs & Warehouses"), icon: Building2, count: hubs?.length },
          { key: "fleet" as const, label: t("Fleet & Transports"), icon: Truck, count: transports?.length },
          { key: "manifests" as const, label: t("Transit Manifests & Dispatch Bags"), icon: Layers, count: manifests?.length },
        ].map((item) => {
          const active = tab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cx(
                "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all",
                active
                  ? "bg-navy-900 text-white shadow-sm dark:bg-navy-700"
                  : "text-ink-2 hover:bg-page hover:text-ink",
              )}
            >
              <item.icon className="size-4 shrink-0" />
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={cx(
                    "ml-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    active ? "bg-white/20 text-white" : "bg-navy-100 text-navy-800 dark:bg-navy-900/40 dark:text-navy-200",
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {tab === "hubs" && <HubsTab token={token} />}
      {tab === "fleet" && <FleetTab token={token} />}
      {tab === "manifests" && <ManifestsTab token={token} />}
    </>
  );
}

/* ========================================================================= */
/* TAB 1: Hubs & Warehouses                                                  */
/* ========================================================================= */

function HubsTab({ token }: { token: string }) {
  const hubs = useQuery(api.hubs.list, { token, status: "all" });
  const admins = useQuery(api.users.list, { token, role: "admin" });
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editingHub, setEditingHub] = useState<Doc<"hubs"> | null>(null);

  const toast = useToast();
  const createHub = useMutation(api.hubs.createHub);
  const updateHub = useMutation(api.hubs.updateHub);

  // Form states for Create Modal
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Dhaka");
  const [phone, setPhone] = useState("");
  const [managerId, setManagerId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  // Form states for Edit Modal
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editManagerId, setEditManagerId] = useState<string>("");
  const [editStatus, setEditStatus] = useState<"active" | "inactive">("active");
  const [editBusy, setEditBusy] = useState(false);

  function startEdit(hub: Doc<"hubs">) {
    setEditingHub(hub);
    setEditName(hub.name);
    setEditCode(hub.code);
    setEditAddress(hub.address);
    setEditCity(hub.city);
    setEditPhone(hub.phone);
    setEditManagerId(hub.managerId ?? "");
    setEditStatus(hub.status);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim() || !address.trim() || !phone.trim() || !city.trim()) {
      toast.error(t("Please fill in all required fields."));
      return;
    }
    setBusy(true);
    try {
      await createHub({
        token,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim(),
        managerId: managerId ? (managerId as Id<"users">) : undefined,
      });
      toast.ok(t("New hub created successfully!"));
      setName("");
      setCode("");
      setAddress("");
      setPhone("");
      setManagerId("");
      setCreateOpen(false);
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingHub) return;
    setEditBusy(true);
    try {
      await updateHub({
        token,
        id: editingHub._id,
        name: editName.trim(),
        code: editCode.trim().toUpperCase(),
        address: editAddress.trim(),
        city: editCity.trim(),
        phone: editPhone.trim(),
        managerId: editManagerId ? (editManagerId as Id<"users">) : undefined,
        status: editStatus,
      });
      toast.ok(t("Hub details updated successfully."));
      setEditingHub(null);
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setEditBusy(false);
    }
  }

  async function toggleStatus(hub: Doc<"hubs">) {
    const nextStatus = hub.status === "active" ? "inactive" : "active";
    try {
      await updateHub({
        token,
        id: hub._id,
        status: nextStatus,
      });
      toast.ok(t("Hub status changed to {status}.", { status: nextStatus }));
    } catch (err: unknown) {
      toast.error(err);
    }
  }

  const filteredHubs = useMemo(() => {
    if (!hubs) return [];
    return hubs.filter((h) => {
      if (statusFilter !== "all" && h.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        h.name.toLowerCase().includes(q) ||
        h.code.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.phone.includes(q) ||
        (h.managerName && h.managerName.toLowerCase().includes(q))
      );
    });
  }, [hubs, search, statusFilter]);

  if (hubs === undefined) return <Spinner className="py-12" />;

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64 sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search hubs by name, code, city...")}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="w-36"
          >
            <option value="all">{t("All Statuses")}</option>
            <option value="active">{t("Active Only")}</option>
            <option value="inactive">{t("Inactive Only")}</option>
          </Select>
        </div>

        <Button size="md" variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
          {t("Create New Hub")}
        </Button>
      </div>

      {/* Hubs Cards Grid */}
      {filteredHubs.length === 0 ? (
        <Card className="p-8 text-center">
          <Empty
            icon={Building2}
            title={t("No hubs found")}
            text={t("Try adjusting your search criteria or register a new sorting warehouse.")}
            action={
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                {t("Create New Hub")}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHubs.map((hub) => (
            <Card key={hub._id} className="flex flex-col justify-between p-5 transition-all hover:shadow-md">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-mono text-xs font-extrabold tracking-wide text-brand">
                      {hub.code}
                    </span>
                    <h3 className="truncate text-base font-extrabold text-ink">{hub.name}</h3>
                  </div>
                  <Badge tone={hub.status === "active" ? "green" : "slate"}>
                    {hub.status === "active" ? t("Active") : t("Inactive")}
                  </Badge>
                </div>

                <div className="mt-4 space-y-2 text-xs text-ink-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                    <span>
                      {hub.address}, <strong className="text-ink">{hub.city}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="size-3.5 shrink-0 text-ink-3" />
                    <a href={`tel:${hub.phone}`} className="font-medium hover:text-brand hover:underline">
                      {hub.phone}
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-3.5 shrink-0 text-ink-3" />
                    <span>
                      {hub.managerName ? (
                        <>
                          <span className="font-semibold text-ink">{hub.managerName}</span>
                          {hub.managerPhone && <span className="ml-1 text-ink-3">({hub.managerPhone})</span>}
                        </>
                      ) : (
                        <span className="italic text-ink-3">{t("No Manager Assigned")}</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5">
                <span className="text-[11px] text-ink-3">
                  {dateTime(hub.createdAt)}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => startEdit(hub)}
                    className="text-xs"
                  >
                    {t("Edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant={hub.status === "active" ? "outline" : "primary"}
                    onClick={() => toggleStatus(hub)}
                    className="text-xs"
                  >
                    {hub.status === "active" ? t("Deactivate") : t("Activate")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Create New Hub */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("Create New Hub")}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button form="create-hub-form" type="submit" variant="primary" loading={busy}>
              {t("Create Hub")}
            </Button>
          </>
        }
      >
        <form id="create-hub-form" onSubmit={handleCreate} className="space-y-3.5">
          <Field label={t("Hub Name")}>
            {(id) => (
              <Input
                id={id}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Uttara Regional Hub"
              />
            )}
          </Field>

          <Field label={t("Hub Code")}>
            {(id) => (
              <Input
                id={id}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. HUB-UTR-01"
              />
            )}
          </Field>

          <Field label={t("City")}>
            {(id) => (
              <Input
                id={id}
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Dhaka / Gazipur / Chittagong"
              />
            )}
          </Field>

          <Field label={t("Full Street Address")}>
            {(id) => (
              <Input
                id={id}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House, Road, Sector, Area..."
              />
            )}
          </Field>

          <Field label={t("Contact Phone")}>
            {(id) => (
              <Input
                id={id}
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
              />
            )}
          </Field>

          <Field label={t("Hub Manager (Optional)")}>
            {(id) => (
              <Select id={id} value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                <option value="">{t("Select manager user...")}</option>
                {admins?.map((admin) => (
                  <option key={admin._id} value={admin._id}>
                    {admin.name} ({admin.phone})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Modal>

      {/* Modal: Edit Hub */}
      <Modal
        open={editingHub !== null}
        onClose={() => setEditingHub(null)}
        title={t("Edit Hub Details")}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setEditingHub(null)}>
              {t("Cancel")}
            </Button>
            <Button form="edit-hub-form" type="submit" variant="primary" loading={editBusy}>
              {t("Save Changes")}
            </Button>
          </>
        }
      >
        <form id="edit-hub-form" onSubmit={handleEdit} className="space-y-3.5">
          <Field label={t("Hub Name")}>
            {(id) => (
              <Input
                id={id}
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            )}
          </Field>

          <Field label={t("Hub Code")}>
            {(id) => (
              <Input
                id={id}
                required
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase())}
              />
            )}
          </Field>

          <Field label={t("City")}>
            {(id) => (
              <Input
                id={id}
                required
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
              />
            )}
          </Field>

          <Field label={t("Full Street Address")}>
            {(id) => (
              <Input
                id={id}
                required
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            )}
          </Field>

          <Field label={t("Contact Phone")}>
            {(id) => (
              <Input
                id={id}
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            )}
          </Field>

          <Field label={t("Status")}>
            {(id) => (
              <Select
                id={id}
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "active" | "inactive")}
              >
                <option value="active">{t("Active")}</option>
                <option value="inactive">{t("Inactive")}</option>
              </Select>
            )}
          </Field>

          <Field label={t("Hub Manager")}>
            {(id) => (
              <Select id={id} value={editManagerId} onChange={(e) => setEditManagerId(e.target.value)}>
                <option value="">{t("None assigned")}</option>
                {admins?.map((admin) => (
                  <option key={admin._id} value={admin._id}>
                    {admin.name} ({admin.phone})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================= */
/* TAB 2: Fleet & Transports                                                 */
/* ========================================================================= */

function FleetTab({ token }: { token: string }) {
  const transports = useQuery(api.hubs.listTransports, { token });
  const hubs = useQuery(api.hubs.list, { token, status: "active" });

  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "in_transit" | "maintenance">("all");
  const [search, setSearch] = useState("");

  const toast = useToast();
  const createTransport = useMutation(api.hubs.createTransport);
  const updateStatus = useMutation(api.hubs.updateTransportStatus);

  // Form states
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"van" | "truck" | "pickup" | "bike">("van");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [capacityKg, setCapacityKg] = useState("500");
  const [currentHubId, setCurrentHubId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleNumber.trim() || !driverName.trim() || !driverPhone.trim()) {
      toast.error(t("Please fill in required vehicle and driver details."));
      return;
    }
    const cap = parseFloat(capacityKg);
    if (!Number.isFinite(cap) || cap <= 0) {
      toast.error(t("Capacity must be greater than 0 kg."));
      return;
    }
    setBusy(true);
    try {
      await createTransport({
        token,
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        driverName: driverName.trim(),
        driverPhone: driverPhone.trim(),
        capacityKg: cap,
        currentHubId: currentHubId ? (currentHubId as Id<"hubs">) : undefined,
      });
      toast.ok(t("Transport vehicle registered successfully!"));
      setVehicleNumber("");
      setDriverName("");
      setDriverPhone("");
      setCapacityKg("500");
      setCurrentHubId("");
      setCreateOpen(false);
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(
    id: Id<"transports">,
    newStatus: "available" | "in_transit" | "maintenance",
  ) {
    try {
      await updateStatus({
        token,
        id,
        status: newStatus,
      });
      toast.ok(t("Vehicle status updated to {s}.", { s: newStatus }));
    } catch (err: unknown) {
      toast.error(err);
    }
  }

  const filteredTransports = useMemo(() => {
    if (!transports) return [];
    return transports.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        v.vehicleNumber.toLowerCase().includes(q) ||
        v.driverName.toLowerCase().includes(q) ||
        v.driverPhone.includes(q) ||
        v.vehicleType.toLowerCase().includes(q)
      );
    });
  }, [transports, statusFilter, search]);

  const vehicleIcon = (type: string) => {
    switch (type) {
      case "bike":
        return Bike;
      case "truck":
        return Truck;
      case "pickup":
        return Truck;
      default:
        return Truck;
    }
  };

  if (transports === undefined) return <Spinner className="py-12" />;

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64 sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search by vehicle no, driver...")}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "available" | "in_transit" | "maintenance")}
            className="w-40"
          >
            <option value="all">{t("All Vehicles")}</option>
            <option value="available">{t("Available Only")}</option>
            <option value="in_transit">{t("In Transit Only")}</option>
            <option value="maintenance">{t("Maintenance Only")}</option>
          </Select>
        </div>

        <Button size="md" variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
          {t("Add Vehicle / Transport")}
        </Button>
      </div>

      {/* Fleet Cards Grid */}
      {filteredTransports.length === 0 ? (
        <Card className="p-8 text-center">
          <Empty
            icon={Truck}
            title={t("No transport vehicles found")}
            text={t("Register your delivery vans, inter-hub cargo trucks, or feeder motorcycles.")}
            action={
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                {t("Add Vehicle / Transport")}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTransports.map((v) => {
            const Icon = vehicleIcon(v.vehicleType);
            return (
              <Card key={v._id} className="flex flex-col justify-between p-5 transition-all hover:shadow-md">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-50 text-navy-800 dark:bg-white/10 dark:text-white">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-ink">{v.vehicleNumber}</h3>
                        <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                          {v.vehicleType} · {v.capacityKg} kg {t("cap")}
                        </p>
                      </div>
                    </div>

                    <Badge
                      tone={
                        v.status === "available"
                          ? "green"
                          : v.status === "in_transit"
                            ? "amber"
                            : "red"
                      }
                    >
                      {v.status === "available"
                        ? t("Available")
                        : v.status === "in_transit"
                          ? t("In Transit")
                          : t("Maintenance")}
                    </Badge>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-ink-2">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5 shrink-0 text-ink-3" />
                      <span className="font-semibold text-ink">{v.driverName}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="size-3.5 shrink-0 text-ink-3" />
                      <a href={`tel:${v.driverPhone}`} className="hover:text-brand hover:underline">
                        {v.driverPhone}
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 shrink-0 text-ink-3" />
                      <span>
                        {v.currentHubName ? (
                          <>
                            {t("Current Hub:")} <strong className="text-ink">{v.currentHubName}</strong>
                          </>
                        ) : (
                          <span className="italic text-ink-3">{t("Hub unassigned")}</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 1-Click Status Update Buttons */}
                <div className="mt-5 border-t border-line pt-3.5">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-3">
                    {t("1-Click Status Update:")}
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      disabled={v.status === "available"}
                      onClick={() => setStatus(v._id, "available")}
                      className={cx(
                        "rounded-lg px-2 py-1.5 text-center text-xs font-bold transition-all",
                        v.status === "available"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "border border-line bg-surface text-ink-2 hover:bg-emerald-50 hover:text-emerald-700",
                      )}
                    >
                      {t("Available")}
                    </button>
                    <button
                      type="button"
                      disabled={v.status === "in_transit"}
                      onClick={() => setStatus(v._id, "in_transit")}
                      className={cx(
                        "rounded-lg px-2 py-1.5 text-center text-xs font-bold transition-all",
                        v.status === "in_transit"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "border border-line bg-surface text-ink-2 hover:bg-amber-50 hover:text-amber-700",
                      )}
                    >
                      {t("In Transit")}
                    </button>
                    <button
                      type="button"
                      disabled={v.status === "maintenance"}
                      onClick={() => setStatus(v._id, "maintenance")}
                      className={cx(
                        "rounded-lg px-2 py-1.5 text-center text-xs font-bold transition-all",
                        v.status === "maintenance"
                          ? "bg-red-600 text-white shadow-xs"
                          : "border border-line bg-surface text-ink-2 hover:bg-red-50 hover:text-red-700",
                      )}
                    >
                      {t("Maintenance")}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Add Vehicle / Transport */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("Add Vehicle / Transport")}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button form="create-vehicle-form" type="submit" variant="primary" loading={busy}>
              {t("Register Vehicle")}
            </Button>
          </>
        }
      >
        <form id="create-vehicle-form" onSubmit={handleCreate} className="space-y-3.5">
          <Field label={t("Vehicle Plate Number")}>
            {(id) => (
              <Input
                id={id}
                required
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                placeholder="e.g. DHAKA METRO-CHA 11-2233"
              />
            )}
          </Field>

          <Field label={t("Vehicle Type")}>
            {(id) => (
              <Select
                id={id}
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as "van" | "truck" | "pickup" | "bike")}
              >
                <option value="van">{t("Courier Van (Medium Transport)")}</option>
                <option value="truck">{t("Heavy Cargo Truck (Inter-District)")}</option>
                <option value="pickup">{t("Pickup Truck (Feeder Route)")}</option>
                <option value="bike">{t("Feeder Motorcycle")}</option>
              </Select>
            )}
          </Field>

          <Field label={t("Driver Full Name")}>
            {(id) => (
              <Input
                id={id}
                required
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="e.g. Md. Rafiqul Islam"
              />
            )}
          </Field>

          <Field label={t("Driver Phone Number")}>
            {(id) => (
              <Input
                id={id}
                required
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
              />
            )}
          </Field>

          <Field label={t("Payload Capacity (kg)")}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min="1"
                step="1"
                required
                value={capacityKg}
                onChange={(e) => setCapacityKg(e.target.value)}
              />
            )}
          </Field>

          <Field label={t("Starting / Current Hub (Optional)")}>
            {(id) => (
              <Select id={id} value={currentHubId} onChange={(e) => setCurrentHubId(e.target.value)}>
                <option value="">{t("Unassigned")}</option>
                {hubs?.map((hub) => (
                  <option key={hub._id} value={hub._id}>
                    {hub.name} ({hub.code})
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </form>
      </Modal>
    </div>
  );
}

/* ========================================================================= */
/* TAB 3: Transit Manifests & Dispatch Bags                                  */
/* ========================================================================= */

function ManifestsTab({ token }: { token: string }) {
  const manifests = useQuery(api.hubs.listManifests, { token });
  const hubs = useQuery(api.hubs.list, { token, status: "active" });
  const transports = useQuery(api.hubs.listTransports, { token, status: "available" });
  const packable = useQuery(api.hubs.packableParcels, { token });

  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "created" | "dispatched" | "received">("all");
  const [search, setSearch] = useState("");

  // Parcel inspection modal for a manifest
  const [viewingParcelIds, setViewingParcelIds] = useState<Id<"parcels">[] | null>(null);
  const [viewingManifestNumber, setViewingManifestNumber] = useState<string>("");
  const manifestParcels = useQuery(
    api.hubs.manifestParcels,
    viewingParcelIds ? { token, parcelIds: viewingParcelIds } : "skip",
  );

  const toast = useToast();
  const createManifest = useMutation(api.hubs.createManifest);
  const dispatchManifest = useMutation(api.hubs.dispatchManifest);
  const receiveManifest = useMutation(api.hubs.receiveManifest);

  // Form states for Create Manifest
  const [sourceHubId, setSourceHubId] = useState<string>("");
  const [destinationHubId, setDestinationHubId] = useState<string>("");
  const [transportId, setTransportId] = useState<string>("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<Id<"parcels">>>(new Set());
  const [parcelSearch, setParcelSearch] = useState("");
  const [busy, setBusy] = useState(false);

  // When vehicle changes, auto-fill driver details
  function onVehicleSelect(vId: string) {
    setTransportId(vId);
    if (!vId) return;
    const v = transports?.find((t) => t._id === vId);
    if (v) {
      setDriverName(v.driverName);
      setDriverPhone(v.driverPhone);
    }
  }

  function toggleParcelSelection(id: Id<"parcels">) {
    setSelectedParcelIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPackable() {
    if (!packable) return;
    setSelectedParcelIds(new Set(packable.map((p) => p._id)));
  }

  function deselectAllPackable() {
    setSelectedParcelIds(new Set());
  }

  async function handleCreateManifest(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceHubId || !destinationHubId) {
      toast.error(t("Please select both source and destination hubs."));
      return;
    }
    if (sourceHubId === destinationHubId) {
      toast.error(t("Source and destination hub cannot be the same."));
      return;
    }
    if (selectedParcelIds.size === 0) {
      toast.error(t("Please select at least 1 parcel to pack into this dispatch manifest."));
      return;
    }

    setBusy(true);
    try {
      await createManifest({
        token,
        sourceHubId: sourceHubId as Id<"hubs">,
        destinationHubId: destinationHubId as Id<"hubs">,
        parcelIds: Array.from(selectedParcelIds),
        transportId: transportId ? (transportId as Id<"transports">) : undefined,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      toast.ok(t("Transit manifest created with {n} parcels!", { n: selectedParcelIds.size }));
      setCreateOpen(false);
      setSelectedParcelIds(new Set());
      setSourceHubId("");
      setDestinationHubId("");
      setTransportId("");
      setDriverName("");
      setDriverPhone("");
      setNotes("");
    } catch (err: unknown) {
      toast.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function handleDispatch(id: Id<"manifests">, manifestNumber: string) {
    try {
      await dispatchManifest({ token, id });
      toast.ok(t("Manifest {code} dispatched into transit!", { code: manifestNumber }));
    } catch (err: unknown) {
      toast.error(err);
    }
  }

  async function handleReceive(id: Id<"manifests">, manifestNumber: string) {
    try {
      await receiveManifest({ token, id });
      toast.ok(
        t("Manifest {code} received at destination hub! All enclosed parcels marked at hub.", {
          code: manifestNumber,
        }),
      );
    } catch (err: unknown) {
      toast.error(err);
    }
  }

  const filteredManifests = useMemo(() => {
    if (!manifests) return [];
    return manifests.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.manifestNumber.toLowerCase().includes(q) ||
        m.sourceHubName.toLowerCase().includes(q) ||
        m.destinationHubName.toLowerCase().includes(q) ||
        (m.driverName && m.driverName.toLowerCase().includes(q)) ||
        (m.transportVehicleNumber && m.transportVehicleNumber.toLowerCase().includes(q))
      );
    });
  }, [manifests, statusFilter, search]);

  const filteredPackable = useMemo(() => {
    if (!packable) return [];
    if (!parcelSearch.trim()) return packable;
    const q = parcelSearch.toLowerCase();
    return packable.filter(
      (p) =>
        p.trackingCode.toLowerCase().includes(q) ||
        p.recipientName.toLowerCase().includes(q) ||
        p.recipientPhone.includes(q) ||
        p.district.toLowerCase().includes(q),
    );
  }, [packable, parcelSearch]);

  const selectedTotalWeight = useMemo(() => {
    if (!packable) return 0;
    return packable
      .filter((p) => selectedParcelIds.has(p._id))
      .reduce((sum, p) => sum + p.weightKg, 0);
  }, [packable, selectedParcelIds]);

  const selectedTotalCod = useMemo(() => {
    if (!packable) return 0;
    return packable
      .filter((p) => selectedParcelIds.has(p._id))
      .reduce((sum, p) => sum + p.codAmount, 0);
  }, [packable, selectedParcelIds]);

  if (manifests === undefined || hubs === undefined) return <Spinner className="py-12" />;

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64 sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search by manifest no, hub, vehicle...")}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "created" | "dispatched" | "received")}
            className="w-40"
          >
            <option value="all">{t("All Manifests")}</option>
            <option value="created">{t("Ready / Created")}</option>
            <option value="dispatched">{t("In Transit")}</option>
            <option value="received">{t("Received at Hub")}</option>
          </Select>
        </div>

        <Button size="md" variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
          {t("Create Dispatch Manifest")}
        </Button>
      </div>

      {/* Manifests List */}
      {filteredManifests.length === 0 ? (
        <Card className="p-8 text-center">
          <Empty
            icon={Layers}
            title={t("No transit manifests found")}
            text={t("Pack parcels into dispatch bags and route them between regional warehouses.")}
            action={
              <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
                {t("Create Dispatch Manifest")}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredManifests.map((m) => (
            <Card
              key={m._id}
              className="flex flex-wrap items-center justify-between gap-4 p-4 transition-all hover:shadow-md"
            >
              {/* Manifest Number & Hub Route */}
              <div className="flex items-center gap-3.5 min-w-[260px]">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand/10 text-brand">
                  <Package className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-extrabold text-ink">{m.manifestNumber}</span>
                    <Badge
                      tone={
                        m.status === "received"
                          ? "green"
                          : m.status === "dispatched"
                            ? "amber"
                            : "brand"
                      }
                    >
                      {m.status === "received"
                        ? t("Received")
                        : m.status === "dispatched"
                          ? t("In Transit")
                          : t("Ready to Dispatch")}
                    </Badge>
                  </div>

                  <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-ink-2">
                    <span>{m.sourceHubName}</span>
                    <ArrowRight className="size-3 text-ink-3" />
                    <span className="text-brand">{m.destinationHubName}</span>
                  </div>

                  <p className="mt-0.5 text-[11px] text-ink-3">
                    {t("Created:")} {dateTime(m.createdAt)}
                    {m.dispatchedAt && ` · ${t("Dispatched:")} ${dateTime(m.dispatchedAt)}`}
                    {m.receivedAt && ` · ${t("Received:")} ${dateTime(m.receivedAt)}`}
                  </p>
                </div>
              </div>

              {/* Vehicle & Driver Info */}
              <div className="text-xs text-ink-2">
                <p className="font-bold text-ink">
                  {m.parcelCount} {t("Parcels enclosed")}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Truck className="size-3.5 text-ink-3" />
                  <span>{m.transportVehicleNumber ?? t("No vehicle tag")}</span>
                </div>
                {m.driverName && (
                  <div className="mt-0.5 flex items-center gap-2">
                    <User className="size-3.5 text-ink-3" />
                    <span>
                      {m.driverName} {m.driverPhone && `(${m.driverPhone})`}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons: 1-Click Dispatch & 1-Click Receive */}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Eye}
                  onClick={() => {
                    setViewingParcelIds(m.parcelIds);
                    setViewingManifestNumber(m.manifestNumber);
                  }}
                  className="text-xs"
                >
                  {t("View Parcels")}
                </Button>

                {m.status === "created" && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Send}
                    onClick={() => handleDispatch(m._id, m.manifestNumber)}
                    className="text-xs shadow-sm shadow-brand/20"
                  >
                    {t("Dispatch Manifest")}
                  </Button>
                )}

                {m.status === "dispatched" && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={PackageCheck}
                    onClick={() => handleReceive(m._id, m.manifestNumber)}
                    className="bg-emerald-600 text-xs text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                  >
                    {t("Receive at Destination Hub")}
                  </Button>
                )}

                {m.status === "received" && (
                  <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="size-3.5" />
                    {t("Archived & Transferred")}
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal: Create Dispatch Manifest */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("Create Dispatch Manifest")}
        wide
        footer={
          <>
            <div className="mr-auto text-xs text-ink-2">
              <span className="font-bold text-ink">{selectedParcelIds.size}</span> {t("parcels selected")}
              {selectedParcelIds.size > 0 && (
                <>
                  {" · "}
                  <span>{selectedTotalWeight.toFixed(1)} kg</span>
                  {" · "}
                  <span className="font-semibold text-brand">{tk(selectedTotalCod)}</span>
                </>
              )}
            </div>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              {t("Cancel")}
            </Button>
            <Button
              form="create-manifest-form"
              type="submit"
              variant="primary"
              loading={busy}
              disabled={selectedParcelIds.size === 0}
            >
              {t("Create Manifest ({n})", { n: selectedParcelIds.size })}
            </Button>
          </>
        }
      >
        <form id="create-manifest-form" onSubmit={handleCreateManifest} className="space-y-4">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label={t("Source Hub (Origin)")}>
              {(id) => (
                <Select
                  id={id}
                  required
                  value={sourceHubId}
                  onChange={(e) => setSourceHubId(e.target.value)}
                >
                  <option value="">{t("Select Origin Hub...")}</option>
                  {hubs?.map((hub) => (
                    <option key={hub._id} value={hub._id}>
                      {hub.name} ({hub.code})
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={t("Destination Hub")}>
              {(id) => (
                <Select
                  id={id}
                  required
                  value={destinationHubId}
                  onChange={(e) => setDestinationHubId(e.target.value)}
                >
                  <option value="">{t("Select Destination Hub...")}</option>
                  {hubs
                    ?.filter((hub) => hub._id !== sourceHubId)
                    .map((hub) => (
                      <option key={hub._id} value={hub._id}>
                        {hub.name} ({hub.code})
                      </option>
                    ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            <Field label={t("Assign Vehicle / Transport")}>
              {(id) => (
                <Select id={id} value={transportId} onChange={(e) => onVehicleSelect(e.target.value)}>
                  <option value="">{t("Select Available Vehicle...")}</option>
                  {transports?.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.vehicleNumber} ({v.vehicleType.toUpperCase()} - {v.capacityKg} kg)
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={t("Driver Name")}>
              {(id) => (
                <Input
                  id={id}
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Driver Name"
                />
              )}
            </Field>

            <Field label={t("Driver Phone")}>
              {(id) => (
                <Input
                  id={id}
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                />
              )}
            </Field>
          </div>

          <Field label={t("Transit / Dispatch Notes (Optional)")}>
            {(id) => (
              <Textarea
                id={id}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bag seals, route details, priority instructions..."
                className="min-h-16"
              />
            )}
          </Field>

          {/* Parcel Selection Table */}
          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-ink">{t("Select Parcels to Pack")}</h4>
                <p className="text-xs text-ink-3">
                  {t("Parcels currently marked at hub or picked up ready for transfer.")}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={selectAllPackable} className="text-xs">
                  {t("Select All")}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={deselectAllPackable} className="text-xs">
                  {t("Deselect")}
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <Input
                value={parcelSearch}
                onChange={(e) => setParcelSearch(e.target.value)}
                placeholder={t("Filter parcels by tracking code, recipient, area...")}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl border border-line bg-page p-2 space-y-1.5">
              {filteredPackable.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-3">
                  {t("No packable parcels found for transfer.")}
                </p>
              ) : (
                filteredPackable.map((p) => {
                  const checked = selectedParcelIds.has(p._id);
                  return (
                    <label
                      key={p._id}
                      className={cx(
                        "flex cursor-pointer items-center justify-between rounded-xl p-2.5 text-xs transition-colors",
                        checked
                          ? "bg-brand/10 border border-brand/30"
                          : "bg-surface border border-line hover:bg-navy-50 dark:hover:bg-navy-900/40",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleParcelSelection(p._id)}
                          className="size-4 rounded border-line text-brand focus:ring-brand"
                        />
                        <div className="min-w-0">
                          <p className="font-mono font-bold text-ink truncate">{p.trackingCode}</p>
                          <p className="truncate text-ink-3">
                            {p.recipientName} · {p.recipientPhone} · {p.district}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-semibold text-ink">{p.weightKg} kg</p>
                        <p className="text-brand font-bold">{tk(p.codAmount)}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* Modal: View Enclosed Parcels */}
      <Modal
        open={viewingParcelIds !== null}
        onClose={() => setViewingParcelIds(null)}
        title={t("Enclosed Parcels: {code}", { code: viewingManifestNumber })}
        wide
        footer={
          <Button variant="outline" onClick={() => setViewingParcelIds(null)}>
            {t("Close")}
          </Button>
        }
      >
        <div className="space-y-3">
          {manifestParcels === undefined ? (
            <Spinner className="py-8" />
          ) : manifestParcels.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-3">{t("No parcel details available.")}</p>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {manifestParcels.map((p) => (
                <div
                  key={p._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-page p-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-mono font-bold text-ink">{p.trackingCode}</p>
                    <p className="text-ink-2 font-medium">
                      {p.recipientName} ({p.recipientPhone})
                    </p>
                    <p className="text-ink-3 truncate max-w-sm">
                      {p.recipientAddress}, {p.district}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <Badge tone="brand">{p.status.toUpperCase()}</Badge>
                    <p className="mt-1 font-semibold text-ink">{p.weightKg} kg</p>
                    <p className="font-bold text-brand">{tk(p.codAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export default HubsPage;
