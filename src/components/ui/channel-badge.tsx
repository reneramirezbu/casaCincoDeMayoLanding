import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Booking channels. Accepts lowercase, SCREAMING_CASE, and common
 * variants ("BOOKING_COM", "Booking.com", "website"). Unknown values
 * fall back to a neutral badge with the raw label — never crashes.
 *
 * Squared corners (rounded-md) distinguish channels ("where it came
 * from") from StatusPill's fully-rounded shape ("what state it's in").
 */
export type Channel = "airbnb" | "booking" | "expedia" | "direct";

export const CHANNEL_LABELS: Record<Channel, string> = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  expedia: "Expedia",
  direct: "Direct",
};

const channelClasses: Record<Channel, string> = {
  airbnb: "bg-channel-airbnb-soft text-channel-airbnb",
  booking: "bg-channel-booking-soft text-channel-booking",
  expedia: "bg-channel-expedia-soft text-channel-expedia",
  direct: "bg-channel-direct-soft text-channel-direct",
};

export function normalizeChannel(value: string): Channel | null {
  const key = value.trim().toLowerCase();
  if (key.includes("airbnb")) return "airbnb";
  if (key.includes("booking")) return "booking";
  if (key.includes("expedia")) return "expedia";
  if (key.includes("direct") || key.includes("website") || key.includes("web")) {
    return "direct";
  }
  return null;
}

export interface ChannelBadgeProps extends React.ComponentProps<"span"> {
  /** e.g. "airbnb" or "AIRBNB" or "BOOKING_COM" (Prisma enums work as-is). */
  channel: Channel | Uppercase<Channel> | (string & {});
  /** Override the default label. */
  label?: string;
  /** Hide the leading dot (e.g. in dense tables). */
  showDot?: boolean;
}

export function ChannelBadge({
  channel,
  label,
  showDot = true,
  className,
  ...props
}: ChannelBadgeProps) {
  const normalized = normalizeChannel(channel);
  const text = label ?? (normalized ? CHANNEL_LABELS[normalized] : channel);

  return (
    <span
      data-slot="channel-badge"
      data-channel={normalized ?? channel}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium",
        normalized ? channelClasses[normalized] : "bg-surface-sunken text-ink-muted",
        className,
      )}
      {...props}
    >
      {showDot && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-current" />}
      {text}
    </span>
  );
}
