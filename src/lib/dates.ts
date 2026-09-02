/**
 * The single place the app decides which calendar day a `timestamptz` belongs
 * to. `workouts.performed_at` is an instant; "all workouts on 2026-09-02" is
 * meaningless until a zone is chosen, and the server's own zone is not it
 * (production runs in UTC). Per-user zones later only have to change this
 * constant into a parameter that is already threaded through every helper.
 */
export const APP_TIME_ZONE = "Europe/Madrid";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** `YYYY-MM-DD` — a calendar day with no instant and no zone attached. */
export type IsoDate = string;

/**
 * Offset of `timeZone` from UTC, in milliseconds, *at the instant `utc`*.
 *
 * Formats the instant as wall-clock time in the zone, then re-reads those
 * fields as if they were UTC; the delta is the offset. Positive east of UTC
 * (Europe/Madrid: +1h in CET, +2h in CEST).
 */
function zoneOffsetMs(utc: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utc);

  const at = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)!.value);

  const asIfUtc = Date.UTC(
    at("year"),
    at("month") - 1,
    at("day"),
    at("hour"),
    at("minute"),
    at("second"),
  );

  return asIfUtc - utc.getTime();
}

/** `YYYY-MM-DD` built from a Date's **UTC** fields. */
export function formatIsoDate(date: Date): IsoDate {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** The UTC instant of local midnight on `date` in `timeZone`. */
export function zonedDayStart(
  date: IsoDate,
  timeZone: string = APP_TIME_ZONE,
): Date {
  const [year, month, day] = date.split("-").map(Number);
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0);

  // First guess: the offset in effect at the naive instant.
  const guess = zoneOffsetMs(new Date(naive), timeZone);
  let timestamp = naive - guess;

  // The naive instant can sit on the far side of a DST transition from the
  // real one, for zones whose offset exceeds the distance to the transition
  // (Pacific/Auckland at +13 does this; Madrid at +1/+2 never can). Re-derive
  // at the candidate and correct once.
  //
  // If a DST gap ever swallowed local midnight itself — a time that does not
  // exist — this would settle on one side arbitrarily. Madrid transitions at
  // 02:00/03:00 local, so that cannot happen here.
  const actual = zoneOffsetMs(new Date(timestamp), timeZone);
  if (actual !== guess) timestamp = naive - actual;

  return new Date(timestamp);
}

/** Calendar-day arithmetic on the string itself — never `+ 86_400_000`. */
export function addDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number);
  return formatIsoDate(new Date(Date.UTC(year, month - 1, day + days)));
}

/**
 * Half-open `[start, end)` UTC bounds for one local day.
 *
 * `end` is the *next day's* midnight rather than `start + 24h`, which is what
 * makes the 25-hour DST fall-back day (and the 23-hour spring-forward day)
 * come out right for free.
 */
export function zonedDayRange(
  date: IsoDate,
  timeZone: string = APP_TIME_ZONE,
): { start: Date; end: Date } {
  return {
    start: zonedDayStart(date, timeZone),
    end: zonedDayStart(addDays(date, 1), timeZone),
  };
}

/** Today's calendar date in `timeZone`, as `YYYY-MM-DD`. */
export function todayInZone(timeZone: string = APP_TIME_ZONE): IsoDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const at = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value;

  return `${at("year")}-${at("month")}-${at("day")}`;
}

/**
 * Read the `?date=` search param. Anything unusable falls back to today: a
 * malformed date is a typo or a stale link, not a missing resource, so a 404
 * on the main dashboard would be hostile.
 */
export function parseDateParam(
  raw: string | string[] | undefined,
  timeZone: string = APP_TIME_ZONE,
): IsoDate {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !ISO_DATE_RE.test(value)) return todayInZone(timeZone);

  const [year, month, day] = value.split("-").map(Number);
  if (year < 1900 || year > 2100) return todayInZone(timeZone);

  // Round-trip rejects dates the regex accepts but the calendar does not:
  // `Date.UTC` silently rolls 2026-02-31 over to March 3rd.
  const roundTrip = formatIsoDate(new Date(Date.UTC(year, month - 1, day)));
  return roundTrip === value ? value : todayInZone(timeZone);
}

/** Parse `YYYY-MM-DD` into a Date whose *local* fields are that calendar day.
 *
 * `new Date("2026-09-02")` is not this: the spec parses date-only ISO strings
 * as UTC midnight, which reads back as the previous day in any negative-offset
 * locale. Used for the calendar widget, which thinks in local Dates.
 */
export function isoDateToLocalDate(date: IsoDate): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** `YYYY-MM-DD` from a Date's **local** fields — the inverse of the above. */
export function localDateToIsoDate(date: Date): IsoDate {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// A fixed locale, not the ambient one: `undefined` resolves to the server's
// locale during SSR and the browser's on the client, which is a hydration
// mismatch waiting to happen.
const LONG_DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "full" });
const TIME_OF_DAY = new Intl.DateTimeFormat("en-GB", {
  timeStyle: "short",
  timeZone: APP_TIME_ZONE,
});

/** e.g. `Wednesday 2 September 2026`. */
export function formatLongDate(date: IsoDate): string {
  return LONG_DATE.format(isoDateToLocalDate(date));
}

/**
 * Wall-clock time of an instant, in the app's zone. The zone is pinned: format
 * in the server's zone instead and a 00:30 Madrid workout renders as "22:30"
 * on a card filed under the *next* day's heading.
 */
export function formatTimeOfDay(instant: Date): string {
  return TIME_OF_DAY.format(instant);
}

/** `45 min`, `1 h 2 min` — `null` in, `null` out, so callers can omit it. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** `24:30`, `1:02:45` — for timed sets, where seconds matter. */
export function formatClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(secs)}`
    : `${minutes}:${pad(secs)}`;
}
