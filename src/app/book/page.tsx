import { BedDouble, CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { searchAvailability } from "@/lib/availability";
import { addDaysUTC, isoDate } from "@/lib/dates";
import { BookingSteps } from "./booking-steps";
import { OfferList } from "./offer-list";
import { SearchForm } from "./search-form";
import { formatStayDate, plural } from "./format";
import { firstParam, parseStayParams } from "./search-params";

// Availability is live shared-pool data — never prerender this page.
export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const todayIso = isoDate(new Date());
  const parsed = parseStayParams(params, todayIso);

  const offers =
    parsed.kind === "ok"
      ? await searchAvailability({
          checkIn: parsed.checkIn,
          checkOut: parsed.checkOut,
        })
      : null;

  // Keep whatever the guest typed in the form, even when it failed validation,
  // so they can correct it instead of starting over.
  const defaultCheckIn =
    parsed.kind === "ok" ? parsed.checkIn : (firstParam(params.checkIn) ?? todayIso);
  const defaultCheckOut =
    parsed.kind === "ok"
      ? parsed.checkOut
      : (firstParam(params.checkOut) ?? isoDate(addDaysUTC(todayIso, 1)));
  const defaultAdults = parsed.kind === "ok" ? parsed.adults : 2;

  return (
    <div className="flex flex-col gap-8">
      <BookingSteps current={1} />

      <header className="max-w-2xl space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">
          Direct booking
        </p>
        <h1 className="font-serif text-3xl leading-[1.1] tracking-[-0.02em] text-ink sm:text-4xl">
          Reserve your stay
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
          Book directly with Casa Cinco de Mayo — your reservation goes
          straight to our front desk, and you pay when you arrive.
        </p>
      </header>

      <Card>
        <CardContent>
          <SearchForm
            minCheckIn={todayIso}
            defaultCheckIn={defaultCheckIn}
            defaultCheckOut={defaultCheckOut}
            defaultAdults={defaultAdults}
          />
        </CardContent>
      </Card>

      {parsed.kind === "invalid" && (
        <div
          role="alert"
          className="rounded-field border border-danger/30 bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
        >
          {parsed.message}
        </div>
      )}

      {parsed.kind === "empty" && (
        <EmptyState
          icon={<CalendarDays />}
          title="Choose your dates"
          description="Pick a check-in and check-out date to see the rooms available for your stay, with live rates."
        />
      )}

      {parsed.kind === "ok" && offers && (
        <section aria-label="Available rooms" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-serif text-xl text-ink">Available rooms</h2>
            <p className="text-[0.8125rem] text-ink-muted">
              {formatStayDate(parsed.checkIn)} → {formatStayDate(parsed.checkOut)}{" "}
              · {plural(parsed.nights, "night")} · {plural(parsed.adults, "guest")}
            </p>
          </div>

          {offers.length === 0 ? (
            <EmptyState
              icon={<BedDouble />}
              title="No rooms available for these dates"
              description="Every room is taken for at least one night of your stay. Try shifting your dates by a day or two."
            />
          ) : (
            <>
              <OfferList
                offers={offers}
                checkIn={parsed.checkIn}
                checkOut={parsed.checkOut}
                adults={parsed.adults}
              />
              <p className="text-xs text-ink-faint">
                All rates are in Mexican pesos (MXN), per room, per stay.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
