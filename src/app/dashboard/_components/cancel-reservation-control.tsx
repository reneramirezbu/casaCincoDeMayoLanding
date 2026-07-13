"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { cancelReservationAction, type ActionState } from "../actions";
import { formatStay } from "../_format";

interface CancelReservationControlProps {
  reservationId: string;
  code: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
}

/**
 * A "Cancel" button that opens a confirm dialog, then submits the cancel
 * Server Action via useActionState. On success/failure it fires a toast; the
 * action's revalidatePath refreshes the reservations table, dashboard, and
 * calendar so the freed inventory shows up immediately.
 */
export function CancelReservationControl({
  reservationId,
  code,
  guestName,
  checkIn,
  checkOut,
}: CancelReservationControlProps) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = React.useActionState<ActionState | null, FormData>(
    cancelReservationAction,
    null,
  );

  // Surface the result once per submission (state.at changes each run).
  const handledAt = React.useRef<number>(0);
  React.useEffect(() => {
    if (!state || state.at === handledAt.current) return;
    handledAt.current = state.at;
    if (state.ok) {
      toast.success(state.message);
      setOpen(false);
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-danger hover:bg-danger-soft hover:text-danger"
      >
        Cancel
      </Button>

      <Dialog
        open={open}
        onClose={() => (pending ? undefined : setOpen(false))}
        title="Cancel this reservation?"
        description={`${guestName} · ${code} · ${formatStay(checkIn, checkOut)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={pending}>
              Keep reservation
            </Button>
            <form action={formAction}>
              <input type="hidden" name="reservationId" value={reservationId} />
              <Button type="submit" variant="destructive" loading={pending}>
                Cancel &amp; release
              </Button>
            </form>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          The held nights return to the shared pool and become sellable again on every
          channel. This can’t be undone from here.
        </p>
      </Dialog>
    </>
  );
}
