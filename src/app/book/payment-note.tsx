import { Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * PLACEHOLDER for the future payment step.
 *
 * Payments are OUT of MVP scope: every direct booking is pay-at-property
 * (request-to-book style, no card collected). This note sits exactly where the
 * payment form will eventually go.
 *
 * TODO(ACTION-ITEMS): integrate a real online payment provider (deposit or
 * full prepayment) and replace this note with the payment step. Do NOT add a
 * fake card form in the meantime.
 */
export function PaymentNote({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-field border border-edge bg-surface-sunken/70 px-4 py-3",
        className,
      )}
    >
      <Wallet aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-faint" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-ink">Payment on arrival</p>
        <p className="text-[0.8125rem] leading-relaxed text-ink-muted">
          No payment is taken now — settle your stay at the front desk when you
          arrive. Online payments coming soon.
        </p>
      </div>
    </div>
  );
}
