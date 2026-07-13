import { Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui";
import { CalendarDays } from "lucide-react";
import { getCalendarModel } from "../_data";
import { formatDate } from "../_format";
import { CalendarGrid } from "../_components/calendar-grid";

// Reads the shared pool at request time — never prerender.
export const dynamic = "force-dynamic";

const CALENDAR_DAYS = 14;

const LEGEND: Array<{ label: string; className: string }> = [
  { label: "Airbnb", className: "bg-channel-airbnb" },
  { label: "Booking.com", className: "bg-channel-booking" },
  { label: "Expedia", className: "bg-channel-expedia" },
  { label: "Direct", className: "bg-channel-direct" },
];

export default async function CalendarPage() {
  const model = await getCalendarModel(CALENDAR_DAYS);
  const hasRooms = model.rows.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl tracking-tight text-ink">Availability calendar</h1>
        <p className="text-sm text-ink-muted">
          One shared pool across every channel · {formatDate(model.startDate)} –{" "}
          {formatDate(model.endDate)}. Each cell shows rooms still sellable; dots mark the
          channel each booking arrived on. Select a night to close it out.
        </p>
      </header>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
        {LEGEND.map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-[2px] ${item.className}`} aria-hidden />
            {item.label}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-danger-soft ring-1 ring-inset ring-danger/40" aria-hidden />
          Sold out / closed
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px] bg-warning-soft ring-1 ring-inset ring-warning/40" aria-hidden />
          Low availability
        </span>
      </div>

      {hasRooms ? (
        <CalendarGrid model={model} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No room types yet</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={<CalendarDays />}
              title="Nothing to show"
              description="Seed the database (npm run seed) to create room types and open the inventory calendar."
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
