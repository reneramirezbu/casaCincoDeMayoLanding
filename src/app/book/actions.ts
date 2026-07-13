"use server";

/**
 * Direct-booking server action.
 *
 * Validates the guest-details form with zod, re-verifies the selection against
 * the database (never trusting hidden fields), then atomically holds one room
 * for every night of the stay via the reservations service (channel = DIRECT,
 * shared 15-room pool). On success it fans the reduced availability out to the
 * OTAs and redirects to the confirmation page.
 *
 * Money: the total is ALWAYS recomputed server-side from the rate calendar
 * (integer centavos) — no price ever comes from the client.
 */

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { isoDate, nightsBetween } from "@/lib/dates";
import { OversellError } from "@/lib/inventory";
import { RateUnavailableError } from "@/lib/rates";
import { createDirectReservation } from "@/lib/reservations";
import { onReservationCreated } from "@/lib/sync";
import { PaymentStatus } from "@/lib/types";
import type { Reservation } from "@/generated/prisma/client";

import type {
  BookingActionState,
  BookingFieldErrors,
} from "./booking-state";
import { MAX_NIGHTS } from "./search-params";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const bookingSchema = z.object({
  // Hidden selection fields — failures here mean tampering or a stale form.
  roomTypeId: z.string().min(1),
  ratePlanId: z.string().min(1),
  checkIn: z.string().regex(ISO_DATE_RE),
  checkOut: z.string().regex(ISO_DATE_RE),
  // Guest-editable fields.
  adults: z.coerce
    .number({ error: "Please choose how many guests are staying." })
    .int()
    .min(1, "At least one guest must be staying.")
    .max(8, "For larger groups, please contact the hotel directly."),
  guestName: z
    .string()
    .trim()
    .min(2, "Please enter the guest's full name.")
    .max(120, "That name is too long — 120 characters max."),
  guestEmail: z
    .string()
    .trim()
    .max(200, "That email is too long.")
    .pipe(z.email("Please enter a valid email address.")),
  guestPhone: z
    .string()
    .trim()
    .max(40, "That phone number looks too long.")
    .transform((v) => (v === "" ? null : v)),
});

const SELECTION_FIELDS = ["roomTypeId", "ratePlanId", "checkIn", "checkOut"] as const;
const GUEST_FIELDS = ["guestName", "guestEmail", "guestPhone", "adults"] as const;

const START_OVER: BookingActionState = {
  status: "error",
  code: "VALIDATION",
  message:
    "Something went wrong with your room selection. Please go back and pick your dates and room again — nothing was booked.",
};

export async function createDirectBooking(
  _prevState: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const parsed = bookingSchema.safeParse({
    roomTypeId: formData.get("roomTypeId"),
    ratePlanId: formData.get("ratePlanId"),
    checkIn: formData.get("checkIn"),
    checkOut: formData.get("checkOut"),
    adults: formData.get("adults"),
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    guestPhone: formData.get("guestPhone") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: BookingFieldErrors = {};
    let selectionBroken = false;
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      if ((SELECTION_FIELDS as readonly string[]).includes(key)) {
        selectionBroken = true;
      } else if (
        (GUEST_FIELDS as readonly string[]).includes(key) &&
        !(key in fieldErrors)
      ) {
        fieldErrors[key as keyof BookingFieldErrors] = issue.message;
      }
    }
    if (selectionBroken) return START_OVER;
    return {
      status: "error",
      code: "VALIDATION",
      message: "Please review the highlighted fields below.",
      fieldErrors,
    };
  }

  const input = parsed.data;

  // ── Semantic date checks (the form may be stale — e.g. left open overnight).
  const todayIso = isoDate(new Date());
  if (input.checkIn < todayIso) {
    return {
      status: "error",
      code: "VALIDATION",
      message:
        "Your check-in date has already passed. Please pick new dates — nothing was booked.",
    };
  }
  if (input.checkOut <= input.checkIn) return START_OVER;
  if (nightsBetween(input.checkIn, input.checkOut) > MAX_NIGHTS) {
    return {
      status: "error",
      code: "VALIDATION",
      message: `Online booking covers stays up to ${MAX_NIGHTS} nights — for longer stays, please contact the hotel directly.`,
    };
  }

  // ── Re-verify the selection against the database (hidden fields are input,
  //    not truth).
  const roomType = await db.roomType.findUnique({
    where: { id: input.roomTypeId },
  });
  if (!roomType) return START_OVER;

  if (input.adults > roomType.occupancy) {
    return {
      status: "error",
      code: "VALIDATION",
      message: "Please review the highlighted fields below.",
      fieldErrors: {
        adults: `This room sleeps up to ${roomType.occupancy} ${roomType.occupancy === 1 ? "guest" : "guests"}.`,
      },
    };
  }

  const ratePlan = await db.ratePlan.findFirst({
    where: { id: input.ratePlanId, roomTypeId: input.roomTypeId },
  });
  if (!ratePlan) return START_OVER;

  // ── Atomically hold the shared pool + create the reservation.
  //    Total is computed inside from the rate calendar (integer centavos).
  //    NOTE: payments are out of MVP scope — every direct booking is
  //    PAY_AT_PROPERTY. TODO(ACTION-ITEMS): switch to an online payment flow
  //    (deposit or full prepayment) once a payment provider is integrated.
  let reservation: Reservation;
  try {
    reservation = await createDirectReservation({
      roomTypeId: input.roomTypeId,
      ratePlanId: input.ratePlanId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guestName: input.guestName,
      guestEmail: input.guestEmail,
      guestPhone: input.guestPhone,
      adults: input.adults,
      paymentStatus: PaymentStatus.PAY_AT_PROPERTY,
    });
  } catch (err) {
    if (err instanceof OversellError) {
      return {
        status: "error",
        code: "OVERSELL",
        message:
          "That room just got booked for at least one night of your stay — someone beat you to it on another channel. Please pick other dates or another room. Nothing was charged.",
      };
    }
    if (err instanceof RateUnavailableError) {
      return {
        status: "error",
        code: "RATE_UNAVAILABLE",
        message:
          "We don't have rates loaded for part of your stay, so we can't complete this booking online. Please try different dates.",
      };
    }
    console.error("[book] createDirectBooking failed:", err);
    return {
      status: "error",
      code: "UNKNOWN",
      message:
        "Something went wrong on our side and your booking was NOT completed. Please try again in a moment.",
    };
  }

  // Fan the reduced availability out to Airbnb / Booking.com / Expedia so the
  // sold nights close everywhere. A sync failure must not strand the guest —
  // the reservation exists and the pool is already decremented (sync retries
  // are the channel layer's concern; failures land in SyncLog).
  try {
    await onReservationCreated(reservation);
  } catch (err) {
    console.error(
      `[book] availability fan-out failed for ${reservation.code} (booking stands):`,
      err,
    );
  }

  redirect(`/book/confirmation/${encodeURIComponent(reservation.code)}`);
}
