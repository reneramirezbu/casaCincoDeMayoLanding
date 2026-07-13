"use client";

/**
 * Shared motion tokens for Casa Cinco de Mayo.
 *
 * These mirror the CSS custom properties appended to globals.css
 * (--ease-out, --ease-in-out, --ease-drawer, --dur-*) so framer-motion
 * and CSS transitions stay in perfect sync.
 *
 * House rules (Apple / Emil Kowalski):
 * - Animate transform + opacity only.
 * - Enters use `ease.out`; on-screen movement uses `ease.inOut`;
 *   sheets/drawers use `ease.drawer`.
 * - UI durations stay under 300ms (`dur.*` are in SECONDS for framer-motion).
 * - Springs default to zero bounce; add bounce only after a momentum gesture.
 * - Always honor reduced motion: `useMotionSafe()` / `useReducedMotion()`.
 */

import { useReducedMotion } from "framer-motion";
import type { Transition, TargetAndTransition } from "framer-motion";

export type CubicBezier = [number, number, number, number];

/** Strong easing curves — matches the CSS vars in globals.css. */
export const ease = {
  /** Enters, presses, most UI transitions. CSS: var(--ease-out) */
  out: [0.23, 1, 0.32, 1] as CubicBezier,
  /** On-screen movement / morphs. CSS: var(--ease-in-out) */
  inOut: [0.77, 0, 0.175, 1] as CubicBezier,
  /** iOS-style drawer/sheet curve. CSS: var(--ease-drawer) */
  drawer: [0.32, 0.72, 0, 1] as CubicBezier,
};

/** Durations in seconds (framer-motion units). CSS twins: var(--dur-*). */
export const dur = {
  fast: 0.12,
  base: 0.18,
  slow: 0.24,
  overlay: 0.26,
} as const;

/** Spring presets. Default is critically damped — no overshoot. */
export const spring = {
  /** General-purpose UI spring (Apple "move" feel). */
  default: { type: "spring", duration: 0.4, bounce: 0 } satisfies Transition,
  /** Snappier variant for small elements. */
  snappy: { type: "spring", duration: 0.3, bounce: 0 } satisfies Transition,
  /** Only for momentum gestures (flick / drag release). */
  flick: { type: "spring", duration: 0.4, bounce: 0.2 } satisfies Transition,
};

export { useReducedMotion };

/** True when it is OK to move things (user has NOT requested reduced motion). */
export function useMotionSafe(): boolean {
  return !useReducedMotion();
}

interface MotionPreset {
  initial: TargetAndTransition;
  animate: TargetAndTransition;
  exit: TargetAndTransition;
  transition: Transition;
}

/** Scrim / backdrop fade. Pass the result of `useReducedMotion()`. */
export function overlayMotion(reduced: boolean | null): MotionPreset {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduced ? 0.15 : dur.base, ease: ease.out },
  };
}

/**
 * Centered modal panel: scale 0.97 → 1 + fade (never scale(0)),
 * transform-origin stays center (modals are not anchored to a trigger).
 * Falls back to a plain cross-fade under reduced motion.
 */
export function dialogPanelMotion(reduced: boolean | null): MotionPreset {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15, ease: ease.out },
    };
  }
  return {
    initial: { opacity: 0, scale: 0.97, y: 8 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 4 },
    transition: { duration: dur.overlay, ease: ease.out },
  };
}

/**
 * Side sheet / drawer panel. Enter and exit along the SAME path
 * (spatial consistency). Uses hardware-accelerated transform strings.
 */
export function sheetPanelMotion(
  side: "left" | "right",
  reduced: boolean | null,
): MotionPreset {
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.15, ease: ease.out },
    };
  }
  const hidden = side === "right" ? "translateX(100%)" : "translateX(-100%)";
  return {
    initial: { transform: hidden },
    animate: { transform: "translateX(0%)" },
    exit: { transform: hidden },
    transition: { duration: dur.overlay, ease: ease.drawer },
  };
}
