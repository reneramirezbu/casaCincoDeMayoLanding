import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Reservation lifecycle statuses. Accepts both lowercase and
 * SCREAMING_CASE (Prisma enum) spellings; unknown values fall back
 * to a neutral pill with a prettified label — never crashes.
 */
export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "checked_out"
  | "cancelled"
  | "no_show";

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const statusClasses: Record<ReservationStatus, string> = {
  pending: "bg-warning-soft text-warning",
  confirmed: "bg-success-soft text-success",
  checked_in: "bg-accent-soft text-accent-hover",
  checked_out: "bg-surface-sunken text-ink-muted",
  cancelled: "bg-surface-sunken text-ink-faint",
  no_show: "bg-danger-soft text-danger",
};

function normalizeStatus(value: string): ReservationStatus | null {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key in statusClasses) return key as ReservationStatus;
  if (key === "canceled") return "cancelled"; // single-L spelling
  if (key === "noshow") return "no_show";
  return null;
}

function prettify(value: string): string {
  const words = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export interface StatusPillProps extends React.ComponentProps<"span"> {
  /** e.g. "confirmed" or "CONFIRMED" (Prisma enum values work as-is). */
  status: ReservationStatus | Uppercase<ReservationStatus> | (string & {});
  /** Override the default English label (e.g. for Spanish UI). */
  label?: string;
}

export function StatusPill({ status, label, className, ...props }: StatusPillProps) {
  const normalized = normalizeStatus(status);
  const text = label ?? (normalized ? RESERVATION_STATUS_LABELS[normalized] : prettify(status));

  return (
    <span
      data-slot="status-pill"
      data-status={normalized ?? status}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium",
        normalized ? statusClasses[normalized] : "bg-surface-sunken text-ink-muted",
        className,
      )}
      {...props}
    >
      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />
      {text}
    </span>
  );
}
