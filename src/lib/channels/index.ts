/**
 * CHANNEL REGISTRY.
 *
 * Chooses which ChannelAdapter implementation the app uses, based on the
 * CHANNEL_ADAPTER env var (default "mock"). Today only the mock exists; when a
 * real provider is contracted, add a case here that constructs the Channex /
 * NextPax adapter — nothing else in the app changes. See ACTION-ITEMS.md.
 */

import { Channel } from "@/generated/prisma/client";
import type { ChannelAdapter } from "@/lib/channels/types";
import { MockChannelAdapter } from "@/lib/channels/mock";

export type { ChannelAdapter } from "@/lib/channels/types";
export type {
  AvailabilityUpdate,
  RateUpdate,
  RoomMapping,
} from "@/lib/channels/types";
export { MockChannelAdapter, logSync } from "@/lib/channels/mock";

/** Every channel that sells from the shared pool (including our direct site). */
export const ALL_CHANNELS: Channel[] = [
  Channel.DIRECT,
  Channel.AIRBNB,
  Channel.BOOKING,
  Channel.EXPEDIA,
];

/** External OTA channels (everything except our own direct website). */
export const OTA_CHANNELS: Channel[] = [
  Channel.AIRBNB,
  Channel.BOOKING,
  Channel.EXPEDIA,
];

type AdapterKind = "mock"; // future: "channex" | "nextpax"

function selectedAdapterKind(): AdapterKind {
  const raw = (process.env.CHANNEL_ADAPTER ?? "mock").toLowerCase();
  if (raw === "mock") return "mock";
  // Unknown/unconfigured providers fall back to the mock so the app still runs.
  console.warn(
    `[channels] CHANNEL_ADAPTER="${raw}" is not implemented yet; using mock. See ACTION-ITEMS.md.`,
  );
  return "mock";
}

function buildAdapter(channel: Channel): ChannelAdapter {
  switch (selectedAdapterKind()) {
    case "mock":
    default:
      return new MockChannelAdapter(channel);
  }
}

/** Get the adapter for a single channel. */
export function getAdapter(channel: Channel): ChannelAdapter {
  return buildAdapter(channel);
}

/** Get adapters for every channel (used to fan out availability pushes). */
export function getAllAdapters(): ChannelAdapter[] {
  return ALL_CHANNELS.map(buildAdapter);
}

/** Get adapters for the OTA channels only (excludes DIRECT). */
export function getOtaAdapters(): ChannelAdapter[] {
  return OTA_CHANNELS.map(buildAdapter);
}
