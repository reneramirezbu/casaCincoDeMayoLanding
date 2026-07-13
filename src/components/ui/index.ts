/**
 * Casa Cinco de Mayo UI kit — barrel.
 * `import { Button, Card, StatusPill } from "@/components/ui";`
 *
 * Server-safe (no hooks): Button, Card*, Badge, StatusPill, ChannelBadge,
 * Input, Select, Textarea, Skeleton, EmptyState.
 * Client-only ("use client"): Field/Label, Dialog, Sheet, Toaster/toast.
 */
export { Button, buttonVariants } from "./button";
export type { ButtonProps, ButtonStyleProps, ButtonVariant, ButtonSize } from "./button";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";

export { Badge } from "./badge";
export type { BadgeProps, BadgeVariant } from "./badge";

export { StatusPill, RESERVATION_STATUS_LABELS } from "./status-pill";
export type { StatusPillProps, ReservationStatus } from "./status-pill";

export { ChannelBadge, CHANNEL_LABELS, normalizeChannel } from "./channel-badge";
export type { ChannelBadgeProps, Channel } from "./channel-badge";

export { Input, fieldClasses } from "./input";
export type { InputProps } from "./input";

export { Select } from "./select";
export type { SelectProps } from "./select";

export { Textarea } from "./textarea";
export type { TextareaProps } from "./textarea";

export { Field, Label } from "./field";
export type { FieldProps } from "./field";

export { Dialog } from "./dialog";
export type { DialogProps, DialogSize } from "./dialog";

export { Sheet } from "./sheet";
export type { SheetProps } from "./sheet";

export { Toaster, toast } from "./toast";
export type { ToastOptions, ToastVariant } from "./toast";

export { Skeleton } from "./skeleton";

export { EmptyState } from "./empty-state";
export type { EmptyStateProps } from "./empty-state";
