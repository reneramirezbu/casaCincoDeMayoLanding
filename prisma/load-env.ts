/**
 * Load .env BEFORE any module that reads process.env (e.g. src/lib/db.ts) is
 * evaluated. ES modules evaluate imports in source order, depth-first, so a
 * script run directly via `tsx` (which does not auto-load .env) must import
 * THIS module first — before importing anything that touches process.env.
 *
 * Next.js and the Prisma CLI (via prisma.config.ts) load .env themselves; this
 * is only needed for standalone tsx scripts like prisma/seed.ts.
 */
try {
  process.loadEnvFile();
} catch {
  // .env may be absent (e.g. CI with real environment variables) — that's fine.
}

export {};
