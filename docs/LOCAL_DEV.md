# Local Development

## Prerequisites

- Node.js 20+ and npm
- A Supabase project (free tier is fine) — see [Manual step: Supabase](#manual-step-supabase)
- A Google Cloud OAuth client — see [Manual step: Google Cloud](#manual-step-google-cloud)
- A Meta (Facebook) app — see [Manual step: Meta](#manual-step-meta)
- An OpenAI API key (for AI insights) — https://platform.openai.com/api-keys

You only need to do the manual setup steps **once**. After that, day-to-day dev is one command per package.

## One-command dev workflow

```bash
# Terminal 1 — backend API (NestJS, hot reload via `--watch`)
cd backend
npm install
npm run start:dev
# → http://localhost:3000

# Terminal 2 — sidebar UI (Vite, hot reload)
cd sidebar
npm install
npm run dev
# → http://localhost:5173, proxies API calls to http://localhost:3000
#   (see sidebar/.env.development — committed, no setup needed)
```

That's it — two `npm run dev`-style commands, no Docker, no orchestration tooling.

Because the real UI only ever runs embedded inside a Google Sheets sidebar
iframe, `http://localhost:5173` on its own will show the sidebar but some
`google.script.run` calls (in `sidebar/src/utils/appscript.ts`) are no-ops
outside that iframe. For UI work (styling, data flows against the real API)
the standalone page is enough; to test the full Apps Script integration you
need the addon pointed at your local build (see below).

## Environment variables

### `backend/.env`

Copy the template and fill in real values:

```bash
cd backend
cp .env.example .env
```

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (pooling URI) |
| `DIRECT_URL` | Optional, see comment in `.env.example` |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY` | Supabase → Settings → API |
| `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` | Meta App dashboard (see below) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Google Cloud Console (see below) |
| `OPENAI_API_KEY` | platform.openai.com |
| `JWT_SECRET` | Generate once: `openssl rand -hex 32` |
| `ENCRYPTION_SECRET` | Generate once: `openssl rand -hex 16` (32 chars) |
| `BACKEND_URL` | `http://localhost:3000` for local dev |
| `NODE_ENV` | `development` |
| `PORT` | `3000` |

For local dev, `GOOGLE_REDIRECT_URI` and `META_REDIRECT_URI` must point at
`http://localhost:3000/...` — you'll register these as separate redirect
URIs in Google Cloud / Meta alongside the production ones (both can coexist
on the same OAuth app).

### `sidebar/.env.development`

Already committed with `VITE_BACKEND_URL=http://localhost:3000` — nothing to
do unless your backend runs on a different port.

## Database

Prisma manages the schema (`backend/prisma/schema.prisma`). After setting
`DATABASE_URL`:

```bash
cd backend
npx prisma migrate deploy   # apply existing migrations to your Supabase DB
npx prisma generate         # regenerate the client (also runs automatically via postinstall)
```

To create a new migration after changing `schema.prisma`:

```bash
npx prisma migrate dev --name describe_your_change
```

## Running tests

```bash
cd backend
npm test          # unit tests (jest)
npm run test:e2e  # e2e tests
```

See [TEST_CHECKLIST.md](TEST_CHECKLIST.md) for the manual QA checklist covering flows that aren't automated yet.

---

## Manual step: Supabase

1. Go to https://supabase.com → New project.
2. Once created, go to **Settings → Database → Connection string** and copy the URI (pooling, port 6543) → this is `DATABASE_URL`.
3. Go to **Settings → API** and copy the **Project URL**, **anon public key**, and **service_role secret key** → `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`.
4. Run `npx prisma migrate deploy` from `backend/` (with `DATABASE_URL` set) to create the schema.

## Manual step: Google Cloud

1. Go to https://console.cloud.google.com → create or select a project.
2. **APIs & Services → OAuth consent screen** — configure as "External", add your email as a test user while in development.
3. **APIs & Services → Library** — enable the **Google Sheets API**.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → type "Web application".
   - Authorized redirect URIs: add both
     - `http://localhost:3000/auth/google/callback` (local)
     - `https://<your-render-url>/auth/google/callback` (production, once known)
5. Copy the **Client ID** and **Client secret** → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## Manual step: Meta (Facebook)

1. Go to https://developers.facebook.com/apps → Create App → type "Business".
2. Add the **Marketing API** product.
3. **App Settings → Basic** — copy **App ID** and **App Secret** → `META_APP_ID` / `META_APP_SECRET`.
4. Under Marketing API / Facebook Login settings, add valid OAuth redirect URIs:
   - `http://localhost:3000/meta/callback` (local)
   - `https://<your-render-url>/meta/callback` (production)
5. Request the following permissions for the app (via App Review for production use, not required while testing with your own dev account): `ads_read`, `ads_management`, `business_management`, `read_insights`.

## Manual step: Apps Script addon (`addon/`)

The addon talks to a hardcoded sidebar URL (`addon/sidebar.html`), currently
pointed at production (`https://reportpilot.onrender.com/sidebar/index.html`).
To test addon changes against your local backend/sidebar you'd need a
tunnel (e.g. `ngrok http 5173`) and to temporarily edit that URL — do this
locally, never commit a tunnel URL.

To push addon code changes to your own Apps Script project for testing:

1. Install clasp once: `npm install -g @google/clasp`
2. `clasp login` (opens a Google OAuth prompt in your browser)
3. From `addon/`: `clasp push` to push local changes to the linked Apps Script project (`.clasp.json`, gitignored — ask the project owner for the script ID, or run `clasp create` to make your own for testing).
