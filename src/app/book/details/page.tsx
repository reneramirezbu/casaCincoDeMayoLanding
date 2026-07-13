import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BedDouble, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { searchAvailability } from "@/lib/availability";
import { isoDate } from "@/lib/dates";
import { formatMXN } from "@/lib/money";
import { BookingSteps } from "../booking-steps";
import { GuestDetailsForm } from "../guest-details-form";
import { formatNightLabel, formatStayDate, plural } from "../format";
import { firstParam, parseStayParams, stayHref } from "../search-params";

// Re-verifies live availability on every request — never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your details" };

/** Full-page fallback when the selection can't proceed. */
function CannotProceed({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <BookingSteps current={2} />
      <EmptyState
        icon={<BedDouble />}
        title={title}
        description={description}
        action={
          <Link href={backHref} className={buttonVariants({ variant: "secondary" })}>
            <ArrowLeft aria-hidden className="size-4" />
            {backLabel}
          </Link>
        }
      />
    </div>
  );
}

export default async function GuestDetailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const todayIso = isoDate(new Date());
  const stay = parseStayParams(params, todayIso);
  const roomTypeId = firstParam(params.roomTypeId);

  if (stay.kind !== "ok" || !roomTypeId) {
    return (
      <CannotProceed
        title="Let's start with your dates"
        description="We couldn't read your room selection. Pick your dates and choose a room to continue."
        backHref="/book"
        backLabel="Back to search"
      />
    );
  }

  const backHref = stayHref("/book", stay);

  // Re-check LIVE availability — the pool may have moved since the search.
  const offers = await searchAvailability({
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
  });
  const offer = offers.find((o) => o.roomTypeId === roomTypeId);

  if (!offer) {
    return (
      <CannotProceed
        title="This room is no longer available"
        description="It may have just been booked on another channel for one of your nights. Your dates are kept — pick another room or shift your stay."
        backHref={backHref}
        backLabel="See other rooms"
      />
    );
  }

  if (offer.occupancy < stay.adults) {
    return (
      <CannotProceed
        title={`This room sleeps up to ${offer.occupancy}`}
        description={`Your party of ${plural(stay.adults, "guest")} won't fit in a single ${offer.roomTypeName}. Choose a larger room or reduce the guest count.`}
        backHref={backHref}
        backLabel="See other rooms"
      />
    );
  }

  const { quote } = offer;

  return (
    <div className="flex flex-col gap-8">
      <BookingSteps current={2} />

      <header className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 rounded-field text-sm font-medium text-ink-muted outline-none transition-colors duration-150 ease-out hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Change dates or room
        </Link>
        <h1 className="font-serif text-3xl leading-[1.1] tracking-[-0.02em] text-ink sm:text-4xl">
          Your details
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-ink-muted">
          Almost there — tell us who&apos;s staying and we&apos;ll hold the
          room.
        </p>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg font-normal">
              Guest information
            </CardTitle>
            <CardDescription>
              We only use this to manage your reservation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GuestDetailsForm
              roomTypeId={offer.roomTypeId}
              ratePlanId={offer.ratePlanId}
              checkIn={stay.checkIn}
              checkOut={stay.checkOut}
              defaultAdults={stay.adults}
              maxAdults={offer.occupancy}
              searchHref={backHref}
            />
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="font-serif text-lg font-normal">
              Your stay
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-ink">{offer.roomTypeName}</p>
              <p className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
                <Users aria-hidden className="size-3.5" />
                Sleeps up to {offer.occupancy}
              </p>
            </div>

            <dl className="space-y-2 border-t border-edge pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">Check-in</dt>
                <dd className="font-medium text-ink">
                  {formatStayDate(stay.checkIn)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-muted">Check-out</dt>
                <dd className="font-medium text-ink">
                  {formatStayDate(stay.checkOut)}
                </dd>
              </div>
            </dl>

            <div className="border-t border-edge pt-4">
              <p className="mb-2 text-[0.8125rem] font-medium uppercase tracking-[0.08em] text-ink-faint">
                {plural(quote.nights, "night")}
              </p>
              <ul
                className={
                  quote.lines.length > 8
                    ? "max-h-48 space-y-1.5 overflow-y-auto pr-1"
                    : "space-y-1.5"
                }
              >
                {quote.lines.map((line) => (
                  <li
                    key={line.date}
                    className="flex items-baseline justify-between gap-3 text-[0.8125rem]"
                  >
                    <span className="text-ink-muted">
                      {formatNightLabel(line.date)}
                    </span>
                    <span className="tabular-nums text-ink">
                      {formatMXN(line.priceCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-baseline justify-between gap-3 border-t border-edge pt-4">
              <p className="font-medium text-ink">Total</p>
              <p className="text-right">
                <span className="text-lg font-semibold tracking-[-0.01em] text-ink">
                  {formatMXN(quote.totalCents)}
                </span>{" "}
                <span className="text-xs text-ink-muted">MXN</span>
              </p>
            </div>

            <p className="text-[0.8125rem] text-ink-muted">
              Payment on arrival at the hotel — nothing is charged online.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
