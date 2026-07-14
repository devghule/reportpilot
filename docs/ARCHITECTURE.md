# Architecture

## Overview

```
Google Sheets
   └─ Apps Script add-on (addon/)  — opens a sidebar iframe
         └─ Sidebar UI (sidebar/)  — React SPA, built into backend/public/sidebar
               └─ Backend API (backend/)  — NestJS, single Node process
                     ├─ Supabase Postgres (via Prisma)
                     ├─ Google OAuth + Sheets API   (write reports, read spreadsheet)
                     ├─ Meta Graph API              (ad account data)
                     └─ OpenAI API                  (AI insights)
```

There is exactly **one deployable backend process** in production. The
sidebar is not a separately hosted app — it's a static build that
`ServeStaticModule` serves from the same NestJS process, at `/sidebar/*`.
The Apps Script add-on is the only other deployable, pushed independently
via `clasp`.

## Why this shape

- **One backend process** because the addon's Apps Script sandbox can only
  reach the outside world via HTTP calls (or by loading an iframe) — all
  business logic, secrets, and third-party API calls have to live in a
  normal server, not in Apps Script itself.
- **Sidebar served by the backend** (rather than its own static host) avoids
  CORS entirely for the common case and keeps deployment to a single unit —
  no second hosting account, no second domain to manage, no `VITE_BACKEND_URL`
  needed in production (relative URLs just work).
- **Apps Script stays a thin shell**: `addon/Code.gs` opens the sidebar
  iframe and exposes a couple of `google.script.run`-callable functions
  (see `sidebar/src/utils/appscript.ts` for what the frontend calls); it has
  no business logic of its own.

## Backend modules (`backend/src/`)

| Module | Responsibility | Key routes |
|---|---|---|
| `auth/` | Google OAuth login, JWT issuance | `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/me`, `POST /auth/logout` |
| `users/` | Current user profile / account deletion | `GET /users/me`, `DELETE /users/me` |
| `meta/` | Meta OAuth, ad account listing, insights import | `GET /meta/auth-url`, `GET /meta/callback`, `GET /meta/accounts`, `GET /meta/ad-accounts`, `POST /meta/import`, `POST /meta/disconnect` |
| `templates/` | Saved report templates (metrics/dimensions/filters) | `GET/POST /templates`, `GET/PATCH/DELETE /templates/:id` |
| `schedules/` | Recurring report jobs + the cron that runs them | `GET/POST /schedules`, `PATCH/DELETE /schedules/:id`, `POST /schedules/:id/run-now`, `PATCH /schedules/:id/pause`, `PATCH /schedules/:id/resume` |
| `sheets/` | Writes report data into the user's Google Sheet | `POST /sheets/test` |
| `ai/` | AI-generated insights over report data | `POST /ai/generate`, `POST /ai/feedback`, `GET /ai/history` |
| `prisma/` | DB client (Prisma + `@prisma/adapter-pg`, manual SSL handling for Supabase's pooler) | — |
| `common/` | Global exception filter, encryption helpers, guards | — |

`AppController` (`backend/src/app.controller.ts`) exposes `GET /ping` and
`GET /health` for uptime monitoring — see [DEPLOYMENT.md](DEPLOYMENT.md#monitoring).

## Data model (`backend/prisma/schema.prisma`)

- **User** — one row per Google account. Has many templates, schedules, connected accounts, AI reports.
- **ConnectedAccount** — a linked Meta Business/Ad account, plus the encrypted Meta access token and Google refresh token used to write to that user's sheet on schedule.
- **Template** — a saved report definition (metrics, dimensions, filters, column order).
- **Schedule** — binds a Template + ConnectedAccount to a recurring job (frequency, time, timezone, target sheet/tab). Tracks `lastRunStatus`, `nextRunAt`, `retryCount`.
- **AiReport** — a generated AI insight (prompt + output) plus optional user feedback.

Tokens (`ConnectedAccount.accessToken`, `googleRefToken`) are encrypted at
rest with AES (`backend/src/common/crypto.util.ts`, keyed by
`ENCRYPTION_SECRET`) — never stored or returned to the client in plaintext.
`SchedulesService` deliberately `select`s a narrow field set when listing
schedules so ciphertext tokens never leave the server (see the comment on
`scheduleListArgs`).

## Scheduling

`SchedulesService.runDueSchedules()` is a `@Cron('* * * * *')` job (runs
every minute in the same backend process — no separate worker, no queue).
It finds `Schedule` rows with `status: 'active'` and `nextRunAt <= now`,
imports fresh data from Meta, writes it to the target Google Sheet tab, and
recomputes `nextRunAt` (timezone-aware, via `date-fns-tz`). Failures retry
at +15min and +30min (`RETRY_DELAYS_MINUTES`) before being marked `failed`
and rescheduled for the next normal cycle.

This is deliberately simple (in-process cron, not a separate job runner) —
appropriate at current scale; see [ROADMAP.md](ROADMAP.md) if schedule
volume ever requires a real queue.

## Auth

Google OAuth (via Passport) is the only login method — `GoogleStrategy`
(`backend/src/auth/google.strategy.ts`) requests `openid email profile` plus
`https://www.googleapis.com/auth/spreadsheets` (so the same Google grant
covers both login and sheet-write access), with `access_type=offline` +
`prompt=consent` to force a refresh token. The backend issues its own JWT
after a successful Google login; the sidebar sends it as `Authorization:
Bearer <token>` on subsequent API calls.

Meta uses a separate OAuth flow (`meta/` module) purely for ad-account data
access — unrelated to login.

## Frontend (`sidebar/`)

Plain React + Vite, no router library — `sidebar/src/hooks/useRouter.tsx` is
a small hand-rolled screen switcher (`screens/*.tsx`). `services/api.service.ts`
is a thin axios wrapper; `hooks/useAuth.tsx` and `hooks/usePreferences.tsx`
hold the two pieces of global state via React context. No state management
library beyond `@tanstack/react-query` for server data.

## What's intentionally not here

- No Docker / container orchestration — one Node process on Render is enough at this scale.
- No message queue / background worker — the in-process cron is enough at current schedule volume.
- No API gateway / BFF layer — the sidebar talks directly to the NestJS API.
- No monorepo build tool (Turborepo/Nx) — three packages with independent `npm install`/`npm run build` is simple enough to not need one.
