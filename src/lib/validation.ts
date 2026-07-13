/**
 * REQUEST VALIDATION — zod schemas for the API route layer.
 *
 * These schemas validate wire input (query strings, JSON bodies, route
 * params) BEFORE it reaches the service layer (@/lib/inventory, @/lib/rates,
 * @/lib/reservations, @/lib/sync). They intentionally mirror the shapes those
 * services expect (see @/lib/types) but stay separate: this file is the API
 * boundary's concern, not the domain's.
 *
 * Nothing here touches the database or enforces business invariants (like
 * "no oversell") — that is the service layer's job. This file only answers
 * "is this request well-formed?".
 */

import { z } from "zod";
import { Channel, PaymentStatus, ReservationStatus } from "@/lib/types";

/**
 * A date the service layer can parse. @/lib/dates#toUTCMidnight accepts any
 * string `new Date()` can parse; we just reject empty/garbage input early so
 * the error surfaces as a 400 here rather than a generic 500 downstream.
 */
const dateInputSchema = z
  .string()
  .trim()
  .min(1, "date is required")
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "must be a valid date (e.g. 2026-07-20)",
  });

/** Shared refinement: checkOut must be strictly after checkIn. */
function refineStayRange<T extends { checkIn: string; checkOut: string }>(
  schema: z.ZodType<T>,
) {
  return schema.refine((v) => Date.parse(v.checkOut) > Date.parse(v.checkIn), {
    message: "checkOut must be after checkIn",
    path: ["checkOut"],
  });
}

/** GET /api/availability?checkIn=&checkOut=&roomTypeId= */
export const availabilityQuerySchema = refineStayRange(
  z.object({
    checkIn: dateInputSchema,
    checkOut: dateInputSchema,
    roomTypeId: z.string().trim().min(1).optional(),
  }),
);
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

/** POST /api/reservations body — a DIRECT-channel booking. */
export const createReservationSchema = refineStayRange(
  z.object({
    roomTypeId: z.string().trim().min(1, "roomTypeId is required"),
    ratePlanId: z.string().trim().min(1, "ratePlanId is required"),
    checkIn: dateInputSchema,
    checkOut: dateInputSchema,
    guestName: z.string().trim().min(1, "guestName is required"),
    guestEmail: z.string().trim().email("must be a valid email").nullish(),
    guestPhone: z.string().trim().min(1).nullish(),
    adults: z.number().int().positive().max(30).optional(),
    /** Override total in integer centavos (MXN). Omit to price from the rate calendar. */
    totalCents: z.number().int().nonnegative().optional(),
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    /** Defaults to true (CONFIRMED) for direct bookings — see createDirectReservation. */
    confirm: z.boolean().optional(),
  }),
);
export type CreateReservationBody = z.infer<typeof createReservationSchema>;

/** GET /api/reservations?channel=&status=&roomTypeId=&limit= */
export const listReservationsQuerySchema = z.object({
  channel: z.nativeEnum(Channel).optional(),
  status: z.nativeEnum(ReservationStatus).optional(),
  roomTypeId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;

/**
 * The `[channel]` route param on POST /api/webhooks/channel/[channel].
 * Deliberately excludes DIRECT — direct bookings never arrive as an inbound
 * OTA webhook, they come from POST /api/reservations.
 */
export const webhookChannelParamSchema = z.enum(["AIRBNB", "BOOKING", "EXPEDIA"]);
export type WebhookChannelParam = z.infer<typeof webhookChannelParamSchema>;
