# Known Issues

Issues discovered while auditing the codebase for this engineering pass.
None of these are fixed here (out of scope — no product/behavior changes),
but they're documented so they don't get rediscovered from scratch later.

## Confirmed (verified in code)

### Deleting a Meta account or template in use by a schedule fails ungracefully

- `MetaService.disconnect()` (`backend/src/meta/meta.service.ts`) deletes a
  `ConnectedAccount` row directly, with no check for `Schedule` rows still
  referencing it via `accountId`. `Schedule.accountId` has no `onDelete`
  cascade in `prisma/schema.prisma`, so this will throw a Postgres foreign
  key constraint violation, surfaced to the user as a generic 500 via
  `GlobalExceptionFilter` ("Something went wrong. Please try again.").
- The same applies to deleting a `Template` (`TemplatesService`) still
  referenced by a `Schedule` — `Schedule.templateId` also has no cascade.
- **Fix options** (pick one, product decision, not made here): cascade-delete
  dependent schedules, block the delete with a clear "N schedules use this,
  remove them first" error, or null out the reference and pause affected
  schedules. Tracked in [ROADMAP.md](ROADMAP.md).

### `addon/sidebar.html` hardcodes the production URL

`https://reportpilot.onrender.com/sidebar/index.html` is hardcoded — if the
Render URL ever changes (custom domain, service recreation), this file must
be manually updated and re-pushed via `clasp`. See
[DEPLOYMENT.md](DEPLOYMENT.md).

### No database migration automation

`prisma migrate deploy` is a manual step on every deploy that includes a
schema change (see [DEPLOYMENT.md](DEPLOYMENT.md#database-migrations)). A
deploy that ships new Prisma-dependent code before migrations run will
error at runtime until the migration is applied.

### Pre-existing lint debt in `backend` and `sidebar`

`npm run lint` currently fails with real errors on `main` (pre-dating this
engineering pass):

- `backend/src/meta/meta.service.ts` — ~30 `@typescript-eslint/no-unsafe-*`
  errors, mostly from `axios.isAxiosError(err)` defaulting to `AxiosError<any>`
  and untyped Meta Graph API error payloads.
- `backend/src/sheets/sheets.service.ts` — one unused `catch` binding.
- `sidebar/src/utils/appscript.ts` — an explicit `any` and a stray-newline parse issue.
- `sidebar/src/screens/TemplateFormScreen.tsx` — a `react-hooks/set-state-in-effect` warning-turned-error.

The new CI workflow (`.github/workflows/ci.yml`) runs lint but with
`continue-on-error: true` for this reason — it reports without blocking
builds. Fixing these and removing `continue-on-error` is a good, low-risk
follow-up task, tracked in [ROADMAP.md](ROADMAP.md).

## Suspected / worth verifying (not independently confirmed)

- **Render free-tier cold starts**: if the Render service is on a free/spun-down-on-idle plan, the in-process cron (`@Cron('* * * * *')` in `SchedulesService`) will not fire while the service is asleep, silently delaying due schedules until the next request wakes it. UptimeRobot pinging `/health` every 5 minutes (see [DEPLOYMENT.md](DEPLOYMENT.md#manual-step-uptimerobot)) mitigates this as a side effect, but confirm your Render plan doesn't sleep if precise scheduling matters.
- **Single point of failure for scheduling**: since the cron runs in the same process as the API, a backend crash/restart stops due schedules from running until the process comes back up, with no separate alerting on missed schedule runs specifically (only on the process being down at all, via UptimeRobot).

## Not an issue, but worth knowing

- `backend/.env` is gitignored (correct) — this repo's working copy has one already populated with real credentials for the developer who set it up. Anyone cloning fresh needs to follow [LOCAL_DEV.md](LOCAL_DEV.md) to create their own.
