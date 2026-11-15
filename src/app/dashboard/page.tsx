"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Plus,
  Receipt,
  RefreshCw,
  Route,
  Truck as TruckIcon,
  Users,
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
  isExpiringSoon,
} from "@/lib/format";
import type { DashboardSummary, DateRange, Trip, Truck } from "@/lib/types";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchData = useCallback(async () => {
    if (!dateRange) return;
    setLoading(true);
    setError(null);
    try {
      const params = {
        start_date: dateRange.start_date || undefined,
        end_date: dateRange.end_date || undefined,
      };
      const [summaryRes, tripsRes, trucksRes] = await Promise.all([
        api.dashboard.summary(params),
        api.trips.list(params),
        api.trucks.list(),
      ]);
      setSummary(summaryRes);
      setRecentTrips(tripsRes.slice(0, 6));
      setTrucks(trucksRes);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load dashboard data."
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
        void fetchData();
      }
    });
    return () => {
      active = false;
    };
  }, [dateRange, fetchData]);

  const kpiCards = summary
    ? [
        {
          label: "Expected AB Earnings",
          value: formatPhp(summary.calculated_earnings),
          subtext: `${summary.total_completed_trips} completed trips`,
          icon: Route,
          accent: "var(--color-primary)",
          bg: "var(--color-info-subtle)",
        },
        {
          label: "AB Collections Received",
          value: formatPhp(summary.total_collections),
          subtext: "Logged client payments",
          icon: Banknote,
          accent: "var(--color-success)",
          bg: "var(--color-success-subtle)",
        },
        {
          label: "Outstanding AB Balance",
          value: formatPhp(summary.outstanding_ab_balance),
          subtext:
            summary.outstanding_ab_balance > 0
              ? "Awaiting collection from AB"
              : "Fully reconciled",
          icon: Wallet,
          accent:
            summary.outstanding_ab_balance > 0
              ? "var(--color-warning)"
              : "var(--color-success)",
          bg:
            summary.outstanding_ab_balance > 0
              ? "var(--color-warning-subtle)"
              : "var(--color-success-subtle)",
        },
        {
          label: "Net Cash Flow",
          value: formatPhp(summary.net_cash_flow),
          subtext: "Collections − (Expenses + Payroll Paid)",
          icon: Banknote,
          accent:
            summary.net_cash_flow >= 0
              ? "var(--color-success)"
              : "var(--color-destructive)",
          bg:
            summary.net_cash_flow >= 0
              ? "var(--color-success-subtle)"
              : "var(--color-destructive-subtle)",
        },
        {
          label: "Active Fleet",
          value: String(summary.active_trucks),
          subtext: "Available or Assigned trucks",
          icon: TruckIcon,
          accent: "var(--color-primary)",
          bg: "var(--color-info-subtle)",
        },
        {
          label: "Active Employees",
          value: String(summary.active_employees),
          subtext: "Drivers & Helpers on roster",
          icon: Users,
          accent: "var(--color-primary)",
          bg: "var(--color-info-subtle)",
        },
        {
          label: "Business Expenses",
          value: formatPhp(summary.total_expenses),
          subtext: "Fuel, maintenance & ops",
          icon: Receipt,
          accent: "var(--color-warning)",
          bg: "var(--color-warning-subtle)",
        },
        {
          label: "Employee Compensation",
          value: formatPhp(summary.total_employee_compensation),
          subtext: `Paid: ${formatPhp(summary.total_payroll_paid)} · Unpaid: ${formatPhp(summary.total_payroll_unpaid)}`,
          icon: Wallet,
          accent: "var(--color-foreground)",
          bg: "var(--color-muted)",
        },
      ]
    : [];

  return (
    <AppShell
      title="Executive Dashboard"
      subtitle="Real-time hauling earnings, fleet status, and cash flow overview"
      actions={
        <>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="min-h-[44px] px-3.5 rounded-md border inline-flex items-center gap-2 text-sm font-medium hover:bg-slate-50"
            style={{
              backgroundColor: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Refresh
          </button>
          <Link
            href="/trips?new=1"
            className="min-h-[44px] px-4 rounded-md inline-flex items-center gap-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--button-bg)" }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Encode Trip
          </Link>
        </>
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

      {/* KPI Cards */}
      <section aria-label="Key business metrics">
        {loading && !summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="h-32 rounded-lg border animate-pulse"
                style={{
                  backgroundColor: "var(--card-bg)",
                  borderColor: "var(--card-border)",
                }}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-lg border p-4 sm:p-5 flex flex-col justify-between gap-3"
                  style={{
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                    boxShadow: "var(--card-shadow)",
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {card.label}
                    </span>
                    <span
                      className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: card.bg,
                        color: card.accent,
                      }}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold tabular-nums tracking-tight">
                      {card.value}
                    </div>
                    <p
                      className="text-xs mt-1 tabular-nums"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {card.subtext}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Split: Recent Trips + Fleet Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section
          className="lg:col-span-2 rounded-lg border overflow-hidden"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between gap-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div>
              <h2 className="text-base font-semibold">Recent Trips</h2>
              <p
                className="text-xs"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Latest encoded trips in selected period
              </p>
            </div>
            <Link
              href="/trips"
              className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              View All
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden">
            {recentTrips.length === 0 ? (
              <div
                className="px-4 py-10 text-center text-sm"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                No trips recorded for this period yet.{" "}
                <Link
                  href="/trips?new=1"
                  className="font-semibold underline"
                  style={{ color: "var(--color-primary)" }}
                >
                  Encode your first trip
                </Link>
                .
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: "var(--table-border)" }}
              >
                {recentTrips.map((trip) => (
                  <div key={trip.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm tabular-nums">
                          {formatDate(trip.date)}
                        </div>
                        {trip.reference_no && (
                          <div
                            className="text-xs font-mono"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {trip.reference_no}
                          </div>
                        )}
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
                        {trip.driver
                          ? `${trip.driver.first_name} ${trip.driver.last_name}`
                          : "—"}
                        {trip.helper
                          ? ` + ${trip.helper.first_name} ${trip.helper.last_name}`
                          : ""}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-2 pt-1 tabular-nums">
                      <div className="text-xs">
                        <span className="font-semibold text-sm">
                          {trip.total_trips}{" "}
                          {trip.total_trips === 1 ? "trip" : "trips"}
                        </span>
                        <div style={{ color: "var(--color-muted-foreground)" }}>
                          {trip.regular_trips} reg + {trip.overtime_trips} OT @{" "}
                          {formatPhp(trip.ab_rate_per_trip)}/trip
                        </div>
                      </div>
                      <div className="text-right font-bold text-sm">
                        {formatPhp(trip.ab_flat_rate_applied)}
                      </div>
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
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">
                    Date
                  </th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">
                    Truck &amp; Crew
                  </th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">
                    Trips Made
                  </th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">
                    Total AB Revenue
                  </th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTrips.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-sm"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      No trips recorded for this period yet.{" "}
                      <Link
                        href="/trips?new=1"
                        className="font-semibold underline"
                        style={{ color: "var(--color-primary)" }}
                      >
                        Encode your first trip
                      </Link>
                      .
                    </td>
                  </tr>
                ) : (
                  recentTrips.map((trip) => (
                    <tr
                      key={trip.id}
                      className="border-b last:border-b-0 hover:bg-slate-50/80"
                      style={{ borderColor: "var(--table-border)" }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                        <div className="font-medium">{formatDate(trip.date)}</div>
                        {trip.reference_no && (
                          <div
                            className="text-xs font-mono"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            {trip.reference_no}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">
                          {trip.truck?.plate_number ?? `Truck #${trip.truck_id}`}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {trip.driver
                            ? `${trip.driver.first_name} ${trip.driver.last_name}`
                            : "—"}
                          {trip.helper
                            ? ` + ${trip.helper.first_name} ${trip.helper.last_name}`
                            : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <div className="font-medium">
                          {trip.total_trips}{" "}
                          {trip.total_trips === 1 ? "trip" : "trips"}
                          {trip.overtime_trips > 0 && (
                            <span
                              className="ml-2 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: "var(--color-warning-subtle)",
                                color: "var(--color-warning)",
                              }}
                            >
                              {trip.overtime_trips} OT
                            </span>
                          )}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--color-muted-foreground)" }}
                        >
                          {trip.regular_trips} reg + {trip.overtime_trips} OT @{" "}
                          {formatPhp(trip.ab_rate_per_trip)}/trip
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
                        {formatPhp(trip.ab_flat_rate_applied)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <StatusBadge status={trip.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Fleet Status Snapshot */}
        <section
          className="rounded-lg border overflow-hidden flex flex-col"
          style={{
            backgroundColor: "var(--card-bg)",
            borderColor: "var(--card-border)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between gap-3"
            style={{ borderColor: "var(--color-border)" }}
          >
            <div>
              <h2 className="text-base font-semibold">Fleet Status</h2>
              <p
                className="text-xs"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                {trucks.length} company vehicles
              </p>
            </div>
            <Link
              href="/trucks"
              className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-sm font-medium"
              style={{ color: "var(--color-primary)" }}
            >
              Manage
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {trucks.map((truck) => {
              const expiring = isExpiringSoon(truck.registration_expiry);
              return (
                <div
                  key={truck.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm flex items-center gap-2">
                      <span>{truck.plate_number}</span>
                      {expiring && (
                        <span
                          title="Registration expiring soon"
                          style={{ color: "var(--color-warning)" }}
                        >
                          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {truck.description || "No description"}
                    </p>
                  </div>
                  <StatusBadge status={truck.status} />
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
