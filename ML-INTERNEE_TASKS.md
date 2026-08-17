# ML-INTERNEE Tasks

### ✅ Task 1.3 — Clean Git: Remove ML Models from Tracking [ML-INTERNEE]

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


</details>



### 🟢 Task 2.3E — Create Research Intelligence Table [ML-INTERNEE]

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



### 🟢 Task 2.3F — Write Research Intel Scraper (`research_intel_scraper.py`) [ML-INTERNEE]

**What this does:** A Python script that hits the APIs for arxiv, Semantic Scholar, and HuggingFace, looking for keywords like "grain storage IoT", "edge AI time-series", "ONNX microcontroller", etc. It uses Gemini to create embeddings and pushes them to the `research_intelligence` table.



### 🟢 Task 2.3G — Automate Research Intel via GitHub Actions [ML-INTERNEE]

**What this does:** Updates `.github/workflows/rag-update.yml` to run `research_intel_scraper.py` automatically every Monday at 8:00 AM PKT. Zero maintenance required.




### ✅ Task 2.4 — Trend History Injection Middleware [ML-INTERNEE]

**Why this is the highest-priority task after Render deploy:** The existing `_spoilage_trend()` function accepts history arrays, but the firmware only sends the current reading — so trend analysis has been blind since day one. This task fixes that automatically: the ML service queries Supabase for the last 24 readings on every prediction call. **Zero firmware changes. Zero model changes.**

**Time estimate:** 2–3 hours.

**File: `ml-deploy/app.py`**

#### Step 1: Add `silo_id` to `PredictionRequest` (around line 256)

```python
silo_id: Optional[str] = Field(None, description="Silo ID — auto-fetches last 24 sensor readings from Supabase for trend analysis")
```

#### Step 2: Add the history-fetch helper (add after `_fetch_rainfall()`, around line 407)

```python
async def _fetch_sensor_history(silo_id: str, limit: int = 24) -> dict:
    """
    Fetch the last `limit` sensor readings for a silo from Supabase.
    Returns arrays ordered oldest → newest, ready for trend analysis.
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
        rows = sorted(resp.data, key=lambda x: x["recorded_at"])  # oldest → newest
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

**✅ Task 2.4 Complete when:** A `/predict` request with only `silo_id` (no history arrays) returns `spoilage_trend` with non-trivial trend values reflecting the last 24 Supabase readings.



### ✅ Task 2.5 — Upgrade Spoilage Trend Engine: Rate + Projection [ML-INTERNEE]

**Why:** The current `_spoilage_trend()` only says *direction* (rising/stable/falling). This upgrade adds:
- `rate_per_hour` — how fast each sensor is changing
- `projected_hours_to_danger` — estimated time until the safe threshold is crossed
- Grain-specific danger thresholds (not hardcoded universals)
- A lightweight `/trend` endpoint for fast 5-minute polling without ONNX inference

This is what makes the dashboard say: *"Danger in ~8 hours. Intervene now."* — the core of our predictive mandate.

**Time estimate:** 3–4 hours.

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

#### Step 2: Replace `_spoilage_trend()` entirely (lines 162–187 in current app.py)

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
        msg = f"🚨 {bads} sensors rising fast. Danger in ~{min_hours}h. START AERATION NOW."
    elif bads >= 2:
        urgency = "WORSENING"
        msg = f"⚠️ {bads} sensors rising. Danger in ~{min_hours}h. Prepare intervention."
    elif bads == 1:
        urgency = "CAUTION"
        msg = "📈 One sensor rising. Monitor closely. Check aeration."
    else:
        urgency = "STABLE"
        msg = "✅ All conditions stable."

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
    grain_type=req.grain_type,  # ← ADD THIS
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


@app.post("/trend", summary="Trend-only analysis — no ONNX inference (< 5ms, call every 5 min)")
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
  "action_message": "⚠️ 2 sensors rising. Danger in ~0.2h. Prepare intervention.",
  "temperature_analysis": { "rate_per_hour": 0.64, "projected_hours_to_danger": 0.3 },
  "humidity_analysis":    { "rate_per_hour": 1.0,  "projected_hours_to_danger": 0.0 }
}
```

