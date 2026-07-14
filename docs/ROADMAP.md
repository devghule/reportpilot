# Roadmap

Engineering/infrastructure roadmap — not a product feature roadmap. Ordered
roughly by when it'll actually matter, not by general importance.

## Now (do before real user growth)

- [ ] Separate Supabase project for production vs. local dev (currently both may point at the same DB depending on setup — confirm and split, see [DEPLOYMENT.md](DEPLOYMENT.md)).
- [ ] Decide the FK behavior for deleting a `Template`/`ConnectedAccount` that's still referenced by a `Schedule` (currently undefined — see [TEST_CHECKLIST.md](TEST_CHECKLIST.md) item 3 and [KNOWN_ISSUES.md](KNOWN_ISSUES.md)).
- [ ] Add the two "not automated yet" high-value tests from `TEST_CHECKLIST.md` (schedule retry state machine, cross-user ownership checks) — these guard against silent data leaks and broken retries.

## Next (once there are real users / real schedule volume)

- [ ] Sentry integration (see [DEPLOYMENT.md](DEPLOYMENT.md#future-sentry) — codebase already shaped for this, it's a ~30 minute add when needed).
- [ ] A staging environment (second Render service + second Supabase project) if release risk grows enough to justify the extra maintenance — not worth it yet for a solo dev shipping to a small user base.
- [ ] If schedule volume grows past what a once-a-minute in-process cron comfortably handles, move `SchedulesService.runDueSchedules` execution to a real job queue (e.g. BullMQ + Redis) — see [ARCHITECTURE.md](ARCHITECTURE.md#scheduling) for why it's simple today.

## Later (only if scale genuinely demands it)

- [ ] Split the backend into separate API / worker processes if the cron job's execution time starts affecting API request latency.
- [ ] Consider a monorepo build tool (Turborepo/Nx) only if a fourth package is added or CI build times become a real problem — not justified for three packages today.
- [ ] Rate limiting / abuse protection on public-facing OAuth callback routes if abuse is ever observed.

## Explicitly not planned

- Docker/Kubernetes — one Render service is enough at this scale.
- Multi-region deployment.
- A public API for third parties (Meta/Google credentials are per-user, tightly scoped to this add-on's own OAuth apps).
