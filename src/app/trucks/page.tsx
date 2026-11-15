"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Edit3, Plus, Truck as TruckIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { api, ApiError } from "@/lib/api";
import { formatDate, isExpiringSoon } from "@/lib/format";
import type { Truck, TruckPayload, TruckStatus } from "@/lib/types";

const TRUCK_STATUSES: TruckStatus[] = [
  "Available",
  "Assigned",
  "Under Maintenance",
  "Inactive",
];

const EMPTY_FORM: TruckPayload = {
  plate_number: "",
  description: "",
  registration_expiry: "",
  status: "Available",
};

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [statusFilter, setStatusFilter] = useState<TruckStatus | "All">("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [form, setForm] = useState<TruckPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchTrucks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.trucks.list(
        statusFilter === "All" ? {} : { status: statusFilter }
      );
      setTrucks(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load trucks."
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchTrucks();
      }
    });
    return () => {
      active = false;
    };
  }, [fetchTrucks]);

  const openCreateModal = () => {
    setEditingTruck(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (truck: Truck) => {
    setEditingTruck(truck);
    setForm({
      plate_number: truck.plate_number,
      description: truck.description ?? "",
      registration_expiry: truck.registration_expiry
        ? truck.registration_expiry.slice(0, 10)
        : "",
      status: truck.status,
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

    const payload: TruckPayload = {
      plate_number: form.plate_number.trim().toUpperCase(),
      description: form.description?.trim() || null,
      registration_expiry: form.registration_expiry || null,
      status: form.status,
    };

    try {
      if (editingTruck) {
        await api.trucks.update(editingTruck.id, payload);
      } else {
        await api.trucks.create(payload);
      }
      setModalOpen(false);
      await fetchTrucks();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setFieldErrors(err.errors);
      } else {
        setFormError("Unable to save truck.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (truck: Truck, nextStatus: TruckStatus) => {
    setUpdatingId(truck.id);
    setError(null);
    try {
      const updated = await api.trucks.updateStatus(truck.id, nextStatus);
      setTrucks((prev) =>
        prev
          .map((item) => (item.id === truck.id ? updated : item))
          .filter(
            (item) => statusFilter === "All" || item.status === statusFilter
          )
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update status."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AppShell
      title="Fleet Management"
      subtitle="Master list of hauling trucks, registration expiries, and dispatch availability"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--button-bg)" }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add Truck
        </button>
      }
    >
      {/* Status Tabs */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 print:hidden">
        {(["All", ...TRUCK_STATUSES] as const).map((tab) => {
          const active = statusFilter === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className="min-h-[44px] px-3 sm:px-4 rounded-md text-xs sm:text-sm font-medium border transition-colors text-center"
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
              {tab}
            </button>
          );
        })}
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
              Loading trucks...
            </div>
          ) : trucks.length === 0 ? (
            <div
              className="px-4 py-10 text-center text-sm"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              No trucks match this status filter.
            </div>
          ) : (
            <div
              className="divide-y"
              style={{ borderColor: "var(--table-border)" }}
            >
              {trucks.map((truck) => {
                const expiring = isExpiringSoon(truck.registration_expiry);
                return (
                  <div key={truck.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-semibold text-sm">
                        <TruckIcon
                          className="h-4 w-4 shrink-0"
                          style={{ color: "var(--color-primary)" }}
                          aria-hidden="true"
                        />
                        {truck.plate_number}
                      </span>
                      <StatusBadge status={truck.status} />
                    </div>

                    <div className="space-y-1 text-xs">
                      <p
                        style={{
                          color: truck.description
                            ? "var(--color-foreground)"
                            : "var(--color-muted-foreground)",
                        }}
                      >
                        {truck.description || "No vehicle description"}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 tabular-nums">
                        <span style={{ color: "var(--color-muted-foreground)" }}>
                          Reg. Expiry:
                        </span>
                        <span className="font-medium">
                          {formatDate(truck.registration_expiry)}
                        </span>
                        {expiring && (
                          <span
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: "var(--color-warning-subtle)",
                              color: "var(--color-warning)",
                            }}
                          >
                            <AlertTriangle
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Expiring
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <select
                        aria-label={`Change status for ${truck.plate_number}`}
                        value={truck.status}
                        disabled={updatingId === truck.id}
                        onChange={(e) =>
                          handleQuickStatus(truck, e.target.value as TruckStatus)
                        }
                        className="flex-1 min-w-0 min-h-[42px] px-3 rounded-md border text-sm"
                        style={{
                          backgroundColor: "var(--input-bg)",
                          borderColor: "var(--input-border)",
                        }}
                      >
                        {TRUCK_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => openEditModal(truck)}
                        className="min-h-[42px] px-3.5 rounded-md border inline-flex items-center gap-1.5 text-sm font-medium hover:bg-slate-50 shrink-0"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <Edit3 className="h-4 w-4" aria-hidden="true" />
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
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
                <th className="px-4 py-3 font-semibold">Plate Number</th>
                <th className="px-4 py-3 font-semibold">Vehicle Description</th>
                <th className="px-4 py-3 font-semibold">Registration Expiry</th>
                <th className="px-4 py-3 font-semibold">Current Status</th>
                <th className="px-4 py-3 font-semibold text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    Loading trucks...
                  </td>
                </tr>
              ) : trucks.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    No trucks match this status filter.
                  </td>
                </tr>
              ) : (
                trucks.map((truck) => {
                  const expiring = isExpiringSoon(truck.registration_expiry);
                  return (
                    <tr
                      key={truck.id}
                      className="border-b last:border-b-0 hover:bg-slate-50/80"
                      style={{ borderColor: "var(--table-border)" }}
                    >
                      <td className="px-4 py-3.5 font-semibold whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <TruckIcon
                            className="h-4 w-4"
                            style={{ color: "var(--color-primary)" }}
                            aria-hidden="true"
                          />
                          {truck.plate_number}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {truck.description || (
                          <span style={{ color: "var(--color-muted-foreground)" }}>
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          {formatDate(truck.registration_expiry)}
                          {expiring && (
                            <span
                              className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: "var(--color-warning-subtle)",
                                color: "var(--color-warning)",
                              }}
                            >
                              <AlertTriangle
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Expiring
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={truck.status} />
                      </td>
                      <td className="px-4 py-3.5 print:hidden">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            aria-label={`Change status for ${truck.plate_number}`}
                            value={truck.status}
                            disabled={updatingId === truck.id}
                            onChange={(e) =>
                              handleQuickStatus(
                                truck,
                                e.target.value as TruckStatus
                              )
                            }
                            className="min-h-[44px] px-3 rounded-md border text-sm"
                            style={{
                              backgroundColor: "var(--input-bg)",
                              borderColor: "var(--input-border)",
                            }}
                          >
                            {TRUCK_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => openEditModal(truck)}
                            className="min-h-[44px] px-3 rounded-md border inline-flex items-center gap-1.5 text-sm font-medium hover:bg-slate-50"
                            style={{ borderColor: "var(--color-border)" }}
                          >
                            <Edit3 className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTruck ? `Edit Truck — ${editingTruck.plate_number}` : "Add New Truck"}
        subtitle="Truck assignments are interchangeable across trips when Available or Assigned."
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

          <FormField
            label="Plate Number"
            htmlFor="truck-plate"
            required
            error={fieldErrors.plate_number?.[0]}
          >
            <input
              id="truck-plate"
              type="text"
              required
              value={form.plate_number}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, plate_number: e.target.value }))
              }
              placeholder="e.g. NAA 1041"
              className="w-full min-h-[44px] px-3.5 rounded-md border text-sm uppercase"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
              }}
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="truck-desc"
            error={fieldErrors.description?.[0]}
          >
            <input
              id="truck-desc"
              type="text"
              value={form.description ?? ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="e.g. Isuzu Elf Closed Van (6-Wheeler)"
              className="w-full min-h-[44px] px-3.5 rounded-md border text-sm"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
              }}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Registration Expiry"
              htmlFor="truck-expiry"
              error={fieldErrors.registration_expiry?.[0]}
            >
              <input
                id="truck-expiry"
                type="date"
                value={form.registration_expiry ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    registration_expiry: e.target.value,
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
              label="Status"
              htmlFor="truck-status"
              required
              error={fieldErrors.status?.[0]}
            >
              <select
                id="truck-status"
                value={form.status}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    status: e.target.value as TruckStatus,
                  }))
                }
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                {TRUCK_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
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
                : editingTruck
                  ? "Save Changes"
                  : "Create Truck"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
