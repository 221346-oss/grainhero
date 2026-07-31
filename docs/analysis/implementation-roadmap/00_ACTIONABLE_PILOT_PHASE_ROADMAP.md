# GrainHero (by TEQrock): Master Pilot Phase Roadmap
## Ultra-Detailed, Chronological, Step-by-Step Task List
### Updated for latest platform UIs: Supabase, Render, EMQX Cloud, Arduino IDE 2.x

> **Single Source of Truth.** This is the complete execution guide from zero to a live pilot.
> - **🔴 OWNER** = Involves secrets, money, hardware, or cloud credentials. Owner only.
> - **🟢 INTERNEE** = Code-only tasks, safe to delegate.

---

## ARCHITECTURE DECISION (READ FIRST)

**Keep current XGBoost/LightGBM ensemble for the pilot. Migrate to Mamba after 3 months of real data.**
Mamba has linear memory, handles months of IoT time-series, runs on Render free tier.
Jamba is overkill and impossible to deploy cheaply at this stage.

**Active firmware file for all future work:**
`docs/firmware/grainhero_updated_ino.ino`
This is the optimized rewrite of `grainhero_main_final.ino`.
Same features, 731 lines instead of 1591, cleaner memory management for the ESP32.

---

## PHASE 0: Pre-Cloud — Local Hardware & Firmware Prep
### Goal: Prove the silo hardware works BEFORE waiting for cloud credentials.

---

### ✅ Task 0.1 — Remove Hardcoded WiFi Secrets [INTERNEE] [DONE]

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
1. Arduino IDE 2.x → Left sidebar **Library Manager** icon (book).
2. Search: `WiFiManager`
3. Install: **WiFiManager by tzapu** (version 2.0.17 or latest).

---

### 🟢 Task 0.2 — Verify Pest Sensor is Live [INTERNEE]

**Why this matters:** `Pest_Presence` has the highest SHAP impact in the ML model.
Previously hardcoded to `0.0` — making the AI completely blind to pests.

**Good news:** The updated firmware already has this fixed via `computePestMoldRisk()`.
This function reads the BME680 gas resistance, maps it to a TVOC estimate, then
combines it with humidity, temperature, and soil moisture to produce a 0.0–1.0 pest score.

**Steps to verify it is working:**

1. Open `docs/firmware/grainhero_updated_ino.ino`.
2. Find `void processTVOCData()` (around line 236).
3. Confirm this line exists: `cd.pest_presence = pestRiskLabel;`
4. Find `computePestMoldRisk()` (around line 225). Confirm the scoring logic is present.
5. Find the JSON payload builder and confirm `pest_presence` is in the MQTT/Firebase payload.
6. Flash the board. Open **Tools → Serial Monitor** at **115200 baud**.
7. You should see:
   ```
   Pest Risk: 0.12 (Low)
   ```
   If you see this output, Task 0.2 is complete.

---

### 🔴 Task 0.3 — Set Up EMQX Cloud & Test Live Data [OWNER]

**What this does:** Proves the silo sends secure encrypted sensor data to the cloud
without the backend server being ready at all.

**Time estimate:** 30–45 minutes.

#### Step 1: Create an EMQX Serverless Deployment

1. Go to **https://cloud.emqx.com** (sign up with Google or email if needed).
2. After login, click **Deployments** in the top navigation.
3. Click **New Deployment** (top right corner).
4. On the plan selection screen, choose **Serverless** (FREE — 1 million session minutes/month).
5. Under **Cloud Region**, select **Asia Pacific (Mumbai)** — lowest latency from Pakistan.
6. Name it: `grainhero-pilot`
7. Click **Deploy Now**. Wait ~1–2 minutes.
8. On the Overview page that appears, copy and save:
   - **Connection Address** (e.g., `abc123.emqxsl.com`) — needed in firmware.
   - **Port:** `8883` (always use TLS, never plain 1883).

#### Step 2: Create MQTT Credentials

