# GrainHero ML — Deployment Bundle (ONNX)

Everything needed to host the 5-grain spoilage-prediction ensemble as a
FastAPI + ONNX Runtime web service on a **free** host. Point Lovable at
the resulting URL via the `GRAINHERO_ML_API_URL` secret and the app
switches to the real model automatically.

## What's in this folder

| File | Purpose |
|---|---|
| `app.py` | FastAPI server exposing `POST /predict` and `GET /health`, with hot-swap + River online learning |
| `predict.py` | Feature engineering + response contract (SHAP, storage life, trend) |
| `model_registry.py` / `hot_swap.py` | ONNX Runtime session cache + background polling for new models from Supabase |
| `supabase_client.py` | Async fire-and-forget sensor logging (never blocks `/predict`) |
| `retrain_watcher.py` / `fast_retrain.py` / `nightly_retrain.py` | Background retraining processes (run separately) |
| `convert_to_onnx.py` | Converts a freshly trained `.pkl` ensemble to `.onnx` for hot-swap |
| `requirements.txt` | Python deps (onnxruntime, fastapi, sklearn, xgboost, lightgbm, river…) |
| `Dockerfile` | Container recipe (Python 3.11 slim + libgomp for LGBM) |
| `render.yaml` | One-click Render.com free web-service config |
| `*.onnx` | Trained models per grain (~11–20 MB each, **committed to git**) |
| `*_label_encoder.pkl` / `*_model_metadata.json` | Small helpers — committed |

> No large file downloads at build time — every model needed for inference is committed and shipped with the container.

---

## Important: HuggingFace Static Spaces cannot run this

The free HF tier now only offers **Static** Spaces (HTML/JS only, no
Python runtime). Our model needs Python + scikit-learn + xgboost, so
HF free is not usable anymore unless you subscribe to PRO for Docker.

**Use Render.com's free web service instead** (below). It's the
simplest zero-cost path today and no credit card is required. When you
later add the RAG / research-paper layer and outgrow 512 MB RAM,
migrate the same `Dockerfile` to a Hugging Face Docker Space (paid PRO,
16 GB RAM).

### Keep the free service awake (CRITICAL)

Render Free sleeps after 15 min of no traffic → 30–60 s cold start on
the next request → IoT hardware times out. After deploying, set up a
free **UptimeRobot** monitor that hits `/health` every 5 minutes. Full
steps in `docs/ml/BEGINNER_SETUP_GUIDE.md` Part A½.

---

## Deploy in 6 clicks — Render.com free web service

### 1. Make a free Render account

Go to https://render.com → **Sign up with GitHub** (no card asked).

### 2. Put this folder in a public GitHub repo

```bash
# from your local checkout
cp -r ml-deploy /tmp/grainhero-ml
cp src/ml/ensemble_model.pkl      /tmp/grainhero-ml/
cp src/ml/rice_ensemble_model.pkl /tmp/grainhero-ml/
cd /tmp/grainhero-ml
git init && git add . && git commit -m "grainhero ml service"
# create an EMPTY public repo on github.com called "grainhero-ml", then:
git remote add origin https://github.com/<you>/grainhero-ml.git
git branch -M main && git push -u origin main
```

### 3. Create the service on Render

Dashboard → **New +** → **Web Service** → pick the `grainhero-ml`
repo → Render auto-detects `render.yaml` and pre-fills:

- Environment: **Docker**
- Plan: **Free**
- Health check: `/health`

Click **Create Web Service**. First build takes ~5–8 minutes.

### 4. Wait for the green "Live" badge

Your URL looks like: `https://grainhero-ml.onrender.com`

### 5. Sanity test

```bash
curl -X POST https://grainhero-ml.onrender.com/predict \
  -H "content-type: application/json" \
  -d '{"grain_type":"rice","temperature":32,"humidity":78,
       "storage_days":45,"grain_moisture":15.5}'
```

You should get JSON with `risk_class`, `risk_score`, `confidence`.

### 6. Wire it into Lovable

In this chat, tell me:

> add secret GRAINHERO_ML_API_URL = https://grainhero-ml.onrender.com

I'll save it and the app calls the real model on the next request.
No code change required.

---

## Free-tier limits (Render)

- **Sleeps after 15 min idle** — first request wakes it (~30 s cold
  start). Our app already handles this: `runMLInference` returns `null`
  on timeout and falls back to the threshold heuristic, so nothing
  breaks.
- **512 MB RAM** — comfortable for two 46 MB models loaded lazily.
- **750 free hours/month** — enough for one always-available service.

## Retraining loop

1. Run `docs/ml/retrain_pipeline.ps1` locally → new `.pkl` files land
   in `src/ml/`.
2. Copy the new files over the old ones in your `grainhero-ml` repo
   and `git push`.
3. Render auto-rebuilds. Done.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `libgomp.so.1: cannot open` on boot | Already handled in the Dockerfile (`apt-get install libgomp1`). |
| First request times out | Cold start — retry. App fallback covers it in the meantime. |
| `Killed` in Render logs during boot | Out of RAM — remove one of the two ensemble files, or upgrade to Starter ($7/mo). |
| `predict` returns `sensor_fault` | The guardrail rejected out-of-range values — expected. |

---

## Alternative hosts (only if Render doesn't work)

- **Fly.io** — free 3 shared-cpu VMs, needs a card on file.
- **Railway** — no longer free; skip.
- **HuggingFace Docker Space** — requires PRO ($9/mo).
- **Google Cloud Run** — generous free tier but needs card + gcloud
  setup.

Render Free is the shortest zero-cost path today. Stick with it unless
you hit a hard blocker.