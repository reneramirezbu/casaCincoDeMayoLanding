/**
 * POST /api/webhooks/channel/[channel] — inbound OTA booking webhook.
 *
 * [channel] must be one of AIRBNB | BOOKING | EXPEDIA (DIRECT bookings come
 * from POST /api/reservations, never a webhook). The body is the provider's
 * booking payload; @/lib/sync#ingestChannelBooking normalizes it (via the
 * channel's adapter), resolves the external room to our (roomTypeId,
 * ratePlanId) through ChannelMapping, and atomically decrements the SAME
 * shared inventory pool every other channel sells from — then fans the
 * reduced availability out to the remaining channels.
 *
 * Response 200: { ok: true, ignored: true }                       — not a booking event (e.g. a ping); no-op.
 * Response 200: { ok: true, reservation: SerializedReservation }  — booking ingested (or a duplicate we already have — idempotent on externalRef).
 * Response 400: bad [channel] segment, malformed JSON, or payload failed schema validation.
 * Response 409: sold out — { error, code: "OVERSELL", soldOutNights }.
 * Response 422: externalRoomId has no ChannelMapping for this channel.
 */

import { NextResponse } from "next/server";
import { ingestChannelBooking } from "@/lib/sync";
import { Channel } from "@/lib/types";
import { webhookChannelParamSchema } from "@/lib/validation";
import {
  handleRouteError,
  jsonError,
  parseJsonBody,
  serializeReservation,
  type ApiErrorBody,
  type SerializedReservation,
} from "@/app/api/_lib/http";

export const dynamic = "force-dynamic";

type WebhookResponse =
  | { ok: true; ignored: true }
  | { ok: true; reservation: SerializedReservation };

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/webhooks/channel/[channel]">,
): Promise<NextResponse<WebhookResponse | ApiErrorBody>> {
  try {
    const { channel: rawChannel } = await ctx.params;
    const parsedChannel = webhookChannelParamSchema.safeParse(rawChannel);
    if (!parsedChannel.success) {
      return jsonError(
        400,
        `Unknown channel "${rawChannel}". Expected one of: AIRBNB, BOOKING, EXPEDIA.`,
        { code: "VALIDATION_ERROR" },
      );
    }
    const channel = Channel[parsedChannel.data];

    const payload = await parseJsonBody(request);
    const reservation = await ingestChannelBooking(channel, payload);

    if (!reservation) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    return NextResponse.json({
      ok: true,
      reservation: serializeReservation(reservation),
    });
  } catch (err) {
    // ingestChannelBooking throws a plain Error (no typed code) when the
    // webhook references an externalRoomId with no ChannelMapping row — a
    // data/configuration problem on our side, not a client validation error
    // and not a 500-worthy server bug. Surface it as 422 specifically here.
    if (err instanceof Error && err.message.includes("No ChannelMapping for")) {
      return jsonError(422, err.message, { code: "UNMAPPED_ROOM" });
    }
    return handleRouteError(err);
  }
}
