/**
 * PrismaClient singleton.
 *
 * Prisma 7 requires a driver adapter at runtime (the connection URL no longer
 * lives in schema.prisma). We use a dependency-free `node:sqlite` adapter for
 * the local MVP — see src/lib/prisma-sqlite-adapter.ts. To move to Postgres in
 * production, swap `PrismaNodeSqlite` for `@prisma/adapter-pg` here; nothing
 * else in the app changes.
 *
 * The generated client lives at src/generated/prisma (see prisma/schema.prisma
 * `generator.output`), not @prisma/client.
 *
 * SERVER-ONLY: this module opens a database connection. Never import it from a
 * "use client" component. Read data in Server Components / route handlers and
 * pass plain data down as props.
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNodeSqlite } from "@/lib/prisma-sqlite-adapter";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./dev.db";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaNodeSqlite(DATABASE_URL);
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
