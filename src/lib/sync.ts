/**
 * SYNC — keep every channel's availability consistent with the shared pool.
 *
 * TWO ENTRY POINTS:
 *
 *   onReservationCreated(reservation): after a booking is made (on ANY channel),
 *     push the newly-reduced availability for the affected nights to the OTHER
 *     channels so they close the nights we just sold. This is what stops a
 *     direct booking from leaving a room open on Airbnb/Booking/Expedia.
 *
 *   ingestChannelBooking(channel, payload): an OTA sent us a booking. We parse
 *     it, create a Reservation, and atomically decrement the shared pool
 *     (createReservation does the hold+insert in one transaction). Then we push
 *     the reduced availability to the remaining channels. This is how an
 *     inbound Airbnb/Booking/Expedia booking blocks the others.
 *
 * Every step is recorded in SyncLog for auditing/replay.
 */

import { db } from "@/lib/db";
import { getAvailability } from "@/lib/inventory";
import { createReservation } from "@/lib/reservations";
import { isoDate } from "@/lib/dates";
import {
  getAdapter,
  logSync,
  type AvailabilityUpdate,
} from "@/lib/channels";
import { Channel, type Reservation } from "@/generated/prisma/client";

/** Every channel that sells from the shared pool. */
const ALL_CHANNELS: Channel[] = [
  Channel.DIRECT,
  Channel.AIRBNB,
  Channel.BOOKING,
  Channel.EXPEDIA,
];

/**
 * Build the per-night availability updates for a room type over a stay's
 * nights, straight from the shared pool (post-decrement values).
 */
async function availabilityUpdatesFor(
  roomTypeId: string,
  checkIn: Date,
  checkOut: Date,
): Promise<AvailabilityUpdate[]> {
  const [avail] = await getAvailability({ roomTypeId, checkIn, checkOut });
  if (!avail) return [];
  return avail.perNight.map((n) => ({
    roomTypeId,
    date: n.date,
    available: n.available,
  }));
}

/**
 * Push the affected nights' updated availability to every channel EXCEPT the
 * one the booking came from (that channel already knows about its own sale).
 * Called after a reservation is created on any channel.
 */
export async function onReservationCreated(
  reservation: Pick<
    Reservation,
    "id" | "channel" | "roomTypeId" | "checkIn" | "checkOut"
  >,
): Promise<void> {
  const updates = await availabilityUpdatesFor(
    reservation.roomTypeId,
    reservation.checkIn,
    reservation.checkOut,
  );

  const targets = ALL_CHANNELS.filter((c) => c !== reservation.channel);
  await Promise.all(
    targets.map(async (channel) => {
      try {
        await getAdapter(channel).pushAvailability(updates);
      } catch (err) {
        await logSync(
          channel,
          "pushAvailability",
          {
            note: "push failed",
            reservationId: reservation.id,
            error: err instanceof Error ? err.message : String(err),
          },
          "error",
        );
      }
    }),
  );
}

/**
 * Ingest an inbound OTA booking: parse → create Reservation + decrement pool →
 * fan out the reduced availability to the other channels. Returns the created
 * reservation, or null if the payload was not a booking we act on.
 *
 * Throws OversellError if the OTA sold a night we no longer have (a genuine
 * race / overbooking that needs operator attention) — the caller/webhook should
 * surface this, and it is recorded in SyncLog below.
 */
export async function ingestChannelBooking(
  channel: Channel,
  payload: unknown,
): Promise<Reservation | null> {
  const adapter = getAdapter(channel);

  // 1) Normalize the provider payload into our internal booking shape.
  const booking = await adapter.handleWebhook(payload);
  if (!booking) return null;

  // 2) Resolve the external room id back to our (roomTypeId, ratePlanId).
  const mapping = await adapter.resolveExternalRoom(booking.externalRoomId);
  if (!mapping) {
    await logSync(
      channel,
      "ingestChannelBooking",
      {
        note: "no ChannelMapping for external room",
        externalRoomId: booking.externalRoomId,
        externalRef: booking.externalRef,
      },
      "error",
    );
    throw new Error(
      `No ChannelMapping for ${channel} external room ${booking.externalRoomId}`,
    );
  }

  // Idempotency: if we've already ingested this OTA reference, return it as-is
  // instead of decrementing the pool a second time.
  const already = await db.reservation.findFirst({
    where: { channel, externalRef: booking.externalRef },
  });
  if (already) {
    await logSync(channel, "ingestChannelBooking", {
      note: "duplicate webhook ignored",
      externalRef: booking.externalRef,
      reservationId: already.id,
    });
    return already;
  }

  // 3) Create the reservation + hold inventory atomically. OTA bookings are
  //    already paid/committed on the OTA side, so we mark them CONFIRMED and
  //    payment PAY_AT_PROPERTY-agnostic (the OTA collected it). We record the
  //    OTA total when supplied.
  try {
    const reservation = await createReservation({
      channel,
      roomTypeId: mapping.roomTypeId,
      ratePlanId: mapping.ratePlanId,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guestName: booking.guestName,
      guestEmail: booking.guestEmail,
      guestPhone: booking.guestPhone,
      adults: booking.adults,
      totalCents: booking.totalCents,
      externalRef: booking.externalRef,
      confirm: true,
    });

    await logSync(channel, "ingestChannelBooking", {
      note: "reservation created from inbound OTA booking",
      externalRef: booking.externalRef,
      reservationId: reservation.id,
      code: reservation.code,
      nights: [isoDate(reservation.checkIn), isoDate(reservation.checkOut)],
    });

    // 4) Block the OTHER channels for the nights we just sold.
    await onReservationCreated(reservation);

    return reservation;
  } catch (err) {
    await logSync(
      channel,
      "ingestChannelBooking",
      {
        note: "failed to create reservation (possible oversell/race)",
        externalRef: booking.externalRef,
        error: err instanceof Error ? err.message : String(err),
      },
      "error",
    );
    throw err;
  }
}

/**
 * Push current availability for a room type + date range to ALL channels.
 * Useful for an initial full sync or a manual re-push from the dashboard.
 */
export async function pushAvailabilityToAllChannels(params: {
  roomTypeId: string;
  checkIn: Date | string;
  checkOut: Date | string;
}): Promise<void> {
  const [avail] = await getAvailability(params);
  if (!avail) return;
  const updates: AvailabilityUpdate[] = avail.perNight.map((n) => ({
    roomTypeId: params.roomTypeId,
    date: n.date,
    available: n.available,
  }));
  await Promise.all(
    ALL_CHANNELS.map((channel) => getAdapter(channel).pushAvailability(updates)),
  );
}
