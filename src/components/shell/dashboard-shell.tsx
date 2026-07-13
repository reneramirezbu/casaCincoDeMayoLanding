"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  ClipboardList,
  Globe,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { dur, ease, overlayMotion, useReducedMotion } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { useModalOverlay } from "@/components/ui/use-overlay";

export interface DashboardNavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}

/**
 * Default nav — points only at routes that exist in this MVP. Rooms & Rates,
 * Channels, and Settings are planned but not yet built (see ACTION-ITEMS.md);
 * they are intentionally omitted so no link 404s. Override with the `navItems`
 * prop if your routes differ.
 */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { label: "Reservations", href: "/dashboard/reservations", icon: ClipboardList },
  { label: "Guest booking site", href: "/book", icon: Globe },
];

function isActive(pathname: string, href: string, rootHref: string): boolean {
  if (href === rootHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Wordmark({ href = "/dashboard" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex min-w-0 flex-col gap-0.5 rounded-field outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-4 focus-visible:ring-offset-surface"
    >
      <span className="truncate font-serif text-[1.0625rem] leading-tight tracking-wide text-ink">
        Casa Cinco de Mayo
      </span>
      <span className="text-[0.625rem] font-medium uppercase tracking-[0.18em] text-ink-faint">
        San Miguel de Allende
      </span>
    </Link>
  );
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: DashboardNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const rootHref = items[0]?.href ?? "/dashboard";
  return (
    <nav aria-label="Main navigation" className="flex-1 overflow-y-auto px-3 py-2">
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(pathname, item.href, rootHref);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium",
                  "transition-colors duration-150 ease-out",
                  "outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  active
                    ? "bg-surface-sunken text-ink"
                    : "text-ink-muted hover:bg-surface-sunken/60 hover:text-ink",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent"
                  />
                )}
                {Icon && (
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 transition-colors duration-150 ease-out",
                      active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted",
                    )}
                  />
                )}
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export interface DashboardShellProps {
  children: React.ReactNode;
  /** Override the default nav (e.g. if the surface routes differ). */
  navItems?: DashboardNavItem[];
  /** Classes for the <main> content wrapper (default: max-w-7xl + padding). */
  contentClassName?: string;
}

/**
 * Owner-facing app chrome: fixed sidebar on desktop (lg+), a slim
 * translucent top bar with a slide-in drawer on mobile. Compose pages
 * inside it — it renders no page content of its own.
 */
export function DashboardShell({
  children,
  navItems = DASHBOARD_NAV_ITEMS,
  contentClassName,
}: DashboardShellProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const drawerRef = React.useRef<HTMLDivElement>(null);
  const closeDrawer = React.useCallback(() => setDrawerOpen(false), []);

  useModalOverlay(drawerOpen, closeDrawer, drawerRef);

  // Close the drawer after any navigation.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-surface text-ink">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar flex-col border-r border-edge bg-surface lg:flex">
        <div className="px-6 pb-3 pt-6">
          <Wordmark />
        </div>
        <NavList items={navItems} pathname={pathname} />
        <div className="border-t border-edge px-6 py-4">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-ink-faint">
            Channel Manager
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-topbar items-center gap-2 border-b border-edge bg-surface/85 px-3 backdrop-blur-md lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
        >
          <Menu />
        </Button>
        <Link
          href={navItems[0]?.href ?? "/dashboard"}
          className="rounded-field font-serif text-base tracking-wide text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          Casa Cinco de Mayo
        </Link>
      </header>

      {/* Mobile drawer — enters from and exits to the left edge */}
      <AnimatePresence>
        {drawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              aria-hidden
              className="absolute inset-0 bg-scrim"
              onClick={closeDrawer}
              {...overlayMotion(reduced)}
            />
            <motion.div
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              tabIndex={-1}
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-edge bg-surface shadow-overlay outline-none"
              initial={reduced ? { opacity: 0 } : { transform: "translateX(-100%)" }}
              animate={reduced ? { opacity: 1 } : { transform: "translateX(0%)" }}
              exit={reduced ? { opacity: 0 } : { transform: "translateX(-100%)" }}
              transition={{
                duration: reduced ? 0.15 : dur.overlay,
                ease: reduced ? ease.out : ease.drawer,
              }}
            >
              <div className="flex items-start justify-between px-6 pb-3 pt-6">
                <Wordmark />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDrawer}
                  aria-label="Close navigation"
                  className="-mr-2 -mt-1.5 size-8 text-ink-faint"
                  data-autofocus
                >
                  <X />
                </Button>
              </div>
              <NavList items={navItems} pathname={pathname} onNavigate={closeDrawer} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="lg:pl-sidebar">
        <main
          className={cn(
            "mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
