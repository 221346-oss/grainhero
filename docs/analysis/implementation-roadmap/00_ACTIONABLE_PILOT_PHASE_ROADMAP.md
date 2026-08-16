# GrainHero (by TEQrock): Master Pilot Phase Roadmap
## Ultra-Detailed, Chronological, Step-by-Step Task List
### Updated for latest platform UIs: Supabase, Render, EMQX Cloud, Arduino IDE 2.x

> **Single Source of Truth.** This is the complete execution guide from zero to a live pilot.
> - **ðŸ”´ OWNER** = Involves secrets, money, hardware, or cloud credentials. Owner only.
> - **ðŸŸ¢ INTERNEE** = Code-only tasks, safe to delegate.

---


---

## ðŸ§­ READ THIS FIRST â€” How GrainHero Works (System Map)

Before diving into tasks, understand how all the pieces connect:

- **IoT Hardware Layer:** ESP32 devices on silos read sensors (temp, humidity, gas/pests, moisture). They send a tiny JSON message over the internet (via MQTT) to EMQX Cloud.
- **Backend Layer:** Node.js listens to EMQX, saves the reading to MongoDB, and then asks the ML Service: *"Is this grain safe?"*
- **AI/ML Layer (The Brain):** A Python service on Render. It takes the reading, pulls the last 24 hours of history from Supabase, runs it through an ONNX model, and replies with a Risk Score and a Spoilage Trend.
- **RAG Layer (Research Assistant):** An AI trained on actual grain science research papers (stored in Supabase pgvector) that can answer user questions and provide context for alerts.
- **Alert Layer:** If the ML service predicts danger, the Node.js backend fires an alert to the dashboard and sends SMS/email to the farmer.


## ARCHITECTURE DECISION (READ FIRST)

**Keep current XGBoost/LightGBM ensemble for the pilot. Migrate to Mamba after 3 months of real data.**
Mamba has linear memory, handles months of IoT time-series, runs on Render free tier.
Jamba is overkill and impossible to deploy cheaply at this stage.


### ðŸš¨ The "Two Environments" Rule (PERMANENT)
There is a strict separation between Training and Serving. Do not mix them.
- **TRAINING Environment (Your Local PC):** This is where you run heavy data science libraries (`xgboost`, `scikit-learn`, `shap`, `optuna`). You train models here and export them as lightweight `.onnx` files.
- **SERVING Environment (Render Cloud):** This is the live `grainhero-ml-service`. It runs on a tiny 512MB free tier container. It ONLY needs `onnxruntime` to run the pre-trained models. It never trains anything. (This is why we commented out the heavy dependencies â€” to stop Out Of Memory crashes).


**ðŸŽ¯ Core Product Mandate â€” Predictive Spoilage Prevention (Three Horizons):**
We do NOT react to spoilage. We detect the *build-up trend* and cut it off before it begins.
- **H1 â€” Now (Zero model changes):** Wire history arrays from Supabase into `_spoilage_trend()`. Add rate-of-change + projected hours-to-danger. Fire proactive alerts on trajectory, not threshold breach. *(Tasks 2.4, 2.5, 3.2.5)*
- **H2 â€” Post-pilot (1â€“3 months, after real data flows):** Add Prophet/ARIMA 48-hour forecasting. Add Isolation Forest anomaly detection for patterns that precede spoilage.
- **H3 â€” Scale (3â€“6 months):** Replace ONNX ensemble with Mamba sequence model trained on real silo time-series. *(Already pre-planned in Task 5.3)*

**Active firmware file for all future work:**
`docs/firmware/grainhero_updated_ino.ino`
This is the optimized rewrite of `grainhero_main_final.ino`.
Same features, 731 lines instead of 1591, cleaner memory management for the ESP32.

---

## ðŸƒâ€â™‚ï¸ SPRINT SCHEDULE (Who does what, and when)

To move fast without blocking each other, the team will work in parallel sprints.
**Task 2.2 is already DONE.** Your internees do NOT need to redo it.

### Sprint 0 â€” RIGHT NOW (This Week)
*Everyone can start these today, simultaneously.*

| Role | Tasks |
|---|---|
| **[OWNER]** | **Task 1.4:** Add Render Deploy Hook Secret (5 mins) <br> **Task 1.1:** Create Supabase firmware-updates bucket (10 mins) <br> **Task 1.2:** Add 3 GitHub Secrets (5 mins) |
| **[ML-INTERNEE]** | **Task 2.3A:** Enable pgvector in Supabase SQL <br> **Task 2.3B:** Write `source_papers.py` script <br> **Task 2.4:** Add silo_id to PredictionRequest middleware |
| **[IOT-INTERNEE]** | **Task 0.2:** Verify pest sensor output in Serial Monitor |

### Sprint 1 â€” Next Week (After Sprint 0 is done)

| Role | Tasks |
|---|---|
| **[OWNER]** | **Task 2.1:** Upload all 5 ONNX models to Supabase Storage <br> **Task 0.3:** Set up EMQX Cloud |
| **[ML-INTERNEE]** | **Task 2.5:** Upgrade `_spoilage_trend()` to rate_per_hour <br> **Task 2.3C/D:** GitHub Action for RAG refresh <br> **Task 2.6:** Synthetic dataset gen script |
| **[IOT-INTERNEE]** | **Task 0.3:** Configure EMQX credentials in firmware <br> **Task 0.4:** Test OTA local Python server <br> **Task 6.0:** Document new prototype sensors |

---

## PHASE 0: Pre-Cloud â€” Local Hardware & Firmware Prep
### Goal: Prove the silo hardware works BEFORE waiting for cloud credentials.

---

<details><summary><b>âœ… Task 0.1 â€” Remove Hardcoded WiFi Secrets [DONE]</b></summary>

### âœ… Task 0.1 â€” Remove Hardcoded WiFi Secrets [IOT-INTERNEE] [DONE]

**Status: COMPLETED.** `grainhero_updated_ino.ino` has already been updated.

**What was done:**
- Added `#include <WiFiManager.h>` to the firmware includes.
- Replaced `WiFi.begin("Wokwi-GUEST", "")` with:

```cpp
WiFiManager wifiManager;
// Creates a hotspot called "GrainHero_Silo_Setup".
// Connect any phone to it to pick the local farm WiFi.
wifiManager.autoConnect("GrainHero_Silo_Setup");
```

**What this means in practice:**
When the ESP32 boots without a known WiFi network, it broadcasts a hotspot called
`GrainHero_Silo_Setup`. A phone connects to it, a browser auto-opens, the operator
selects the farm WiFi + enters the password. Credentials save permanently in ESP32 flash.

**Library to install (if not already):**
1. Arduino IDE 2.x â†’ Left sidebar **Library Manager** icon (book).
2. Search: `WiFiManager`
3. Install: **WiFiManager by tzapu** (version 2.0.17 or latest).


</details>

---

<details><summary><b>âœ… Task 0.2 â€” Verify Pest Sensor is Live [DONE]</b></summary>

### âœ… Task 0.2 â€” Verify Pest Sensor is Live [IOT-INTERNEE]

**Why this matters:** `Pest_Presence` has the highest SHAP impact in the ML model.
Previously hardcoded to `0.0` â€” making the AI completely blind to pests.

**Good news:** The updated firmware already has this fixed via `computePestMoldRisk()`.
This function reads the BME680 gas resistance, maps it to a TVOC estimate, then
combines it with humidity, temperature, and soil moisture to produce a 0.0â€“1.0 pest score.

**Steps to verify it is working:**

1. Open `docs/firmware/grainhero_updated_ino.ino`.
2. Find `void processTVOCData()` (around line 236).
3. Confirm this line exists: `cd.pest_presence = pestRiskLabel;`
4. Find `computePestMoldRisk()` (around line 225). Confirm the scoring logic is present.
5. Find the JSON payload builder and confirm `pest_presence` is in the MQTT/Firebase payload.
6. Flash the board. Open **Tools â†’ Serial Monitor** at **115200 baud**.
7. You should see:
   ```
   Pest Risk: 0.12 (Low)
   ```
   If you see this output, Task 0.2 is complete.


</details>

---

### ðŸ”´ Task 0.3 â€” Set Up EMQX Cloud & Test Live Data [OWNER]

**What this does:** Proves the silo sends secure encrypted sensor data to the cloud
without the backend server being ready at all.

