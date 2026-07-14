# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/) — see
[RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) for what that means in practice
for this project.

## [Unreleased]

### Added
- `GET /health` endpoint with DB connectivity check, for uptime monitoring and Render health checks.
- Engineering documentation: `LOCAL_DEV.md`, `ARCHITECTURE.md`, `DEPLOYMENT.md`, `TEST_CHECKLIST.md`, `ROADMAP.md`, `KNOWN_ISSUES.md`, `RELEASE_CHECKLIST.md`.
- Unit tests: token encryption round-trip, schedule next-run calculation (timezone-aware), `/health` endpoint.
- CI: GitHub Actions workflow running lint/typecheck/build for backend and sidebar on every push/PR.
- `sidebar/.env.development` (committed) so `npm run dev` works against a local backend with zero manual setup.

## [0.1.0] — 2026-07-14 (baseline)

First versioned snapshot, retroactively covering everything built before
formal release tracking started.

### Added
- NestJS backend: Google OAuth login, Meta OAuth + ad account data import, Google Sheets report writes, recurring schedules with timezone-aware cron execution and retry/failure handling, AI-generated insights (OpenAI), report templates.
- React sidebar UI served by the backend, embedded in a Google Sheets add-on.
- Google Apps Script add-on shell (`addon/`).
- Prisma + Supabase Postgres data layer, with AES-encrypted storage of Meta/Google tokens.
- Report customization and styling (template metrics/dimensions/filters/column ordering).

### Fixed
- Supabase pooler SSL connection handling in Prisma's driver adapter.
- Google OAuth token-error logging (raw error surfaced from the token endpoint instead of a generic "Bad Request").
- Backend production start script path.
- Duplicate `build` script entry in `backend/package.json`.
- `nextRunAt` not being recalculated when a schedule's time/frequency/timezone was edited.

---

Earlier history is available via `git log`; this file starts tracking
forward from here.
