# Claude for Open Source application: repo hardening + application copy

## What the program actually looks for

From the program page and accepted-applicant write-ups (Daniel Avila, Simon Willison's notes, July 2026 expansion):

- Formal bars are download/dependent/PR-count based (500+ dependent repos, 100+ PRs into other repos, 20+ external contributors, OpenSSF criticality 0.4+). GrainHero meets none of these today — it is a young, single-owner application repo, not a library.
- The escape hatch is explicit and is what most non-library winners used: "If you maintain something the ecosystem quietly depends on, apply anyway and tell us about it." Reviews are rolling, up to 10,000 accepted, so a credible narrative + a repo that visibly looks maintained matters more than stars.
- Accepted write-ups repeatedly cite: a real README with screenshots, clear install path, license, contribution docs, CI that passes, issues/PRs open to outsiders, and a concrete statement of who depends on the project and what the free Max would unlock.

So the strategy: position GrainHero as **critical-infrastructure-adjacent open source for post-harvest food loss in emerging markets** — a domain with essentially no open reference implementation — and make the repo look unmistakably maintained and contributable.

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

## Part 3 — Contributor-readiness signals

- Seed `docs/GOOD_FIRST_ISSUES.md` with 8–12 concrete, scoped tasks so the maintainer can open them as GitHub issues labelled `good first issue` / `help wanted` right after this lands.
- Add `.env.example` with every required key name (no values) so a stranger can actually boot the app — currently onboarding depends on a private `.env`.
- Verify `bun run lint`, typecheck and build pass so the new CI workflow is green on first run.

## Part 4 — Application copy (delivered as `docs/CLAUDE_OSS_APPLICATION.md`, plus pasted in chat)

Three fields to fill:

1. **Project reach and impact** — leads with the gap-it-fills angle: post-harvest grain loss is a $1.3T/yr global problem and there is no open, end-to-end reference stack (firmware + ingest + ML + multi-tenant ops) for it; GrainHero publishes the whole chain under MIT — ESP32 firmware, 5-crop ONNX spoilage models, telemetry pipeline, RLS multi-tenant schema. States real, verifiable numbers only (commit count, live deployment at grainhero.app, pilot context, dataset size), and is honest that it does not meet the download-count bars while making the "quietly depended on / fills a gap" case.
2. **How the subscription will be used** — specific and verifiable: getting the ONNX inference path and firmware to a documented, forkable reference implementation; writing contributor-facing docs and tests to raise the bus factor above one; Urdu/regional localization; reviewing incoming PRs once `good first issue` labels go live. Not "it will help me code faster".
3. **Other info** — repo URL, live URL, license, that the repo was cleaned and CI-gated specifically for public contribution, and the honest borderline-applicant note invoking the "don't quite fit? apply anyway" line.

Every claim in the copy will be cross-checked against the repo before writing — no invented star counts, downloads, users, or partnerships.

## Technical notes

- No application code or product behaviour changes; this is docs, CI, templates and file removal only.
- CI workflow uses `oven-sh/setup-bun`, runs `bun install --frozen-lockfile`, `bun run lint`, `bunx tsgo --noEmit`, `bun run build`, `bun run test:integration`.
- File deletions via `git rm`-equivalent shell removal; `.gitignore` updated for `.kiro/`, `.lovable/`, `.agents/`, `.workspace/`.

## Open question

If you have real traction numbers I can't see from the repo (GitHub stars, pilot deployments in tonnes monitored, named mills/customers, university or NICAT affiliation you want cited), send them and I'll fold them into the impact answer — those are the strongest part of a borderline application.