1. In the left sidebar, click **Access Control** → **Authentication**.
2. Click **+ Add**.
3. First user (for the silo device):
   - **Username:** `grainhero_device`
   - **Password:** `GH_Silo@2026!` (or any strong password — save it securely)
4. Click **Confirm**.
5. Click **+ Add** again for dashboard testing:
   - **Username:** `grainhero_dashboard`
   - **Password:** (any strong password)

#### Step 3: Download the Root CA Certificate

1. In the left sidebar, click **Overview**.
2. Scroll to the **Connection Information** section.
3. Find **CA Certificate** → click **Download**.
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
   - **Tools → Board → esp32 → DOIT ESP32 DEVKIT V1**
   - **Tools → Port** → select the COM port (e.g., COM5)
3. Click **Upload** (right-arrow icon). Wait for `Done uploading.`
4. Open **Tools → Serial Monitor** at **115200 baud**.
5. Successful connection looks like:
   ```
   WiFi: 192.168.x.x
   [MQTT] Connecting to abc123.emqxsl.com:8883...
   [MQTT] Connected!
   [MQTT] Published to silos/004B12387760/telemetry
   ```

#### Step 6: Verify Live Data on MQTTX Desktop App

1. Download **MQTTX** from **https://mqttx.app** → MQTTX Desktop → Windows installer.
2. Open MQTTX → Click **+** button (left sidebar) → **New Connection**.
3. Fill in the form:
   - **Name:** `GrainHero Test`
   - **Protocol:** `mqtts://` (select from dropdown)
   - **Host:** `abc123.emqxsl.com` (your actual Connection Address)
   - **Port:** `8883`
   - **Username:** `grainhero_dashboard`
   - **Password:** (the dashboard password)
   - **SSL/TLS:** Toggle **ON**
   - **Certificate:** Select `CA_Cert_Only`
   - **CA File:** Click the folder icon → upload `emqx_root_ca.pem`
4. Click **Connect** (top right). Status dot turns **GREEN** when connected.
5. At the bottom, click **+ New Subscription**.
   - **Topic:** `silos/+/telemetry` (the `+` wildcard matches any silo ID)
6. Click **Confirm**.
7. **Live JSON data streams in from the ESP32 every 2 seconds:**
   ```json
   { "temperature": 28.4, "humidity": 65.2, "pest_presence": "Low", "pestRiskScore": 0.12 }
   ```

**✅ Task 0.3 Complete. The silo is live on the internet.**

---

### 🔴 Task 0.4 — Test OTA Firmware Updates Locally [OWNER]

**What this does:** Proves the ESP32 can download and install new firmware over WiFi
without Supabase Storage. After this test, just swap the URL to cloud.

**Time estimate:** 20 minutes.

#### Step 1: Export the Binary

1. In Arduino IDE 2.x, open `grainhero_updated_ino.ino`.
2. Go to **Sketch → Export Compiled Binary**.
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

## PHASE 1: Foundation — Secrets & Repository Cleanup
### Goal: Secure all credentials and prepare for team collaboration.

---

### 🔴 Task 1.1 — Supabase: Create Firmware Storage Bucket [OWNER]

**Time estimate:** 10 minutes.

#### Step 1: Open Supabase Dashboard
1. Go to **https://supabase.com/dashboard** → click your GrainHero project.

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
3. Click **New Policy** → **Create a policy from scratch**.
4. Configure:
   - **Policy name:** `service_role_full_access`
   - **Allowed operations:** Check all four: SELECT, INSERT, UPDATE, DELETE
   - **Target roles:** `service_role`
   - **USING expression:** `true`
   - **WITH CHECK expression:** `true`
5. Click **Review** → **Save policy**.

#### Step 5: Copy API Credentials
1. In the left sidebar, click **Project Settings** (gear icon at the bottom).
2. Click the **API** tab.
3. Copy and save securely (NOT in any code file, NOT on GitHub):
   - **Project URL:** `https://xxxx.supabase.co` — safe to share with interns
   - **anon public key:** `eyJh...` — safe to share with interns for frontend
   - **service_role secret:** `eyJh...` — **NEVER share. NEVER commit. Owner only.**

