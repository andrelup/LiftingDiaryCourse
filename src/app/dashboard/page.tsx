"use client";

import * as React from "react";
import { isSameDay } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDuration, formatLongDate, formatTimeOfDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

/**
 * Placeholder data: this page is UI-only for now — no query, no server code.
 * Swap this constant for the real fetch once the data layer is wired in.
 */
type MockSet = { id: string; reps: number; weight: number; warmup?: boolean };

type MockExercise = {
  id: string;
  name: string;
  notes?: string;
  sets: MockSet[];
};

type MockWorkout = {
  id: string;
  name: string;
  performedAt: Date;
  durationSeconds: number;
  weightUnit: "kg" | "lb";
  notes?: string;
  exercises: MockExercise[];
};

function daysAgo(days: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

const MOCK_WORKOUTS: MockWorkout[] = [
  {
    id: "w1",
    name: "Push A",
    performedAt: daysAgo(0, 18, 30),
    durationSeconds: 62 * 60,
    weightUnit: "kg",
    notes: "Felt strong, bumped the top set by 2.5 kg.",
    exercises: [
      {
        id: "e1",
        name: "Barbell Bench Press",
        sets: [
          { id: "s1", reps: 10, weight: 40, warmup: true },
          { id: "s2", reps: 8, weight: 70 },
          { id: "s3", reps: 8, weight: 72.5 },
          { id: "s4", reps: 6, weight: 72.5 },
        ],
      },
      {
        id: "e2",
        name: "Overhead Press",
        notes: "Elbows tucked, no leg drive.",
        sets: [
          { id: "s5", reps: 10, weight: 35 },
          { id: "s6", reps: 9, weight: 35 },
        ],
      },
      {
        id: "e3",
        name: "Cable Triceps Pushdown",
        sets: [
          { id: "s7", reps: 12, weight: 25 },
          { id: "s8", reps: 12, weight: 25 },
          { id: "s9", reps: 10, weight: 27.5 },
        ],
      },
    ],
  },
  {
    id: "w2",
    name: "Zone 2 Bike",
    performedAt: daysAgo(0, 8, 15),
    durationSeconds: 45 * 60,
    weightUnit: "kg",
    exercises: [
      {
        id: "e4",
        name: "Assault Bike",
        notes: "Kept heart rate under 140 bpm.",
        sets: [],
      },
    ],
  },
  {
    id: "w3",
    name: "Pull B",
    performedAt: daysAgo(2, 19, 0),
    durationSeconds: 55 * 60,
    weightUnit: "kg",
    exercises: [
      {
        id: "e5",
        name: "Deadlift",
        sets: [
          { id: "s10", reps: 5, weight: 100, warmup: true },
          { id: "s11", reps: 5, weight: 140 },
          { id: "s12", reps: 5, weight: 140 },
        ],
      },
      {
        id: "e6",
        name: "Pull-up",
        sets: [
          { id: "s13", reps: 8, weight: 0 },
          { id: "s14", reps: 7, weight: 0 },
          { id: "s15", reps: 6, weight: 0 },
        ],
      },
    ],
  },
];

export default function DashboardPage() {
  const [date, setDate] = React.useState<Date>(() => new Date());
  const [open, setOpen] = React.useState(false);

  const workouts = MOCK_WORKOUTS.filter((workout) =>
    isSameDay(workout.performedAt, date),
  );

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

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="w-[240px] justify-start text-left font-normal"
              />
            }
          >
            <CalendarIcon />
            {formatLongDate(date)}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              required
              selected={date}
              onSelect={(next) => {
                setDate(next);
                setOpen(false);
              }}
              defaultMonth={date}
              disabled={{ after: new Date() }}
              autoFocus
            />
          </PopoverContent>
        </Popover>
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
            <Card key={workout.id}>
              <CardHeader>
                <CardTitle>{workout.name}</CardTitle>
                <CardDescription>
                  {[
                    formatTimeOfDay(workout.performedAt),
                    formatDuration(workout.durationSeconds),
                  ].join(" · ")}
                </CardDescription>
                <CardAction>
                  <Badge variant="secondary">{workout.weightUnit}</Badge>
                </CardAction>
              </CardHeader>

              <CardContent>
                <ol className="divide-y divide-border">
                  {workout.exercises.map((exercise, index) => (
                    <li
                      key={exercise.id}
                      className="flex gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{exercise.name}</p>
                        {exercise.notes && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {exercise.notes}
                          </p>
                        )}
                        {exercise.sets.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {exercise.sets.map((set) => (
                              <span
                                key={set.id}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs tabular-nums",
                                  set.warmup && "text-muted-foreground",
                                )}
                              >
                                {set.weight > 0
                                  ? `${set.reps} × ${set.weight} ${workout.weightUnit}`
                                  : `${set.reps} reps`}
                                {set.warmup && (
                                  <span className="text-[10px] uppercase text-muted-foreground">
                                    warm-up
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
          ))}
        </div>
      )}
    </main>
  );
}
