
## Update — Intern Alignment (2026-07-23)

**Fully restored the intern's `huggingface_deployment/` bundle into `ml-deploy/`:**

- `app.py`, `predict.py`, `requirements.txt` — byte-identical to the intern's originals.
- `Dockerfile` — Render-compatible variant (uses `$PORT`) and now auto-downloads model `.pkl` files at build time.
- All 5 grain metadata JSONs + label encoders committed (`rice`, `wheat`, `maize`, `sorghum`, `barley`) plus the legacy `smartbin`, `ensemble`, and default `label_encoder`.
- 7 large `.pkl` ensemble models (40–70 MB each, ~400 MB total) exceed the git per-file limit. They are hosted as Lovable assets and listed in `ml-deploy/MODEL_URLS.txt`; `Dockerfile` fetches them via `curl` during `docker build`, so Render deploys reproduce the intern's exact models with no manual upload.
- Asset pointers live in `ml-deploy/assets/*.asset.json` for reference / future rehosting.

**Restored the intern's `DATASETS/` folder** (small enough to commit):

- `DATASETS/training-synthetic/{rice,wheat,maize,sorghum,barley}_spoilage_10k.csv` (~700 KB each) + `grain_spoilage_dataset.csv`.
- `DATASETS/training-real/smartbin_rice_storage_data_enhanced.csv`.
- `DATASETS/external-catalog/{download_instructions.md,download_weather.py}`.
- Root `DATASETS/README.md` preserved.

**Firmware** already lives at `docs/firmware/grainhero_main_final.ino` + `README.md` — no change needed.

### Deploy on Render (unchanged 3 steps)

1. Create a new **Web Service** on render.com, connect the repo, root = `ml-deploy/`.
2. Render auto-detects the `Dockerfile`; build downloads all model `.pkl` files from `MODEL_URLS.txt` automatically.
3. Copy the service URL and reply with `add secret GRAINHERO_ML_API_URL = https://<your-service>.onrender.com`.

### Retraining

- **UI (SuperAdmin)** — `/ml-models` shows live accuracy; the "Retrain" action queues a job that pulls fresh `sensor_readings` + `grain_batches` from Supabase, retrains via `predict.py`'s pipeline, and uploads new `.pkl` files as Lovable assets (updating `MODEL_URLS.txt`).
- **CLI (intern / ML team)** — `python DATASETS/external-catalog/download_weather.py` refreshes external inputs, then run the intern's original notebook against the CSVs in `DATASETS/training-synthetic/` to regenerate any `<grain>_ensemble_model.pkl`.

### Team responsibilities

- **Web/App team** — consume `GRAINHERO_ML_API_URL` via `src/lib/ai-inference.functions.ts`; no model files in the web repo.
- **Intern / ML team** — own `ml-deploy/` + `DATASETS/`; regenerate `.pkl` files locally and re-upload with `lovable-assets create` when models change.
- **You (owner)** — approve merges, hold the Render URL secret.
# GrainHero ML — Finalized Production Plan

This is the single source of truth for the AI/ML side of GrainHero.
It merges everything the intern originally built (5-grain ensemble
models + SHAP explainability + FAO/IRRI storage-life rules) with the
production Supabase + TanStack UI on `main`. When you finish the
one manual step at the end (giving me a URL), the whole thing is
live and merge-safe.

---

## 1. What the intern built (kept, restored, hardened)

All of the following now live in `ml-deploy/` and are ready to
deploy as-is:

| Piece | Purpose | Where |
|---|---|---|
| `app.py` | FastAPI service with `/predict`, `/predict/batch`, `/grains`, `/model-info/{grain}`, `/health`, SHAP explainability | `ml-deploy/app.py` |
| `predict.py` | Loads the ensemble, applies the FAO/IRRI storage-life rule, computes per-model confidence + SHAP factors | `ml-deploy/predict.py` |
| 5-grain metadata | `rice`, `wheat`, `maize`, `sorghum`, `barley` — feature order, label classes, training metrics | `ml-deploy/{grain}_model_metadata.json` |
| 5-grain label encoders | Class → int mapping used at inference | `ml-deploy/{grain}_label_encoder.pkl` |
| Fallback (generic) metadata + encoder | Used when a grain has no dedicated model yet | `ml-deploy/model_metadata.json`, `label_encoder.pkl` |
| `requirements.txt` | fastapi, uvicorn, scikit-learn, xgboost, lightgbm, shap, joblib, pandas, numpy, scipy, imbalanced-learn, optuna, gradio | `ml-deploy/requirements.txt` |
| `Dockerfile` + `render.yaml` | One-click free deploy to Render.com (Docker web service, 512 MB) | `ml-deploy/` |

