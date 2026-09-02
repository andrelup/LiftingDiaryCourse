import { Skeleton } from "@/components/ui/skeleton";

/**
 * Covers every render of the dashboard, which is always a request-time one
 * (`searchParams` + Clerk reading headers).
 *
 * The date picker is a plain GET form, so changing the day is a full
 * navigation and lands here too — hence the shape below mirrors the page.
 */
export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-8 w-[260px]" />
      </div>

      <div className="flex flex-col gap-6">
        {[0, 1].map((index) => (
          <Skeleton key={index} className="h-56 w-full" />
        ))}
      </div>
    </main>
  );
}
