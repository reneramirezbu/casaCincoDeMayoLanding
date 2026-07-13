"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ChannelBadge } from "@/components/ui/channel-badge";
import { toast } from "@/components/ui/toast";
import {
  closeOutNightAction,
  reopenNightAction,
  type ActionState,
} from "../actions";
import type { CalendarCell, CalendarModel, CalendarRow } from "../_data";
import { formatDateLong } from "../_format";

/** Prisma Channel enum value → solid channel color utility (for the dots). */
const CHANNEL_DOT: Record<string, string> = {
  AIRBNB: "bg-channel-airbnb",
  BOOKING: "bg-channel-booking",
  EXPEDIA: "bg-channel-expedia",
  DIRECT: "bg-channel-direct",
};

function cellTone(cell: CalendarCell): string {
  if (cell.capacity === 0) return "bg-surface-raised text-ink-faint";
  if (cell.available <= 0) return "bg-danger-soft text-danger";
  const ratio = cell.available / cell.capacity;
  if (ratio <= 0.34) return "bg-warning-soft text-warning";
  if (ratio < 1) return "bg-surface-sunken text-ink";
  return "bg-surface-raised text-ink-muted";
}

interface Selection {
  row: CalendarRow;
  cell: CalendarCell;
}

export function CalendarGrid({ model }: { model: CalendarModel }) {
  const [selected, setSelected] = React.useState<Selection | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-card border border-edge bg-surface-raised shadow-card">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 top-0 z-20 min-w-[11rem] border-b border-edge bg-surface-raised px-4 py-3 text-left align-bottom font-medium text-ink-muted"
              >
                Room type
              </th>
              {model.nights.map((night) => (
                <th
                  key={night.date}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 min-w-[3.5rem] border-b border-l border-edge px-1 py-2 text-center font-medium",
                    night.isWeekend ? "bg-surface-sunken" : "bg-surface-raised",
                  )}
                >
                  <span className="block text-[0.625rem] uppercase tracking-wide text-ink-faint">
                    {night.weekday}
                  </span>
                  <span className="block text-sm tabular-nums text-ink">{night.day}</span>
                  <span className="block text-[0.625rem] text-ink-faint">{night.month}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.rows.map((row) => (
              <tr key={row.roomTypeId} className="group">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-b border-edge bg-surface-raised px-4 py-2 text-left align-middle font-normal"
                >
                  <span className="block max-w-[13rem] truncate text-sm font-medium text-ink">
                    {row.roomTypeName}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {row.capacity} room{row.capacity === 1 ? "" : "s"}
                  </span>
                </th>
                {row.cells.map((cell) => {
                  const shown = cell.reservations.slice(0, 4);
                  const extra = cell.reservations.length - shown.length;
                  return (
                    <td key={cell.date} className="border-b border-l border-edge p-0">
                      <button
                        type="button"
                        onClick={() => setSelected({ row, cell })}
                        aria-label={`${row.roomTypeName}, ${cell.date}: ${cell.available} of ${cell.capacity} available`}
                        className={cn(
                          "flex h-14 w-full flex-col items-center justify-center gap-1 px-1 transition-colors duration-150 ease-out outline-none",
                          "hover:brightness-[0.97] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60",
                          cellTone(cell),
                        )}
                      >
                        <span className="text-sm font-semibold tabular-nums leading-none">
                          {cell.available}
                        </span>
                        {cell.reservations.length > 0 && (
                          <span className="flex items-center gap-0.5" aria-hidden>
                            {shown.map((r) => (
                              <span
                                key={r.id}
                                className={cn(
                                  "size-1.5 rounded-[2px]",
                                  CHANNEL_DOT[r.channel] ?? "bg-ink-faint",
                                )}
                              />
                            ))}
                            {extra > 0 && (
                              <span className="text-[0.5625rem] font-medium leading-none text-ink-faint">
                                +{extra}
                              </span>
                            )}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CellDialog selection={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function CellDialog({
  selection,
  onClose,
}: {
  selection: Selection | null;
  onClose: () => void;
}) {
  const [closeState, closeAction, closing] = React.useActionState<ActionState | null, FormData>(
    closeOutNightAction,
    null,
  );
  const [reopenState, reopenAction, reopening] = React.useActionState<ActionState | null, FormData>(
    reopenNightAction,
    null,
  );

  const handledClose = React.useRef(0);
  const handledReopen = React.useRef(0);
  React.useEffect(() => {
    if (!closeState || closeState.at === handledClose.current) return;
    handledClose.current = closeState.at;
    if (closeState.ok) {
      toast.success(closeState.message);
      onClose();
    } else {
      toast.error(closeState.message);
    }
  }, [closeState, onClose]);
  React.useEffect(() => {
    if (!reopenState || reopenState.at === handledReopen.current) return;
    handledReopen.current = reopenState.at;
    if (reopenState.ok) {
      toast.success(reopenState.message);
      onClose();
    } else {
      toast.error(reopenState.message);
    }
  }, [reopenState, onClose]);

  const busy = closing || reopening;

  // Keep the dialog content through its exit animation: remember the last
  // non-null selection so it stays rendered while the dialog animates closed.
  const [lastSelection, setLastSelection] = React.useState<Selection | null>(null);
  React.useEffect(() => {
    if (selection) setLastSelection(selection);
  }, [selection]);
  const view = selection ?? lastSelection;

  const row = view?.row;
  const cell = view?.cell;
  const canCloseOut = !!cell && cell.available > 0;
  const canReopen = !!cell && cell.available < (cell.capacity ?? 0);

  return (
    <Dialog
      open={selection !== null}
      onClose={() => (busy ? undefined : onClose())}
      title={row ? row.roomTypeName : "Night"}
      description={cell ? formatDateLong(cell.date) : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Close
          </Button>
          {canReopen && row && cell && (
            <form action={reopenAction}>
              <input type="hidden" name="roomTypeId" value={row.roomTypeId} />
              <input type="hidden" name="date" value={cell.date} />
              <Button type="submit" variant="secondary" loading={reopening} disabled={closing}>
                Reopen night
              </Button>
            </form>
          )}
          {canCloseOut && row && cell && (
            <form action={closeAction}>
              <input type="hidden" name="roomTypeId" value={row.roomTypeId} />
              <input type="hidden" name="date" value={cell.date} />
              <Button type="submit" variant="destructive" loading={closing} disabled={reopening}>
                Close out
              </Button>
            </form>
          )}
        </>
      }
    >
      {cell && (
        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-field bg-surface-sunken px-2 py-3">
              <dt className="text-xs text-ink-faint">Available</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">{cell.available}</dd>
            </div>
            <div className="rounded-field bg-surface-sunken px-2 py-3">
              <dt className="text-xs text-ink-faint">Sold</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">{cell.sold}</dd>
            </div>
            <div className="rounded-field bg-surface-sunken px-2 py-3">
              <dt className="text-xs text-ink-faint">Capacity</dt>
              <dd className="text-lg font-semibold tabular-nums text-ink">{cell.capacity}</dd>
            </div>
          </dl>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              Reservations this night
            </p>
            {cell.reservations.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No bookings occupy this night yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {cell.reservations.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-field bg-surface-sunken px-3 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <ChannelBadge channel={r.channel} />
                      <span className="truncate text-sm text-ink">{r.guestName}</span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-ink-faint">{r.code}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
}
