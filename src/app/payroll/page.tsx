"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Edit3,
  FileText,
  HandCoins,
  Plus,
  Printer,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api, ApiError } from "@/lib/api";
import {
  formatDate,
  formatPhp,
  getCurrentMonthRange,
  getFirstHalfRange,
  getSecondHalfRange,
  getTodayIso,
} from "@/lib/format";
import type {
  CashAdvance,
  CashAdvanceStatus,
  DateRange,
  Employee,
  PayrollRecord,
  PayrollStatus,
} from "@/lib/types";

type ActiveTab = "payroll" | "advances";

interface AdvanceFormState {
  employee_id: string;
  date_issued: string;
  total_amount: string;
  fixed_deduction_rate: string;
  remaining_balance: string;
  status: CashAdvanceStatus;
}

const EMPTY_ADVANCE_FORM: AdvanceFormState = {
  employee_id: "",
  date_issued: "",
  total_amount: "",
  fixed_deduction_rate: "",
  remaining_balance: "",
  status: "Active",
};

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("payroll");
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Payroll Register State
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [payrollEmployeeFilter, setPayrollEmployeeFilter] = useState("");
  const [payrollStatusFilter, setPayrollStatusFilter] = useState<
    PayrollStatus | ""
  >("");
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(true);
  const [payrollError, setPayrollError] = useState<string | null>(null);
  const [payrollNotice, setPayrollNotice] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  // Generate Payroll Modal State
  const [generateOpen, setGenerateOpen] = useState(false);
  const [periodForm, setPeriodForm] = useState<DateRange>({
    start_date: "",
    end_date: "",
  });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateFieldErrors, setGenerateFieldErrors] = useState<
    Record<string, string[]>
  >({});

  // Payslip Breakdown Modal
  const [payslipRecord, setPayslipRecord] = useState<PayrollRecord | null>(
    null
  );

  // Cash Advances State
  const [advanceEmployeeFilter, setAdvanceEmployeeFilter] = useState("");
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState<
    CashAdvanceStatus | ""
  >("");
  const [advances, setAdvances] = useState<CashAdvance[]>([]);
  const [advancesLoading, setAdvancesLoading] = useState(true);
  const [advancesError, setAdvancesError] = useState<string | null>(null);

  // Cash Advance Modal State
  const [advanceModalOpen, setAdvanceModalOpen] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState<CashAdvance | null>(
    null
  );
  const [advanceForm, setAdvanceForm] =
    useState<AdvanceFormState>(EMPTY_ADVANCE_FORM);
  const [savingAdvance, setSavingAdvance] = useState(false);
  const [advanceFormError, setAdvanceFormError] = useState<string | null>(null);
  const [advanceFieldErrors, setAdvanceFieldErrors] = useState<
    Record<string, string[]>
  >({});

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

  const loadEmployees = useCallback(async () => {
    try {
      const data = await api.employees.list();
      setEmployees(data);
    } catch {
      // Main list requests display actionable errors
    }
  }, []);

  const fetchPayrolls = useCallback(async () => {
    if (!dateRange) return;
    setPayrollLoading(true);
    setPayrollError(null);
    try {
      const data = await api.payroll.list({
        employee_id: payrollEmployeeFilter
          ? Number(payrollEmployeeFilter)
          : undefined,
        status: payrollStatusFilter || undefined,
        start_date: dateRange.start_date || undefined,
        end_date: dateRange.end_date || undefined,
      });
      setPayrolls(data);
    } catch (err) {
      setPayrollError(
        err instanceof ApiError ? err.message : "Failed to load payroll records."
      );
    } finally {
      setPayrollLoading(false);
    }
  }, [dateRange, payrollEmployeeFilter, payrollStatusFilter]);

  const fetchAdvances = useCallback(async () => {
    setAdvancesLoading(true);
    setAdvancesError(null);
    try {
      const data = await api.advances.list({
        employee_id: advanceEmployeeFilter
          ? Number(advanceEmployeeFilter)
          : undefined,
        status: advanceStatusFilter || undefined,
      });
      setAdvances(data);
    } catch (err) {
      setAdvancesError(
        err instanceof ApiError ? err.message : "Failed to load cash advances."
      );
    } finally {
      setAdvancesLoading(false);
    }
  }, [advanceEmployeeFilter, advanceStatusFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void loadEmployees();
      }
    });
    return () => {
      active = false;
    };
  }, [loadEmployees]);

  useEffect(() => {
    if (!dateRange) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchPayrolls();
      }
    });
    return () => {
      active = false;
    };
  }, [dateRange, fetchPayrolls]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchAdvances();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchAdvances]);

  const openGenerateModal = () => {
    const initial =
      dateRange && dateRange.start_date && dateRange.end_date
        ? dateRange
        : getFirstHalfRange();
    setPeriodForm({
      start_date: initial.start_date,
      end_date: initial.end_date,
    });
    setGenerateError(null);
    setGenerateFieldErrors({});
    setGenerateOpen(true);
  };

  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerateError(null);
    setGenerateFieldErrors({});
    setPayrollNotice(null);

    try {
      const generated = await api.payroll.generate({
        period_start: periodForm.start_date,
        period_end: periodForm.end_date,
      });
      setGenerateOpen(false);
      setDateRange({
        start_date: periodForm.start_date,
        end_date: periodForm.end_date,
      });
      setPayrollNotice(
        generated.length > 0
          ? `Generated payroll for ${generated.length} ${generated.length === 1 ? "employee" : "employees"} (${formatDate(periodForm.start_date)} – ${formatDate(periodForm.end_date)}).`
          : `No completed trips found between ${formatDate(periodForm.start_date)} and ${formatDate(periodForm.end_date)}.`
      );
      await fetchPayrolls();
    } catch (err) {
      if (err instanceof ApiError) {
        setGenerateError(err.message);
        setGenerateFieldErrors(err.errors);
      } else {
        setGenerateError("Failed to generate payroll for the selected period.");
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (record: PayrollRecord) => {
    setPayingId(record.id);
    setPayrollError(null);
    setPayrollNotice(null);
    try {
      await api.payroll.pay(record.id);
      const empName = record.employee
        ? `${record.employee.first_name} ${record.employee.last_name}`
        : `Employee #${record.employee_id}`;
      setPayrollNotice(
        `Marked payroll paid for ${empName} (${formatPhp(record.net_payable)}) and applied cash advance deductions.`
      );
      await Promise.all([fetchPayrolls(), fetchAdvances()]);
    } catch (err) {
      setPayrollError(
        err instanceof ApiError
          ? err.message
          : "Failed to settle payroll record."
      );
    } finally {
      setPayingId(null);
    }
  };

  const openCreateAdvanceModal = () => {
    const firstActiveEmployee =
      employees.find((emp) => emp.status === "Active")?.id ?? "";
    setEditingAdvance(null);
    setAdvanceForm({
      employee_id: firstActiveEmployee ? String(firstActiveEmployee) : "",
      date_issued: getTodayIso(),
      total_amount: "",
      fixed_deduction_rate: "",
      remaining_balance: "",
      status: "Active",
    });
    setAdvanceFormError(null);
    setAdvanceFieldErrors({});
    setAdvanceModalOpen(true);
  };

  const openEditAdvanceModal = (advance: CashAdvance) => {
    setEditingAdvance(advance);
    setAdvanceForm({
      employee_id: String(advance.employee_id),
      date_issued: advance.date_issued.slice(0, 10),
      total_amount: String(Number(advance.total_amount)),
      fixed_deduction_rate: String(Number(advance.fixed_deduction_rate)),
      remaining_balance: String(Number(advance.remaining_balance)),
      status: advance.status,
    });
    setAdvanceFormError(null);
    setAdvanceFieldErrors({});
    setAdvanceModalOpen(true);
  };

  const handleAdvanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdvance(true);
    setAdvanceFormError(null);
    setAdvanceFieldErrors({});

    try {
      if (editingAdvance) {
        await api.advances.update(editingAdvance.id, {
          employee_id: Number(advanceForm.employee_id),
          date_issued: advanceForm.date_issued,
          total_amount: Number(advanceForm.total_amount),
          fixed_deduction_rate: Number(advanceForm.fixed_deduction_rate),
          remaining_balance: Number(advanceForm.remaining_balance),
          status: advanceForm.status,
        });
      } else {
        await api.advances.create({
          employee_id: Number(advanceForm.employee_id),
          date_issued: advanceForm.date_issued,
          total_amount: Number(advanceForm.total_amount),
          fixed_deduction_rate: Number(advanceForm.fixed_deduction_rate),
        });
      }
      setAdvanceModalOpen(false);
      await fetchAdvances();
    } catch (err) {
      if (err instanceof ApiError) {
        setAdvanceFormError(err.message);
        setAdvanceFieldErrors(err.errors);
      } else {
        setAdvanceFormError("Unable to save cash advance.");
      }
    } finally {
      setSavingAdvance(false);
    }
  };

  const payrollStats = useMemo(() => {
    let totalGross = 0;
    let totalDeduction = 0;
    let unpaidNet = 0;
    let paidNet = 0;

    for (const rec of payrolls) {
      const gross = Number(rec.total_base_pay) + Number(rec.total_ot_pay);
      const deduction = Number(rec.advance_deduction_applied);
      const net = Number(rec.net_payable);
      totalGross += gross;
      totalDeduction += deduction;
      if (rec.status === "Paid") {
        paidNet += net;
      } else {
        unpaidNet += net;
      }
    }

    return { totalGross, totalDeduction, unpaidNet, paidNet };
  }, [payrolls]);

  const advanceStats = useMemo(() => {
    let activeCount = 0;
    let totalIssued = 0;
    let totalRemaining = 0;

    for (const adv of advances) {
      if (adv.status === "Active") {
        activeCount += 1;
      }
      totalIssued += Number(adv.total_amount);
      totalRemaining += Number(adv.remaining_balance);
    }

    return { activeCount, totalIssued, totalRemaining };
  }, [advances]);

  return (
    <AppShell
      title="Payroll & Cash Advances"
      subtitle="Generate cutoff payroll from verified trips and manage employee cash advance deductions"
      hidePrintHeader={Boolean(payslipRecord)}
      actions={
        activeTab === "payroll" ? (
          <button
            type="button"
            onClick={openGenerateModal}
            className="min-h-[44px] px-4 rounded-md inline-flex items-center justify-center gap-2 text-sm font-semibold text-white print:hidden"
            style={{ backgroundColor: "var(--button-bg)" }}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Generate Payroll</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={openCreateAdvanceModal}
            className="min-h-[44px] px-4 rounded-md inline-flex items-center justify-center gap-2 text-sm font-semibold text-white print:hidden"
            style={{ backgroundColor: "var(--button-bg)" }}
          >
            <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Issue Cash Advance</span>
          </button>
        )
      }
    >
      {/* Official Printable Payslip Voucher (renders ONLY during print when payslipRecord is active) */}
      {payslipRecord && (
        <div className="hidden print:block p-5 max-w-2xl mx-auto bg-white text-slate-900 border-2 border-slate-900 rounded-lg print:border print:p-4 print-single-page">
          <div className="border-b-2 border-slate-900 pb-2.5 mb-2.5 flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">
                TRUCKOPS TRUCKING SERVICES
              </h1>
              <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider mt-0.5">
                Asia Brewery Logistics Operations • Cabuyao, Laguna
              </p>
              <p className="text-[10px] text-slate-500">
                Official Cutoff Payroll Voucher
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-slate-900 rounded">
                {payslipRecord.status === "Paid"
                  ? "OFFICIAL RECEIPT (PAID)"
                  : "PAYROLL VOUCHER (UNPAID)"}
              </span>
              <p className="text-[11px] font-mono font-medium text-slate-500 mt-1">
                Voucher #{payslipRecord.id.toString().padStart(6, "0")}
              </p>
              <p className="text-[10px] text-slate-500">
                Issued: {formatDate(payslipRecord.created_at || payslipRecord.period_end)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-2.5 rounded border border-slate-300 bg-slate-50/70 mb-2.5 text-xs">
            <div>
              <p className="text-slate-500 uppercase font-semibold text-[9px] tracking-wider">
                Employee Information
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {payslipRecord.employee
                  ? `${payslipRecord.employee.last_name}, ${payslipRecord.employee.first_name}`
                  : `Employee #${payslipRecord.employee_id}`}
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Role:{" "}
                <span className="font-semibold">
                  {payslipRecord.employee?.role ?? "Crew"}
                </span>
                {payslipRecord.employee && (
                  <span>
                    {" "}
                    • Scheme:{" "}
                    <strong className="font-semibold">
                      {payslipRecord.employee.pay_type} Rate
                    </strong>
                  </span>
                )}
              </p>
              {payslipRecord.employee && (
                <p className="text-slate-500 text-[10px] mt-0.5 tabular-nums">
                  Registered: {formatPhp(payslipRecord.employee.base_rate)} Base /{" "}
                  {formatPhp(payslipRecord.employee.ot_per_trip_rate)} OT
                </p>
              )}
            </div>

            <div className="text-right sm:text-left sm:border-l sm:border-slate-300 sm:pl-3">
              <p className="text-slate-500 uppercase font-semibold text-[9px] tracking-wider">
                Payroll Cutoff Period
              </p>
              <p className="text-sm font-bold text-slate-900 mt-0.5 tabular-nums">
                {formatDate(payslipRecord.period_start)} –{" "}
                {formatDate(payslipRecord.period_end)}
              </p>
              <p className="text-slate-600 text-[11px] mt-0.5">
                Basis: <span className="font-medium">Verified Completed Trips</span>
              </p>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Status:{" "}
                <strong className="font-bold">{payslipRecord.status}</strong>
              </p>
            </div>
          </div>

          <div className="mb-2.5">
            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-slate-700">
                  <th className="py-1.5 px-3 text-left font-bold uppercase tracking-wider text-[10px]">
                    Item / Compensation Description
                  </th>
                  <th className="py-1.5 px-3 text-center font-bold uppercase tracking-wider text-[10px] w-24">
                    Type
                  </th>
                  <th className="py-1.5 px-3 text-right font-bold uppercase tracking-wider text-[10px] w-32">
                    Amount (PHP)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1.5 px-3 font-medium">
                    Base Pay
                    <span className="block text-[10px] text-slate-500 font-normal">
                      {payslipRecord.employee?.pay_type === "Daily"
                        ? "Daily rate applied to verified trip working dates"
                        : "Per-trip compensation for completed regular trips"}
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-center text-slate-600 text-[11px]">
                    Earnings
                  </td>
                  <td className="py-1.5 px-3 text-right font-medium tabular-nums">
                    {formatPhp(payslipRecord.total_base_pay)}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-medium">
                    Overtime (OT) Pay
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Trip-based overtime bonus for all verified overtime trips
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-center text-slate-600 text-[11px]">
                    Earnings
                  </td>
                  <td className="py-1.5 px-3 text-right font-medium tabular-nums">
                    {formatPhp(payslipRecord.total_ot_pay)}
                  </td>
                </tr>
                <tr className="bg-slate-50/80 font-semibold border-t border-slate-300">
                  <td className="py-1 px-3 text-[11px]">Total Gross Earnings</td>
                  <td className="py-1 px-3 text-center text-slate-400">—</td>
                  <td className="py-1 px-3 text-right tabular-nums">
                    {formatPhp(
                      Number(payslipRecord.total_base_pay) +
                        Number(payslipRecord.total_ot_pay)
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-medium text-amber-900">
                    Cash Advance (Vale) Deduction
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Fixed cutoff loan amortization applied to advance balance
                    </span>
                  </td>
                  <td className="py-1.5 px-3 text-center text-amber-800 text-[11px]">
                    Deduction
                  </td>
                  <td className="py-1.5 px-3 text-right font-medium tabular-nums text-amber-900">
                    −{formatPhp(payslipRecord.advance_deduction_applied)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-900 bg-slate-100 font-bold">
                  <td className="py-2 px-3 uppercase tracking-wide text-xs">
                    Net Take-Home Pay
                  </td>
                  <td className="py-2 px-3 text-center text-slate-500 font-normal text-[9px]">
                    NET AMOUNT
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-sm text-slate-900 font-black">
                    {formatPhp(payslipRecord.net_payable)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="pt-2.5 border-t border-slate-300 space-y-2.5">
            <div className="grid grid-cols-2 gap-6 text-xs">
              <div>
                <p className="text-slate-500 mb-5 font-medium text-[11px]">
                  Prepared &amp; Verified By:
                </p>
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-bold text-slate-800 text-xs">
                    TruckOps Operations / Management
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Asia Brewery Logistics Fleet
                  </p>
                </div>
              </div>

              <div>
                <p className="text-slate-500 mb-5 font-medium text-[11px]">
                  Received By (Employee Signature):
                </p>
                <div className="border-t border-slate-400 pt-1">
                  <p className="font-bold text-slate-800 text-xs">
                    {payslipRecord.employee
                      ? `${payslipRecord.employee.first_name} ${payslipRecord.employee.last_name}`
                      : `Employee #${payslipRecord.employee_id}`}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Date Received: ____________________
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-slate-500 text-center italic border-t border-slate-200 pt-1.5 leading-tight">
              * I hereby acknowledge receipt of the stated net amount as complete and full compensation for my services rendered during the cutoff period specified above.
            </p>
          </div>
        </div>
      )}

      {/* Main Page Content - Suppressed during print when a payslip voucher is being printed */}
      <div className={payslipRecord ? "print:hidden" : ""}>
      {/* Mode Tabs */}
      <div
        className="w-full sm:w-auto flex sm:inline-flex p-1 rounded-lg border gap-1 print:hidden"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
        role="tablist"
        aria-label="Payroll sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "payroll"}
          onClick={() => setActiveTab("payroll")}
          className="flex-1 sm:flex-initial justify-center min-h-[40px] px-2.5 sm:px-4 rounded-md inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
          style={{
            backgroundColor:
              activeTab === "payroll" ? "var(--color-info-subtle)" : "transparent",
            color:
              activeTab === "payroll"
                ? "var(--color-primary)"
                : "var(--color-muted-foreground)",
          }}
        >
          <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Payroll Register</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "advances"}
          onClick={() => setActiveTab("advances")}
          className="flex-1 sm:flex-initial justify-center min-h-[40px] px-2.5 sm:px-4 rounded-md inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap"
          style={{
            backgroundColor:
              activeTab === "advances" ? "var(--color-info-subtle)" : "transparent",
            color:
              activeTab === "advances"
                ? "var(--color-primary)"
                : "var(--color-muted-foreground)",
          }}
        >
          <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Cash Advances</span>
          <span className="hidden sm:inline text-xs opacity-75">(Vale)</span>
        </button>
      </div>

      {activeTab === "payroll" ? (
        <div className="space-y-6">
          <div className="print:hidden">
            <DateRangeBar
              value={dateRange ?? { start_date: "", end_date: "" }}
              onChange={setDateRange}
            />
          </div>

          {payrollNotice && (
            <div
              className="p-4 rounded-lg border text-sm font-medium flex items-center gap-2 print:hidden"
              style={{
                backgroundColor: "var(--color-success-subtle)",
                borderColor: "var(--color-success)",
                color: "var(--color-success)",
              }}
              role="status"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{payrollNotice}</span>
            </div>
          )}

          {payrollError && (
            <div
              className="p-4 rounded-lg border text-sm font-medium print:hidden"
              style={{
                backgroundColor: "var(--color-destructive-subtle)",
                borderColor: "var(--color-destructive)",
                color: "var(--color-destructive)",
              }}
              role="alert"
            >
              {payrollError}
            </div>
          )}

          {/* Payroll Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                aria-label="Filter payroll by employee"
                value={payrollEmployeeFilter}
                onChange={(e) => setPayrollEmployeeFilter(e.target.value)}
                className="w-full sm:w-auto min-h-[38px] px-2.5 sm:px-3 rounded-md border text-xs sm:text-sm"
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
                aria-label="Filter payroll by status"
                value={payrollStatusFilter}
                onChange={(e) =>
                  setPayrollStatusFilter(e.target.value as PayrollStatus | "")
                }
                className="w-full sm:w-auto min-h-[38px] px-2.5 sm:px-3 rounded-md border text-xs sm:text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="">All Statuses</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {payrolls.length}{" "}
              {payrolls.length === 1 ? "payroll record" : "payroll records"}
            </span>
          </div>

          {/* Payroll KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Total Gross Pay
              </p>
              <p className="text-xl font-bold mt-1.5 tabular-nums">
                {formatPhp(payrollStats.totalGross)}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Base pay + OT earnings
              </p>
            </div>

            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Advance Deductions
              </p>
              <p className="text-xl font-bold mt-1.5 tabular-nums">
                {formatPhp(payrollStats.totalDeduction)}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Fixed Vale deductions
              </p>
            </div>

            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Unpaid Net Payable
              </p>
              <p
                className="text-xl font-bold mt-1.5 tabular-nums"
                style={{ color: "var(--color-destructive)" }}
              >
                {formatPhp(payrollStats.unpaidNet)}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Pending disbursement
              </p>
            </div>

            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Paid Disbursed
              </p>
              <p
                className="text-xl font-bold mt-1.5 tabular-nums"
                style={{ color: "var(--color-success)" }}
              >
                {formatPhp(payrollStats.paidNet)}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Released to crew
              </p>
            </div>
          </div>

          {/* Payroll Register Table */}
          <section
            className="rounded-xl border overflow-hidden print:hidden"
            style={{
              backgroundColor: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
          >
            {payrollLoading ? (
              <div
                className="p-8 text-center text-sm"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Loading payroll register...
              </div>
            ) : payrolls.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Wallet
                  className="h-8 w-8 mx-auto"
                  style={{ color: "var(--color-muted-foreground)" }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold">
                    No payroll records found for this cutoff
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    Ensure completed trips are verified, then click
                    &ldquo;Generate Payroll&rdquo; to compute driver &amp; helper
                    pay.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openGenerateModal}
                  className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--button-bg)" }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Generate Payroll
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div
                  className="md:hidden divide-y"
                  style={{ borderColor: "var(--table-border)" }}
                >
                  {payrolls.map((rec) => {
                    const employeeName = rec.employee
                      ? `${rec.employee.last_name}, ${rec.employee.first_name}`
                      : `Employee #${rec.employee_id}`;

                    return (
                      <div key={rec.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{employeeName}</p>
                            <p
                              className="text-xs tabular-nums mt-0.5"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              {formatDate(rec.period_start)} –{" "}
                              {formatDate(rec.period_end)}
                            </p>
                          </div>
                          <StatusBadge status={rec.status} />
                        </div>

                        {rec.employee && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <StatusBadge
                              status={rec.employee.role}
                              showDot={false}
                            />
                            <StatusBadge
                              status={rec.employee.pay_type}
                              showDot={false}
                            />
                          </div>
                        )}

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
                            <span className="font-semibold">
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
                            <span className="font-semibold">
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
                            <span
                              className="font-medium"
                              style={{
                                color:
                                  Number(rec.advance_deduction_applied) > 0
                                    ? "var(--color-warning)"
                                    : "var(--color-muted-foreground)",
                              }}
                            >
                              −{formatPhp(rec.advance_deduction_applied)}
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

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setPayslipRecord(rec)}
                            className="flex-1 justify-center min-h-[40px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                            style={{ borderColor: "var(--color-border)" }}
                          >
                            <FileText
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Payslip
                          </button>

                          {rec.status === "Unpaid" && (
                            <button
                              type="button"
                              disabled={payingId === rec.id}
                              onClick={() => handleMarkPaid(rec)}
                              className="flex-1 justify-center min-h-[40px] px-3 rounded-md text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-60"
                              style={{ backgroundColor: "var(--color-success)" }}
                            >
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {payingId === rec.id ? "Paying..." : "Mark Paid"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                      <th className="px-4 py-3 font-semibold">Cutoff Period</th>
                      <th className="px-4 py-3 font-semibold">Employee</th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Base Pay
                      </th>
                      <th className="px-4 py-3 font-semibold text-right">
                        OT Pay
                      </th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Gross Pay
                      </th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Advance Ded.
                      </th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Net Payable
                      </th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right print:hidden">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className="divide-y"
                    style={{ borderColor: "var(--table-border)" }}
                  >
                    {payrolls.map((rec) => {
                      const gross =
                        Number(rec.total_base_pay) + Number(rec.total_ot_pay);
                      const employeeName = rec.employee
                        ? `${rec.employee.last_name}, ${rec.employee.first_name}`
                        : `Employee #${rec.employee_id}`;

                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3.5 whitespace-nowrap tabular-nums text-xs">
                            <span className="font-medium block">
                              {formatDate(rec.period_start)}
                            </span>
                            <span
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              to {formatDate(rec.period_end)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold">{employeeName}</p>
                            {rec.employee && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <StatusBadge
                                  status={rec.employee.role}
                                  showDot={false}
                                />
                                <StatusBadge
                                  status={rec.employee.pay_type}
                                  showDot={false}
                                />
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                            {formatPhp(rec.total_base_pay)}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                            {formatPhp(rec.total_ot_pay)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap tabular-nums">
                            {formatPhp(gross)}
                          </td>
                          <td
                            className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums"
                            style={{
                              color:
                                Number(rec.advance_deduction_applied) > 0
                                  ? "var(--color-warning)"
                                  : "var(--color-muted-foreground)",
                            }}
                          >
                            −{formatPhp(rec.advance_deduction_applied)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold whitespace-nowrap tabular-nums">
                            {formatPhp(rec.net_payable)}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={rec.status} />
                          </td>
                          <td className="px-4 py-3.5 text-right print:hidden">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setPayslipRecord(rec)}
                                className="min-h-[44px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                                style={{ borderColor: "var(--color-border)" }}
                              >
                                <FileText
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                Payslip
                              </button>

                              {rec.status === "Unpaid" && (
                                <button
                                  type="button"
                                  disabled={payingId === rec.id}
                                  onClick={() => handleMarkPaid(rec)}
                                  className="min-h-[44px] px-3 rounded-md text-xs font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-60"
                                  style={{
                                    backgroundColor: "var(--color-success)",
                                  }}
                                >
                                  <CheckCircle2
                                    className="h-3.5 w-3.5"
                                    aria-hidden="true"
                                  />
                                  {payingId === rec.id
                                    ? "Paying..."
                                    : "Mark Paid"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {advancesError && (
            <div
              className="p-4 rounded-lg border text-sm font-medium print:hidden"
              style={{
                backgroundColor: "var(--color-destructive-subtle)",
                borderColor: "var(--color-destructive)",
                color: "var(--color-destructive)",
              }}
              role="alert"
            >
              {advancesError}
            </div>
          )}

          {/* Cash Advance Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                aria-label="Filter cash advances by employee"
                value={advanceEmployeeFilter}
                onChange={(e) => setAdvanceEmployeeFilter(e.target.value)}
                className="w-full sm:w-auto min-h-[38px] px-2.5 sm:px-3 rounded-md border text-xs sm:text-sm"
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
                aria-label="Filter cash advances by status"
                value={advanceStatusFilter}
                onChange={(e) =>
                  setAdvanceStatusFilter(
                    e.target.value as CashAdvanceStatus | ""
                  )
                }
                className="w-full sm:w-auto min-h-[38px] px-2.5 sm:px-3 rounded-md border text-xs sm:text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            <span
              className="text-xs font-medium tabular-nums"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              {advances.length}{" "}
              {advances.length === 1 ? "advance record" : "advance records"}
            </span>
          </div>

          {/* Cash Advances KPI Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Active Loans Count
              </p>
              <p className="text-xl font-bold mt-1.5 tabular-nums">
                {advanceStats.activeCount}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Employees with ongoing deductions
              </p>
            </div>

            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Total Principal Issued
              </p>
              <p className="text-xl font-bold mt-1.5 tabular-nums">
                {formatPhp(advanceStats.totalIssued)}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Combined filtered Vale amount
              </p>
            </div>

            <div
              className="p-4 rounded-xl border"
              style={{
                backgroundColor: "var(--color-card)",
                borderColor: "var(--color-border)",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Total Remaining Balance
              </p>
              <p
                className="text-xl font-bold mt-1.5 tabular-nums"
                style={{
                  color:
                    advanceStats.totalRemaining > 0
                      ? "var(--color-warning)"
                      : "var(--color-success)",
                }}
              >
                {formatPhp(advanceStats.totalRemaining)}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Collectible through cutoff payrolls
              </p>
            </div>
          </div>

          {/* Cash Advances Table */}
          <section
            className="rounded-xl border overflow-hidden"
            style={{
              backgroundColor: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
          >
            {advancesLoading ? (
              <div
                className="p-8 text-center text-sm"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Loading cash advances...
              </div>
            ) : advances.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <HandCoins
                  className="h-8 w-8 mx-auto"
                  style={{ color: "var(--color-muted-foreground)" }}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold">
                    No cash advances recorded
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    Issue a cash advance (Vale) with a fixed per-cutoff
                    deduction to track automatic payroll recovery.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openCreateAdvanceModal}
                  className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: "var(--button-bg)" }}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Issue Cash Advance
                </button>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div
                  className="md:hidden divide-y"
                  style={{ borderColor: "var(--table-border)" }}
                >
                  {advances.map((adv) => {
                    const empName = adv.employee
                      ? `${adv.employee.last_name}, ${adv.employee.first_name}`
                      : `Employee #${adv.employee_id}`;

                    return (
                      <div key={adv.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm">{empName}</p>
                            <p
                              className="text-xs mt-0.5 tabular-nums"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              {adv.employee ? `${adv.employee.role} · ` : ""}
                              Issued {formatDate(adv.date_issued)}
                            </p>
                          </div>
                          <StatusBadge status={adv.status} />
                        </div>

                        <div
                          className="grid grid-cols-3 gap-2 p-3 rounded-md text-xs tabular-nums"
                          style={{ backgroundColor: "var(--color-muted)" }}
                        >
                          <div>
                            <span
                              className="block text-[11px]"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              Principal
                            </span>
                            <span className="font-medium">
                              {formatPhp(adv.total_amount)}
                            </span>
                          </div>
                          <div>
                            <span
                              className="block text-[11px]"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              Deduction
                            </span>
                            <span className="font-medium">
                              {formatPhp(adv.fixed_deduction_rate)}
                            </span>
                          </div>
                          <div>
                            <span
                              className="block text-[11px]"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              Remaining
                            </span>
                            <strong
                              style={{
                                color:
                                  Number(adv.remaining_balance) > 0
                                    ? "var(--color-warning)"
                                    : "var(--color-success)",
                              }}
                            >
                              {formatPhp(adv.remaining_balance)}
                            </strong>
                          </div>
                        </div>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => openEditAdvanceModal(adv)}
                            className="w-full min-h-[40px] px-3 rounded-md border inline-flex items-center justify-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                            style={{ borderColor: "var(--color-border)" }}
                          >
                            <Edit3
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Edit Cash Advance
                          </button>
                        </div>
                      </div>
                    );
                  })}
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
                      <th className="px-4 py-3 font-semibold">Date Issued</th>
                      <th className="px-4 py-3 font-semibold">Employee</th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Principal Amount
                      </th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Fixed Deduction / Cutoff
                      </th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Remaining Balance
                      </th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right print:hidden">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody
                    className="divide-y"
                    style={{ borderColor: "var(--table-border)" }}
                  >
                    {advances.map((adv) => {
                      const empName = adv.employee
                        ? `${adv.employee.last_name}, ${adv.employee.first_name}`
                        : `Employee #${adv.employee_id}`;

                      return (
                        <tr key={adv.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3.5 whitespace-nowrap tabular-nums font-medium">
                            {formatDate(adv.date_issued)}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold">{empName}</p>
                            {adv.employee && (
                              <p
                                className="text-xs"
                                style={{
                                  color: "var(--color-muted-foreground)",
                                }}
                              >
                                {adv.employee.role}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                            {formatPhp(adv.total_amount)}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums font-medium">
                            {formatPhp(adv.fixed_deduction_rate)}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums font-bold">
                            {formatPhp(adv.remaining_balance)}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusBadge status={adv.status} />
                          </td>
                          <td className="px-4 py-3.5 text-right print:hidden">
                            <button
                              type="button"
                              onClick={() => openEditAdvanceModal(adv)}
                              className="min-h-[44px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                              style={{ borderColor: "var(--color-border)" }}
                            >
                              <Edit3
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        </div>
      )}
      </div>

      {/* Generate Payroll Modal */}
      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="Generate Cutoff Payroll"
        subtitle="Aggregates completed trips and previews fixed cash advance deductions for the period."
        hideInPrint={true}
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
          {generateError && (
            <div
              className="p-3 rounded-md border text-sm"
              style={{
                backgroundColor: "var(--color-destructive-subtle)",
                borderColor: "var(--color-destructive)",
                color: "var(--color-destructive)",
              }}
              role="alert"
            >
              {generateError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <span
              className="text-xs font-semibold uppercase tracking-wide mr-1"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Quick Cutoff:
            </span>
            <button
              type="button"
              onClick={() => setPeriodForm(getFirstHalfRange())}
              className="min-h-[44px] px-3 rounded-md border text-xs font-medium hover:bg-slate-50"
              style={{ borderColor: "var(--color-border)" }}
            >
              1st Half (1–15)
            </button>
            <button
              type="button"
              onClick={() => setPeriodForm(getSecondHalfRange())}
              className="min-h-[44px] px-3 rounded-md border text-xs font-medium hover:bg-slate-50"
              style={{ borderColor: "var(--color-border)" }}
            >
              2nd Half (16–End)
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Period Start"
              htmlFor="gen-start"
              required
              error={generateFieldErrors.period_start?.[0]}
            >
              <input
                id="gen-start"
                type="date"
                required
                value={periodForm.start_date}
                onChange={(e) =>
                  setPeriodForm((prev) => ({
                    ...prev,
                    start_date: e.target.value,
                  }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>

            <FormField
              label="Period End"
              htmlFor="gen-end"
              required
              error={generateFieldErrors.period_end?.[0]}
            >
              <input
                id="gen-end"
                type="date"
                required
                value={periodForm.end_date}
                onChange={(e) =>
                  setPeriodForm((prev) => ({
                    ...prev,
                    end_date: e.target.value,
                  }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>
          </div>

          <p
            className="text-xs leading-relaxed"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Note: Re-generating an exact unpaid period refreshes figures from
            verified trips. Cash advance balances are deducted only when you
            click &ldquo;Mark Paid&rdquo;. Overlapping periods are blocked by the
            API.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setGenerateOpen(false)}
              className="min-h-[44px] px-4 rounded-md border text-sm font-medium hover:bg-slate-50"
              style={{ borderColor: "var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating}
              className="min-h-[44px] px-5 rounded-md text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--button-bg)" }}
            >
              {generating ? "Generating..." : "Generate Payroll"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Payslip Breakdown Modal */}
      <Modal
        open={Boolean(payslipRecord)}
        onClose={() => setPayslipRecord(null)}
        title="Employee Payslip Breakdown"
        subtitle={
          payslipRecord
            ? `Cutoff: ${formatDate(payslipRecord.period_start)} – ${formatDate(payslipRecord.period_end)}`
            : undefined
        }
        maxWidthClass="max-w-lg"
        hideInPrint={true}
      >
        {payslipRecord && (
          <div className="space-y-5">
            <div
              className="p-4 rounded-lg border flex items-start justify-between gap-4"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              <div>
                <p className="text-base font-bold">
                  {payslipRecord.employee
                    ? `${payslipRecord.employee.first_name} ${payslipRecord.employee.last_name}`
                    : `Employee #${payslipRecord.employee_id}`}
                </p>
                {payslipRecord.employee && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    {payslipRecord.employee.role} •{" "}
                    {payslipRecord.employee.pay_type} Rate (
                    {formatPhp(payslipRecord.employee.base_rate)} base /{" "}
                    {formatPhp(payslipRecord.employee.ot_per_trip_rate)} OT)
                  </p>
                )}
              </div>
              <StatusBadge status={payslipRecord.status} />
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-muted-foreground)" }}>
                  Base Pay (Regular Completed Trips)
                </span>
                <span className="font-medium tabular-nums">
                  {formatPhp(payslipRecord.total_base_pay)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-muted-foreground)" }}>
                  Overtime Trip Pay
                </span>
                <span className="font-medium tabular-nums">
                  {formatPhp(payslipRecord.total_ot_pay)}
                </span>
              </div>
              <div
                className="flex items-center justify-between pt-2 border-t font-semibold"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span>Gross Pay</span>
                <span className="tabular-nums">
                  {formatPhp(
                    Number(payslipRecord.total_base_pay) +
                      Number(payslipRecord.total_ot_pay)
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span style={{ color: "var(--color-warning)" }}>
                  Cash Advance (Vale) Deduction
                </span>
                <span
                  className="font-medium tabular-nums"
                  style={{ color: "var(--color-warning)" }}
                >
                  −{formatPhp(payslipRecord.advance_deduction_applied)}
                </span>
              </div>
              <div
                className="flex items-center justify-between pt-3 border-t text-base font-bold"
                style={{ borderColor: "var(--color-border)" }}
              >
                <span>Net Payable</span>
                <span
                  className="tabular-nums"
                  style={{ color: "var(--color-primary)" }}
                >
                  {formatPhp(payslipRecord.net_payable)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[44px] px-4 rounded-md border inline-flex items-center gap-2 text-sm font-medium hover:bg-slate-50"
                style={{ borderColor: "var(--color-border)" }}
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                Print Payslip
              </button>
              <button
                type="button"
                onClick={() => setPayslipRecord(null)}
                className="min-h-[44px] px-5 rounded-md text-sm font-semibold text-white"
                style={{ backgroundColor: "var(--button-bg)" }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Issue / Edit Cash Advance Modal */}
      <Modal
        open={advanceModalOpen}
        onClose={() => setAdvanceModalOpen(false)}
        title={
          editingAdvance ? "Edit Cash Advance" : "Issue New Cash Advance (Vale)"
        }
        subtitle="Fixed per-cutoff deductions automatically reduce employee balances when payroll is marked Paid."
        hideInPrint={true}
      >
        <form onSubmit={handleAdvanceSubmit} className="space-y-4">
          {advanceFormError && (
            <div
              className="p-3 rounded-md border text-sm"
              style={{
                backgroundColor: "var(--color-destructive-subtle)",
                borderColor: "var(--color-destructive)",
                color: "var(--color-destructive)",
              }}
              role="alert"
            >
              {advanceFormError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Employee"
              htmlFor="adv-employee"
              required
              error={advanceFieldErrors.employee_id?.[0]}
            >
              <select
                id="adv-employee"
                required
                value={advanceForm.employee_id}
                onChange={(e) =>
                  setAdvanceForm((prev) => ({
                    ...prev,
                    employee_id: e.target.value,
                  }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="">Select employee...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.last_name}, {emp.first_name} ({emp.role})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Date Issued"
              htmlFor="adv-date"
              required
              error={advanceFieldErrors.date_issued?.[0]}
            >
              <input
                id="adv-date"
                type="date"
                required
                value={advanceForm.date_issued}
                onChange={(e) =>
                  setAdvanceForm((prev) => ({
                    ...prev,
                    date_issued: e.target.value,
                  }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Principal Amount (PHP)"
              htmlFor="adv-total"
              required
              error={advanceFieldErrors.total_amount?.[0]}
            >
              <input
                id="adv-total"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="5000.00"
                value={advanceForm.total_amount}
                onChange={(e) =>
                  setAdvanceForm((prev) => ({
                    ...prev,
                    total_amount: e.target.value,
                  }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>

            <FormField
              label="Fixed Deduction Per Cutoff (PHP)"
              htmlFor="adv-deduction"
              required
              error={advanceFieldErrors.fixed_deduction_rate?.[0]}
            >
              <input
                id="adv-deduction"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="1000.00"
                value={advanceForm.fixed_deduction_rate}
                onChange={(e) =>
                  setAdvanceForm((prev) => ({
                    ...prev,
                    fixed_deduction_rate: e.target.value,
                  }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>
          </div>

          {editingAdvance && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Remaining Balance (PHP)"
                htmlFor="adv-remaining"
                required
                error={advanceFieldErrors.remaining_balance?.[0]}
              >
                <input
                  id="adv-remaining"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={advanceForm.remaining_balance}
                  onChange={(e) =>
                    setAdvanceForm((prev) => ({
                      ...prev,
                      remaining_balance: e.target.value,
                    }))
                  }
                  className="min-h-[44px] px-3 rounded-md border text-sm tabular-nums"
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                  }}
                />
              </FormField>

              <FormField
                label="Status"
                htmlFor="adv-status"
                required
                error={advanceFieldErrors.status?.[0]}
              >
                <select
                  id="adv-status"
                  value={advanceForm.status}
                  onChange={(e) =>
                    setAdvanceForm((prev) => ({
                      ...prev,
                      status: e.target.value as CashAdvanceStatus,
                    }))
                  }
                  className="min-h-[44px] px-3 rounded-md border text-sm"
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Paid">Paid</option>
                </select>
              </FormField>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAdvanceModalOpen(false)}
              className="min-h-[44px] px-4 rounded-md border text-sm font-medium hover:bg-slate-50"
              style={{ borderColor: "var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingAdvance}
              className="min-h-[44px] px-5 rounded-md text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--button-bg)" }}
            >
              {savingAdvance
                ? "Saving..."
                : editingAdvance
                  ? "Save Changes"
                  : "Issue Cash Advance"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
