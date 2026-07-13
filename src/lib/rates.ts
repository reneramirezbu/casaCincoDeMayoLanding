/**
 * RATES — pricing a stay from the RateCalendar.
 *
 * Prices are integer centavos (MXN). A stay's total is the sum of each night's
 * `priceCents` in the room type's rate plan. We never divide/multiply money as
 * floats — the total is an integer sum of integer nightly prices.
 */

import { db } from "@/lib/db";
import { eachNight, isoDate, nightsBetween } from "@/lib/dates";
import { sumCentavos } from "@/lib/money";
import type { Quote, QuoteLine } from "@/lib/types";

/**
 * Thrown when a night in the requested range has no rate loaded, or the night
 * is closed (stop-sell). The booking flow should surface this as "not
 * bookable for these dates" rather than silently guessing a price.
 */
export class RateUnavailableError extends Error {
  readonly code = "RATE_UNAVAILABLE" as const;
  readonly missingNights: string[];
  readonly closedNights: string[];
  constructor(missingNights: string[], closedNights: string[]) {
    super(
      `No sellable rate for nights: missing [${missingNights.join(", ")}], ` +
        `closed [${closedNights.join(", ")}]`,
    );
    this.name = "RateUnavailableError";
    this.missingNights = missingNights;
    this.closedNights = closedNights;
  }
}

/**
 * Resolve the rate plan to price against. `ratePlanId` wins when supplied;
 * otherwise we use the room type's first rate plan (the MVP has one plan per
 * type). Returns null if the room type has no rate plan.
 */
async function resolveRatePlanId(
  roomTypeId: string,
  ratePlanId?: string,
): Promise<string | null> {
  if (ratePlanId) return ratePlanId;
  const plan = await db.ratePlan.findFirst({
    where: { roomTypeId },
    orderBy: { name: "asc" },
  });
  return plan?.id ?? null;
}

/**
 * Quote a stay [checkIn, checkOut) for a room type. Returns per-night lines and
 * the integer-centavos total. Throws `RateUnavailableError` if any night lacks
 * a rate or is closed — the total is only meaningful when every night is
 * sellable.
 */
export async function quote(
  roomTypeId: string,
  checkIn: Date | string,
  checkOut: Date | string,
  ratePlanId?: string,
): Promise<Quote> {
  const nights = eachNight(checkIn, checkOut);
  const planId = await resolveRatePlanId(roomTypeId, ratePlanId);
  if (!planId) {
    throw new RateUnavailableError(nights.map(isoDate), []);
  }

  const rows = await db.rateCalendar.findMany({
    where: { ratePlanId: planId, date: { in: nights } },
  });
  const byDate = new Map(rows.map((r) => [isoDate(r.date), r]));

  const missing: string[] = [];
  const closed: string[] = [];
  const lines: QuoteLine[] = [];

  for (const night of nights) {
    const key = isoDate(night);
    const row = byDate.get(key);
    if (!row) {
      missing.push(key);
      continue;
    }
    if (row.closed) {
      closed.push(key);
      continue;
    }
    lines.push({ date: key, priceCents: row.priceCents });
  }

  if (missing.length > 0 || closed.length > 0) {
    throw new RateUnavailableError(missing, closed);
  }

  return {
    roomTypeId,
    ratePlanId: planId,
    checkIn: isoDate(checkIn),
    checkOut: isoDate(checkOut),
    nights: nightsBetween(checkIn, checkOut),
    lines,
    totalCents: sumCentavos(lines.map((l) => l.priceCents)),
    currency: "MXN",
  };
}
