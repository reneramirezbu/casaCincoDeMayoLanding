import type { Metadata } from "next";
import Link from "next/link";
import { CalendarX2, Check, Clock, SearchX, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { isoDate, nightsBetween } from "@/lib/dates";
import { formatMXN } from "@/lib/money";
import { PaymentStatus, ReservationStatus } from "@/lib/types";
import { BookingSteps } from "../../booking-steps";
import { PaymentNote } from "../../payment-note";
import { formatStayDate, plural } from "../../format";
import { CopyCode } from "../copy-code";

// Looks up a live reservation — never prerender.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking confirmation",
  robots: { index: false, follow: false },
};

const PAYMENT_LABELS: Record<string, string> = {
  [PaymentStatus.PAY_AT_PROPERTY]: "Pay on arrival",
  [PaymentStatus.PAID]: "Paid",
  [PaymentStatus.UNPAID]: "Unpaid",
};

/** Headline + mark per reservation status — always tell the guest the truth. */
const STATUS_UI = {
  [ReservationStatus.CONFIRMED]: {
    icon: Check,
    iconClass: "bg-success-soft text-success",
    title: "Your stay is confirmed",
    lede: "Your room is reserved across every channel. Save your confirmation code — you'll need it at check-in.",
    badge: <Badge variant="success">Confirmed</Badge>,
  },
  [ReservationStatus.HELD]: {
    icon: Clock,
    iconClass: "bg-warning-soft text-warning",
    title: "Your booking is on hold",
    lede: "We're holding the room for you while the reservation is finalized. Save your confirmation code.",
    badge: <Badge variant="warning">On hold</Badge>,
  },
  [ReservationStatus.CANCELLED]: {
    icon: X,
    iconClass: "bg-danger-soft text-danger",
    title: "This reservation was cancelled",
    lede: "The nights were released back to availability. You're welcome to book again below.",
    badge: <Badge variant="danger">Cancelled</Badge>,
  },
} as const;

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const reservation = await db.reservation.findUnique({
    where: { code: decodeURIComponent(code) },
  });

  if (!reservation) {
    return (
      <div className="flex flex-col gap-8">
        <BookingSteps current={3} />
        <EmptyState
          icon={<SearchX />}
          title="We couldn't find that reservation"
          description="Double-check the confirmation link, or start a new booking below."
          action={
            <Link href="/book" className={buttonVariants({ variant: "secondary" })}>
              Back to booking
            </Link>
          }
        />
      </div>
    );
  }

  const roomType = await db.roomType.findUnique({
    where: { id: reservation.roomTypeId },
  });

  const checkInIso = isoDate(reservation.checkIn);
  const checkOutIso = isoDate(reservation.checkOut);
  const nights = nightsBetween(checkInIso, checkOutIso);
  const cancelled = reservation.status === ReservationStatus.CANCELLED;
  const ui = STATUS_UI[reservation.status];
  const StatusIcon = ui.icon;

  return (
    <div className="flex flex-col gap-8">
      <BookingSteps current={3} />

      <header className="flex max-w-2xl flex-col items-start gap-4">
        <div
          aria-hidden
          className={cn(
            "flex size-12 items-center justify-center rounded-full",
            ui.iconClass,
          )}
        >
          <StatusIcon className="size-6" />
        </div>
        <h1 className="font-serif text-3xl leading-[1.1] tracking-[-0.02em] text-ink sm:text-4xl">
          {ui.title}
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-ink-muted">{ui.lede}</p>
      </header>

      {!cancelled && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-faint">
            Confirmation code
          </p>
          <CopyCode code={reservation.code} />
        </div>
      )}

      <Card className={cn("max-w-2xl", cancelled && "opacity-75")}>
        <CardHeader className="flex-row items-baseline justify-between gap-3">
          <CardTitle className="font-serif text-lg font-normal">
            Reservation summary
          </CardTitle>
          {ui.badge}
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <dl className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Room</dt>
              <dd className="text-right font-medium text-ink">
                {roomType?.name ?? reservation.roomTypeId}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Check-in</dt>
              <dd className="font-medium text-ink">{formatStayDate(checkInIso)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Check-out</dt>
              <dd className="font-medium text-ink">{formatStayDate(checkOutIso)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Stay</dt>
              <dd className="font-medium text-ink">
                {plural(nights, "night")} · {plural(reservation.adults, "guest")}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Booked by</dt>
              <dd className="text-right font-medium text-ink">
                {reservation.guestName}
                {reservation.guestEmail && (
                  <span className="block text-[0.8125rem] font-normal text-ink-muted">
                    {reservation.guestEmail}
                  </span>
                )}
                {reservation.guestPhone && (
                  <span className="block text-[0.8125rem] font-normal text-ink-muted">
                    {reservation.guestPhone}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-muted">Payment</dt>
              <dd className="font-medium text-ink">
                {PAYMENT_LABELS[reservation.paymentStatus] ?? reservation.paymentStatus}
              </dd>
            </div>
          </dl>

          <div className="flex items-baseline justify-between gap-3 border-t border-edge pt-4">
            <p className="font-medium text-ink">Total</p>
            <p className="text-right">
              <span className="text-lg font-semibold tracking-[-0.01em] text-ink">
                {formatMXN(reservation.totalCents)}
              </span>{" "}
              <span className="text-xs text-ink-muted">MXN</span>
            </p>
          </div>

          {!cancelled && <PaymentNote />}
        </CardContent>
      </Card>

      {!cancelled && (
        <section className="max-w-2xl space-y-3">
          <h2 className="font-serif text-lg text-ink">What happens next</h2>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              Your nights are blocked on Airbnb, Booking.com, and Expedia — the
              room can&apos;t be double-booked.
            </li>
            <li className="flex items-start gap-2.5">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
              Show your confirmation code at the front desk when you arrive.
            </li>
            <li className="flex items-start gap-2.5">
              <CalendarX2 aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-faint" />
              Need to change or cancel? Contact the hotel with your
              confirmation code.
            </li>
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/book" className={buttonVariants({ variant: "secondary" })}>
          {cancelled ? "Book a new stay" : "Book another stay"}
        </Link>
        <Link href="/" className={buttonVariants({ variant: "ghost" })}>
          Back to the hotel site
        </Link>
      </div>
    </div>
  );
}
