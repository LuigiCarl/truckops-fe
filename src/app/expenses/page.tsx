"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  Edit3,
  Plus,
  Receipt,
  Tag,
  Trash2,
  Truck as TruckIcon,
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
  DateRange,
  Expense,
  ExpenseCategory,
  ExpensePayload,
  Truck,
} from "@/lib/types";

interface ExpenseFormState {
  date: string;
  category_id: string;
  truck_id: string;
  amount: string;
  description: string;
}

const EMPTY_FORM: ExpenseFormState = {
  date: "",
  category_id: "",
  truck_id: "",
  amount: "",
  description: "",
};

export default function ExpensesPage() {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [scopeFilter, setScopeFilter] = useState(""); // "", "general", or String(truck.id)

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit Expense Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Delete Expense Modal
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Category Management Modal
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryFieldErrors, setCategoryFieldErrors] = useState<
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

  const loadMasterData = useCallback(async () => {
    try {
      const [categoriesRes, trucksRes] = await Promise.all([
        api.expenses.categories(),
        api.trucks.list(),
      ]);
      setCategories(categoriesRes);
      setTrucks(trucksRes);
    } catch {
      // Main fetch surfaces errors
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    if (!dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const truckIdParam =
        scopeFilter && scopeFilter !== "general"
          ? Number(scopeFilter)
          : undefined;

      const data = await api.expenses.list({
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        truck_id: truckIdParam,
        start_date: dateRange.start_date || undefined,
        end_date: dateRange.end_date || undefined,
      });
      setExpenses(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load expenses."
      );
    } finally {
      setLoading(false);
    }
  }, [dateRange, categoryFilter, scopeFilter]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void loadMasterData();
      }
    });
    return () => {
      active = false;
    };
  }, [loadMasterData]);

  useEffect(() => {
    if (!dateRange) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        void fetchExpenses();
      }
    });
    return () => {
      active = false;
    };
  }, [dateRange, fetchExpenses]);

  const displayedExpenses = useMemo(() => {
    if (scopeFilter === "general") {
      return expenses.filter((exp) => exp.truck_id === null);
    }
    return expenses;
  }, [expenses, scopeFilter]);

  const kpiStats = useMemo(() => {
    let total = 0;
    let truckTotal = 0;
    let generalTotal = 0;
    const byCategory = new Map<string, number>();

    for (const exp of displayedExpenses) {
      const amt = Number(exp.amount);
      total += amt;
      if (exp.truck_id !== null) {
        truckTotal += amt;
      } else {
        generalTotal += amt;
      }
      const catName = exp.category?.name ?? `Category #${exp.category_id}`;
      byCategory.set(catName, (byCategory.get(catName) ?? 0) + amt);
    }

    let topCategoryName = "—";
    let topCategoryAmount = 0;
    for (const [name, amt] of byCategory.entries()) {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategoryName = name;
      }
    }

    return {
      total,
      truckTotal,
      generalTotal,
      topCategoryName,
      topCategoryAmount,
    };
  }, [displayedExpenses]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setForm({
      date: getTodayIso(),
      category_id: categories[0] ? String(categories[0].id) : "",
      truck_id:
        scopeFilter && scopeFilter !== "general" ? scopeFilter : "",
      amount: "",
      description: "",
    });
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      date: expense.date.slice(0, 10),
      category_id: String(expense.category_id),
      truck_id: expense.truck_id ? String(expense.truck_id) : "",
      amount: String(Number(expense.amount)),
      description: expense.description ?? "",
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

    const payload: ExpensePayload = {
      date: form.date,
      category_id: Number(form.category_id),
      amount: Number(form.amount),
      description: form.description.trim() || null,
      truck_id: form.truck_id ? Number(form.truck_id) : null,
    };

    try {
      if (editingExpense) {
        await api.expenses.update(editingExpense.id, payload);
      } else {
        await api.expenses.create(payload);
      }
      setModalOpen(false);
      await fetchExpenses();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setFieldErrors(err.errors);
      } else {
        setFormError("Unable to save expense record.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingExpense) return;
    setDeleting(true);
    setError(null);
    try {
      await api.expenses.delete(deletingExpense.id);
      setDeletingExpense(null);
      await fetchExpenses();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to delete expense."
      );
      setDeletingExpense(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    setSavingCategory(true);
    setCategoryError(null);
    setCategoryFieldErrors({});
    try {
      const created = await api.expenses.createCategory(trimmed);
      setNewCategoryName("");
      setCategories((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );
      if (modalOpen && !form.category_id) {
        setForm((prev) => ({ ...prev, category_id: String(created.id) }));
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setCategoryError(err.message);
        setCategoryFieldErrors(err.errors);
      } else {
        setCategoryError("Unable to create category.");
      }
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <AppShell
      title="Business & Maintenance Expenses"
      subtitle="Track truck repairs, diesel, permits, and general operational overhead"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] px-4 rounded-md inline-flex items-center justify-center gap-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--button-bg)" }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Log Expense
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

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            aria-label="Filter expenses by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
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
            aria-label="Filter expenses by truck or overhead scope"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-md border text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
          >
            <option value="">All Trucks &amp; Overhead</option>
            <option value="general">General / Business Overhead Only</option>
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.plate_number}
                {truck.description ? ` — ${truck.description}` : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              setCategoryError(null);
              setCategoryFieldErrors({});
              setCategoriesModalOpen(true);
            }}
            className="w-full sm:w-auto min-h-[44px] px-3.5 rounded-md border inline-flex items-center justify-center gap-2 text-sm font-medium hover:bg-slate-50 transition-colors"
            style={{
              backgroundColor: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
          >
            <Tag className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Manage Categories ({categories.length})</span>
          </button>
        </div>

        <span
          className="text-xs font-medium tabular-nums"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          {displayedExpenses.length}{" "}
          {displayedExpenses.length === 1 ? "expense record" : "expense records"}
        </span>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            Total Expenses
          </p>
          <p className="text-xl font-bold mt-1.5 tabular-nums">
            {formatPhp(kpiStats.total)}
          </p>
          <p
            className="text-xs mt-1 tabular-nums"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Across {displayedExpenses.length} filtered items
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
            Truck Maintenance
          </p>
          <p className="text-xl font-bold mt-1.5 tabular-nums">
            {formatPhp(kpiStats.truckTotal)}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Assigned to specific plates
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
            General Overhead
          </p>
          <p className="text-xl font-bold mt-1.5 tabular-nums">
            {formatPhp(kpiStats.generalTotal)}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Garage, office &amp; admin costs
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
            Top Category
          </p>
          <p className="text-xl font-bold mt-1.5 truncate">
            {kpiStats.topCategoryName}
          </p>
          <p
            className="text-xs mt-1 tabular-nums"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            {kpiStats.topCategoryAmount > 0
              ? formatPhp(kpiStats.topCategoryAmount)
              : "No spend logged"}
          </p>
        </div>
      </div>

      {/* Expenses Table */}
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
            Loading operational expenses...
          </div>
        ) : displayedExpenses.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <Receipt
              className="h-8 w-8 mx-auto"
              style={{ color: "var(--color-muted-foreground)" }}
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold">
                No expenses match these filters
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Click &ldquo;Log Expense&rdquo; to record truck repairs, fuel,
                tolls, or business overhead.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--button-bg)" }}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Log Expense
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div
              className="md:hidden divide-y"
              style={{ borderColor: "var(--table-border)" }}
            >
              {displayedExpenses.map((expense) => (
                <div key={expense.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm">
                        {expense.category?.name ??
                          `Category #${expense.category_id}`}
                      </div>
                      <div
                        className="text-xs tabular-nums"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {formatDate(expense.date)}
                      </div>
                    </div>
                    <div className="font-bold text-base tabular-nums whitespace-nowrap">
                      {formatPhp(expense.amount)}
                    </div>
                  </div>

                  <div>
                    {expense.truck ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded"
                        style={{
                          backgroundColor: "var(--badge-assigned-bg)",
                          color: "var(--badge-assigned-fg)",
                        }}
                      >
                        <TruckIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {expense.truck.plate_number}
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded"
                        style={{
                          backgroundColor: "var(--badge-inactive-bg)",
                          color: "var(--badge-inactive-fg)",
                        }}
                      >
                        <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                        General Overhead
                      </span>
                    )}
                  </div>

                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      color: expense.description
                        ? "var(--color-foreground)"
                        : "var(--color-muted-foreground)",
                    }}
                  >
                    {expense.description || "No description provided"}
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(expense)}
                      className="flex-1 justify-center min-h-[40px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                      style={{ borderColor: "var(--color-border)" }}
                    >
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingExpense(expense)}
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
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Truck / Scope</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold text-right">Amount</th>
                  <th className="px-4 py-3 font-semibold text-right print:hidden">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody
                className="divide-y"
                style={{ borderColor: "var(--table-border)" }}
              >
                {displayedExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums font-medium">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-semibold">
                      {expense.category?.name ??
                        `Category #${expense.category_id}`}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {expense.truck ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded"
                          style={{
                            backgroundColor: "var(--badge-assigned-bg)",
                            color: "var(--badge-assigned-fg)",
                          }}
                        >
                          <TruckIcon
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          {expense.truck.plate_number}
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded"
                          style={{
                            backgroundColor: "var(--badge-inactive-bg)",
                            color: "var(--badge-inactive-fg)",
                          }}
                        >
                          <Building2
                            className="h-3.5 w-3.5"
                            aria-hidden="true"
                          />
                          General Overhead
                        </span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3.5 max-w-md"
                      style={{
                        color: expense.description
                          ? "var(--color-foreground)"
                          : "var(--color-muted-foreground)",
                      }}
                    >
                      {expense.description || "No description provided"}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold whitespace-nowrap tabular-nums">
                      {formatPhp(expense.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-right print:hidden">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(expense)}
                          className="min-h-[44px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingExpense(expense)}
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

      {/* Create / Edit Expense Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingExpense ? "Edit Expense Entry" : "Log New Expense"}
        subtitle="Categorize operational spend as truck-specific maintenance or general business overhead."
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
              label="Expense Date"
              htmlFor="expense-date"
              required
              error={fieldErrors.date?.[0]}
            >
              <input
                id="expense-date"
                type="date"
                required
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>

            <FormField
              label="Amount (PHP)"
              htmlFor="expense-amount"
              required
              error={fieldErrors.amount?.[0]}
            >
              <input
                id="expense-amount"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="3500.00"
                value={form.amount}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
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
              label="Category"
              htmlFor="expense-category"
              required
              hint={
                categories.length === 0
                  ? "Use the Categories button first to create an expense category."
                  : undefined
              }
              error={fieldErrors.category_id?.[0]}
            >
              <select
                id="expense-category"
                required
                value={form.category_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category_id: e.target.value }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Truck / Scope"
              htmlFor="expense-truck"
              hint="Leave as General Overhead if not tied to one truck."
              error={fieldErrors.truck_id?.[0]}
            >
              <select
                id="expense-truck"
                value={form.truck_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, truck_id: e.target.value }))
                }
                className="min-h-[44px] px-3 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="">General / Business Overhead</option>
                {trucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.plate_number}
                    {truck.description ? ` — ${truck.description}` : ""}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField
            label="Description / Receipt Notes"
            htmlFor="expense-description"
            error={fieldErrors.description?.[0]}
          >
            <textarea
              id="expense-description"
              rows={3}
              placeholder="e.g. Tire vulcanizing & brake pad replacement at Cabuyao Motorworks"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
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
              disabled={saving || categories.length === 0}
              className="min-h-[44px] px-5 rounded-md text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--button-bg)" }}
            >
              {saving
                ? "Saving..."
                : editingExpense
                  ? "Save Changes"
                  : "Save Expense"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={Boolean(deletingExpense)}
        onClose={() => {
          if (!deleting) setDeletingExpense(null);
        }}
        title="Delete Expense Entry"
        subtitle="Removing this expense permanently updates cash flow and expense reports."
        maxWidthClass="max-w-md"
        hideInPrint={true}
      >
        {deletingExpense && (
          <div className="space-y-4">
            <div
              className="p-4 rounded-lg border text-sm space-y-1"
              style={{
                backgroundColor: "var(--color-muted)",
                borderColor: "var(--color-border)",
              }}
            >
              <p className="font-semibold">
                {deletingExpense.category?.name ?? "Expense"} —{" "}
                {formatPhp(deletingExpense.amount)}
              </p>
              <p
                className="text-xs"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {formatDate(deletingExpense.date)} •{" "}
                {deletingExpense.truck
                  ? deletingExpense.truck.plate_number
                  : "General Overhead"}
              </p>
              {deletingExpense.description && (
                <p
                  className="text-xs pt-1"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {deletingExpense.description}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingExpense(null)}
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

      {/* Category Management Modal */}
      <Modal
        open={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        title="Expense Categories"
        subtitle="Manage reusable expense classifications for maintenance, fuel, permits, and overhead."
        maxWidthClass="max-w-lg"
        hideInPrint={true}
      >
        <div className="space-y-5">
          <form onSubmit={handleCreateCategory} className="space-y-3">
            {categoryError && (
              <div
                className="p-3 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--color-destructive-subtle)",
                  borderColor: "var(--color-destructive)",
                  color: "var(--color-destructive)",
                }}
                role="alert"
              >
                {categoryError}
              </div>
            )}

            <FormField
              label="Add New Category"
              htmlFor="new-category-name"
              error={categoryFieldErrors.name?.[0]}
            >
              <div className="flex items-center gap-2">
                <input
                  id="new-category-name"
                  type="text"
                  required
                  placeholder="e.g. Tire & Brakes, Toll Fees, LTO Registration"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 min-h-[44px] px-3 rounded-md border text-sm"
                  style={{
                    backgroundColor: "var(--input-bg)",
                    borderColor: "var(--input-border)",
                  }}
                />
                <button
                  type="submit"
                  disabled={savingCategory || !newCategoryName.trim()}
                  className="min-h-[44px] px-4 rounded-md text-sm font-semibold text-white disabled:opacity-60 shrink-0"
                  style={{ backgroundColor: "var(--button-bg)" }}
                >
                  {savingCategory ? "Adding..." : "Add"}
                </button>
              </div>
            </FormField>
          </form>

          <div
            className="border rounded-lg divide-y max-h-64 overflow-y-auto"
            style={{ borderColor: "var(--color-border)" }}
          >
            {categories.length === 0 ? (
              <p
                className="p-4 text-sm text-center"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                No expense categories added yet.
              </p>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className="px-4 py-3 flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{cat.name}</span>
                  <span
                    className="text-xs tabular-nums"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    ID #{cat.id}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
