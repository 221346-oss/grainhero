# Deploying the GrainHero ML service on HuggingFace Spaces

This is a step-by-step for the intern taking ML from "code exists in the app"
to "app actually gets predictions in production". The heavy Python + `.pkl`
bundle used to live in this repo under `huggingface_deployment/` — that was
removed on purpose. It belongs in its own HF Space repo, not here.

---

## 1. Grab the source that used to live in this repo

Before the intern branch was cleaned, this repo shipped these files under
`huggingface_deployment/`. Get them from git history:

```
huggingface_deployment/
  app.py
  predict.py
  Dockerfile
  requirements.txt
  rice_ensemble_model.pkl
  rice_label_encoder.pkl
  rice_model_metadata.json
  wheat_ensemble_model.pkl        wheat_label_encoder.pkl        wheat_model_metadata.json
  maize_ensemble_model.pkl        maize_label_encoder.pkl        maize_model_metadata.json
  barley_ensemble_model.pkl       barley_label_encoder.pkl       barley_model_metadata.json
  sorghum_ensemble_model.pkl      sorghum_label_encoder.pkl      sorghum_model_metadata.json
  ensemble_model.pkl              label_encoder.pkl              model_metadata.json  # defaults
  smartbin_model.pkl                                                                    # legacy single-model
```

```bash
git checkout <last-commit-before-cleanup> -- huggingface_deployment
mv huggingface_deployment /tmp/grainhero-ml-space
```

## 2. Create the HuggingFace Space

1. https://huggingface.co/new-space
2. Owner: your org. Space name: `grainhero-ml`. License: your choice.
3. **SDK: Docker.** Not Gradio, not Streamlit.
4. Hardware: CPU basic to start; upgrade if latency > 1.5 s.
5. Visibility: Private.

`git clone` the empty Space repo, drop the files from step 1 into it, commit
and push. HF builds the Docker image and boots `app.py` on
`https://<owner>-grainhero-ml.hf.space`.

## 3. Wire it into this app

Do **not** commit the URL to the repo. Register it as a runtime secret:

- In Lovable chat, run `add_secret` with `GRAINHERO_ML_API_URL`.
- Value: `https://<owner>-grainhero-ml.hf.space` (no trailing slash — the
  code appends `/predict`).

If the Space is private, also add the HF read token:

- `add_secret HUGGINGFACE_ACCESS_TOKEN` → `hf_...`
- Then update `callHuggingFaceAPI` in `src/lib/ai-inference.functions.ts` to
  send `Authorization: Bearer ${process.env.HUGGINGFACE_ACCESS_TOKEN}` on
  the `fetch`. (One-line change — do it in the same PR that flips the Space
  to private.)

## 4. Request/response contract

### App → HF (`POST /predict`)

```json
{
  "grain_type": "rice",
  "temperature": 28.3,
  "humidity": 62.1,
  "storage_days": 45,
  "grain_moisture": 13.4,
  "airflow": 0.4,
  "dew_point": 17.2,
  "ambient_light": 0,
  "pest_presence": 0,
  "rainfall": 0,
  "temperature_history": [27.9, 28.1, 28.3],
  "humidity_history":    [60.0, 61.2, 62.1],
  "moisture_history":    [13.1, 13.3, 13.4]
}
```

### HF → App

```json
{
  "risk_class": "moderate",
  "risk_score": 45,
  "confidence": 0.87,
  "primary_risk_factors": ["humidity_rising", "moisture_above_safe"],
  "trustworthy": true
}
```

Special case — HF may return `{"error": "sensor_fault"}`. The app handles
that already by marking the reading as untrustworthy.

## 5. The local Python fallback (`src/ml/smartbin_predict.py`)

`ai-inference.functions.ts` has a **Box 2** path that spawns
`python3 src/ml/smartbin_predict.py …` via `child_process.spawn` when the
HF call fails.

**This does not work in production.** The live app deploys to a Cloudflare
Worker (see `src/server.ts`) and Workers do not have Node's `child_process`
or a Python runtime. The fallback only executes when you run `bun run dev`
on a full Node host that has `python3` on `PATH` and the `.pkl` files sitting
in `src/ml/` — which they currently don't, only metadata JSON is committed.

### Two ways to make the fallback real in prod (Phase 2, not this PR)

**Option A — second HF Space (recommended).** Ship
`smartbin_predict.py` inside a second HF Space, expose it as
`GRAINHERO_ML_FALLBACK_URL`, and change `callLocalPython` in
`ai-inference.functions.ts` into a second HTTP call. Same pattern as the
primary. Zero infra maintenance.

**Option B — sidecar container.** Deploy the Python fallback to Fly.io or
Render as a small FastAPI service and set `GRAINHERO_ML_FALLBACK_URL` to it.
Pick this only if you need lower cold-start latency than HF gives.

Do not try to keep the `child_process.spawn` path alive in production. It
will silently fail and the caller receives `null`, which then hits the
threshold heuristic — which is fine as a safety net but is not "ML".

## 6. Retraining loop

`docs/ml/retrain_pipeline.ps1` pulls fresh sensor rows from Supabase, retrains
the per-grain ensembles, and dumps refreshed `.pkl` files. Run it locally.
Then:

```bash
cp *_ensemble_model.pkl *_label_encoder.pkl *_model_metadata.json \
   /path/to/grainhero-ml-space/
cd /path/to/grainhero-ml-space
git add . && git commit -m "retrain $(date +%F)" && git push
```

HF rebuilds the image. Nothing in this app repo changes.

Keep model files out of this repo — `.pkl` should already be gitignored.

## 7. What the app does while the Space is not deployed

`GRAINHERO_ML_API_URL` unset → `callHuggingFaceAPI` returns `null` →
`callLocalPython` throws on Workers → `runMLInference` returns `null` →
every caller (`ml-pipeline.functions.ts`, `sync-firebase.ts`) already
degrades to a threshold-based heuristic. Safe to ship without HF ready.

## 8. Checklist before flipping the switch

- [ ] HF Space builds green, `curl https://<space>/predict -d '…'` returns valid JSON.
- [ ] `add_secret GRAINHERO_ML_API_URL` done.
- [ ] (If private) `add_secret HUGGINGFACE_ACCESS_TOKEN` + `Authorization` header patch.
- [ ] Trigger `/api/public/cron/sync-firebase` once, confirm `spoilage_predictions` rows appear with `source = "api"`.
- [ ] Latency budget: p95 `/predict` < 1.5 s. Otherwise upgrade HF hardware or reduce history window.
- [ ] Retraining script produces new `.pkl` files without errors.

## Out of scope for the initial PR

- Actually deploying the Space (needs org access + HF billing).
- Building the second Space for the fallback.
- Any Supabase schema changes to widen `spoilage_predictions`.
- Anything mobile.