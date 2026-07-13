# ACTION-ITEMS — Casa Cinco de Mayo Channel Manager

Everything below is a **PLACEHOLDER the owner must action before this goes live.** The
MVP builds, runs, and prevents double-booking against a **local SQLite DB** using a
**MockChannelAdapter** (it logs to `SyncLog` and console; it does **not** talk to any
real OTA). Nothing here fabricates business data — all seeded rooms/rates are obvious
placeholders (see `prisma/seed.ts`).

Priorities: **P0** = blocks any real guest/OTA use · **P1** = required for a lawful,
secure production launch · **P2** = replace placeholder business content.

Reference for OTA connectivity decisions: `.wayfinder/research/ota-connectivity-feasibility.md`.

---

## (a) Connectivity aggregator — P0 — *the thing that actually makes OTAs work*

**What:** Contract a connectivity-aggregator (channel-manager API) and replace the
`MockChannelAdapter` with a real adapter implementing the same `ChannelAdapter` interface.

**Why:** Direct certification with Airbnb / Booking.com / Expedia is effectively closed
to a single 15-room property (Airbnb partner applications are reportedly paused; each OTA
certifies *software vendors*, not one hotel). The realistic "own-it" path is to build on an
aggregator that already holds certified OTA connections. See the feasibility brief, Path (b).
Until this is done, **no availability/rates are pushed to and no reservations are pulled from
real OTAs** — the app only simulates it.

**Where in code:**
- Interface to implement: `src/lib/channels/types.ts` (`ChannelAdapter`).
- Current placeholder: `src/lib/channels/mock.ts` (`MockChannelAdapter`).
- Registry that selects the adapter from env: `src/lib/channels/index.ts` (`getAdapter`,
  reads `process.env.CHANNEL_ADAPTER`, defaults to `mock`, warns + falls back for unknown values).
- Add e.g. `src/lib/channels/channex.ts` (or `nextpax.ts`) exporting a class that satisfies
  `ChannelAdapter`, then register it in `index.ts` under the `"channex"` / `"nextpax"` case.

**Env vars:** `CHANNEL_ADAPTER` (`mock` → `channex` | `nextpax`), plus `CHANNEX_API_KEY`
or `NEXTPAX_API_KEY`.

**Candidates (from research):** Channex, NextPax, Rentals United (~US$130–250/mo range).

---

## (b) Real OTA listings — P0 — *prerequisites the aggregator cannot do for you*

**What:** Stand up and verify the property's listings on each channel so the aggregator can bind to them.

- **Airbnb:** listing fully **Verified** and set to **Listed**; property categorized as an
  eligible type (boutique hotel / hotel / aparthotel, etc.). Only **one** Airbnb account may
  connect per PMS account.
- **Booking.com:** access the **Extranet**, then select your Connectivity Partner (the aggregator).
- **Expedia:** onboard via **Expedia Partner Central (EPC)** / EQC.

**Why:** The aggregator maps *its* certified connection onto *your* real listings. Without
verified, live listings there is nothing to map to.

**Where in code:** Once mapped, each channel's external room/rate ids replace the seeded
placeholders `PLACEHOLDER-<CHANNEL>-ROOM-<n>` in the `ChannelMapping` rows (created by
`prisma/seed.ts`). The webhook route `src/app/api/webhooks/channel/[channel]/route.ts`
resolves inbound bookings by `externalRoomId` against those mappings.

**Env vars:** none directly (handled through the aggregator account + `ChannelMapping` data).

---

## (c) Database — Postgres wired ✅ — *provision a Neon/Vercel Postgres + set DATABASE_URL*

**Status: DONE in code.** The app now runs on **Postgres** via `@prisma/adapter-pg`
(schema `provider = "postgresql"`; adapter in `src/lib/db.ts`). The local-SQLite driver has
been removed. Verified end-to-end against a real Postgres (build + direct booking + inbound
OTA webhook decrementing the shared pool + oversell → 409). The anti-oversell guarantee holds
via the row lock the conditional `UPDATE ... WHERE available > 0` acquires.

**Your remaining action — required for the deploy to actually run:**
- **On Vercel:** Project → **Storage → Create Database → Postgres (Neon)**. Vercel injects
  `DATABASE_URL` automatically — use the **pooled** URL for serverless. Then redeploy.
- **One-time schema + seed** against the new DB (from your machine, with the Neon URL in
  `.env`): `npm run db:push && npm run seed`.
- **Local dev:** create a free Neon project and put its pooled URL in `.env` as `DATABASE_URL`
  (there is no more zero-config SQLite file).

**Env var:** `DATABASE_URL` — a **pooled** Postgres connection string. See `.env.example`.

---

## (d) Auth — P1 — *dashboard is currently UNAUTHENTICATED*

**What:** Add Clerk (or equivalent) and gate every `/dashboard/**` route and the write APIs.

**Why:** Right now **anyone who reaches `/dashboard` can view reservations and cancel bookings**,
and `POST /api/reservations` is open. This is unacceptable for production.

**Where in code:**
- Add Clerk middleware (e.g. `src/middleware.ts`) protecting `/dashboard/**` and mutating
  API routes (`POST /api/reservations`; the OTA webhook should instead use a shared-secret
  signature, not user auth).