**Time estimate:** 30â€“45 minutes.

#### Step 1: Create an EMQX Serverless Deployment

1. Go to **https://cloud.emqx.com** (sign up with Google or email if needed).
2. After login, click **Deployments** in the top navigation.
3. Click **New Deployment** (top right corner).
4. On the plan selection screen, choose **Serverless** (FREE â€” 1 million session minutes/month).
5. Under **Cloud Region**, select **Asia Pacific (Mumbai)** â€” lowest latency from Pakistan.
6. Name it: `grainhero-pilot`
7. Click **Deploy Now**. Wait ~1â€“2 minutes.
8. On the Overview page that appears, copy and save:
   - **Connection Address** (e.g., `abc123.emqxsl.com`) â€” needed in firmware.
   - **Port:** `8883` (always use TLS, never plain 1883).

#### Step 2: Create MQTT Credentials

1. In the left sidebar, click **Access Control** â†’ **Authentication**.
2. Click **+ Add**.
3. First user (for the silo device):
   - **Username:** `grainhero_device`
   - **Password:** `GH_Silo@2026!` (or any strong password â€” save it securely)
4. Click **Confirm**.
5. Click **+ Add** again for dashboard testing:
   - **Username:** `grainhero_dashboard`
   - **Password:** (any strong password)

#### Step 3: Download the Root CA Certificate

1. In the left sidebar, click **Overview**.
2. Scroll to the **Connection Information** section.
3. Find **CA Certificate** â†’ click **Download**.
4. Save as `emqx_root_ca.pem` on your desktop.
5. Open it in Notepad. Copy the entire content (the full `-----BEGIN CERTIFICATE-----` block).

#### Step 4: Update Firmware with Your Credentials

1. Open `docs/firmware/grainhero_updated_ino.ino` in Arduino IDE 2.x.
2. At the top, find the `CONFIGURATION` section.
3. Update these lines:

```cpp
// CHANGE to your actual Connection Address:
#define MQTT_BROKER    "abc123.emqxsl.com"
#define MQTT_PORT      8883
#define MQTT_USERNAME  "grainhero_device"
// CHANGE to your actual password:
#define MQTT_PASSWORD  "GH_Silo@2026!"
```

4. Find the `const char EMQX_ROOT_CA[] PROGMEM = R"PEM(...)PEM";` block (around line 70).
5. Delete the placeholder certificate text.
6. Paste the EXACT contents of your `emqx_root_ca.pem` file there.

#### Step 5: Flash the ESP32

1. Connect **DOIT ESP32 DEVKIT V1** to your laptop via USB.
2. In Arduino IDE 2.x:
   - **Tools â†’ Board â†’ esp32 â†’ DOIT ESP32 DEVKIT V1**
   - **Tools â†’ Port** â†’ select the COM port (e.g., COM5)
3. Click **Upload** (right-arrow icon). Wait for `Done uploading.`
4. Open **Tools â†’ Serial Monitor** at **115200 baud**.
5. Successful connection looks like:
   ```
   WiFi: 192.168.x.x
   [MQTT] Connecting to abc123.emqxsl.com:8883...
   [MQTT] Connected!
   [MQTT] Published to silos/004B12387760/telemetry
   ```

#### Step 6: Verify Live Data on MQTTX Desktop App

1. Download **MQTTX** from **https://mqttx.app** â†’ MQTTX Desktop â†’ Windows installer.
2. Open MQTTX â†’ Click **+** button (left sidebar) â†’ **New Connection**.
3. Fill in the form:
   - **Name:** `GrainHero Test`
   - **Protocol:** `mqtts://` (select from dropdown)
   - **Host:** `abc123.emqxsl.com` (your actual Connection Address)
   - **Port:** `8883`
   - **Username:** `grainhero_dashboard`
   - **Password:** (the dashboard password)
   - **SSL/TLS:** Toggle **ON**
   - **Certificate:** Select `CA_Cert_Only`
   - **CA File:** Click the folder icon â†’ upload `emqx_root_ca.pem`
4. Click **Connect** (top right). Status dot turns **GREEN** when connected.
5. At the bottom, click **+ New Subscription**.
   - **Topic:** `silos/+/telemetry` (the `+` wildcard matches any silo ID)
6. Click **Confirm**.
7. **Live JSON data streams in from the ESP32 every 2 seconds:**
   ```json
   { "temperature": 28.4, "humidity": 65.2, "pest_presence": "Low", "pestRiskScore": 0.12 }
   ```

**âœ… Task 0.3 Complete. The silo is live on the internet.**

---

### ðŸ”´ Task 0.4 â€” Test OTA Firmware Updates Locally [OWNER]

**What this does:** Proves the ESP32 can download and install new firmware over WiFi
without Supabase Storage. After this test, just swap the URL to cloud.

**Time estimate:** 20 minutes.

#### Step 1: Export the Binary

1. In Arduino IDE 2.x, open `grainhero_updated_ino.ino`.
2. Go to **Sketch â†’ Export Compiled Binary**.
3. The `.bin` file is saved here:
   `docs/firmware/grainhero_updated_ino.ino.bin`

#### Step 2: Host the Binary on Your Laptop

```powershell
# Navigate to firmware folder:
cd C:\Users\Nexgen\Projects\GrainHero_latest\docs\firmware
# Start HTTP server (keep this window open):
python -m http.server 8000
```

In a NEW PowerShell window, find your laptop IP:
```powershell
ipconfig
# Look for "IPv4 Address" under your WiFi adapter, e.g., 192.168.1.105
```

#### Step 3: Point Firmware to Your Laptop

In `grainhero_updated_ino.ino`, temporarily change:
```cpp
// FROM:
#define OTA_API_URL "https://your-domain.com/api/public/v1/firmware/latest"
// TO (use your actual IP):
#define OTA_API_URL "http://192.168.1.105:8000/grainhero_updated_ino.ino.bin"

// Also reduce interval for fast testing:
// FROM: #define OTA_INTERVAL 3600000UL
// TO:
#define OTA_INTERVAL 30000UL  // checks every 30 seconds
```

Flash this version via USB.

#### Step 4: Watch OTA Work

Keep the Python HTTP server running. Open Serial Monitor (115200 baud).
After ~30 seconds:
```
[OTA] Checking for update...
[OTA] Downloading firmware...
[OTA] Update successful! Rebooting...
```

#### Step 5: Revert to Production Settings

- Change `OTA_API_URL` back to the real Supabase URL.
- Change `OTA_INTERVAL` back to `3600000UL` (1 hour).
- Flash one final time via USB. All future updates are over the air.

---

## PHASE 1: Foundation â€” Secrets & Repository Cleanup
### Goal: Secure all credentials and prepare for team collaboration.

---

### ðŸ”´ Task 1.1 â€” Supabase: Create Firmware Storage Bucket [OWNER]

**Time estimate:** 10 minutes.

#### Step 1: Open Supabase Dashboard
1. Go to **https://supabase.com/dashboard** â†’ click your GrainHero project.

#### Step 2: Navigate to Storage
1. In the left sidebar, click the **Storage** icon (cylinder icon).

#### Step 3: Create the Bucket
1. Click **New Bucket** (top right of the Storage page).
2. Fill in:
   - **Bucket name:** `firmware-updates`
   - **Public bucket:** Leave **UNCHECKED** (must be private).
3. Click **Save**.

#### Step 4: Set Access Policies
1. Click on `firmware-updates` bucket.
2. Click **Policies** tab.
3. Click **New Policy** â†’ **Create a policy from scratch**.
4. Configure:
   - **Policy name:** `service_role_full_access`
   - **Allowed operations:** Check all four: SELECT, INSERT, UPDATE, DELETE
   - **Target roles:** `service_role`
   - **USING expression:** `true`
   - **WITH CHECK expression:** `true`
5. Click **Review** â†’ **Save policy**.

#### Step 5: Copy API Credentials
1. In the left sidebar, click **Project Settings** (gear icon at the bottom).
2. Click the **API** tab.
3. Copy and save securely (NOT in any code file, NOT on GitHub):
   - **Project URL:** `https://xxxx.supabase.co` â€” safe to share with interns
   - **anon public key:** `eyJh...` â€” safe to share with interns for frontend
   - **service_role secret:** `eyJh...` â€” **NEVER share. NEVER commit. Owner only.**

