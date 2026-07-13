/**
 * GET /api/health — smoke test. No DB access, so this can be statically
 * cached; there is nothing dynamic to opt out of.
 *
 * Response: 200 { ok: true }
 */

import { NextResponse } from "next/server";

export async function GET(): Promise<NextResponse<{ ok: true }>> {
  return NextResponse.json({ ok: true });
}
