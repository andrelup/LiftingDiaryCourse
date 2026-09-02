import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { WorkoutCard } from "@/components/workout-card";
import { WorkoutDatePicker } from "@/components/workout-date-picker";
import { formatLongDate, parseDateParam } from "@/lib/dates";
import { getWorkoutsForDay } from "@/lib/workouts";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your logged workouts, one day at a time.",
};

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const { date: rawDate } = await searchParams;
  const date = parseDateParam(rawDate);

  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn({ returnBackUrl: "/dashboard" });

  const workouts = await getWorkoutsForDay(userId, date);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
          <p className="text-sm text-muted-foreground">
            {workouts.length === 0
              ? "Nothing logged"
              : `${workouts.length} ${workouts.length === 1 ? "session" : "sessions"}`}
          </p>
        </div>
        <WorkoutDatePicker date={date} />
      </div>

      {workouts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm font-medium">
            No workouts logged on {formatLongDate(date)}.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick another date to browse your training history.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      )}
    </main>
  );
}