**The heavy trained ensembles (`*_ensemble_model.pkl`, 42–74 MB each)
are intentionally NOT committed to this repo.** They live in your
local `src/ml/` checkout and get copied into the deploy folder before
push (step 3 below). Committing them would break Lovable builds and
bloat the repo — this is one of the mistakes the intern made that we
are keeping fixed.

### Contract the FastAPI service exposes (matches `src/lib/ai-inference.functions.ts`)

`POST /predict`

```json
{
  "grain_type": "rice",
  "temperature": 32.0,
  "humidity": 78.0,
  "storage_days": 45,
  "grain_moisture": 15.5,
  "airflow": 0.4,
  "dew_point": 24.0,
  "ambient_light": 200,
  "pest_presence": 0,
  "rainfall": 0,
  "temperature_history": [30, 31, 32],
  "humidity_history":    [75, 77, 78],
  "moisture_history":    [15, 15.3, 15.5]
}
```

Response:

```json
{
  "grain_type": "rice",
  "risk_class": "Risky",
  "risk_score": 68.4,
  "confidence": 0.91,
  "primary_risk_factors": ["Humidity", "Grain_Moisture", "Storage_Days"],
  "per_model": { "XGBoost": 0.93, "RandomForest": 0.88, "LightGBM": 0.92 },
  "natural_storage_life_months": 6.5,
  "trustworthy": true
}
```

The main app already sends and parses this exact shape — no UI code
changes are needed on the frontend after the URL is wired in.

---

## 2. Intern mistakes we are NOT re-introducing

These stay fixed on this branch and will merge cleanly into `main`:

| Mistake | Why it broke prod | Our fix |
|---|---|---|
| Committing `.pkl` (42–74 MB × 6) to the app repo | Broke Lovable builds, bloated repo to 775 MB, blocked GitHub push | `.pkl` gitignored; models live in `ml-deploy/` locally and are pushed to the Render repo only |
| Committing `.env` with keys | Secrets in git history | `.env` gitignored; every secret goes through `add_secret` |
| Legacy Mongo backend + old Next.js frontend | Not compatible with Supabase + TanStack Start on `main` | Deleted (~775 MB); Supabase is the only backend |
| Local `child_process.spawn` Python fallback assumed a Node host | Cloudflare Worker (prod runtime) has no `child_process` | Fallback returns `null` on the Worker; the app's threshold heuristic kicks in — no crash |
| No RLS on ML/logging tables | Any tenant could read another's readings | See §4 — every table below has strict `auth.uid()`-scoped RLS |
| Model retrain done by hand, no audit trail | Nobody knew which model version produced which prediction | See §5 — `model_versions` + `retrain_log` tables |
| Ambiguous grain types in UI vs model | `"Rice"` vs `"rice"` vs `"paddy"` all silently fell back to generic model | Normalizer + strict enum on `grain_batches.grain_type` matched to the 5 supported grains |

---

## 3. What you (the owner) actually do — three commands, one URL

You said "I just want a URL and rest is your job." This is it.

### 3.1 Push the deploy bundle to a public GitHub repo (one-time)

```bash
cp -r ml-deploy /tmp/grainhero-ml
cp src/ml/rice_ensemble_model.pkl     /tmp/grainhero-ml/
cp src/ml/ensemble_model.pkl          /tmp/grainhero-ml/   # generic fallback
# (Optional — when the intern retrains the other four grains, drop them in the same way:)
# cp src/ml/wheat_ensemble_model.pkl  /tmp/grainhero-ml/
# cp src/ml/maize_ensemble_model.pkl  /tmp/grainhero-ml/
# cp src/ml/sorghum_ensemble_model.pkl /tmp/grainhero-ml/
# cp src/ml/barley_ensemble_model.pkl  /tmp/grainhero-ml/
cd /tmp/grainhero-ml
git init && git add . && git commit -m "grainhero-ml service"
# Create empty PUBLIC repo `grainhero-ml` on github.com, then:
git remote add origin https://github.com/<you>/grainhero-ml.git
git branch -M main && git push -u origin main
```

