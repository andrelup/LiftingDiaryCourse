# Server Component standards

These rules apply to **every** file under `src/app/` — pages, layouts and the
Client Components they render. They are not suggestions; a change that breaks
them does not get merged.

Reads are covered by [`docs/data-fetching.md`](./data-fetching.md), writes by
[`docs/data-mutation.md`](./data-mutation.md), identity by
[`docs/auth.md`](./auth.md), and what is rendered by [`docs/ui.md`](./ui.md).
All four are binding here too. This file is about the *component model*: what
runs on the server, what may run in the browser, and how a request reaches
either.

## 1. Server by default, client at the leaves

**Every file under `src/app/` is a Server Component unless it has a concrete
reason not to be.** `"use client"` is not a default and it is not a
convenience; it is a boundary, and everything imported below it ships to the
browser.

- `page.tsx` and `layout.tsx` are **always** Server Components. They are never
  marked `"use client"`.
- The only reason to open a client boundary is *interaction the server cannot
  express*: an event handler, React state, a browser API, an effect.
- Push the boundary as far down the tree as it will go. A page with one
  interactive control is a Server Component that renders one small Client
  Component — not a client page with a server-shaped hole in it.
- A Client Component that needs data receives it **as props**. It does not
  fetch, and it does not import from `@/data/*` or `@/db`.

A route-local Client Component lives in its own file next to the page that
renders it, named after what it does (`date-picker.tsx`,
`edit-workout-form.tsx`). That file is not a reusable presentational component
— see `docs/ui.md` §1 — it exists because `page.tsx` cannot carry `onSubmit`.

### Explicitly forbidden

- `"use client"` on a `page.tsx`, a `layout.tsx`, or on a file whose only job is
  rendering markup.
- `"use client"` added to silence an error. Read the error: it almost always
  means an interactive concern is sitting too high in the tree.
- Importing a server-only module (`@/db`, `@/data/*`, `@clerk/nextjs/server`,
  anything reading a secret from `process.env`) from a file below a client
  boundary.

## 2. `params` and `searchParams` are Promises — always `await` them

**This is the rule that breaks the most training-data habits.** In this version
of Next (App Router, 15 onwards; this repo is on 16), the dynamic route
segments and the query string reach a page **asynchronously**. `params` and
`searchParams` are `Promise`s, and their values are only readable after an
`await`.

```tsx
// src/app/dashboard/workout/[workoutId]/page.tsx
export default async function EditWorkoutPage({
  params,
}: PageProps<"/dashboard/workout/[workoutId]">) {
  const { workoutId } = await params; // ← awaited, always

  // ...
}
```

```tsx
// src/app/dashboard/page.tsx
export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const { date } = await searchParams; // ← awaited, always
}
```

Consequences, none of them optional:

- A page or layout that reads `params` or `searchParams` is `async`. There is
  no synchronous version of this.
- **Never destructure them in the function signature.**
  `{ params: { workoutId } }` does not type-check and does not work: it
  destructures a Promise.
- **Never read a property off the Promise.** `params.workoutId` is a type error,
  and `undefined` at runtime. Code that "seems to work" that way is reading off
  a Promise object.
- `await` them **once**, at the top of the component, and pass the resolved
  values down. Do not thread the Promise itself into a helper.
- Inline is fine when the value is used once:
  `parseDateParam((await searchParams).date)`.
- A `searchParams` value is `string | string[] | undefined`, and the visitor
  controls it. Narrow and validate it before use; never pass it straight into a
  query.

### Typing: use the generated `PageProps` / `LayoutProps`

Next generates a global helper per route into `.next/types/routes.d.ts`. Use it
rather than hand-writing the props type — it keeps the segment names honest and
already types `params` and `searchParams` as Promises.

```tsx
export default async function Page(props: PageProps<"/dashboard/workout/[workoutId]">)
export default async function Layout(props: LayoutProps<"/dashboard">)
```

The route literal must match the folder path exactly, brackets included. If
TypeScript reports that the literal `does not satisfy the constraint 'AppRoutes'`,
the generated types are stale after adding the segment — regenerate them:

```bash
npx next typegen
```

Do not work around a stale type by hand-writing `{ params: Promise<{ ... }> }`,
and do not reach for `any`.

### Client Components and `use()`

A Client Component does not receive `params`; it receives resolved props from
its Server Component parent, and that is the shape this project uses. React's
`use()` hook can unwrap a Promise passed into a Client Component, but reaching
for it here means data-shaping leaked into the browser — resolve it on the
server and pass the value.

## 3. Every other request API is async too

The same `await` applies to the rest of the request-scoped APIs. None of them
are synchronous in this version:

```ts
import { auth } from "@clerk/nextjs/server";
import { cookies, headers } from "next/headers";

const { userId } = await auth();
const cookieStore = await cookies();
const headerList = await headers();
```

`draftMode()` and `connection()` behave the same way. A snippet from memory
that calls one of these without `await` is a snippet from an older Next.

## 4. Validate the segment before it reaches the database

A dynamic segment is a string the visitor typed. It is not an id yet.

- Check its shape in the page, with zod, before handing it to a query. A
  non-uuid reaching Postgres is a cast error, which surfaces as a **500 where a
  404 was correct**.
- A segment is never an identity. `userId` comes from `auth()` and nowhere else
  (`docs/auth.md` §4); a route param may only ever be a *row* id, and it is
  always paired with `userId` in the query (`docs/data-fetching.md` §4).
- A row that does not exist and a row owned by somebody else are the **same
  answer**: `notFound()`. Never a response that distinguishes them.

```tsx
const { workoutId } = await params;
if (!z.uuid().safeParse(workoutId).success) notFound();

const workout = await getWorkoutById(userId, workoutId);
if (!workout) notFound();
```

Redirect with `redirect()` and 404 with `notFound()`, both from
`next/navigation`. Both throw, so nothing after them runs — do not wrap them in
`try` / `catch`, and do not `return` their result.

## 5. Resolve on the server, render on the client

Whatever the browser does not need to decide, the server decides.

- Anything that depends on a time zone, a locale or the current date is
  computed in the Server Component through `src/lib/dates.ts` and passed down as
  a plain value. The visitor's own zone never participates — that is what
  produces a hydration mismatch, and what makes a server running in UTC render
  the wrong day.
- Props crossing the boundary must be serializable: strings, numbers, booleans,
  plain objects and arrays of those. No class instances and no functions — a
  Server Action is the one exception, because it is designed to cross.
- Format for display on the server when the value is static; format in the
  client only when it changes with interaction.

## 6. Checklist before opening a PR

- [ ] `page.tsx` and `layout.tsx` are Server Components; no `"use client"` on
      them.
- [ ] Every `"use client"` file exists because of interaction, and sits as low
      in the tree as possible.
- [ ] `params` and `searchParams` are `await`ed — never destructured in the
      signature, never read as properties of the Promise.
- [ ] The page's props are typed with `PageProps<"...">` / `LayoutProps<"...">`,
      and `npx next typegen` has been run if a segment was added.
- [ ] `auth()`, `cookies()` and `headers()` are `await`ed.
- [ ] Every dynamic segment is shape-validated before it reaches a query, and
      paired with a `userId` that came from `auth()`.
- [ ] Missing and foreign rows both end in `notFound()`.
- [ ] Client Components receive data as props; none of them fetch.
- [ ] `npm run lint` passes and `npx tsc --noEmit` is clean.
