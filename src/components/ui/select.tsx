import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { fieldClasses } from "./input";

export interface SelectProps extends React.ComponentProps<"select"> {
  /** Class for the outer wrapper (positioning); `className` styles the <select>. */
  wrapperClassName?: string;
}

/**
 * Styled native <select>. Pass <option> elements as children.
 * Native = free keyboard support, mobile pickers, and form semantics.
 */
export function Select({ className, wrapperClassName, children, ...props }: SelectProps) {
  return (
    <div className={cn("relative w-full", wrapperClassName)}>
      <select
        data-slot="select"
        className={cn(fieldClasses, "h-9 appearance-none pl-3 pr-9", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
      />
    </div>
  );
}
