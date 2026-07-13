/**
 * RESERVATIONS — create/cancel a booking against the shared pool.
 *
 * createReservation holds inventory AND writes the Reservation row inside ONE
 * interactive transaction, so a booking can never exist without its inventory
 * hold (and vice versa). If the stay is sold out, holdInventory throws
 * OversellError and the whole thing rolls back — no orphan reservation.
 *
 * This module is channel-agnostic: the SAME path serves a direct-website
 * booking and an OTA booking ingested by sync.ts. That is precisely why one
 * channel's sale blocks the others — they all funnel through this one writer.
 */

import { db } from "@/lib/db";
import { holdInventory, releaseInventory } from "@/lib/inventory";
import { quote } from "@/lib/rates";
import { toUTCMidnight } from "@/lib/dates";
import {
  Channel,
  PaymentStatus,
  ReservationStatus,
  type Reservation,
} from "@/generated/prisma/client";
import type { CreateReservationInput } from "@/lib/types";

/** Generate a human-facing confirmation code, e.g. "CCM-1A2B3C-XY". */
function generateCode(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase();
  return `CCM-${stamp}-${rand}`;
}

/** Resolve the rate plan to book: explicit id, else the room type's first plan. */
async function resolveRatePlanId(
  roomTypeId: string,
  ratePlanId?: string,
): Promise<string> {
  if (ratePlanId) return ratePlanId;
  const plan = await db.ratePlan.findFirst({
    where: { roomTypeId },
    orderBy: { name: "asc" },
  });
  if (!plan) {
    throw new Error(`Room type ${roomTypeId} has no rate plan configured`);
  }
  return plan.id;
}

/**
 * Create a reservation from ANY channel. Atomically:
 *   1. holds one unit of inventory for every night (shared pool), and
 *   2. inserts the Reservation row.
 * Both commit together or not at all.
 *
 * The nightly total is taken from `input.totalCents` when provided (e.g. an OTA
 * tells us what the guest paid); otherwise it is computed from the rate
 * calendar via quote(). Throws OversellError if any night is sold out, or
 * RateUnavailableError if a night has no sellable rate and no total was given.
 */
export async function createReservation(
  input: CreateReservationInput,
): Promise<Reservation> {
  const checkIn = toUTCMidnight(input.checkIn);
  const checkOut = toUTCMidnight(input.checkOut);
  const ratePlanId = await resolveRatePlanId(input.roomTypeId, input.ratePlanId);

  // Determine the total OUTSIDE the write transaction (read-only pricing).
  const totalCents =
    input.totalCents ??
    (await quote(input.roomTypeId, checkIn, checkOut, ratePlanId)).totalCents;

  const status = input.confirm
    ? ReservationStatus.CONFIRMED
    : ReservationStatus.HELD;

  return db.$transaction(async (tx) => {
    // (1) Hold the shared pool for every night — throws if sold out (rolls back).
    await holdInventory(
      { roomTypeId: input.roomTypeId, checkIn, checkOut },
      tx,
    );

    // (2) Insert the reservation in the SAME transaction.
    return tx.reservation.create({
      data: {
        code: generateCode(),
        channel: input.channel,
        roomTypeId: input.roomTypeId,
        ratePlanId,
        checkIn,
        checkOut,
        guestName: input.guestName,
        guestEmail: input.guestEmail ?? null,
        guestPhone: input.guestPhone ?? null,
        adults: input.adults ?? 1,
        totalCents,
        status,
        paymentStatus: input.paymentStatus ?? PaymentStatus.UNPAID,
        externalRef: input.externalRef ?? null,
      },
    });
  });
}

/**
 * Cancel a reservation and release its held nights back to the shared pool.
 * Idempotent: cancelling an already-CANCELLED reservation is a no-op (so we
 * never release the same nights twice). Both the status change and the
 * inventory release commit together.
 */
export async function cancelReservation(id: string): Promise<Reservation> {
  return db.$transaction(async (tx) => {
    const existing = await tx.reservation.findUniqueOrThrow({ where: { id } });
    if (existing.status === ReservationStatus.CANCELLED) {
      return existing; // already released — do nothing.
    }
    await releaseInventory(
      {
        roomTypeId: existing.roomTypeId,
        checkIn: existing.checkIn,
        checkOut: existing.checkOut,
      },
      tx,
    );
    return tx.reservation.update({
      where: { id },
      data: { status: ReservationStatus.CANCELLED },
    });
  });
}

/** Mark a HELD reservation CONFIRMED (e.g. after payment). */
export async function confirmReservation(id: string): Promise<Reservation> {
  return db.reservation.update({
    where: { id },
    data: { status: ReservationStatus.CONFIRMED },
  });
}

/** Convenience: a direct-website booking (channel = DIRECT, confirmed). */
export async function createDirectReservation(
  input: Omit<CreateReservationInput, "channel">,
): Promise<Reservation> {
  return createReservation({
    ...input,
    channel: Channel.DIRECT,
    confirm: input.confirm ?? true,
  });
}
