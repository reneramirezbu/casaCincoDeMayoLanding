"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { overlayMotion, sheetPanelMotion, useReducedMotion } from "@/lib/motion";
import { Button } from "./button";
import { useModalOverlay, useMounted } from "./use-overlay";

export interface SheetProps {
  open: boolean;
  /** Called on Escape, scrim click, and the close button. */
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Pinned action row at the bottom. */
  footer?: React.ReactNode;
  /** Edge the sheet slides from — it exits the same way it entered. */
  side?: "left" | "right";
  /** Extra classes for the panel (e.g. "sm:max-w-lg" for a wider sheet). */
  className?: string;
}

/**
 * Side sheet / slide-over for detail views (e.g. a reservation).
 * Enters and exits along the same edge with the iOS drawer curve;
 * cross-fades under prefers-reduced-motion.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  side = "right",
  className,
}: SheetProps) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const labelId = React.useId();
  const descriptionId = React.useId();

  useModalOverlay(open && mounted, onClose, panelRef);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-scrim"
            onClick={onClose}
            {...overlayMotion(reduced)}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            aria-describedby={description ? descriptionId : undefined}
            tabIndex={-1}
            className={cn(
              "absolute inset-y-0 flex w-full max-w-md flex-col bg-surface-overlay shadow-overlay outline-none",
              side === "right" ? "right-0 border-l border-edge" : "left-0 border-r border-edge",
              className,
            )}
            {...sheetPanelMotion(side, reduced)}
          >
            <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
              <div className="flex min-w-0 flex-col gap-1">
                <h2
                  id={labelId}
                  className="text-base font-semibold leading-snug tracking-[-0.01em] text-ink"
                >
                  {title}
                </h2>
                {description && (
                  <p id={descriptionId} className="text-sm text-ink-muted">
                    {description}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 -mt-1 size-8 text-ink-faint"
              >
                <X />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="flex justify-end gap-2 border-t border-edge px-5 py-4">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
