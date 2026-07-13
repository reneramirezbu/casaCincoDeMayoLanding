import * as React from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  /** Usually a lucide icon: `icon={<Inbox />}` — sized automatically. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Usually a Button or a link styled with buttonVariants(). */
  action?: React.ReactNode;
}

/**
 * Calm empty state for lists with nothing in them yet.
 * The serif title is deliberate — a quiet editorial moment.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-card border border-dashed border-edge-strong px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          aria-hidden
          className="mb-3 flex size-11 items-center justify-center rounded-full bg-surface-sunken text-ink-faint [&_svg]:size-5"
        >
          {icon}
        </div>
      )}
      <h3 className="font-serif text-lg text-ink">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
