/**
 * Display formatting for the guest booking funnel.
 *
 * Pure module — no server-only imports — so both Server Components and
 * "use client" components can share it. All booking dates in the system are
 * UTC-midnight ISO strings ("YYYY-MM-DD"); these helpers format them WITHOUT
 * letting the viewer's timezone shift the calendar day.
 */

/** "2026-07-14" → "Tue, Jul 14, 2026" (always the UTC calendar day). */
export function formatStayDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "2026-07-14" → "Tue, Jul 14" — compact label for per-night rate lines. */
export function formatNightLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Pluralize a count with a unit: plural(2, "night") → "2 nights". */
export function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}
