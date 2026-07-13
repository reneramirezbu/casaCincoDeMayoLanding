import { defineConfig, env } from "@prisma/config";

// Prisma 7 no longer auto-loads .env for the config file. Load it ourselves via
// Node's built-in loader so env("DATABASE_URL") resolves for CLI commands.
try {
  process.loadEnvFile();
} catch {
  // .env may be absent in CI; env vars can also come from the real environment.
}

// Prisma 7 moved the Migrate/introspection connection URL out of schema.prisma
// and into this config file. The runtime PrismaClient connects via a driver
// adapter (see src/lib/db.ts) — this datasource block is only used by the CLI
// (prisma db push / migrate / studio).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
