import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatClock, formatDuration, formatTimeOfDay } from "@/lib/dates";
import type { WorkoutWithDetails } from "@/lib/workouts";
import type { Workout, WorkoutSet } from "@/db";
import { cn } from "@/lib/utils";

/** Set weights are stored in the unit recorded on the workout. */
type WeightUnit = Workout["weightUnit"];

/** How a non-default set type is labelled and coloured. `working` gets no
 * badge at all — a 20-set workout would otherwise be a wall of them. */
const SET_TYPE_BADGE: Record<
  Exclude<WorkoutSet["setType"], "working">,
  { label: string; className: string }
> = {
  warmup: { label: "warm-up", className: "text-muted-foreground" },
  dropset: { label: "drop", className: "text-muted-foreground" },
  backoff: { label: "back-off", className: "text-muted-foreground" },
  failure: { label: "failure", className: "text-destructive" },
};

/** `numeric` columns come back from Drizzle as strings. */
function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

/** `800 m`, `5.00 km`. */
function formatDistance(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(2)} km`;
}

/** `60 s` under a minute, `mm:ss` above it. */
function formatSetDuration(seconds: number): string {
  return seconds < 60 ? `${seconds} s` : formatClock(seconds);
}

/**
 * The one line of a set, in priority order: strength, then reps-only, then the
 * cardio/timed shapes. `String(Number(x))` is deliberate — it renders "80.00"
 * as `80` and "82.50" as `82.5`, which is what a log should show.
 */
function formatSet(set: WorkoutSet, unit: WeightUnit): string {
  const weight = toNumber(set.weight);
  const distance = toNumber(set.distanceMeters);
  const { reps, durationSeconds } = set;

  if (reps !== null && weight !== null) return `${reps} × ${weight} ${unit}`;
  if (reps !== null) return `${reps} reps`;
  if (distance !== null && durationSeconds !== null) {
    return `${formatDistance(distance)} · ${formatClock(durationSeconds)}`;
  }
  if (durationSeconds !== null) return formatSetDuration(durationSeconds);
  if (distance !== null) return formatDistance(distance);

  // Unreachable given workout_sets' "at least one metric" check constraint,
  // but the types don't know that.
  return "—";
}

function SetPill({ set, unit }: { set: WorkoutSet; unit: WeightUnit }) {
  const badge =
    set.setType === "working" ? null : SET_TYPE_BADGE[set.setType];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs tabular-nums",
        set.setType === "warmup" && "text-muted-foreground",
        !set.completed && "line-through opacity-60",
      )}
    >
      {formatSet(set, unit)}
      {badge && (
        <span className={cn("text-[10px] uppercase", badge.className)}>
          {badge.label}
        </span>
      )}
    </span>
  );
}

export function WorkoutCard({ workout }: { workout: WorkoutWithDetails }) {
  const duration = formatDuration(workout.durationSeconds);
  const meta = [formatTimeOfDay(workout.performedAt), duration].filter(
    (part): part is string => part !== null,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{workout.name ?? "Untitled workout"}</CardTitle>
        <CardDescription>{meta.join(" · ")}</CardDescription>
        <CardAction>
          <Badge variant="secondary">{workout.weightUnit}</Badge>
        </CardAction>
      </CardHeader>

      <CardContent>
        {workout.exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">No exercises recorded.</p>
        ) : (
          <ol className="divide-y divide-border">
            {workout.exercises.map((entry, index) => (
              <li key={entry.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="w-5 shrink-0 text-sm text-muted-foreground tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{entry.exercise.name}</p>
                  {entry.notes && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.notes}
                    </p>
                  )}
                  {entry.sets.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {entry.sets.map((set) => (
                        <SetPill
                          key={set.id}
                          set={set}
                          unit={workout.weightUnit}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>

      {workout.notes && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">{workout.notes}</p>
        </CardFooter>
      )}
    </Card>
  );
}
