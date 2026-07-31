# GrainHero — Beginner's Setup Guide

A zero-assumptions, click-by-click walkthrough to take this repo from
"just cloned" to "live predictions showing in the dashboard." No prior
ML, Docker, or DevOps knowledge required.

Total time: **~30 minutes** of active work + ~10 minutes of waiting for
builds. Cost: **$0** (free tiers only, no credit card asked).

---

## What you're building

```
ESP32 silo sensor  ──▶  Firebase RTDB  ──▶  GrainHero app (Lovable)  ──▶  Render ML service  ──▶  Risk shown in /ai-predictions
                         │                        │
                         └──▶ Supabase ───────────┘
```

Three services talk to each other:

1. **Firebase** — a free realtime database that receives sensor readings from your IoT devices.
2. **Render** — a free Docker host that runs the Python ML model and returns a risk score.
3. **Lovable / Supabase** — the web app + database you're already using.

You just need to create the first two, paste two URLs into Lovable, and you're done.

---

## Prerequisites (5 min)

You need accounts on:

- [ ] **GitHub** — https://github.com (free, no card)
- [ ] **Render** — https://render.com (sign up with GitHub, no card)
- [ ] **Firebase / Google** — https://console.firebase.google.com (free Spark plan, no card)

Install locally:

- [ ] **Git** — https://git-scm.com/downloads
- [ ] A terminal (PowerShell on Windows, Terminal on macOS/Linux)

That's it. No Python, Docker, or Node install required — Render handles all of that in the cloud.

---

## Part A — Deploy the ML service to Render (10 min)

### A1. Get the ML code onto your machine

In a terminal:

```bash
# Clone this GrainHero repo (or use the one you already have)
git clone https://github.com/<your-org>/grainhero.git
cd grainhero
```

### A2. Make a new GitHub repo for the ML service

