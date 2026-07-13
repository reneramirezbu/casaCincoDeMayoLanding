/**
 * Shared DTOs for the channel-manager core.
 *
 * These are the plain-data shapes that flow between the data/sync core
 * (inventory, rates, availability, sync) and the UI / API layers. Keeping them
 * here — separate from Prisma's generated model types — lets Server Components
 * pass them to Client Components as serializable props.
 *
 * Enum VALUES + types are re-exported from the generated Prisma client so the
 * whole app shares one source of truth. Import them from here:
 *   import { Channel, ReservationStatus, PaymentStatus } from "@/lib/types";
 */

import type { Centavos } from "@/lib/money";
import {
  Channel,
  ReservationStatus,
  PaymentStatus,
} from "@/generated/prisma/client";

// Re-export the enum objects (usable as values, e.g. Channel.AIRBNB) and their
// literal-union types (usable in annotations).
export { Channel, ReservationStatus, PaymentStatus };
export type {
  Channel as ChannelType,
  ReservationStatus as ReservationStatusType,
  PaymentStatus as PaymentStatusType,
} from "@/generated/prisma/client";

/** A single night in a date range, keyed by an ISO date string (YYYY-MM-DD). */
export interface NightRate {
  /** ISO date of the night being sold (the guest sleeps this night). */
  date: string;
  /** Nightly price in integer centavos (MXN). */
  priceCents: Centavos;
  /** Optional minimum-stay restriction attached to this night. */
  minStay: number | null;
  /** Stop-sell flag for this night on this rate plan. */
  closed: boolean;
}

/** One line of a price quote — one night. */
export interface QuoteLine {
  date: string;
  priceCents: Centavos;
}

/** Result of quoting a stay for a room type. */
export interface Quote {
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  lines: QuoteLine[];
  totalCents: Centavos;
  currency: "MXN";
}

/** Per-night availability for a room type across the shared pool. */
export interface AvailabilityNight {
  date: string;
  available: number;
}

/** Availability of one room type over a requested date range. */
export interface AvailabilityResult {
  roomTypeId: string;
  roomTypeName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  /** Per-night remaining units across ALL channels (the shared pool). */
  perNight: AvailabilityNight[];
  /** Min available across every night = how many of this stay we can still sell. */
  minAvailable: number;
  /** Convenience flag: minAvailable > 0. */
  bookable: boolean;
}

/** A room type offered for a searched date range, with its quote. */
export interface RoomTypeOffer {
  roomTypeId: string;
  roomTypeName: string;
  description: string;
  occupancy: number;
  ratePlanId: string;
  minAvailable: number;
  quote: Quote;
}

/** Input to create a reservation (direct booking or OTA ingest). */
export interface CreateReservationInput {
  channel: Channel;
  roomTypeId: string;
  ratePlanId: string;
  /** Arrival date (guest sleeps this night). ISO date or Date. */
  checkIn: Date | string;
  /** Departure date (exclusive — guest does NOT sleep this night). */
  checkOut: Date | string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  adults?: number;
  /** Optional override total; when omitted, computed from the rate calendar. */
  totalCents?: Centavos;
  paymentStatus?: PaymentStatus;
  /** OTA reservation reference, when the booking originated on a channel. */
  externalRef?: string | null;
  /** Confirmed immediately (OTA bookings) vs. HELD (checkout in progress). */
  confirm?: boolean;
}

/** Payload an OTA sends us for an inbound booking (normalized, provider-agnostic). */
export interface IncomingChannelBooking {
  externalRef: string;
  externalRoomId: string;
  externalRateId?: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  adults?: number;
  /** Total the OTA collected/expects, in centavos, if provided. */
  totalCents?: Centavos;
}
