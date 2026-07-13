/**
 * Pure display formatters for the dashboard. No server or DB imports — safe to
 * use from both Server and Client Components. Dates are ISO "YYYY-MM-DD" strings
 * (UTC calendar dates) and are formatted in UTC so they never shift by timezone.
 */

const MEDIUM = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const WITH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-07-20" → "Jul 20". */
export function formatDate(iso: string): string {
  return MEDIUM.format(new Date(`${iso}T00:00:00Z`));
}

/** "2026-07-20" → "Jul 20, 2026". */
export function formatDateLong(iso: string): string {
  return WITH_YEAR.format(new Date(`${iso}T00:00:00Z`));
}

/** "Jul 20 – 22" (same month) or "Jul 30 – Aug 2" range for a stay. */
export function formatStay(checkInIso: string, checkOutIso: string): string {
  const inDate = new Date(`${checkInIso}T00:00:00Z`);
  const outDate = new Date(`${checkOutIso}T00:00:00Z`);
  const sameMonth =
    inDate.getUTCFullYear() === outDate.getUTCFullYear() &&
    inDate.getUTCMonth() === outDate.getUTCMonth();
  const out = sameMonth ? String(outDate.getUTCDate()) : MEDIUM.format(outDate);
  return `${MEDIUM.format(inDate)} – ${out}`;
}

/** Percent from a 0..1 ratio, no decimals: 0.734 → "73%". */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}
