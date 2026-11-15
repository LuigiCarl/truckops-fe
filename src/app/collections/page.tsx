"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Edit3,
  Plus,
  Route,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { DateRangeBar } from "@/components/ui/DateRangeBar";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { api, ApiError } from "@/lib/api";
import {
  formatDate,
  formatPhp,
  getCurrentMonthRange,
  getTodayIso,
} from "@/lib/format";
import type {
  CollectionPayload,
  CollectionRecord,
  DashboardSummary,
  DateRange,
} from "@/lib/types";

interface CollectionFormState {
  payment_date: string;
  amount_received: string;
  reference_notes: string;
}

const EMPTY_FORM: CollectionFormState = {
  payment_date: "",
  amount_received: "",
  reference_notes: "",
};

export default function CollectionsPage() {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [collections, setCollections] = useState<CollectionRecord[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CollectionRecord | null>(
    null
  );
  const [form, setForm] = useState<CollectionFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [deletingRecord, setDeletingRecord] =
    useState<CollectionRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const fetchCollections = useCallback(async () => {
    if (!dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        start_date: dateRange.start_date || undefined,
        end_date: dateRange.end_date || undefined,
      };
      const [collectionsRes, summaryRes] = await Promise.all([
        api.collections.list(params),
        api.dashboard.summary(params),
      ]);
      setCollections(collectionsRes);
      setSummary(summaryRes);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load collections."
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    if (!dateRange) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchCollections();
      }
    });
    return () => {
      active = false;
    };
  }, [dateRange, fetchCollections]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setForm({
      payment_date: getTodayIso(),
      amount_received: "",
      reference_notes: "",
    });
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (record: CollectionRecord) => {
    setEditingRecord(record);
    setForm({
      payment_date: record.payment_date.slice(0, 10),
      amount_received: String(Number(record.amount_received)),
      reference_notes: record.reference_notes ?? "",
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

    const payload: CollectionPayload = {
      payment_date: form.payment_date,
      amount_received: Number(form.amount_received),
      reference_notes: form.reference_notes.trim() || null,
    };

    try {
      if (editingRecord) {
        await api.collections.update(editingRecord.id, payload);
      } else {
        await api.collections.create(payload);
      }
      setModalOpen(false);
      await fetchCollections();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setFieldErrors(err.errors);
      } else {
        setFormError("Unable to save collection record.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingRecord) return;
    setDeleting(true);
    setError(null);
    try {
      await api.collections.delete(deletingRecord.id);
      setDeletingRecord(null);
      await fetchCollections();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to delete collection record."
      );
      setDeletingRecord(null);
    } finally {
      setDeleting(false);
    }
  };

  const outstanding = summary?.outstanding_ab_balance ?? 0;
  const isOutstandingPositive = outstanding > 0;

  return (
    <AppShell
      title="AB Collections & Reconciliation"
      subtitle="Log Asia Brewery payments and reconcile remittances against completed hauling earnings"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--button-bg)" }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Log Collection
        </button>
      }
    >
      <DateRangeBar
        value={dateRange ?? { start_date: "", end_date: "" }}
        onChange={setDateRange}
      />

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

      {/* Reconciliation KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Expected AB Earnings
              </p>
              <p className="text-2xl font-bold mt-2 tabular-nums">
                {summary ? formatPhp(summary.calculated_earnings) : "—"}
              </p>
              <p
                className="text-xs mt-1 tabular-nums"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {summary
                  ? `${summary.total_completed_trips} completed trips in period`
                  : "Loading period earnings..."}
              </p>
            </div>
            <span
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "var(--color-info-subtle)",
                color: "var(--color-primary)",
              }}
            >
              <Route className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Logged AB Collections
              </p>
              <p
                className="text-2xl font-bold mt-2 tabular-nums"
                style={{ color: "var(--color-success)" }}
              >
                {summary ? formatPhp(summary.total_collections) : "—"}
              </p>
              <p
                className="text-xs mt-1 tabular-nums"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {collections.length}{" "}
                {collections.length === 1 ? "payment record" : "payment records"}
              </p>
            </div>
            <span
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: "var(--color-success-subtle)",
                color: "var(--color-success)",
              }}
            >
              <Banknote className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
        </div>

        <div
          className="p-5 rounded-xl border"
          style={{
            backgroundColor: isOutstandingPositive
              ? "var(--color-warning-subtle)"
              : "var(--color-card)",
            borderColor: isOutstandingPositive
              ? "var(--color-warning)"
              : "var(--color-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{
                  color: isOutstandingPositive
                    ? "var(--color-warning)"
                    : "var(--color-muted-foreground)",
                }}
              >
                Outstanding AB Balance
              </p>
              <p
                className="text-2xl font-bold mt-2 tabular-nums"
                style={{
                  color: isOutstandingPositive
                    ? "var(--color-warning)"
                    : "var(--color-success)",
                }}
              >
                {summary ? formatPhp(outstanding) : "—"}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {summary
                  ? isOutstandingPositive
                    ? "Uncollected AB receivable"
                    : outstanding < 0
                      ? "Advance / over-collection balance"
                      : "Fully reconciled for period"
                  : "Calculating reconciliation..."}
              </p>
            </div>
            <span
              className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
              style={{
                backgroundColor: isOutstandingPositive
                  ? "var(--color-card)"
                  : "var(--color-success-subtle)",
                color: isOutstandingPositive
                  ? "var(--color-warning)"
                  : "var(--color-success)",
              }}
            >
              {isOutstandingPositive ? (
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Collections Table */}
      <section
        className="rounded-xl border overflow-hidden"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <div
          className="px-5 py-4 border-b flex items-center justify-between gap-3"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div>
            <h2 className="text-base font-semibold">Payment Remittance Log</h2>
            <p
              className="text-xs"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Recorded Asia Brewery checks, bank transfers, and remittance notes
            </p>
          </div>
          <span
            className="text-xs font-medium tabular-nums"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {collections.length} {collections.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        {loading ? (
          <div
            className="p-8 text-center text-sm"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Loading collections for period...
          </div>
        ) : collections.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Banknote
              className="h-8 w-8 mx-auto"
              style={{ color: "var(--color-muted-foreground)" }}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold">
                No AB payments logged in this period
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Click &ldquo;Log Collection&rdquo; to record an incoming check or
                bank deposit from Asia Brewery.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--button-bg)" }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Log First Collection
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div
              className="md:hidden divide-y"
              style={{ borderColor: "var(--table-border)" }}
            >
              {collections.map((item) => (
                <div key={item.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold text-sm tabular-nums">
                      {formatDate(item.payment_date)}
                    </span>
                    <span
                      className="font-bold text-base tabular-nums"
                      style={{ color: "var(--color-success)" }}
                    >
                      {formatPhp(item.amount_received)}
                    </span>
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      color: item.reference_notes
                        ? "var(--color-foreground)"
                        : "var(--color-muted-foreground)",
                    }}
                  >
                    {item.reference_notes || "No reference notes"}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      aria-label={`Edit collection from ${formatDate(item.payment_date)}`}
                      className="flex-1 justify-center min-h-[40px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingRecord(item)}
                      aria-label={`Delete collection from ${formatDate(item.payment_date)}`}
                      className="flex-1 justify-center min-h-[40px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-red-50"
                      style={{
                        borderColor: "var(--color-border)",
                        color: "var(--color-destructive)",
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
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
                  <th className="px-5 py-3 font-semibold">Payment Date</th>
                  <th className="px-5 py-3 font-semibold">
                    Reference / Remittance Notes
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Amount Received
                  </th>
                  <th className="px-5 py-3 font-semibold text-right print:hidden">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: "var(--table-border)" }}
              >
                {collections.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap tabular-nums">
                      {formatDate(item.payment_date)}
                    </td>
                    <td
                      className="px-5 py-3.5 max-w-md"
                      style={{
                        color: item.reference_notes
                          ? "var(--color-foreground)"
                          : "var(--color-muted-foreground)",
                      }}
                    >
                      {item.reference_notes || "No reference notes"}
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap tabular-nums">
                      {formatPhp(item.amount_received)}
                    </td>
                    <td className="px-5 py-3.5 text-right print:hidden">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          aria-label={`Edit collection from ${formatDate(item.payment_date)}`}
                          className="min-h-[44px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingRecord(item)}
                          aria-label={`Delete collection from ${formatDate(item.payment_date)}`}
                          className="min-h-[44px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-red-50"
                          style={{
                            borderColor: "var(--color-border)",
                            color: "var(--color-destructive)",
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingRecord ? "Edit AB Collection" : "Log New AB Collection"
        }
        subtitle="Record remittance details matching Asia Brewery check or transfer confirmation."
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
              label="Payment Date"
              htmlFor="collection-date"
              required
              error={fieldErrors.payment_date?.[0]}
            >
              <input
                id="collection-date"
                type="date"
                required
                value={form.payment_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, payment_date: e.target.value }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>

            <FormField
              label="Amount Received (PHP)"
              htmlFor="collection-amount"
              required
              error={fieldErrors.amount_received?.[0]}
            >
              <input
                id="collection-amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="45000.00"
                value={form.amount_received}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    amount_received: e.target.value,
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

          <FormField
            label="Reference / Remittance Notes"
            htmlFor="collection-notes"
            hint="Optional check number, deposit slip reference, or covered trip batch."
            error={fieldErrors.reference_notes?.[0]}
          >
            <textarea
              id="collection-notes"
              rows={3}
              placeholder="e.g. Check #0049821 — 1st Half Cabuyao remittance"
              value={form.reference_notes}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  reference_notes: e.target.value,
                }))
              }
              className="px-3 py-2.5 rounded-md border text-sm"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
              }}
            />
          </FormField>

          <div className="flex items-center justify-end gap-2 pt-2">
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
                : editingRecord
                  ? "Save Changes"
                  : "Save Collection"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deletingRecord)}
        onClose={() => {
          if (!deleting) setDeletingRecord(null);
        }}
        title="Delete Collection Record"
        subtitle="This removes the remittance entry and updates your outstanding AB balance."
        maxWidthClass="max-w-md"
        hideInPrint={true}
      >
        {deletingRecord && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-lg border text-sm space-y-1"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              <p className="font-semibold">
                {formatPhp(deletingRecord.amount_received)} on{" "}
                {formatDate(deletingRecord.payment_date)}
              </p>
              {deletingRecord.reference_notes && (
                <p
                  className="text-xs"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {deletingRecord.reference_notes}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingRecord(null)}
                className="min-h-[44px] px-4 rounded-md border text-sm font-medium hover:bg-slate-50"
                style={{ borderColor: "var(--color-border)" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="min-h-[44px] px-4 rounded-md text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--color-destructive)" }}
              >
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
