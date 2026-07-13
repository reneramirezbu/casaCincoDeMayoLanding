import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Loading placeholder. Size it with classes:
 * `<Skeleton className="h-4 w-32" />`, `<Skeleton className="size-9 rounded-full" />`.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-edge/60", className)}
      {...props}
    />
  );
}
