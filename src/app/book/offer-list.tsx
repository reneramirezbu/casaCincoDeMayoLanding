"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatMXN } from "@/lib/money";
import { dur, ease, useMotionSafe } from "@/lib/motion";
import type { RoomTypeOffer } from "@/lib/types";
import { stayHref } from "./search-params";
import { plural } from "./format";

export interface OfferListProps {
  offers: RoomTypeOffer[];
  checkIn: string;
  checkOut: string;
  adults: number;
}

/** Rooms with 2 or fewer units left get a gentle scarcity note (real pool data). */
const LOW_AVAILABILITY_THRESHOLD = 2;

/**
 * The searched room-type offers, cheapest first (ordering comes from
 * searchAvailability). Client component only for the subtle staggered
 * entrance — all data arrives as serializable props.
 */
export function OfferList({ offers, checkIn, checkOut, adults }: OfferListProps) {
  const motionSafe = useMotionSafe();

  return (
    <ul className="flex flex-col gap-4">
      {offers.map((offer, i) => {
        const fits = offer.occupancy >= adults;
        // If every night is the same price, show it as a nightly rate;
        // otherwise lead with the (exact, integer-centavo) total.
        const firstNight = offer.quote.lines[0]?.priceCents ?? null;
        const nightly =
          firstNight !== null &&
          offer.quote.lines.every((l) => l.priceCents === firstNight)
            ? firstNight
            : null;
        const detailsUrl = stayHref(
          "/book/details",
          { checkIn, checkOut, adults },
          { roomTypeId: offer.roomTypeId },
        );

        return (
          <motion.li
            key={offer.roomTypeId}
            initial={motionSafe ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: dur.slow,
              ease: ease.out,
              delay: Math.min(i * 0.05, 0.25),
            }}
          >
            <Card
              className={cn(
                "transition-shadow duration-150 ease-out",
                fits ? "hover:shadow-raised" : "opacity-60",
              )}
            >
              <CardContent className="flex flex-col gap-5 sm:flex-row sm:justify-between">
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="font-serif text-xl leading-snug text-ink">
                    {offer.roomTypeName}
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-muted">
                    {offer.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
                    <span className="inline-flex items-center gap-1.5 text-[0.8125rem] text-ink-muted">
                      <Users aria-hidden className="size-3.5" />
                      Sleeps up to {offer.occupancy}
                    </span>
                    {offer.minAvailable <= LOW_AVAILABILITY_THRESHOLD && (
                      <span className="text-[0.8125rem] font-medium text-warning">
                        Only {offer.minAvailable} left for these dates
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-row items-end justify-between gap-4 border-t border-edge pt-4 sm:w-56 sm:flex-col sm:items-end sm:justify-start sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                  <div className="sm:text-right">
                    {nightly !== null ? (
                      <>
                        <p className="text-lg font-semibold tracking-[-0.01em] text-ink">
                          {formatMXN(nightly)}
                          <span className="text-[0.8125rem] font-normal text-ink-muted">
                            {" "}
                            / night
                          </span>
                        </p>
                        <p className="text-[0.8125rem] text-ink-muted">
                          {formatMXN(offer.quote.totalCents)} total ·{" "}
                          {plural(offer.quote.nights, "night")}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-semibold tracking-[-0.01em] text-ink">
                          {formatMXN(offer.quote.totalCents)}
                        </p>
                        <p className="text-[0.8125rem] text-ink-muted">
                          total for {plural(offer.quote.nights, "night")} · rate
                          varies by night
                        </p>
                      </>
                    )}
                  </div>
                  {fits ? (
                    <Link
                      href={detailsUrl}
                      className={buttonVariants({
                        className: "sm:mt-auto sm:w-full",
                      })}
                    >
                      Select
                      <ArrowRight aria-hidden />
                    </Link>
                  ) : (
                    <p className="max-w-40 text-[0.8125rem] text-ink-faint sm:mt-auto sm:text-right">
                      Too small for {plural(adults, "guest")} — reduce guests to
                      book this room.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.li>
        );
      })}
    </ul>
  );
}
