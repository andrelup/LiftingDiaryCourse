DROP TABLE IF EXISTS "users";--> statement-breakpoint
CREATE TYPE "equipment" AS ENUM('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other');--> statement-breakpoint
CREATE TYPE "muscle_group" AS ENUM('chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'core', 'cardio', 'other');--> statement-breakpoint
CREATE TYPE "set_type" AS ENUM('warmup', 'working', 'dropset', 'failure', 'backoff');--> statement-breakpoint
CREATE TYPE "weight_unit" AS ENUM('kg', 'lb');--> statement-breakpoint
CREATE TABLE "exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text,
	"name" text NOT NULL,
	"muscle_group" "muscle_group",
	"equipment" "equipment",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercises_user_id_name_unique" UNIQUE NULLS NOT DISTINCT("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workout_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"notes" text,
	CONSTRAINT "workout_exercises_workout_id_position_unique" UNIQUE("workout_id","position"),
	CONSTRAINT "workout_exercises_position_check" CHECK ("position" > 0)
);
--> statement-breakpoint
CREATE TABLE "workout_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"workout_exercise_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"set_type" "set_type" DEFAULT 'working'::"set_type" NOT NULL,
	"reps" integer,
	"weight" numeric(7,2),
	"duration_seconds" integer,
	"distance_meters" numeric(9,2),
	"completed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_sets_workout_exercise_id_position_unique" UNIQUE("workout_exercise_id","position"),
	CONSTRAINT "workout_sets_position_check" CHECK ("position" > 0),
	CONSTRAINT "workout_sets_metric_present_check" CHECK ("reps" is not null or "weight" is not null or "duration_seconds" is not null or "distance_meters" is not null),
	CONSTRAINT "workout_sets_non_negative_check" CHECK (("reps" is null or "reps" >= 0)
        and ("weight" is null or "weight" >= 0)
        and ("duration_seconds" is null or "duration_seconds" >= 0)
        and ("distance_meters" is null or "distance_meters" >= 0))
);
--> statement-breakpoint
CREATE TABLE "workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_seconds" integer,
	"weight_unit" "weight_unit" DEFAULT 'kg'::"weight_unit" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workouts_duration_seconds_check" CHECK ("duration_seconds" is null or "duration_seconds" >= 0)
);
--> statement-breakpoint
CREATE INDEX "exercises_user_id_idx" ON "exercises" ("user_id");--> statement-breakpoint
CREATE INDEX "workout_exercises_workout_id_idx" ON "workout_exercises" ("workout_id");--> statement-breakpoint
CREATE INDEX "workout_exercises_exercise_id_idx" ON "workout_exercises" ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_sets_workout_exercise_id_idx" ON "workout_sets" ("workout_exercise_id");--> statement-breakpoint
CREATE INDEX "workouts_user_id_performed_at_idx" ON "workouts" ("user_id","performed_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_workout_id_workouts_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_exercise_id_exercises_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD CONSTRAINT "workout_sets_workout_exercise_id_workout_exercises_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "workout_exercises"("id") ON DELETE CASCADE;