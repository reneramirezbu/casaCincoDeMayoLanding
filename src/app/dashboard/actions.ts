"use server";

/**
 * Dashboard Server Actions.
 *
 * These run on the server, mutate the shared pool via the @/lib services (never
 * by fabricating data), then revalidate the affected dashboard routes so the
 * owner immediately sees the change. Shaped for React's useActionState:
 * `(prevState, formData) => nextState`.
 */

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { cancelReservation } from "@/lib/reservations";
import { toUTCMidnight } from "@/lib/dates";

export interface ActionState {
  ok: boolean;
  message: string;
  /** Monotonic id so repeat submissions re-trigger client effects (toasts). */
  at: number;
}

/** Revalidate every dashboard surface that reflects inventory/reservations. */
function revalidateDashboard(): void {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/reservations");
}

/**
 * Cancel a reservation and release its nights back to the shared pool.
 * Delegates to the transactional service (idempotent on already-cancelled).
 */
export async function cancelReservationAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("reservationId") ?? "").trim();
  if (!id) {
    return { ok: false, message: "Missing reservation id.", at: Date.now() };
  }
  try {
    const reservation = await cancelReservation(id);
    revalidateDashboard();
    return {
      ok: true,
      message: `Reservation ${reservation.code} cancelled — inventory released to the pool.`,
      at: Date.now(),
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Could not cancel reservation.",
      at: Date.now(),
    };
  }
}

/**
 * Close out a single night for one room type: set the shared pool's `available`
 * to 0 so NO channel can sell it. Used from the unified calendar. This does not
 * touch existing reservations — it only stops further sales for that night.
 */
export async function closeOutNightAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const roomTypeId = String(formData.get("roomTypeId") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  if (!roomTypeId || !date) {
    return { ok: false, message: "Missing room type or date.", at: Date.now() };
  }

  let night: Date;
  try {
    night = toUTCMidnight(date);
  } catch {
    return { ok: false, message: `Invalid date: ${date}.`, at: Date.now() };
  }

  try {
    const result = await db.inventoryDay.updateMany({
      where: { roomTypeId, date: night },
      data: { available: 0 },
    });
    if (result.count === 0) {
      return {
        ok: false,
        message: "No open inventory for that night to close out.",
        at: Date.now(),
      };
    }
    revalidateDashboard();
    return {
      ok: true,
      message: `Closed out ${date} — pool set to 0 across all channels.`,
      at: Date.now(),
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Could not close out the night.",
      at: Date.now(),
    };
  }
}

/**
 * Re-open a previously closed-out night by restoring the shared pool to the
 * room type's physical room count. (Only lifts a stop-sell; never invents
 * capacity beyond the real number of rooms.)
 */
export async function reopenNightAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const roomTypeId = String(formData.get("roomTypeId") ?? "").trim();
  const date = String(formData.get("date") ?? "").trim();
  if (!roomTypeId || !date) {
    return { ok: false, message: "Missing room type or date.", at: Date.now() };
  }

  let night: Date;
  try {
    night = toUTCMidnight(date);
  } catch {
    return { ok: false, message: `Invalid date: ${date}.`, at: Date.now() };
  }

  try {
    // Capacity = physical rooms of this type. Cannot exceed the real inventory.
    const capacity = await db.room.count({ where: { roomTypeId } });
    if (capacity === 0) {
      return { ok: false, message: "Room type has no rooms configured.", at: Date.now() };
    }
    const result = await db.inventoryDay.updateMany({
      where: { roomTypeId, date: night },
      data: { available: capacity },
    });
    if (result.count === 0) {
      return {
        ok: false,
        message: "No inventory row for that night to reopen.",
        at: Date.now(),
      };
    }
    revalidateDashboard();
    return {
      ok: true,
      message: `Reopened ${date} — pool restored to ${capacity} room${capacity === 1 ? "" : "s"}.`,
      at: Date.now(),
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Could not reopen the night.",
      at: Date.now(),
    };
  }
}
