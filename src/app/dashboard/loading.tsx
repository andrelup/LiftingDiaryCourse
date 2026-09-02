import { Skeleton } from "@/components/ui/skeleton";

/**
 * Covers the first navigation into the dashboard, which is always a
 * request-time render (`searchParams` + Clerk reading headers).
 *
 * Changing the date does *not* land here: the picker pushes inside a
 * transition, so React keeps the previous day's cards mounted instead of
 * falling back to this boundary.
 */
export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-9 w-[260px]" />
      </div>

      <div className="flex flex-col gap-6">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-56 w-full" />
        ))}
      </div>
    </main>
  );
}
