# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is a Next.js 16 (App Router) project scaffolded with `create-next-app` and not yet customized — `src/app/page.tsx` still contains the default starter content. There is no custom architecture, routing, data layer, or component structure established yet. When implementing features, you are largely establishing conventions from scratch; follow standard Next.js App Router patterns (`src/app/**`, file-based routing, `layout.tsx` per route segment).

## Commands

- `npm run dev` — start the dev server (Turbopack, via `next dev`) at http://localhost:3000
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint (flat config in `eslint.config.mjs`, extends `eslint-config-next` core-web-vitals + typescript rules)

There is no test runner configured yet.

## Architecture

- **Path alias**: `@/*` maps to `src/*` (tsconfig.json).
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss` (postcss.config.mjs), global styles in `src/app/globals.css`.
- **Fonts**: Geist Sans/Mono loaded via `next/font/google` in `src/app/layout.tsx`, exposed as CSS variables (`--font-geist-sans`, `--font-geist-mono`).
- **TypeScript**: strict mode enabled.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
