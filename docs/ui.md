# UI coding standards

These rules apply to **every** piece of UI in this project. They are not
suggestions; a change that breaks them does not get merged.

## 1. shadcn/ui only

**ONLY shadcn/ui components may be used to build the UI.**
**ABSOLUTELY NO custom components may be created.**

- Every visual element on screen must come from a shadcn/ui component installed
  into `src/components/ui/`.
- If a screen needs something that is not on screen yet, the answer is always
  "install the shadcn component", never "write one".
- Do not hand-roll a button, card, dialog, input, badge, table, dropdown,
  tooltip, skeleton, calendar, popover, or anything else that shadcn/ui ships.
  Install it and use it.
- Do not wrap a shadcn component in your own component just to change its look,
  and do not fork one into a new file under a different name. Use the component
  as published, with its documented `variant` / `size` props.

### Installing a component

```bash
npx shadcn@latest add <component>
```

The project's registry settings live in `components.json` — style `base-nova`,
base color `neutral`, icons from `lucide-react`, RSC on, aliases `@/components`,
`@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`. Never edit
`components.json` to work around a missing component.

Generated files land in `src/components/ui/`. Treat that directory as
**generated code**: do not restyle it, do not add props to it, do not refactor
it. It must stay re-generatable by re-running `shadcn add`.

### Where the rule ends

The ban is on *components*. It is not a ban on composition or on data:

- **Allowed**: composing shadcn primitives together inside a route file or a
  page-level file (`<Card>` containing `<Badge>` and `<Button>`), Tailwind
  utility classes on shadcn components, layout wrappers (`div`, `ol`, `section`)
  used purely for spacing and structure, and plain data-shaping helpers in
  `src/lib/`.
- **Not allowed**: any new file that exports a reusable presentational
  component of your own design.

### Styling

- Tailwind CSS v4 utilities only, applied via the component's `className`.
- Merge classes with `cn()` from `@/lib/utils`. Never concatenate class strings
  by hand.
- Use the design tokens from `src/app/globals.css` (`text-muted-foreground`,
  `border-border`, `bg-card`, `text-destructive`, …). No hard-coded hex colours,
  no arbitrary colour values.
- Icons come from `lucide-react`. No inline SVG, no other icon set.

## 2. Dates

**All date formatting goes through `date-fns`.** No `toLocaleDateString`, no
`Intl.DateTimeFormat`, no manual string building, no other date library.

```bash
npm install date-fns
```

### The format

Dates are rendered as **day-of-month with its ordinal suffix, short month,
four-digit year**:

```
1st Sep 2025
2nd Aug 2025
3rd Jan 2026
4th Jun 2024
```

That is the `date-fns` pattern `do MMM yyyy`:

```ts
import { format } from "date-fns";

format(date, "do MMM yyyy"); // "1st Sep 2025"
```

Rules:

- The month is a three-letter abbreviation with a capital first letter
  (`Sep`, `Aug`, `Jan`, `Jun`) — `MMM`, exactly as `date-fns` emits it.
- The day carries its English ordinal suffix (`1st`, `2nd`, `3rd`, `4th`) —
  `do`. Never a zero-padded day, never a bare number.
- The year is always four digits — `yyyy`. Never `yy`, never omitted.
- No commas, no separators: three space-separated parts.
- Locale is English; do not pass a `locale` option.

### Where to put it

Date formatting lives in `src/lib/dates.ts` and is imported from there. Do not
call `format()` inline in a component and do not invent a second formatting
helper for the same shape — one exported function per date shape, reused
everywhere.

### Times and durations

Times of day and durations also belong in `src/lib/dates.ts` and also go
through `date-fns`. Keep them as separate exported helpers; do not fold a time
into the date pattern above.

### Storage vs display

The `do MMM yyyy` format is for **display only**. Dates crossing an API,
a query string, a `<input type="date">`, or the database stay in ISO
(`yyyy-MM-dd`) — use `date-fns` `format(date, "yyyy-MM-dd")` / `parseISO()`
for that conversion.

## 3. Checklist before opening a PR

- [ ] Every component rendered comes from `@/components/ui/*` (shadcn).
- [ ] No new presentational component file was added.
- [ ] `src/components/ui/*` is unmodified apart from files added by
      `shadcn add`.
- [ ] Colours and spacing use tokens and Tailwind utilities, merged with `cn()`.
- [ ] Every displayed date is formatted with `date-fns` as `do MMM yyyy`.
- [ ] No `toLocaleDateString` / `Intl.DateTimeFormat` anywhere outside
      generated shadcn files.
- [ ] `npm run lint` passes.
