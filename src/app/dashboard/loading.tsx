import { Skeleton } from "@/components/ui/skeleton";

/**
 * Covers every render of the dashboard, which is always a request-time one
 * (`searchParams` + Clerk reading headers).
 *
 * Changing the day is a client-side transition that keeps the previous day on
 * screen, so this is the first-paint fallback only — hence the shape below
 * mirrors the page.
 */
export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-[190px]" />
          <Skeleton className="h-8 w-36" />
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-56 w-full" />
        ))}
      </div>
    </main>
  );
}
