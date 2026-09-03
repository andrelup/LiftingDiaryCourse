# Routing standards

These rules apply to **every** route in this project — the folder structure
under `src/app/`, the URLs it produces, the links between them, and the gate in
`src/proxy.ts`. They are not suggestions; a change that breaks them does not get
merged.

Identity is covered by [`docs/auth.md`](./auth.md), the component model by
[`docs/server-components.md`](./server-components.md), rendering by
[`docs/ui.md`](./ui.md). All of them are binding here too. This file is about
*where a URL lives, and who is allowed to reach it*.

## 1. The application lives under `/dashboard`

**Every route of this application is a `/dashboard` route.** The signed-in
experience has exactly one root, and it is `/dashboard`.

```
/                                     public landing page
/sign-in/[[...sign-in]]               Clerk
/sign-up/[[...sign-up]]               Clerk
/dashboard                            the app
/dashboard/**                         the app
```

- A new feature is a new folder **under `src/app/dashboard/`**. Not a sibling of
  it, not a top-level segment.
- `src/app/workout/`, `src/app/settings/`, `src/app/history/` — all wrong. The
  correct paths are `src/app/dashboard/workout/`,
  `src/app/dashboard/settings/`, `src/app/dashboard/history/`.
- The only routes allowed outside `/dashboard` are the three above: the public
  landing page at `/`, and Clerk's sign-in and sign-up catch-alls. Adding a
  fourth is a decision, not a detail — it does not happen incidentally while
  building a feature.
- This is not cosmetic. Protection is by prefix (§3): a page placed outside
  `/dashboard` is a page nothing gates.

### Naming segments

- Folder names are lowercase, hyphenated, and read as nouns in a URL:
  `workout`, `workout/new`, `exercise-catalog`. No camelCase, no underscores, no
  plural/singular drift within a feature.
- Dynamic segments are named after what they hold, with the type included:
  `[workoutId]`, `[exerciseId]` — not `[id]`, not `[slug]`.
- Verbs appear only as leaf segments for a creation surface (`.../new`). Editing
  a row is the row's own route (`/dashboard/workout/[workoutId]`), not
  `.../edit`.

### Route groups and private folders

- Group folders `(name)` organise files without adding a URL segment. Use one
  only when several routes genuinely share a layout; do not wrap a single route
  in a group.
- A folder starting with `_` is private and never routable. Route-local
  non-route files (a Client Component, `actions.ts`) live **next to** their
  `page.tsx` — colocation is the default, `_folders` are the exception.

## 2. What a route folder may contain

A route folder holds its `page.tsx`, plus only what that page needs:

| File | Purpose |
| --- | --- |
| `page.tsx` | the route. Server Component, always |
| `layout.tsx` | shared shell for the segment and everything below it |
| `loading.tsx` | streaming fallback for the segment |
| `actions.ts` | the route's Server Actions (`docs/data-mutation.md`) |
| `*.tsx` (unprefixed) | route-local Client Components for this page only |

Rules:

- Nothing reusable lives in a route folder. A component used by two routes moves
  to `src/components/` (`docs/ui.md` §1); a query moves to `src/data/`
  (`docs/data-fetching.md`).
- `layout.tsx` exists to hold chrome that must survive navigation between the
  routes below it. Do not add one per route just to wrap a page in a `<div>`.
- A route that fetches on the server gets a `loading.tsx` in its segment.
  Dynamic routes are not prefetched without one, so the link click sits there
  doing nothing until the server responds.
- Route Handlers (`route.ts`) are not how this app talks to itself. Reads happen
  in Server Components, writes in Server Actions. Add an API route only for a
  genuine third party (a webhook), and never place it under `/dashboard`.

## 3. Protection is a prefix test in `src/proxy.ts`

**`/dashboard` and everything under it are private. The gate is the Next
middleware, and there is exactly one.**

Next 16 renamed `middleware.ts` to **`proxy.ts`**; this project's lives at
`src/proxy.ts` and wraps everything in `clerkMiddleware()`:

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";

