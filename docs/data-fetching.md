# Data fetching standards

These rules apply to **every** read of application data in this project. They
are not suggestions; a change that breaks them does not get merged.

## 1. Server Components only

**ALL data fetching happens in React Server Components.** There is no second
way to do it.

A page or layout under `src/app/**` that needs data is an `async` Server
Component that awaits the data directly:

```tsx
// src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { getWorkoutsForDay } from "@/data/workouts";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) return null; // the route is already gated by src/proxy.ts

  const workouts = await getWorkoutsForDay(userId, "2026-09-02");

  return /* ... */;
}
```

### Explicitly forbidden

- **No Route Handlers for reads.** Do not add `src/app/api/**/route.ts` to feed
  the app's own UI. The app never calls its own HTTP API to render a page.
- **No fetching in Client Components.** No `fetch()` in a `"use client"` file,
  no `useEffect` + `setState` data loading, no `useSWR`, no TanStack Query, no
  `axios`. A Client Component receives data **as props** from a Server
  Component, and nothing else.
- **No client-side data libraries at all.** Do not install one. If the answer to
  a problem seems to be a client cache, the answer is actually "move the fetch
  up into the Server Component".
- **No `getServerSideProps` / `getStaticProps`.** This is the App Router.
- **No fetching from Server Actions to render.** Server Actions are for
  mutations. They must not be used as a data-loading channel.

### Where the rule ends

- Interactivity still lives in Client Components: a date picker, a popover, a
  form. The Client Component owns the *interaction*; the Server Component owns
  the *data*.
- When a user interaction must change what data is shown, drive it through the
  URL (a search param) and let the Server Component re-render with the new
  params — never by fetching from the client.
- Streaming is encouraged: `loading.tsx` and `<Suspense>` around a slow Server
  Component are the correct way to keep a page responsive.

## 2. Every query lives in `src/data/`

**Database access is only ever performed by a helper function exported from the
`src/data/` directory.** One file per domain concept
(`src/data/workouts.ts`, `src/data/exercises.ts`, …).

- A Server Component **never** imports `db` and never builds a query inline. It
  imports a named helper from `@/data/*` and awaits it.
- Nothing outside `src/data/` may import from `@/db`.
- Helpers are plain `async` functions with explicit arguments and inferred
  return types. Export the row types alongside them so pages can be typed:

  ```ts
  export type WorkoutWithDetails = Awaited<
    ReturnType<typeof getWorkoutsForDay>
  >[number];
  ```

- `src/lib/` is for pure, data-less helpers (formatting, `cn()`, date shaping).
  Never put a query there.

## 3. Drizzle ORM only — never raw SQL

**All queries go through Drizzle.** Use the relational API (`db.query.*`) or
the query builder (`db.select().from(...)`).

```ts
import { db } from "@/db";

return db.query.workouts.findMany({
  where: { userId, performedAt: { gte: start, lt: end } },
  orderBy: { performedAt: "asc" },
  with: { exercises: { with: { exercise: true, sets: true } } },
});
```

- **No raw SQL strings.** No `db.execute("select ...")`, no template-literal
  queries, no string concatenation into a query, no `sql.raw()`, no direct use
  of the Neon client.
- The `sql` tag from `drizzle-orm` is allowed **only** for small typed
  expression fragments inside a Drizzle query (a `check` constraint in
  `src/db/schema.ts`, a `count(*)`, an ordering expression). It is never a way
  to write a whole statement.
- Drizzle v1 notes that apply here: relations are declared with
  `defineRelations` in `src/db/relations.ts` and `where` is a **filter object**
  (`{ userId, performedAt: { gte: start } }`), not the old
  `(t, { and, eq }) => ...` callback. Sibling keys are AND-ed.

## 4. A user may only ever read their own data

This is the most important rule on this page. **A logged-in user must never be
able to read another user's rows.** Not through a crafted id, not through a
missing filter, not through a relation that forgot to check ownership.

### The `userId` contract

- Every helper in `src/data/` that touches user-owned data takes `userId` as
  its **first parameter**. It is required. It is never optional and never has a
  default.
- The caller obtains it from Clerk on the server:

  ```ts
  import { auth } from "@clerk/nextjs/server";

  const { userId } = await auth();
  ```

- `userId` **never** comes from a prop, a search param, a request body, a
  cookie the app wrote, or a client component. If a value that identifies the
  user can be typed by the user, it is not an identity — it is an attack.
- If `userId` is null, the caller does not query. It redirects or renders
  nothing. A helper is never invoked with a falsy user id.

### Filtering

- Every query against a user-owned table (`workouts`, and anything reached
  through it) is filtered by `userId` **in the query itself**. Never fetch and
  then filter in JavaScript — that has already leaked the rows into the process
  and into any log or error.
- Fetching a single row by id is `where: { id, userId }` — **both**. An id
  alone is a guess away from another user's data.
- Rows reached through a relation are scoped by their root: `workoutExercises`
  and `workoutSets` have no `userId` of their own, so they may only ever be
  loaded **through** a `workouts` query already filtered by `userId`. Never
  query them by their own id at the top level.
- `exercises` is the one mixed table: `user_id IS NULL` is a shared system
  exercise, a non-null `user_id` is private. A catalog read must therefore be
  `where: { OR: [{ userId: null }, { userId }] }` — never unfiltered.
- A helper that legitimately returns nothing for this user returns an empty
  array or `null`. It does not fall back to unscoped data.

### Mutations

The same contract applies to writes: inserts stamp the authenticated `userId`,
and updates and deletes match on `{ id, userId }` so that an id belonging to
someone else affects zero rows.

## 5. Checklist before opening a PR

- [ ] Data is awaited inside an `async` Server Component; no `"use client"`
      file fetches anything.
- [ ] No Route Handler was added to serve the app's own UI.
- [ ] No client data-fetching library was introduced.
- [ ] Every query lives in a `src/data/*` helper; nothing outside `src/data/`
      imports `@/db`.
- [ ] Every query is written with Drizzle; no raw SQL statement anywhere.
- [ ] Every user-owned query is filtered by a `userId` that came from `auth()`.
- [ ] Single-row lookups match on `{ id, userId }`, not on `id` alone.
- [ ] Child rows (`workout_exercises`, `workout_sets`) are only reachable
      through an ownership-filtered parent query.
- [ ] `npm run lint` passes.
