"use client";

import * as React from "react";
import Form from "next/form";
import { Search } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { Field } from "@/components/ui/field";
import { addDaysUTC, isoDate, nightsBetween } from "@/lib/dates";
import { MAX_ADULTS, MAX_NIGHTS } from "./search-params";
import { plural } from "./format";

export interface SearchFormProps {
  /** Server's UTC "today" — the earliest bookable check-in. */
  minCheckIn: string;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultAdults: number;
}

/**
 * Date + party picker. Submits as a GET navigation to /book (next/form:
 * client-side nav with loading UI, still a plain form without JS), so a
 * search is a shareable URL.
 */
export function SearchForm({
  minCheckIn,
  defaultCheckIn,
  defaultCheckOut,
  defaultAdults,
}: SearchFormProps) {
  const [checkIn, setCheckIn] = React.useState(defaultCheckIn);
  const [checkOut, setCheckOut] = React.useState(defaultCheckOut);

  function handleCheckInChange(value: string) {
    setCheckIn(value);
    // Keep the range coherent: check-out is always at least the next day.
    if (value && (!checkOut || checkOut <= value)) {
      setCheckOut(isoDate(addDaysUTC(value, 1)));
    }
  }

  const validRange = Boolean(checkIn && checkOut && checkOut > checkIn);
  const nights = validRange ? nightsBetween(checkIn, checkOut) : 0;
  const tooLong = nights > MAX_NIGHTS;

  return (
    <Form action="/book" className="flex flex-col gap-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_9rem_auto] lg:items-end">
        <Field label="Check-in">
          <Input
            type="date"
            name="checkIn"
            required
            min={minCheckIn}
            value={checkIn}
            onChange={(e) => handleCheckInChange(e.target.value)}
          />
        </Field>
        <Field label="Check-out">
          <Input
            type="date"
            name="checkOut"
            required
            min={checkIn ? isoDate(addDaysUTC(checkIn, 1)) : minCheckIn}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </Field>
        <Field label="Guests">
          <Select name="adults" defaultValue={String(defaultAdults)}>
            {Array.from({ length: MAX_ADULTS }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {plural(n, "guest")}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" size="lg" className="w-full sm:col-span-2 lg:col-span-1 lg:w-auto">
          <Search aria-hidden />
          Check availability
        </Button>
      </div>

      <p className="text-[0.8125rem] text-ink-muted" aria-live="polite">
        {tooLong
          ? `Online booking covers stays up to ${MAX_NIGHTS} nights — for longer stays, please contact the hotel directly.`
          : validRange
            ? `${plural(nights, "night")} · pay on arrival, no prepayment`
            : "Choose your dates to see live availability."}
      </p>
    </Form>
  );
}
