import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { attendanceStatus, employeeDepartment, payrollStatus } from "./schema";
import { clean, normalisePhone, required, requireAdmin } from "./lib/auth";

export { requireAdmin };

const employeeStatusValidator = v.union(
  v.literal("active"),
  v.literal("on_leave"),
  v.literal("terminated"),
);

/**
 * List all employees with an optional status filter.
 */
export const listEmployees = query({
  args: {
    token: v.string(),
    status: v.optional(employeeStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let employees;
    if (args.status) {
      employees = await ctx.db
        .query("employees")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      employees = await ctx.db.query("employees").collect();
    }

    return employees.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Get single employee by ID.
 */
export const getEmployee = query({
  args: {
    token: v.string(),
    employeeId: v.id("employees"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) throw new ConvexError("Employee not found.");
    return employee;
  },
});

/**
 * Add a new staff member.
 */
export const createEmployee = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    phone: v.string(),
    email: v.optional(v.string()),
    designation: v.string(),
    department: employeeDepartment,
    baseSalary: v.number(),
    joinDate: v.string(), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const name = required(args.name, 100, "Employee name");
    const phone = normalisePhone(args.phone);
    const designation = required(args.designation, 100, "Designation");
    const email = args.email ? clean(args.email, 100, "Email") : undefined;

    if (args.baseSalary < 0) {
      throw new ConvexError("Base salary cannot be negative.");
    }

    const existing = await ctx.db
      .query("employees")
      .withIndex("by_phone", (q) => q.eq("phone", phone))
      .first();
    if (existing) {
      throw new ConvexError("An employee with this phone number already exists.");
    }

    const employeeId = await ctx.db.insert("employees", {
      name,
      phone,
      email,
      designation,
      department: args.department,
      baseSalary: args.baseSalary,
      joinDate: args.joinDate,
      status: "active",
      createdAt: Date.now(),
    });

    return employeeId;
  },
});

/**
 * Update employee status: active, on_leave, terminated.
 */
export const updateEmployeeStatus = mutation({
  args: {
    token: v.string(),
    employeeId: v.id("employees"),
    status: employeeStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new ConvexError("Employee not found.");
    }

    await ctx.db.patch(args.employeeId, { status: args.status });
    return { success: true };
  },
});

/**
 * List attendance records for a specific date (YYYY-MM-DD) or employee.
 */