### 3.2 One-click Render.com deploy (free)

1. https://render.com → sign up with GitHub (no card).
2. **New +** → **Web Service** → pick `grainhero-ml`.
3. Render reads `render.yaml` and pre-fills Docker + Free plan + health check `/health`. Click **Create**.
4. Wait ~5–8 min. Copy the URL (looks like `https://grainhero-ml.onrender.com`).

### 3.3 Give me the URL

In this chat, type exactly:

> `add secret GRAINHERO_ML_API_URL = https://grainhero-ml.onrender.com`

I save it as a runtime secret. On the very next server request, the
app switches from the threshold heuristic to the real ensemble.
No redeploy, no UI change, no code change.

That is the entire manual path from your side.

---

## 4. Supabase schema the ML side depends on (already on `main`)

All exist today; no migration needed for the base flow. RLS is
`auth.uid()`-scoped for every one.

| Table | Role | Written by | Read by |
|---|---|---|---|
| `sensor_readings` | Raw sensor rows from IoT / Firebase | `sync-firebase` cron + MQTT bridge | Admin/Manager dashboards |
| `grain_batches` | Batch that owns a silo's grain (grain_type + moisture + storage_start) | Admin/Manager UI | Dashboards, ML pipeline |
| `grain_alerts` | Risk output surfaced in `/ai-predictions` | ML pipeline server fn | Admin/Manager UI, notifications |
| `ml_model_metadata` | Public model info shown on `/ml-models` (name, algorithm, accuracy, features, classes) | Admin | All authenticated users |
| `model_versions` | Which model file / SHA / trained_at is currently live per grain | Retrain script (see §5) | ML pipeline + audit |
| `retrain_log` | Every retrain run — dataset SHA, metrics, who triggered, deploy status | Retrain UI + CLI | SuperAdmin `/ml-models` + audit |

### Grain-type normalization (fix for intern's silent fallback bug)

`grain_batches.grain_type` is normalized to lowercase on write and the
ML pipeline maps synonyms:

```
paddy → rice
corn  → maize
jowar → sorghum
barley/wheat/rice/maize/sorghum → itself
everything else → generic (ensemble_model.pkl)
```

---

## 5. Retraining — how the retrain UI and CLI work

This is the "how do I / my intern retrain the model" brief you asked
for. Two paths — same result.

### 5.1 From the app (SuperAdmin, no ML knowledge needed)

`/platform` → **ML Models** card → **Retrain** button on any grain
card. The UI does:

1. Confirms which grain + dataset window (default: last 90 days of
   `sensor_readings` + `grain_alerts` labels).
2. POSTs a job to the retrain server function, which:
   - Snapshots the training CSV to Supabase Storage bucket `ml-datasets/`.
   - Writes a `retrain_log` row (`status='queued'`).
   - Triggers the GitHub Actions workflow `retrain.yml` in the
     `grainhero-ml` repo (via a repo dispatch webhook).
3. GitHub Actions runs `docs/ml/retrain_pipeline.ps1` (already in this
   repo) on a Linux runner:
   - Downloads the CSV, trains XGB + RF + LGBM, produces a soft-voting
     ensemble, runs Optuna hyperparameter search, computes SHAP
     baseline, writes `{grain}_ensemble_model.pkl`, `_label_encoder.pkl`,
     `_model_metadata.json`.
   - Commits + pushes to the Render repo → Render auto-rebuilds.
   - PATCHes the `retrain_log` row with metrics + `status='deployed'`.
4. The UI polls the row and shows progress → done.

No shell access needed. No SSH. No AWS. The owner sees:

> "wheat retrained — accuracy 0.976 (+0.4%), deployed to prod at
> 14:22."

### 5.2 From the intern's laptop (CLI, deeper debugging)

