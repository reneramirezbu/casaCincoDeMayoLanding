/**
 * Shared state shape for the direct-booking server action (useActionState).
 *
 * Lives outside actions.ts because a "use server" module may only export async
 * functions — types are erased, but `initialBookingState` is a runtime value.
 */

export type BookingErrorCode =
  /** Input failed validation — field errors identify what to fix. */
  | "VALIDATION"
  /** The shared inventory pool sold out mid-checkout (another channel won). */
  | "OVERSELL"
  /** A night of the stay has no sellable rate loaded. */
  | "RATE_UNAVAILABLE"
  /** Unexpected server failure — the booking was NOT created. */
  | "UNKNOWN";

/** Fields the guest can actually correct inline. */
export type BookingFieldErrors = Partial<
  Record<"guestName" | "guestEmail" | "guestPhone" | "adults", string>
>;

export type BookingActionState =
  | { status: "idle" }
  | {
      status: "error";
      code: BookingErrorCode;
      /** Human-friendly summary, always safe to show verbatim. */
      message: string;
      fieldErrors?: BookingFieldErrors;
    };

export const initialBookingState: BookingActionState = { status: "idle" };
