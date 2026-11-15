"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit3, Phone, Plus, UserCheck, UserX } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api, ApiError } from "@/lib/api";
import { formatPhp } from "@/lib/format";
import type {
  Employee,
  EmployeePayload,
  EmployeeRole,
  EmployeeStatus,
  PayType,
} from "@/lib/types";

const EMPTY_FORM: EmployeePayload = {
  first_name: "",
  last_name: "",
  contact_number: "",
  role: "Driver",
  pay_type: "Daily",
  base_rate: 850,
  ot_per_trip_rate: 350,
  status: "Active",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | "All">("All");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "All">(
    "All"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeePayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.employees.list({
        role: roleFilter === "All" ? undefined : roleFilter,
        status: statusFilter === "All" ? undefined : statusFilter,
      });
      setEmployees(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load employees."
      );
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchEmployees();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchEmployees]);

  const openCreateModal = () => {
    setEditingEmployee(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setForm({
      first_name: emp.first_name,
      last_name: emp.last_name,
      contact_number: emp.contact_number ?? "",
      role: emp.role,
      pay_type: emp.pay_type,
      base_rate: Number(emp.base_rate),
      ot_per_trip_rate: Number(emp.ot_per_trip_rate),
      status: emp.status,
    });
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    const payload: EmployeePayload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      contact_number: form.contact_number?.trim() || null,
      role: form.role,
      pay_type: form.pay_type,
      base_rate: Number(form.base_rate),
      ot_per_trip_rate: Number(form.ot_per_trip_rate),
      status: form.status,
    };

    try {
      if (editingEmployee) {
        await api.employees.update(editingEmployee.id, payload);
      } else {
        await api.employees.create(payload);
      }
      setModalOpen(false);
      await fetchEmployees();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setFieldErrors(err.errors);
      } else {
        setFormError("Unable to save employee.");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (emp: Employee) => {
    const nextStatus: EmployeeStatus =
      emp.status === "Active" ? "Inactive" : "Active";
    setTogglingId(emp.id);
    setError(null);
    try {
      const updated = await api.employees.updateStatus(emp.id, nextStatus);
      setEmployees((prev) =>
        prev
          .map((item) => (item.id === emp.id ? updated : item))
          .filter(
            (item) => statusFilter === "All" || item.status === statusFilter
          )
      );
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to toggle employee status."
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AppShell
      title="Employees"
      subtitle="Drivers and helpers, Daily vs. Per-Trip pay rates, and OT bonuses"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--button-bg)" }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Employee
        </button>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          {(["All", "Driver", "Helper"] as const).map((role) => {
            const active = roleFilter === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className="flex-1 sm:flex-initial justify-center inline-flex items-center min-h-[44px] px-3.5 sm:px-4 rounded-md text-xs sm:text-sm font-medium border transition-colors"
                style={{
                  backgroundColor: active
                    ? "var(--color-info-subtle)"
                    : "var(--color-card)",
                  color: active
                    ? "var(--color-primary)"
                    : "var(--color-foreground)",
                  borderColor: active
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                }}
              >
                {role === "All" ? "All Roles" : `${role}s`}
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
          {(["All", "Active", "Inactive"] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className="flex-1 sm:flex-initial justify-center inline-flex items-center min-h-[44px] px-3 sm:px-3.5 rounded-md text-xs sm:text-sm font-medium border transition-colors"
                style={{
                  backgroundColor: active
                    ? "var(--color-info-subtle)"
                    : "var(--color-card)",
                  color: active
                    ? "var(--color-primary)"
                    : "var(--color-foreground)",
                  borderColor: active
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                }}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          className="p-4 rounded-lg border text-sm font-medium"
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

      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Mobile Card View */}
        <div className="md:hidden">
          {loading ? (
            <div
              className="px-4 py-10 text-center text-sm"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Loading employees...
            </div>
          ) : employees.length === 0 ? (
            <div
              className="px-4 py-10 text-center text-sm"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              No employees found for the current filters.
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "var(--table-border)" }}
            >
              {employees.map((emp) => (
                <div key={emp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">
                        {emp.last_name}, {emp.first_name}
                      </div>
                      {emp.contact_number && (
                        <div
                          className="text-xs inline-flex items-center gap-1 mt-0.5 tabular-nums"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          {emp.contact_number}
                        </div>
                      )}
                    </div>
                    <StatusBadge status={emp.status} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={emp.role} showDot={false} />
                    <StatusBadge status={emp.pay_type} showDot={false} />
                  </div>

                  <div
                    className="grid grid-cols-2 gap-2 p-2.5 rounded-md text-xs tabular-nums"
                    style={{ backgroundColor: "var(--color-muted)" }}
                  >
                    <div>
                      <span
                        className="block text-[11px]"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        Base Rate
                      </span>
                      <strong className="text-sm">
                        {formatPhp(emp.base_rate)}
                      </strong>
                      <span
                        className="ml-0.5"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        /{emp.pay_type === "Daily" ? "day" : "trip"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className="block text-[11px]"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        OT / Trip
                      </span>
                      <strong className="text-sm">
                        {formatPhp(emp.ot_per_trip_rate)}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={togglingId === emp.id}
                      onClick={() => toggleStatus(emp)}
                      className="flex-1 justify-center min-h-[40px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      {emp.status === "Active" ? (
                        <>
                          <UserX className="h-3.5 w-3.5" aria-hidden="true" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <UserCheck
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          Activate
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(emp)}
                      className="flex-1 justify-center min-h-[40px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:block print:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr
                className="border-b text-xs uppercase tracking-wide"
                style={{
                  backgroundColor: "var(--table-header-bg)",
                  color: "var(--table-header-fg)",
                  borderColor: "var(--table-border)",
                }}
              >
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Pay Type</th>
                <th className="px-4 py-3 font-semibold text-right">
                  Base Rate
                </th>
                <th className="px-4 py-3 font-semibold text-right">
                  OT Per Trip
                </th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    No employees found for the current filters.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="border-b last:border-b-0 hover:bg-slate-50/80"
                    style={{ borderColor: "var(--table-border)" }}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold">
                        {emp.last_name}, {emp.first_name}
                      </div>
                      {emp.contact_number && (
                        <div
                          className="text-xs inline-flex items-center gap-1 mt-0.5 tabular-nums"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          <Phone className="h-3 w-3" aria-hidden="true" />
                          {emp.contact_number}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={emp.role} showDot={false} />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={emp.pay_type} showDot={false} />
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap">
                      {formatPhp(emp.base_rate)}
                      <span
                        className="text-xs font-normal ml-1"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        /{emp.pay_type === "Daily" ? "day" : "trip"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold tabular-nums whitespace-nowrap">
                      {formatPhp(emp.ot_per_trip_rate)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td className="px-4 py-3.5 print:hidden">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={togglingId === emp.id}
                          onClick={() => toggleStatus(emp)}
                          className="min-h-[44px] px-3 rounded-md border inline-flex items-center gap-1.5 text-sm font-medium hover:bg-slate-50"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          {emp.status === "Active" ? (
                            <>
                              <UserX className="h-4 w-4" aria-hidden="true" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                              Activate
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="min-h-[44px] px-3 rounded-md border inline-flex items-center gap-1.5 text-sm font-medium hover:bg-slate-50"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingEmployee
            ? `Edit Employee — ${editingEmployee.first_name} ${editingEmployee.last_name}`
            : "Add Employee"
        }
        subtitle="Overtime is always paid per OT trip regardless of Daily or Trip base pay."
        hideInPrint={true}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div
              className="p-3 rounded-md border text-sm"
              style={{
                backgroundColor: "var(--color-destructive-subtle)",
                borderColor: "var(--color-destructive)",
                color: "var(--color-destructive)",
              }}
              role="alert"
            >
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="First Name"
              htmlFor="emp-first"
              required
              error={fieldErrors.first_name?.[0]}
            >
              <input
                id="emp-first"
                type="text"
                required
                value={form.first_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, first_name: e.target.value }))
                }
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>

            <FormField
              label="Last Name"
              htmlFor="emp-last"
              required
              error={fieldErrors.last_name?.[0]}
            >
              <input
                id="emp-last"
                type="text"
                required
                value={form.last_name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, last_name: e.target.value }))
                }
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>
          </div>

          <FormField
            label="Contact Number"
            htmlFor="emp-contact"
            error={fieldErrors.contact_number?.[0]}
          >
            <input
              id="emp-contact"
              type="text"
              value={form.contact_number ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, contact_number: e.target.value }))
              }
              placeholder="e.g. 09171234501"
              className="w-full min-h-[44px] px-3.5 rounded-md border text-sm tabular-nums"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
              }}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Role"
              htmlFor="emp-role"
              required
              error={fieldErrors.role?.[0]}
            >
              <select
                id="emp-role"
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value as EmployeeRole,
                  }))
                }
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="Driver">Driver</option>
                <option value="Helper">Helper</option>
              </select>
            </FormField>

            <FormField
              label="Base Pay Type"
              htmlFor="emp-pay-type"
              required
              hint={
                form.pay_type === "Daily"
                  ? "Paid once per working day"
                  : "Paid per regular trip"
              }
              error={fieldErrors.pay_type?.[0]}
            >
              <select
                id="emp-pay-type"
                value={form.pay_type}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    pay_type: e.target.value as PayType,
                  }))
                }
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="Daily">Daily Rate</option>
                <option value="Trip">Per-Trip Rate</option>
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Base Rate (PHP)"
              htmlFor="emp-base-rate"
              required
              error={fieldErrors.base_rate?.[0]}
            >
              <input
                id="emp-base-rate"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.base_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    base_rate: Number(e.target.value),
                  }))
                }
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>

            <FormField
              label="OT Rate Per Trip (PHP)"
              htmlFor="emp-ot-rate"
              required
              error={fieldErrors.ot_per_trip_rate?.[0]}
            >
              <input
                id="emp-ot-rate"
                type="number"
                step="0.01"
                min="0"
                required
                value={form.ot_per_trip_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    ot_per_trip_rate: Number(e.target.value),
                  }))
                }
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="min-h-[44px] px-4 rounded-md border text-sm font-medium hover:bg-slate-50"
              style={{ borderColor: "var(--color-border)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="min-h-[44px] px-5 rounded-md text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--button-bg)" }}
            >
              {saving
                ? "Saving..."
                : editingEmployee
                  ? "Save Changes"
                  : "Create Employee"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
