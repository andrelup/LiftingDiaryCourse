import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { workouts } from "@/db/schema";
import { APP_TIME_ZONE, zonedDayRange, type IsoDate } from "@/lib/dates";

/**
 * Every workout the user logged on one calendar day, deepest-first: exercises
 * in their recorded order, each with its catalog row and its sets.
 *
 * The day is filtered as a half-open `[start, end)` instant range rather than
 * `(performed_at AT TIME ZONE ...)::date = $1`, which reads better but is not
 * sargable — it would give up `workouts_user_id_performed_at_idx` and need a
 * dedicated expression index with the timezone baked into the schema.
 */
export async function getWorkoutsForDay(
  userId: string,
  date: IsoDate,
  timeZone: string = APP_TIME_ZONE,
) {
  const { start, end } = zonedDayRange(date, timeZone);

  return db.query.workouts.findMany({
    // Drizzle v1: `where` is a filter object, not the v0.x
    // `(t, { and, eq }) => ...` callback. Sibling keys are AND-ed.
    where: { userId, performedAt: { gte: start, lt: end } },
    // Chronological within the day, even though the index is DESC — a b-tree
    // scans backwards freely.
    orderBy: { performedAt: "asc" },
    with: {
      // Named `exercises`, not `workoutExercises` — see src/db/relations.ts.
      exercises: {
        orderBy: { position: "asc" },
        with: { exercise: true, sets: { orderBy: { position: "asc" } } },
      },
    },
  });
}

export type WorkoutWithDetails = Awaited<
  ReturnType<typeof getWorkoutsForDay>
>[number];

export type WorkoutExerciseWithDetails = WorkoutWithDetails["exercises"][number];

export type WorkoutSetRow = WorkoutExerciseWithDetails["sets"][number];

/**
 * Log a new (still empty) workout for `userId`.
 *
 * `userId` is stamped here rather than accepted inside `values`, so there is no
 * shape in which a caller can insert a row owned by somebody else.
 */
export async function createWorkout(
  userId: string,
  values: {
    name: string | null;
    performedAt: Date;
    weightUnit: "kg" | "lb";
    durationSeconds: number | null;
    notes: string | null;
  },
) {
  const [workout] = await db
    .insert(workouts)
    .values({ ...values, userId })
    .returning();

  return workout;
}

export type CreatedWorkout = Awaited<ReturnType<typeof createWorkout>>;

/**
 * One workout of `userId`'s, or `undefined`.
 *
 * `where` carries both keys: matching on the id alone would make somebody
 * else's session one guessed uuid away, and "belongs to me" is a question the
 * query answers, never JavaScript afterwards. A row owned by another user is
 * therefore indistinguishable from one that does not exist — which is exactly
 * what the caller should tell the visitor.
 */
export async function getWorkoutById(userId: string, workoutId: string) {
  return db.query.workouts.findFirst({
    where: { id: workoutId, userId },
  });
}

export type WorkoutRow = NonNullable<Awaited<ReturnType<typeof getWorkoutById>>>;

/**
 * Update the session details of one workout, if it belongs to `userId`.
 *
 * Ownership is part of the `where`, so a foreign id updates zero rows and the
 * helper returns `undefined` — the caller reports that as "not found" rather
 * than as a silent success. `userId` itself is never among the writable
 * values: a workout cannot change hands.
 */
export async function updateWorkout(
  userId: string,
  workoutId: string,
  values: {
    name: string | null;
    performedAt: Date;
    weightUnit: "kg" | "lb";
    durationSeconds: number | null;
    notes: string | null;
  },
) {
  const [workout] = await db
    .update(workouts)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(workouts.id, workoutId), eq(workouts.userId, userId)))
    .returning();

  return workout;
}

export type UpdatedWorkout = Awaited<ReturnType<typeof updateWorkout>>;
