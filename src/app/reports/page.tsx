"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  FileBarChart2,
  Printer,
  Receipt,
  Route,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api, ApiError } from "@/lib/api";
import {
  formatDate,
  formatPhp,
  getCurrentMonthRange,
} from "@/lib/format";
import type {
  DateRange,
  Employee,
  ExpenseCategory,
  ExpensesReportResponse,
  GrossRevenueReportResponse,
  PayrollReportResponse,
  PayrollStatus,
  Truck,
} from "@/lib/types";

type ReportType = "gross-revenue" | "expenses" | "payroll";

const REPORT_TABS: Array<{
  id: ReportType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: "gross-revenue",
    label: "Gross Revenue",
    description: "Completed AB hauling trips & flat-rate earnings for tax filing",
    icon: Route,
  },
  {
    id: "expenses",
    label: "Operational Expenses",
    description: "Itemized diesel, maintenance, and overhead spend",
    icon: Receipt,
  },
  {
    id: "payroll",
    label: "Employee Payroll",
    description: "Disbursed & pending base pay, OT, and advance deductions",
    icon: Wallet,
  },
];

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>("gross-revenue");
  const [dateRange, setDateRange] = useState<DateRange | null>(null);

  // Master filter dropdowns
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Secondary report filters
  const [expenseCategoryId, setExpenseCategoryId] = useState("");
  const [expenseTruckId, setExpenseTruckId] = useState("");
  const [payrollEmployeeId, setPayrollEmployeeId] = useState("");
  const [payrollStatus, setPayrollStatus] = useState<PayrollStatus | "">("");

  // Preview payloads
  const [grossData, setGrossData] = useState<GrossRevenueReportResponse | null>(
    null
  );
  const [expensesData, setExpensesData] =
    useState<ExpensesReportResponse | null>(null);
  const [payrollData, setPayrollData] = useState<PayrollReportResponse | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setDateRange(getCurrentMonthRange());
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const loadFilterOptions = useCallback(async () => {
    try {
      const [categoriesRes, trucksRes, employeesRes] = await Promise.all([
        api.expenses.categories(),
        api.trucks.list(),
        api.employees.list(),
      ]);
      setCategories(categoriesRes);
      setTrucks(trucksRes);
      setEmployees(employeesRes);
    } catch {
      // Main report fetch surfaces errors cleanly
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void loadFilterOptions();
      }
    });
    return () => {
      active = false;
    };
  }, [loadFilterOptions]);

  const fetchReport = useCallback(async () => {
    if (!dateRange) return;
    setLoading(true);
    setError(null);

    const dateParams = {
      start_date: dateRange.start_date || undefined,
      end_date: dateRange.end_date || undefined,
    };

    try {
      if (activeReport === "gross-revenue") {
        const res = await api.reports.grossRevenueJson(dateParams);
        setGrossData(res);
      } else if (activeReport === "expenses") {
        const res = await api.reports.expensesJson({
          ...dateParams,
          category_id: expenseCategoryId
            ? Number(expenseCategoryId)
            : undefined,
          truck_id: expenseTruckId ? Number(expenseTruckId) : undefined,
        });
        setExpensesData(res);
      } else {
        const res = await api.reports.payrollJson({
          ...dateParams,
          employee_id: payrollEmployeeId
            ? Number(payrollEmployeeId)
            : undefined,
          status: payrollStatus || undefined,
        });
        setPayrollData(res);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load report preview."
      );
    } finally {
      setLoading(false);
    }
  }, [
    activeReport,
    dateRange,
    expenseCategoryId,
    expenseTruckId,
    payrollEmployeeId,
    payrollStatus,
  ]);

  useEffect(() => {
    if (!dateRange) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchReport();
      }
    });
    return () => {
      active = false;
    };
  }, [dateRange, fetchReport]);

  const handleExportCsv = async () => {
    if (!dateRange) return;
    setExporting(true);
    setError(null);

    const dateParams = {
      start_date: dateRange.start_date || undefined,
      end_date: dateRange.end_date || undefined,
    };

    try {
      if (activeReport === "gross-revenue") {
        await api.reports.downloadGrossRevenueCsv(dateParams);
      } else if (activeReport === "expenses") {
        await api.reports.downloadExpensesCsv({
          ...dateParams,
          category_id: expenseCategoryId
            ? Number(expenseCategoryId)
            : undefined,
          truck_id: expenseTruckId ? Number(expenseTruckId) : undefined,
        });
      } else {
        await api.reports.downloadPayrollCsv({
          ...dateParams,
          employee_id: payrollEmployeeId
            ? Number(payrollEmployeeId)
            : undefined,
          status: payrollStatus || undefined,
        });
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to download CSV export."
      );
    } finally {
      setExporting(false);
    }
  };

  const activeMeta =
    REPORT_TABS.find((t) => t.id === activeReport) ?? REPORT_TABS[0];

  const periodLabel =
    dateRange && (dateRange.start_date || dateRange.end_date)
      ? `${dateRange.start_date ? formatDate(dateRange.start_date) : "Start"} – ${dateRange.end_date ? formatDate(dateRange.end_date) : "End"}`
      : "All Dates";

  return (
    <AppShell
      title="Reports & Tax Exports"
      subtitle="Preview ledger summaries and download Excel-ready UTF-8 CSV files"
      hidePrintHeader={true}
      actions={
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 justify-center min-h-[40px] px-2.5 sm:px-4 rounded-md border inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium hover:bg-slate-50 text-center"
            style={{
              backgroundColor: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
          >
            <Printer className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">Print Preview</span>
          </button>

          <button
            type="button"
            disabled={exporting || !dateRange}
            onClick={handleExportCsv}
            className="flex-1 justify-center min-h-[40px] px-2.5 sm:px-4 rounded-md inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-white disabled:opacity-60 text-center"
            style={{ backgroundColor: "var(--button-bg)" }}
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {exporting ? "Exporting..." : "Export CSV"}
            </span>
          </button>
        </div>
      }
    >
      {/* Report Switch Tabs */}
      <div
        className="w-full sm:w-auto grid grid-cols-1 sm:inline-flex p-1 rounded-lg border gap-1 print:hidden"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
        role="tablist"
        aria-label="Report types"
      >
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeReport === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveReport(tab.id)}
              className="min-h-[44px] px-4 rounded-md inline-flex items-center justify-center sm:justify-start gap-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: isSelected
                  ? "var(--color-info-subtle)"
                  : "transparent",
                color: isSelected
                  ? "var(--color-primary)"
                  : "var(--color-muted-foreground)",
              }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Date Filter */}
      <div className="print:hidden">
        <DateRangeBar
          value={dateRange ?? { start_date: "", end_date: "" }}
          onChange={setDateRange}
        />
      </div>

      {/* Report-Specific Secondary Filters */}
      {activeReport === "expenses" && (
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto print:hidden">
          <select
            aria-label="Filter expenses report by category"
            value={expenseCategoryId}
            onChange={(e) => setExpenseCategoryId(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-md border text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter expenses report by truck"
            value={expenseTruckId}
            onChange={(e) => setExpenseTruckId(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-md border text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
          >
            <option value="">All Trucks &amp; General</option>
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.plate_number}
              </option>
            ))}
          </select>
        </div>
      )}

      {activeReport === "payroll" && (
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto print:hidden">
          <select
            aria-label="Filter payroll report by employee"
            value={payrollEmployeeId}
            onChange={(e) => setPayrollEmployeeId(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-md border text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.last_name}, {emp.first_name} ({emp.role})
              </option>
            ))}
          </select>

          <select
            aria-label="Filter payroll report by status"
            value={payrollStatus}
            onChange={(e) =>
              setPayrollStatus(e.target.value as PayrollStatus | "")
            }
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-md border text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
          >
            <option value="">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
          </select>
        </div>
      )}

      {error && (
        <div
          className="p-4 rounded-lg border text-sm font-medium print:hidden"
          style={{
            backgroundColor: "var(--color-destructive-subtle)",
            borderColor: "var(--color-destructive)",
            color: "var(--color-destructive)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Printable Header Summary */}
      <div
        className="p-5 rounded-xl border space-y-4 print:p-3 print:space-y-2"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="hidden print:block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
              TruckOps Logistics Operations • Asia Brewery Inc.
            </p>
            <h2 className="text-lg font-bold">{activeMeta.label} Report</h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {activeMeta.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className="text-xs font-semibold px-3 py-1.5 rounded-md border tabular-nums"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              Period: {periodLabel}
            </span>
            <span className="hidden print:inline-block text-[10px] text-slate-500 tabular-nums">
              Coverage: {periodLabel}
            </span>
          </div>
        </div>

        {/* Summary KPI Banner */}
        {activeReport === "gross-revenue" && grossData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Completed Trips
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {grossData.summary.total_completed_trips}
              </p>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--color-info-subtle)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-primary)" }}
              >
                Total Gross AB Revenue
              </p>
              <p
                className="text-2xl font-bold mt-1 tabular-nums"
                style={{ color: "var(--color-primary)" }}
              >
                {formatPhp(grossData.summary.total_gross_revenue)}
              </p>
            </div>
          </div>
        )}

        {activeReport === "expenses" && expensesData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Expense Line Items
              </p>
              <p className="text-2xl font-bold mt-1 tabular-nums">
                {expensesData.summary.total_records}
              </p>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--color-warning-subtle)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-warning)" }}
              >
                Total Operational Expenses
              </p>
              <p
                className="text-2xl font-bold mt-1 tabular-nums"
                style={{ color: "var(--color-warning)" }}
              >
                {formatPhp(expensesData.summary.total_expenses)}
              </p>
            </div>
          </div>
        )}

        {activeReport === "payroll" && payrollData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Total Base Pay
              </p>
              <p className="text-xl font-bold mt-1 tabular-nums">
                {formatPhp(payrollData.summary.total_base_pay)}
              </p>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Total OT Pay
              </p>
              <p className="text-xl font-bold mt-1 tabular-nums">
                {formatPhp(payrollData.summary.total_ot_pay)}
              </p>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Total Advance Deducted
              </p>
              <p className="text-xl font-bold mt-1 tabular-nums">
                {formatPhp(payrollData.summary.total_advance_deduction)}
              </p>
            </div>
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--color-success-subtle)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-success)" }}
              >
                Total Net Payable
              </p>
              <p
                className="text-xl font-bold mt-1 tabular-nums"
                style={{ color: "var(--color-success)" }}
              >
                {formatPhp(payrollData.summary.total_net_payable)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Report Table Preview */}
      <section
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        {loading ? (
          <div
            className="p-8 text-center text-sm"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Generating report preview...
          </div>
        ) : activeReport === "gross-revenue" ? (
          !grossData || grossData.data.length === 0 ? (
            <EmptyReportState label="No completed trips match the selected dates." />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden print:hidden">
                <div
                  className="divide-y"
                  style={{ borderColor: "var(--table-border)" }}
                >
                  {grossData.data.map((trip) => (
                    <div key={trip.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">
                            {trip.truck?.plate_number ??
                              `Truck #${trip.truck_id}`}
                          </p>
                          <p
                            className="text-xs mt-0.5 tabular-nums"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {formatDate(trip.date)}
                            {trip.reference_no ? (
                              <span className="font-mono">
                                {" "}
                                · {trip.reference_no}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div className="text-right shrink-0 tabular-nums">
                          <p
                            className="text-sm font-bold"
                            style={{ color: "var(--color-primary)" }}
                          >
                            {formatPhp(trip.ab_flat_rate_applied)}
                          </p>
                          <p
                            className="text-[11px]"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {formatPhp(trip.ab_rate_per_trip)}/trip
                          </p>
                        </div>
                      </div>

                      <div className="text-xs space-y-0.5">
                        <p>
                          <span
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            Driver:{" "}
                          </span>
                          <span className="font-medium">
                            {trip.driver
                              ? `${trip.driver.first_name} ${trip.driver.last_name}`
                              : `Employee #${trip.driver_id}`}
                          </span>
                        </p>
                        <p>
                          <span
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            Helper:{" "}
                          </span>
                          <span>
                            {trip.helper
                              ? `${trip.helper.first_name} ${trip.helper.last_name}`
                              : "—"}
                          </span>
                        </p>
                      </div>

                      <div
                        className="grid grid-cols-3 gap-2 p-2.5 rounded-md text-xs tabular-nums text-center"
                        style={{ backgroundColor: "var(--color-muted)" }}
                      >
                        <div>
                          <span
                            className="block text-[11px]"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            Reg
                          </span>
                          <span className="font-medium">
                            {trip.regular_trips}
                          </span>
                        </div>
                        <div>
                          <span
                            className="block text-[11px]"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            OT
                          </span>
                          <span className="font-medium">
                            {trip.overtime_trips}
                          </span>
                        </div>
                        <div>
                          <span
                            className="block text-[11px]"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            Total Trips
                          </span>
                          <span className="font-bold">{trip.total_trips}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  className="p-4 border-t-2 flex items-center justify-between gap-2 text-xs font-bold tabular-nums"
                  style={{
                    backgroundColor: "var(--table-header-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <span>
                    TOTAL ({grossData.summary.total_completed_trips} trips)
                  </span>
                  <span className="text-sm">
                    {formatPhp(grossData.summary.total_gross_revenue)}
                  </span>
                </div>
              </div>

              <div className="hidden md:block print:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead
                  className="text-xs uppercase"
                  style={{
                    backgroundColor: "var(--table-header-bg)",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Reference No</th>
                    <th className="px-4 py-3 font-semibold">Truck Plate</th>
                    <th className="px-4 py-3 font-semibold">Driver</th>
                    <th className="px-4 py-3 font-semibold">Helper</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Regular
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      OT
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Total Trips
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Rate / Trip
                    </th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Total AB Revenue
                    </th>
                  </tr>
                </thead>
                <tbody
                  className="divide-y"
                  style={{ borderColor: "var(--table-border)" }}
                >
                  {grossData.data.map((trip) => (
                    <tr key={trip.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatDate(trip.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                        {trip.reference_no || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold">
                        {trip.truck?.plate_number ?? `Truck #${trip.truck_id}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {trip.driver
                          ? `${trip.driver.first_name} ${trip.driver.last_name}`
                          : `Employee #${trip.driver_id}`}
                      </td>
                      <td
                        className="px-4 py-3 whitespace-nowrap"
                        style={{
                          color: trip.helper
                            ? "var(--color-foreground)"
                            : "var(--color-muted-foreground)",
                        }}
                      >
                        {trip.helper
                          ? `${trip.helper.first_name} ${trip.helper.last_name}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                        {trip.regular_trips}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                        {trip.overtime_trips}
                      </td>
                      <td className="px-4 py-3 text-right font-medium whitespace-nowrap tabular-nums">
                        {trip.total_trips}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                        {formatPhp(trip.ab_rate_per_trip)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                        {formatPhp(trip.ab_flat_rate_applied)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot
                  className="border-t-2 font-bold"
                  style={{
                    backgroundColor: "var(--table-header-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <tr>
                    <td className="px-4 py-3" colSpan={5}>
                      TOTAL
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" colSpan={4}>
                      Completed Trips: {grossData.summary.total_completed_trips}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPhp(grossData.summary.total_gross_revenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </>
          )
        ) : activeReport === "expenses" ? (
          !expensesData || expensesData.data.length === 0 ? (
            <EmptyReportState label="No operational expenses match the selected filters." />
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden print:hidden">
                <div
                  className="divide-y"
                  style={{ borderColor: "var(--table-border)" }}
                >
                  {expensesData.data.map((exp) => (
                    <div key={exp.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm">
                            {exp.category?.name ??
                              `Category #${exp.category_id}`}
                          </p>
                          <p
                            className="text-xs mt-0.5 tabular-nums"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {formatDate(exp.date)} ·{" "}
                            {exp.truck?.plate_number ?? "General"}
                          </p>
                        </div>
                        <span className="text-sm font-bold shrink-0 tabular-nums">
                          {formatPhp(exp.amount)}
                        </span>
                      </div>

                      <p
                        className="text-xs break-words"
                        style={{
                          color: exp.description
                            ? "var(--color-foreground)"
                            : "var(--color-muted-foreground)",
                        }}
                      >
                        {exp.description || "—"}
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  className="p-4 border-t-2 flex items-center justify-between gap-2 text-xs font-bold tabular-nums"
                  style={{
                    backgroundColor: "var(--table-header-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <span>
                    TOTAL ({expensesData.summary.total_records} records)
                  </span>
                  <span className="text-sm">
                    {formatPhp(expensesData.summary.total_expenses)}
                  </span>
                </div>
              </div>

              <div className="hidden md:block print:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead
                  className="text-xs uppercase"
                  style={{
                    backgroundColor: "var(--table-header-bg)",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  <tr>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Truck Plate</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody
                  className="divide-y"
                  style={{ borderColor: "var(--table-border)" }}
                >
                  {expensesData.data.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        {formatDate(exp.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold">
                        {exp.category?.name ?? `Category #${exp.category_id}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {exp.truck?.plate_number ?? "General"}
                      </td>
                      <td
                        className="px-4 py-3"
                        style={{
                          color: exp.description
                            ? "var(--color-foreground)"
                            : "var(--color-muted-foreground)",
                        }}
                      >
                        {exp.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                        {formatPhp(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot
                  className="border-t-2 font-bold"
                  style={{
                    backgroundColor: "var(--table-header-bg)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <tr>
                    <td className="px-4 py-3" colSpan={3}>
                      TOTAL
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      Records: {expensesData.summary.total_records}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPhp(expensesData.summary.total_expenses)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              </div>
            </>
          )
        ) : !payrollData || payrollData.data.length === 0 ? (
          <EmptyReportState label="No payroll records match the selected filters." />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden print:hidden">
              <div
                className="divide-y"
                style={{ borderColor: "var(--table-border)" }}
              >
                {payrollData.data.map((rec) => (
                  <div key={rec.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">
                          {rec.employee
                            ? `${rec.employee.first_name} ${rec.employee.last_name}`
                            : `Employee #${rec.employee_id}`}
                        </p>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {rec.employee
                            ? `${rec.employee.role} (${rec.employee.pay_type}) · `
                            : ""}
                          <span className="tabular-nums">
                            {formatDate(rec.period_start)} –{" "}
                            {formatDate(rec.period_end)}
                          </span>
                        </p>
                      </div>
                      <div className="shrink-0">
                        <StatusBadge status={rec.status} />
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-2 gap-2.5 p-3 rounded-md text-xs tabular-nums"
                      style={{ backgroundColor: "var(--color-muted)" }}
                    >
                      <div>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Base Pay
                        </span>
                        <span className="font-medium">
                          {formatPhp(rec.total_base_pay)}
                        </span>
                      </div>
                      <div>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          OT Pay
                        </span>
                        <span className="font-medium">
                          {formatPhp(rec.total_ot_pay)}
                        </span>
                      </div>
                      <div>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Advance Ded.
                        </span>
                        <span className="font-medium">
                          {formatPhp(rec.advance_deduction_applied)}
                        </span>
                      </div>
                      <div>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Net Payable
                        </span>
                        <strong
                          className="text-sm"
                          style={{ color: "var(--color-primary)" }}
                        >
                          {formatPhp(rec.net_payable)}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="p-4 border-t-2 space-y-2 text-xs font-bold tabular-nums"
                style={{
                  backgroundColor: "var(--table-header-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>
                    TOTAL ({payrollData.summary.total_records} records)
                  </span>
                  <span className="text-sm">
                    {formatPhp(payrollData.summary.total_net_payable)}
                  </span>
                </div>
                <div
                  className="grid grid-cols-3 gap-2 pt-2 border-t font-normal text-[11px]"
                  style={{ borderColor: "var(--color-border)" }}
                >
                  <div>
                    <span
                      className="block"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      Base
                    </span>
                    <span className="font-semibold">
                      {formatPhp(payrollData.summary.total_base_pay)}
                    </span>
                  </div>
                  <div>
                    <span
                      className="block"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      OT
                    </span>
                    <span className="font-semibold">
                      {formatPhp(payrollData.summary.total_ot_pay)}
                    </span>
                  </div>
                  <div>
                    <span
                      className="block"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      Adv. Ded.
                    </span>
                    <span className="font-semibold">
                      {formatPhp(payrollData.summary.total_advance_deduction)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden md:block print:block overflow-x-auto">
              <table className="w-full text-sm text-left">
              <thead
                className="text-xs uppercase"
                style={{
                  backgroundColor: "var(--table-header-bg)",
                  color: "var(--color-muted-foreground)",
                }}
              >
                <tr>
                  <th className="px-4 py-3 font-semibold">Period</th>
                  <th className="px-4 py-3 font-semibold">Employee</th>
                  <th className="px-4 py-3 font-semibold">Role / Pay Type</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Base Pay
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">OT Pay</th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Advance Ded.
                  </th>
                  <th className="px-4 py-3 font-semibold text-right">
                    Net Payable
                  </th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: "var(--table-border)" }}
              >
                {payrollData.data.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-xs">
                      {formatDate(rec.period_start)} –{" "}
                      {formatDate(rec.period_end)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold">
                      {rec.employee
                        ? `${rec.employee.first_name} ${rec.employee.last_name}`
                        : `Employee #${rec.employee_id}`}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">
                      {rec.employee
                        ? `${rec.employee.role} (${rec.employee.pay_type})`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatPhp(rec.total_base_pay)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatPhp(rec.total_ot_pay)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                      {formatPhp(rec.advance_deduction_applied)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                      {formatPhp(rec.net_payable)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={rec.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot
                className="border-t-2 font-bold"
                style={{
                  backgroundColor: "var(--table-header-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                <tr>
                  <td className="px-4 py-3" colSpan={2}>
                    TOTAL
                  </td>
                  <td className="px-4 py-3 tabular-nums text-xs">
                    Records: {payrollData.summary.total_records}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPhp(payrollData.summary.total_base_pay)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPhp(payrollData.summary.total_ot_pay)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPhp(payrollData.summary.total_advance_deduction)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPhp(payrollData.summary.total_net_payable)}
                  </td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            </table>
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}

function EmptyReportState({ label }: { label: string }) {
  return (
    <div className="p-10 text-center space-y-2">
      <FileBarChart2
        className="h-8 w-8 mx-auto"
        style={{ color: "var(--color-muted-foreground)" }}
        aria-hidden="true"
      />
      <p className="text-sm font-semibold">{label}</p>
      <p
        className="text-xs"
        style={{ color: "var(--color-muted-foreground)" }}
      >
        Adjust the date period or secondary filters above to preview matching
        records.
      </p>
    </div>
  );
}
