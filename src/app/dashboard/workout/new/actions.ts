"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createWorkout } from "@/data/workouts";
import { instantToIsoDate } from "@/lib/dates";

/**
 * A Server Action is a public endpoint: everything below arrives from the
 * network, whatever the call site's types claim. `userId` is deliberately
 * absent — an identity the caller can type is not an identity.
 */
const createWorkoutInput = z.object({
  name: z.string().trim().min(1).max(120).nullable(),
  // The client builds this from the picked day and time of day, in the app's
  // zone; the instant is the only thing the column stores.
  performedAt: z.iso.datetime(),
  weightUnit: z.enum(["kg", "lb"]),
  // Minutes on screen, seconds on the wire — the column's unit. A day is a
  // generous upper bound for a training session.
  durationSeconds: z.int().min(0).max(86_400).nullable(),
  notes: z.string().trim().min(1).max(2_000).nullable(),
});

export type CreateWorkoutInput = z.input<typeof createWorkoutInput>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const parsed = createWorkoutInput.safeParse(input);
  if (!parsed.success) {
    // Never the zod error itself: it spells out the field names and bounds.
    return { ok: false as const, error: "Check the form and try again." };
  }

  const { performedAt, ...values } = parsed.data;
  const instant = new Date(performedAt);

  await createWorkout(userId, { ...values, performedAt: instant });

  revalidatePath("/dashboard");

  // Land on the day the workout was logged, not on today — the two differ
  // whenever the user back-fills a past session.
  redirect(`/dashboard?date=${instantToIsoDate(instant)}`);
}
