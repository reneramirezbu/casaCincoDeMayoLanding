/**
 * GET /api/availability?checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD&roomTypeId=
 *
 * Thin glue over @/lib/availability#searchAvailability — the read model that
 * combines the shared inventory pool with pricing. Returns only bookable room
 * types (available on every night AND priced on every night), cheapest first,
 * each with a full price quote.
 *
 * `roomTypeId` is an optional post-filter: searchAvailability itself searches
 * across all room types, so when a caller wants just one we filter its result
 * rather than re-implementing the search.
 *
 * Response 200:
 *   { checkIn, checkOut, nights, roomTypes: RoomTypeOffer[] }
 * Response 400: { error, code: "VALIDATION_ERROR", details } — bad/missing query params.
 */

import { NextResponse } from "next/server";
import { searchAvailability } from "@/lib/availability";
import { nightsBetween } from "@/lib/dates";
import { availabilityQuerySchema } from "@/lib/validation";
import { handleRouteError, type ApiErrorBody } from "@/app/api/_lib/http";
import type { RoomTypeOffer } from "@/lib/types";

export const dynamic = "force-dynamic";

interface AvailabilityResponse {
  checkIn: string;
  checkOut: string;
  nights: number;
  roomTypes: RoomTypeOffer[];
}

export async function GET(
  request: Request,
): Promise<NextResponse<AvailabilityResponse | ApiErrorBody>> {
  try {
    const url = new URL(request.url);
    const query = availabilityQuerySchema.parse({
      checkIn: url.searchParams.get("checkIn") ?? undefined,
      checkOut: url.searchParams.get("checkOut") ?? undefined,
      roomTypeId: url.searchParams.get("roomTypeId") ?? undefined,
    });

    let roomTypes = await searchAvailability({
      checkIn: query.checkIn,
      checkOut: query.checkOut,
    });
    if (query.roomTypeId) {
      roomTypes = roomTypes.filter((rt) => rt.roomTypeId === query.roomTypeId);
    }

    return NextResponse.json({
      checkIn: query.checkIn,
      checkOut: query.checkOut,
      nights: nightsBetween(query.checkIn, query.checkOut),
      roomTypes,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