---

### ðŸ”´ Task 1.2 â€” Add GitHub Secrets [OWNER]

**Why:** GitHub Actions CI/CD needs these to auto-deploy models and run RAG weekly.

**Time estimate:** 5 minutes.

1. Go to your GitHub repository â†’ click **Settings** tab (top of the page).
2. In the left sidebar: **Secrets and variables** â†’ **Actions**.
3. Under **Repository secrets**, click **New repository secret** for each:

| Secret Name | Value | Where to get it |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Task 1.1 Step 5 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Task 1.1 Step 5 |
| `GOOGLE_API_KEY` | `AIzaSy...` | Google AI Studio |

> **How to get a Google API Key:**
> 1. Go to **https://aistudio.google.com/app/apikey**
> 2. Click **Create API Key** â†’ Copy it.

---

<details><summary><b>âœ… Task 1.3 â€” Clean Git: Remove ML Models [DONE]</b></summary>

### âœ… Task 1.3 â€” Clean Git: Remove ML Models from Tracking [ML-INTERNEE]

**Why:** `.onnx` and `.pkl` files are 11â€“20MB each. GitHub's hard limit is 100MB per file.
They will live in Supabase Storage instead of Git.

```powershell
cd C:\Users\Nexgen\Projects\GrainHero_latest

# Remove from git tracking (files stay on disk, just removed from git history)
git rm --cached ml-deploy/*.onnx
git rm --cached ml-deploy/*.pkl
```

Open `.gitignore` and add at the bottom:
```
# ML Model binaries - stored in Supabase Storage, not Git
ml-deploy/*.onnx
ml-deploy/*.pkl
ml-deploy/*.onnx.bak
```

Commit and push:
```powershell
git add .gitignore
git commit -m "chore: remove ML binaries from git tracking"
git push
```

**Verify:** Go to GitHub repo â†’ `ml-deploy/` folder. The `.onnx` files should be gone.


</details>

---


---

## ðŸ”„ How the Model Gets Smarter Over Time (Data Flywheel)

**Phase 1 â€” Synthetic (NOW):** Our current ONNX models were trained on 50,000+ simulated readings generated from FAO grain science equations. Accuracy is ~92% on the synthetic test set. This proves the system works, but isn't commercial-ready.

**Phase 2 â€” Real Data Collection (Pilot Weeks 1-8):** Every sensor reading from the live silo is stored in Supabase `sensor_readings`. We do NOT retrain during this phase. Just collect real data (target: 2,000+ readings per silo).

**Phase 3 â€” First Real Retrain (After first batch outcome):** 
1. The silo is emptied. The owner uses the "Mark Outcome" button (Task 5.1) to label the batch as Safe/Risky/Spoiled.
2. The ML Team exports these real labeled readings as a CSV.
3. The ML Team retrains the model locally using `TimeSeriesSplit` cross-validation (no data leakage).
4. The model is validated against a *different* holdout silo. (Target F1-score > 0.88).
5. The new `.onnx` file is uploaded to Supabase Storage.
6. The Render ML Service hot-swaps the new model into memory automatically in 30 seconds.

*Rinse and repeat every 6-8 weeks.*



---

### ðŸ”´ Task 1.4 â€” Fix Render Auto-Deploy (Deploy Hook Workaround) [OWNER]

**Why the normal way failed:** Based on your screenshot, your GitHub account does not have "Admin" access to the `221346-oss` organization repo, which is required to see the "Webhooks" menu. 
**The Workaround:** We will use Render's "Deploy Hook" feature and a GitHub Action instead.

**Time estimate:** 5 minutes.

**Steps:**
1. **Get the Deploy Hook from Render:**
   - Go to your Render dashboard â†’ `grainhero-ml-service` â†’ **Settings**.
   - Scroll down to the **Deploy Hook** section.
   - Copy the unique URL (it looks like `https://api.render.com/deploy/srv-...`).
2. **Add it as a GitHub Secret:**
   - Go back to your GitHub repo â†’ **Settings** â†’ **Secrets and variables** â†’ **Actions**.
   - Create a New repository secret:
     - Name: `RENDER_DEPLOY_HOOK_URL`
     - Secret: (paste the URL you copied from Render)
3. **The ML-INTERNEE will do the rest:** 
   - They will add a small GitHub Action file that automatically hits this URL whenever they push code. This perfectly bypasses the missing Webhook permissions!

---

### ðŸ”´ Task 2.1 â€” Upload ML Models to Supabase Storage [OWNER]

**What this does:** Pushes all 5 ONNX models from your laptop to Supabase Storage.
The Render ML service downloads them on startup.

**Time estimate:** 5â€“10 minutes.

**Step 1: Set temporary environment variables:**
```powershell
$env:SUPABASE_URL = "https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOi..."
```

**Step 2: Run the upload script:**
```powershell
cd C:\Users\Nexgen\Projects\GrainHero_latest\ml-deploy
pip install supabase
python upload_initial_models.py
```

Expected output:
```
Uploading rice_model.onnx... OK
Uploading wheat_model.onnx... OK
Uploading maize_model.onnx... OK
Uploading sorghum_model.onnx... OK
Uploading barley_model.onnx... OK
All models uploaded.
```

**Verify:** Supabase Dashboard â†’ Storage â†’ models bucket â†’ all 5 `.onnx` files appear.

---

<details><summary><b>âœ… Task 2.2 â€” Deploy ML Service to Render [DONE]</b></summary>

### âœ… Task 2.2 â€” Deploy ML Service to Render [OWNER] [DONE]

**What this does:** Hosts the FastAPI prediction server on the internet.
The frontend calls this URL for every spoilage prediction.

**Time estimate:** 15â€“20 minutes.

#### Step 1: Create a New Web Service
1. Go to **https://dashboard.render.com** â†’ Click **New +** (top right).
2. Click **Web Service**.
3. Click **Deploy from a GitHub repository**.
4. Find your GrainHero repository â†’ click **Connect**.

#### Step 2: Configure the Service

| Setting | Value |
|
</details>

---|---|
| **Name** | `grainhero-ml-service` |
| **Region** | Singapore |
| **Branch** | `Ai/Ml-Branch` |
| **Root Directory** | `ml-deploy` |
| **Runtime** | `Docker` |
| **Instance Type** | `Free` |

> The **Root Directory** field tells Render to look inside `ml-deploy/` for the Dockerfile.

#### Step 3: Add Environment Variables

| Key | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_KEY` | Your `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your `service_role` secret |
| `PORT` | `8000` |

#### Step 4: Deploy and Verify
1. Click **Create Web Service**. Render builds the Docker image (~3â€“7 min).
2. Watch the **Logs** tab. Success looks like:
   ```
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://0.0.0.0:8000
   ```
3. Your ML service is live at: `https://grainhero-ml-service.onrender.com`
4. Test it: open `https://grainhero-ml-service.onrender.com/docs` in a browser.
   You should see the FastAPI Swagger UI.
5. Click **POST /predict** â†’ **Try it out** â†’ paste and execute:
   ```json
   {
     "grain_type": "wheat",
     "temperature": 32.5, "humidity": 72.0, "storage_days": 45,
     "airflow": 0.6, "dew_point": 25.1, "ambient_light": 0.1,
     "pest_presence": 0.2, "grain_moisture": 14.5, "rainfall": 0.0
   }
   ```
6. Expected response: `{ "risk_class": "Risky", "risk_score": 0.73, "confidence": 0.88 }`

#### Step 5: Add ML URL to Frontend
In your frontend `.env.local`:
```
GRAINHERO_ML_API_URL=https://grainhero-ml-service.onrender.com
```

> **NOTE on Render Free Tier:** Services spin down after 15 min of inactivity.
> First prediction after cold start takes 30â€“50 seconds. Acceptable for the pilot.
> The cron job has a local Python subprocess fallback that handles this automatically.


---

### ðŸŸ¢ Task 2.3E â€” Create Research Intelligence Table [ML-INTERNEE]

**What this does:** Prepares Supabase to store scraped research papers and AI models.

