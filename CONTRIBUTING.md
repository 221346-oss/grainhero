# Contributing to GrainHero

Thanks for helping improve GrainHero. This guide covers everything you need to
get a change merged.

## Setup

```bash
bun install
bun run dev
```

You need your own Supabase project, Stripe test keys and (optionally) a
Firebase Realtime Database for telemetry. Put them in `.env.local` — never
commit real credentials.

## Before opening a pull request

```bash
bun run lint
bunx tsgo --noEmit
bun run test:integration
```

All three must pass. Run `bun run format` to apply Prettier.

## Conventions

- **Routing** — file-based routes in `src/routes/`. Never edit
  `src/routeTree.gen.ts`; it is generated.
- **Server logic** — `createServerFn` in `src/lib/*.functions.ts`. Raw HTTP
  endpoints (webhooks, cron) live under `src/routes/api/public/` and must
  verify their caller.
- **Database** — every new `public` table needs `GRANT`s, RLS enabled and
  explicit policies in the same migration.
- **Styling** — semantic design tokens only. No hardcoded colour utilities.
- **New routes** — add a row to
  [`docs/architecture/route-matrix.md`](docs/architecture/route-matrix.md) in
  the same change.

## Commit and PR style

- One logical change per pull request.
- Describe the user-visible effect, not just the diff.
- Include screenshots for UI changes.

## Reporting bugs

Open an issue with reproduction steps, expected vs actual behaviour, and the
relevant console or server log output. For security issues follow
[SECURITY.md](SECURITY.md) instead.