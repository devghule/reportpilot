# ReportPilot

ReportPilot is a Google Sheets add-on that pulls Meta (Facebook/Instagram) Ads
performance data into a spreadsheet on a schedule, with AI-generated insights
on top.

It's a monorepo with three parts:

| Package | What it is | Tech |
|---|---|---|
| [`backend/`](backend) | REST API: auth, Meta OAuth + data import, Google Sheets writes, scheduling, AI insights | NestJS, Prisma, PostgreSQL (Supabase) |
| [`sidebar/`](sidebar) | The UI users see inside the Google Sheets sidebar | React, Vite, TypeScript |
| [`addon/`](addon) | The Google Apps Script container-bound add-on that opens the sidebar inside Sheets | Apps Script (`clasp`) |

The `sidebar` app is built as static assets and served by the `backend`
(`backend/public/sidebar`) — in production there is one deployable Node
process, plus the Apps Script add-on deployed separately via `clasp`.

## Documentation

- **[LOCAL_DEV.md](LOCAL_DEV.md)** — set up and run everything locally (start here)
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — how the pieces fit together, data model, request flow
- **[DEPLOYMENT.md](DEPLOYMENT.md)** — deploying to production (Render + Supabase + clasp)
- **[TEST_CHECKLIST.md](TEST_CHECKLIST.md)** — manual QA checklist for critical flows
- **[ROADMAP.md](ROADMAP.md)**, **[CHANGELOG.md](CHANGELOG.md)**, **[KNOWN_ISSUES.md](KNOWN_ISSUES.md)**, **[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)** — release process

## Quick start

```bash
# Terminal 1 — API
cd backend && npm install && npm run start:dev

# Terminal 2 — sidebar UI (hot reload, talks to the backend above)
cd sidebar && npm install && npm run dev
```

See [LOCAL_DEV.md](LOCAL_DEV.md) for the full setup (env vars, database, Google/Meta OAuth apps).

## License

UNLICENSED — private project.
