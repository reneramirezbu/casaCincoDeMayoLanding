# RUNBOOK — Casa Cinco de Mayo Channel Manager

An in-house MVP channel manager for a 15-room boutique hotel in San Miguel de Allende.
It sells one shared inventory pool across Airbnb, Booking.com, Expedia, and a direct
booking site so a room can never double-book.

Stack: **Next.js 16.2.3** (App Router, Turbopack) · **React 19** · **TypeScript strict** ·
**Tailwind CSS v4** (CSS-first, no `tailwind.config.js`) · **Prisma 7.8** with a
**SQLite** dev DB via a custom `node:sqlite` driver adapter.

---

## Run it locally

```bash
# 1. Generate the Prisma 7 client (outputs to src/generated/prisma)
npx prisma generate

# 2. Create + migrate the SQLite schema (creates ./dev.db)
npm run db:push

# 3. Seed structural/config data (property, 3 PLACEHOLDER room types = 15 rooms,
#    rate plans, channel mappings, 120 nights of open inventory + placeholder rates)
npm run seed

# 4. Start the dev server
npm run dev
```

Then visit:

- **`/`** — the public marketing landing page (static; unchanged from the original site).
- **`/book`** — the guest direct-booking site (search dates → pick a room → guest details →
  confirmation). Bookings are `DIRECT` + `PAY_AT_PROPERTY`.
- **`/dashboard`** — the owner app (dashboard, calendar, reservations). **Currently
  unauthenticated — see ACTION-ITEMS.md (d) before exposing it.**

To reset the dev DB at any time: `npm run db:push` then `npm run seed`.

### Other scripts
- `npm run build` — production build (must exit 0 before shipping).
- `npm run lint` — ESLint (generated Prisma client is ignored).
- `npm run typecheck` — `tsc --noEmit`.
- `npm run db:studio` — browse the DB in Prisma Studio.

### Health check
`GET /api/health` → `{ ok: true }` (no DB access).

---

## Architecture (the ~10-line version)

1. **Shared inventory pool = anti-oversell.** There is exactly **one** `InventoryDay` row
   per `(roomTypeId, date)`. Every channel — direct, Airbnb, Booking, Expedia — decrements
   that same row. A room cannot be sold twice because there is only one pool to sell from.
2. **Atomic holds.** `holdInventory` (in `src/lib/inventory.ts`) runs inside an interactive
   transaction; the SQLite adapter opens each with `BEGIN IMMEDIATE` (write lock) and serializes
   overlapping transactions. Each night is decremented with a conditional `updateMany`
   (`available > 0`), so the pool can never go negative; any sold-out night throws
   `OversellError` and rolls back **all** nights (no partial bookings).
3. **Aggregator-adapter pattern.** All OTA I/O goes through the `ChannelAdapter` interface
   (`src/lib/channels/types.ts`). Today the only implementation is `MockChannelAdapter`
   (`src/lib/channels/mock.ts`) — it logs to `SyncLog` + console and **never invents
   reservations**. `src/lib/channels/index.ts` picks the adapter from `CHANNEL_ADAPTER`.
4. **Cross-channel fan-out.** After any booking, `onReservationCreated` (`src/lib/sync.ts`)
   pushes the reduced availability to the *other* channels. Inbound OTA bookings arrive at
   `POST /api/webhooks/channel/[channel]`, which calls `ingestChannelBooking` (idempotent on
   `externalRef`), decrements the shared pool, and fans out to the remaining channels.
5. **Money is integer centavos (MXN)** everywhere; format for display with `formatMXN`
   (`src/lib/money.ts`). Dates are UTC-midnight; a stay occupies nights `[checkIn, checkOut)`
   (checkout is exclusive). DB reads happen only in Server Components / route handlers
   (Prisma is server-only); pages that read at request time set `export const dynamic = 'force-dynamic'`.

Layers: `src/lib/*` (data + domain core) → `src/app/api/*` (thin route handlers) →
`src/app/book/*` + `src/app/dashboard/*` (surfaces) → `src/components/*` (design-system UI kit).

---

## Plugging in a real aggregator (Channex / NextPax)

The mock exists so the whole system runs end-to-end today. To go live against real OTAs:

1. **Implement the interface.** Create `src/lib/channels/channex.ts` (or `nextpax.ts`)
   exporting a class that satisfies `ChannelAdapter` from `src/lib/channels/types.ts`
   (`pushAvailability`, `pushRates`, `handleWebhook`, `mapRoom`, `resolveExternalRoom`).
   Talk to the aggregator's REST API using its key.
2. **Register it.** In `src/lib/channels/index.ts`, add a `case "channex"` (or `"nextpax"`)
   in `getAdapter` that returns your new adapter instead of the mock.
3. **Flip the env var.** Set `CHANNEL_ADAPTER="channex"` (or `"nextpax"`) and provide
   `CHANNEX_API_KEY` / `NEXTPAX_API_KEY` in `.env`. Unknown values warn and fall back to mock.
4. **Bind real listings.** Replace the seeded `PLACEHOLDER-<CHANNEL>-ROOM-<n>` external ids
   in the `ChannelMapping` rows with the aggregator's real room/rate ids (see ACTION-ITEMS.md
   (a) and (b)).

No other application code changes — every surface and API route calls the domain layer, which
calls the adapter abstractly. Swapping the adapter swaps the whole OTA integration.

> Full go-live checklist (auth, Postgres, payments, CFDI e-invoicing, real rates) lives in
> **`ACTION-ITEMS.md`** at the repo root. Connectivity research: `.wayfinder/research/ota-connectivity-feasibility.md`.
