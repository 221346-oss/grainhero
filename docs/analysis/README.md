# Analysis & Planning Documents

All discovery, design, and planning documentation for GrainHero — organized by theme.

> ⚠️ **Discovery only** — no code was modified during this analysis phase.  
> Start with `system-architecture/00_EXECUTIVE_OVERVIEW.md` if new to this project.

---

## Folder Map

| Folder                    | Contents                                                                           | Start Here                        |
| ------------------------- | ---------------------------------------------------------------------------------- | --------------------------------- |
| `system-architecture/`    | Executive overview, full architecture, repo comparison, complete context           | `00_EXECUTIVE_OVERVIEW.md`        |
| `ai-ml-pipeline/`         | ML ensemble design, 9-feature spec, training pipeline, research paper summaries    | `05_AI_ML_ARCHITECTURE.md`        |
| `iot-hardware/`           | IoT protocol comparison, LoRaWAN design, silo engineering, frugal BOM              | `06_IOT_WIRELESS_ARCHITECTURE.md` |
| `business-risk/`          | Market sizing, pricing tiers, competitor analysis, FMEA risk register              | `09_BUSINESS_FEASIBILITY.md`      |
| `implementation-roadmap/` | Gap analysis (33 gaps with code stubs), migration roadmap, sprint effort estimates | `03_FEATURE_GAP_ANALYSIS.md`      |

---

## System Architecture

| File                                                                               | Purpose                                                                |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [00_EXECUTIVE_OVERVIEW.md](system-architecture/00_EXECUTIVE_OVERVIEW.md)           | One-page summary — feature status, P0 blockers, tech stack             |
| [00_MASTER_ANALYSIS.md](system-architecture/00_MASTER_ANALYSIS.md)                 | **Complete unified document** — all 12 sections, all diagrams          |
| [01_ARCHITECTURE_OVERVIEW.md](system-architecture/01_ARCHITECTURE_OVERVIEW.md)     | Data flows, folder structure, ER diagram, env vars, auth flow          |
| [02_REPOSITORY_COMPARISON.md](system-architecture/02_REPOSITORY_COMPARISON.md)     | Route-by-route map, schema comparison, bug locations with line numbers |
| [GRAINHERO_COMPLETE_CONTEXT.md](system-architecture/GRAINHERO_COMPLETE_CONTEXT.md) | Original complete codebase context document                            |

## AI / ML Pipeline

| File                                                                            | Purpose                                                                |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| [05_AI_ML_ARCHITECTURE.md](ai-ml-pipeline/05_AI_ML_ARCHITECTURE.md)             | Ensemble design, 9-feature spec, performance tables, training pipeline |
| [12_RESEARCH_PAPER_SUMMARIES.md](ai-ml-pipeline/12_RESEARCH_PAPER_SUMMARIES.md) | 12 paper summaries mapped to code decisions + 19 external datasets     |

## IoT & Hardware

| File                                                                            | Purpose                                                           |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| [06_IOT_WIRELESS_ARCHITECTURE.md](iot-hardware/06_IOT_WIRELESS_ARCHITECTURE.md) | ESP32 pin map, state machine, LoRaWAN target design, battery calc |
| [07_SILO_ENGINEERING.md](iot-hardware/07_SILO_ENGINEERING.md)                   | 100-tonne silo geometry, structural calcs, full BOM with prices   |
| [08_FRUGAL_ENGINEERING.md](iot-hardware/08_FRUGAL_ENGINEERING.md)               | Cost reduction, local sourcing directory, unit economics          |

## Business & Risk

| File                                                                   | Purpose                                                                   |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [09_BUSINESS_FEASIBILITY.md](business-risk/09_BUSINESS_FEASIBILITY.md) | TAM/SAM/SOM, pricing tiers, competitive matrix, GTM, grant list           |
| [10_RISK_ANALYSIS.md](business-risk/10_RISK_ANALYSIS.md)               | Risk quadrant chart, FMEA table, 10 technical risks with exact file links |

## Implementation Roadmap

| File                                                                            | Purpose                                                              |
| ------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [03_FEATURE_GAP_ANALYSIS.md](implementation-roadmap/03_FEATURE_GAP_ANALYSIS.md) | 33 gaps with exact code stubs, SQL triggers, Edge Function templates |
| [04_MIGRATION_ROADMAP.md](implementation-roadmap/04_MIGRATION_ROADMAP.md)       | Phase diagram, sprint deliverables, test + production checklists     |
| [11_EFFORT_ESTIMATION.md](implementation-roadmap/11_EFFORT_ESTIMATION.md)       | Gantt chart, per-task hour tables, critical path, 3-day demo sprint  |
| [implementation_plan.md](implementation-roadmap/implementation_plan.md)         | Original implementation plan                                         |
