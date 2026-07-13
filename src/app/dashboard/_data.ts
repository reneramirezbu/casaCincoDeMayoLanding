/**
 * Dashboard read model — SERVER ONLY.
 *
 * Thin query helpers that turn the shared-pool DB (via @/lib/*) into
 * serializable, presentation-ready shapes for the dashboard Server Components.
 * Nothing here mutates state (that lives in ./actions.ts). Never import from a
 * "use client" component — it opens a DB connection.
 *
 * IMPORTANT: every number below is DERIVED from the seeded DB. We never
 * fabricate occupancy, revenue, or guest data. When the DB has no reservations
 * yet (fresh seed), the metrics correctly read as 0 / empty.
 */

import { db } from "@/lib/db";
import { addDaysUTC, eachNight, isoDate, toUTCMidnight } from "@/lib/dates";
import { ReservationStatus, type ChannelType, type ReservationStatusType } from "@/lib/types";

/** Reservation states that actually consume a room from the shared pool. */
const OCCUPYING_STATUSES = [
  ReservationStatus.HELD,
  ReservationStatus.CONFIRMED,
] as const;

/** A reservation shape safe to hand to Client Components (no Date objects). */
export interface ReservationRow {
  id: string;
  code: string;
  channel: ChannelType;
  status: ReservationStatusType;
  paymentStatus: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  adults: number;
  roomTypeId: string;
  roomTypeName: string;
  checkIn: string; // ISO YYYY-MM-DD
  checkOut: string; // ISO YYYY-MM-DD
  nights: number;
  totalCents: number;
  externalRef: string | null;
}

/** Map roomTypeId → physical room count (the per-type pool capacity). */
async function getCapacityByRoomType(): Promise<{
  capacityById: Map<string, number>;
  totalRooms: number;
}> {
  const roomTypes = await db.roomType.findMany({
    include: { _count: { select: { rooms: true } } },
    orderBy: { name: "asc" },
  });
  const capacityById = new Map(roomTypes.map((rt) => [rt.id, rt._count.rooms]));
  const totalRooms = roomTypes.reduce((sum, rt) => sum + rt._count.rooms, 0);
  return { capacityById, totalRooms };
}

export interface DashboardMetrics {
  totalRooms: number;
  /** Tonight = the night of "today" (server date, UTC-midnight). */
  soldTonight: number;
  availableTonight: number;
  occupancyTonight: number; // 0..1
  arrivalsToday: number;
  departuresToday: number;
  /** Occupancy averaged across every night the inventory calendar is open. */
  windowOccupancy: number; // 0..1
  windowStart: string | null;
  windowEnd: string | null;
  windowNights: number;
}

/**
 * Summary tiles for the dashboard home. All figures derived from InventoryDay
 * (the shared pool) and Reservation rows — real, never invented.
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const today = toUTCMidnight(new Date());
  const { capacityById, totalRooms } = await getCapacityByRoomType();

  // ── Tonight ────────────────────────────────────────────────────────────
  const tonightRows = await db.inventoryDay.findMany({ where: { date: today } });
  let soldTonight = 0;
  let availableTonight = 0;
  let capacityTonight = 0;
  for (const row of tonightRows) {
    const cap = capacityById.get(row.roomTypeId) ?? 0;
    soldTonight += Math.max(0, cap - row.available);
    availableTonight += row.available;
    capacityTonight += cap;
  }
  const occupancyTonight = capacityTonight ? soldTonight / capacityTonight : 0;

  // ── Arrivals / departures today ────────────────────────────────────────
  const [arrivalsToday, departuresToday] = await Promise.all([
    db.reservation.count({
      where: { checkIn: today, status: { in: [...OCCUPYING_STATUSES] } },
    }),
    db.reservation.count({
      where: { checkOut: today, status: { in: [...OCCUPYING_STATUSES] } },
    }),
  ]);

  // ── Occupancy across the whole open calendar window ────────────────────
  const invRows = await db.inventoryDay.findMany({ orderBy: { date: "asc" } });
  let soldWindow = 0;
  let capacityNights = 0;
  const dateSet = new Set<string>();
  for (const row of invRows) {
    const cap = capacityById.get(row.roomTypeId) ?? 0;
    soldWindow += Math.max(0, cap - row.available);
    capacityNights += cap;
    dateSet.add(isoDate(row.date));
  }
  const windowOccupancy = capacityNights ? soldWindow / capacityNights : 0;

  return {
    totalRooms,
    soldTonight,
    availableTonight,
    occupancyTonight,
    arrivalsToday,
    departuresToday,
    windowOccupancy,
    windowStart: invRows.length ? isoDate(invRows[0].date) : null,
    windowEnd: invRows.length ? isoDate(invRows[invRows.length - 1].date) : null,
    windowNights: dateSet.size,
  };
}

function toReservationRow(r: {
  id: string;
  code: string;
  channel: ChannelType;
  status: ReservationStatusType;
  paymentStatus: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  adults: number;
  roomTypeId: string;
  roomType: { name: string };
  checkIn: Date;
  checkOut: Date;
  totalCents: number;
  externalRef: string | null;
}): ReservationRow {
  const checkIn = isoDate(r.checkIn);
  const checkOut = isoDate(r.checkOut);
  return {
    id: r.id,
    code: r.code,
    channel: r.channel,
    status: r.status,
    paymentStatus: r.paymentStatus,
    guestName: r.guestName,
    guestEmail: r.guestEmail,
    guestPhone: r.guestPhone,
    adults: r.adults,
    roomTypeId: r.roomTypeId,
    roomTypeName: r.roomType.name,
    checkIn,
    checkOut,
    nights: Math.round(
      (toUTCMidnight(checkOut).getTime() - toUTCMidnight(checkIn).getTime()) /
        86_400_000,
    ),
    totalCents: r.totalCents,
    externalRef: r.externalRef,
  };
}

/** Upcoming/in-house reservations for the dashboard home list. */
export async function getUpcomingReservations(limit = 8): Promise<ReservationRow[]> {
  const today = toUTCMidnight(new Date());
  const rows = await db.reservation.findMany({
    where: { status: { in: [...OCCUPYING_STATUSES] }, checkOut: { gte: today } },
    orderBy: [{ checkIn: "asc" }, { createdAt: "desc" }],
    take: limit,
    include: { roomType: { select: { name: true } } },
  });
  return rows.map(toReservationRow);
}

