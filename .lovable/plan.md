# Claude for Open Source application: repo hardening + application copy

## Track: Community builders (20+ external contributors)

You're applying under the **Community builders** criterion: one repo with 20 or more unique external contributors whose PRs were merged in the last 12 months. You have 11 and will arrange 9 more. That changes the goal of this work: the repo must be genuinely easy for a newcomer to clone, run, pick a scoped task and land a merged PR — fast, and 9 times over.

From the program page and accepted-applicant write-ups (Daniel Avila, Simon Willison's notes, July 2026 expansion): reviews are rolling, up to 10,000 accepted, and reviewers look at README quality, working install path, license, contribution docs, green CI, and visible issue/PR activity from people other than the owner.

So everything below is optimized for one outcome: **9 more external contributors with merged PRs, and a repo that visibly supports them.**

## Part 1 — Repo cleanup (make it read as a maintained OSS project)

Root today has leftovers that read as private working notes: `IMPLEMENTATION_SUMMARY.md`, `WORK_DIVISION_SUMMARY.txt`, `projcontext.md`, `AGENTS.md`, `.kiro/`, plus `docs/changelog`, `docs/reports`, `docs/development` full of internal daily reports and Urdu-mixed scratch notes.

- Delete or relocate private-working-notes files from root; keep root to: `README.md`, `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, config files.
- Prune `docs/`: keep `architecture/`, `guides/`, `ml/`, `firmware/`, `analysis/` (trimmed), `operations/`. Drop internal daily reports, verification logs, and scratch/mixed-language notes (`docs/development/misc.md`, `docs/reports/DAILY_REPORT_*`, blocker-verification files, etc.).
- Move `.kiro/` and agent scratch config out of the published tree (gitignore).
- Remove `datasets/.gitkeep` clutter only if the folder is unused; otherwise document it.

## Part 2 — OSS health files reviewers check

- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1).
- `.github/ISSUE_TEMPLATE/` — bug report, feature request, `config.yml` pointing to Discussions.
- `.github/PULL_REQUEST_TEMPLATE.md`.
- `.github/workflows/ci.yml` — install, lint, typecheck, build, integration tests on push/PR (this is the single most visible "maintained" signal; the repo currently only has a cron workflow).
- `.github/dependabot.yml` — weekly npm + actions updates.
- `CHANGELOG.md` — Keep-a-Changelog format seeded from the existing `docs/changelog` entries.
- `docs/ARCHITECTURE.md` — one diagram-led page: ESP32 → Firebase → Supabase → server functions → ONNX ML → dashboards.
- `docs/ROADMAP.md` — public roadmap with explicit "help wanted" areas (LoRaWAN gateway firmware, Urdu i18n, offline-first sync, additional crop models).
- `README.md` upgrade: badges (CI, license, stack), one-screenshot hero, 60-second quickstart, architecture diagram, "who this is for", "good first issues" link, contributor section.
- `SECURITY.md` review: private reporting instructions + supported versions.

## Part 3 — Contributor onboarding (the part that gets you to 20)

- `docs/GOOD_FIRST_ISSUES.md` — 20+ concrete, scoped, independent tasks written so each is one small PR by one person (no two tasks touching the same file, so 9 people can work in parallel without conflicts). Mix of: single-page a11y fixes, missing `alt`/aria labels, Urdu/i18n string extraction, one unit test per util, docs pages, a crop-model README, small landing-page polish, `.env.example` key docs. Each entry gets: title, files to touch, acceptance criteria, difficulty — copy-pasteable straight into GitHub issues.
- `CONTRIBUTING.md` rewrite: 5-minute setup, how to run without real Supabase/Stripe keys, branch/commit/PR conventions, review turnaround promise, first-PR walkthrough.
- `.env.example` with every required key name (no values) so a stranger can actually boot the app.
- `docs/DEVELOPMENT.md` — local dev troubleshooting so a newcomer doesn't stall and abandon the PR.
- Verify `bun run lint`, typecheck and build pass so CI is green on first run and contributor PRs aren't blocked by pre-existing failures.

## Part 4 — Application copy (delivered as `docs/CLAUDE_OSS_APPLICATION.md`, plus pasted in chat)

Written for the Community-builders angle, and honest about the count (written so it holds up whether you land at 20 or narrowly under).

1. **Project reach and impact** — GrainHero as the open reference stack for post-harvest grain loss (a $1.3T/yr global problem) with no existing end-to-end open implementation: ESP32 firmware, 5-crop ONNX spoilage models, telemetry pipeline, RLS multi-tenant ops — all MIT. Then the community angle: external contributors merged in the last 12 months, active issue queue, contributors drawn from the agritech/emerging-markets space, live deployment at grainhero.app.
2. **How the subscription will be used** — reviewing and unblocking the growing contributor queue, expanding the `good first issue` pipeline, raising the bus factor above one via docs and tests, Urdu/regional localization, hardening the firmware + ONNX path into a forkable reference. Not "it will help me code faster".
3. **Other info** — repo URL, live URL, MIT license, contributor count, CI status, and the honest note invoking "don't quite fit? apply anyway".

Every claim cross-checked against the repo — no invented stars, downloads, users or partnerships.


## Technical notes

- No application code or product behaviour changes; this is docs, CI, templates and file removal only.
- CI workflow uses `oven-sh/setup-bun`, runs `bun install --frozen-lockfile`, `bun run lint`, `bunx tsgo --noEmit`, `bun run build`, `bun run test:integration`.
- File deletions via `git rm`-equivalent shell removal; `.gitignore` updated for `.kiro/`, `.lovable/`, `.agents/`, `.workspace/`.

## Note on the 20-contributor rule

The criterion counts **unique external contributors with merged pull requests in the last 12 months** — external meaning not you, on a repo you own. Contributions must be real merged PRs; the good-first-issues list is designed so nine more people can each land one genuine, reviewable change. If you send me any traction numbers I can't read from the repo (stars, pilot tonnage, named mills, NICAT affiliation), I'll fold them into the impact answer.
