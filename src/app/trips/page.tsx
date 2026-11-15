"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Edit3, Plus, Settings2, XCircle } from "lucide-react";
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
  getTodayIso,
} from "@/lib/format";
import type {
  DateRange,
  Employee,
  Trip,
  TripPayload,
  TripStatus,
  Truck,
} from "@/lib/types";

interface TripFormState {
  date: string;
  truck_id: string;
  driver_id: string;
  helper_id: string;
  reference_no: string;
  regular_trips: string;
  overtime_trips: string;
  remarks: string;
  status: TripStatus;
}

interface PayPreviewBreakdown {
  base: number;
  ot: number;
  total: number;
}

function computeEmployeePayPreview(
  employee: Employee | undefined,
  regularTrips: number,
  overtimeTrips: number
): PayPreviewBreakdown | null {
  if (!employee) return null;
  const baseRate = Number(employee.base_rate) || 0;
  const otRate = Number(employee.ot_per_trip_rate) || 0;
  const base =
    regularTrips > 0
      ? employee.pay_type === "Daily"
        ? baseRate
        : regularTrips * baseRate
      : 0;
  const ot = overtimeTrips * otRate;
  return { base, ot, total: base + ot };
}

function TripsContent() {
  const searchParams = useSearchParams();
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [statusFilter, setStatusFilter] = useState<TripStatus | "">("");
  const [truckFilter, setTruckFilter] = useState<string>("");
  const [driverFilter, setDriverFilter] = useState<string>("");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const didAutoOpenRef = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [form, setForm] = useState<TripFormState>({
    date: "",
    truck_id: "",
    driver_id: "",
    helper_id: "",
    reference_no: "",
    regular_trips: "1",
    overtime_trips: "0",
    remarks: "",
    status: "Draft",
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [actingTripId, setActingTripId] = useState<number | null>(null);

  const [generalAbRate, setGeneralAbRate] = useState<number>(1500);
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState("1500");
  const [savingRate, setSavingRate] = useState(false);
  const [rateError, setRateError] = useState<string | null>(null);

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
      const [trucksRes, employeesRes, abRateRes] = await Promise.all([
        api.trucks.list(),
        api.employees.list(),
        api.trips.getAbRate(),
      ]);
      setTrucks(trucksRes);
      setEmployees(employeesRes);
      const parsedRate = Number(abRateRes.ab_rate_per_trip);
      if (Number.isFinite(parsedRate) && parsedRate >= 0) {
        setGeneralAbRate(parsedRate);
        setRateInput(String(parsedRate));
      }
    } catch {
      // Errors surface in main fetch
    }
  }, []);

  const fetchTrips = useCallback(async () => {
    if (!dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.trips.list({
        status: statusFilter || undefined,
        truck_id: truckFilter ? Number(truckFilter) : undefined,
        driver_id: driverFilter ? Number(driverFilter) : undefined,
        start_date: dateRange.start_date || undefined,
        end_date: dateRange.end_date || undefined,
      });
      setTrips(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load trips.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, statusFilter, truckFilter, driverFilter]);

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
        void fetchTrips();
      }
    });
    return () => {
      active = false;
    };
  }, [dateRange, fetchTrips]);

  const drivers = useMemo(
    () => employees.filter((e) => e.role === "Driver"),
    [employees]
  );
  const helpers = useMemo(
    () => employees.filter((e) => e.role === "Helper"),
    [employees]
  );

  const selectableTrucks = useMemo(
    () =>
      trucks.filter(
        (t) =>
          t.status === "Available" ||
          t.status === "Assigned" ||
          (editingTrip && t.id === editingTrip.truck_id)
      ),
    [trucks, editingTrip]
  );

  const selectableDrivers = useMemo(
    () =>
      drivers.filter(
        (d) =>
          d.status === "Active" ||
          (editingTrip && d.id === editingTrip.driver_id)
      ),
    [drivers, editingTrip]
  );

  const selectableHelpers = useMemo(
    () =>
      helpers.filter(
        (h) =>
          h.status === "Active" ||
          (editingTrip && h.id === editingTrip.helper_id)
      ),
    [helpers, editingTrip]
  );

  const openCreateModal = useCallback(() => {
    const defaultTruck =
      trucks.find((t) => t.status === "Available" || t.status === "Assigned")
        ?.id ?? "";
    const defaultDriver =
      drivers.find((d) => d.status === "Active")?.id ?? "";

    setEditingTrip(null);
    setForm({
      date: getTodayIso(),
      truck_id: defaultTruck ? String(defaultTruck) : "",
      driver_id: defaultDriver ? String(defaultDriver) : "",
      helper_id: "",
      reference_no: "",
      regular_trips: "1",
      overtime_trips: "0",
      remarks: "",
      status: "Draft",
    });
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  }, [trucks, drivers]);

  useEffect(() => {
    if (
      searchParams.get("new") === "1" &&
      !didAutoOpenRef.current &&
      (trucks.length > 0 || drivers.length > 0)
    ) {
      didAutoOpenRef.current = true;
      let active = true;
      Promise.resolve().then(() => {
        if (active) {
          openCreateModal();
        }
      });
      return () => {
        active = false;
      };
    }
  }, [searchParams, trucks.length, drivers.length, openCreateModal]);

  const openEditModal = (trip: Trip) => {
    setEditingTrip(trip);
    setForm({
      date: trip.date.slice(0, 10),
      truck_id: String(trip.truck_id),
      driver_id: String(trip.driver_id),
      helper_id: trip.helper_id ? String(trip.helper_id) : "",
      reference_no: trip.reference_no ?? "",
      regular_trips: String(trip.regular_trips),
      overtime_trips: String(trip.overtime_trips),
      remarks: trip.remarks ?? "",
      status: trip.status,
    });
    setFormError(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const selectedDriver = useMemo(
    () => drivers.find((d) => String(d.id) === form.driver_id),
    [drivers, form.driver_id]
  );
  const selectedHelper = useMemo(
    () => helpers.find((h) => String(h.id) === form.helper_id),
    [helpers, form.helper_id]
  );

  const parsedRegularTrips = Math.max(0, Number.parseInt(form.regular_trips || "0", 10) || 0);
  const parsedOvertimeTrips = Math.max(0, Number.parseInt(form.overtime_trips || "0", 10) || 0);
  const parsedTotalTrips = parsedRegularTrips + parsedOvertimeTrips;
  const effectiveAbRate =
    editingTrip && editingTrip.status !== "Draft"
      ? Number(editingTrip.ab_rate_per_trip)
      : generalAbRate;
  const previewAbRevenue = parsedTotalTrips * effectiveAbRate;

  const previewDriverPay = computeEmployeePayPreview(
    selectedDriver,
    parsedRegularTrips,
    parsedOvertimeTrips
  );
  const previewHelperPay = computeEmployeePayPreview(
    selectedHelper,
    parsedRegularTrips,
    parsedOvertimeTrips
  );

  const handleSaveGeneralRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(rateInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setRateError("Enter a valid non-negative rate per trip.");
      return;
    }

    setSavingRate(true);
    setRateError(null);
    try {
      const res = await api.trips.updateAbRate(parsed);
      const updatedRate = Number(res.ab_rate_per_trip);
      const resolvedRate =
        Number.isFinite(updatedRate) && updatedRate >= 0 ? updatedRate : parsed;
      setGeneralAbRate(resolvedRate);
      setRateInput(String(resolvedRate));
      setEditingRate(false);
      await fetchTrips();
    } catch (err) {
      setRateError(
        err instanceof ApiError ? err.message : "Failed to update AB rate."
      );
    } finally {
      setSavingRate(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFieldErrors({});

    const payload: TripPayload = {
      date: form.date,
      truck_id: Number(form.truck_id),
      driver_id: Number(form.driver_id),
      helper_id: form.helper_id ? Number(form.helper_id) : null,
      reference_no: form.reference_no.trim() || null,
      regular_trips: parsedRegularTrips,
      overtime_trips: parsedOvertimeTrips,
      remarks: form.remarks.trim() || null,
      status: form.status,
    };

    try {
      if (editingTrip) {
        await api.trips.update(editingTrip.id, payload);
      } else {
        await api.trips.create(payload);
      }
      setModalOpen(false);
      await fetchTrips();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setFieldErrors(err.errors);
      } else {
        setFormError("Unable to save trip.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (trip: Trip, nextStatus: TripStatus) => {
    setActingTripId(trip.id);
    setError(null);
    try {
      const updated = await api.trips.updateStatus(trip.id, nextStatus);
      setTrips((prev) =>
        prev
          .map((item) => (item.id === trip.id ? updated : item))
          .filter((item) => !statusFilter || item.status === statusFilter)
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update trip status."
      );
    } finally {
      setActingTripId(null);
    }
  };

  const completedTrips = useMemo(
    () => trips.filter((t) => t.status === "Completed"),
    [trips]
  );

  const activeTrips = useMemo(
    () => trips.filter((t) => t.status !== "Cancelled"),
    [trips]
  );

  const completedTripsCount = useMemo(
    () => completedTrips.reduce((sum, t) => sum + t.total_trips, 0),
    [completedTrips]
  );

  const completedRevenue = useMemo(
    () =>
      completedTrips.reduce(
        (sum, t) => sum + Number(t.ab_flat_rate_applied),
        0
      ),
    [completedTrips]
  );

  const completedCrewPay = useMemo(
    () =>
      completedTrips.reduce(
        (sum, t) =>
          sum + Number(t.driver_pay_applied) + Number(t.helper_pay_applied ?? 0),
        0
      ),
    [completedTrips]
  );

  const totalRegularTrips = useMemo(
    () => activeTrips.reduce((sum, t) => sum + t.regular_trips, 0),
    [activeTrips]
  );

  const totalOvertimeTrips = useMemo(
    () => activeTrips.reduce((sum, t) => sum + t.overtime_trips, 0),
    [activeTrips]
  );

  const totalActiveTrips = useMemo(
    () => activeTrips.reduce((sum, t) => sum + t.total_trips, 0),
    [activeTrips]
  );

  const draftCount = useMemo(
    () => trips.filter((t) => t.status === "Draft").length,
    [trips]
  );

  return (
    <AppShell
      title="Daily Trips & Verification"
      subtitle="Encode daily Asia Brewery trip counts per truck & crew and verify against the Monitoring Sheet"
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
          style={{ backgroundColor: "var(--button-bg)" }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Encode Daily Log
        </button>
      }
    >
      <DateRangeBar
        value={dateRange ?? { start_date: "", end_date: "" }}
        onChange={setDateRange}
      />

      {/* General AB Rate Setting Bar */}
      <div
        className="p-4 rounded-lg border flex flex-wrap items-center justify-between gap-3 print:hidden"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            General AB Rate / Trip:
          </span>
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: "var(--color-primary)" }}
          >
            {formatPhp(generalAbRate)}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            Auto-applied to new &amp; Draft logs; Completed logs remain locked at their recorded snapshot.
          </span>
        </div>

        {editingRate ? (
          <form
            onSubmit={handleSaveGeneralRate}
            className="w-full sm:w-auto flex flex-wrap items-center gap-2"
          >
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial min-w-[140px]">
              <label
                htmlFor="general-ab-rate-input"
                className="text-xs font-medium sr-only"
              >
                General AB Rate Per Trip (PHP)
              </label>
              <span
                className="text-sm font-semibold"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                ₱
              </span>
              <input
                id="general-ab-rate-input"
                type="number"
                step="0.01"
                min="0"
                required
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                className="flex-1 sm:w-32 min-w-0 min-h-[40px] px-3 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={savingRate}
                className="flex-1 sm:flex-initial min-h-[40px] px-3.5 rounded-md text-xs font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "var(--button-bg)" }}
              >
                {savingRate ? "Saving..." : "Save Rate"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingRate(false);
                  setRateInput(String(generalAbRate));
                  setRateError(null);
                }}
                className="flex-1 sm:flex-initial min-h-[40px] px-3 rounded-md border text-xs font-medium hover:bg-slate-50"
                style={{ borderColor: "var(--color-border)" }}
              >
                Cancel
              </button>
            </div>
            <span
              className="text-[11px] w-full sm:w-auto"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Applies to new &amp; Draft logs
            </span>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setRateInput(String(generalAbRate));
              setRateError(null);
              setEditingRate(true);
            }}
            className="w-full sm:w-auto justify-center min-h-[40px] px-3 rounded-md border inline-flex items-center gap-1.5 text-xs font-medium hover:bg-slate-50"
            style={{ borderColor: "var(--color-border)" }}
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            Change Rate
          </button>
        )}
      </div>

      {rateError && (
        <div
          className="p-3 rounded-lg border text-sm font-medium"
          style={{
            backgroundColor: "var(--color-destructive-subtle)",
            borderColor: "var(--color-destructive)",
            color: "var(--color-destructive)",
          }}
          role="alert"
        >
          {rateError}
        </div>
      )}

      {/* Filter Bar + Summary Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto print:hidden">
          <select
            aria-label="Filter by trip status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TripStatus | "")}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-md border text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
          >
            <option value="">All Statuses</option>
            <option value="Draft">Draft (Pending Verification)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          <select
            aria-label="Filter by truck"
            value={truckFilter}
            onChange={(e) => setTruckFilter(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-md border text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
          >
            <option value="">All Trucks</option>
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.plate_number}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by driver"
            value={driverFilter}
            onChange={(e) => setDriverFilter(e.target.value)}
            className="w-full sm:w-auto min-h-[44px] px-3 rounded-md border text-sm"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
            }}
          >
            <option value="">All Drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.last_name}, {driver.first_name}
              </option>
            ))}
          </select>
        </div>

        <div
          className="w-full lg:w-auto px-3.5 py-2.5 rounded-lg border text-xs sm:text-sm flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-4 tabular-nums"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <span>
            Showing <strong>{trips.length}</strong>{" "}
            {trips.length === 1 ? "log" : "logs"} (
            <strong>{completedTripsCount}</strong> completed trips)
          </span>
          <span style={{ color: "var(--color-warning)" }}>
            Draft: <strong>{draftCount}</strong>
          </span>
          <span style={{ color: "var(--color-success)" }}>
            Completed Earnings: <strong>{formatPhp(completedRevenue)}</strong>
          </span>
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
              className="p-8 text-center text-sm"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Loading trips...
            </div>
          ) : trips.length === 0 ? (
            <div
              className="p-8 text-center text-sm"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              No trips match the selected filters.
            </div>
          ) : (
            <>
              <div
                className="divide-y"
                style={{ borderColor: "var(--table-border)" }}
              >
                {trips.map((trip) => (
                  <div key={trip.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm tabular-nums">
                          {formatDate(trip.date)}
                        </div>
                        <div
                          className="text-xs font-mono"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {trip.reference_no || "No Ref #"}
                        </div>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>

                    <div>
                      <div className="font-semibold text-sm">
                        {trip.truck?.plate_number ?? `Truck #${trip.truck_id}`}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        Driver:{" "}
                        {trip.driver
                          ? `${trip.driver.first_name} ${trip.driver.last_name}`
                          : `#${trip.driver_id}`}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        Helper:{" "}
                        {trip.helper
                          ? `${trip.helper.first_name} ${trip.helper.last_name}`
                          : "—"}
                      </div>
                    </div>

                    <div
                      className="grid grid-cols-3 gap-2 p-2.5 rounded-md text-xs tabular-nums"
                      style={{ backgroundColor: "var(--color-muted)" }}
                    >
                      <div>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Trips
                        </span>
                        <strong className="text-sm">{trip.total_trips}</strong>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {trip.regular_trips}R + {trip.overtime_trips}OT
                        </span>
                      </div>
                      <div>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          AB Revenue
                        </span>
                        <strong
                          className="text-sm block"
                          style={{ color: "var(--color-primary)" }}
                        >
                          {formatPhp(trip.ab_flat_rate_applied)}
                        </strong>
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          @{formatPhp(trip.ab_rate_per_trip)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span
                          className="block text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          Crew Pay
                        </span>
                        <div className="font-semibold">
                          D: {formatPhp(trip.driver_pay_applied)}
                        </div>
                        <div
                          className="text-[11px]"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          H:{" "}
                          {trip.helper_pay_applied !== null
                            ? formatPhp(trip.helper_pay_applied)
                            : "—"}
                        </div>
                      </div>
                    </div>

                    {trip.remarks && (
                      <p
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {trip.remarks}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {trip.status === "Draft" && (
                        <>
                          <button
                            type="button"
                            disabled={actingTripId === trip.id}
                            onClick={() =>
                              handleStatusChange(trip, "Completed")
                            }
                            className="flex-1 justify-center min-h-[40px] px-2.5 rounded-md text-xs font-semibold text-white inline-flex items-center gap-1 disabled:opacity-60"
                            style={{ backgroundColor: "var(--color-success)" }}
                          >
                            <CheckCircle2
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Verify
                          </button>
                          <button
                            type="button"
                            disabled={actingTripId === trip.id}
                            onClick={() =>
                              handleStatusChange(trip, "Cancelled")
                            }
                            className="flex-1 justify-center min-h-[40px] px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1 hover:bg-red-50 disabled:opacity-60"
                            style={{
                              borderColor: "var(--color-border)",
                              color: "var(--color-destructive)",
                            }}
                          >
                            <XCircle
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Cancel
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(trip)}
                        className="flex-1 justify-center min-h-[40px] px-2.5 rounded-md border inline-flex items-center gap-1 text-xs font-medium hover:bg-slate-50"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div
                className="p-3.5 border-t-2 text-xs space-y-1 tabular-nums"
                style={{
                  backgroundColor: "var(--table-header-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--color-muted-foreground)" }}>
                    Active Totals (excl. Cancelled)
                  </span>
                  <span className="font-semibold">
                    {totalRegularTrips} Reg + {totalOvertimeTrips} OT ={" "}
                    <strong>{totalActiveTrips} Trips</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span style={{ color: "var(--color-muted-foreground)" }}>
                    Completed Revenue / Crew Pay
                  </span>
                  <span>
                    <strong style={{ color: "var(--color-success)" }}>
                      {formatPhp(completedRevenue)}
                    </strong>{" "}
                    / <strong>{formatPhp(completedCrewPay)}</strong>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hidden md:block print:block overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr
                className="border-b text-xs uppercase tracking-wide"
                style={{
                  backgroundColor: "var(--table-header-bg)",
                  color: "var(--table-header-fg)",
                  borderColor: "var(--table-border)",
                }}
              >
                <th className="px-4 py-3 font-semibold whitespace-nowrap">
                  Date &amp; Ref
                </th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">
                  Truck &amp; Crew
                </th>
                <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                  Reg
                </th>
                <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                  OT
                </th>
                <th className="px-3 py-3 font-semibold text-center whitespace-nowrap">
                  Total Trips
                </th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                  AB Revenue
                </th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                  Crew Pay
                </th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">
                  Status
                </th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap print:hidden">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: "var(--table-border)" }}
            >
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    Loading trips...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    No trips match the selected filters.
                  </td>
                </tr>
              ) : (
                trips.map((trip) => (
                  <tr
                    key={trip.id}
                    className="hover:bg-slate-50/80"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap tabular-nums align-middle">
                      <div className="font-semibold">
                        {formatDate(trip.date)}
                      </div>
                      <div
                        className="text-xs font-mono"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {trip.reference_no || "No Ref #"}
                      </div>
                      {trip.remarks && (
                        <p
                          className="text-[11px] mt-0.5 max-w-[180px] truncate"
                          style={{ color: "var(--color-muted-foreground)" }}
                          title={trip.remarks}
                        >
                          {trip.remarks}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap align-middle">
                      <div className="font-semibold">
                        {trip.truck?.plate_number ?? `Truck #${trip.truck_id}`}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        Driver:{" "}
                        {trip.driver
                          ? `${trip.driver.first_name} ${trip.driver.last_name}`
                          : `#${trip.driver_id}`}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        Helper:{" "}
                        {trip.helper
                          ? `${trip.helper.first_name} ${trip.helper.last_name}`
                          : "—"}
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap tabular-nums align-middle font-medium">
                      {trip.regular_trips}
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap tabular-nums align-middle">
                      {trip.overtime_trips > 0 ? (
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold"
                          style={{
                            backgroundColor: "var(--color-warning-subtle)",
                            color: "var(--color-warning)",
                          }}
                        >
                          +{trip.overtime_trips}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-muted-foreground)" }}>
                          0
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3.5 text-center whitespace-nowrap tabular-nums align-middle">
                      <span
                        className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded font-bold text-sm"
                        style={{ backgroundColor: "var(--color-muted)" }}
                      >
                        {trip.total_trips}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums align-middle">
                      <div className="font-bold">
                        {formatPhp(trip.ab_flat_rate_applied)}
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: "var(--color-muted-foreground)" }}
                      >
                        {trip.total_trips} × {formatPhp(trip.ab_rate_per_trip)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums align-middle text-xs">
                      <div className="inline-grid grid-cols-[auto_auto] gap-x-2 gap-y-0.5 text-right">
                        <span style={{ color: "var(--color-muted-foreground)" }}>
                          Driver:
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: "var(--color-foreground)" }}
                        >
                          {formatPhp(trip.driver_pay_applied)}
                        </span>
                        <span style={{ color: "var(--color-muted-foreground)" }}>
                          Helper:
                        </span>
                        <span className="font-medium">
                          {trip.helper_pay_applied !== null
                            ? formatPhp(trip.helper_pay_applied)
                            : "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center whitespace-nowrap align-middle">
                      <StatusBadge status={trip.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap align-middle print:hidden">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {trip.status === "Draft" && (
                          <>
                            <button
                              type="button"
                              disabled={actingTripId === trip.id}
                              onClick={() =>
                                handleStatusChange(trip, "Completed")
                              }
                              title="Verify & Complete"
                              className="min-h-[38px] px-2.5 rounded-md text-xs font-semibold text-white inline-flex items-center gap-1 disabled:opacity-60 whitespace-nowrap"
                              style={{ backgroundColor: "var(--color-success)" }}
                            >
                              <CheckCircle2
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Verify
                            </button>
                            <button
                              type="button"
                              disabled={actingTripId === trip.id}
                              onClick={() =>
                                handleStatusChange(trip, "Cancelled")
                              }
                              className="min-h-[38px] px-2.5 rounded-md border text-xs font-medium inline-flex items-center gap-1 hover:bg-red-50 disabled:opacity-60 whitespace-nowrap"
                              style={{
                                borderColor: "var(--color-border)",
                                color: "var(--color-destructive)",
                              }}
                            >
                              <XCircle
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              Cancel
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(trip)}
                          className="min-h-[38px] px-2.5 rounded-md border inline-flex items-center gap-1 text-xs font-medium hover:bg-slate-50 whitespace-nowrap"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {!loading && trips.length > 0 && (
              <tfoot
                className="border-t-2 font-semibold text-xs"
                style={{
                  backgroundColor: "var(--table-header-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                <tr>
                  <td
                    className="px-4 py-3"
                    colSpan={2}
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    Active Totals (excl. Cancelled) • Completed Summary
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {totalRegularTrips}
                  </td>
                  <td className="px-3 py-3 text-center tabular-nums">
                    {totalOvertimeTrips}
                  </td>
                  <td className="px-3 py-3 text-center font-bold tabular-nums">
                    {totalActiveTrips}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    <div
                      className="font-bold"
                      style={{ color: "var(--color-success)" }}
                    >
                      {formatPhp(completedRevenue)}
                    </div>
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      Completed
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    <div className="font-bold">{formatPhp(completedCrewPay)}</div>
                    <div
                      className="text-[11px] font-medium"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      Completed
                    </div>
                  </td>
                  <td className="px-4 py-3" />
                  <td className="px-4 py-3 print:hidden" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingTrip
            ? `Edit Daily Log #${editingTrip.id}`
            : "Encode Daily Trip Log"
        }
        subtitle="Record all trips made inside Asia Brewery today. Revenue & crew pay snapshot automatically."
        maxWidthClass="max-w-2xl"
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
              label="Trip Date"
              htmlFor="trip-date"
              required
              error={fieldErrors.date?.[0]}
            >
              <input
                id="trip-date"
                type="date"
                required
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm tabular-nums"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>

            <FormField
              label="Monitoring Sheet Ref #"
              htmlFor="trip-ref"
              error={fieldErrors.reference_no?.[0]}
            >
              <input
                id="trip-ref"
                type="text"
                value={form.reference_no}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reference_no: e.target.value }))
                }
                placeholder="e.g. MS-001"
                className="w-full min-h-[44px] px-3.5 rounded-md border text-sm font-mono"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField
              label="Assigned Truck"
              htmlFor="trip-truck"
              required
              error={fieldErrors.truck_id?.[0]}
            >
              <select
                id="trip-truck"
                required
                value={form.truck_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, truck_id: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="">Select truck</option>
                {selectableTrucks.map((truck) => (
                  <option key={truck.id} value={truck.id}>
                    {truck.plate_number} ({truck.status})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Driver"
              htmlFor="trip-driver"
              required
              error={fieldErrors.driver_id?.[0]}
            >
              <select
                id="trip-driver"
                required
                value={form.driver_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, driver_id: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="">Select driver</option>
                {selectableDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.last_name}, {driver.first_name} ({driver.pay_type})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Helper (Optional)"
              htmlFor="trip-helper"
              error={fieldErrors.helper_id?.[0]}
            >
              <select
                id="trip-helper"
                value={form.helper_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, helper_id: e.target.value }))
                }
                className="w-full min-h-[44px] px-3 rounded-md border text-sm"
                style={{
                  backgroundColor: "var(--input-bg)",
                  borderColor: "var(--input-border)",
                }}
              >
                <option value="">No helper assigned</option>
                {selectableHelpers.map((helper) => (
                  <option key={helper.id} value={helper.id}>
                    {helper.last_name}, {helper.first_name} ({helper.pay_type})
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Regular Trips"
              htmlFor="trip-regular-count"
              required
              error={fieldErrors.regular_trips?.[0]}
            >
              <input
                id="trip-regular-count"
                type="number"
                min="0"
                step="1"
                required
                value={form.regular_trips}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    regular_trips: e.target.value,
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
              label="Overtime Trips (OT)"
              htmlFor="trip-ot-count"
              required
              error={fieldErrors.overtime_trips?.[0]}
            >
              <input
                id="trip-ot-count"
                type="number"
                min="0"
                step="1"
                required
                value={form.overtime_trips}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    overtime_trips: e.target.value,
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

          <FormField
            label="Verification Status"
            htmlFor="trip-status"
            error={fieldErrors.status?.[0]}
          >
            <select
              id="trip-status"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as TripStatus,
                }))
              }
              className="w-full min-h-[44px] px-3.5 rounded-md border text-sm"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
              }}
            >
              <option value="Draft">Draft (Pending Verification)</option>
              <option value="Completed">Completed (Verified)</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </FormField>

          {/* Live Revenue & Pay Snapshot Preview */}
          <div
            className="p-3.5 rounded-lg border text-sm grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums"
            style={{
              backgroundColor: "var(--color-background)",
              borderColor: "var(--color-border)",
            }}
          >
            <div>
              <span
                className="text-xs block"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Total Trips
              </span>
              <strong>
                {parsedTotalTrips} ({parsedRegularTrips} Reg +{" "}
                {parsedOvertimeTrips} OT)
              </strong>
            </div>

            <div>
              <span
                className="text-xs block"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Total AB Revenue
              </span>
              <strong style={{ color: "var(--color-primary)" }}>
                {formatPhp(previewAbRevenue)}
              </strong>
              <span
                className="text-[11px] block"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {parsedTotalTrips} × {formatPhp(effectiveAbRate)}/trip (
                {editingTrip && editingTrip.status !== "Draft"
                  ? "Locked"
                  : "General rate"}
                )
              </span>
            </div>

            <div>
              <span
                className="text-xs block"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Driver Pay ({selectedDriver?.pay_type ?? "—"})
              </span>
              <strong>
                {previewDriverPay ? formatPhp(previewDriverPay.total) : "—"}
              </strong>
              {previewDriverPay && previewDriverPay.ot > 0 && (
                <span
                  className="text-[11px] block"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {formatPhp(previewDriverPay.base)} +{" "}
                  {formatPhp(previewDriverPay.ot)} OT
                </span>
              )}
            </div>

            <div>
              <span
                className="text-xs block"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Helper Pay ({selectedHelper?.pay_type ?? "None"})
              </span>
              <strong>
                {previewHelperPay ? formatPhp(previewHelperPay.total) : "None"}
              </strong>
              {previewHelperPay && previewHelperPay.ot > 0 && (
                <span
                  className="text-[11px] block"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {formatPhp(previewHelperPay.base)} +{" "}
                  {formatPhp(previewHelperPay.ot)} OT
                </span>
              )}
            </div>
          </div>

          <FormField
            label="Remarks / Monitoring Sheet Notes"
            htmlFor="trip-remarks"
            error={fieldErrors.remarks?.[0]}
          >
            <textarea
              id="trip-remarks"
              rows={2}
              value={form.remarks}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, remarks: e.target.value }))
              }
              placeholder="Optional notes from paper monitoring sheet..."
              className="w-full px-3.5 py-2.5 rounded-md border text-sm"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--input-border)",
              }}
            />
          </FormField>

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
                : editingTrip
                  ? "Save Trip Changes"
                  : "Save Trip"}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading trips...</div>}>
      <TripsContent />
    </Suspense>
  );
}