**Steps:**
Run this in Supabase SQL Editor:
```sql
CREATE TABLE IF NOT EXISTS research_intelligence (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL, -- arxiv, semantic_scholar, huggingface
  url TEXT NOT NULL,
  abstract TEXT NOT NULL,
  embedding VECTOR(768),
  category TEXT, -- ML Models, Datasets, Grain Science, IoT
  relevance_score FLOAT,
  admin_status TEXT DEFAULT 'unread', -- unread, reviewed, implemented
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS research_intel_embedding_idx ON research_intelligence USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

---

### ðŸŸ¢ Task 2.3F â€” Write Research Intel Scraper (`research_intel_scraper.py`) [ML-INTERNEE]

**What this does:** A Python script that hits the APIs for arxiv, Semantic Scholar, and HuggingFace, looking for keywords like "grain storage IoT", "edge AI time-series", "ONNX microcontroller", etc. It uses Gemini to create embeddings and pushes them to the `research_intelligence` table.

---

### ðŸŸ¢ Task 2.3G â€” Automate Research Intel via GitHub Actions [ML-INTERNEE]

**What this does:** Updates `.github/workflows/rag-update.yml` to run `research_intel_scraper.py` automatically every Monday at 8:00 AM PKT. Zero maintenance required.


---

### ðŸŸ¢ Task 2.4 â€” Trend History Injection Middleware [ML-INTERNEE]

**Why this is the highest-priority task after Render deploy:** The existing `_spoilage_trend()` function accepts history arrays, but the firmware only sends the current reading â€” so trend analysis has been blind since day one. This task fixes that automatically: the ML service queries Supabase for the last 24 readings on every prediction call. **Zero firmware changes. Zero model changes.**

**Time estimate:** 2â€“3 hours.

**File: `ml-deploy/app.py`**

#### Step 1: Add `silo_id` to `PredictionRequest` (around line 256)

```python
silo_id: Optional[str] = Field(None, description="Silo ID â€” auto-fetches last 24 sensor readings from Supabase for trend analysis")
```

#### Step 2: Add the history-fetch helper (add after `_fetch_rainfall()`, around line 407)

```python
async def _fetch_sensor_history(silo_id: str, limit: int = 24) -> dict:
    """
    Fetch the last `limit` sensor readings for a silo from Supabase.
    Returns arrays ordered oldest â†’ newest, ready for trend analysis.
    """
    from supabase_client import get_supabase_client
    try:
        client = get_supabase_client()
        resp = (
            client.table("sensor_readings")
            .select("temperature, humidity, grain_moisture, recorded_at")
            .eq("silo_id", silo_id)
            .order("recorded_at", desc=True)
            .limit(limit)
            .execute()
        )
        rows = sorted(resp.data, key=lambda x: x["recorded_at"])  # oldest â†’ newest
        return {
            "temperature_history": [r["temperature"]    for r in rows],
            "humidity_history":    [r["humidity"]       for r in rows],
            "moisture_history":    [r["grain_moisture"] for r in rows],
        }
    except Exception as exc:
        logger.warning("History fetch failed for silo '%s': %s", silo_id, exc)
        return {"temperature_history": [], "humidity_history": [], "moisture_history": []}
```

#### Step 3: Enrich the `predict` endpoint (around line 504)

At the top of the `predict` function, before `_run_inference`, add:

```python
# Auto-inject history from Supabase if silo_id provided and arrays not manually passed
if req.silo_id and not req.temperature_history:
    history = await _fetch_sensor_history(req.silo_id)
    req.temperature_history = history["temperature_history"]
    req.humidity_history    = history["humidity_history"]
    req.moisture_history    = history["moisture_history"]
```

#### Step 4: Confirm Supabase table structure

The `sensor_readings` table must have these columns (should already exist from `supabase_client.py` logging):
```sql
silo_id        TEXT
temperature    FLOAT
humidity       FLOAT
grain_moisture FLOAT
recorded_at    TIMESTAMPTZ
```
If the table uses different column names, adjust the `.select()` call to match.

#### Step 5: Verify

1. Ensure Supabase has at least 3 rows in `sensor_readings` for a known silo.
2. Call `POST /predict` with `"silo_id": "<your-silo-uuid>"` and no history arrays.
3. The `spoilage_trend` in the response should now show trend values (not all `"insufficient_data"`).

**âœ… Task 2.4 Complete when:** A `/predict` request with only `silo_id` (no history arrays) returns `spoilage_trend` with non-trivial trend values reflecting the last 24 Supabase readings.

---

### ðŸŸ¢ Task 2.5 â€” Upgrade Spoilage Trend Engine: Rate + Projection [ML-INTERNEE]

**Why:** The current `_spoilage_trend()` only says *direction* (rising/stable/falling). This upgrade adds:
- `rate_per_hour` â€” how fast each sensor is changing
- `projected_hours_to_danger` â€” estimated time until the safe threshold is crossed
- Grain-specific danger thresholds (not hardcoded universals)
- A lightweight `/trend` endpoint for fast 5-minute polling without ONNX inference

This is what makes the dashboard say: *"Danger in ~8 hours. Intervene now."* â€” the core of our predictive mandate.

**Time estimate:** 3â€“4 hours.

**File: `ml-deploy/app.py`**

#### Step 1: Add grain-specific danger thresholds (add immediately before `_spoilage_trend`, around line 162)

```python
# FAO/IRRI-based safe upper limits per grain type
DANGER_THRESHOLDS = {
    "rice":    {"temperature": 25.0, "humidity": 70.0, "moisture": 14.0},
    "wheat":   {"temperature": 20.0, "humidity": 65.0, "moisture": 13.0},
    "maize":   {"temperature": 25.0, "humidity": 70.0, "moisture": 14.0},
    "sorghum": {"temperature": 28.0, "humidity": 70.0, "moisture": 13.0},
    "barley":  {"temperature": 20.0, "humidity": 65.0, "moisture": 13.0},
}

def _analyze_sensor_trend(history: List[float], danger_threshold: float) -> dict:
    """Rate-of-change + projection for a single sensor stream."""
    if len(history) < 3:
        return {
            "trend": "insufficient_data",
            "rate_per_hour": 0.0,
            "current_value": round(history[-1], 2) if history else 0.0,
            "ema": round(history[-1], 2) if history else 0.0,
            "projected_hours_to_danger": None,
        }
    alpha, ema = 0.4, history[0]
    for v in history[1:]:
        ema = alpha * v + (1 - alpha) * ema
    recent = history[-6:] if len(history) >= 6 else history
    rate   = (recent[-1] - recent[0]) / max(len(recent) - 1, 1)
    direction = "rising" if rate > 0.1 else ("falling" if rate < -0.1 else "stable")
    current = history[-1]
    hours_to_danger = None
    if rate > 0 and current < danger_threshold:
        hours_to_danger = round((danger_threshold - current) / rate, 1)
    elif current >= danger_threshold:
        hours_to_danger = 0.0  # already at or past danger
    return {
        "trend": direction,
        "rate_per_hour": round(rate, 3),
        "current_value": round(current, 2),
        "ema": round(ema, 2),
        "projected_hours_to_danger": hours_to_danger,
    }
```

#### Step 2: Replace `_spoilage_trend()` entirely (lines 162â€“187 in current app.py)

```python
def _spoilage_trend(
    temp_h: List[float],
    hum_h:  List[float],
    mc_h:   List[float],
    grain_type: str = "wheat",
) -> dict:
    """
    Full trend analysis: direction + rate + projection.
    Core of GrainHero's predictive spoilage prevention mandate.
    """
    th = DANGER_THRESHOLDS.get(grain_type, DANGER_THRESHOLDS["wheat"])
    t  = _analyze_sensor_trend(temp_h, th["temperature"])
    h  = _analyze_sensor_trend(hum_h,  th["humidity"])
    m  = _analyze_sensor_trend(mc_h,   th["moisture"])

    bads        = sum(x["trend"] == "rising" for x in [t, h, m])
    projections = [x["projected_hours_to_danger"] for x in [t, h, m]
                   if x["projected_hours_to_danger"] is not None]
    min_hours   = round(min(projections), 1) if projections else None

    if bads >= 2 and min_hours is not None and min_hours <= 6:
        urgency = "CRITICAL"
        msg = f"ðŸš¨ {bads} sensors rising fast. Danger in ~{min_hours}h. START AERATION NOW."
    elif bads >= 2:
        urgency = "WORSENING"
        msg = f"âš ï¸ {bads} sensors rising. Danger in ~{min_hours}h. Prepare intervention."
    elif bads == 1:
        urgency = "CAUTION"
        msg = "ðŸ“ˆ One sensor rising. Monitor closely. Check aeration."
    else:
        urgency = "STABLE"
        msg = "âœ… All conditions stable."

    return {
        "temperature_analysis":     t,
        "humidity_analysis":        h,
        "moisture_analysis":        m,
        "overall_trend":            urgency,
        "trend_alert":              bads >= 2,
        "earliest_danger_in_hours": min_hours,
        "urgency":                  urgency,
        "action_message":           msg,
        # Legacy backward-compat fields (keep for existing frontend consumers)
        "temperature_trend":        t["trend"],
        "humidity_trend":           h["trend"],
        "moisture_trend":           m["trend"],
        "trend_message":            msg,
    }