export const getAttendance = query({
  args: {
    token: v.string(),
    date: v.optional(v.string()),
    employeeId: v.optional(v.id("employees")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let records;
    if (args.employeeId && args.date) {
      const record = await ctx.db
        .query("attendance")
        .withIndex("by_employeeId_and_date", (q) =>
          q.eq("employeeId", args.employeeId!).eq("date", args.date!),
        )
        .first();
      records = record ? [record] : [];
    } else if (args.date) {
      records = await ctx.db
        .query("attendance")
        .withIndex("by_date", (q) => q.eq("date", args.date!))
        .collect();
    } else if (args.employeeId) {
      records = await ctx.db
        .query("attendance")
        .withIndex("by_employeeId_and_date", (q) => q.eq("employeeId", args.employeeId!))
        .collect();
    } else {
      records = await ctx.db.query("attendance").collect();
    }

    const enriched = await Promise.all(
      records.map(async (record) => {
        const employee = await ctx.db.get(record.employeeId);
        return {
          ...record,
          employeeName: employee?.name ?? "Unknown",
          employeePhone: employee?.phone ?? "",
          department: employee?.department,
          designation: employee?.designation,
        };
      }),
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Record attendance (employeeId, date, status, clockIn, clockOut, notes).
 */
export const markAttendance = mutation({
  args: {
    token: v.string(),
    employeeId: v.id("employees"),
    date: v.string(), // YYYY-MM-DD
    status: attendanceStatus,
    clockIn: v.optional(v.string()),
    clockOut: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      throw new ConvexError("Employee not found.");
    }

    const existing = await ctx.db
      .query("attendance")
      .withIndex("by_employeeId_and_date", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", args.date),
      )
      .first();

    const notes = args.notes !== undefined ? clean(args.notes, 200, "Notes") : undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        clockIn: args.clockIn !== undefined ? args.clockIn : existing.clockIn,
        clockOut: args.clockOut !== undefined ? args.clockOut : existing.clockOut,
        notes: notes !== undefined ? notes : existing.notes,
      });
      return existing._id;
    }

    const attendanceId = await ctx.db.insert("attendance", {
      employeeId: args.employeeId,
      date: args.date,
      status: args.status,
      clockIn: args.clockIn,
      clockOut: args.clockOut,
      notes,
      createdAt: Date.now(),
    });

    return attendanceId;
  },
});

/**
 * List payroll sheets for a month (e.g. '2026-10') or by status.
 */
export const listPayroll = query({
  args: {
    token: v.string(),
    month: v.optional(v.string()),
    status: v.optional(payrollStatus),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    let payrolls;
    if (args.month) {
      const rows = await ctx.db
        .query("payroll")
        .withIndex("by_month", (q) => q.eq("month", args.month!))
        .collect();
      payrolls = args.status ? rows.filter((r) => r.status === args.status) : rows;
    } else if (args.status) {
      payrolls = await ctx.db
        .query("payroll")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      payrolls = await ctx.db.query("payroll").collect();
    }

    const enriched = await Promise.all(
      payrolls.map(async (row) => {
        const employee = await ctx.db.get(row.employeeId);
        return {
          ...row,
          employeeName: employee?.name ?? "Unknown",
          employeePhone: employee?.phone ?? "",
          department: employee?.department,
          designation: employee?.designation,
        };
      }),
    );

    return enriched.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Automatically generates draft payroll rows for all active employees for the specified month,
 * calculating netSalary = baseSalary + bonus - deductions.
 */
export const generateMonthlyPayroll = mutation({
  args: {
    token: v.string(),
    month: v.string(), // YYYY-MM e.g. "2026-10"
    bonus: v.optional(v.number()),
    deductions: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    if (!/^\d{4}-\d{2}$/.test(args.month)) {
      throw new ConvexError("Invalid month format. Expected YYYY-MM (e.g., 2026-10).");
    }

    const defaultBonus = args.bonus ?? 0;
    const defaultDeductions = args.deductions ?? 0;

    const activeEmployees = await ctx.db
      .query("employees")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    let generatedCount = 0;
    let skippedCount = 0;

    for (const emp of activeEmployees) {
      const existing = await ctx.db
        .query("payroll")
        .withIndex("by_employeeId_and_month", (q) =>
          q.eq("employeeId", emp._id).eq("month", args.month),
        )
        .first();

      if (existing) {
        skippedCount++;
        continue;
      }

      const baseSalary = emp.baseSalary;
      const bonus = defaultBonus;
      const deductions = defaultDeductions;
      const netSalary = Math.max(0, baseSalary + bonus - deductions);

      await ctx.db.insert("payroll", {
        employeeId: emp._id,
        month: args.month,
        baseSalary,
        bonus,
        deductions,
        netSalary,
        status: "draft",
        createdAt: Date.now(),
      });

      generatedCount++;
    }

    return {
      month: args.month,
      generatedCount,
      skippedCount,
      totalActive: activeEmployees.length,
    };
  },
});

/**
 * Update payroll bonus, deductions, recalculating netSalary before disbursal.
 */
export const updatePayrollRow = mutation({
  args: {
    token: v.string(),
    payrollId: v.id("payroll"),
    bonus: v.optional(v.number()),
    deductions: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, args.token);

    const row = await ctx.db.get(args.payrollId);
    if (!row) throw new ConvexError("Payroll record not found.");
    if (row.status === "paid") {
      throw new ConvexError("Cannot modify a disbursed payroll record.");
    }

    const bonus = args.bonus !== undefined ? args.bonus : row.bonus;
    const deductions = args.deductions !== undefined ? args.deductions : row.deductions;
    const netSalary = Math.max(0, row.baseSalary + bonus - deductions);

    await ctx.db.patch(args.payrollId, {
      bonus,
      deductions,
      netSalary,
      notes: args.notes !== undefined ? clean(args.notes, 200, "Notes") : row.notes,
    });

    return { success: true };
  },
});

/**
 * Mark payroll row as 'paid' with paidAt and paymentMethod.
 * Also automatically records an expense transaction in accountsTransactions under staff_salary!
 */
export const disburseSalary = mutation({
  args: {
    token: v.string(),
    payrollId: v.id("payroll"),
    paymentMethod: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);

    const payrollRow = await ctx.db.get(args.payrollId);
    if (!payrollRow) {
      throw new ConvexError("Payroll record not found.");
    }

    if (payrollRow.status === "paid") {
      throw new ConvexError("Salary for this payroll sheet has already been disbursed.");
    }

    const now = Date.now();
    const paymentMethod = clean(args.paymentMethod, 50, "Payment method");

    await ctx.db.patch(args.payrollId, {
      status: "paid",
      paidAt: now,
      paymentMethod,
      notes: args.notes !== undefined ? clean(args.notes, 200, "Notes") : payrollRow.notes,
    });

    const employee = await ctx.db.get(payrollRow.employeeId);
    const employeeName = employee ? employee.name : "Employee";
    const deptInfo = employee?.department ? ` (${employee.department})` : "";

    // Automatically records an expense transaction in accountsTransactions under staff_salary!
    const transactionId = await ctx.db.insert("accountsTransactions", {
      type: "expense",
      category: "staff_salary",
      amount: payrollRow.netSalary,
      description: `Salary disbursal for ${employeeName}${deptInfo} - Month: ${payrollRow.month} via ${paymentMethod}`,
      referenceId: payrollRow._id,
      createdBy: admin._id,
      createdAt: now,
    });

    return {
      success: true,
      payrollId: args.payrollId,
      transactionId,
    };
  },
});