1. Go to https://github.com/new
2. Repo name: `grainhero-ml`
3. Visibility: **Public** (Render's free tier requires public)
4. Do NOT tick "Initialize with README"
5. Click **Create repository**
6. Leave that tab open — you'll need the URL in step A4

### A3. Copy the `ml-deploy` folder into the new repo

```bash
# From inside the grainhero repo folder
cp -r ml-deploy /tmp/grainhero-ml
cd /tmp/grainhero-ml
```

> On Windows PowerShell: `Copy-Item -Recurse ml-deploy C:\temp\grainhero-ml; cd C:\temp\grainhero-ml`

The 5 grain models are shipped as `.onnx` files inside `ml-deploy/` (~87 MB total, committed to git). ONNX Runtime loads them natively — much smaller and ~5× faster than the old `.pkl` files, and they fit comfortably in Render Free's 512 MB RAM. You don't need to download anything separately.

### A4. Push it to GitHub

```bash
git init
git add .
git commit -m "grainhero ml service"
git branch -M main
git remote add origin https://github.com/<your-username>/grainhero-ml.git
git push -u origin main
```

### A5. Create the Render service

1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Click **Connect** next to your `grainhero-ml` repo (authorize Render if it asks)
4. Render reads `render.yaml` and pre-fills everything. Confirm:
   - **Name**: `grainhero-ml`
   - **Environment**: Docker
   - **Plan**: **Free**
   - **Health check path**: `/health`
5. Click **Create Web Service**

**Wait 3–5 minutes.** Render is building the container (installing `onnxruntime`, `fastapi`, etc.). You'll see live logs. When you see `Uvicorn running on http://0.0.0.0:7860`, it's ready.

### A6. Copy your Render URL

At the top of the Render dashboard you'll see something like:

> `https://grainhero-ml.onrender.com` — **Live** ✅

Copy that URL. **This is what Lovable needs.**

### A7. Quick sanity test (optional)

In your terminal:

```bash
curl -X POST https://grainhero-ml.onrender.com/predict \
  -H "content-type: application/json" \
  -d '{"grain_type":"rice","temperature":32,"humidity":78,"storage_days":45,"grain_moisture":15.5}'
```

You should get back JSON with `risk_class`, `risk_score`, and `confidence`. If yes, the ML service is live. 🎉

---

## Part A½ — Keep the ML service awake with UptimeRobot (2 min, CRITICAL)

Render Free shuts your server down after **15 minutes of no traffic**. When a request arrives cold, Python + ONNX takes **30–60 seconds** to wake up — long enough that your ESP32 will time out and the prediction is lost.

The fix is a free "keep-alive" ping every 10 minutes. Render sees constant traffic and never sleeps, so live IoT hardware always gets an instant response.

### A½.1. Sign up

1. Go to https://uptimerobot.com → **Register for FREE** (no card).
2. Verify your email.

### A½.2. Add the monitor

1. Dashboard → **+ New monitor**
2. Monitor Type: **HTTP(s)**
3. Friendly Name: `GrainHero ML`
4. URL: `https://grainhero-ml.onrender.com/health`
5. Monitoring Interval: **5 minutes** (free tier max — anything ≤10 min works)
6. Click **Create Monitor**

### A½.3. Confirm it's working

After ~10 minutes the monitor shows a green **Up** badge and average response time in milliseconds. Your Render dashboard will show a steady trickle of `GET /health` hits every 5 min — that's the whole trick. The service never sleeps again.

> ⚠️ Do NOT skip this step if your ESP32s send readings on a schedule. Without UptimeRobot, ~1 in every 4 predictions will time out.

---

## Part B — Set up Firebase for live sensor readings (10 min)

Skip this section if you don't have IoT devices yet — the app works without it, you just won't see live sensor data.

### B1. Create the Firebase project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `grainhero-<yourname>` → **Continue**
3. Disable Google Analytics (not needed) → **Create project**
4. Wait ~30 seconds, click **Continue**

### B2. Enable Realtime Database

1. Left sidebar → **Build** → **Realtime Database**
2. Click **Create Database**
3. Location: pick the region closest to your silos (e.g. `asia-southeast1` for Pakistan)
4. Start in **locked mode** → **Enable**
5. Once it opens, go to the **Rules** tab and paste:

```json
{
  "rules": {
    "devices":     { ".read": "auth != null", ".write": "auth != null" },
    "sensor_data": { ".read": "auth != null", ".write": "auth != null" },
    "control":     { ".read": "auth != null", ".write": "auth != null" }
  }
}
```

Click **Publish**.

### B3. Get your database URL

Go to the **Data** tab. At the top you'll see something like:

> `https://grainhero-yourname-default-rtdb.asia-southeast1.firebasedatabase.app`

Copy it. **Lovable needs this too.**

### B4. Create a service account (for the app to write on your behalf)

1. ⚙️ Settings (gear icon) → **Project settings** → **Service accounts** tab
2. Click **Generate new private key** → **Generate key**
3. A JSON file downloads. Open it in a text editor.
4. Keep it open — you'll paste the whole contents into Lovable as a secret.

> ⚠️ Never commit this JSON file to git. Treat it like a password.

---

## Part C — Wire everything into Lovable (2 min)

In this Lovable chat, send me these three messages, one at a time:

```
add secret GRAINHERO_ML_API_URL = https://grainhero-ml.onrender.com
```

```
add secret FIREBASE_DATABASE_URL = https://grainhero-yourname-default-rtdb.asia-southeast1.firebasedatabase.app
```

```
add secret FIREBASE_SERVICE_ACCOUNT_JSON = <paste the entire JSON contents here>
```

I'll save each one into secure storage. No code changes needed — the app automatically switches from fallback mode to live mode as soon as these are set.

---

## Part D — Verify it works in the UI (3 min)

### D1. As an Admin (tenant owner)

1. Sign in as your Admin account.
2. Go to **Silos** → create a silo if you don't have one.
3. Go to **Grain Batches** → **New batch** → pick a grain type (rice/wheat/maize/sorghum/barley), enter intake date and moisture. **This is required** — no batch, no prediction.
4. Go to **AI Predictions**.
   - If you have live sensor data: you'll see a real risk badge (Safe / Caution / At Risk / Spoiled) with a score and top-3 factors.
   - If you don't have sensors yet: it uses the batch metadata + a safe default reading and still returns a prediction.
5. Click the row → drawer opens showing per-model breakdown (Random Forest, XGBoost, LightGBM, Ensemble).

### D2. As a SuperAdmin

1. Sign in as SuperAdmin.
2. Go to **/ml-models**. You'll see one card per grain with:
   - Accuracy of the deployed model
   - Last trained date
   - **Retrain** button (kicks off `ensemble_train.py` against the newest data)
3. Go to **/platform**. The bento shows predictions/min, ML service uptime, latency.
4. Go to **/platform/logs**. Every retrain, deploy, and prediction shows in one timeline.

### D3. What "success" looks like

- ✅ Render dashboard shows service **Live** and `/health` is green.
- ✅ Firebase console → Data tab shows `/devices/<id>/live` nodes updating (once your ESP32 is powered on).
- ✅ `/ai-predictions` shows at least one row with a colored risk badge.
- ✅ Creating a grain batch immediately produces a prediction for that batch.

---

## Part E — Ongoing operations

### E1. Retraining the model (SuperAdmin, no code)

1. Go to **/ml-models**
2. Pick a grain (e.g. Rice) → click **Retrain**
3. The pipeline exports fresh rows from Supabase, merges them with `DATASETS/training-synthetic/rice_spoilage_10k.csv`, trains a new ensemble, and pushes the new `.pkl` to Lovable assets.
4. Render **auto-deploys** the new model within ~5 min. No downtime — old model serves until the new one is ready.

### E2. Updating firmware

1. Open `docs/firmware/grainhero_main_final.ino` in Arduino IDE.
2. Edit WiFi/MQTT credentials at the top.
3. Flash to ESP32. It starts publishing to Firebase automatically.

### E3. When something breaks

| Symptom | Where to look |
|---|---|
| `/ai-predictions` empty | Render service asleep (cold start ~30s) — retry. Or the app falls back to threshold heuristic. |
| Sensor rows not appearing | Firebase Data tab — is `/devices/<id>/live` updating? If not, firmware issue. |
| Prediction always "Safe" | No live sensor data + no batch moisture → defaults used. Create a batch with real moisture. |
| Render build fails | Check Render logs — usually a `pip install` timeout, click **Manual Deploy → Deploy latest commit** to retry. |
| `Killed` in Render logs | Out of RAM. ONNX runtime is lean, but if you added heavy deps (e.g. `sentence-transformers`), revert them. |
| Predictions randomly slow | UptimeRobot monitor is paused or the URL is wrong — check https://uptimerobot.com dashboard. |

### E4. Free tier limits (know before you scale)

- **Render Free**: 512 MB RAM, 750 hrs/month. Sleeps after 15 min idle — **UptimeRobot (Part A½) prevents that**. Fine for demos and up to ~10 silos.
- **UptimeRobot Free**: 50 monitors, 5-min interval. You only need 1.
- **Firebase Spark**: 1 GB storage, 10 GB/month download. Fine for ~50 devices publishing every 5 s.
- **Supabase Free**: 500 MB DB, 2 GB bandwidth. Fine for ~5 tenants.

When you outgrow any of these, upgrade individually — nothing else needs to change.

**When to leave Render:** the current lightweight ONNX inference API fits in 512 MB and stays fast. The moment you add the **RAG / research-paper reasoning layer** (vector DB + embedding model), memory jumps past 512 MB and Render Free will start OOM-killing. At that point migrate the ML service to a **Hugging Face Docker Space** (16 GB RAM, requires PRO subscription ≈ $9/mo) — the same `Dockerfile` in `ml-deploy/` works there unchanged. Until you've got funding for that upgrade, keep RAG features disabled and stay on Render.

---

## Part F — Checklist before you call it done

- [ ] Render service shows **Live** with green `/health`
- [ ] `curl` test to `/predict` returns valid JSON
- [ ] UptimeRobot monitor is **Up** and pinging `/health` every 5 min
- [ ] `GRAINHERO_ML_API_URL` secret saved in Lovable
- [ ] `FIREBASE_DATABASE_URL` + `FIREBASE_SERVICE_ACCOUNT_JSON` saved (if using IoT)
- [ ] Signed in as Admin, created a silo + grain batch
- [ ] `/ai-predictions` shows at least one prediction with a risk badge
- [ ] Signed in as SuperAdmin, `/ml-models` shows the 5 grain cards
- [ ] Retrain button on `/ml-models` triggers a run in `/platform/logs`

If all 9 boxes are ticked, your GrainHero deployment is production-ready. 🌾

---

## Where to go from here

- **Deep dive on architecture**: `docs/ml/FINAL_PLAN.md` §9 (the diagram + full loop explanation)
- **UI responsibility map**: `docs/ml/FINAL_PLAN.md` §10 (which screen owns which part of the loop)
- **Retraining internals**: `docs/ml/retrain_pipeline.ps1` and `docs/ml/README.md`
- **Firmware protocol**: `docs/firmware/README.md`
- **Merge safety before shipping to `main`**: `docs/ml/FINAL_PLAN.md` §11

Questions? Just ask in the Lovable chat — I have the full context of every file above and can walk you through any step.