**✅ Task 2.5 Complete when:** `/trend` returns `rate_per_hour` and `projected_hours_to_danger` per sensor. The `/predict` response also carries the richer trend data with `urgency` and `action_message`.



### 🟢 Task 2.3 — Build the RAG Pipeline [ML-INTERNEE]

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



### ✅ Task 3.1 — Expand ActivityLog Enums & LoggingService [ML-INTERNEE]

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



### ✅ Task 3.2 — Build the AlertEngine Service [ML-INTERNEE]

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



### ✅ Task 3.2.5 — Trend-Based Alert Triggers in AlertEngine [ML-INTERNEE]

**Why:** AlertEngine (Task 3.2) fires on events like "spoilage detected" or "sensor offline". This task adds an entirely new category: **trajectory-based pre-spoilage alerts** that fire when conditions are *heading toward* danger — not when they arrive. This is what makes GrainHero proactive, not reactive.

**Dependency:** Complete Task 2.5 first. This task consumes the `urgency` and `earliest_danger_in_hours` fields from the upgraded `_spoilage_trend()` output.

**Time estimate:** 2–3 hours.

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
      title:                '🚨 Spoilage Trend: Critical — Immediate Action Required',
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
      title:     '⚠️ Spoilage Trend: Worsening — Prepare Intervention',
      message:   action_message,
      metadata:  { urgency, earliest_danger_in_hours, trend: trendResult },
    });

  } else if (urgency === 'CAUTION') {
    // Suppress duplicate caution alerts — max 1 per 4 hours per silo
    const recent = await AlertEngine.findRecentTrendAlert(siloId, 240);
    if (!recent) {
      await AlertEngine.createAlert({
        silo_id:   siloId,
        tenant_id: tenantId,
        type:      'spoilage_trend',
        priority:  'medium',
        title:     '📈 Spoilage Trend: Caution — Monitor Closely',
        message:   action_message,
        metadata:  { urgency, trend: trendResult },
      });
    }
  }
  // STABLE → no alert
}

/** Deduplication helper — find an unresolved trend alert within N minutes. */
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

// Proactive trend evaluation — fires alert BEFORE spoilage
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
| Spoilage trend CRITICAL (danger ≤ 6h) | 🔴 Critical + auto-aeration | Admin, Manager, Technician |
| Spoilage trend WORSENING (2+ sensors rising) | 🟠 High | Admin, Manager |
| Spoilage trend CAUTION (1 sensor rising) | 🟡 Medium (deduplicated, max 1/4hr/silo) | Manager, Technician |

#### Step 4: Verify

1. Call `POST /predict` with rising history arrays and a known `silo_id`.
2. Check `GrainAlert` collection in MongoDB.
3. A document with `type: 'spoilage_trend'` and `priority: 'high'` or `'critical'` must appear.

**✅ Task 3.2.5 Complete when:** A test prediction with rising temperature + humidity history automatically creates a `GrainAlert` of type `spoilage_trend` in the database, with no manual intervention.



### ✅ Task 3.3 — Add Missing API Endpoints [ML-INTERNEE]

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



### 🟢 Task 4.1 — Install Shadcn UI Components [ML-INTERNEE]

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



### 🟢 Task 4.2 — Insurance Claim Stepper Modal [ML-INTERNEE]

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



### 🟢 Task 4.3 — Activity Logs Visual Timeline [ML-INTERNEE]

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

                                                                                                

### 🟢 Task 4.4 — Alert Management Center [ML-INTERNEE]

**File:** `src/pages/AlertsPage.tsx`                                                                               

**Top row:** 4 KPI Cards (clickable to filter):
```
[🔴 CRITICAL: 3]  [🟠 HIGH: 7]  [🟡 MEDIUM: 12]  [🔵 LOW: 4]
```

**Alert feed** — each card shows:
- Colored left border (red/orange/yellow/blue)
- Priority badge
- Source icon (🌡️ sensor | 🤖 AI | 📈 trend | 🛡️ insurance | 📦 batch | 💰 payment | 🔑 subscription | ⚙️ system)
- Title and message
- Time since triggered (e.g., `3 minutes ago`)
- Quick action buttons:
  - Active → `Acknowledge` button
  - Acknowledged → `Mark Resolved` button

