import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

const STEPS = ["Dates & room", "Your details", "Confirmation"] as const;

export interface BookingStepsProps {
  /** 1 = search, 2 = guest details, 3 = confirmation. */
  current: 1 | 2 | 3;
  className?: string;
}

/**
 * Quiet three-step progress indicator for the booking funnel (wayfinding:
 * where am I, what's left). Server-safe.
 */
export function BookingSteps({ current, className }: BookingStepsProps) {
  return (
    <nav aria-label="Booking progress" className={className}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {STEPS.map((label, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;
          return (
            <li
              key={label}
              aria-current={active ? "step" : undefined}
              className="flex items-center gap-2 sm:gap-3"
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "h-px w-5 sm:w-8",
                    done || active ? "bg-accent/50" : "bg-edge",
                  )}
                />
              )}
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold",
                  done && "bg-accent-soft text-accent-hover",
                  active && "bg-accent text-on-accent",
                  !done && !active && "border border-edge-strong text-ink-faint",
                )}
              >
                {done ? <Check className="size-3.5" /> : step}
              </span>
              <span
                className={cn(
                  "text-[0.8125rem] font-medium",
                  active ? "text-ink" : "hidden text-ink-faint sm:inline",
                )}
              >
                {label}
                {done && <span className="sr-only"> (completed)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
