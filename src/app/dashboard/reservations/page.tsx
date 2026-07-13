import Link from "next/link";
import { ClipboardList } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChannelBadge,
  EmptyState,
  Select,
  StatusPill,
  buttonVariants,
} from "@/components/ui";
import { formatMXN } from "@/lib/money";
import {
  Channel,
  ReservationStatus,
  type ChannelType,
  type ReservationStatusType,
} from "@/lib/types";
import { getReservations } from "../_data";
import { formatStay } from "../_format";
import { CancelReservationControl } from "../_components/cancel-reservation-control";

// Reads reservations at request time — never prerender.
export const dynamic = "force-dynamic";

const CHANNEL_VALUES = Object.values(Channel);
const STATUS_VALUES = Object.values(ReservationStatus);

const STATUS_LABELS: Record<string, string> = {
  HELD: "Held",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

const CHANNEL_LABELS: Record<string, string> = {
  DIRECT: "Direct",
  AIRBNB: "Airbnb",
  BOOKING: "Booking.com",
  EXPEDIA: "Expedia",
};

function parseChannel(value?: string): ChannelType | undefined {
  return value && CHANNEL_VALUES.includes(value as ChannelType)
    ? (value as ChannelType)
    : undefined;
}
function parseStatus(value?: string): ReservationStatusType | undefined {
  return value && STATUS_VALUES.includes(value as ReservationStatusType)
    ? (value as ReservationStatusType)
    : undefined;
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const channel = parseChannel(sp.channel);
  const status = parseStatus(sp.status);
  const reservations = await getReservations({ channel, status });
  const filtered = Boolean(channel || status);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl tracking-tight text-ink">Reservations</h1>
        <p className="text-sm text-ink-muted">
          Every booking from every channel, funneled through one shared pool.
        </p>
      </header>

      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>All reservations</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">
              {reservations.length} {reservations.length === 1 ? "reservation" : "reservations"}
              {filtered ? " match your filters" : ""}
            </p>
          </div>

          {/* GET form — filtering stays a Server Component (no client JS). */}
          <form method="get" className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
              Channel
              <Select name="channel" defaultValue={channel ?? ""} wrapperClassName="w-44">
                <option value="">All channels</option>
                {CHANNEL_VALUES.map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c] ?? c}
                  </option>
                ))}
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-medium text-ink-muted">
              Status
              <Select name="status" defaultValue={status ?? ""} wrapperClassName="w-40">
                <option value="">All statuses</option>
                {STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s] ?? s}
                  </option>
                ))}
              </Select>
            </label>
            <button type="submit" className={buttonVariants({ size: "md" })}>
              Apply
            </button>
            {filtered && (
              <Link
                href="/dashboard/reservations"
                className={buttonVariants({ variant: "ghost", size: "md" })}
              >
                Clear
              </Link>
            )}
          </form>
        </CardHeader>

        <CardContent className="px-0">
          {reservations.length === 0 ? (
            <div className="px-6">
              <EmptyState
                icon={<ClipboardList />}
                title={filtered ? "No matching reservations" : "No reservations yet"}
                description={
                  filtered
                    ? "Try clearing the filters to see every booking."
                    : "Bookings from Airbnb, Booking.com, Expedia, and your direct site will appear here."
                }
                action={
                  filtered ? (
                    <Link
                      href="/dashboard/reservations"
                      className={buttonVariants({ variant: "secondary", size: "sm" })}
                    >
                      Clear filters
                    </Link>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-y border-edge bg-surface-sunken text-left text-xs font-medium uppercase tracking-wide text-ink-faint">
                    <th scope="col" className="px-6 py-2.5">Channel</th>
                    <th scope="col" className="px-3 py-2.5">Guest</th>
                    <th scope="col" className="px-3 py-2.5">Stay</th>
                    <th scope="col" className="px-3 py-2.5">Room type</th>
                    <th scope="col" className="px-3 py-2.5">Status</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Total</th>
                    <th scope="col" className="px-6 py-2.5 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {reservations.map((r) => {
                    const active =
                      r.status === ReservationStatus.HELD ||
                      r.status === ReservationStatus.CONFIRMED;
                    return (
                      <tr key={r.id} className="hover:bg-surface-sunken/50">
                        <td className="px-6 py-3">
                          <ChannelBadge channel={r.channel} />
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-ink">{r.guestName}</p>
                          <p className="text-xs text-ink-faint">
                            <span className="font-mono">{r.code}</span>
                            {r.externalRef ? ` · ${r.externalRef}` : ""}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-ink-muted">
                          {formatStay(r.checkIn, r.checkOut)}
                          <span className="block text-xs text-ink-faint">
                            {r.nights} night{r.nights === 1 ? "" : "s"} · {r.adults} adult
                            {r.adults === 1 ? "" : "s"}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-ink-muted">
                          <span className="block max-w-[14rem] truncate">{r.roomTypeName}</span>
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={r.status} />
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums text-ink">
                          {formatMXN(r.totalCents)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {active ? (
                            <CancelReservationControl
                              reservationId={r.id}
                              code={r.code}
                              guestName={r.guestName}
                              checkIn={r.checkIn}
                              checkOut={r.checkOut}
                            />
                          ) : (
                            <span className="text-xs text-ink-faint">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
