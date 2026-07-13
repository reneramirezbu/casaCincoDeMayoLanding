"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { dialogPanelMotion, overlayMotion, useReducedMotion } from "@/lib/motion";
import { Button } from "./button";
import { useModalOverlay, useMounted } from "./use-overlay";

export type DialogSize = "sm" | "md" | "lg";

const sizeClasses: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
};

export interface DialogProps {
  open: boolean;
  /** Called on Escape, scrim click, and the close button. */
  onClose: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  /** Action row, right-aligned (usually Buttons). */
  footer?: React.ReactNode;
  size?: DialogSize;
  /** Extra classes for the panel. */
  className?: string;
}

/**
 * Centered modal dialog. Controlled: keep it rendered and toggle `open`
 * so exit animations play. Modals scale from center (they are not
 * anchored to a trigger — popovers are the origin-aware ones).
 * Under prefers-reduced-motion it cross-fades instead.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: DialogProps) {
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
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
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
              "relative flex max-h-[calc(100dvh-2rem)] w-full origin-center flex-col gap-4 rounded-card border border-edge bg-surface-overlay p-5 shadow-overlay outline-none",
              sizeClasses[size],
              className,
            )}
            {...dialogPanelMotion(reduced)}
          >
            <div className="flex items-start justify-between gap-4">
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
                className="-mr-1.5 -mt-1.5 size-8 text-ink-faint"
              >
                <X />
              </Button>
            </div>
            {children && <div className="min-h-0 overflow-y-auto">{children}</div>}
            {footer && <div className="flex justify-end gap-2 pt-1">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
