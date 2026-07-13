"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("block text-sm font-medium text-ink", className)}
      {...props}
    />
  );
}

export interface FieldProps {
  label: React.ReactNode;
  /** Provide to link an existing control id; otherwise one is generated. */
  htmlFor?: string;
  /** Helper text shown under the control. */
  description?: React.ReactNode;
  /** Error message — sets aria-invalid + aria-describedby on the control. */
  error?: React.ReactNode;
  /** Shows a terracotta asterisk. Set `required` on the control yourself. */
  required?: boolean;
  className?: string;
  /** A single form control (Input / Select / Textarea / native element). */
  children: React.ReactNode;
}

/**
 * Label + control + description + error, fully wired for accessibility.
 * When `children` is a single element, Field injects `id`,
 * `aria-describedby`, and `aria-invalid` automatically (explicit props
 * on the child always win).
 */
export function Field({
  label,
  htmlFor,
  description,
  error,
  required,
  className,
  children,
}: FieldProps) {
  const autoId = React.useId();

  let controlId = htmlFor ?? autoId;
  let control = children;

  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy =
    [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  if (React.isValidElement(children)) {
    const childProps = children.props as {
      id?: string;
      "aria-describedby"?: string;
      "aria-invalid"?: React.AriaAttributes["aria-invalid"];
    };
    controlId = htmlFor ?? childProps.id ?? autoId;
    control = React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      id: controlId,
      "aria-describedby": childProps["aria-describedby"] ?? describedBy,
      "aria-invalid": childProps["aria-invalid"] ?? (error ? true : undefined),
    });
  }

  return (
    <div data-slot="field" className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={controlId}>
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger">
            *
          </span>
        )}
      </Label>
      {control}
      {description && (
        <p id={descriptionId} className="text-[0.8125rem] text-ink-muted">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[0.8125rem] font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
