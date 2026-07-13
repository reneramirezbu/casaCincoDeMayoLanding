/**
 * SEED — STRUCTURAL / CONFIG DATA ONLY.
 *
 * This seed contains NO real business data. It creates the hotel's structural
 * skeleton so the app runs: one property, a few room types (with clearly
 * labeled PLACEHOLDER names the owner renames), one rate plan per type, channel
 * mappings with PLACEHOLDER external ids, and an open inventory + rate calendar
 * for the next ~120 nights.
 *
 * The nightly rate below is an OBVIOUS PLACEHOLDER (MX$2,500.00) — the owner
 * sets real rates in the dashboard. We do NOT invent occupancy, revenue, guests,
 * or any market data.
 *
 * Re-runnable: it clears existing rows and rebuilds the skeleton. In dev this
 * also clears reservations — do not run against production data.
 */

// MUST be first: loads .env before db.ts reads process.env.DATABASE_URL.
import "./load-env";
import { db } from "@/lib/db";
import { Channel } from "@/generated/prisma/client";
import { addDaysUTC, toUTCMidnight } from "@/lib/dates";

// ── PLACEHOLDER configuration ────────────────────────────────────────────────
// Room types must total 15 physical rooms (Casa Cinco de Mayo has 15 rooms).
const ROOM_TYPES: Array<{ name: string; description: string; occupancy: number; rooms: number }> = [
  {
    name: "Placeholder Room Type A (rename)",
    description: "PLACEHOLDER — owner sets real name, photos, and description.",
    occupancy: 2,
    rooms: 6,
  },
  {
    name: "Placeholder Room Type B (rename)",
    description: "PLACEHOLDER — owner sets real name, photos, and description.",
    occupancy: 2,
    rooms: 5,
  },
  {
    name: "Placeholder Room Type C (rename)",
    description: "PLACEHOLDER — owner sets real name, photos, and description.",
    occupancy: 4,
    rooms: 4,
  },
];

// placeholder rate — owner sets real rates. 250000 centavos = MX$2,500.00 / night.
const PLACEHOLDER_NIGHTLY_CENTS = 250_000;

// How many nights of inventory + rates to open, starting today.
const CALENDAR_DAYS = 120;

// OTA channels we create placeholder mappings for (DIRECT needs no external ids).
const OTA_CHANNELS: Channel[] = [Channel.AIRBNB, Channel.BOOKING, Channel.EXPEDIA];

async function clearAll(): Promise<void> {
  // Delete in FK-safe order (children first).
  await db.reservation.deleteMany();
  await db.syncLog.deleteMany();
  await db.rateCalendar.deleteMany();
  await db.inventoryDay.deleteMany();
  await db.channelMapping.deleteMany();
  await db.ratePlan.deleteMany();
  await db.room.deleteMany();
  await db.roomType.deleteMany();
  await db.property.deleteMany();
}

async function main(): Promise<void> {
  console.log("Seeding structural/config data (placeholders only)…");
  await clearAll();

  const property = await db.property.create({
    data: {
      name: "Casa Cinco de Mayo",
      timezone: "America/Mexico_City",
      currency: "MXN",
    },
  });

  const today = toUTCMidnight(new Date());
  const nights = Array.from({ length: CALENDAR_DAYS }, (_, i) =>
    addDaysUTC(today, i),
  );

  let totalRooms = 0;

  for (let i = 0; i < ROOM_TYPES.length; i++) {
    const spec = ROOM_TYPES[i];
    totalRooms += spec.rooms;

    const roomType = await db.roomType.create({
      data: {
        propertyId: property.id,
        name: spec.name,
        description: spec.description,
        occupancy: spec.occupancy,
      },
    });

    // Physical rooms with placeholder labels.
    await db.room.createMany({
      data: Array.from({ length: spec.rooms }, (_, r) => ({
        roomTypeId: roomType.id,
        label: `Placeholder ${String.fromCharCode(65 + i)}-${r + 1} (rename)`,
      })),
    });

    // One rate plan per type.
    const ratePlan = await db.ratePlan.create({
      data: { roomTypeId: roomType.id, name: "Standard Rate (rename)" },
    });

    // Placeholder channel mappings (external ids assigned by the real provider).
    await db.channelMapping.createMany({
      data: OTA_CHANNELS.map((channel) => ({
        channel,
        roomTypeId: roomType.id,
        ratePlanId: ratePlan.id,
        externalRoomId: `PLACEHOLDER-${channel}-ROOM-${i + 1}`,
        externalRateId: `PLACEHOLDER-${channel}-RATE-${i + 1}`,
      })),
    });

    // Shared-pool inventory: available = number of physical rooms of this type.
    await db.inventoryDay.createMany({
      data: nights.map((date) => ({
        roomTypeId: roomType.id,
        date,
        available: spec.rooms,
      })),
    });

    // Rate calendar: placeholder nightly price, open for sale.
    await db.rateCalendar.createMany({
      data: nights.map((date) => ({
        ratePlanId: ratePlan.id,
        date,
        priceCents: PLACEHOLDER_NIGHTLY_CENTS, // placeholder rate — owner sets real rates
        minStay: null,
        closed: false,
      })),
    });

    console.log(
      `  • ${spec.name}: ${spec.rooms} rooms, ${CALENDAR_DAYS} nights opened.`,
    );
  }

  if (totalRooms !== 15) {
    throw new Error(
      `Room types must total 15 physical rooms, got ${totalRooms}. Fix ROOM_TYPES.`,
    );
  }

  console.log(
    `Done. Property "${property.name}" seeded with ${totalRooms} rooms across ` +
      `${ROOM_TYPES.length} placeholder room types.`,
  );
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (err) => {
    console.error("Seed failed:", err);
    await db.$disconnect();
    process.exit(1);
  });
