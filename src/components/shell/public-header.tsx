import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { buttonVariants } from "@/components/ui/button";

export interface PublicNavLink {
  label: string;
  href: string;
}

export interface PublicHeaderProps {
  /** Text links, hidden below md (keep the booking flow slim on mobile). */
  nav?: PublicNavLink[];
  /** Primary call-to-action, e.g. { label: "Book now", href: "/book" }. */
  cta?: PublicNavLink;
  className?: string;
}

/**
 * Slim translucent header for the guest-facing booking site.
 * Server-safe (no hooks) — usable directly in Server Components.
 */
export function PublicHeader({ nav = [], cta, className }: PublicHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-edge/80 bg-surface/80 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-topbar w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 items-baseline gap-2.5 rounded-field outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
        >
          <span className="truncate font-serif text-lg tracking-wide text-ink">
            Casa Cinco de Mayo
          </span>
          <span className="hidden text-[0.625rem] font-medium uppercase tracking-[0.18em] text-ink-faint sm:inline">
            San Miguel de Allende
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {nav.length > 0 && (
            <nav aria-label="Site" className="hidden items-center gap-1 md:flex">
              {nav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-field px-3 py-2 text-sm font-medium text-ink-muted",
                    "transition-colors duration-150 ease-out hover:bg-surface-sunken hover:text-ink",
                    "outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
          {cta && (
            <Link href={cta.href} className={buttonVariants({ size: "sm", className: "ml-1" })}>
              {cta.label}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
