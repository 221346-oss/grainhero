# GrainHero

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Build Status](https://github.com/grainhero/grainhero/actions/workflows/ci.yml/badge.svg)](https://github.com/grainhero/grainhero/actions)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-emerald.svg)](#)

A high-performance B2B stack for agritech: Real-time grain silo monitoring, IoT telemetry, AI-driven spoilage prediction, and enterprise logistics.

[grainhero.app](https://grainhero.app)

## Platform Capabilities

- **Real-time Telemetry** — Sub-second monitoring of temperature, humidity, and CO2 levels via ESP32/IoT nodes.
- **AI Spoilage Prediction** — ONNX-based risk scoring for Wheat, Rice, Maize, Barley, and Sorghum.
- **Enterprise Operations** — End-to-end QC, intake, and dispatch workflows with full traceability.
- **Marketplace & CRM** — Integrated Stripe commerce, buyer management, and field service technician dispatch.
- **Multi-Tenant Security** — Deep RLS integration supporting Super Admin, Admin, Manager, and Technician roles.

## Architecture

```text
[ IoT Sensors ] -> [ Firebase RTDB ] -> [ Supabase Edge Hooks ]
                                                |
[ React 19 / TanStack Start ] <---------- [ Postgres + RLS ]
            |
    [ Stripe / Twilio ]
```

## Tech Stack

- **Core**: TanStack Start v1 (React 19), Vite 7.
- **Styling**: Tailwind CSS v4 (Emerald/Slate aesthetic).
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions).
- **AI/ML**: ONNX Runtime serving predictive models.
- **Hosting**: Cloudflare Workers (Edge runtime).

## Getting started

```bash
bun install
cp .env .env.local   # then fill in your own Supabase / Stripe / Firebase keys
bun run dev          # http://localhost:8080
```

### Scripts

| Command                    | Purpose                  |
| -------------------------- | ------------------------ |
| `bun run dev`              | Start the dev server     |
| `bun run build`            | Production build         |
| `bun run lint`             | ESLint                   |
| `bun run format`           | Prettier                 |
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
