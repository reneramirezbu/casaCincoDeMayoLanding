"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { dur, ease, useReducedMotion } from "@/lib/motion";
import { useMounted } from "./use-overlay";

export type ToastVariant = "default" | "success" | "error";

export interface ToastOptions {
  description?: React.ReactNode;
  variant?: ToastVariant;
  /** ms before auto-dismiss. Pass 0 (or Infinity) to keep it open. Default 4000. */
  duration?: number;
}

interface ToastItem {
  id: number;
  title: React.ReactNode;
  description?: React.ReactNode;
  variant: ToastVariant;
  duration: number;
}

/* -- Sonner-style module store: no context, no provider, call from anywhere -- */

let nextId = 1;
let toasts: readonly ToastItem[] = [];
const EMPTY: readonly ToastItem[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
const getSnapshot = () => toasts;
const getServerSnapshot = () => EMPTY;

function dismissToast(id: number) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function createToast(title: React.ReactNode, options: ToastOptions = {}): number {
  const id = nextId++;
  toasts = [
    ...toasts,
    {
      id,
      title,
      description: options.description,
      variant: options.variant ?? "default",
      duration: options.duration ?? 4000,
    },
  ].slice(-5); // keep at most 5 on screen
  emit();
  return id;
}

/**
 * Fire a toast from anywhere (client code): `toast("Saved")`,
 * `toast.success("Reservation confirmed", { description: "…" })`,
 * `toast.error("Sync failed")`. Requires one <Toaster /> to be mounted.
 */
export const toast = Object.assign(createToast, {
  success: (title: React.ReactNode, options: Omit<ToastOptions, "variant"> = {}) =>
    createToast(title, { ...options, variant: "success" }),
  error: (title: React.ReactNode, options: Omit<ToastOptions, "variant"> = {}) =>
    createToast(title, { ...options, variant: "error" }),
  dismiss: dismissToast,
});

/* ---------------------------------- view ---------------------------------- */

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  default: <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-faint" />,
  success: <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />,
  error: <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />,
};

function ToastCard({ item }: { item: ToastItem }) {
  const reduced = useReducedMotion();
  const remaining = React.useRef(item.duration);
  const startedAt = React.useRef(0);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const start = React.useCallback(() => {
    if (remaining.current <= 0 || !Number.isFinite(remaining.current)) return;
    startedAt.current = Date.now();
    timer.current = setTimeout(() => dismissToast(item.id), remaining.current);
  }, [item.id]);

  const pause = React.useCallback(() => {
    if (!timer.current) return;
    clear();
    remaining.current = Math.max(remaining.current - (Date.now() - startedAt.current), 800);
  }, [clear]);

  React.useEffect(() => {
    if (item.duration <= 0 || !Number.isFinite(item.duration)) return;
    start();
    return clear;
  }, [item.duration, start, clear]);

  return (
    <motion.div
      layout={!reduced}
      role="status"
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 }}
      transition={{ duration: dur.slow, ease: ease.out }}
      onMouseEnter={pause}
      onMouseLeave={start}
      className="pointer-events-auto flex items-start gap-3 rounded-card border border-edge bg-surface-overlay p-4 shadow-overlay"
    >
      {variantIcon[item.variant]}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm font-medium leading-snug text-ink">{item.title}</p>
        {item.description && (
          <p className="text-[0.8125rem] leading-snug text-ink-muted">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismissToast(item.id)}
        aria-label="Dismiss notification"
        className={cn(
          "-mr-1 -mt-1 rounded-md p-1 text-ink-faint outline-none",
          "transition-[transform,color] duration-150 ease-out active:scale-[0.94]",
          "hover:text-ink focus-visible:ring-2 focus-visible:ring-ring/60",
        )}
      >
        <X aria-hidden className="size-4" />
      </button>
    </motion.div>
  );
}

/**
 * Mount ONCE (e.g. in the dashboard layout, inside the client tree).
 * Renders the toast stack bottom-right; toasts enter from and exit to
 * the bottom edge (spatial consistency), pause their timer on hover.
 */
export function Toaster() {
  const items = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const mounted = useMounted();

  if (!mounted) return null;

  return createPortal(
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22.5rem,calc(100vw-2rem))] flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
