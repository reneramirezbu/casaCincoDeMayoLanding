"use client";

import * as React from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { Field } from "@/components/ui/field";
import { createDirectBooking } from "./actions";
import { initialBookingState } from "./booking-state";
import { PaymentNote } from "./payment-note";
import { plural } from "./format";

export interface GuestDetailsFormProps {
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  defaultAdults: number;
  /** Room-type occupancy — caps the guests selector. */
  maxAdults: number;
  /** Where "pick different dates" should send the guest. */
  searchHref: string;
}

/**
 * Guest details + submit. The server action re-validates everything and
 * atomically holds the room; OversellError comes back as a friendly
 * "just got booked" message instead of a crash.
 */
export function GuestDetailsForm({
  roomTypeId,
  ratePlanId,
  checkIn,
  checkOut,
  defaultAdults,
  maxAdults,
  searchHref,
}: GuestDetailsFormProps) {
  const [state, formAction, pending] = useActionState(
    createDirectBooking,
    initialBookingState,
  );

  const isError = state.status === "error";
  const fieldErrors = isError ? state.fieldErrors : undefined;
  // Offer a way back to the search whenever the problem isn't fixable inline.
  const showSearchLink = isError && !fieldErrors && state.code !== "UNKNOWN";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* The verified selection travels as hidden fields; the action treats
          them as untrusted input and re-checks them against the database. */}
      <input type="hidden" name="roomTypeId" value={roomTypeId} />
      <input type="hidden" name="ratePlanId" value={ratePlanId} />
      <input type="hidden" name="checkIn" value={checkIn} />
      <input type="hidden" name="checkOut" value={checkOut} />

      {isError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-field border border-danger/30 bg-danger-soft px-4 py-3"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
          <div className="space-y-1 text-sm">
            <p className="font-medium text-danger">{state.message}</p>
            {showSearchLink && (
              <Link
                href={searchHref}
                className="inline-block font-medium text-ink underline underline-offset-2 hover:text-accent"
              >
                Pick different dates
              </Link>
            )}
          </div>
        </div>
      )}

      <Field label="Full name" required error={fieldErrors?.guestName}>
        <Input
          name="guestName"
          autoComplete="name"
          required
          maxLength={120}
          placeholder="Who is this reservation for?"
        />
      </Field>

      <Field
        label="Email"
        required
        error={fieldErrors?.guestEmail}
        description="Your confirmation code is shown on the next screen — we keep your email on the reservation."
      >
        <Input
          type="email"
          name="guestEmail"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={200}
          placeholder="you@example.com"
        />
      </Field>

      <Field
        label="Phone"
        error={fieldErrors?.guestPhone}
        description="Optional — helpful if we need to reach you before arrival."
      >
        <Input
          type="tel"
          name="guestPhone"
          autoComplete="tel"
          inputMode="tel"
          maxLength={40}
          placeholder="+52 415 000 0000"
        />
      </Field>

      <Field label="Guests" error={fieldErrors?.adults}>
        <Select
          name="adults"
          defaultValue={String(Math.min(defaultAdults, maxAdults))}
        >
          {Array.from({ length: maxAdults }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {plural(n, "guest")}
            </option>
          ))}
        </Select>
      </Field>

      {/* Placeholder for the future payment step — see PaymentNote. */}
      <PaymentNote />

      <div className="flex flex-col gap-2">
        <Button type="submit" size="lg" loading={pending} className="w-full">
          {pending ? "Confirming your room…" : "Confirm booking — pay on arrival"}
        </Button>
        <p className="text-center text-xs text-ink-faint">
          No payment is taken now. Your confirmation code appears on the next
          screen.
        </p>
      </div>
    </form>
  );
}
