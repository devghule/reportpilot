# Test Checklist

Manual QA checklist for critical user flows. Run through this before any
production release that touches auth, Meta/Google integration, or
scheduling (see [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)).

Automated coverage today is intentionally thin (see
[Automated tests](#automated-tests) at the bottom) — this checklist is the
real safety net until it grows.

## 1. Auth (Google login)

- [ ] Fresh user: clicking "Sign in with Google" from the sidebar redirects to Google, and after consent returns to the sidebar logged in.
- [ ] Returning user: login works without re-consenting to scopes.
- [ ] `GET /auth/me` returns the correct user after login.
- [ ] Logout (`POST /auth/logout`) actually clears the session client-side (sidebar returns to `LoginScreen`).
- [ ] Revoking the app's access from https://myaccount.google.com/permissions and logging in again still works (re-grants cleanly).

## 2. Connect Meta account

- [ ] "Connect Meta" from the sidebar redirects to Facebook OAuth and back successfully.
- [ ] `GET /meta/accounts` / `GET /meta/ad-accounts` lists the correct Business Manager(s) and ad account(s) for the connected user.
- [ ] Disconnecting (`POST /meta/disconnect`) removes the `ConnectedAccount` and any schedules relying on it stop running (or are handled gracefully — check `Schedule.status`).
- [ ] Reconnecting after disconnecting works (no stale-token errors).

## 3. Templates

- [ ] Create a template with a full set of metrics/dimensions/filters; verify it saves and reloads correctly.
- [ ] Edit an existing template; verify changes persist and don't affect schedules using an older version of the data unexpectedly.
- [ ] Delete a template that has no schedules attached — succeeds.
- [ ] Attempt to delete a template that **is** used by an active schedule — verify the behavior is sane (either blocked with a clear error, or cascade — check current DB constraint: `Schedule.templateId` has no `onDelete`, so this should currently fail at the DB level with a foreign key error surfaced as a 500; worth checking manually and fixing if the error isn't user-friendly).

## 4. Schedules

- [ ] Create a schedule (template + connected account + target sheet/tab + frequency + time + timezone). Verify `nextRunAt` is computed correctly for the chosen timezone.
- [ ] "Run now" (`POST /schedules/:id/run-now`) writes correct data into the target Google Sheet tab immediately.
- [ ] Pause a schedule — confirm the cron (`runDueSchedules`, every minute) skips it.
- [ ] Resume a paused schedule — confirm `nextRunAt` is recalculated (not stuck in the past).
- [ ] Edit a schedule's time/frequency/timezone — confirm `nextRunAt` updates (regression: this was previously a bug, see comment in `schedules.service.ts`).
- [ ] Let a daily schedule fire naturally at its scheduled time — confirm the sheet updates and `lastRunStatus` becomes `success`.
- [ ] Force a failure (e.g. temporarily revoke Google access for the connected account) and confirm retry behavior: retries at +15min, +30min, then marks `failed` with `lastError` populated and reschedules normally.
- [ ] Delete a schedule — confirm it no longer appears and the cron doesn't error on the next tick.

## 5. Google Sheets writes

- [ ] `POST /sheets/test` writes to a real sheet/tab without corrupting existing content outside the target range.
- [ ] Writing to a sheet/tab that no longer exists (deleted by the user) fails with a clear error, not a silent no-op or crash.
- [ ] Report data with special characters / very long text values writes correctly (no cell corruption, no formula injection via leading `=`/`+`/`-`/`@`).

## 6. AI insights

- [ ] `POST /ai/generate` produces a reasonable insight for a real report dataset.
- [ ] `GET /ai/history` returns prior insights for the current user only (not other users' data).
- [ ] `POST /ai/feedback` records feedback against the correct `AiReport` row.
- [ ] Behavior when `OPENAI_API_KEY` is invalid/rate-limited — confirm the user sees a clear error, not a hang or 500 with no message.

## 7. Apps Script add-on

- [ ] Installing/opening the add-on in a real Google Sheet shows the sidebar (`onOpen` trigger).
- [ ] Sidebar loads correctly inside the Sheets iframe (not just standalone) — check `sidebar/src/utils/appscript.ts` calls resolve.
- [ ] Add-on works in both a brand-new spreadsheet and an existing one with unrelated data/sheets.

## 8. Cross-cutting

- [ ] All flows above work correctly when the user has **zero** connected accounts / templates / schedules (empty states render, no crashes).
- [ ] Concurrent schedules for the same user/account don't interfere (e.g. two schedules targeting different tabs of the same sheet).
- [ ] `GET /health` returns `status: ok` in production.

---

## Automated tests

Current automated coverage (`backend/src/**/*.spec.ts`, run via `npm test`):

- `crypto.util.spec.ts` — encrypt/decrypt round-trip, wrong-secret behavior.
- `schedules.service.spec.ts` — `calculateNextRun` (daily/weekly/monthly rollover, timezone handling).
- `app.controller.spec.ts` — `/health` endpoint DB-up / DB-down branches.

### Not automated yet (documented, not implemented — do these next as the project grows)

- **`SchedulesService.runDueSchedules` / `executeSchedule`** — needs mocked `MetaService`/`SheetsService`/`PrismaService` to test the retry/failure state machine (`handleFailure`) without hitting real APIs. Highest-value next test: verify `retryCount` progression and that it stops retrying after `RETRY_DELAYS_MINUTES.length` attempts.
- **`TemplatesService` / `SchedulesService` ownership checks** (`assertOwnsScheduleInputs`, `findOwned`) — verify a user can never read/modify another user's template, account, or schedule by ID. Security-relevant; worth prioritizing.
- **`AuthController` / `GoogleStrategy`** — hard to unit test meaningfully (OAuth flow), better covered by the manual checklist above plus e2e tests against a test Google account.
- **`MetaService` insights import/pagination** — worth a test with a mocked Graph API response once the import logic changes again (currently stable).
- **E2E**: a real `supertest` flow hitting `/health` and one authenticated endpoint against a test database, wired into CI once a disposable test DB is available (out of scope for the current CI, which has no database — see [.github/workflows/ci.yml](.github/workflows/ci.yml)).
