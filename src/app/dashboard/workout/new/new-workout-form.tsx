"use client";

import { useState, useTransition } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  formatLongDate,
  isoDateToLocalDate,
  localDateToIsoDate,
  zonedDateTimeToInstant,
  type IsoDate,
} from "@/lib/dates";

import { createWorkoutAction } from "./actions";

/**
 * The new-workout form.
 *
 * Not a reusable presentational component (see docs/ui.md §1): it is a
 * route-local composition of shadcn primitives whose only reason to exist as
 * its own file is `"use client"` — `page.tsx` is a Server Component and cannot
 * carry `onSubmit`. It owns the interaction and nothing else: the defaults
 * arrive as props from the server, and the write goes through the colocated
 * Server Action (docs/data-mutation.md §5), never through `fetch`.
 */
export function NewWorkoutForm({
  defaultDate,
  defaultTime,
  maxDate,
}: {
  defaultDate: IsoDate;
  defaultTime: string;
  maxDate: IsoDate;
}) {
  const [name, setName] = useState("");
  const [date, setDate] = useState<IsoDate>(defaultDate);
  const [time, setTime] = useState(defaultTime);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("kg");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Stays true until the action's `redirect()` has rendered the dashboard, so
  // the button reads as busy for the whole round trip.
  const [pending, startTransition] = useTransition();

  const selected = isoDateToLocalDate(date);

  function handleSelectDay(day: Date | undefined) {
    // react-day-picker fires with `undefined` when the selected day is clicked
    // again; a workout always has a day, so that is a no-op.
    if (!day) return;

    setCalendarOpen(false);
    setDate(localDateToIsoDate(day));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createWorkoutAction({
        name: name.trim() || null,
        // The day and the time of day are wall-clock in the app's zone; the
        // column stores the instant they resolve to.
        performedAt: zonedDateTimeToInstant(date, time).toISOString(),
        weightUnit,
        durationSeconds: durationMinutes
          ? Math.round(Number(durationMinutes) * 60)
          : null,
        notes: notes.trim() || null,
      });

      // A successful action redirects, so anything returned is a failure the
      // form has to show.
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Session details</CardTitle>
          <CardDescription>
            Only the date and time are required — you can add the exercises
            afterwards.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              maxLength={120}
              placeholder="Push day"
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger
                  id="date"
                  disabled={pending}
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start font-normal"
                    />
                  }
                >
                  <CalendarIcon />
                  {formatLongDate(date)}
                </PopoverTrigger>

                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    autoFocus
                    selected={selected}
                    defaultMonth={selected}
                    // A session cannot have happened in the future.
                    disabled={{ after: isoDateToLocalDate(maxDate) }}
                    onSelect={handleSelectDay}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                required
                value={time}
                disabled={pending}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Input
                id="duration"
                type="number"
                min={0}
                max={1440}
                step={1}
                inputMode="numeric"
                placeholder="60"
                value={durationMinutes}
                disabled={pending}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="weight-unit">Weight unit</Label>
            <Select
              value={weightUnit}
              disabled={pending}
              onValueChange={(value) => setWeightUnit(value as "kg" | "lb")}
            >
              <SelectTrigger id="weight-unit" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="lb">lb</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Applies to every set logged in this session.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              maxLength={2000}
              placeholder="How it went, how you felt, anything worth remembering."
              disabled={pending}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Create workout"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
