/**
 * Parsing + validation of the booking funnel's URL search params
 * (?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&adults=N).
 *
 * Pure module (no db) — shared by /book and /book/details pages and by client
 * components that need to build funnel links. Server actions re-validate
 * independently in actions.ts; this layer only guards page rendering.
 */

import { nightsBetween } from "@/lib/dates";

/** Longest stay bookable online; longer stays should contact the hotel. */
export const MAX_NIGHTS = 30;

/** Largest party size selectable in the funnel UI. */
export const MAX_ADULTS = 6;

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface StayQuery {
  /** Arrival, ISO date. */
  checkIn: string;
  /** Departure, ISO date — EXCLUSIVE (the guest does not sleep this night). */
  checkOut: string;
  adults: number;
  nights: number;
}

export type StayParseResult =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | ({ kind: "ok" } & StayQuery);

/** Next.js searchParams values can be arrays; take the first. */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** True when `iso` is a well-formed, real calendar date. */
function isValidISODate(iso: string): boolean {
  return (
    ISO_DATE_RE.test(iso) && !Number.isNaN(new Date(`${iso}T00:00:00Z`).getTime())
  );
}

/**
 * Validate the stay portion of the query. `todayIso` is the server's UTC
 * "today" (the same reference the inventory calendar uses).
 */
export function parseStayParams(
  params: Record<string, string | string[] | undefined>,
  todayIso: string,
): StayParseResult {
  const checkIn = firstParam(params.checkIn);
  const checkOut = firstParam(params.checkOut);
  const adultsRaw = firstParam(params.adults);

  if (!checkIn && !checkOut) return { kind: "empty" };

  if (!checkIn || !isValidISODate(checkIn) || !checkOut || !isValidISODate(checkOut)) {
    return {
      kind: "invalid",
      message: "Please choose a valid check-in and check-out date.",
    };
  }
  // Validated ISO dates compare correctly as strings.
  if (checkIn < todayIso) {
    return {
      kind: "invalid",
      message: "Check-in can't be in the past — pick today or a later date.",
    };
  }
  if (checkOut <= checkIn) {
    return {
      kind: "invalid",
      message: "Check-out must be at least one night after check-in.",
    };
  }
  const nights = nightsBetween(checkIn, checkOut);
  if (nights > MAX_NIGHTS) {
    return {
      kind: "invalid",
      message: `Online booking covers stays up to ${MAX_NIGHTS} nights — for longer stays, please contact the hotel directly.`,
    };
  }

  const adults = adultsRaw === undefined ? 2 : Number.parseInt(adultsRaw, 10);
  if (!Number.isInteger(adults) || adults < 1 || adults > MAX_ADULTS) {
    return {
      kind: "invalid",
      message: `Please choose between 1 and ${MAX_ADULTS} guests.`,
    };
  }

  return { kind: "ok", checkIn, checkOut, adults, nights };
}

/** Build a funnel href carrying the stay (plus optional extra params). */
export function stayHref(
  pathname: string,
  stay: Pick<StayQuery, "checkIn" | "checkOut" | "adults">,
  extra?: Record<string, string>,
): string {
  const qs = new URLSearchParams({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    adults: String(stay.adults),
    ...extra,
  });
  return `${pathname}?${qs.toString()}`;
}
