"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { updateWorkout } from "@/data/workouts";
import { instantToIsoDate } from "@/lib/dates";

/**
 * A Server Action is a public endpoint: everything below arrives from the
 * network, whatever the call site's types claim. `id` is validated like any
 * other field — it is the one input a caller would tamper with on purpose —
 * while `userId` is deliberately absent, because an identity the caller can
 * type is not an identity.
 */
const updateWorkoutInput = z.object({
  id: z.uuid(),
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

export type UpdateWorkoutInput = z.input<typeof updateWorkoutInput>;

export async function updateWorkoutAction(input: UpdateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const parsed = updateWorkoutInput.safeParse(input);
  if (!parsed.success) {
    // Never the zod error itself: it spells out the field names and bounds.
    return { ok: false as const, error: "Check the form and try again." };
  }

  const { id, performedAt, ...values } = parsed.data;
  const instant = new Date(performedAt);

  const workout = await updateWorkout(userId, id, {
    ...values,
    performedAt: instant,
  });

  // Zero rows matched: the id is either gone or somebody else's, and the two
  // are the same answer as far as this user is concerned.
  if (!workout) {
    return { ok: false as const, error: "That workout no longer exists." };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/workout/${id}`);

  // Land on the day the workout now sits on, which is not necessarily the day
  // it was on when the form opened.
  redirect(`/dashboard?date=${instantToIsoDate(instant)}`);
}
