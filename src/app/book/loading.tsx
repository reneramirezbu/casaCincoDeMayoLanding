import { Skeleton } from "@/components/ui/skeleton";

/** Instant loading UI for the booking funnel (prefetched by next/form). */
export default function BookLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-8">
      {/* Steps */}
      <Skeleton className="h-6 w-64 max-w-full" />

      {/* Heading */}
      <div className="space-y-3">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Search / form card */}
      <Skeleton className="h-36 w-full rounded-card" />

      {/* Results */}
      <div className="space-y-4">
        <Skeleton className="h-36 w-full rounded-card" />
        <Skeleton className="h-36 w-full rounded-card" />
      </div>
    </div>
  );
}
