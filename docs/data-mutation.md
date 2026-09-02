# Data mutation standards

These rules apply to **every** write of application data in this project —
inserts, updates and deletes. They are not suggestions; a change that breaks
them does not get merged.

Reads are covered by [`docs/data-fetching.md`](./data-fetching.md); identity is
covered by [`docs/auth.md`](./auth.md). Both are binding here too.

The shape of every mutation in this app is the same, and there is no second
shape:

```
Client Component (form / button)
  └─ calls a Server Action in a colocated actions.ts   ← §1
       └─ auth() → userId                              ← §4
       └─ zod.parse(input)                             ← §3
       └─ calls a helper in src/data/*                 ← §2
            └─ Drizzle write, scoped by userId         ← §2, §4
       └─ revalidatePath() / redirect()                ← §5
```

## 1. Every mutation is a Server Action in a colocated `actions.ts`

**All data mutations MUST go through a Server Action**, and every Server Action
lives in a file named **`actions.ts`, colocated with the route that uses it**.

```
src/app/dashboard/
  page.tsx
  actions.ts        ← the dashboard's mutations
src/app/workouts/new/
  page.tsx
  new-workout-form.tsx
  actions.ts        ← this route's mutations
```

- The file starts with `"use server"` on its first line, and **every export in
  it is an async Server Action**. Nothing else is exported from `actions.ts` —
  no types-only helpers, no constants, no schemas that other files import as
  values.
- One `actions.ts` per route segment that mutates. Do not create a shared
  `src/actions/` directory, and do not put actions in `src/lib/` or
  `src/data/`.
- Do not put `"use server"` at the top of a component file, and do not use
  inline `"use server"` function bodies inside a component.
- An action lives in the segment that owns the interaction. If two segments
  need the same mutation, the shared part is the `src/data/` helper — duplicate
  the thin action, not the query.
- Action names are verbs: `createWorkout`, `addSetToExercise`, `deleteWorkout`.

### Explicitly forbidden

- **No Route Handlers for writes.** Do not add `src/app/api/**/route.ts` to let
  the app's own UI mutate. The app never calls its own HTTP API. (Route
  Handlers remain acceptable only for genuine third-party inbound traffic, such
  as a webhook — that is not an app mutation path.)
- **No mutations from Client Components.** No `fetch("/api/...", { method:
  "POST" })`, no `axios.post`, no mutation library (TanStack Query mutations,
  SWR mutate, …). A Client Component imports the action and calls it.
- **No `db` import outside `src/data/`** — including inside `actions.ts`. See
  §2.
- **No Server Action used to read data for rendering.** Actions mutate; Server
  Components fetch (`docs/data-fetching.md` §1).

## 2. The write itself lives in `src/data/`

**A Server Action never touches the database directly. It calls a helper
function exported from `src/data/`, and that helper is the only thing that
wraps the Drizzle call.**

- Same directory and same file-per-domain-concept as reads
  (`src/data/workouts.ts`, `src/data/exercises.ts`, …). Reads and writes for
  one concept share the file.
- Nothing outside `src/data/` imports `@/db` — `actions.ts` included.
- Helpers are plain `async` functions with explicit, typed arguments. They know
  nothing about React, requests, Clerk, `revalidatePath`, or forms: they take
  values and return rows.
- **All writes go through Drizzle** — `db.insert()`, `db.update()`,
  `db.delete()`. No raw SQL statements, no `db.execute("insert ...")`, no
  `sql.raw()`, no direct use of the Neon client. (The `sql` tag stays allowed
  only for small typed expression fragments inside a Drizzle call.)
- Return what the caller needs with `.returning()`, and export the row type
  alongside the helper:

  ```ts
  // src/data/workouts.ts
  import { db } from "@/db";
  import { workouts } from "@/db/schema";

  export async function createWorkout(
    userId: string,
    values: { name: string | null; performedAt: Date; weightUnit: "kg" | "lb" },
  ) {
    const [workout] = await db
      .insert(workouts)
      .values({ ...values, userId })
      .returning();

    return workout;
  }

  export type CreatedWorkout = Awaited<ReturnType<typeof createWorkout>>;
  ```

- A multi-table write (a workout with its exercises and sets) is **one**
  helper wrapping **one** transaction. Never let an action orchestrate several
  helpers to build one logical record — a half-written workout is a bug the
  data layer must make impossible.

## 3. Every action validates its arguments with zod

**A Server Action is a public HTTP endpoint.** Its arguments arrive from the
network and are attacker-controlled, whatever TypeScript says at the call site.
TypeScript is erased at runtime; it is not validation.

- Every Server Action **MUST** parse its input with a zod schema before doing
  anything else with it.
- The schema is defined in the same `actions.ts`, immediately above the action,
  and is not exported (see §1 — `actions.ts` exports only actions).
- Use `.parse()` and let it throw, or `.safeParse()` when the action returns a
  result the UI renders (see §5). Never use the raw input on the unvalidated
  path.
- Validate the **whole** input, including ids: `z.uuid()`, not `z.string()`.
  Bound every free-text field with `.max()`, every number with `.int()` /
  `.min()` / `.max()`, and every enum with `z.enum()` matching the pgEnum.