```

#### Step 3: Update the `_run_inference` call to pass `grain_type`

In `_run_inference` (around line 475), change:
```python
# BEFORE:
spoilage_trend = _spoilage_trend(
    req.temperature_history, req.humidity_history, req.moisture_history
),
# AFTER:
spoilage_trend = _spoilage_trend(
    req.temperature_history, req.humidity_history, req.moisture_history,
    grain_type=req.grain_type,  # â† ADD THIS
),
```

#### Step 4: Add the lightweight `/trend` endpoint (add before `/model-info` route)

```python
class TrendRequest(BaseModel):
    grain_type:          str           = Field("wheat")
    silo_id:             Optional[str] = None
    temperature_history: List[float]   = Field(default_factory=list)
    humidity_history:    List[float]   = Field(default_factory=list)
    moisture_history:    List[float]   = Field(default_factory=list)


@app.post("/trend", summary="Trend-only analysis â€” no ONNX inference (< 5ms, call every 5 min)")
async def trend_only(req: TrendRequest):
    """
    Lightweight proactive monitoring endpoint.
    Skips ONNX entirely. Use for frequent polling (every 5 minutes).
    Returns: rate_per_hour, urgency, projected_hours_to_danger per sensor.
    """
    temp_h, hum_h, mc_h = req.temperature_history, req.humidity_history, req.moisture_history
    if req.silo_id and not temp_h:
        history = await _fetch_sensor_history(req.silo_id)
        temp_h  = history["temperature_history"]
        hum_h   = history["humidity_history"]
        mc_h    = history["moisture_history"]
    return _spoilage_trend(temp_h, hum_h, mc_h, grain_type=req.grain_type)
```

#### Step 5: Verify via Swagger UI at `/docs`

Test with a rising scenario (wheat approaching danger thresholds):
```json
POST /trend
{
  "grain_type": "wheat",
  "temperature_history": [17.0, 17.5, 18.0, 18.8, 19.5, 20.2],
  "humidity_history":    [60.0, 61.0, 62.0, 63.0, 64.0, 65.0],
  "moisture_history":    [12.0, 12.2, 12.4, 12.6, 12.8, 13.0]
}
```
Expected response:
```json
{
  "urgency": "WORSENING",
  "earliest_danger_in_hours": 0.2,
  "action_message": "âš ï¸ 2 sensors rising. Danger in ~0.2h. Prepare intervention.",
  "temperature_analysis": { "rate_per_hour": 0.64, "projected_hours_to_danger": 0.3 },
  "humidity_analysis":    { "rate_per_hour": 1.0,  "projected_hours_to_danger": 0.0 }
}
```

**âœ… Task 2.5 Complete when:** `/trend` returns `rate_per_hour` and `projected_hours_to_danger` per sensor. The `/predict` response also carries the richer trend data with `urgency` and `action_message`.

---

### ðŸŸ¢ Task 2.3 â€” Build the RAG Pipeline [ML-INTERNEE]

**What this does:** Connects the AI assistant to real grain science research papers via pgvector.
When users ask "why is my grain risky?", the AI cites actual published science.

#### Step A: Enable pgvector in Supabase
1. Supabase Dashboard â†’ **SQL Editor** â†’ **New Query**.
2. Paste and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS research_embeddings (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  source_url  TEXT,
  chunk_text  TEXT NOT NULL,
  embedding   VECTOR(768),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS research_embeddings_embedding_idx
  ON research_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

Click **Run**. Confirm: `Success. No rows returned.`

#### Step B: Create `scripts/source_papers.py`
> **IMPORTANT RAG NOTE:** We do NOT ingest entire PDFs. The RAG pipeline should extract only the abstract, findings, and conclusion from the papers. Adding raw, unchunked PDFs into the vector DB creates excessive noise and token bloat. The script should chunk at 500 words per embedding.

```python
import os, httpx
from supabase import create_client

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
GOOGLE_API_KEY = os.environ["GOOGLE_API_KEY"]

def fetch_papers(query, limit=20):
    r = httpx.get("https://api.semanticscholar.org/graph/v1/paper/search",
                  params={"query": query, "limit": limit, "fields": "title,abstract,url"}, timeout=30)
    return r.json().get("data", [])

def chunk_text(text, size=500):
    words = text.split()
    return [" ".join(words[i:i+size]) for i in range(0, len(words), size)]

def get_embedding(text):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={GOOGLE_API_KEY}"
    r = httpx.post(url, json={"model": "models/text-embedding-004",
                               "content": {"parts": [{"text": text}]}}, timeout=30)
    return r.json()["embedding"]["values"]

for query in ["grain storage spoilage", "aflatoxin wheat humidity", "post harvest loss Pakistan"]:
    for paper in fetch_papers(query):
        text = paper.get("abstract") or ""
        if len(text) < 100:
            continue
        for chunk in chunk_text(text):
            supabase.table("research_embeddings").insert({
                "title": paper.get("title", "Unknown"),
                "source_url": paper.get("url", ""),
                "chunk_text": chunk,
                "embedding": get_embedding(chunk)
            }).execute()
            print(f"Inserted: {paper.get('title', 'Unknown')[:60]}")
```

#### Step C: Create `.github/workflows/rag-update.yml`

```yaml
name: RAG Research Paper Update
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC
  workflow_dispatch:
