import { defineRelations } from "drizzle-orm/relations";

import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  exercises: {
    workoutEntries: r.many.workoutExercises(),
  },
  workouts: {
    exercises: r.many.workoutExercises(),
  },
  workoutExercises: {
    workout: r.one.workouts({
      from: r.workoutExercises.workoutId,
      to: r.workouts.id,
      optional: false,
    }),
    exercise: r.one.exercises({
      from: r.workoutExercises.exerciseId,
      to: r.exercises.id,
      optional: false,
    }),
    sets: r.many.workoutSets(),
  },
  workoutSets: {
    workoutExercise: r.one.workoutExercises({
      from: r.workoutSets.workoutExerciseId,
      to: r.workoutExercises.id,
      optional: false,
    }),
  },
}));