export interface ReservationFilter {
  channel?: ChannelType;
  status?: ReservationStatusType;
}

/** Full reservations list for the reservations table, with optional filters. */
export async function getReservations(
  filter: ReservationFilter = {},
): Promise<ReservationRow[]> {
  const rows = await db.reservation.findMany({
    where: {
      ...(filter.channel ? { channel: filter.channel } : {}),
      ...(filter.status ? { status: filter.status } : {}),
    },
    orderBy: [{ checkIn: "asc" }, { createdAt: "desc" }],
    include: { roomType: { select: { name: true } } },
  });
  return rows.map(toReservationRow);
}

// ── Unified availability calendar ─────────────────────────────────────────

export interface CalendarReservationBadge {
  id: string;
  code: string;
  channel: ChannelType;
  guestName: string;
}

export interface CalendarCell {
  date: string; // ISO YYYY-MM-DD
  available: number;
  capacity: number;
  sold: number;
  reservations: CalendarReservationBadge[];
}

export interface CalendarRow {
  roomTypeId: string;
  roomTypeName: string;
  capacity: number;
  cells: CalendarCell[];
}

export interface CalendarNight {
  date: string; // ISO
  weekday: string; // e.g. "Mon"
  day: number; // day of month
  month: string; // e.g. "Jul"
  isWeekend: boolean;
}

export interface CalendarModel {
  nights: CalendarNight[];
  rows: CalendarRow[];
  startDate: string;
  endDate: string;
}

/**
 * The unified availability calendar: one grid of room types (rows) × the next
 * `days` nights (columns). Each cell carries the shared-pool availability AND
 * every active reservation occupying that night — this is the "one calendar
 * across every channel" view, straight from the single inventory ledger.
 */
export async function getCalendarModel(days = 14): Promise<CalendarModel> {
  const start = toUTCMidnight(new Date());
  const end = addDaysUTC(start, days);
  const nightDates = eachNight(start, end);
  const nightIsos = nightDates.map(isoDate);

  const { capacityById } = await getCapacityByRoomType();
  const roomTypes = await db.roomType.findMany({ orderBy: { name: "asc" } });

  // Availability per (roomTypeId, isoDate).
  const invRows = await db.inventoryDay.findMany({
    where: { date: { in: nightDates } },
  });
  const availByType = new Map<string, Map<string, number>>();
  for (const row of invRows) {
    const iso = isoDate(row.date);
    if (!availByType.has(row.roomTypeId)) availByType.set(row.roomTypeId, new Map());
    availByType.get(row.roomTypeId)!.set(iso, row.available);
  }

  // Active reservations overlapping the window, bucketed per (roomTypeId, night).
  const reservations = await db.reservation.findMany({
    where: {
      status: { in: [...OCCUPYING_STATUSES] },
      checkIn: { lt: end },
      checkOut: { gt: start },
    },
    orderBy: { checkIn: "asc" },
  });
  const resByTypeNight = new Map<string, CalendarReservationBadge[]>();
  const key = (typeId: string, iso: string) => `${typeId} ${iso}`;
  for (const r of reservations) {
    for (const night of eachNight(r.checkIn, r.checkOut)) {
      const iso = isoDate(night);
      if (!nightIsos.includes(iso)) continue;
      const k = key(r.roomTypeId, iso);
      if (!resByTypeNight.has(k)) resByTypeNight.set(k, []);
      resByTypeNight.get(k)!.push({
        id: r.id,
        code: r.code,
        channel: r.channel,
        guestName: r.guestName,
      });
    }
  }

  const weekdayFmt = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  const monthFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  const nights: CalendarNight[] = nightDates.map((d) => {
    const weekday = weekdayFmt.format(d);
    return {
      date: isoDate(d),
      weekday,
      day: d.getUTCDate(),
      month: monthFmt.format(d),
      isWeekend: weekday === "Fri" || weekday === "Sat",
    };
  });

  const rows: CalendarRow[] = roomTypes.map((rt) => {
    const capacity = capacityById.get(rt.id) ?? 0;
    const avail = availByType.get(rt.id);
    const cells: CalendarCell[] = nightIsos.map((iso) => {
      const available = avail?.get(iso) ?? 0;
      const reservations = resByTypeNight.get(key(rt.id, iso)) ?? [];
      return {
        date: iso,
        available,
        capacity,
        sold: Math.max(0, capacity - available),
        reservations,
      };
    });
    return { roomTypeId: rt.id, roomTypeName: rt.name, capacity, cells };
  });

  return {
    nights,
    rows,
    startDate: isoDate(start),
    endDate: isoDate(addDaysUTC(start, days - 1)),
  };
}
