/**
 * SHARED API GLUE — response helpers, error mapping, and DTO serialization
 * used by every route under src/app/api/**.
 *
 * Route handlers stay thin: validate with zod (@/lib/validation), call a
 * service from @/lib/*, and let `handleRouteError` translate whatever the
 * service throws into the right HTTP status. No business logic lives here.
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { OversellError } from "@/lib/inventory";
import { RateUnavailableError } from "@/lib/rates";
import { isoDate } from "@/lib/dates";
import { Prisma, type Reservation } from "@/generated/prisma/client";

/** Standard error envelope for every non-2xx response. */
export interface ApiErrorBody {
  error: string;
  code?: string;
  details?: unknown;
}

export function jsonError(
  status: number,
  message: string,
  extra?: Record<string, unknown>,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, ...extra }, { status });
}

/** Wire shape for a Reservation: Prisma Dates become plain strings. */
export interface SerializedReservation {
  id: string;
  code: string;
  channel: Reservation["channel"];
  roomTypeId: string;
  ratePlanId: string;
  /** ISO calendar date (YYYY-MM-DD) — checkIn is inclusive. */
  checkIn: string;
  /** ISO calendar date (YYYY-MM-DD) — checkOut is exclusive. */
  checkOut: string;
  guestName: string;
  guestEmail: string | null;
  guestPhone: string | null;
  adults: number;
  /** Integer centavos (MXN). Format with formatMXN(cents) from @/lib/money for display. */
  totalCents: number;
  status: Reservation["status"];
  paymentStatus: Reservation["paymentStatus"];
  externalRef: string | null;
  /** Full ISO timestamp. */
  createdAt: string;
}

export function serializeReservation(r: Reservation): SerializedReservation {
  return {
    id: r.id,
    code: r.code,
    channel: r.channel,
    roomTypeId: r.roomTypeId,
    ratePlanId: r.ratePlanId,
    checkIn: isoDate(r.checkIn),
    checkOut: isoDate(r.checkOut),
    guestName: r.guestName,
    guestEmail: r.guestEmail,
    guestPhone: r.guestPhone,
    adults: r.adults,
    totalCents: r.totalCents,
    status: r.status,
    paymentStatus: r.paymentStatus,
    externalRef: r.externalRef,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Central error → HTTP status mapping for route handlers. Call from a
 * try/catch's `catch` block and return the result directly:
 *
 *   } catch (err) {
 *     return handleRouteError(err);
 *   }
 */
export function handleRouteError(err: unknown): NextResponse<ApiErrorBody> {
  if (err instanceof SyntaxError) {
    return jsonError(400, err.message || "Malformed JSON body", {
      code: "MALFORMED_JSON",
    });
  }

  if (err instanceof ZodError) {
    return jsonError(400, "Invalid request", {
      code: "VALIDATION_ERROR",
      details: err.flatten(),
    });
  }

  if (err instanceof OversellError) {
    return jsonError(409, err.message, {
      code: err.code,
      soldOutNights: err.soldOutNights,
    });
  }

  if (err instanceof RateUnavailableError) {
    return jsonError(422, err.message, {
      code: err.code,
      missingNights: err.missingNights,
      closedNights: err.closedNights,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2025 = required record not found (e.g. findUniqueOrThrow).
    if (err.code === "P2025") {
      return jsonError(404, "Not found", { code: err.code });
    }
    // P2003 = foreign key constraint failed (e.g. unknown roomTypeId/ratePlanId).
    if (err.code === "P2003") {
      return jsonError(400, "Invalid reference: check roomTypeId and ratePlanId", {
        code: err.code,
      });
    }
    console.error("[api] Prisma error", err.code, err.message);
    return jsonError(500, "Database error", { code: err.code });
  }

  console.error("[api] unhandled error", err);
  return jsonError(500, "Internal server error");
}

/** Parse a request body as JSON, throwing a recognizable error on malformed input. */
export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SyntaxError("Request body must be valid JSON");
  }
}