---

### 🔴 Task 1.2 — Add GitHub Secrets [OWNER]

**Why:** GitHub Actions CI/CD needs these to auto-deploy models and run RAG weekly.

**Time estimate:** 5 minutes.

1. Go to your GitHub repository → click **Settings** tab (top of the page).
2. In the left sidebar: **Secrets and variables** → **Actions**.
3. Under **Repository secrets**, click **New repository secret** for each:

| Secret Name | Value | Where to get it |
|---|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | Task 1.1 Step 5 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Task 1.1 Step 5 |
| `GOOGLE_API_KEY` | `AIzaSy...` | Google AI Studio |

> **How to get a Google API Key:**
> 1. Go to **https://aistudio.google.com/app/apikey**
> 2. Click **Create API Key** → Copy it.

---

### 🟢 Task 1.3 — Clean Git: Remove ML Models from Tracking [INTERNEE]

**Why:** `.onnx` and `.pkl` files are 11–20MB each. GitHub's hard limit is 100MB per file.
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

**Verify:** Go to GitHub repo → `ml-deploy/` folder. The `.onnx` files should be gone.

---

## PHASE 2: ML Engine & RAG Backend Deployment
### Goal: Get the AI prediction service live on the internet.

---

### 🔴 Task 2.1 — Upload ML Models to Supabase Storage [OWNER]

**What this does:** Pushes all 5 ONNX models from your laptop to Supabase Storage.
The Render ML service downloads them on startup.

**Time estimate:** 5–10 minutes.

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

**Verify:** Supabase Dashboard → Storage → models bucket → all 5 `.onnx` files appear.

---

### 🔴 Task 2.2 — Deploy ML Service to Render [OWNER]

**What this does:** Hosts the FastAPI prediction server on the internet.
The frontend calls this URL for every spoilage prediction.

**Time estimate:** 15–20 minutes.

#### Step 1: Create a New Web Service
1. Go to **https://dashboard.render.com** → Click **New +** (top right).
2. Click **Web Service**.
3. Click **Deploy from a GitHub repository**.
4. Find your GrainHero repository → click **Connect**.

#### Step 2: Configure the Service

| Setting | Value |
|---|---|
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
1. Click **Create Web Service**. Render builds the Docker image (~3–7 min).
2. Watch the **Logs** tab. Success looks like:
   ```
   INFO:     Application startup complete.
   INFO:     Uvicorn running on http://0.0.0.0:8000
   ```
3. Your ML service is live at: `https://grainhero-ml-service.onrender.com`
4. Test it: open `https://grainhero-ml-service.onrender.com/docs` in a browser.
   You should see the FastAPI Swagger UI.
5. Click **POST /predict** → **Try it out** → paste and execute:
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
> First prediction after cold start takes 30–50 seconds. Acceptable for the pilot.
> The cron job has a local Python subprocess fallback that handles this automatically.

---

### 🟢 Task 2.3 — Build the RAG Pipeline [INTERNEE]

**What this does:** Connects the AI assistant to real grain science research papers via pgvector.
When users ask "why is my grain risky?", the AI cites actual published science.

#### Step A: Enable pgvector in Supabase
1. Supabase Dashboard → **SQL Editor** → **New Query**.
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

Verify in **Supabase → Table Editor → research_embeddings**. Expect 50–100+ rows.

---

## PHASE 3: Backend — Insurance, Logs & Alert Engine
### Goal: Complete the transparency backbone. Every action is logged, alerted, and traceable.

---

### 🟢 Task 3.1 — Expand ActivityLog Enums & LoggingService [INTERNEE]

**File: `models/ActivityLog.js`** — add to the `action` enum:
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

**File: `services/loggingService.js`** — add static helpers:
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

### 🟢 Task 3.2 — Build the AlertEngine Service [INTERNEE]

**File to create: `services/alertEngine.js`**

