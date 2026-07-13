/**
 * /api/reservations
 *
 * GET  — list reservations (owner dashboard / front desk), newest first.
 *        Optional filters: channel, status, roomTypeId, limit (default all,
 *        max 200 per request).
 *
 * POST — create a DIRECT-channel reservation (the guest booking site / front
 *        desk). Delegates the atomic "hold inventory + insert reservation"
 *        transaction to @/lib/reservations#createDirectReservation, then fans
 *        the reduced availability out to the OTAs via @/lib/sync so the room
 *        we just sold closes on Airbnb/Booking/Expedia too.
 *
 * Response 201 (POST): { reservation: SerializedReservation }
 * Response 200 (GET):  { reservations: SerializedReservation[] }
 * Response 409: sold out — { error, code: "OVERSELL", soldOutNights }
 * Response 422: no sellable rate — { error, code: "RATE_UNAVAILABLE", missingNights, closedNights }
 * Response 400: validation / malformed JSON / bad foreign key.
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createDirectReservation } from "@/lib/reservations";
import { onReservationCreated } from "@/lib/sync";
import {
  createReservationSchema,
  listReservationsQuerySchema,
} from "@/lib/validation";
import {
  handleRouteError,
  parseJsonBody,
  serializeReservation,
  type ApiErrorBody,
  type SerializedReservation,
} from "@/app/api/_lib/http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
): Promise<NextResponse<{ reservations: SerializedReservation[] } | ApiErrorBody>> {
  try {
    const url = new URL(request.url);
    const query = listReservationsQuerySchema.parse({
      channel: url.searchParams.get("channel") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      roomTypeId: url.searchParams.get("roomTypeId") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    });

    const reservations = await db.reservation.findMany({
      where: {
        ...(query.channel ? { channel: query.channel } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.roomTypeId ? { roomTypeId: query.roomTypeId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? undefined,
    });

    return NextResponse.json({
      reservations: reservations.map(serializeReservation),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(
  request: Request,
): Promise<NextResponse<{ reservation: SerializedReservation } | ApiErrorBody>> {
  try {
    const body = createReservationSchema.parse(await parseJsonBody(request));

    const reservation = await createDirectReservation({
      roomTypeId: body.roomTypeId,
      ratePlanId: body.ratePlanId,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      guestPhone: body.guestPhone,
      adults: body.adults,
      totalCents: body.totalCents,
      paymentStatus: body.paymentStatus,
      confirm: body.confirm,
    });

    // Booking succeeded — block the sold nights on the other channels. Per-
    // adapter push failures are already caught and logged to SyncLog inside
    // onReservationCreated; we additionally guard the call itself so a sync
    // hiccup can never turn an already-committed reservation into a 500.
    try {
      await onReservationCreated(reservation);
    } catch (syncErr) {
      console.error(
        "[api] onReservationCreated failed for reservation",
        reservation.id,
        syncErr,
      );
    }

    return NextResponse.json(
      { reservation: serializeReservation(reservation) },
      { status: 201 },
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