function isProtected(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req.nextUrl.pathname)) await auth.protect();
});
```

- **Never create `middleware.ts`**, and never a second proxy file. One file per
  project is all Next supports; split logic into modules and import them if it
  grows.
- Protection is expressed **by prefix**, never by enumerating leaf routes. A new
  page under `/dashboard` is protected the moment its folder is created, with no
  edit to `src/proxy.ts`. If you find yourself adding a path to `isProtected`
  for a page that lives under `/dashboard`, the test is being misused.
- `createRouteMatcher` is deprecated in Clerk v7 and warns on every request. Do
  not reintroduce it.
- Do not gate routes anywhere else: no `redirect()` in a layout standing in for
  the middleware, no per-page HOC, no client-side "if signed out, push to
  /sign-in" effect. A client-side gate renders the private page first and is not
  a gate at all.
- The `config.matcher` keeps excluding `_next` and static assets, and keeps
  including `/(api|trpc)(.*)` and `/__clerk/:path*` — Clerk's handshake breaks
  without the last one. Changing the matcher is changing the security boundary:
  re-check both, deliberately.
- The proxy runs before application code and must stay cheap. No database
  access, no `fetch` for data, no session bookkeeping of our own — it is an
  optimistic check, not the authorisation model.

### The middleware is not the last line of defence

Every page under `/dashboard` still calls `auth()` itself and redirects when
there is no `userId`:

```tsx
const { userId } = await auth();
if (!userId) redirect("/sign-in");
```

The page needs `userId` for its query anyway (`docs/auth.md` §4), so this costs
nothing — and it means a mistake in the matcher leaks nothing. Ownership is
still enforced in the query; a signed-in visitor reaching another user's row
gets `notFound()`, never a partial render.

## 4. Navigating between routes

- In-app navigation is `<Link href="...">` from `next/link`. A bare `<a>` to an
  internal route is wrong: it drops prefetching and does a full page load.
  Reserve `<a>` for external URLs, with `target="_blank" rel="noopener
  noreferrer"`.
- A link that looks like a button is a `<Link>` **styled** as one — shadcn's
  `<Button asChild>` wrapping a `<Link>`. Never a `<button onClick={() =>
  router.push(...)}>`: that is a link that keyboard users and middle-clicks
  cannot use.
- `useRouter()` is for navigation caused by an interaction that is not a link —
  a filter that rewrites the query string, for example. It is a Client Component
  API; a Server Component navigates with `redirect()` from `next/navigation`.
- Server Actions redirect with `redirect()` after their write, and they
  `revalidatePath()` the routes whose data just changed. Both throw or return
  nothing useful — do not `return` them, do not wrap them in `try` / `catch`.
- URLs written in code are literal strings for static routes and template
  literals for dynamic ones (`` `/dashboard/workout/${id}` ``). Do not build a
  route by concatenating a segment name held in a variable, and do not invent a
  `routes.ts` constants file — the folder structure is the source of truth.

### State that belongs in the URL

- Anything that should survive a refresh, a back button or a shared link is a
  **search param**, not client state: the selected date on the dashboard is
  `?date=YYYY-MM-DD`.
- Search params are visitor input. They arrive as `string | string[] |
  undefined` on an awaited `searchParams` Promise, and are validated before use
  (`docs/server-components.md` §2 and §4).
- Never put an identifier the app trusts in the URL as *identity*. A route param
  or search param may name a row; it never names the user.

## 5. Not-found, errors and redirects

- A row that is missing and a row owned by somebody else are the same answer:
  `notFound()` from `next/navigation`.
- `notFound()` renders the nearest `not-found.tsx`; `error.tsx` catches a thrown
  render error and is a Client Component by definition. Add either at the
  segment where the message should differ, not one per route by reflex.
- Permanent URL changes belong in `redirects` in `next.config.ts`, not in the
  proxy. The proxy is for decisions that need the request.

## 6. Checklist before opening a PR

- [ ] Every new page lives under `src/app/dashboard/`; no new top-level segment
      was added.
- [ ] The segment folder names are lowercase and hyphenated, and dynamic
      segments are named `[thingId]`.
- [ ] The route is protected by the existing `/dashboard` prefix test; no path
      was added to `isProtected`, and `createRouteMatcher` was not reintroduced.
- [ ] Middleware still lives only in `src/proxy.ts`; the matcher still excludes
      `_next` and still includes `/(api|trpc)(.*)` and `/__clerk/:path*`.
- [ ] The page re-checks `userId` from `await auth()` and redirects when null.
- [ ] Server-fetching segments have a `loading.tsx`.
- [ ] Internal navigation uses `<Link>` (or `<Button asChild>` around one); no
      `router.push` standing in for a link, no `<a>` to an internal route.
- [ ] Shareable state is in the URL as a validated search param.
- [ ] Missing and foreign rows both end in `notFound()`.
- [ ] No route-local file is imported by another route.
- [ ] `npm run lint` passes and `npx tsc --noEmit` is clean.
