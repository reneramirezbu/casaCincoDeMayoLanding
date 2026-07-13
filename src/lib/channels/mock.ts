/**
 * MockChannelAdapter — PLACEHOLDER, NOT A REAL INTEGRATION.
 * ========================================================
 * This adapter DOES NOT talk to Airbnb / Booking.com / Expedia. It only:
 *   - logs outbound availability/rate pushes to the SyncLog table + console, and
 *   - normalizes an inbound webhook payload into our internal booking shape.
 *
 * It NEVER invents reservations on its own — inbound bookings only exist when a
 * real (or test) webhook payload is handed to handleWebhook / ingestChannelBooking.
 *
 * >>> REPLACE with a real Channex / NextPax adapter — see ACTION-ITEMS.md. <<<
 * The real adapter keeps this exact interface; only the network calls change.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import type { Channel } from "@/generated/prisma/client";
import type { IncomingChannelBooking } from "@/lib/types";
import type {
  AvailabilityUpdate,
  ChannelAdapter,
  RateUpdate,
  RoomMapping,
} from "@/lib/channels/types";

/** Append an audit row to SyncLog and mirror it to the console (dev visibility). */
export async function logSync(
  channel: Channel,
  action: string,
  payload: unknown,
  status: "ok" | "error" = "ok",
): Promise<void> {
  const serialized = JSON.stringify(payload ?? null);
  await db.syncLog.create({
    data: { channel, action, payload: serialized, status },
  });
  console.log(`[sync:${channel}] ${action} (${status})`, serialized);
}

/**
 * Zod schema for a normalized inbound booking. A real provider adapter would
 * translate its own webhook JSON into this shape before validating. Kept
 * permissive on optionals; strict on the fields we must have to hold inventory.
 */
const incomingBookingSchema = z.object({
  externalRef: z.string().min(1),
  externalRoomId: z.string().min(1),
  externalRateId: z.string().optional(),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email().nullish(),
  guestPhone: z.string().nullish(),
  adults: z.number().int().positive().optional(),
  totalCents: z.number().int().nonnegative().optional(),
});

export class MockChannelAdapter implements ChannelAdapter {
  constructor(readonly channel: Channel) {}

  async pushAvailability(updates: AvailabilityUpdate[]): Promise<void> {
    // A real adapter would PUT these to the provider's ARI endpoint here.
    await logSync(this.channel, "pushAvailability", {
      note: "MOCK — no external call made",
      count: updates.length,
      updates,
    });
  }

  async pushRates(updates: RateUpdate[]): Promise<void> {
    await logSync(this.channel, "pushRates", {
      note: "MOCK — no external call made",
      count: updates.length,
      updates,
    });
  }

  async handleWebhook(payload: unknown): Promise<IncomingChannelBooking | null> {
    // A real adapter first verifies the provider signature, then maps the
    // provider's event JSON into our normalized shape. Here we simply validate
    // that the caller handed us a normalized booking.
    const parsed = incomingBookingSchema.safeParse(payload);
    if (!parsed.success) {
      await logSync(
        this.channel,
        "handleWebhook",
        { note: "MOCK — payload not a booking event", issues: parsed.error.issues },
        "error",
      );
      return null;
    }
    await logSync(this.channel, "handleWebhook", {
      note: "MOCK — parsed inbound booking",
      externalRef: parsed.data.externalRef,
    });
    return {
      externalRef: parsed.data.externalRef,
      externalRoomId: parsed.data.externalRoomId,
      externalRateId: parsed.data.externalRateId,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail ?? null,
      guestPhone: parsed.data.guestPhone ?? null,
      adults: parsed.data.adults,
      totalCents: parsed.data.totalCents,
    };
  }

  async mapRoom(
    roomTypeId: string,
    ratePlanId: string,
  ): Promise<RoomMapping | null> {
    const m = await db.channelMapping.findUnique({
      where: {
        channel_roomTypeId_ratePlanId: {
          channel: this.channel,
          roomTypeId,
          ratePlanId,
        },
      },
    });
    if (!m) return null;
    return { externalRoomId: m.externalRoomId, externalRateId: m.externalRateId };
  }

  async resolveExternalRoom(
    externalRoomId: string,
  ): Promise<{ roomTypeId: string; ratePlanId: string } | null> {
    const m = await db.channelMapping.findFirst({
      where: { channel: this.channel, externalRoomId },
    });
    if (!m) return null;
    return { roomTypeId: m.roomTypeId, ratePlanId: m.ratePlanId };
  }
}
