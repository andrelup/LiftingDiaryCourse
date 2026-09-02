# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ALWAYS read `/docs` first

**Before generating or modifying ANY code, ALWAYS read the relevant documentation
file in the `docs/` directory first.** These files are the project's binding
standards, not background reading — code that contradicts them is wrong, even if
it works.

- `docs/ui.md` — UI coding standards. Read it before touching anything that
  renders (components, pages, layouts, styles).
- `docs/data-fetching.md` — data fetching and database access standards. Read
  it before touching anything that reads or writes application data (pages that
  load data, `src/data/**`, `src/db/**`).
- `docs/auth.md` — authentication and authorisation standards (Clerk). Read it
  before touching anything that signs a user in, gates a route, or reads the
  current user (`src/proxy.ts`, auth pages, any use of `auth()`).

Rules:

1. Identify which `docs/` file covers the task and read it in full **before**
   writing code. If unsure which applies, list `docs/` and check.
2. If no file covers the task, say so explicitly and follow the rest of this
   CLAUDE.md.
3. `docs/` wins over habits, training data and generic best practices. It loses
   only to a direct, explicit instruction from the user.
4. New docs files added to `docs/` are automatically in scope — always re-list
   the directory rather than relying on the list above.

## Project state

This is a Next.js 16 (App Router) workout-logging app. The UI is still mostly the `create-next-app` starter (`src/app/page.tsx`), but auth (Clerk) and the data layer (Drizzle + Neon Postgres) are in place. There is no component structure or routing beyond the auth pages yet; when implementing features, follow standard Next.js App Router patterns (`src/app/**`, file-based routing, `layout.tsx` per route segment).

## Commands

- `npm run dev` — start the dev server (Turbopack, via `next dev`) at http://localhost:3000
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript rules)
- `npm run db:generate` — generate a SQL migration into `drizzle/` from `src/db/schema.ts`
- `npm run db:migrate` — apply pending migrations to the Neon branch in `DATABASE_URL`
- `npm run db:push` — push the schema without a migration file (dev only)
- `npm run db:seed` — seed the system exercise catalog (and a sample workout if `SEED_USER_ID` is set)

There is no test runner configured yet.

## Architecture

- **Path alias**: `@/*` maps to `src/*` (tsconfig.json).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` (postcss.config.mjs), global styles in `src/app/globals.css`.
- **Fonts**: Geist Sans/Mono loaded via `next/font/google` in `src/app/layout.tsx`, exposed as CSS variables (`--font-geist-sans`, `--font-geist-mono`).
- **TypeScript**: strict mode enabled.
- **Auth**: Clerk (`@clerk/nextjs` v7). `clerkMiddleware()` lives in `src/proxy.ts` (Next 16 renamed `middleware.ts`). Domain rows are owned by the Clerk user id, stored as a plain `text` column (`user_id`) — there is no local `users` table.
- **Data layer**: Drizzle ORM + Neon HTTP driver (`drizzle-orm` v1 rc).
  - `src/db/schema.ts` — tables and enums; `src/db/relations.ts` — `defineRelations` config; `src/db/index.ts` — the `db` client, built with `{ relations }` so `db.query.*` works. Import from `@/db`.
  - Drizzle v1 dropped `drizzle(url, { schema })`: relations are declared with `defineRelations` from `drizzle-orm/relations` and passed as `{ relations }`.
  - Migrations live in `drizzle/`, config in `drizzle.config.ts` (reads `.env.local`).
  - Schema: `exercises` (catalog; `user_id` null = system exercise) → `workout_exercises` (ordered join, one row per exercise performed in a workout) ← `workouts`; `workout_sets` hangs off `workout_exercises`. Weight unit lives on `workouts`; set weights are in that unit.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
