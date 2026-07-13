/**
 * CHANNEL ADAPTER CONTRACT.
 *
 * A ChannelAdapter is the boundary between our shared-pool inventory and one
 * external sales channel (Airbnb, Booking.com, Expedia) or our own direct site.
 * The core (sync.ts) speaks ONLY this interface, so swapping the mock for a real
 * connectivity provider (Channex / NextPax) is a drop-in change — see
 * ACTION-ITEMS.md.
 *
 * Two directions of data flow:
 *   OUTBOUND (we → channel): pushAvailability / pushRates. After any booking we
 *     push the reduced availability so the channel closes the sold night.
 *   INBOUND (channel → we): handleWebhook parses a provider's raw webhook body
 *     into a normalized booking that sync.ingestChannelBooking then applies to
 *     the shared pool (blocking the other channels).
 */

import type { Channel } from "@/generated/prisma/client";
import type { IncomingChannelBooking } from "@/lib/types";

/** One night's remaining units for a room type, to push to a channel. */
export interface AvailabilityUpdate {
  roomTypeId: string;
  /** ISO date (YYYY-MM-DD) of the night. */
  date: string;
  /** Remaining sellable units in the shared pool for this night. */
  available: number;
}

/** One night's price/restrictions for a rate plan, to push to a channel. */
export interface RateUpdate {
  ratePlanId: string;
  /** ISO date (YYYY-MM-DD) of the night. */
  date: string;
  /** Nightly price in integer centavos (MXN). */
  priceCents: number;
  /** Whether the night is closed to sale (stop-sell). */
  closed: boolean;
  /** Minimum length of stay for this night, if any. */
  minStay: number | null;
}

/** The external identifiers a channel uses for one of our (roomType, ratePlan). */
export interface RoomMapping {
  externalRoomId: string;
  externalRateId: string;
}

export interface ChannelAdapter {
  /** Which channel this adapter drives. */
  readonly channel: Channel;

  /**
   * Push updated availability (remaining units per night) to the channel so it
   * stops selling nights we've sold elsewhere. Idempotent by (roomTypeId, date).
   */
  pushAvailability(updates: AvailabilityUpdate[]): Promise<void>;

  /**
   * Push updated nightly rates / restrictions to the channel.
   */
  pushRates(updates: RateUpdate[]): Promise<void>;

  /**
   * Parse a raw inbound webhook body from the channel into a normalized booking.
   * Returns null when the payload is not a booking event we act on (e.g. a ping
   * or a status update we ignore). Throws on a malformed booking payload.
   */
  handleWebhook(payload: unknown): Promise<IncomingChannelBooking | null>;

  /**
   * Resolve our (roomTypeId, ratePlanId) to the channel's external ids via the
   * ChannelMapping table. Returns null when no mapping exists for this channel.
   */
  mapRoom(roomTypeId: string, ratePlanId: string): Promise<RoomMapping | null>;

  /**
   * Reverse of mapRoom: resolve a channel's external room id (from an inbound
   * booking) back to our internal (roomTypeId, ratePlanId). Returns null when
   * unmapped.
   */
  resolveExternalRoom(
    externalRoomId: string,
  ): Promise<{ roomTypeId: string; ratePlanId: string } | null>;
}
