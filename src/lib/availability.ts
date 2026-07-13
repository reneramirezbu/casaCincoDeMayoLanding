/**
 * AVAILABILITY — the read model that powers the booking search and the
 * dashboard calendar. Combines the shared-pool inventory (inventory.ts) with
 * pricing (rates.ts) into presentation-ready DTOs.
 *
 * Read-only: nothing here mutates the pool. Actually holding a room happens in
 * reservations.ts.
 */

import { db } from "@/lib/db";
import { getAvailability } from "@/lib/inventory";
import { quote, RateUnavailableError } from "@/lib/rates";
import { isoDate, nightsBetween } from "@/lib/dates";
import type { AvailabilityResult, RoomTypeOffer } from "@/lib/types";

/**
 * Full per-night availability for one or all room types over
 * [checkIn, checkOut). Includes room-type names for display. Used by the
 * dashboard calendar/inventory grid.
 */
export async function getAvailabilityResults(params: {
  roomTypeId?: string;
  checkIn: Date | string;
  checkOut: Date | string;
}): Promise<AvailabilityResult[]> {
  const nights = nightsBetween(params.checkIn, params.checkOut);
  const availability = await getAvailability(params);

  const roomTypes = await db.roomType.findMany({
    where: params.roomTypeId ? { id: params.roomTypeId } : {},
  });
  const nameById = new Map(roomTypes.map((rt) => [rt.id, rt.name]));

  return availability.map((a) => ({
    roomTypeId: a.roomTypeId,
    roomTypeName: nameById.get(a.roomTypeId) ?? a.roomTypeId,
    checkIn: isoDate(params.checkIn),
    checkOut: isoDate(params.checkOut),
    nights,
    perNight: a.perNight,
    minAvailable: a.minAvailable,
    bookable: a.minAvailable > 0,
  }));
}

/**
 * Search bookable room types for a date range and attach a price quote to each.
 * A room type is returned only when it is available on EVERY night
 * (minAvailable > 0) AND every night has a sellable rate. Room types that are
 * sold out or have missing/closed rates are omitted — this is the list a guest
 * (or the front desk) can actually book from.
 */
export async function searchAvailability(params: {
  checkIn: Date | string;
  checkOut: Date | string;
}): Promise<RoomTypeOffer[]> {
  const availability = await getAvailability(params);
  const bookable = availability.filter((a) => a.minAvailable > 0);

  const roomTypes = await db.roomType.findMany({
    where: { id: { in: bookable.map((a) => a.roomTypeId) } },
  });
  const rtById = new Map(roomTypes.map((rt) => [rt.id, rt]));

  const offers: RoomTypeOffer[] = [];
  for (const a of bookable) {
    const rt = rtById.get(a.roomTypeId);
    if (!rt) continue;
    try {
      const q = await quote(a.roomTypeId, params.checkIn, params.checkOut);
      offers.push({
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        description: rt.description,
        occupancy: rt.occupancy,
        ratePlanId: q.ratePlanId,
        minAvailable: a.minAvailable,
        quote: q,
      });
    } catch (err) {
      // No sellable rate for these dates → not offerable. Skip quietly; other
      // room types may still be bookable.
      if (err instanceof RateUnavailableError) continue;
      throw err;
    }
  }

  // Cheapest first — the most useful default ordering for a booking list.
  offers.sort((x, y) => x.quote.totalCents - y.quote.totalCents);
  return offers;
}
