# Deployment

Production has two independent deployables:

1. **Backend + sidebar** (one Node process) → Render, deployed from `main` on GitHub.
2. **Apps Script add-on** (`addon/`) → pushed manually via `clasp`.

There is no staging environment today — see [ROADMAP.md](ROADMAP.md). For a
solo developer shipping a few times a week, the CI check (below) plus the
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) is the safety net instead.

## Backend + sidebar → Render

Render builds and runs the `backend/` package; the sidebar is built as a
prerequisite and its static output committed to nothing — it's built fresh
on every deploy into `backend/public/sidebar` (gitignored, generated).

**Build command** (set in Render dashboard, Settings → Build & Deploy):
```
cd sidebar && npm install && npm run build && cd ../backend && npm install
```

**Start command:**
```
cd backend && npm run build && npm run start:prod
```

(`npm run build` in `backend` runs `prisma generate && nest build`.)

Adjust the two commands above to whatever's actually configured in the
Render dashboard if they've drifted — Render is the source of truth for
build/start commands, not this file.

### Environment variables (Render → Environment)

Set every variable from `backend/.env.example` in the Render dashboard, with
production values:

- `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` — same Supabase project as local dev, or a separate production project (recommended once you have real users — see ROADMAP).
- `GOOGLE_REDIRECT_URI` = `https://<your-render-url>/auth/google/callback`
- `META_REDIRECT_URI` = `https://<your-render-url>/meta/callback`
- `BACKEND_URL` = `https://<your-render-url>`
- `NODE_ENV` = `production`
- `JWT_SECRET`, `ENCRYPTION_SECRET` — **generate once, never rotate casually**: rotating `ENCRYPTION_SECRET` makes every already-stored encrypted token undecryptable (users would need to reconnect Meta/Google).
- `OPENAI_API_KEY`, `META_APP_ID`, `META_APP_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

Render sets `PORT` itself — don't override it.

### Database migrations

Migrations are **not** run automatically on deploy. Before deploying a
change that includes a new Prisma migration:

```bash
cd backend
DATABASE_URL="<production DATABASE_URL>" npx prisma migrate deploy
```

Run this manually, before or immediately after the Render deploy that ships
the corresponding code — a schema/code mismatch window is otherwise
possible for the brief period between deploy and migration.

### Deploy trigger

If Render's GitHub integration is set to auto-deploy on push to `main`
(check Render dashboard → Settings → Build & Deploy → Auto-Deploy), every
merge to `main` ships to production automatically once CI passes. See
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) before merging to `main`.

## Apps Script add-on → clasp

The add-on has no CI/CD — it's pushed manually, and rarely changes (it's a
thin shell around an iframe pointed at the backend).

```bash
cd addon
clasp push          # push Code.gs / sidebar.html / appscript.json to the linked Apps Script project
clasp deploy         # create a new versioned deployment (only needed if you've published this add-on for others to install)
```

Requires `clasp login` once per machine, and a `.clasp.json` (gitignored)
pointing at the correct `scriptId` — ask the project owner for it, or see
Google's [clasp docs](https://github.com/google/clasp) to create your own
Apps Script project for testing.

`addon/sidebar.html` hardcodes the production sidebar URL
(`https://reportpilot.onrender.com/sidebar/index.html`). If the Render URL
ever changes, update that file and re-push.

## Monitoring

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) and the Monitoring section below for
what's implemented in code vs. manual setup.

### Health check endpoint

`GET /health` (added in `backend/src/app.controller.ts`) checks DB
connectivity and returns:

```json
{ "status": "ok", "db": "ok", "dbLatencyMs": 12, "uptimeSeconds": 3600, "timestamp": "..." }
```

Point Render's own health check (Settings → Health Check Path) and any
external uptime monitor at this endpoint.

### Manual step: UptimeRobot (free uptime monitoring)

1. Go to https://uptimerobot.com → sign up (free tier: 50 monitors, 5-minute interval).
2. **Add New Monitor**:
   - Monitor Type: `HTTP(s)`
   - Friendly Name: `ReportPilot backend`
   - URL: `https://<your-render-url>/health`
   - Monitoring Interval: 5 minutes
3. Under **Alert Contacts**, add your email (and/or SMS) so you're notified on downtime.
4. Optional: add a second monitor for `https://<your-render-url>/sidebar/index.html` to catch static-asset-serving failures separately from API/DB failures.

Render's free tier spins down on inactivity — an UptimeRobot ping every 5
minutes also keeps the service warm, which halves as a cheap way to avoid
cold-start latency for real users.

### Future: Sentry

Not added yet (per current scope), but the codebase is already shaped for a
low-effort integration later:

- `backend/src/common/filters/http-exception.filter.ts` is the single choke
  point for all unhandled exceptions — a `Sentry.captureException(exception)`
  call added inside the `isServerError` branch is the entire backend
  integration.
- To add it later: `npm install @sentry/node`, initialize it in
  `backend/src/main.ts` before `NestFactory.create`, add the capture call
  above, and set a `SENTRY_DSN` env var in Render.
- No frontend Sentry needed unless client-side errors become a real problem
  — `sidebar/src/components/ErrorBoundary.tsx` already exists as the
  natural place to wire one in if so.
