# GrainHero documentation

Everything in this folder is reference material for the platform. Product code
lives in `src/`, the ML service in `ml-deploy/`, database migrations in
`supabase/`.

| Folder | Contents |
| --- | --- |
| [`architecture/`](architecture) | Route matrix, role/plan access matrix, public server-function contracts |
| [`analysis/`](analysis) | Deep-dive system, AI/ML, IoT, business and roadmap analysis |
| [`guides/`](guides) | Setup instructions, project handoff, Flutter integration |
| [`operations/`](operations) | Deployment readiness and runbooks |
| [`ml/`](ml) | Model training, ONNX export and free deployment plans |
| [`firmware/`](firmware) | ESP32 sensor-node firmware and wiring notes |
| [`design/`](design) | Landing page and dashboard design systems |
| [`development/`](development) | Agent conventions, debugging notes, scratch notes |
| [`changelog/`](changelog) | Dated records of shipped features and fixes |
| [`reports/`](reports) | Verification, migration and status reports |
| [`research/`](research) | Research knowledge base behind the spoilage models |
| [`phases/`](phases) | Phase-by-phase implementation specs |
| [`tests/`](tests) | Manual and integration test plans |

## Where to start

1. [`guides/SETUP_INSTRUCTIONS.md`](guides/SETUP_INSTRUCTIONS.md) — local setup.
2. [`architecture/route-matrix.md`](architecture/route-matrix.md) — every route,
   the roles allowed on it and its data scope.
3. [`analysis/system-architecture/01_ARCHITECTURE_OVERVIEW.md`](analysis/system-architecture/01_ARCHITECTURE_OVERVIEW.md)
   — how the web app, IoT pipeline and ML service fit together.