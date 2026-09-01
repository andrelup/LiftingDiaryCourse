---
name: commit
description: Creates project commits following Conventional Commits, always with the message in English and with the module scope (backend, frontend, infra, ci). Groups changes into atomic commits, checks that no secrets or unwanted files slip in, and lets the pre-commit hooks pass. Use when the user asks to commit, save changes, or get the branch ready for a PR.
---

# Project commits

Create one or more commits from the pending changes. **The message is always in English**, even though the conversation with the user is in Spanish.

## Step 1 — Inspect the state

Run in parallel:

```
git status
git diff            # unstaged changes
git diff --staged   # already-staged changes
git log --oneline -10
```

The `git log` is there to match the repo's recent message style, not to copy it blindly.

This is a solo training project: **commit directly on `main`**, no feature branches needed.

## Step 2 — Group into atomic commits

Each commit must be a coherent unit that can be reviewed on its own. If the diff mixes independent things (e.g. a Clerk change + an unrelated styling tweak + tooling), make **several commits** with selective `git add` instead of a single one.

Do not mix in the same commit:

- A functional change with a broad refactor or an automatic reformat.
- Unrelated features or fixes that happen to touch the same file.

## Step 3 — Write the message

Format: `<type>: <subject>`, optionally with a scope when it adds clarity: `<type>(<scope>): <subject>`.

**Types** (the project's): `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.

**Scope**: this is a single Next.js app, so most commits are scopeless (`feat:`, `docs:`, `chore:`). Add a scope only when it disambiguates, e.g. `feat(auth): ...` for Clerk-related work.

**Subject**:

- In English, lowercase initial, no trailing period.
- Present imperative: `add`, `fix`, `rename` — never `added`, `adds`, `adding`.
- At most ~72 characters.
- Describe **what changes and why**, not the files touched. `feat: open Clerk sign in/up buttons in modal mode` ✔ / `feat: update layout.tsx` ✘.

**Body** (optional, after a blank line): only if the *why* does not fit in the subject — a design decision, a trade-off, context a reviewer would need. Do not restate the diff in prose.

**Issue references**: if the work corresponds to an issue, append it to the subject, the way the repo does it: `feat(backend): add books CRUD API router with pagination and RBAC (#7)`.

Close the message with the trailer:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

Valid examples from the repo:

```
feat: add Clerk authentication
docs: describe project as a Claude Code training course
chore: add Claude Code project config
feat: open Clerk sign in/up buttons in modal mode
```

## Step 4 — Verify before committing

Before `git commit`, review what you are about to stage:

- **Never** stage `.env`, credentials, tokens, API keys (including Clerk keys) or database URLs. If they show up in the diff, **stop and tell the user**. If the variable is new, what gets versioned is `.env.example` with an example value.
- No debug `console.log`, no commented-out code.
- Do not add generated files, build artifacts (`.next/`), or temporary files from your own work.
- If the change is functional, confirm `npm run lint` passes (there is no test runner configured in this project).

## Step 5 — Commit

Use a heredoc for the message, so that the body and the trailer keep their line breaks:

```bash
git add <specific paths>
git commit -m "$(cat <<'EOF'
feat: open Clerk sign in/up buttons in modal mode

Avoids a full page redirect for authentication by keeping the user
on the current page and opening the Clerk flow as an overlay.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

Use `git add .` only once you have confirmed that **everything** in the working tree belongs to that commit.

If a **pre-commit hook fails**: fix the cause and try again. Never use `--no-verify` (CLAUDE.md explicitly forbids it). If the hook reformats files, re-stage them and repeat the commit.

If the hook modifies the tree or the commit fails, check `git status` before retrying; do not create duplicate commits.

## Step 6 — Report

Show the user `git log --oneline -n <commits created>` and one sentence per commit explaining what it groups. **Do not `git push` and do not open a PR unless the user asks.**
