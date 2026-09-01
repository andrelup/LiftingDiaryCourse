import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const muscleGroupEnum = pgEnum("muscle_group", [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "core",
  "cardio",
  "other",
]);

export const equipmentEnum = pgEnum("equipment", [
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "kettlebell",
  "band",
  "other",
]);

export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lb"]);

export const setTypeEnum = pgEnum("set_type", [
  "warmup",
  "working",
  "dropset",
  "failure",
  "backoff",
]);

/**
 * Exercise catalog. `userId` null means a system-provided exercise shared by
 * everyone; a non-null `userId` is a custom exercise owned by that Clerk user.
 */
export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    name: text("name").notNull(),
    muscleGroup: muscleGroupEnum("muscle_group"),
    equipment: equipmentEnum("equipment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // nullsNotDistinct so two system exercises cannot share a name either.
    unique("exercises_user_id_name_unique")
      .on(t.userId, t.name)
      .nullsNotDistinct(),
    index("exercises_user_id_idx").on(t.userId),
  ],
);

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name"),
    performedAt: timestamp("performed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    durationSeconds: integer("duration_seconds"),
    // The unit belongs to the session, not to each individual set.
    weightUnit: weightUnitEnum("weight_unit").notNull().default("kg"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("workouts_user_id_performed_at_idx").on(
      t.userId,
      t.performedAt.desc(),
    ),
    check(
      "workouts_duration_seconds_check",
      sql`${t.durationSeconds} is null or ${t.durationSeconds} >= 0`,
    ),
  ],
);

/**
 * An exercise as performed inside one workout. Its own entity so the same
 * catalog exercise can appear several times in a session and so sets have a
 * single parent to hang from.
 */
export const workoutExercises = pgTable(
  "workout_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    position: integer("position").notNull(),
    notes: text("notes"),
  },
  (t) => [
    unique("workout_exercises_workout_id_position_unique").on(
      t.workoutId,
      t.position,
    ),
    index("workout_exercises_workout_id_idx").on(t.workoutId),
    index("workout_exercises_exercise_id_idx").on(t.exerciseId),
    check("workout_exercises_position_check", sql`${t.position} > 0`),
  ],
);

export const workoutSets = pgTable(
  "workout_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutExerciseId: uuid("workout_exercise_id")
      .notNull()
      .references(() => workoutExercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    setType: setTypeEnum("set_type").notNull().default("working"),
    reps: integer("reps"),
    // Expressed in the parent workout's `weightUnit`.
    weight: numeric("weight", { precision: 7, scale: 2 }),
    durationSeconds: integer("duration_seconds"),
    distanceMeters: numeric("distance_meters", { precision: 9, scale: 2 }),
    completed: boolean("completed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("workout_sets_workout_exercise_id_position_unique").on(
      t.workoutExerciseId,
      t.position,
    ),
    index("workout_sets_workout_exercise_id_idx").on(t.workoutExerciseId),
    check("workout_sets_position_check", sql`${t.position} > 0`),
    check(
      "workout_sets_metric_present_check",
      sql`${t.reps} is not null or ${t.weight} is not null or ${t.durationSeconds} is not null or ${t.distanceMeters} is not null`,
    ),
    check(
      "workout_sets_non_negative_check",
      sql`(${t.reps} is null or ${t.reps} >= 0)
        and (${t.weight} is null or ${t.weight} >= 0)
        and (${t.durationSeconds} is null or ${t.durationSeconds} >= 0)
        and (${t.distanceMeters} is null or ${t.distanceMeters} >= 0)`,
    ),
  ],
);

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
export type NewWorkout = typeof workouts.$inferInsert;
export type WorkoutExercise = typeof workoutExercises.$inferSelect;
export type NewWorkoutExercise = typeof workoutExercises.$inferInsert;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type NewWorkoutSet = typeof workoutSets.$inferInsert;
