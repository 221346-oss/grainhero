# GrainHero

Ship-ready B2B platform for smart grain storage: IoT silo monitoring, spoilage
prediction, quality control, dispatch and marketplace operations.

[grainhero.app](https://grainhero.app)

## What it does

- **Silo monitoring** — live temperature, humidity, CO2 and moisture telemetry
  from ESP32 sensor nodes, streamed through Firebase and persisted in Postgres.
- **Spoilage prediction** — ONNX models per grain type (wheat, rice, maize,
  barley, sorghum) score each batch and raise graded alerts.
- **Grain operations** — intake, QC, treatment, dispatch and sale workflows with
  a full audit history.
- **Marketplace & commerce** — buyer orders, Stripe checkout, hardware install
  orders and technician scheduling.
- **Multi-tenant roles** — super admin, admin (tenant owner), manager and
  technician, each with a dedicated dashboard and row-level-security scoping.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | TanStack Start v1 (React 19, SSR + server functions) |
| Build | Vite 7 |
| Styling | Tailwind CSS v4, shadcn/ui |
| Database & auth | Supabase (Postgres, RLS, Auth, Storage) |
| Telemetry ingest | Firebase Realtime Database, synced to Supabase |
| ML serving | FastAPI + ONNX Runtime (`ml-deploy/`) |
| Payments | Stripe |
| Hosting | Cloudflare Workers (edge) |

## Getting started

```bash
bun install
cp .env .env.local   # then fill in your own Supabase / Stripe / Firebase keys
bun run dev          # http://localhost:8080
```

### Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Production build |
| `bun run lint` | ESLint |
| `bun run format` | Prettier |
| `bun run test:integration` | Vitest integration suite |

## Repository layout

```text
src/
  routes/            File-based routes (TanStack Router)
    api/public/      Webhooks, cron and public API endpoints
    _authenticated/  Role-gated app pages
  components/        UI, dashboards, landing page, domain sections
  lib/               Server functions (*.functions.ts) and shared logic
  integrations/      Supabase and Firebase clients
supabase/            Migrations, edge functions, seed data
ml-deploy/           Python ML service (training, ONNX export, inference API)
datasets/            Training data for the spoilage models
docs/                Documentation (see docs/README.md)
scripts/             Repo audit and maintenance scripts
tests/               Integration tests
```

## Documentation

Start at [`docs/README.md`](docs/README.md) for architecture, operations,
guides, ML and hardware documentation.

## Security

Never commit credentials. Service-account JSON, `.pem` and `.key` files are
gitignored. Report vulnerabilities privately as described in
[SECURITY.md](SECURITY.md) rather than opening a public issue.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Pull requests should pass lint, the
typecheck and the integration suite.

## License

[MIT](LICENSE)