- `src/app/dashboard/layout.tsx` is the natural place to require a signed-in owner.
- Clerk is **not yet installed** — add `@clerk/nextjs` when npm install is permitted.

**Env vars:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

---

## (e) Payments — P1 — *currently pay-at-property only*

**What:** Wire a real processor (Stripe MX or Mercado Pago) into the booking flow.

**Why:** Direct bookings are created `PAY_AT_PROPERTY` with an honest placeholder note
("Payment on arrival — online payments coming soon"). There is **no** card capture. To take
deposits/prepayment online this must be built.

**Where in code:**
- Placeholder UI + comment: `src/app/book/payment-note.tsx` (`TODO(ACTION-ITEMS)`).
- Booking server action: `src/app/book/actions.ts` (`createDirectBooking`) — insert the
  charge/authorization step before `createDirectReservation`, and set `paymentStatus`
  accordingly (`UNPAID` → `PAID`). Money is **integer centavos (MXN)** end-to-end; keep it so.
- `PaymentStatus` enum lives in `prisma/schema.prisma` / `src/lib/types.ts`.

**Env vars:** `PAYMENTS_PROVIDER` (`none` → `stripe` | `mercadopago`), plus
`STRIPE_SECRET_KEY` or `MERCADOPAGO_ACCESS_TOKEN`.

---

## (f) CFDI 4.0 e-invoicing — P1 — *Mexican legal requirement*

**What:** Integrate a **PAC** (Proveedor Autorizado de Certificación) to issue CFDI 4.0
electronic invoices for guest stays.

**Why:** Issuing a valid CFDI on request is a legal obligation for a hotel operating in
Mexico. The MVP does **not** generate invoices. (Off-the-shelf PMSs like Cloudbeds bundle
this; building in-house means contracting a PAC directly.)

**Where in code:** Not yet built. Add e.g. `src/lib/invoicing/` with a PAC adapter, invoked
after a stay is confirmed/paid. Store RFC / tax fields on the guest/reservation. This is a
**new module**, not a placeholder swap.

**Env vars (to define):** e.g. `PAC_PROVIDER`, `PAC_API_KEY`, `HOTEL_RFC`,
`HOTEL_FISCAL_NAME`, `HOTEL_FISCAL_ADDRESS` (names are your choice — none exist yet).

---

## (g) Real room types + real rates — P2 — *replace seeded placeholders*

**What:** Replace the obviously-fake seed data with the hotel's real room types, descriptions,
photos, occupancy, and nightly rates.

**Why:** `prisma/seed.ts` creates **"Placeholder Room Type A/B/C (rename)"** (6/5/4 = 15 rooms)
at an obvious placeholder rate of **MX$2,500.00/night** (`priceCents = 250000`, commented as a
placeholder). These must **not** be shown to real guests as-is. Never invent real rates —
the owner supplies them.

**Where in code:**
- `prisma/seed.ts` — room types, room counts, rate plans, and the `priceCents` placeholder rate.
- Real rates go into the `RateCalendar` rows per `RatePlan`/date (see the DATA manifest); a
  Rooms & Rates admin screen is a planned but **unbuilt** dashboard route (see below).

**Env var:** none (`DEFAULT_CURRENCY="MXN"` already set).

---

## (h) Env var checklist — one line each

All defined in `.env` (git-ignored) with the template in `.env.example`.

| Env var | Item | What it unlocks | Current |
|---|---|---|---|
| `DATABASE_URL` | (c) | DB connection (SQLite now → Neon Postgres) | `file:./dev.db` |
| `CHANNEL_ADAPTER` | (a) | Which channel adapter to load | `mock` |
| `CHANNEX_API_KEY` | (a) | Channex aggregator auth | *empty* |
| `NEXTPAX_API_KEY` | (a) | NextPax aggregator auth | *empty* |
| `PAYMENTS_PROVIDER` | (e) | Which payment processor to use | `none` |
| `STRIPE_SECRET_KEY` | (e) | Stripe MX auth | *empty* |
| `MERCADOPAGO_ACCESS_TOKEN` | (e) | Mercado Pago auth | *empty* |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | (d) | Clerk client key (dashboard auth) | *empty* |
| `CLERK_SECRET_KEY` | (d) | Clerk server key | *empty* |
| `NEXT_PUBLIC_APP_URL` | app | Absolute URLs / redirects | `http://localhost:3000` |
| `DEFAULT_CURRENCY` | app | Display currency | `MXN` |
| `PAC_*` / `HOTEL_*` (to define) | (f) | CFDI 4.0 e-invoicing | *not yet defined* |

---

## Planned-but-unbuilt dashboard routes (context)

The owner nav intentionally links only to routes that exist: **Dashboard**, **Calendar**,
**Reservations**, and the **Guest booking site** (`/book`). Three routes referenced in
early design (`/dashboard/rooms`, `/dashboard/channels`, `/dashboard/settings`) are **not
built** and were removed from the nav so nothing 404s. They are natural homes for (g) real
rates management, (a)/(b) channel connection status, and (c)–(f) settings respectively.
