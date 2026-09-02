# Auth standards

These rules apply to **every** piece of authentication and authorisation in
this project. They are not suggestions; a change that breaks them does not get
merged.

## 1. Clerk is the only auth system

**This app authenticates with Clerk (`@clerk/nextjs` v7) and nothing else.**

- There is no local `users` table, no password column, no session table, no JWT
  signing of our own. Identity is owned entirely by Clerk.
- Do not add NextAuth / Auth.js, Lucia, Passport, Supabase Auth, Neon Auth, or a
  hand-rolled cookie session. If a problem looks like it needs one, it does not:
  it needs the right Clerk API.
- Do not implement sign-in, sign-up, password reset, email verification, MFA or
  profile editing by hand. Clerk ships all of them; use its components.
- The Clerk user id (`user_xxx`) is the only identifier of a user anywhere in
  the codebase. It is stored as a plain `text` column named `user_id` on the
  rows a user owns (see `src/db/schema.ts`), with no foreign key.

### The pieces, and where they live

| Concern | Where |
| --- | --- |
| Provider | `<ClerkProvider>` in `src/app/layout.tsx` |
| Route gating | `clerkMiddleware()` in `src/proxy.ts` |
| Server identity | `auth()` from `@clerk/nextjs/server` |
| Sign-in / sign-up UI | `src/app/sign-in/[[...sign-in]]`, `src/app/sign-up/[[...sign-up]]` |
| Header controls | `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, `<Show>` |

## 2. `src/proxy.ts` is the middleware

Next 16 renamed `middleware.ts` to **`proxy.ts`**. There is one file, at
`src/proxy.ts`, and it wraps everything in `clerkMiddleware()`.

```ts
import { clerkMiddleware } from "@clerk/nextjs/server";

function isProtected(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req.nextUrl.pathname)) await auth.protect();
});
```

Rules:

- **Never create `middleware.ts`.** Never create a second middleware file.
- Route protection is expressed with a **plain path test**, as above.
  `createRouteMatcher` is deprecated in Clerk v7 and warns on every request — do
  not reintroduce it.
- Protect by **prefix**, not by enumerating leaf routes: a new page under a
  protected segment must be protected the moment it is created, without touching
  `src/proxy.ts`.
- New protected areas are added to `isProtected`, not to a new mechanism.
- The `config.matcher` must keep excluding `_next` and static assets, and must
  keep including `/(api|trpc)(.*)` and `/__clerk/:path*` — Clerk's handshake
  routes break without the last one.
- Middleware gates the request; it is **not** the authorisation model. See §4.

## 3. Reading the user on the server

**Server-side identity always comes from `auth()`.**

```ts
import { auth } from "@clerk/nextjs/server";

const { userId } = await auth();
if (!userId) redirect("/sign-in");
```

- `auth()` is `async` in Clerk v7 — always `await` it. The same goes for
  `currentUser()`.
- Import server helpers from `@clerk/nextjs/server`, never from `@clerk/nextjs`.
  Components (`<UserButton>`, `<SignInButton>`, `<Show>`) come from
  `@clerk/nextjs`.
- Prefer `auth()` over `currentUser()`. `auth()` reads the session token;
  `currentUser()` is a network call to Clerk's API and is only justified when
  you actually need profile fields (name, email, image) on the server.
- Every page in a protected segment still checks `userId` itself, even though
  the middleware already gated the route. Belt and braces: a page must never
  depend on the matcher being right.
- A page that finds no `userId` **redirects or renders nothing**. It never falls
  through to a query, and never substitutes a placeholder or "demo" user.

### Client Components

- A Client Component that needs the user uses `useUser()` / `useAuth()` from
  `@clerk/nextjs`, or — better — receives what it needs **as props** from a
  Server Component.
- A `userId` obtained on the client is for **display only**. It must never be
  sent to the server as the identity of the caller.

## 4. Authorisation happens in the query, not in the route

Middleware answers "is this person signed in?". It never answers "may this
person see this row?". That question is answered by the `userId` filter on every
query — the full contract is in [`docs/data-fetching.md`](./data-fetching.md)
§4, and it is binding here too:

- `userId` reaches `src/data/*` as a required first argument, obtained from
  `auth()` on the server.
- `userId` **never** comes from a prop, a search param, a route param, a request
  body, a header, or a cookie the app wrote. A user-supplied id is not an
  identity; it is an attack.
- Single-row lookups match on `{ id, userId }`. An id alone is a guess away from
  someone else's data.
- Writes stamp the authenticated `userId`; updates and deletes match on
  `{ id, userId }` so a foreign id affects zero rows.

There are no roles, no permissions and no organisations in this app. Ownership
is the entire authorisation model: a row's `user_id` either equals the caller's
Clerk id, or the caller cannot touch it. Do not invent a role check; if roles
are ever needed, they come from Clerk (organisations / session claims), never
from a column we add.

## 5. Auth UI is Clerk's, styled by Clerk

The UI standards in [`docs/ui.md`](./ui.md) ban custom components; Clerk's
prebuilt components are the sanctioned exception for auth surfaces, and they are
the only way auth UI is built.

- Sign-in and sign-up are Clerk catch-all routes:
  `src/app/sign-in/[[...sign-in]]/page.tsx` renders `<SignIn />`, and
  `src/app/sign-up/[[...sign-up]]/page.tsx` renders `<SignUp />`. The optional
  catch-all segment is required — Clerk routes its own sub-steps through it.
- The signed-in account control is `<UserButton />`. Never build a custom avatar
  menu, and never add a hand-rolled "Sign out" button — sign-out goes through
  `<UserButton>` or Clerk's `<SignOutButton>`.
- Conditional rendering by auth state uses Clerk's `<Show when="signed-in">` /
  `<Show when="signed-out">`. Do not branch on a `useUser()` boolean in the
  layout, and do not use the deprecated `<SignedIn>` / `<SignedOut>` pair.
- Around these components, only shadcn/ui and Tailwind utilities apply — the
  rest of `docs/ui.md` is unchanged.
- Restyle Clerk components through their `appearance` prop only. Never target
  Clerk's internal class names from `globals.css`.

## 6. Configuration and secrets

Clerk is configured entirely through environment variables in `.env.local`:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL
```

- `CLERK_SECRET_KEY` is server-only. It must never be prefixed with
  `NEXT_PUBLIC_`, never imported into a `"use client"` file, and never logged.
- Sign-in / sign-up URLs and post-auth redirects are set **by these variables**,
  not by hard-coded props on `<SignIn>` / `<SignUp>` and not by a redirect
  written into a component.
- Never commit a real key. `.env.local` stays untracked.
- Never `console.log` a session token, a JWT, or the result of `auth()`.

## 7. Checklist before opening a PR

- [ ] No auth library other than `@clerk/nextjs` was introduced.
- [ ] Middleware still lives in `src/proxy.ts`; no `middleware.ts` was created.
- [ ] New protected routes are covered by the prefix test in `isProtected`;
      `createRouteMatcher` was not reintroduced.
- [ ] Server code gets identity from an `await auth()`, imported from
      `@clerk/nextjs/server`.
- [ ] Every protected page re-checks `userId` and redirects when it is null.
- [ ] No `userId` reaches a query from a prop, param, body, header or cookie.
- [ ] Auth UI uses Clerk's components (`<SignIn>`, `<SignUp>`, `<UserButton>`,
      `<Show>`); no hand-rolled auth screen or sign-out button.
- [ ] No secret key, token or `auth()` payload is logged or exposed to the
      client.
- [ ] `npm run lint` passes.
