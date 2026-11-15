"use client";

type KnownStatus =
  | "Completed"
  | "Paid"
  | "Available"
  | "Assigned"
  | "Active"
  | "Draft"
  | "Under Maintenance"
  | "Cancelled"
  | "Unpaid"
  | "Inactive"
  | "Daily"
  | "Trip"
  | "Driver"
  | "Helper"
  | string;

const STATUS_STYLE_MAP: Record<
  string,
  { bg: string; fg: string; dot: string }
> = {
  Completed: {
    bg: "var(--badge-completed-bg)",
    fg: "var(--badge-completed-fg)",
    dot: "var(--color-success)",
  },
  Paid: {
    bg: "var(--badge-completed-bg)",
    fg: "var(--badge-completed-fg)",
    dot: "var(--color-success)",
  },
  Available: {
    bg: "var(--badge-completed-bg)",
    fg: "var(--badge-completed-fg)",
    dot: "var(--color-success)",
  },
  Assigned: {
    bg: "var(--badge-assigned-bg)",
    fg: "var(--badge-assigned-fg)",
    dot: "var(--color-info)",
  },
  Active: {
    bg: "var(--badge-assigned-bg)",
    fg: "var(--badge-assigned-fg)",
    dot: "var(--color-info)",
  },
  Driver: {
    bg: "var(--badge-assigned-bg)",
    fg: "var(--badge-assigned-fg)",
    dot: "var(--color-info)",
  },
  Daily: {
    bg: "var(--badge-assigned-bg)",
    fg: "var(--badge-assigned-fg)",
    dot: "var(--color-info)",
  },
  Draft: {
    bg: "var(--badge-draft-bg)",
    fg: "var(--badge-draft-fg)",
    dot: "var(--color-warning)",
  },
  "Under Maintenance": {
    bg: "var(--badge-draft-bg)",
    fg: "var(--badge-draft-fg)",
    dot: "var(--color-warning)",
  },
  Trip: {
    bg: "var(--badge-draft-bg)",
    fg: "var(--badge-draft-fg)",
    dot: "var(--color-warning)",
  },
  Helper: {
    bg: "var(--badge-inactive-bg)",
    fg: "var(--badge-inactive-fg)",
    dot: "var(--color-muted-foreground)",
  },
  Cancelled: {
    bg: "var(--badge-cancelled-bg)",
    fg: "var(--badge-cancelled-fg)",
    dot: "var(--color-destructive)",
  },
  Unpaid: {
    bg: "var(--badge-cancelled-bg)",
    fg: "var(--badge-cancelled-fg)",
    dot: "var(--color-destructive)",
  },
  Inactive: {
    bg: "var(--badge-inactive-bg)",
    fg: "var(--badge-inactive-fg)",
    dot: "var(--color-muted-foreground)",
  },
};

export function StatusBadge({
  status,
  showDot = true,
}: {
  status: KnownStatus;
  showDot?: boolean;
}) {
  const palette = STATUS_STYLE_MAP[status] ?? STATUS_STYLE_MAP.Inactive;

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold leading-none whitespace-nowrap"
      style={{
        backgroundColor: palette.bg,
        color: palette.fg,
        borderRadius: "var(--badge-radius)",
      }}
    >
      {showDot && (
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: palette.dot }}
          aria-hidden="true"
        />
      )}
      {status}
    </span>
  );
}
