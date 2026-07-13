/**
 * PrismaClient singleton — Postgres (Neon / Vercel Postgres) via @prisma/adapter-pg.
 *
 * Prisma 7 requires a driver adapter at runtime (the connection URL no longer
 * lives in schema.prisma). We use the node-postgres adapter, which runs on
 * Vercel's serverless Node runtime.
 *
 * DATABASE_URL should point at a **pooled** connection string — Neon and Vercel
 * Postgres both expose one — so short-lived serverless invocations don't exhaust
 * the database's connection limit. (Neon's integration also sets an
 * unpooled URL, e.g. DATABASE_URL_UNPOOLED, for migrations.)
 *
 * The anti-oversell guarantee (src/lib/inventory.ts) holds on Postgres via the
 * row lock the conditional `UPDATE ... WHERE available > 0` acquires — no
 * database-specific transaction mode is required.
 *
 * SERVER-ONLY: this module opens a database connection. Never import it from a
 * "use client" component. Read data in Server Components / route handlers and
 * pass plain data down as props.
 *
 * The generated client lives at src/generated/prisma (see prisma/schema.prisma
 * `generator.output`), not @prisma/client.
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Fail loudly with a fixable message rather than a cryptic driver error on the
  // first query. On Vercel this is injected by the Postgres/Neon integration.
  throw new Error(
    "DATABASE_URL is not set. Point it at a Postgres connection string " +
      "(Neon / Vercel Postgres — use the pooled URL). See ACTION-ITEMS.md.",
  );
}

function createPrismaClient(): PrismaClient {
  // PrismaPg manages its own pg connection pool internally.
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Reuse a single client across HMR reloads in dev to avoid exhausting
// connections (Next.js re-evaluates modules on every change).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
