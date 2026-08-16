# GrainHero / TEQrock -- Unified Knowledge Base
> **Version:** Living Document | **Owner:** Founder (TEQrock) | **Last Updated:** August 2026
>
> This folder is the **single source of truth** for all strategic, technical, research, and operational context.
> It is designed to autonomously evolve as new research papers, session discussions, and implementation updates are added.

## Folder Structure

| Folder | Contents |
|---|---|
| 01_business/ | Business plan, master project doc, investor context, product philosophy |
| 02_research_papers/ | Research Knowledge Base (auto-indexed), PDF summaries, new paper ingestion |
| 03_technical_context/ | Full codebase context dump, implementation summaries |
| 04_roadmaps_and_plans/ | Actionable pilot roadmap, sprint plans, execution guides |
| 05_codebase_audits/ | Audit reports, migration reports, parity audits, verification reports |
| 06_hardware_and_iot/ | Firmware pipeline docs, IoT architecture, hardware guides |

## How This Knowledge Base Evolves

1. **New Research Papers:** Run `python scripts/index_research_papers.py` -> `02_research_papers/RESEARCH_KNOWLEDGE_BASE.md` auto-updates.
2. **New AI Sessions:** Update `AI_CHAT_LOG.md` (local-only, not pushed to GitHub).
3. **New Codebase Audits:** Add reports to `05_codebase_audits/`.
4. **New Hardware:** Document in `06_hardware_and_iot/`.
5. **New Business Decisions:** Update `01_business/MASTER_PROJECT_DOCUMENT_v3.md`.

## PERMANENT DIRECTIVES (Always Apply)

1. We do NOT react to spoilage. We PREVENT it from ever beginning.
2. Training environment (local PC) is STRICTLY separate from Serving environment (Render).
3. Hot-swap pipeline: Train -> .onnx -> Upload to Supabase -> Render auto-fetches. Never retrain on cloud.
4. Wheat thresholds: Danger at >20C / >70% RH / >13.5% moisture.
5. AI_CHAT_LOG.md is LOCAL ONLY. Never push to GitHub.
