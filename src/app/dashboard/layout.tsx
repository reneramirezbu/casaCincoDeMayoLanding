import type { Metadata } from "next";
import { DashboardShell } from "@/components/shell/dashboard-shell";
import { Toaster } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "Dashboard | Casa Cinco de Mayo",
  description: "Channel manager — one shared inventory across every channel.",
};

/**
 * Owner-app chrome for every /dashboard route. DashboardShell (client) renders
 * the sidebar/drawer; Toaster is mounted once here so any client action can
 * surface a toast. Pages read the DB in their own Server Components.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      {children}
      <Toaster />
    </DashboardShell>
  );
}
