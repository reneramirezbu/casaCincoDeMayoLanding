/**
 * INVENTORY — the anti-double-booking core.
 *
 * There is exactly ONE `InventoryDay` row per (roomTypeId, date). Its
 * `available` column is the SHARED POOL that every channel — Direct, Airbnb,
 * Booking.com, Expedia — sells from. A room is never double-booked because
 * EVERY booking, no matter the channel, decrements the SAME rows, and it does
 * so inside a single serialized transaction that re-checks availability for
 * every night immediately before decrementing.
 *
 * CONCURRENCY REASONING (why this cannot oversell)
 * ------------------------------------------------
 * Two guests racing for the last room of the same night must not both succeed.
 * We guarantee this with two layers:
 *
 *   1. Interactive transaction + BEGIN IMMEDIATE. holdInventory runs inside
 *      `db.$transaction(async tx => …)`. Our SQLite driver adapter opens each
 *      interactive transaction with `BEGIN IMMEDIATE`, which takes the
 *      database's write lock up front and serializes writers. (In Postgres this
 *      role is played by the row locks the conditional UPDATE acquires.)
 *
 *   2. Conditional, atomic decrement. We decrement with a single
 *      `updateMany({ where: { id, date, available: { gt: 0 } }, data: {
 *      available: { decrement: 1 } } })`. The `available > 0` guard is evaluated
 *      by the database as part of the same write. If the row was already at 0,
 *      `count` comes back 0 and we abort the whole transaction — so the pool can
 *      never go negative even if a check-then-write interleaving slipped past.
 *
 * If ANY night of the stay cannot be decremented, we throw `OversellError` and
 * the transaction rolls back, restoring every night we touched. It is
 * all-or-nothing: a stay is held for every night or for none.
 */

import { db } from "@/lib/db";
import { eachNight, isoDate, toUTCMidnight } from "@/lib/dates";
import type { AvailabilityNight } from "@/lib/types";

/** Prisma's interactive-transaction client type (a subset of the full client). */
type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Thrown when a requested stay cannot be held because at least one night is
 * sold out in the shared pool. Callers (booking flow, OTA ingest) should treat
 * this as a clean "not available" — the transaction has already rolled back.
 */
export class OversellError extends Error {
  readonly code = "OVERSELL" as const;
  /** ISO dates of the nights that were unavailable. */
  readonly soldOutNights: string[];
  constructor(roomTypeId: string, soldOutNights: string[]) {
    super(
      `Cannot hold room type ${roomTypeId}: sold out on ${soldOutNights.join(", ")}`,
    );
    this.name = "OversellError";
    this.soldOutNights = soldOutNights;
  }
}

/** Input for holding inventory for one stay. */
export interface HoldInventoryInput {
  roomTypeId: string;
  checkIn: Date | string;
  checkOut: Date | string;
}

/**
 * Read-only availability for a room type over [checkIn, checkOut). When
 * `roomTypeId` is omitted, returns per-night availability for EVERY room type.
 * This never mutates the pool.
 */
export async function getAvailability(
  params: {
    roomTypeId?: string;
    checkIn: Date | string;
    checkOut: Date | string;
  },
): Promise<
  Array<{
    roomTypeId: string;
    perNight: AvailabilityNight[];
    minAvailable: number;
  }>
> {
  const nights = eachNight(params.checkIn, params.checkOut);
  const rows = await db.inventoryDay.findMany({
    where: {
      ...(params.roomTypeId ? { roomTypeId: params.roomTypeId } : {}),
      date: { in: nights },
    },
    orderBy: [{ roomTypeId: "asc" }, { date: "asc" }],
  });

  // Group by room type.
  const byRoomType = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const key = row.roomTypeId;
    if (!byRoomType.has(key)) byRoomType.set(key, new Map());
    byRoomType.get(key)!.set(isoDate(row.date), row.available);
  }

  const result: Array<{
    roomTypeId: string;
    perNight: AvailabilityNight[];
    minAvailable: number;
  }> = [];

  for (const [roomTypeId, nightMap] of byRoomType) {
    const perNight: AvailabilityNight[] = nights.map((n) => ({
      date: isoDate(n),
      // A missing InventoryDay row means the night was never opened for sale → 0.
      available: nightMap.get(isoDate(n)) ?? 0,
    }));
    const minAvailable = perNight.reduce(
      (min, n) => Math.min(min, n.available),
      Number.POSITIVE_INFINITY,
    );
    result.push({
      roomTypeId,
      perNight,
      minAvailable: Number.isFinite(minAvailable) ? minAvailable : 0,
    });
  }

  return result;
}

/**
 * Atomically hold one unit of inventory for every night of the stay. Runs
 * inside an interactive transaction; either all nights are decremented or the
 * transaction rolls back and an `OversellError` is thrown. See the module-level
 * concurrency reasoning above.
 *
 * Pass an existing `tx` to enlist in a caller's transaction (e.g. so the hold
 * and the Reservation insert commit together — see reservations.ts). Without
 * one, this opens and commits its own transaction.
 */
export async function holdInventory(
  input: HoldInventoryInput,
  tx?: Tx,
): Promise<{ nights: string[] }> {
  const run = (client: Tx) => holdInventoryInTx(client, input);
  if (tx) return run(tx);
  return db.$transaction((client) => run(client));
}

async function holdInventoryInTx(
  tx: Tx,
  input: HoldInventoryInput,
): Promise<{ nights: string[] }> {
  const nights = eachNight(input.checkIn, input.checkOut);
  const soldOut: string[] = [];

  for (const night of nights) {
    // Conditional decrement: only succeeds while available > 0. The DB evaluates
    // the guard atomically with the write, so the pool can never go negative.
    const res = await tx.inventoryDay.updateMany({
      where: {
        roomTypeId: input.roomTypeId,
        date: toUTCMidnight(night),
        available: { gt: 0 },
      },
      data: { available: { decrement: 1 } },
    });
    if (res.count === 0) {
      soldOut.push(isoDate(night));
    }
  }

  if (soldOut.length > 0) {
    // Throwing here aborts the interactive transaction; every successful
    // decrement above is rolled back automatically. All-or-nothing.
    throw new OversellError(input.roomTypeId, soldOut);
  }

  return { nights: nights.map(isoDate) };
}

/**
 * Release previously held inventory (e.g. on cancellation), incrementing the
 * pool back by one for every night of the stay. Safe to enlist in a caller tx.
 *
 * We DON'T cap against the seeded capacity here — releasing only ever returns
 * units this reservation consumed. (Callers must not release the same
 * reservation twice; reservations.ts guards that via status transitions.)
 */
export async function releaseInventory(
  input: HoldInventoryInput,
  tx?: Tx,
): Promise<{ nights: string[] }> {
  const run = async (client: Tx) => {
    const nights = eachNight(input.checkIn, input.checkOut);
    for (const night of nights) {
      await client.inventoryDay.updateMany({
        where: { roomTypeId: input.roomTypeId, date: toUTCMidnight(night) },
        data: { available: { increment: 1 } },
      });
    }
    return { nights: nights.map(isoDate) };
  };
  if (tx) return run(tx);
  return db.$transaction((client) => run(client));
}
