import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { currentTimeOfDayInZone, todayInZone } from "@/lib/dates";

import { NewWorkoutForm } from "./new-workout-form";

export default async function NewWorkoutPage() {
  const { userId } = await auth();
  // The proxy already gates everything under /dashboard; this is the page
  // refusing to render without an identity of its own accord.
  if (!userId) redirect("/sign-in");

  // Computed here, not in the form: "now" on the server is the app's zone,
  // while "now" in the browser is the visitor's, and the two would disagree
  // across hydration.
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
          render={<Link href="/dashboard" />}
        >
          <ArrowLeftIcon />
          Back to workouts
        </Button>

        <h1 className="text-2xl font-semibold tracking-tight">New workout</h1>
        <p className="text-sm text-muted-foreground">
          Log a training session; exercises and sets come next.
        </p>
      </div>

      <NewWorkoutForm
        defaultDate={today}
        defaultTime={currentTimeOfDayInZone()}
        maxDate={today}
      />
    </main>
  );
}