**Trend Alert Card (special design — type: `spoilage_trend`):**
Trend alerts are visually distinct because they predict future risk, not current state.
- Left border: animated orange→red gradient (pulsing when CRITICAL)
- **Urgency badge**: `CRITICAL` / `WORSENING` / `CAUTION` with color fill
- **Danger countdown chip**: `⏱️ ~8h to threshold` — shown prominently below the title
- **Per-sensor sparkline row**: three mini trend arrows (↑ ↓ →) with rate label:
  e.g., `🌡️ +0.6°C/hr  💧 +1.2%/hr  🌾 +0.1%/hr`
- **Action button for CRITICAL**: `⚡ Start Aeration Now` (calls actuator endpoint directly)
- **Action button for WORSENING**: `👁️ Monitor` (opens side panel, no auto-action)

**Side panel** (opens on alert click):
- Full alert details and the trigger condition
- Action history (who acknowledged, when, who resolved)
- Escalation chain (if escalated)
- Linked entity with a click-to-navigate link (e.g., `View Batch WB-001-2026`)
- **For trend alerts:** Per-sensor breakdown table showing `current_value`, `rate_per_hour`, `projected_hours_to_danger`



### 🟢 Task 4.5 — Sidebar Live Badge Counts [ML-INTERNEE]

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



### 🟢 Task 5.1 — "Mark Outcome" Validation Button [ML-INTERNEE]

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



### 🟢 Task 5.2 — Implement TimeSeriesSplit [ML-INTERNEE]

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



### 🟢 Task 5.3 — Build Sliding Window Dataset Generator [ML-INTERNEE]

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



### 🟢 Task 8.1 — Train Mamba Sequence Model [ML-INTERNEE]
**What this does:** After 3+ months of real data is collected, write `scripts/train_mamba.py` to train a Mamba architecture on the sliding window dataset. Export it to ONNX format.



### 🟢 Task 8.2 — A/B Test Mamba vs XGBoost [ML-INTERNEE]
**What this does:** Upload the `mamba_v1.onnx` to Supabase Storage. Render hot-swaps it in. Monitor the early warning rate and false positive rate for 2 weeks compared to the XGBoost baseline. If Mamba wins, it becomes the permanent default.


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
- [ ] **2.4** Add `silo_id` to `PredictionRequest`. Write `_fetch_sensor_history()`. Enrich `/predict` endpoint to auto-pull last 24 Supabase readings. Verify `spoilage_trend` shows real historical context.
- [ ] **2.5** Add `DANGER_THRESHOLDS` dict + `_analyze_sensor_trend()`. Replace `_spoilage_trend()` with rate+projection version. Update `_run_inference` to pass `grain_type`. Add `/trend` endpoint. Test with rising-sensor JSON fixture in Swagger `/docs`.
- [ ] **3.1** Expand `ActivityLog.js` enums. Add helper methods to `loggingService.js`.
- [ ] **3.2** Create `services/alertEngine.js` with full trigger table + scheduled cron checks.
- [ ] **3.2.5** Add `evaluateTrend()` + `findRecentTrendAlert()` to `alertEngine.js`. Wire into ML prediction pipeline call. Add 3 trend trigger rows to trigger table. Verify `GrainAlert` with `type: 'spoilage_trend'` is created on rising-trend test.
- [ ] **3.3** Add 9 missing insurance endpoints + 3 missing alert endpoints to backend routes.
- [ ] **4.1** Install Shadcn UI components via CLI.
- [ ] **4.2** Build Insurance Claim Stepper modal (7 steps, role-aware action panels).
- [ ] **4.3** Build Activity Logs vertical timeline (severity colors, role-aware filters).
- [ ] **4.4** Build Alert Management Center: KPI cards, alert feed, side-panel detail. Include 📈 trend source icon. Implement Trend Alert Card with urgency badge, danger countdown chip, per-sensor sparkline row (`🌡️ +0.6°C/hr`), and ⚡ aeration quick-action button for CRITICAL trend alerts.
- [ ] **4.5** Add live badge counts to sidebar nav. Add 3 count endpoints to backend.
- [x] **5.1** Add Mark Outcome buttons to Grain Batch Detail page.
- [x] **5.2** Replace random split with `TimeSeriesSplit` in `fast_retrain.py`.
- [x] **5.3** Write `scripts/generate_sliding_window.py` dataset prep script.



