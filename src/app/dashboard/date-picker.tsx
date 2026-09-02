"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatLongDate,
  isoDateToLocalDate,
  localDateToIsoDate,
  type IsoDate,
} from "@/lib/dates";

/**
 * The dashboard's day selector.
 *
 * Not a reusable presentational component (see docs/ui.md §1): it is a
 * route-local composition of shadcn primitives whose only reason to exist as
 * its own file is `"use client"` — `page.tsx` is a Server Component and cannot
 * carry `onSelect`. It renders nothing of its own design and owns no data:
 * picking a day only writes `?date=` to the URL, and the Server Component
 * re-runs the query from there (docs/data-fetching.md §1).
 */
export function DatePicker({ value, max }: { value: IsoDate; max: IsoDate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // `router.push` inside a transition keeps `pending` true until the server
  // has rendered the new day, which is what makes the trigger show progress.
  const [pending, startTransition] = useTransition();

  const selected = isoDateToLocalDate(value);

  function handleSelect(day: Date | undefined) {
    // react-day-picker fires with `undefined` when the selected day is clicked
    // again; there is no "no day" state here, so that is a no-op.
    if (!day) return;

    setOpen(false);

    const date = localDateToIsoDate(day);
    if (date === value) return;

    startTransition(() => {
      // `scroll: false` — the header stays put, only the list below changes.
      router.push(`/dashboard?date=${date}`, { scroll: false });
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={pending}
        render={
          <Button variant="outline" className="w-[190px] justify-start" />
        }
      >
        <CalendarIcon />
        {formatLongDate(value)}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="single"
          autoFocus
          selected={selected}
          defaultMonth={selected}
          // Nothing can have been logged in the future.
          disabled={{ after: isoDateToLocalDate(max) }}
          onSelect={handleSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
