import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { getWorkoutById } from "@/data/workouts";
import {
  formatLongDate,
  instantToIsoDate,
  instantToTimeOfDayInZone,
  todayInZone,
} from "@/lib/dates";

import { EditWorkoutForm } from "./edit-workout-form";

export default async function EditWorkoutPage({
  params,
}: PageProps<"/dashboard/workout/[workoutId]">) {
  const { userId } = await auth();
  // The proxy already gates everything under /dashboard; this is the page
  // refusing to render without an identity of its own accord.
  if (!userId) redirect("/sign-in");

  const { workoutId } = await params;

  // The segment is whatever the visitor typed. Checking the shape here keeps a
  // non-uuid from reaching Postgres as a cast error, which would surface as a
  // 500 rather than as the 404 it is.
  if (!z.uuid().safeParse(workoutId).success) notFound();

  // Scoped to `userId` inside the query, so another user's workout is not
  // "forbidden" here — it simply does not exist.
  const workout = await getWorkoutById(userId, workoutId);
  if (!workout) notFound();

  // Derived on the server: the stored value is an instant, and the day and time
  // it reads as depend on the app's zone, not on the visitor's browser.
  const performedOn = instantToIsoDate(workout.performedAt);
  const today = todayInZone();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3 text-muted-foreground"
          // The rendered element is an anchor, not a <button>.
          nativeButton={false}
          render={<Link href={`/dashboard?date=${performedOn}`} />}
        >
          <ArrowLeftIcon />
          Back to workouts
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight">
          {workout.name ?? "Workout"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Logged on {formatLongDate(performedOn)}.
        </p>
      </div>

      <EditWorkoutForm
        workoutId={workout.id}
        initialName={workout.name ?? ""}
        initialDate={performedOn}
        initialTime={instantToTimeOfDayInZone(workout.performedAt)}
        initialWeightUnit={workout.weightUnit}
        // Minutes on screen, seconds in the column.
        initialDurationMinutes={
          workout.durationSeconds === null
            ? ""
            : String(Math.round(workout.durationSeconds / 60))
        }
        initialNotes={workout.notes ?? ""}
        // A session already logged in the future stays selectable; otherwise
        // the calendar would forbid the date the form opened with.
        maxDate={performedOn > today ? performedOn : today}
      />
    </main>
  );
}
