import type { Metadata } from "next";
import { PublicHeader } from "@/components/shell/public-header";

export const metadata: Metadata = {
  title: {
    default: "Book your stay | Casa Cinco de Mayo",
    template: "%s | Casa Cinco de Mayo",
  },
  description:
    "Reserve directly with Casa Cinco de Mayo, a boutique hotel in San Miguel de Allende, Guanajuato. Pay on arrival.",
};

/**
 * Calm, guest-facing chrome for the direct-booking funnel.
 * Deliberately NOT the dashboard shell — this is the hotel's front door.
 */
export default function BookLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-surface text-ink">
      <PublicHeader />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        {children}
      </main>

      <footer className="border-t border-edge bg-surface-sunken/60">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-1.5 px-4 py-8 sm:px-6">
          <p className="font-serif text-sm tracking-wide text-ink">
            Casa Cinco de Mayo
          </p>
          <p className="text-[0.8125rem] text-ink-muted">
            San Miguel de Allende, Guanajuato, México
          </p>
          <p className="text-[0.8125rem] text-ink-faint">
            You are booking directly with the hotel — your reservation goes
            straight to our front desk, and you pay on arrival.
          </p>
        </div>
      </footer>
    </div>
  );
}