- Validation is not authorisation. Passing zod proves the shape is well-formed,
  never that the row belongs to the caller — §4 does that.

```ts
// src/app/dashboard/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createWorkout } from "@/data/workouts";

const createWorkoutInput = z.object({
  name: z.string().trim().min(1).max(120).nullable(),
  performedAt: z.iso.datetime(),
  weightUnit: z.enum(["kg", "lb"]),
});

export type CreateWorkoutInput = z.input<typeof createWorkoutInput>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const { name, performedAt, weightUnit } = createWorkoutInput.parse(input);

  const workout = await createWorkout(userId, {
    name,
    performedAt: new Date(performedAt),
    weightUnit,
  });

  revalidatePath("/dashboard");

  return workout;
}
```

`zod` is the only validation library in this project. Do not add yup, joi,
valibot, or hand-rolled `if (typeof x !== "string")` checks.

## 4. Identity and ownership

- The `userId` comes from `await auth()` **inside the action**, exactly as in
  [`docs/auth.md`](./auth.md) §3. It is never a parameter of the action, never
  part of the zod schema, and never read from the client — a `userId` the
  caller can type is not an identity.
- If `userId` is null the action stops. It does not write and does not fall
  back to anything.
- `userId` is the **first parameter** of every `src/data/` write helper,
  required and never optional — the same contract as reads
  (`docs/data-fetching.md` §4).
- Inserts stamp the authenticated `userId`. Updates and deletes match on
  `{ id, userId }` in the `where` clause, so an id belonging to someone else
  affects **zero rows** — never fetch, check ownership in JavaScript, then
  write.
- Child rows (`workout_exercises`, `workout_sets`) carry no `user_id`. A write
  to them is only legal after proving the parent `workouts` row belongs to the
  caller, inside the same helper and the same transaction. Never accept a
  `workoutExerciseId` and write to it on trust.
- Row counts are the check: a helper that updates or deletes reports whether it
  matched, and an action that matched nothing treats that as "not found", never
  as success.

## 5. Action signatures, `formData`, and results

### Typed parameters — never `FormData`

**A Server Action's parameters MUST be explicitly typed, and `FormData` is
forbidden.** No `formData: FormData` parameter, no `action={myAction}` on a
`<form>`, no `useActionState` binding that hands the action a `FormData`.

- Actions take plain, serialisable, explicitly typed arguments — normally a
  single object typed from the zod schema (`z.input<typeof schema>`), which
  keeps the runtime contract and the compile-time contract from drifting.
- Never type a parameter as `any`, `unknown`, or an inline shape that
  contradicts the schema.
- Forms are Client Components that hold their own state and call the action in
  an event handler (or through `useTransition`), passing a typed object.
- `FormData` is banned because it is untyped, stringly-typed at every field,
  and hides the input shape from both the compiler and the reader. Read the
  values in the Client Component, build the typed object, call the action.

```tsx
"use client";

import { useTransition } from "react";

import { createWorkoutAction } from "./actions";

export function NewWorkoutForm() {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      await createWorkoutAction({
        name: name || null,
        performedAt: new Date().toISOString(),
        weightUnit: "kg",
      });
    });
  }

  // ...
}
```

### Return values

- An action returns either the created/updated data, or a small serialisable
  result object. Return types are explicit or inferred from the helper — never
  `any`.
- Expected, user-facing failures (validation, "not found") are **returned**, so
  the UI can render them:

  ```ts
  const parsed = createWorkoutInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Check the form and try again." };
  }
  ```

- Unexpected failures throw and are handled by `error.tsx`. Never swallow an
  error and return a success-shaped result.
- Never return a raw zod error, a Drizzle error, or a database message to the
  client — they leak schema details. Return a message written for the user.

### After the write

- Refresh server data with `revalidatePath()` / `revalidateTag()` from
  `next/cache` **in the action**, after the helper resolves. Never re-fetch on
  the client to "refresh the screen".
- `redirect()` from `next/navigation` goes last, after revalidation. It throws
  by design — do not wrap it in a `try`/`catch`.

## 6. Checklist before opening a PR

- [ ] Every write goes through a Server Action in a colocated `actions.ts`
      whose first line is `"use server"`.
- [ ] No Route Handler was added to mutate the app's own data; no Client
      Component posts to an endpoint.
- [ ] `actions.ts` exports only Server Actions, and does not import `@/db`.
- [ ] The Drizzle write lives in an `src/data/*` helper; multi-table writes are
      one helper, one transaction.
- [ ] No raw SQL statement anywhere.
- [ ] Every action parses its input with a zod schema before using it, ids
      included.
- [ ] Every action parameter is explicitly typed; **no `FormData` parameter**
      and no `<form action={...}>` binding.
- [ ] `userId` comes from `await auth()` inside the action, is never an action
      parameter, and is the first argument to the data helper.
- [ ] Updates and deletes match on `{ id, userId }`; child rows are written
      only through an ownership-checked parent.
- [ ] Errors returned to the client are user-facing messages, not raw zod or
      database errors.
- [ ] The action revalidates the affected paths, and redirects last.
- [ ] `npm run lint` passes.