This service is called by LoggingService on every log entry.
It checks if the action matches any alert rule, and if so, creates a `GrainAlert` record.

**Alert Trigger Table:**

| Trigger | Priority | Roles Notified |
|---|---|---|
| Batch deleted | 🔴 Critical | Admin, Super Admin |
| Batch quantity modified | 🟠 High | Admin, Manager |
| Spoilage detected (critical) | 🔴 Critical | Admin, Manager |
| Insurance claim filed | 🟠 High | Super Admin |
| Insurance claim approved | 🟡 Medium | Admin, Manager |
| Insurance claim rejected | 🟠 High | Admin, Manager |
| Policy expiring in 30 days | 🟠 High | Admin |
| Policy expiring in 7 days | 🔴 Critical | Admin, Super Admin |
| Subscription expiring in 7 days | 🔴 Critical | Admin |
| Subscription expired | 🔴 Critical | Admin, Super Admin |
| Payment overdue > 30 days | 🟠 High | Admin |
| Sensor offline > 1 hour | 🟠 High | Technician, Manager |
| Batch ML risk score > 80% | 🔴 Critical | Admin, Manager |

**Cron-based scheduled checks in this service:**
- `checkSubscriptionExpirations()` — runs daily at midnight
- `checkInsuranceRenewals()` — runs daily
- `checkBatchQualityDegradation()` — runs daily
- `checkSensorOffline()` — runs every hour

---

### 🟢 Task 3.3 — Add Missing API Endpoints [INTERNEE]

**File: `routes/insurance.js`** — add 9 missing endpoints:

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

**File: `routes/alerts.js`** — add 3 missing endpoints:

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

## PHASE 4: Frontend — Professional UI Upgrade
### Goal: Build premium, role-aware UIs using the Shadcn/Radix design system.

---

### 🟢 Task 4.1 — Install Shadcn UI Components [INTERNEE]

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

### 🟢 Task 4.2 — Insurance Claim Stepper Modal [INTERNEE]

**File:** `src/components/insurance/ClaimDetailModal.tsx`

Build a 7-step visual progress indicator:
```
Filed → Under Review → Investigation → Assessment → Decision → Payment → Closed
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

### 🟢 Task 4.3 — Activity Logs Visual Timeline [INTERNEE]

**File:** `src/pages/ActivityLogsPage.tsx`

1. Add a toggle at the top: **List View | Timeline View**.
2. In Timeline View, render a vertical grey line on the left side.
   Each log is a node with a severity-colored dot:
   - 🔴 Red = Critical
   - 🟠 Orange = High
   - 🟡 Yellow = Medium
   - 🟢 Green = Normal/Info
3. Each node shows: timestamp, actor name, action description.
   Click to expand and show full metadata.
4. Role-aware filters:
   - Technician: batch and spoilage logs only
   - Manager: all grain-related logs
   - Admin: everything for their tenant
   - Super Admin: all tenants + tenant selector dropdown at top

---

### 🟢 Task 4.4 — Alert Management Center [INTERNEE]

**File:** `src/pages/AlertsPage.tsx`

**Top row:** 4 KPI Cards (clickable to filter):
```
[🔴 CRITICAL: 3]  [🟠 HIGH: 7]  [🟡 MEDIUM: 12]  [🔵 LOW: 4]
```

**Alert feed** — each card shows:
- Colored left border (red/orange/yellow/blue)
- Priority badge
- Source icon (🌡️ sensor | 🤖 AI | 🛡️ insurance | 📦 batch | 💰 payment | 🔑 subscription | ⚙️ system)
- Title and message
- Time since triggered (e.g., `3 minutes ago`)
- Quick action buttons:
  - Active → `Acknowledge` button
  - Acknowledged → `Mark Resolved` button

**Side panel** (opens on alert click):
- Full alert details and the trigger condition
- Action history (who acknowledged, when, who resolved)
- Escalation chain (if escalated)
- Linked entity with a click-to-navigate link (e.g., `View Batch WB-001-2026`)

---

### 🟢 Task 4.5 — Sidebar Live Badge Counts [INTERNEE]

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

### 🟢 Task 5.1 — "Mark Outcome" Validation Button [INTERNEE]

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
      ✅ Sold Safe
    </Button>
    <Button className="bg-red-600" onClick={() => markOutcome('spoiled')}>
      ❌ Found Spoiled
    </Button>
  </div>
</div>
```

