## Goal

Turn this intern branch into a **clean Supabase-aligned PR** that only adds the AI/ML integration hooks the current TanStack + Supabase app actually needs. Everything else (legacy Mongo backend, HF `.pkl` binaries, old Next.js frontend, `.env`, analysis dumps) gets relocated so it can never accidentally merge into main.

Current `src/` on this branch already matches main and does **not** import anything from `legacy-backend/`, `huggingface_deployment/`, or `frontend_code/` — verified with `rg`. So the deletions are safe.

---

## What stays (real integration surface)

- `src/lib/ai-inference.functions.ts` — HF remote call + local Python fallback (kept as-is per your answer).
- `src/lib/ml-pipeline.functions.ts` — cascade wrapper.
- `src/lib/ml-csv-logger.server.ts` — training-loop logger.
- `src/ml/smartbin_predict.py` + `src/ml/*_model_metadata.json` — reference for the HF Space + local fallback.
- `src/routes/api/public/cron/sync-firebase.ts` and `src/routes/api/firebase/live-sensors.ts` — already call `GRAINHERO_ML_API_URL`.

## What goes

Delete from repo (also add to `.gitignore` so nobody re-adds them):

1. `legacy-backend/` — full Mongo/Express rewrite, ~388 MB. Superseded by Supabase.
2. `huggingface_deployment/` — ~383 MB of `.pkl` binaries + Python service. Belongs in the HF Space repo, not this app repo.
3. `frontend_code/` — old Next.js UI, ~3.2 MB. Main is the source of truth.
4. `.env` — even if it only has Google Maps keys today, secrets don't belong in git. `.env.example` gets scrubbed too.
5. `retrain_pipeline.ps1` — points at `legacy-backend/ml/`; move a Supabase-aware version into `docs/ml/` (see below).
6. `Migration_Handover_Context.md` — moves to `docs/`.

## What moves (kept, but out of app tree)

Per your answer "Move to /docs and keep":

- `_ANALYSIS/**` → `docs/analysis/`
- `Migration_Handover_Context.md` → `docs/`
- `FIRMWARE/` → `docs/firmware/` (reference only; not deployed)
- `DATASETS/` → `docs/datasets/` (README + download instructions only; the large CSVs stay out via `.gitignore` — we keep the small README/instructions files)
- `retrain_pipeline.ps1` → `docs/ml/retrain_pipeline.ps1` with a note that it targets the HF Space repo, not this app.

## New docs for the intern (this is the "how to make ML work in prod" you asked for)

New file: `**docs/ml/HUGGINGFACE_DEPLOYMENT.md**` covering:

1. Where the HF Space source lives (the old `huggingface_deployment/` folder — instruct intern to push it to a dedicated HF Space repo, not this one).
2. Files it needs: `app.py`, `predict.py`, `Dockerfile`, `requirements.txt`, all `*_ensemble_model.pkl` + `*_label_encoder.pkl` + `*_model_metadata.json`.
3. HF Space setup: Docker SDK, hardware tier, HTTPS endpoint URL format `https://<user>-<space>.hf.space`.
4. Auth: HF Space read/write token, how to add it as `HUGGINGFACE_ACCESS_TOKEN` and expose `GRAINHERO_ML_API_URL` via `**add_secret**` in Lovable (not `.env`).
5. Request contract: exact JSON body `sync-firebase.ts` and `ai-inference.functions.ts` send (temperature, humidity, moisture, storage_days, grain_type, histories…), and the response shape the app expects (`risk_class`, `risk_score`, `confidence`, `primary_risk_factors`, `trustworthy`).
6. **How the local Python fallback works** and the caveat: `child_process.spawn` does **not** run on the Cloudflare Worker runtime the live app deploys to. Two options for making the fallback real in prod (Phase-2 work, not this PR):
  - a) Keep the fallback purely for `bun run dev` on a full Node host.
  - b) Wrap `smartbin_predict.py` in a second HF Space (or a small container on Fly/Render) and treat it as "Box 2" via a second HTTP env var (e.g. `GRAINHERO_ML_FALLBACK_URL`).
7. Retraining loop: run `docs/ml/retrain_pipeline.ps1` locally, drop refreshed `.pkl`s into the HF Space repo, HF rebuilds Docker — nothing to change in this app.
8. Graceful "ML unavailable" behavior in the app until HF is deployed: `runMLInference` returns `null`, callers must fall back to the threshold heuristic already present.

New file: `**docs/ml/README.md**` — one-page index pointing intern at the deployment guide, the retrain script, and where `GRAINHERO_ML_API_URL` is read.

## Graceful degradation while HF is not deployed

Since you answered "Not deployed yet", also:

- Confirm every call site handles `runMLInference` returning `null` (both `sync-firebase.ts` and `ml-pipeline.functions.ts` already do — verify, no change if fine).
- Do **not** add the `GRAINHERO_ML_API_URL` secret yet; document the exact `add_secret` step the intern runs once the HF Space URL exists.

## `.gitignore` additions

```
.env
.env.local
legacy-backend/
huggingface_deployment/
frontend_code/
*.pkl
DATASETS/training-real/*.csv
DATASETS/training-synthetic/*.csv
```

## Verification before opening the PR

1. `rg -n "legacy-backend|huggingface_deployment|frontend_code" src supabase` → must return zero hits (currently only stale comment strings in `firebase-sync.functions.ts` and `live-sensors.ts` — rewrite those comments).
2. `bun run build` — must succeed.
3. `du -sh .` — repo should drop from ~775 MB of legacy dirs to a normal size.
4. Git diff summary against `main` should show: deletions of the four legacy trees, new `docs/**`, updated `.gitignore`, and no `src/` code changes beyond comment cleanups.

## Out of scope for this PR (call out to intern in the doc)

- Actually deploying the HF Space.
- Replacing the Python fallback with a hosted service.
- Any Supabase schema / RLS changes.
- Any UI work.

## Deliverable

One clean commit set on `intern` branch that, when diffed against `main`, contains only:

- Deletions of `legacy-backend/`, `huggingface_deployment/`, `frontend_code/`, `.env`, `retrain_pipeline.ps1` (old location).
- Moves into `docs/` (analysis, firmware, datasets README, handover, retrain script).
- New `docs/ml/HUGGINGFACE_DEPLOYMENT.md` and `docs/ml/README.md`.
- Updated `.gitignore`.
- Comment-only cleanup in the two `firebase*` files that mention `frontend_code`.

Ready to execute on approval.