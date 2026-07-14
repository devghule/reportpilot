# Release Checklist

## Versioning, branching, release strategy (solo developer)

Kept deliberately lightweight — no release manager, no staging environment,
no multi-branch flow to maintain.

- **Branching**: trunk-based. `main` is always deployable — Render deploys
  from it directly (see [DEPLOYMENT.md](DEPLOYMENT.md)). Do short-lived
  feature branches for anything nontrivial (`git checkout -b fix/schedule-retry`),
  merge to `main` when CI is green, delete the branch. For small/safe
  changes, committing straight to `main` is fine.
- **Versioning**: [SemVer](https://semver.org/) (`MAJOR.MINOR.PATCH`), tracked
  via git tags on `main` (`git tag v0.2.0`) — not via `package.json`
  `version` fields, which aren't published anywhere for a private app.
  - `PATCH` — bug fixes, no behavior change for users.
  - `MINOR` — new functionality, backward compatible.
  - `MAJOR` — breaking changes (rare for a single-tenant-per-user backend; would mean e.g. a breaking Prisma migration requiring coordinated downtime).
- **Releases**: a release = a git tag + a `CHANGELOG.md` entry, created
  right after confirming a deploy is healthy. No separate release branch,
  no draft/prerelease tooling.

## Before merging to `main`

- [ ] CI is green (lint, typecheck, build — see `.github/workflows/ci.yml`).
- [ ] `npm test` passes in `backend/`.
- [ ] If the change touches `prisma/schema.prisma`, a migration was generated (`npx prisma migrate dev --name ...`) and committed.
- [ ] If the change touches auth, Meta/Google integration, or scheduling, walk the relevant section of [TEST_CHECKLIST.md](TEST_CHECKLIST.md) manually.
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`.

## Deploying

- [ ] If there's a pending migration, run `prisma migrate deploy` against production (see [DEPLOYMENT.md](DEPLOYMENT.md#database-migrations)) — before or immediately after the deploy, per that doc's note on ordering.
- [ ] Merge to `main` (or push directly, per branching strategy above) — Render auto-deploys.
- [ ] Watch the Render deploy logs until it reports live.
- [ ] Hit `GET /health` on the production URL — confirm `status: ok` and `db: ok`.
- [ ] Smoke-test the sidebar: open a real Google Sheet with the add-on installed, confirm login and one core flow (e.g. viewing templates) work.

## After deploying

- [ ] Move the `[Unreleased]` entries in `CHANGELOG.md` under a new `## [vX.Y.Z] — YYYY-MM-DD` heading.
- [ ] Tag the release: `git tag vX.Y.Z && git push origin vX.Y.Z`.
- [ ] If the release includes any addon (`addon/`) changes, `clasp push` them too (these are not deployed by the Render pipeline — see [DEPLOYMENT.md](DEPLOYMENT.md#apps-script-add-on--clasp)).
- [ ] Watch UptimeRobot / Render logs for the next 15–30 minutes for anything unexpected.
- [ ] If anything looks wrong: previous deploys stay available in the Render dashboard (Manual Deploy → pick a prior commit) — no automated rollback, this is a manual "redeploy the last known-good commit" click.

## If something breaks after deploy

1. Check `GET /health` first — DB unreachable vs. process down are different problems.
2. Check Render logs for the stack trace (`GlobalExceptionFilter` logs every 5xx with context — see [ARCHITECTURE.md](ARCHITECTURE.md)).
3. If it's a bad deploy, roll back via Render's manual deploy of the previous commit rather than debugging live.
4. Add the issue to [KNOWN_ISSUES.md](KNOWN_ISSUES.md) if it's not something you fix immediately.
