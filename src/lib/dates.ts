/**
 * Date helpers for the booking core.
 *
 * A "night" is the calendar day a guest sleeps at the hotel. A stay from
 * checkIn (arrival) to checkOut (departure) occupies the nights
 * [checkIn, checkOut) — checkIn INCLUSIVE, checkOut EXCLUSIVE. A 2026-07-20 →
 * 2026-07-22 stay occupies nights of the 20th and the 21st (2 nights); the
 * guest leaves on the 22nd, which is NOT sold.
 *
 * All nights are normalized to UTC midnight so the same night maps to the same
 * DB row regardless of server timezone. Inventory/rate rows are keyed by these
 * UTC-midnight dates.
 */

/** Coerce a Date or ISO string to a Date pinned at UTC midnight. */
export function toUTCMidnight(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) {
    throw new RangeError(`Invalid date: ${String(input)}`);
  }
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

/** Format a Date as an ISO calendar date "YYYY-MM-DD" (in UTC). */
export function isoDate(input: Date | string): string {
  return toUTCMidnight(input).toISOString().slice(0, 10);
}

/** Add N whole days to a UTC-midnight date, returning a new Date. */
export function addDaysUTC(input: Date | string, days: number): Date {
  const d = toUTCMidnight(input);
  return new Date(d.getTime() + days * 86_400_000);
}

/**
 * The list of nights occupied by a stay: [checkIn, checkOut). Returns
 * UTC-midnight Dates. Throws if checkOut is not strictly after checkIn.
 */
export function eachNight(checkIn: Date | string, checkOut: Date | string): Date[] {
  const start = toUTCMidnight(checkIn);
  const end = toUTCMidnight(checkOut);
  if (end.getTime() <= start.getTime()) {
    throw new RangeError(
      `checkOut (${isoDate(end)}) must be after checkIn (${isoDate(start)})`,
    );
  }
  const nights: Date[] = [];
  for (let t = start.getTime(); t < end.getTime(); t += 86_400_000) {
    nights.push(new Date(t));
  }
  return nights;
}

/** Number of nights in a stay [checkIn, checkOut). */
export function nightsBetween(
  checkIn: Date | string,
  checkOut: Date | string,
): number {
  const start = toUTCMidnight(checkIn);
  const end = toUTCMidnight(checkOut);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}
