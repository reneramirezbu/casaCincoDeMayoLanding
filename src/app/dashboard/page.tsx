import Link from "next/link";
import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  DoorOpen,
  Gauge,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ChannelBadge,
  EmptyState,
  StatusPill,
  buttonVariants,
} from "@/components/ui";
import { formatMXN } from "@/lib/money";
import { getDashboardMetrics, getUpcomingReservations } from "./_data";
import { formatDate, formatPercent, formatStay } from "./_format";

// Reads the shared pool + reservations at request time — never prerender.
export const dynamic = "force-dynamic";

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="gap-3">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-field bg-accent-soft text-accent">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

export default async function DashboardHomePage() {
  const [metrics, upcoming] = await Promise.all([
    getDashboardMetrics(),
    getUpcomingReservations(8),
  ]);

  const windowLabel =
    metrics.windowStart && metrics.windowEnd
      ? `${formatDate(metrics.windowStart)} – ${formatDate(metrics.windowEnd)} · ${metrics.windowNights} nights`
      : "No calendar open";

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl tracking-tight text-ink">Dashboard</h1>
        <p className="text-sm text-ink-muted">
          One shared 15-room pool across Airbnb, Booking.com, Expedia, and direct.
        </p>
      </header>

      {/* Summary tiles — all figures derived from the shared inventory pool. */}
      <section aria-label="Today at a glance">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            icon={Gauge}
            label="Occupancy tonight"
            value={formatPercent(metrics.occupancyTonight)}
            sub={`${metrics.soldTonight} of ${metrics.totalRooms} rooms sold`}
          />
          <StatTile
            icon={BedDouble}
            label="Available tonight"
            value={String(metrics.availableTonight)}
            sub="rooms still sellable across all channels"
          />
          <StatTile
            icon={CalendarCheck}
            label="Arrivals today"
            value={String(metrics.arrivalsToday)}
            sub="check-ins expected"
          />
          <StatTile
            icon={DoorOpen}
            label="Departures today"
            value={String(metrics.departuresToday)}
            sub="check-outs expected"
          />
        </div>
      </section>

      {/* Window occupancy + upcoming reservations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Calendar occupancy</CardTitle>
            <CardDescription>{windowLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-4xl font-semibold tabular-nums tracking-tight text-ink">
              {formatPercent(metrics.windowOccupancy)}
            </p>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken"
              role="img"
              aria-label={`${formatPercent(metrics.windowOccupancy)} occupancy across the open calendar`}
            >
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.round(metrics.windowOccupancy * 100)}%` }}
              />
            </div>
            <p className="text-xs text-ink-faint">
              Average across every open night. Nightly rates are seeded placeholders —
              set real rates before selling.
            </p>
            <Link
              href="/dashboard/calendar"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Open calendar
              <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Upcoming reservations</CardTitle>
              <CardDescription>Current and future stays, soonest first.</CardDescription>
            </div>
            <Link
              href="/dashboard/reservations"
              className="shrink-0 text-sm font-medium text-accent hover:text-accent-hover"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-0">
            {upcoming.length === 0 ? (
              <div className="px-6">
                <EmptyState
                  icon={<CalendarCheck />}
                  title="No upcoming reservations"
                  description="New bookings from any channel will appear here as soon as they arrive."
                />
              </div>
            ) : (
              <ul className="divide-y divide-edge">
                {upcoming.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <ChannelBadge channel={r.channel} showDot={false} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{r.guestName}</p>
                        <p className="truncate text-xs text-ink-faint">{r.roomTypeName}</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-ink-muted">
                      <p>{formatStay(r.checkIn, r.checkOut)}</p>
                      <p className="text-ink-faint">
                        {r.nights} night{r.nights === 1 ? "" : "s"}
                      </p>
                    </div>
                    <StatusPill status={r.status} />
                    <p className="w-24 text-right text-sm font-medium tabular-nums text-ink">
                      {formatMXN(r.totalCents)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
