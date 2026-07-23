# GrainHero ML integration

This app talks to a remote HuggingFace Space for spoilage inference. Nothing
heavy runs inside the Cloudflare Worker that serves the app.

## Where things live

| Piece | Path |
| --- | --- |
| Remote-API caller + local fallback | `src/lib/ai-inference.functions.ts` |
| Cascade wrapper used by server code | `src/lib/ml-pipeline.functions.ts` |
| Training-data CSV logger | `src/lib/ml-csv-logger.server.ts` |
| Local Python predictor (dev/reference) | `src/ml/smartbin_predict.py` |
| Model metadata copies | `src/ml/*_model_metadata.json` |
| Firebase → ML cron | `src/routes/api/public/cron/sync-firebase.ts` |
| Retraining script | `docs/ml/retrain_pipeline.ps1` |
| Deployment guide | [`docs/ml/HUGGINGFACE_DEPLOYMENT.md`](./HUGGINGFACE_DEPLOYMENT.md) |

## Env vars the app reads

| Name | Where | When to set |
| --- | --- | --- |
| `GRAINHERO_ML_API_URL` | server runtime (`add_secret`) | Once the HF Space is deployed |
| `GRAINHERO_ML_FALLBACK_URL` | server runtime (`add_secret`) | Optional, Phase 2 |

Until `GRAINHERO_ML_API_URL` is set, `runMLInference` returns `null` and
callers fall back to the built-in threshold heuristic. That is intentional
and safe — do **not** hardcode a URL.

Read [`HUGGINGFACE_DEPLOYMENT.md`](./HUGGINGFACE_DEPLOYMENT.md) before
touching anything ML-related.