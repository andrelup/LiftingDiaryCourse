"use client";

import * as React from "react";
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
import { cn } from "@/lib/utils";

/**
 * `date` arrives as a prop rather than from `useSearchParams()`: the server
 * already parsed and validated the param, and re-deriving it here would
 * duplicate the fallback logic and risk disagreeing with what was queried.
 */
export function WorkoutDatePicker({ date }: { date: IsoDate }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  const selected = isoDateToLocalDate(date);

  function handleSelect(next: Date) {
    const iso = localDateToIsoDate(next);
    setOpen(false);
    if (iso === date) return;

    // Inside a transition, React keeps the current results mounted instead of
    // falling back to `loading.tsx` on every date change.
    startTransition(() => {
      router.push(`/dashboard?date=${iso}`, { scroll: false });
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={isPending}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              isPending && "opacity-70",
            )}
          />
        }
      >
        <CalendarIcon />
        {formatLongDate(date)}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          required
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={selected}
          disabled={{ after: new Date() }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
