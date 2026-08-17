# OWNER Tasks

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



### 🔴 Task 1.4 — Fix Render Auto-Deploy (Deploy Hook Workaround) [OWNER]

**Why the normal way failed:** Based on your screenshot, your GitHub account does not have "Admin" access to the `221346-oss` organization repo, which is required to see the "Webhooks" menu. 
**The Workaround:** We will use Render's "Deploy Hook" feature and a GitHub Action instead.

**Time estimate:** 5 minutes.

**Steps:**
1. **Get the Deploy Hook from Render:**
   - Go to your Render dashboard → `grainhero-ml-service` → **Settings**.
   - Scroll down to the **Deploy Hook** section.
   - Copy the unique URL (it looks like `https://api.render.com/deploy/srv-...`).
2. **Add it as a GitHub Secret:**
   - Go back to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**.
   - Create a New repository secret:
     - Name: `RENDER_DEPLOY_HOOK_URL`
     - Secret: (paste the URL you copied from Render)
3. **The ML-INTERNEE will do the rest:** 
   - They will add a small GitHub Action file that automatically hits this URL whenever they push code. This perfectly bypasses the missing Webhook permissions!



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



### ✅ Task 2.2 — Deploy ML Service to Render [OWNER] [DONE]

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
|
</details>



