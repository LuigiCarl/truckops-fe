import type { DateRange } from "@/lib/types";

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPhp(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "₱0.00";
  }

  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) {
    return "₱0.00";
  }

  return phpFormatter.format(numeric);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const datePart = value.slice(0, 10);
  const parts = datePart.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return value;
  }

  const [year, month, day] = parts;
  const localDate = new Date(year, month - 1, day);
  return localDate.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

export function getFirstHalfRange(referenceDate = new Date()): DateRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  return {
    start_date: toIsoDate(new Date(year, month, 1)),
    end_date: toIsoDate(new Date(year, month, 15)),
  };
}

export function getSecondHalfRange(referenceDate = new Date()): DateRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  return {
    start_date: toIsoDate(new Date(year, month, 16)),
    end_date: toIsoDate(lastDay),
  };
}

export function getCurrentMonthRange(referenceDate = new Date()): DateRange {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  return {
    start_date: toIsoDate(new Date(year, month, 1)),
    end_date: toIsoDate(new Date(year, month + 1, 0)),
  };
}

export function isExpiringSoon(dateStr: string | null, withinDays = 30): boolean {
  if (!dateStr) return false;
  const parts = dateStr.slice(0, 10).split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return false;

  const expiry = new Date(parts[0], parts[1] - 1, parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= withinDays;
}
