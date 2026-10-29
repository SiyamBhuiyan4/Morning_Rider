import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  Banknote,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  Phone,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useAuthed } from "../lib/session";
import { useToast } from "../lib/toast";
import { dateTime, num, tk } from "../lib/format";
import {
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
  cx,
} from "../components/ui";
import { t } from "../lib/prefs";

type TabKey = "directory" | "attendance" | "payroll";
type Department = "logistics" | "operations" | "finance" | "support" | "management";
type EmployeeStatus = "active" | "on_leave" | "terminated";
type AttendanceStatus = "present" | "absent" | "late" | "leave";
type PayrollStatus = "draft" | "approved" | "paid";

const DEPARTMENTS: { id: Department; label: string; tone: string }[] = [
  { id: "logistics", label: "Logistics", tone: "bg-blue-50 text-blue-700" },
  { id: "operations", label: "Operations", tone: "bg-amber-50 text-amber-700" },
  { id: "finance", label: "Finance", tone: "bg-emerald-50 text-emerald-700" },
  { id: "support", label: "Support", tone: "bg-purple-50 text-purple-700" },
  { id: "management", label: "Management", tone: "bg-indigo-50 text-indigo-700" },
];

const EMPLOYEE_STATUS: Record<EmployeeStatus, { label: string; tone: string; dot: string }> = {
  active: { label: "Active", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  on_leave: { label: "On Leave", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  terminated: { label: "Terminated", tone: "bg-red-50 text-red-700", dot: "bg-red-500" },
};

const ATTENDANCE_STATUS: Record<AttendanceStatus, { label: string; tone: string; dot: string }> = {
  present: { label: "Present", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  late: { label: "Late", tone: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  leave: { label: "Leave", tone: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  absent: { label: "Absent", tone: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
};

const PAYROLL_STATUS: Record<PayrollStatus, { label: string; tone: string; dot: string }> = {
  draft: { label: "Draft", tone: "bg-slate-100 text-slate-700", dot: "bg-slate-400" },
  approved: { label: "Approved", tone: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  paid: { label: "Paid", tone: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
};

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash" },
  { id: "bkash", label: "bKash" },
  { id: "nagad", label: "Nagad" },
  { id: "rocket", label: "Rocket" },
  { id: "bank", label: "Bank Transfer" },
];

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getCurrentMonthString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function HRM() {
  const [tab, setTab] = useState<TabKey>("directory");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("HRM & Payroll")}
        subtitle={t("Manage staff directory, monitor daily attendance, and process monthly payroll.")}
      />

      {/* Tabs */}
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTab("directory")}
          className={cx(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap",
            tab === "directory"
              ? "border-brand text-brand"
              : "border-transparent text-ink-3 hover:text-ink hover:border-line",
          )}
        >
          <Users className="size-4" />
          {t("Staff Directory")}
        </button>
        <button
          onClick={() => setTab("attendance")}
          className={cx(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap",
            tab === "attendance"
              ? "border-brand text-brand"
              : "border-transparent text-ink-3 hover:text-ink hover:border-line",
          )}
        >
          <CalendarCheck className="size-4" />
          {t("Daily Attendance")}
        </button>
        <button
          onClick={() => setTab("payroll")}
          className={cx(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap",
            tab === "payroll"
              ? "border-brand text-brand"
              : "border-transparent text-ink-3 hover:text-ink hover:border-line",
          )}
        >
          <Banknote className="size-4" />
          {t("Monthly Payroll")}
        </button>
      </div>

      {tab === "directory" && <StaffDirectoryTab />}
      {tab === "attendance" && <DailyAttendanceTab />}
      {tab === "payroll" && <MonthlyPayrollTab />}
    </div>
  );
}

export default HRM;

/* -------------------------------------------------------------------------- */
/* TAB 1: Staff Directory                                                     */
/* -------------------------------------------------------------------------- */

function StaffDirectoryTab() {
  const { token } = useAuthed();
  const [statusFilter, setStatusFilter] = useState<"all" | EmployeeStatus>("all");
  const [search, setSearch] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [statusModalEmployee, setStatusModalEmployee] = useState<Doc<"employees"> | null>(null);

  const employees = useQuery(
    api.hrm.listEmployees,
    statusFilter === "all" ? { token } : { token, status: statusFilter },
  );

  const activeCount = employees?.filter((e) => e.status === "active").length ?? 0;
  const leaveCount = employees?.filter((e) => e.status === "on_leave").length ?? 0;
  const terminatedCount = employees?.filter((e) => e.status === "terminated").length ?? 0;
  const totalSalary = useMemo(() => {
    return employees?.filter((e) => e.status === "active").reduce((sum, e) => sum + e.baseSalary, 0) ?? 0;
  }, [employees]);

  const filtered = useMemo(() => {
    if (!employees) return [];
    const q = search.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.phone.toLowerCase().includes(q) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        e.designation.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q),
    );
  }, [employees, search]);

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t("Total Staff")}
          value={num(employees?.length ?? 0)}
          icon={Users}
          accent="navy"
        />
        <StatCard
          label={t("Active Staff")}
          value={num(activeCount)}
          icon={UserCheck}
          accent="green"
        />
        <StatCard
          label={t("On Leave")}
          value={num(leaveCount)}
          icon={Calendar}
          accent="sun"
        />
        <StatCard
          label={t("Monthly Base Payroll")}
          value={tk(totalSalary)}
          icon={Banknote}
          accent="brand"
        />
      </div>

      {/* Action / Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1 sm:max-w-xs">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search name, phone, dept…")}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(["all", "active", "on_leave", "terminated"] as const).map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={statusFilter === st ? "dark" : "outline"}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === "all"
                    ? t("All")
                    : st === "active"
                      ? `${t("Active")} (${num(activeCount)})`
                      : st === "on_leave"
                        ? `${t("On Leave")} (${num(leaveCount)})`
                        : `${t("Terminated")} (${num(terminatedCount)})`}
                </Button>
              ))}
            </div>
          </div>
          <Button
            variant="primary"
            icon={UserPlus}
            onClick={() => setAddModalOpen(true)}
          >
            {t("Add Staff")}
          </Button>
        </div>
      </Card>

      {/* Staff Table */}
      <Card className="overflow-hidden">
        {employees === undefined ? (
          <Spinner />
        ) : filtered.length === 0 ? (
          <Empty
            icon={Users}
            title={t("No staff found")}
            text={
              search
                ? t("No staff match your search criteria.")
                : t("Start building your team by adding staff members.")
            }
            action={
              !search ? (
                <Button variant="primary" icon={UserPlus} onClick={() => setAddModalOpen(true)}>
                  {t("Add Staff Member")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-page/60 text-xs font-bold uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-5 py-3.5">{t("Staff Member")}</th>
                  <th className="px-5 py-3.5">{t("Designation & Dept")}</th>
                  <th className="px-5 py-3.5">{t("Contact")}</th>
                  <th className="px-5 py-3.5">{t("Base Salary")}</th>
                  <th className="px-5 py-3.5">{t("Join Date")}</th>
                  <th className="px-5 py-3.5">{t("Status")}</th>
                  <th className="px-5 py-3.5 text-right">{t("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((emp) => {
                  const deptMeta = DEPARTMENTS.find((d) => d.id === emp.department);
                  const st = EMPLOYEE_STATUS[emp.status];
                  return (
                    <tr key={emp._id} className="transition hover:bg-page/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy-50 font-bold text-navy-800 dark:bg-navy-800 dark:text-sky-300">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-ink">{emp.name}</p>
                            {emp.email && <p className="text-xs text-ink-3">{emp.email}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-ink">{emp.designation}</p>
                        <span
                          className={cx(
                            "inline-block rounded-md px-2 py-0.5 mt-0.5 text-xs font-semibold capitalize",
                            deptMeta?.tone ?? "bg-slate-100 text-slate-700",
                          )}
                        >
                          {deptMeta?.label ?? emp.department}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <a
                          href={`tel:${emp.phone}`}
                          className="flex items-center gap-1.5 text-sm font-medium text-ink hover:text-brand"
                        >
                          <Phone className="size-3.5 text-ink-3" />
                          {emp.phone}
                        </a>
                      </td>
                      <td className="px-5 py-4 font-bold text-ink">
                        {tk(emp.baseSalary)}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-ink-2">
                        {emp.joinDate}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cx(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                            st.tone,
                          )}
                        >
                          <span className={cx("size-1.5 rounded-full", st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setStatusModalEmployee(emp)}
                        >
                          {t("Change Status")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Staff Modal */}
      {addModalOpen && (
        <AddStaffModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {/* Change Status Modal */}
      {statusModalEmployee && (
        <ChangeStatusModal
          employee={statusModalEmployee}
          onClose={() => setStatusModalEmployee(null)}
        />
      )}
    </div>
  );
}

function AddStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { token } = useAuthed();
  const toast = useToast();
  const createEmployee = useMutation(api.hrm.createEmployee);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState<Department>("operations");
  const [baseSalary, setBaseSalary] = useState("25000");
  const [joinDate, setJoinDate] = useState(getTodayString());
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const salaryNum = parseFloat(baseSalary);
    if (isNaN(salaryNum) || salaryNum < 0) {
      toast.error(t("Please enter a valid base salary."));
      return;
    }
    setLoading(true);
    try {
      await createEmployee({
        token,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        designation: designation.trim(),
        department,
        baseSalary: salaryNum,
        joinDate,
      });
      toast.ok(t("Staff member added successfully."));
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("Add New Staff Member")} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Full Name")}>
            {(id) => (
              <Input
                id={id}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("e.g. Tanvir Hasan")}
              />
            )}
          </Field>
          <Field label={t("Phone Number")}>
            {(id) => (
              <Input
                id={id}
                required
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("01712345678")}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("Email Address (Optional)")}>
            {(id) => (
              <Input
                id={id}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("tanvir@morningrider.com")}
              />
            )}
          </Field>
          <Field label={t("Designation")}>
            {(id) => (
              <Input
                id={id}
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder={t("e.g. Operations Coordinator")}
              />
            )}
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={t("Department")}>
            {(id) => (
              <Select
                id={id}
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label={t("Base Monthly Salary (৳)")}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min="0"
                step="500"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
              />
            )}
          </Field>

          <Field label={t("Joining Date")}>
            {(id) => (
              <Input
                id={id}
                type="date"
                required
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
              />
            )}
          </Field>
        </div>

        <div className="mt-6 flex justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {t("Create Employee")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ChangeStatusModal({
  employee,
  onClose,
}: {
  employee: Doc<"employees">;
  onClose: () => void;
}) {
  const { token } = useAuthed();
  const toast = useToast();
  const updateStatus = useMutation(api.hrm.updateEmployeeStatus);
  const [status, setStatus] = useState<EmployeeStatus>(employee.status);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await updateStatus({
        token,
        employeeId: employee._id,
        status,
      });
      toast.ok(t("Status updated for {name}.", { name: employee.name }));
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={t("Update Employee Status")}>
      <div className="space-y-4">
        <p className="text-sm text-ink-2">
          {t("Update work status for")} <strong className="text-ink">{employee.name}</strong> ({employee.designation}).
        </p>
        <div className="space-y-2">
          {(["active", "on_leave", "terminated"] as const).map((st) => {
            const meta = EMPLOYEE_STATUS[st];
            const isSelected = status === st;
            return (
              <label
                key={st}
                className={cx(
                  "flex items-center justify-between rounded-xl border p-3 cursor-pointer transition",
                  isSelected
                    ? "border-brand bg-brand-50/20 text-brand"
                    : "border-line bg-surface hover:bg-page text-ink",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="employeeStatus"
                    value={st}
                    checked={isSelected}
                    onChange={() => setStatus(st)}
                    className="size-4 text-brand focus:ring-brand"
                  />
                  <span className="font-semibold text-sm">{meta.label}</span>
                </div>
                <span className={cx("size-2 rounded-full", meta.dot)} />
              </label>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-line">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button variant="primary" loading={loading} onClick={handleSave}>
            {t("Save Changes")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* TAB 2: Daily Attendance                                                    */
/* -------------------------------------------------------------------------- */

type AttendanceRecord = {
  _id: Id<"attendance">;
  _creationTime: number;
  employeeId: Id<"employees">;
  date: string;
  status: AttendanceStatus;
  clockIn?: string;
  clockOut?: string;
  notes?: string;
  createdAt: number;
  employeeName: string;
  employeePhone: string;
  department?: string;
  designation?: string;
};

function DailyAttendanceTab() {
  const { token } = useAuthed();
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [markingModalRow, setMarkingModalRow] = useState<{
    employeeId: Id<"employees">;
    employeeName: string;
    date: string;
    status: AttendanceStatus;
    clockIn?: string;
    clockOut?: string;
    notes?: string;
  } | null>(null);

  // Load all active and on_leave employees
  const employees = useQuery(api.hrm.listEmployees, { token });
  const attendanceRecords = useQuery(api.hrm.getAttendance, {
    token,
    date: selectedDate,
  });

  const markAttendance = useMutation(api.hrm.markAttendance);

  const attendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    if (attendanceRecords) {
      for (const rec of attendanceRecords) {
        map.set(rec.employeeId, rec as AttendanceRecord);
      }
    }
    return map;
  }, [attendanceRecords]);

  // Non-terminated employees
  const staffList = useMemo(() => {
    if (!employees) return [];
    return employees.filter((e) => e.status !== "terminated");
  }, [employees]);

  // Attendance metrics
  const stats = useMemo(() => {
    let present = 0;
    let late = 0;
    let leave = 0;
    let absent = 0;

    if (attendanceRecords) {
      for (const r of attendanceRecords) {
        if (r.status === "present") present++;
        else if (r.status === "late") late++;
        else if (r.status === "leave") leave++;
        else if (r.status === "absent") absent++;
      }
    }
    return { present, late, leave, absent };
  }, [attendanceRecords]);

  async function handleQuickMark(
    employeeId: Id<"employees">,
    employeeName: string,
    status: AttendanceStatus,
  ) {
    const existing = attendanceMap.get(employeeId);
    let clockIn = existing?.clockIn;

    // Auto fill clock-in time if marking present or late today and none set
    if ((status === "present" || status === "late") && !clockIn) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      clockIn = `${hh}:${mm}`;
    }

    try {
      await markAttendance({
        token,
        employeeId,
        date: selectedDate,
        status,
        clockIn,
      });
      toast.ok(t("Marked {status} for {name}.", { status, name: employeeName }));
    } catch (err) {
      toast.error(err);
    }
  }

  async function handleMarkAllPresent() {
    if (!staffList.length) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const clockIn = `${hh}:${mm}`;

    let count = 0;
    try {
      for (const staff of staffList) {
        const existing = attendanceMap.get(staff._id);
        if (!existing || existing.status === "absent") {
          await markAttendance({
            token,
            employeeId: staff._id,
            date: selectedDate,
            status: "present",
            clockIn,
          });
          count++;
        }
      }
      toast.ok(t("Marked {n} staff members as present.", { n: count }));
    } catch (err) {
      toast.error(err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Date selector and summary stats */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Field label={t("Select Date")} className="space-y-1">
              {() => (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-44"
                  />
                  <Button
                    size="sm"
                    variant={selectedDate === getTodayString() ? "dark" : "outline"}
                    onClick={() => setSelectedDate(getTodayString())}
                  >
                    {t("Today")}
                  </Button>
                </div>
              )}
            </Field>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={CheckCircle2}
            onClick={handleMarkAllPresent}
          >
            {t("Mark Unmarked as Present")}
          </Button>
        </div>
      </Card>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t("Present")}
          value={num(stats.present)}
          icon={CheckCircle2}
          accent="green"
        />
        <StatCard
          label={t("Late")}
          value={num(stats.late)}
          icon={Clock}
          accent="sun"
        />
        <StatCard
          label={t("On Leave")}
          value={num(stats.leave)}
          icon={Calendar}
          accent="navy"
        />
        <StatCard
          label={t("Absent")}
          value={num(stats.absent)}
          icon={XCircle}
          accent="red"
        />
      </div>

      {/* Daily Attendance Table */}
      <Card className="overflow-hidden">
        {employees === undefined || attendanceRecords === undefined ? (
          <Spinner />
        ) : staffList.length === 0 ? (
          <Empty
            icon={Users}
            title={t("No active staff")}
            text={t("Add employees to the staff directory to record daily attendance.")}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-page/60 text-xs font-bold uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-5 py-3.5">{t("Staff Member")}</th>
                  <th className="px-5 py-3.5">{t("Department")}</th>
                  <th className="px-5 py-3.5">{t("Status")}</th>
                  <th className="px-5 py-3.5">{t("Clock In / Out")}</th>
                  <th className="px-5 py-3.5">{t("Notes")}</th>
                  <th className="px-5 py-3.5 text-center">{t("Quick Mark")}</th>
                  <th className="px-5 py-3.5 text-right">{t("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {staffList.map((emp) => {
                  const record = attendanceMap.get(emp._id);
                  const st = record ? ATTENDANCE_STATUS[record.status] : null;

                  return (
                    <tr key={emp._id} className="transition hover:bg-page/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy-50 font-bold text-navy-800 dark:bg-navy-800 dark:text-sky-300">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-ink">{emp.name}</p>
                            <p className="text-xs text-ink-3">{emp.designation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-md bg-page text-ink-2">
                          {emp.department}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {st ? (
                          <span
                            className={cx(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                              st.tone,
                            )}
                          >
                            <span className={cx("size-1.5 rounded-full", st.dot)} />
                            {st.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                            <span className="size-1.5 rounded-full bg-slate-400" />
                            {t("Unmarked")}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs font-medium text-ink-2">
                        {record?.clockIn ? (
                          <span>
                            {record.clockIn}
                            {record.clockOut ? ` - ${record.clockOut}` : ""}
                          </span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-ink-3 max-w-40 truncate">
                        {record?.notes || "—"}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            title={t("Mark Present")}
                            onClick={() => handleQuickMark(emp._id, emp.name, "present")}
                            className={cx(
                              "px-2.5 py-1 text-xs font-bold rounded-lg transition",
                              record?.status === "present"
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                            )}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            title={t("Mark Late")}
                            onClick={() => handleQuickMark(emp._id, emp.name, "late")}
                            className={cx(
                              "px-2.5 py-1 text-xs font-bold rounded-lg transition",
                              record?.status === "late"
                                ? "bg-amber-600 text-white shadow-sm"
                                : "bg-amber-50 text-amber-700 hover:bg-amber-100",
                            )}
                          >
                            L
                          </button>
                          <button
                            type="button"
                            title={t("Mark Leave")}
                            onClick={() => handleQuickMark(emp._id, emp.name, "leave")}
                            className={cx(
                              "px-2.5 py-1 text-xs font-bold rounded-lg transition",
                              record?.status === "leave"
                                ? "bg-sky-600 text-white shadow-sm"
                                : "bg-sky-50 text-sky-700 hover:bg-sky-100",
                            )}
                          >
                            Lv
                          </button>
                          <button
                            type="button"
                            title={t("Mark Absent")}
                            onClick={() => handleQuickMark(emp._id, emp.name, "absent")}
                            className={cx(
                              "px-2.5 py-1 text-xs font-bold rounded-lg transition",
                              record?.status === "absent"
                                ? "bg-rose-600 text-white shadow-sm"
                                : "bg-rose-50 text-rose-700 hover:bg-rose-100",
                            )}
                          >
                            A
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit3}
                          onClick={() =>
                            setMarkingModalRow({
                              employeeId: emp._id,
                              employeeName: emp.name,
                              date: selectedDate,
                              status: record?.status ?? "present",
                              clockIn: record?.clockIn,
                              clockOut: record?.clockOut,
                              notes: record?.notes,
                            })
                          }
                        >
                          {t("Edit")}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Attendance Detail / Edit Modal */}
      {markingModalRow && (
        <EditAttendanceModal
          data={markingModalRow}
          onClose={() => setMarkingModalRow(null)}
        />
      )}
    </div>
  );
}

function EditAttendanceModal({
  data,
  onClose,
}: {
  data: {
    employeeId: Id<"employees">;
    employeeName: string;
    date: string;
    status: AttendanceStatus;
    clockIn?: string;
    clockOut?: string;
    notes?: string;
  };
  onClose: () => void;
}) {
  const { token } = useAuthed();
  const toast = useToast();
  const markAttendance = useMutation(api.hrm.markAttendance);

  const [status, setStatus] = useState<AttendanceStatus>(data.status);
  const [clockIn, setClockIn] = useState(data.clockIn ?? "");
  const [clockOut, setClockOut] = useState(data.clockOut ?? "");
  const [notes, setNotes] = useState(data.notes ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await markAttendance({
        token,
        employeeId: data.employeeId,
        date: data.date,
        status,
        clockIn: clockIn.trim() || undefined,
        clockOut: clockOut.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.ok(t("Attendance updated for {name}.", { name: data.employeeName }));
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={t("Attendance Details")}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <p className="text-sm text-ink-2">
            {t("Staff")}: <strong className="text-ink">{data.employeeName}</strong> &bull; {t("Date")}: <strong>{data.date}</strong>
          </p>
        </div>

        <Field label={t("Attendance Status")}>
          {(id) => (
            <Select
              id={id}
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            >
              <option value="present">{t("Present")}</option>
              <option value="late">{t("Late")}</option>
              <option value="leave">{t("Leave")}</option>
              <option value="absent">{t("Absent")}</option>
            </Select>
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Clock In Time")}>
            {(id) => (
              <Input
                id={id}
                type="text"
                placeholder="09:00"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("Clock Out Time")}>
            {(id) => (
              <Input
                id={id}
                type="text"
                placeholder="18:00"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label={t("Notes / Remarks")}>
          {(id) => (
            <Input
              id={id}
              type="text"
              placeholder={t("Optional remarks…")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>

        <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {t("Save Attendance")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* TAB 3: Monthly Payroll                                                     */
/* -------------------------------------------------------------------------- */

type PayrollRecord = {
  _id: Id<"payroll">;
  _creationTime: number;
  employeeId: Id<"employees">;
  month: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: PayrollStatus;
  paidAt?: number;
  paymentMethod?: string;
  notes?: string;
  createdAt: number;
  employeeName: string;
  employeePhone: string;
  department?: string;
  designation?: string;
};

function MonthlyPayrollTab() {
  const { token } = useAuthed();
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [statusFilter, setStatusFilter] = useState<"all" | PayrollStatus>("all");

  const [generating, setGenerating] = useState(false);
  const [disburseModalRow, setDisburseModalRow] = useState<PayrollRecord | null>(null);
  const [adjustModalRow, setAdjustModalRow] = useState<PayrollRecord | null>(null);

  const payrollRows = useQuery(
    api.hrm.listPayroll,
    statusFilter === "all"
      ? { token, month: selectedMonth }
      : { token, month: selectedMonth, status: statusFilter },
  );

  const generatePayroll = useMutation(api.hrm.generateMonthlyPayroll);

  const stats = useMemo(() => {
    let totalNet = 0;
    let disbursed = 0;
    let pending = 0;
    let paidCount = 0;

    if (payrollRows) {
      for (const row of payrollRows) {
        totalNet += row.netSalary;
        if (row.status === "paid") {
          disbursed += row.netSalary;
          paidCount++;
        } else {
          pending += row.netSalary;
        }
      }
    }

    return { totalNet, disbursed, pending, paidCount };
  }, [payrollRows]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await generatePayroll({
        token,
        month: selectedMonth,
      });
      toast.ok(
        t("Generated {n} payroll records for {month} ({skip} already existed).", {
          n: res.generatedCount,
          month: res.month,
          skip: res.skippedCount,
        }),
      );
    } catch (err) {
      toast.error(err);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Month Picker & Actions */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Field label={t("Select Month")} className="space-y-1">
              {() => (
                <div className="flex items-center gap-2">
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-48"
                  />
                  <Button
                    size="sm"
                    variant={selectedMonth === getCurrentMonthString() ? "dark" : "outline"}
                    onClick={() => setSelectedMonth(getCurrentMonthString())}
                  >
                    {t("This Month")}
                  </Button>
                </div>
              )}
            </Field>

            <div className="flex items-center gap-1.5 pt-4">
              {(["all", "draft", "approved", "paid"] as const).map((st) => (
                <Button
                  key={st}
                  size="sm"
                  variant={statusFilter === st ? "dark" : "outline"}
                  onClick={() => setStatusFilter(st)}
                >
                  {st === "all"
                    ? t("All")
                    : st === "draft"
                      ? t("Draft")
                      : st === "approved"
                        ? t("Approved")
                        : t("Paid")}
                </Button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Button
              variant="primary"
              icon={Sparkles}
              loading={generating}
              onClick={handleGenerate}
            >
              {t("Generate Payroll for Month")}
            </Button>
          </div>
        </div>
      </Card>

      {/* Month Financial Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label={t("Total Net Payroll")}
          value={tk(stats.totalNet)}
          icon={Banknote}
          accent="brand"
        />
        <StatCard
          label={t("Disbursed / Paid")}
          value={tk(stats.disbursed)}
          icon={CheckCircle2}
          accent="green"
        />
        <StatCard
          label={t("Pending Disbursal")}
          value={tk(stats.pending)}
          icon={Clock}
          accent="sun"
        />
        <StatCard
          label={t("Paid Staff")}
          value={`${stats.paidCount} / ${payrollRows?.length ?? 0}`}
          icon={Users}
          accent="navy"
        />
      </div>

      {/* Payroll Table */}
      <Card className="overflow-hidden">
        {payrollRows === undefined ? (
          <Spinner />
        ) : payrollRows.length === 0 ? (
          <Empty
            icon={Banknote}
            title={t("No payroll records")}
            text={t("Generate payroll for {month} to create salary sheets for active staff.", {
              month: selectedMonth,
            })}
            action={
              <Button
                variant="primary"
                icon={Sparkles}
                loading={generating}
                onClick={handleGenerate}
              >
                {t("Generate Payroll Now")}
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-page/60 text-xs font-bold uppercase tracking-wider text-ink-3">
                <tr>
                  <th className="px-5 py-3.5">{t("Staff Member")}</th>
                  <th className="px-5 py-3.5">{t("Department")}</th>
                  <th className="px-5 py-3.5 text-right">{t("Base Salary")}</th>
                  <th className="px-5 py-3.5 text-right">{t("Bonus")}</th>
                  <th className="px-5 py-3.5 text-right">{t("Deductions")}</th>
                  <th className="px-5 py-3.5 text-right">{t("Net Salary")}</th>
                  <th className="px-5 py-3.5">{t("Status")}</th>
                  <th className="px-5 py-3.5 text-right">{t("Action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payrollRows.map((row) => {
                  const st = PAYROLL_STATUS[row.status as PayrollStatus];
                  const isPaid = row.status === "paid";

                  return (
                    <tr key={row._id} className="transition hover:bg-page/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-navy-50 font-bold text-navy-800 dark:bg-navy-800 dark:text-sky-300">
                            {row.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-ink">{row.employeeName}</p>
                            <p className="text-xs text-ink-3">{row.designation}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-md bg-page text-ink-2">
                          {row.department ?? "—"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-ink">
                        {tk(row.baseSalary)}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-emerald-600">
                        {row.bonus > 0 ? `+${tk(row.bonus)}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-medium text-rose-600">
                        {row.deductions > 0 ? `-${tk(row.deductions)}` : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-extrabold text-ink text-base">
                        {tk(row.netSalary)}
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <span
                            className={cx(
                              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                              st.tone,
                            )}
                          >
                            <span className={cx("size-1.5 rounded-full", st.dot)} />
                            {st.label}
                          </span>
                          {isPaid && row.paidAt && (
                            <p className="text-[11px] text-ink-3 mt-1">
                              {dateTime(row.paidAt)} &bull; {row.paymentMethod}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isPaid ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAdjustModalRow(row as PayrollRecord)}
                              >
                                {t("Adjust")}
                              </Button>
                              <Button
                                size="sm"
                                variant="primary"
                                icon={CreditCard}
                                onClick={() => setDisburseModalRow(row as PayrollRecord)}
                              >
                                {t("Disburse")}
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="size-4" />
                              {t("Disbursed")}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Adjust Row Modal */}
      {adjustModalRow && (
        <AdjustPayrollModal
          row={adjustModalRow}
          onClose={() => setAdjustModalRow(null)}
        />
      )}

      {/* Disburse Salary Modal */}
      {disburseModalRow && (
        <DisburseSalaryModal
          row={disburseModalRow}
          onClose={() => setDisburseModalRow(null)}
        />
      )}
    </div>
  );
}

function AdjustPayrollModal({
  row,
  onClose,
}: {
  row: PayrollRecord;
  onClose: () => void;
}) {
  const { token } = useAuthed();
  const toast = useToast();
  const updateRow = useMutation(api.hrm.updatePayrollRow);

  const [bonus, setBonus] = useState(String(row.bonus ?? 0));
  const [deductions, setDeductions] = useState(String(row.deductions ?? 0));
  const [notes, setNotes] = useState(row.notes ?? "");
  const [loading, setLoading] = useState(false);

  const bonusNum = parseFloat(bonus) || 0;
  const dedNum = parseFloat(deductions) || 0;
  const computedNet = Math.max(0, row.baseSalary + bonusNum - dedNum);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateRow({
        token,
        payrollId: row._id,
        bonus: bonusNum,
        deductions: dedNum,
        notes: notes.trim() || undefined,
      });
      toast.ok(t("Payroll updated for {name}.", { name: row.employeeName }));
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={t("Adjust Payroll")}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <p className="text-sm text-ink-2">
            {t("Staff")}: <strong className="text-ink">{row.employeeName}</strong> &bull; {t("Month")}: <strong>{row.month}</strong>
          </p>
          <p className="text-xs text-ink-3 mt-0.5">
            {t("Base salary")}: <strong className="text-ink">{tk(row.baseSalary)}</strong>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Bonus (৳)")}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min="0"
                step="100"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
              />
            )}
          </Field>
          <Field label={t("Deductions (৳)")}>
            {(id) => (
              <Input
                id={id}
                type="number"
                min="0"
                step="100"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
              />
            )}
          </Field>
        </div>

        <Field label={t("Notes / Remarks")}>
          {(id) => (
            <Input
              id={id}
              placeholder={t("e.g. Festival bonus, 1 day unpaid leave deduction")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>

        <div className="rounded-xl bg-page p-3 text-center">
          <p className="text-xs text-ink-3">{t("Calculated Net Salary")}</p>
          <p className="text-xl font-extrabold text-ink">{tk(computedNet)}</p>
        </div>

        <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-line">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {t("Save Changes")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DisburseSalaryModal({
  row,
  onClose,
}: {
  row: PayrollRecord;
  onClose: () => void;
}) {
  const { token } = useAuthed();
  const toast = useToast();
  const disburse = useMutation(api.hrm.disburseSalary);

  const [paymentMethod, setPaymentMethod] = useState("bKash");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleDisburse() {
    setLoading(true);
    try {
      await disburse({
        token,
        payrollId: row._id,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      toast.ok(
        t("Salary of {amount} disbursed to {name} via {method} and recorded in Accounts Transactions!", {
          amount: tk(row.netSalary),
          name: row.employeeName,
          method: paymentMethod,
        }),
      );
      onClose();
    } catch (err) {
      toast.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={t("Disburse Salary")}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand/20 bg-brand-50/20 p-4 text-center">
          <p className="text-xs font-semibold text-brand tracking-wider uppercase">
            {t("Disbursing Net Salary")}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-ink">{tk(row.netSalary)}</p>
          <p className="mt-1 text-xs text-ink-2">
            {row.employeeName} &bull; {row.department} &bull; {row.month}
          </p>
        </div>

        <p className="text-xs text-ink-3">
          {t(
            "This action marks the salary as paid and automatically creates an Expense transaction under staff_salary in accounts.",
          )}
        </p>

        <Field label={t("Disbursal Payment Method")}>
          {(id) => (
            <Select
              id={id}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.label}>
                  {m.label}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <Field label={t("Payment Reference / Transaction ID / Notes")}>
          {(id) => (
            <Input
              id={id}
              placeholder={t("e.g. TrxID 9K284HSD, bKash Personal 017...")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          )}
        </Field>

        <div className="mt-5 flex justify-end gap-2 pt-2 border-t border-line">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("Cancel")}
          </Button>
          <Button
            variant="primary"
            icon={CreditCard}
            loading={loading}
            onClick={handleDisburse}
          >
            {t("Confirm Disbursal")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export { HRM as HrmPage };
