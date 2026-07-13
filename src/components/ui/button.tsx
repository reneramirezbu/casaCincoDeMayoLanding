import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const base = cn(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-field font-medium",
  // Animate only compositor-friendly + color properties, never `all`.
  "transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out",
  // Instant press feedback (Emil: every pressable scales down on :active).
  // Plain `active:` (not `enabled:active:`) so links styled via
  // buttonVariants() get it too; disabled buttons never receive :active.
  "active:scale-[0.97]",
  "outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
  "disabled:cursor-not-allowed disabled:opacity-55",
  // Sensible default icon sizing unless the caller sets one explicitly.
  '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
);

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-card hover:bg-accent-hover",
  secondary:
    "border border-edge-strong bg-surface-raised text-ink shadow-card hover:bg-surface-sunken",
  ghost: "text-ink-muted hover:bg-surface-sunken hover:text-ink",
  destructive: "bg-danger text-on-accent shadow-card hover:bg-danger-hover",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 px-3 text-[0.8125rem]",
  md: "h-9 px-4 text-sm",
  lg: "h-10 px-5 text-sm",
  icon: "size-9",
};

export interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Button classes without the element — use to style an <a> / next/link
 * as a button: `<Link className={buttonVariants({ size: "sm" })} …>`.
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: ButtonStyleProps = {}): string {
  return cn(base, variantClasses[variant], sizeClasses[size], className);
}

export interface ButtonProps
  extends React.ComponentProps<"button">,
    Omit<ButtonStyleProps, "className"> {
  /** Shows a spinner, sets aria-busy, and disables the button. */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      data-slot="button"
      className={buttonVariants({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {children}
    </button>
  );
}
