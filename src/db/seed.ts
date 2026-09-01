import { config } from "dotenv";

config({ path: ".env.local" });

async function main() {
  // Imported lazily so DATABASE_URL is loaded before the client is created.
  const { db } = await import("./index");
  const { exercises, workoutExercises, workoutSets, workouts } = await import(
    "./schema"
  );

  const catalog: (typeof exercises.$inferInsert)[] = [
    { name: "Back Squat", muscleGroup: "legs", equipment: "barbell" },
    { name: "Front Squat", muscleGroup: "legs", equipment: "barbell" },
    { name: "Deadlift", muscleGroup: "back", equipment: "barbell" },
    { name: "Romanian Deadlift", muscleGroup: "legs", equipment: "barbell" },
    { name: "Hip Thrust", muscleGroup: "glutes", equipment: "barbell" },
    { name: "Leg Press", muscleGroup: "legs", equipment: "machine" },
    { name: "Bench Press", muscleGroup: "chest", equipment: "barbell" },
    {
      name: "Incline Dumbbell Press",
      muscleGroup: "chest",
      equipment: "dumbbell",
    },
    { name: "Overhead Press", muscleGroup: "shoulders", equipment: "barbell" },
    { name: "Lateral Raise", muscleGroup: "shoulders", equipment: "dumbbell" },
    { name: "Pull-up", muscleGroup: "back", equipment: "bodyweight" },
    { name: "Barbell Row", muscleGroup: "back", equipment: "barbell" },
    { name: "Lat Pulldown", muscleGroup: "back", equipment: "cable" },
    { name: "Biceps Curl", muscleGroup: "biceps", equipment: "dumbbell" },
    { name: "Triceps Pushdown", muscleGroup: "triceps", equipment: "cable" },
    { name: "Plank", muscleGroup: "core", equipment: "bodyweight" },
    { name: "Treadmill Run", muscleGroup: "cardio", equipment: "machine" },
  ];

  await db.insert(exercises).values(catalog).onConflictDoNothing();
  console.log(`Seeded ${catalog.length} system exercises.`);

  const seedUserId = process.env.SEED_USER_ID;
  if (!seedUserId) {
    console.log("SEED_USER_ID not set — skipping the sample workout.");
    return;
  }

  const catalogRows = await db.select().from(exercises);
  const byName = new Map(catalogRows.map((row) => [row.name, row.id]));

  const [workout] = await db
    .insert(workouts)
    .values({
      userId: seedUserId,
      name: "Push A",
      durationSeconds: 60 * 62,
      weightUnit: "kg",
      notes: "Sample workout created by the seed script.",
    })
    .returning();

  const [benchEntry, ohpEntry] = await db
    .insert(workoutExercises)
    .values([
      {
        workoutId: workout.id,
        exerciseId: byName.get("Bench Press")!,
        position: 1,
      },
      {
        workoutId: workout.id,
        exerciseId: byName.get("Overhead Press")!,
        position: 2,
      },
    ])
    .returning();

  await db.insert(workoutSets).values([
    {
      workoutExerciseId: benchEntry.id,
      position: 1,
      setType: "warmup",
      reps: 10,
      weight: "40.00",
    },
    {
      workoutExerciseId: benchEntry.id,
      position: 2,
      reps: 8,
      weight: "70.00",
    },
    {
      workoutExerciseId: benchEntry.id,
      position: 3,
      reps: 6,
      weight: "75.00",
    },
    {
      workoutExerciseId: ohpEntry.id,
      position: 1,
      reps: 8,
      weight: "40.00",
    },
    {
      workoutExerciseId: ohpEntry.id,
      position: 2,
      setType: "backoff",
      reps: 10,
      weight: "35.00",
    },
  ]);

  console.log(`Seeded sample workout ${workout.id} for user ${seedUserId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