jobs:
  update-rag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: {python-version: '3.11'}
      - run: pip install supabase httpx
      - run: python scripts/source_papers.py
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
```

#### Step D: Seed the Database Manually (First Time)
```powershell
cd C:\Users\Nexgen\Projects\GrainHero_latest
pip install supabase httpx
python scripts/source_papers.py
```

Verify in **Supabase â†’ Table Editor â†’ research_embeddings**. Expect 50â€“100+ rows.

---

## PHASE 3: Backend â€” Insurance, Logs & Alert Engine
### Goal: Complete the transparency backbone. Every action is logged, alerted, and traceable.

---

### ðŸŸ¢ Task 3.1 â€” Expand ActivityLog Enums & LoggingService [ML-INTERNEE]

**File: `models/ActivityLog.js`** â€” add to the `action` enum:
```javascript
'insurance_policy_renewed', 'insurance_policy_cancelled', 'insurance_policy_deleted',
'insurance_claim_reviewed', 'insurance_claim_approved', 'insurance_claim_rejected',
'insurance_claim_payment_processed', 'insurance_claim_document_uploaded',
'insurance_claim_escalated', 'insurance_claim_closed',
'silo_created', 'silo_updated', 'silo_deleted',
'sensor_configured', 'sensor_calibrated',
'user_created', 'user_updated', 'user_deleted', 'user_role_changed',
'subscription_created', 'subscription_renewed', 'subscription_expired', 'subscription_cancelled',
'threshold_updated', 'actuator_triggered',
'alert_acknowledged', 'alert_resolved', 'alert_escalated',
'report_exported', 'data_exported'
```

Add to `category` enum:
```javascript
'silo', 'sensor', 'user', 'subscription', 'threshold', 'actuator', 'alert', 'export'
```

Add to `entity_type` enum:
```javascript
'Silo', 'SensorDevice', 'Tenant', 'Subscription', 'Threshold', 'Actuator', 'GrainAlert'
```

**File: `services/loggingService.js`** â€” add static helpers:
```javascript
static async logInsurancePolicyCreated(user, policy, ip) { ... }
static async logInsurancePolicyRenewed(user, policy, ip) { ... }
static async logInsuranceClaimApproved(user, claim, amount, ip) { ... }
static async logInsuranceClaimRejected(user, claim, reason, ip) { ... }
static async logInsuranceClaimPaymentProcessed(user, claim, payment, ip) { ... }
static async logAlertAcknowledged(user, alert, ip) { ... }
static async logAlertResolved(user, alert, ip) { ... }
static async logAlertEscalated(user, alert, escalatedTo, ip) { ... }
static async logSubscriptionEvent(user, event, tenantId, ip) { ... }
static async logUserManagement(user, action, targetUser, ip) { ... }
```

---

### ðŸŸ¢ Task 3.2 â€” Build the AlertEngine Service [ML-INTERNEE]

**File to create: `services/alertEngine.js`**

This service is called by LoggingService on every log entry.
It checks if the action matches any alert rule, and if so, creates a `GrainAlert` record.

**Alert Trigger Table:**

| Trigger | Priority | Roles Notified |
|---|---|---|
| Batch deleted | ðŸ”´ Critical | Admin, Super Admin |
| Batch quantity modified | ðŸŸ  High | Admin, Manager |
| Spoilage detected (critical) | ðŸ”´ Critical | Admin, Manager |
| Insurance claim filed | ðŸŸ  High | Super Admin |
| Insurance claim approved | ðŸŸ¡ Medium | Admin, Manager |
| Insurance claim rejected | ðŸŸ  High | Admin, Manager |
| Policy expiring in 30 days | ðŸŸ  High | Admin |
| Policy expiring in 7 days | ðŸ”´ Critical | Admin, Super Admin |
| Subscription expiring in 7 days | ðŸ”´ Critical | Admin |
| Subscription expired | ðŸ”´ Critical | Admin, Super Admin |
| Payment overdue > 30 days | ðŸŸ  High | Admin |
| Sensor offline > 1 hour | ðŸŸ  High | Technician, Manager |
| Batch ML risk score > 80% | ðŸ”´ Critical | Admin, Manager |

**Cron-based scheduled checks in this service:**
- `checkSubscriptionExpirations()` â€” runs daily at midnight
- `checkInsuranceRenewals()` â€” runs daily
- `checkBatchQualityDegradation()` â€” runs daily
- `checkSensorOffline()` â€” runs every hour

---

### ðŸŸ¢ Task 3.2.5 â€” Trend-Based Alert Triggers in AlertEngine [ML-INTERNEE]

**Why:** AlertEngine (Task 3.2) fires on events like "spoilage detected" or "sensor offline". This task adds an entirely new category: **trajectory-based pre-spoilage alerts** that fire when conditions are *heading toward* danger â€” not when they arrive. This is what makes GrainHero proactive, not reactive.

**Dependency:** Complete Task 2.5 first. This task consumes the `urgency` and `earliest_danger_in_hours` fields from the upgraded `_spoilage_trend()` output.

**Time estimate:** 2â€“3 hours.

**File: `services/alertEngine.js`**

#### Step 1: Add `evaluateTrend()` method to the AlertEngine class

```javascript
/**
 * Called after every ML prediction that returns spoilage_trend data.
 * Fires GrainAlert records BEFORE spoilage occurs, based on trajectory.
 */
static async evaluateTrend(siloId, tenantId, trendResult) {
  const { urgency, earliest_danger_in_hours, action_message } = trendResult;

  if (urgency === 'CRITICAL') {
    await AlertEngine.createAlert({
      silo_id:              siloId,
      tenant_id:            tenantId,
      type:                 'spoilage_trend',
      priority:             'critical',
      title:                'ðŸš¨ Spoilage Trend: Critical â€” Immediate Action Required',
      message:              action_message,
      metadata:             { urgency, earliest_danger_in_hours, trend: trendResult },
      auto_trigger_actuator: 'aeration',  // signal aeration system immediately
    });

  } else if (urgency === 'WORSENING') {
    await AlertEngine.createAlert({
      silo_id:   siloId,
      tenant_id: tenantId,
      type:      'spoilage_trend',
      priority:  'high',
      title:     'âš ï¸ Spoilage Trend: Worsening â€” Prepare Intervention',
      message:   action_message,
      metadata:  { urgency, earliest_danger_in_hours, trend: trendResult },
    });

  } else if (urgency === 'CAUTION') {
    // Suppress duplicate caution alerts â€” max 1 per 4 hours per silo
    const recent = await AlertEngine.findRecentTrendAlert(siloId, 240);
    if (!recent) {
      await AlertEngine.createAlert({
        silo_id:   siloId,
        tenant_id: tenantId,
        type:      'spoilage_trend',
        priority:  'medium',
        title:     'ðŸ“ˆ Spoilage Trend: Caution â€” Monitor Closely',
        message:   action_message,
        metadata:  { urgency, trend: trendResult },
      });
    }
  }
  // STABLE â†’ no alert
}

/** Deduplication helper â€” find an unresolved trend alert within N minutes. */
static async findRecentTrendAlert(siloId, withinMinutes = 60) {
  const since = new Date(Date.now() - withinMinutes * 60 * 1000);
  return await GrainAlert.findOne({
    silo_id:    siloId,
    type:       'spoilage_trend',
    created_at: { $gte: since },
    status:     { $ne: 'resolved' },
  });
}
```

#### Step 2: Wire into the backend ML prediction call

In whichever backend service/route calls the ML `/predict` endpoint, add after receiving the response:

```javascript
const mlResponse = await callMLService(predictionPayload);