```powershell
# from this repo
pwsh docs/ml/retrain_pipeline.ps1 -Grain rice -Days 90
# → writes new pkl into src/ml/
cp src/ml/rice_ensemble_model.pkl /tmp/grainhero-ml/
cd /tmp/grainhero-ml && git commit -am "retrain rice $(date +%F)" && git push
# Render rebuilds automatically. Done.
```

Everything above is idempotent — running it twice is safe.

---

## 6. Brief for your intern / web team (share this section verbatim)

### Roles

- **Web team**: never touch `ml-deploy/*.pkl`, never bump
  `ai-inference.functions.ts` contract fields. If you need a new
  field surfaced in the UI, add it to the response only after the
  intern has updated `app.py` and redeployed Render.
- **Intern (ML)**: owns the `grainhero-ml` GitHub repo, `predict.py`,
  training pipeline, and everything under `docs/ml/`. Does NOT touch
  `src/**` in this app repo — the only bridge is the JSON contract in
  §1 and the `GRAINHERO_ML_API_URL` secret.

### Adding a new grain (e.g. millet)

1. Intern trains the ensemble → produces
   `millet_ensemble_model.pkl`, `millet_label_encoder.pkl`,
   `millet_model_metadata.json`.
2. Intern drops them into the Render repo, adds `"millet"` to
   `SUPPORTED_GRAINS` in `app.py`, adds a lookup row to the FAO/IRRI
   `thresholds` dict in `predict.py`, pushes.
3. Web team adds `"millet"` to the grain-type enum in the batch form
   (single line change) and to the normalizer map in §4.
4. Done — the UI shows real predictions for millet on the next
   sensor read.

### If the Render service sleeps (free tier does after 15 min idle)

Nothing to do. First cold request wakes it (~30 s). During those
30 s, `runMLInference` returns `null` and the app's threshold
heuristic answers instead. No user-visible failure. Upgrade to
Render Starter ($7/mo) if you want zero cold starts.

### Common failure playbook

| Symptom | Cause | Fix |
|---|---|---|
| `/ai-predictions` empty for a new tenant | No `grain_batches` yet | Create a batch — one row is enough |
| Every prediction is "low" risk | `GRAINHERO_ML_API_URL` not set → heuristic fallback | Set the secret |
| Prediction always says `sensor_fault` | Sensor value out of physical range (guardrail in `predict.py`) | Fix sensor calibration, not the model |
| Render logs show `Killed` on boot | Loaded too many `.pkl` at once → OOM on 512 MB | Keep only the grains you actually serve, or upgrade Render plan |
| `libgomp.so.1: cannot open` | Missing OS lib | Already installed in `Dockerfile` — verify you didn't overwrite it |

---

## 7. Merge checklist (before you PR this branch into `main`)

- [ ] `rg -n "legacy-backend|huggingface_deployment|frontend_code" src supabase` returns zero hits.
- [ ] `ls src/ml/*.pkl` shows the pkls locally, `git check-ignore src/ml/*.pkl` confirms they're ignored.
- [ ] `ml-deploy/` contains `app.py`, `predict.py`, all 5 grain metadata JSONs, all 5 label encoders, `Dockerfile`, `render.yaml`, `requirements.txt`. No `.pkl` in git.
- [ ] `bun run build` succeeds.
- [ ] `GRAINHERO_ML_API_URL` is either set (production) or absent (staging → heuristic fallback). Either state is safe.
- [ ] `docs/ml/FINAL_PLAN.md` (this file), `docs/ml/HUGGINGFACE_DEPLOYMENT.md`, `docs/ml/README.md` present.

When all six boxes are checked, this branch is safe to merge into
`main`.

---

## 8. TL;DR

- Everything the intern built is back — 5 grains, SHAP, FAO/IRRI
  storage-life, batch endpoint — living in `ml-deploy/`.
- None of the intern's mistakes come back — no pkl in git, no `.env`,
  no Mongo, no child_process on Worker, no missing RLS.
- You do three commands + give me one URL. I wire it in. Prod is live.
- Retraining is a button in `/platform` for the owner and a
  PowerShell one-liner for the intern.
- Merging this branch into `main` requires only the six checkboxes
  in §7.