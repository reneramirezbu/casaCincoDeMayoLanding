import * as React from "react";
import { cn } from "@/lib/cn";

/** Shared field chrome, reused by Input, Select, and Textarea. */
export const fieldClasses = cn(
  "w-full min-w-0 rounded-field border border-edge-strong bg-surface-raised text-sm text-ink",
  "placeholder:text-ink-faint",
  "transition-[border-color,box-shadow] duration-150 ease-out",
  "outline-none focus-visible:border-accent focus-visible:ring-[3px] focus-visible:ring-ring/25",
  "aria-invalid:border-danger aria-invalid:focus-visible:border-danger aria-invalid:focus-visible:ring-danger/25",
  "disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-55",
);

export type InputProps = React.ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(
        fieldClasses,
        "h-9 px-3",
        "file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        className,
      )}
      {...props}
    />
  );
}