// Proactive trend evaluation â€” fires alert BEFORE spoilage
if (mlResponse.spoilage_trend) {
  await AlertEngine.evaluateTrend(
    silo.id,
    silo.tenant_id,
    mlResponse.spoilage_trend
  );
}
```

#### Step 3: Expand the Alert Trigger Table (add to Task 3.2 table)

| Trigger | Priority | Roles Notified |
|---|---|---|
| Spoilage trend CRITICAL (danger â‰¤ 6h) | ðŸ”´ Critical + auto-aeration | Admin, Manager, Technician |
| Spoilage trend WORSENING (2+ sensors rising) | ðŸŸ  High | Admin, Manager |
| Spoilage trend CAUTION (1 sensor rising) | ðŸŸ¡ Medium (deduplicated, max 1/4hr/silo) | Manager, Technician |

#### Step 4: Verify

1. Call `POST /predict` with rising history arrays and a known `silo_id`.
2. Check `GrainAlert` collection in MongoDB.
3. A document with `type: 'spoilage_trend'` and `priority: 'high'` or `'critical'` must appear.

**âœ… Task 3.2.5 Complete when:** A test prediction with rising temperature + humidity history automatically creates a `GrainAlert` of type `spoilage_trend` in the database, with no manual intervention.

---

### ðŸŸ¢ Task 3.3 â€” Add Missing API Endpoints [ML-INTERNEE]

**File: `routes/insurance.js`** â€” add 9 missing endpoints:

```javascript
POST   /claims/:id/review          // Super admin starts investigation
PUT    /claims/:id/status           // Approve, reject, or close a claim
POST   /claims/:id/documents        // Upload supporting documents
PUT    /claims/:id/investigation    // Update investigation findings
PUT    /claims/:id/assessment       // Update damage assessment and settlement
POST   /claims/:id/payment          // Record payment processing
POST   /claims/:id/notes            // Add internal notes / communication log
DELETE /policies/:id                // Soft-delete a policy
PUT    /policies/:id/renew          // Renew an expired policy
```

**File: `routes/alerts.js`** â€” add 3 missing endpoints:

```javascript
POST   /grain-alerts/:id/acknowledge  // Mark alert as seen
POST   /grain-alerts/:id/resolve       // Mark alert as resolved
POST   /grain-alerts/:id/escalate      // Escalate to a higher role
```

**Each endpoint MUST:**
1. Validate caller role using existing auth middleware.
2. Perform the database operation.
3. Call `LoggingService` to create an audit log entry.
4. Call `AlertEngine.createAlert()` if the action warrants a new alert.
5. Return structured JSON: `{ success: true, data: updatedEntity }`.

---

## PHASE 4: Frontend â€” Professional UI Upgrade
### Goal: Build premium, role-aware UIs using the Shadcn/Radix design system.

---

### ðŸŸ¢ Task 4.1 â€” Install Shadcn UI Components [ML-INTERNEE]

Run in the **frontend** project directory:
```powershell
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add card
npx shadcn-ui@latest add table
npx shadcn-ui@latest add scroll-area
npx shadcn-ui@latest add select
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add separator
```

---

### ðŸŸ¢ Task 4.2 â€” Insurance Claim Stepper Modal [ML-INTERNEE]

**File:** `src/components/insurance/ClaimDetailModal.tsx`

Build a 7-step visual progress indicator:
```
Filed â†’ Under Review â†’ Investigation â†’ Assessment â†’ Decision â†’ Payment â†’ Closed
```

Visual design spec:
- Completed steps: filled blue circle with a white checkmark.
- Current step: blue circle with an animated CSS pulse ring.
- Future steps: grey empty circle.
- Connecting lines: blue when done, grey when upcoming.

Role-based content:
- **Super Admin** sees action forms at the current step (investigation, assessment, payment, rejection).
- **Admin / Manager** sees read-only status with a timestamped history of all actions.

---

### ðŸŸ¢ Task 4.3 â€” Activity Logs Visual Timeline [ML-INTERNEE]

**File:** `src/pages/ActivityLogsPage.tsx`

1. Add a toggle at the top: **List View | Timeline View**.
2. In Timeline View, render a vertical grey line on the left side.
   Each log is a node with a severity-colored dot:
   - ðŸ”´ Red = Critical
   - ðŸŸ  Orange = High
   - ðŸŸ¡ Yellow = Medium
   - ðŸŸ¢ Green = Normal/Info
3. Each node shows: timestamp, actor name, action description.
   Click to expand and show full metadata.
4. Role-aware filters:
   - Technician: batch and spoilage logs only
   - Manager: all grain-related logs
   - Admin: everything for their tenant
   - Super Admin: all tenants + tenant selector dropdown at top

---

### ðŸŸ¢ Task 4.4 â€” Alert Management Center [ML-INTERNEE]

**File:** `src/pages/AlertsPage.tsx`

**Top row:** 4 KPI Cards (clickable to filter):
```
[ðŸ”´ CRITICAL: 3]  [ðŸŸ  HIGH: 7]  [ðŸŸ¡ MEDIUM: 12]  [ðŸ”µ LOW: 4]
```

**Alert feed** â€” each card shows:
- Colored left border (red/orange/yellow/blue)
- Priority badge
- Source icon (ðŸŒ¡ï¸ sensor | ðŸ¤– AI | ðŸ“ˆ trend | ðŸ›¡ï¸ insurance | ðŸ“¦ batch | ðŸ’° payment | ðŸ”‘ subscription | âš™ï¸ system)
- Title and message
- Time since triggered (e.g., `3 minutes ago`)
- Quick action buttons:
  - Active â†’ `Acknowledge` button
  - Acknowledged â†’ `Mark Resolved` button

**Trend Alert Card (special design â€” type: `spoilage_trend`):**
Trend alerts are visually distinct because they predict future risk, not current state.
- Left border: animated orangeâ†’red gradient (pulsing when CRITICAL)
- **Urgency badge**: `CRITICAL` / `WORSENING` / `CAUTION` with color fill
- **Danger countdown chip**: `â±ï¸ ~8h to threshold` â€” shown prominently below the title
- **Per-sensor sparkline row**: three mini trend arrows (â†‘ â†“ â†’) with rate label:
  e.g., `ðŸŒ¡ï¸ +0.6Â°C/hr  ðŸ’§ +1.2%/hr  ðŸŒ¾ +0.1%/hr`
- **Action button for CRITICAL**: `âš¡ Start Aeration Now` (calls actuator endpoint directly)
- **Action button for WORSENING**: `ðŸ‘ï¸ Monitor` (opens side panel, no auto-action)

**Side panel** (opens on alert click):
- Full alert details and the trigger condition
- Action history (who acknowledged, when, who resolved)
- Escalation chain (if escalated)
- Linked entity with a click-to-navigate link (e.g., `View Batch WB-001-2026`)
- **For trend alerts:** Per-sensor breakdown table showing `current_value`, `rate_per_hour`, `projected_hours_to_danger`

---

### ðŸŸ¢ Task 4.5 â€” Sidebar Live Badge Counts [ML-INTERNEE]

**File:** `src/components/sidebar.tsx`

- **Activity Logs** nav item: grey badge with unread log count.
- **Grain Alerts** nav item: red badge with unresolved alert count. Pulses when 1+ CRITICAL alert is unresolved.
- **Insurance** nav item: badge with pending claims count.

**Add these 3 lightweight backend endpoints:**
```javascript
GET /grain-alerts/unread-count       -> { count: 3 }
GET /activity-logs/unread-count      -> { count: 47 }
GET /insurance/claims/pending-count  -> { count: 2 }
```

---

## PHASE 5: Real Dataset Strategy & ML Upgrades
### Goal: Start collecting real ground-truth training data from the pilot silo.

---

### ðŸŸ¢ Task 5.1 â€” "Mark Outcome" Validation Button [ML-INTERNEE]

**File:** `src/pages/GrainBatchDetailPage.tsx`

When a batch is dispatched/completed, show a mandatory validation panel:
```tsx
<div className="mt-8 p-4 bg-gray-50 rounded-lg border">
  <h3 className="font-bold mb-2">Final Quality Validation (Required)</h3>
  <p className="text-sm text-gray-600 mb-4">
    Log the actual state of this grain to improve AI accuracy.
  </p>
  <div className="flex gap-4">
    <Button className="bg-green-600" onClick={() => markOutcome('safe')}>
      âœ… Sold Safe
    </Button>
    <Button className="bg-red-600" onClick={() => markOutcome('spoiled')}>
      âŒ Found Spoiled
    </Button>
  </div>
</div>
```

Writes to `validation_status` column in `grain_batches`. Builds real ground-truth training data.

---

### ðŸŸ¢ Task 5.2 â€” Implement TimeSeriesSplit [ML-INTERNEE]

**File:** `ml-deploy/fast_retrain.py`

```python
# BEFORE (wrong - allows data leakage):
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# AFTER (correct for time-series data):
from sklearn.model_selection import TimeSeriesSplit
tscv = TimeSeriesSplit(n_splits=5)
for train_index, test_index in tscv.split(X):
    X_train, X_test = X.iloc[train_index], X.iloc[test_index]
    y_train, y_test = y.iloc[train_index], y.iloc[test_index]
```

---

### ðŸŸ¢ Task 5.3 â€” Build Sliding Window Dataset Generator [ML-INTERNEE]

**File:** `scripts/generate_sliding_window.py`

Converts flat sensor rows into 24-hour rolling sequence blocks.
Mandatory prep before any Mamba/Transformer upgrade.

```python
import pandas as pd, numpy as np

FEATURE_COLS = ['temperature', 'humidity', 'storage_days', 'airflow',
                'dew_point', 'ambient_light', 'pest_presence', 'grain_moisture', 'rainfall']

def create_sequences(df: pd.DataFrame, window_size: int = 24):
    sequences, labels = [], []
    for i in range(len(df) - window_size):
        seq = df.iloc[i : i + window_size][FEATURE_COLS].values
        label = df.iloc[i + window_size]['spoilage_label']
        sequences.append(seq)
        labels.append(label)
    return np.array(sequences), np.array(labels)
