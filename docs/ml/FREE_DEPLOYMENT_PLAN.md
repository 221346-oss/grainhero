# GrainHero ML — Free-Tier Deployment Plan

Goal: get the spoilage model live **without paying anyone**, and make it
simple enough for a non-ML person to follow. No HF Pro, no paid Docker,
no credit card.

---

## The 30-second mental model

Your app (this repo) is the "brain user" — it just sends numbers
(temperature, humidity, moisture…) to a URL and gets back
`{ risk_class, risk_score, confidence }`. That URL is a tiny Python web
server that loads your `.pkl` model files and answers.

```
 Lovable app  --HTTPS POST /predict-->  Free Python server  -->  .pkl model
   (this repo)                          (HF Space OR Render)      (loaded once)
```

Everything below is just "how do we host that tiny Python server for
free and point the app at it".

---

## Pick ONE host (recommended: HuggingFace Space, free CPU)

You do NOT need HF Pro or paid Docker. Free HF Spaces support:

- **Gradio SDK** on free CPU — Python, gives you a web UI plus an
  auto-generated JSON API. Easiest.
- **Docker SDK** on free CPU — also free. Only pay if you want GPU or
  "always on".

Free Spaces sleep after ~48h of no traffic and cold-start in ~10–30s.
That's fine: our app already handles `runMLInference` returning `null`
and falls back to the threshold heuristic. First request wakes the
Space, the rest are fast.

### Option A — HF Space, Docker + FastAPI (recommended)

Matches the `/predict` contract this repo already sends, so **zero code
changes** in the app.

### Option B — Render.com Free Web Service

Only if HF doesn't work. Free tier has 512 MB RAM — if your total `.pkl`
size is over ~400 MB it will OOM. Sleeps after 15 min idle.

### Option C — Fly.io / Railway

Both need a card on file even for the free credits. Skip unless A and B
both fail.

---

## Step-by-step: Option A (HF Space, Docker, FastAPI, free)

You do this ONCE. After that, retraining = replace `.pkl` + click
Restart.

### 1. Make a free HF account and Space

1. Sign up at https://huggingface.co (free, no card).
2. Avatar → **New Space**.
3. Name: `grainhero-ml`. License: `mit`.
4. **SDK: Docker**. Hardware: **CPU basic (free)**. Visibility: Public.
5. Create.

### 2. Add these files to the Space (web UI: "Add file → Upload")

From the old `huggingface_deployment/` folder (I can restore it into
`docs/ml/hf-space-source/` on request):

- All `*_ensemble_model.pkl`
- All `*_label_encoder.pkl`
- All `*_model_metadata.json`
- `predict.py`

Then add these three new files:

**`requirements.txt`**

```
fastapi
uvicorn[standard]
scikit-learn
pandas
numpy
joblib
```

**`Dockerfile`**

```dockerfile
FROM python:3.11-slim
WORKDIR /code
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 7860
CMD ["uvicorn","app:app","--host","0.0.0.0","--port","7860"]
```

**`app.py`**

```python
from fastapi import FastAPI
from pydantic import BaseModel
from predict import predict_spoilage

app = FastAPI()

class In(BaseModel):
    grain_type: str
    temperature: float
    humidity: float
    storage_days: float
    grain_moisture: float
    airflow: float = 0
    dew_point: float = 15
    pest_presence: float = 0

@app.post("/predict")
def predict(body: In):
    return predict_spoilage(body.dict())
```

### 3. Wait for the green Running badge (~3–5 min)

Your URL is:

```
https://<your-username>-grainhero-ml.hf.space
```

Sanity check:

```
curl -X POST https://<your-username>-grainhero-ml.hf.space/predict \
  -H "content-type: application/json" \
  -d '{"grain_type":"wheat","temperature":25,"humidity":60,"storage_days":30,"grain_moisture":13}'
```

You should get JSON with `risk_class`, `risk_score`, `confidence`.

### 4. Tell Lovable the URL

In this chat, say:

> add secret GRAINHERO_ML_API_URL = https://<your-username>-grainhero-ml.hf.space

I'll save it as a runtime secret. No code change needed — the app reads
`process.env.GRAINHERO_ML_API_URL` and starts calling the real model on
the next request.

---

## Step-by-step: Option B (Render.com free)

1. Push the same `Dockerfile + app.py + requirements.txt + .pkl` files
   to a **public** GitHub repo (Render free = public repos).
2. render.com → New → **Web Service** → pick the repo.
3. Environment: **Docker**. Instance type: **Free**.
4. Deploy, wait ~5 min. URL: `https://<name>.onrender.com`.
5. Same `curl` test as above.
6. Same "add secret GRAINHERO_ML_API_URL" step.

---

## Why not a "connector"?

I checked the connector catalog. There's no free hosted-ML connector
that runs your own `.pkl` files — Replicate, HF Inference API, etc.
either need a paid plan or don't accept custom scikit-learn pickles.
Connectors become useful later if you switch to OpenAI embeddings or a
hosted Replicate model. For your current model, self-hosted Python on
free HF/Render is the right answer.

---

## Retraining loop (later)

1. Run `docs/ml/retrain_pipeline.ps1` locally → new `.pkl` files.
2. Upload the new `.pkl` to the HF Space (drag-drop) or `git push` to
   the Render repo.
3. HF: click **Restart**. Render: auto-rebuilds.
4. App picks it up automatically.

---

## What you actually have to do

1. Make a free HF account.
2. Create a Space with **Docker + CPU free**.
3. Upload: `Dockerfile`, `requirements.txt`, `app.py`, all `.pkl` +
   metadata + `predict.py`.
4. Wait for **Running**.
5. Copy the Space URL.
6. Tell me: "add secret GRAINHERO_ML_API_URL = <that URL>".

If any step errors, paste the error here and I'll translate it into
plain English and fix it.

---

## Fallback story while you set this up

Until step 6, `runMLInference` returns `null` and the app uses the
built-in threshold heuristic. Nothing breaks. You can demo and onboard
tenants today; deploying the model is a strict upgrade you can do any
time.
