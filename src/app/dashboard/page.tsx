import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getWorkoutsForDay, type WorkoutSetRow } from "@/data/workouts";
import {
  formatClock,
  formatDuration,
  formatLongDate,
  formatTimeOfDay,
  parseDateParam,
  todayInZone,
} from "@/lib/dates";
import { cn } from "@/lib/utils";

import { DatePicker } from "./date-picker";

/** `72.50` → `72.5`, `100.00` → `100`. Postgres `numeric` arrives as a string. */
function formatWeight(weight: string): string {
  return String(Number(weight));
}

/**
 * One set as a single chip: `8 × 72.5 kg`, `12 reps`, `24:30`, `1.2 km`.
 *
 * Every metric column is nullable — a strength set carries reps and weight, a
 * cardio set carries duration and distance — so the shape is whatever the row
 * actually has, joined by `·`.
 */
function describeSet(set: WorkoutSetRow, weightUnit: string): string {
  const parts: string[] = [];

  const weight =
    set.weight !== null && Number(set.weight) > 0
      ? `${formatWeight(set.weight)} ${weightUnit}`
      : null;

  if (set.reps !== null) {
    parts.push(weight ? `${set.reps} × ${weight}` : `${set.reps} reps`);
  } else if (weight) {
    parts.push(weight);
  }

  if (set.durationSeconds !== null) parts.push(formatClock(set.durationSeconds));

  if (set.distanceMeters !== null) {
    const metres = Number(set.distanceMeters);
    parts.push(metres >= 1000 ? `${metres / 1000} km` : `${metres} m`);
  }

  // The schema guarantees at least one metric is present, but a row edited to
  // all-zeros would still render an empty chip.
  return parts.join(" · ") || "—";
}

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const { userId } = await auth();
  // The proxy already gates /dashboard; this is what makes the query itself
  // impossible to run without an identity.
  if (!userId) redirect("/sign-in");

  const date = parseDateParam((await searchParams).date);
  const workouts = await getWorkoutsForDay(userId, date);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workouts</h1>
          <p className="text-sm text-muted-foreground">
            {formatLongDate(date)} ·{" "}
            {workouts.length === 0
              ? "nothing logged"
              : `${workouts.length} ${workouts.length === 1 ? "session" : "sessions"}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Picking a day navigates to ?date=YYYY-MM-DD; this component
              re-runs on the server with that day's query. No client state
              holds data. */}
          <DatePicker value={date} max={todayInZone()} />

          {/* `nativeButton={false}`: the rendered element is an anchor, and
              Base UI warns when it is left to assume a native <button>. */}
          <Button
            nativeButton={false}
            render={<Link href="/dashboard/workout/new" />}
          >
            <PlusIcon />
            New workout
          </Button>
        </div>
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
          {workouts.map((workout) => {
            const description = [
              formatTimeOfDay(workout.performedAt),
              formatDuration(workout.durationSeconds),
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <Card key={workout.id}>
                <CardHeader>
                  <CardTitle>{workout.name ?? "Workout"}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                  <CardAction>
                    <Badge variant="secondary">{workout.weightUnit}</Badge>
                  </CardAction>
                </CardHeader>

                <CardContent>
                  <ol className="divide-y divide-border">
                    {workout.exercises.map((entry, index) => (
                      <li
                        key={entry.id}
                        className="flex gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">
                          {index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">
                            {entry.exercise.name}
                          </p>
                          {entry.notes && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {entry.notes}
                            </p>
                          )}
                          {entry.sets.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {entry.sets.map((set) => (
                                <span
                                  key={set.id}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs tabular-nums",
                                    (set.setType === "warmup" ||
                                      !set.completed) &&
                                      "text-muted-foreground",
                                    !set.completed && "line-through",
                                  )}
                                >
                                  {describeSet(set, workout.weightUnit)}
                                  {set.setType !== "working" && (
                                    <span className="text-[10px] uppercase text-muted-foreground">
                                      {set.setType}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>

                {workout.notes && (
                  <CardFooter>
                    <p className="text-sm text-muted-foreground">
                      {workout.notes}
                    </p>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </main>
  );
}
