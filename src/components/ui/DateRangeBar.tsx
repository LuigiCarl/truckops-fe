"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";
import {
  getCurrentMonthRange,
  getFirstHalfRange,
  getSecondHalfRange,
} from "@/lib/format";
import type { DateRange } from "@/lib/types";

interface DateRangeBarProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  allowAll?: boolean;
}

interface ComputedPresets {
  firstHalf: DateRange;
  secondHalf: DateRange;
  thisMonth: DateRange;
}

export function DateRangeBar({
  value,
  onChange,
  allowAll = true,
}: DateRangeBarProps) {
  const [computed, setComputed] = useState<ComputedPresets | null>(null);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setComputed({
        firstHalf: getFirstHalfRange(),
        secondHalf: getSecondHalfRange(),
        thisMonth: getCurrentMonthRange(),
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const isMatch = (target: DateRange | undefined) =>
    Boolean(
      target &&
        value.start_date === target.start_date &&
        value.end_date === target.end_date
    );

  const isAll = value.start_date === "" && value.end_date === "";

  const presets: Array<{
    label: string;
    getRange: () => DateRange;
    active: boolean;
  }> = [
    {
      label: "1st Half (1–15)",
      getRange: () => getFirstHalfRange(),
      active: isMatch(computed?.firstHalf),
    },
    {
      label: "2nd Half (16–End)",
      getRange: () => getSecondHalfRange(),
      active: isMatch(computed?.secondHalf),
    },
    {
      label: "This Month",
      getRange: () => getCurrentMonthRange(),
      active: isMatch(computed?.thisMonth),
    },
  ];

  if (allowAll) {
    presets.push({
      label: "All Dates",
      getRange: () => ({ start_date: "", end_date: "" }),
      active: isAll,
    });
  }

  return (
    <>
      {/* Print-only Coverage Period Banner */}
      <div className="hidden print:flex items-center justify-between py-1.5 px-3 mb-2 rounded border border-slate-300 bg-slate-50 text-xs text-slate-700">
        <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
          Filtered Coverage Period
        </span>
        <span className="font-bold tabular-nums">
          {value.start_date || value.end_date
            ? `${value.start_date || "Start"} – ${value.end_date || "End"}`
            : "All Recorded Dates"}
        </span>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3 rounded-lg border print:hidden"
        style={{
          backgroundColor: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full lg:w-auto">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide sm:mr-1"
          style={{ color: "var(--color-muted-foreground)" }}
        >
          <Calendar className="h-4 w-4" aria-hidden="true" />
          Period
        </span>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onChange(preset.getRange())}
              className="min-h-[36px] px-2 sm:px-3 rounded-md text-xs font-medium transition-colors border text-center justify-center inline-flex items-center"
              style={{
                backgroundColor: preset.active
                  ? "var(--color-info-subtle)"
                  : "var(--color-card)",
                color: preset.active
                  ? "var(--color-primary)"
                  : "var(--color-foreground)",
                borderColor: preset.active
                  ? "var(--color-primary)"
                  : "var(--color-border)",
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:flex items-center gap-2 w-full lg:w-auto">
        <label className="flex items-center gap-1.5 text-xs w-full sm:w-auto">
          <span
            className="shrink-0 text-slate-500 font-medium"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            From
          </span>
          <input
            type="date"
            value={value.start_date}
            onChange={(e) =>
              onChange({ ...value, start_date: e.target.value })
            }
            className="w-full flex-1 sm:flex-initial min-w-0 min-h-[38px] px-2 sm:px-3 rounded-md border text-xs sm:text-sm tabular-nums"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
              color: "var(--input-fg)",
            }}
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs w-full sm:w-auto">
          <span
            className="shrink-0 text-slate-500 font-medium"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            To
          </span>
          <input
            type="date"
            value={value.end_date}
            onChange={(e) => onChange({ ...value, end_date: e.target.value })}
            className="w-full flex-1 sm:flex-initial min-w-0 min-h-[38px] px-2 sm:px-3 rounded-md border text-xs sm:text-sm tabular-nums"
            style={{
              backgroundColor: "var(--input-bg)",
              borderColor: "var(--input-border)",
              color: "var(--input-fg)",
            }}
          />
        </label>
      </div>
    </div>
    </>
  );
}