```

---


---

## PHASE 6: IoT Migration & Multi-Grain Scaling
### Goal: Move from prototype hardware to custom PCB, and validate multi-grain support.

---

### ðŸŸ¢ Task 6.0 â€” Prototype Sensor Documentation [IOT-INTERNEE]
**What this does:** Document the new sensors added to the custom PCB (e.g., CO2, internal grain temp vs ambient temp), their assigned GPIO pins, and the exact new JSON keys to add to the MQTT payload.

---

### ðŸŸ¢ Task 6.1 â€” Super-Admin Research Intel Dashboard Panel [FULLSTACK-INTERNEE]
**What this does:** Adds a "ðŸ”¬ Research Intel" page to the Super-Admin dashboard. It reads the `research_intelligence` table from Supabase, shows unread counts as a sidebar badge, and lets the owner click "Mark Implemented" on new AI breakthroughs.

---

### ðŸŸ¢ Task 6.2 â€” Multi-Grain Protocol Testing [IOT-INTERNEE]
**What this does:** Proves the ML pipeline handles different grains correctly.
- Configure Silo A with `grain_type: "wheat"`
- Configure Silo B with `grain_type: "rice"`
- Run both simultaneously. Verify the dashboard routes data correctly and the ML service returns different risk scores.

---

### ðŸŸ¢ Task 6.3 â€” New Prototype Integration Test [IOT-INTERNEE]
**What this does:** Run the old DOIT ESP32 prototype side-by-side with the new custom PCB for 2 weeks in the same silo. Compare MQTT outputs to ensure sensor calibration matches before decommissioning the old hardware.

---

## PHASE 7: Continuous Improvement & Research Intel (Ongoing)
- Weekly: Review Research Intel alerts (Owner)
- Every 6-8 weeks: Retrain model on new labeled data, hot-swap to Render.

---

## PHASE 8: Mamba Migration Path (H3 â€” 3-6 Months Post-Launch)
### Goal: Upgrade the AI brain from XGBoost to Mamba for sequence modeling.

---

### ðŸŸ¢ Task 8.1 â€” Train Mamba Sequence Model [ML-INTERNEE]
**What this does:** After 3+ months of real data is collected, write `scripts/train_mamba.py` to train a Mamba architecture on the sliding window dataset. Export it to ONNX format.

---

### ðŸŸ¢ Task 8.2 â€” A/B Test Mamba vs XGBoost [ML-INTERNEE]
**What this does:** Upload the `mamba_v1.onnx` to Supabase Storage. Render hot-swaps it in. Monitor the early warning rate and false positive rate for 2 weeks compared to the XGBoost baseline. If Mamba wins, it becomes the permanent default.


## FINAL MASTER CHECKLISTS

### ðŸ”´ OWNER Checklist

- [ ] **0.3** Set up EMQX Serverless (Mumbai). Add credentials to firmware. Confirm live data in MQTTX.
- [ ] **0.4** Test OTA flashing locally via Python HTTP server. Confirm ESP32 flashes itself.
- [ ] **1.1** Create private `firmware-updates` bucket in Supabase with correct policies.
- [x] **1.2** Add 3 GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`. ~~DONE~~
- [ ] **2.1** Run `upload_initial_models.py` â€” push all 5 ONNX models to Supabase Storage.
- [ ] **2.2** Deploy ML service to Render (Docker). Confirm Swagger UI is live. Add URL to frontend env.
- [ ] **PILOT** Flash ESP32 boards. Install at flour mill. Confirm live data in dashboard.

### ðŸŸ¢ INTERNEE Checklist

- [x] **0.1** WiFiManager integrated into firmware. ~~DONE~~.
- [ ] **0.2** Verify `computePestMoldRisk()` output in Serial Monitor. Confirm `pest_presence` is in MQTT payload.
- [ ] **1.3** Run `git rm --cached` on `.onnx`/`.pkl` files. Add to `.gitignore`. Push.
- [ ] **2.3A** Enable pgvector in Supabase SQL Editor. Create `research_embeddings` table + ivfflat index.
- [ ] **2.3B** Write `scripts/source_papers.py` (Semantic Scholar + Gemini embedding pipeline).
- [ ] **2.3C** Create `.github/workflows/rag-update.yml` for weekly auto-refresh.
- [ ] **2.3D** Run `source_papers.py` manually once. Verify 50+ rows in Supabase.
- [ ] **2.4** Add `silo_id` to `PredictionRequest`. Write `_fetch_sensor_history()`. Enrich `/predict` endpoint to auto-pull last 24 Supabase readings. Verify `spoilage_trend` shows real historical context.
- [ ] **2.5** Add `DANGER_THRESHOLDS` dict + `_analyze_sensor_trend()`. Replace `_spoilage_trend()` with rate+projection version. Update `_run_inference` to pass `grain_type`. Add `/trend` endpoint. Test with rising-sensor JSON fixture in Swagger `/docs`.
- [ ] **3.1** Expand `ActivityLog.js` enums. Add helper methods to `loggingService.js`.
- [ ] **3.2** Create `services/alertEngine.js` with full trigger table + scheduled cron checks.
- [ ] **3.2.5** Add `evaluateTrend()` + `findRecentTrendAlert()` to `alertEngine.js`. Wire into ML prediction pipeline call. Add 3 trend trigger rows to trigger table. Verify `GrainAlert` with `type: 'spoilage_trend'` is created on rising-trend test.
- [ ] **3.3** Add 9 missing insurance endpoints + 3 missing alert endpoints to backend routes.
- [ ] **4.1** Install Shadcn UI components via CLI.
- [ ] **4.2** Build Insurance Claim Stepper modal (7 steps, role-aware action panels).
- [ ] **4.3** Build Activity Logs vertical timeline (severity colors, role-aware filters).
- [ ] **4.4** Build Alert Management Center: KPI cards, alert feed, side-panel detail. Include ðŸ“ˆ trend source icon. Implement Trend Alert Card with urgency badge, danger countdown chip, per-sensor sparkline row (`ðŸŒ¡ï¸ +0.6Â°C/hr`), and âš¡ aeration quick-action button for CRITICAL trend alerts.
- [ ] **4.5** Add live badge counts to sidebar nav. Add 3 count endpoints to backend.
- [ ] **5.1** Add Mark Outcome buttons to Grain Batch Detail page.
- [ ] **5.2** Replace random split with `TimeSeriesSplit` in `fast_retrain.py`.
- [ ] **5.3** Write `scripts/generate_sliding_window.py` dataset prep script.

---

## HARDWARE LIBRARY REFERENCE
### Share this with any internee doing hardware testing

**Board:** DOIT ESP32 DEVKIT V1
**Board Package:** `esp32 by Espressif Systems` (install via Arduino IDE Boards Manager)

| Library | Author | Version Installed | Notes |
|---|---|---|---|
| WiFiManager | tzapu | 2.0.17+ | **NEW** â€” Required for Task 0.1 |
| ArduinoHttpClient | Arduino | 0.6.1 | |
| Adafruit BME680 Library | Adafruit | 2.0.5 | Update available (2.0.6) |
| Adafruit BusIO | Adafruit | 1.17.4 | |
| Adafruit GFX Library | Adafruit | 1.12.4 | Update available (1.12.6) |
| Adafruit SSD1306 | Adafruit | 2.5.16 | Update available (2.5.17) |
| Adafruit Unified Sensor | Adafruit | 1.1.15 | |
| ArduinoJson | Benoit Blanchon | 6.21.5 | Update available (7.4.3 â€” check breaking changes) |
| DHT sensor library | Adafruit | 1.4.6 | Update available (1.4.7) |
| ESP32Servo | Kevin Harrington | 3.0.9 | Update available (3.2.1) |
| PubSubClient | Nick O'Leary | 2.8 | |



## APPENDIX: GitHub Collaboration & Paywalled Research Guidelines

### How to Handle Paywalled Research Papers
If a paper is behind a paywall (e.g., IEEE, Elsevier):
1. **Do NOT** try to download full PDFs illegally or buy them if unnecessary.
2. **Do** fetch the direct link (DOI/URL) and the abstract.
3. Use the scripts/source_papers.py script to scrape the abstract and conclusion via Semantic Scholar API. This is usually 80% of the valuable information (the exact methodology is often unnecessary for our high-level RAG).
4. For the owner (you): Review the abstract. If you decide the full methodology is critical, *then* manually procure it.

### How to Collaborate Without Messing Up GitHub History (Owner & Intern)
Since you are both working on Ai/Ml-Branch but want to avoid pushing the local AI_CHAT_LOG.md or large PDFs, follow this workflow:

1. **Gitignore is your shield:** AI_CHAT_LOG.md and KNOWLEDGE_BASE/02_research_papers/*.pdf MUST be in .gitignore. (I have already done this for you).
2. **Pulling her changes:** When the intern pushes her ML code, run this to get her code without merge conflicts:
   `ash
   git pull origin Ai/Ml-Branch --rebase
   `
   *Rebasing* applies your local, unpushed commits on top of her newly pulled commits, keeping history clean and linear.
3. **Pushing your changes:**
   `ash
   git add .  # (Because sensitive stuff is ignored, it won't be added)
   git commit -m "feat: added new xyz"
   git push origin Ai/Ml-Branch
   `
4. **Never Force Push:** Because you are connected to Lovable, never run git push -f. If you have a conflict, fix it locally and run git rebase --continue.