Writes to `validation_status` column in `grain_batches`. Builds real ground-truth training data.

---

### 🟢 Task 5.2 — Implement TimeSeriesSplit [INTERNEE]

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

### 🟢 Task 5.3 — Build Sliding Window Dataset Generator [INTERNEE]

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

## FINAL MASTER CHECKLISTS

### 🔴 OWNER Checklist

- [ ] **0.3** Set up EMQX Serverless (Mumbai). Add credentials to firmware. Confirm live data in MQTTX.
- [ ] **0.4** Test OTA flashing locally via Python HTTP server. Confirm ESP32 flashes itself.
- [ ] **1.1** Create private `firmware-updates` bucket in Supabase with correct policies.
- [ ] **1.2** Add 3 GitHub Secrets: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_API_KEY`.
- [ ] **2.1** Run `upload_initial_models.py` — push all 5 ONNX models to Supabase Storage.
- [ ] **2.2** Deploy ML service to Render (Docker). Confirm Swagger UI is live. Add URL to frontend env.
- [ ] **PILOT** Flash ESP32 boards. Install at flour mill. Confirm live data in dashboard.

### 🟢 INTERNEE Checklist

- [x] **0.1** WiFiManager integrated into firmware. ~~DONE~~.
- [ ] **0.2** Verify `computePestMoldRisk()` output in Serial Monitor. Confirm `pest_presence` is in MQTT payload.
- [ ] **1.3** Run `git rm --cached` on `.onnx`/`.pkl` files. Add to `.gitignore`. Push.
- [ ] **2.3A** Enable pgvector in Supabase SQL Editor. Create `research_embeddings` table + ivfflat index.
- [ ] **2.3B** Write `scripts/source_papers.py` (Semantic Scholar + Gemini embedding pipeline).
- [ ] **2.3C** Create `.github/workflows/rag-update.yml` for weekly auto-refresh.
- [ ] **2.3D** Run `source_papers.py` manually once. Verify 50+ rows in Supabase.
- [ ] **3.1** Expand `ActivityLog.js` enums. Add helper methods to `loggingService.js`.
- [ ] **3.2** Create `services/alertEngine.js` with full trigger table + scheduled cron checks.
- [ ] **3.3** Add 9 missing insurance endpoints + 3 missing alert endpoints to backend routes.
- [ ] **4.1** Install Shadcn UI components via CLI.
- [ ] **4.2** Build Insurance Claim Stepper modal (7 steps, role-aware action panels).
- [ ] **4.3** Build Activity Logs vertical timeline (severity colors, role-aware filters).
- [ ] **4.4** Build Alert Management Center (KPI cards, alert feed, side-panel detail).
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
| WiFiManager | tzapu | 2.0.17+ | **NEW** — Required for Task 0.1 |
| ArduinoHttpClient | Arduino | 0.6.1 | |
| Adafruit BME680 Library | Adafruit | 2.0.5 | Update available (2.0.6) |
| Adafruit BusIO | Adafruit | 1.17.4 | |
| Adafruit GFX Library | Adafruit | 1.12.4 | Update available (1.12.6) |
| Adafruit SSD1306 | Adafruit | 2.5.16 | Update available (2.5.17) |
| Adafruit Unified Sensor | Adafruit | 1.1.15 | |
| ArduinoJson | Benoit Blanchon | 6.21.5 | Update available (7.4.3 — check breaking changes) |
| DHT sensor library | Adafruit | 1.4.6 | Update available (1.4.7) |
| ESP32Servo | Kevin Harrington | 3.0.9 | Update available (3.2.1) |
| PubSubClient | Nick O'Leary | 2.8 | |
