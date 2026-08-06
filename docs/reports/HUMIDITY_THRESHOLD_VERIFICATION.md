# Humidity Threshold Verification Report

**Date**: 2026-07-09  
**Investigation**: GH2 line 253 humidity threshold (14.5 vs 65)  
**Method**: Complete data flow tracing from ESP32 → Firebase → Alert generation

---

## Executive Summary

**VERDICT: B. FALSE POSITIVE — Audit compared different metrics**

The audit incorrectly identified this as a parity regression. **GH1 does NOT create humidity threshold alerts in firebaseRealtimeService.js**. The humidity comparisons found in GH1 are used for:
1. Pest score calculation (lines 113-116)
2. Fan recommendation logic (line 213)
3. CSV spoilage classification (lines 389-390)

**Neither GH1 nor GH2 Firebase ingestion services create humidity threshold alerts.**

---

## Complete Data Flow Analysis

### ESP32 → Firebase RTDB Payload

**Typical ESP32 payload**:
```json
{
  "temperature": 28.5,
  "humidity": 62.3,       ← Relative Humidity (RH%)
  "tvoc_ppb": 245,
  "soil_moisture_pct": 35,
  "timestamp": 1720531200
}
```

**Units**: `humidity` = Relative Humidity in air (%), typically 40-80% in storage

---

### GH1 Data Flow

#### Step 1: Parse Firebase Payload
**File**: `services/firebaseRealtimeService.js` lines 94-99

```javascript
const tempVal = payload.temperature !== undefined ? Number(payload.temperature) : null
const humVal = payload.humidity !== undefined ? Number(payload.humidity) : null
const vocVal = payload.tvoc_ppb !== undefined ? Number(payload.tvoc_ppb)
  : (payload.voc !== undefined ? Number(payload.voc) : null)
```

**Variable**: `humVal` = RH% from air sensor (e.g., 62.3%)

#### Step 2: Calculate Grain Moisture (Separate from Humidity)
**File**: `services/firebaseRealtimeService.js` lines 105-107

```javascript
// Convert soil moisture → grain moisture (soil 100%=dry, 0%=wet → grain 8-25% MC)
const grainMoisturePct = soilMoisturePct !== null
  ? Math.round((25 - (soilMoisturePct / 100) * 17) * 10) / 10 : null
```

**Variable**: `grainMoisturePct` = Grain moisture content % (e.g., 14.2%)


#### Step 3: Use Humidity for Pest Score Calculation (NOT ALERTS)
**File**: `services/firebaseRealtimeService.js` lines 111-132

```javascript
// ─── Step 3: Calculate pest/mold risk score ───
let pestScore = 0.0
if (vocVal !== null) {
  if (vocVal > 1000) pestScore += 0.40
  else if (vocVal > 500) pestScore += 0.30
  else if (vocVal > 250) pestScore += 0.20
  else if (vocVal > 100) pestScore += 0.08
}
if (humVal !== null) {
  if (humVal > 80) pestScore += 0.25      ← RH% > 80
  else if (humVal > 70) pestScore += 0.18  ← RH% > 70
  else if (humVal > 65) pestScore += 0.10  ← RH% > 65
}
if (tempVal !== null) {
  if (tempVal > 35) pestScore += 0.18
  else if (tempVal > 30) pestScore += 0.20
  else if (tempVal > 25) pestScore += 0.12
  else if (tempVal > 20) pestScore += 0.05
}
if (grainMoisturePct !== null) {
  if (grainMoisturePct > 18) pestScore += 0.15  ← Grain MC% > 18
  else if (grainMoisturePct > 15) pestScore += 0.12
  else if (grainMoisturePct > 14) pestScore += 0.08
  else if (grainMoisturePct > 13) pestScore += 0.03
}
```

**Purpose**: Calculate risk factor for ML model input  
**Action**: NO alerts generated here, just scoring

#### Step 4: Save to Database
**File**: `services/firebaseRealtimeService.js` line 247

```javascript
await sensorReading.save()
console.log(`[Firebase] 💾 SensorReading saved to MongoDB (id=${sensorReading._id}, temp=${tempVal}, hum=${humVal}, voc=${vocVal})`)
```

**Database fields**:
- `humidity.value`: 62.3 (RH%)
- `moisture.value`: 14.2 (Grain MC%)
- `derived_metrics.pest_presence_score`: 0.18

#### Step 5: NO THRESHOLD ALERTS IN FIREBASE SERVICE

**CRITICAL FINDING**: `firebaseRealtimeService.js` does **NOT** create humidity threshold alerts.

**Evidence**: Searched entire file for alert creation:
- Line 149: Only creates `leakage_detected` alerts (LDR tampering)
- No code path creates humidity threshold alerts


#### Step 6: Threshold Alerts Created by Different Service

**Threshold checking happens in**: `services/realTimeDataService.js`

**File**: `services/realTimeDataService.js` lines 254-296

```javascript
async checkThresholdViolations(reading) {
    try {
        const violations = [];
        const sensorTypes = ['temperature', 'humidity', 'voc', 'moisture'];

        // Get sensor device to check thresholds
        const sensorDevice = await require('../models/SensorDevice').findById(reading.device_id);
        if (!sensorDevice || !sensorDevice.thresholds) {
            return violations; // ← NO THRESHOLDS = NO ALERTS
        }

        for (const type of sensorTypes) {
            const value = reading[type]?.value;
            const threshold = sensorDevice.thresholds[type];

            if (value !== undefined && threshold) {
                if (threshold.critical_max !== undefined && value > threshold.critical_max) {
                    violations.push({
                        sensor_type: type,
                        threshold_type: 'critical_max',
                        threshold_value: threshold.critical_max,
                        actual_value: value,
                        severity: 'critical'
                    });
                }
                // ... checks min, max, critical_min
            }
        }
        return violations;
    }
}
```

**Key Discovery**: Thresholds are **dynamically loaded from SensorDevice.thresholds object**.

**Trigger Path**: 
1. `firebaseRealtimeService` saves `SensorReading` to MongoDB
2. MongoDB save **does NOT automatically trigger** `realTimeDataService`
3. `realTimeDataService` is triggered separately (likely via API routes or separate listeners)

---

### GH2 Data Flow

#### Step 1: Parse Firebase Payload
**File**: `src/routes/api/public/cron/sync-firebase.ts` lines 58-76

```typescript
const g = (k1: string, k2?: string) => {
  if (typeof live[k1] === "number") return live[k1] as number;
  if (k2 && typeof live[k2] === "number") return live[k2] as number;
  return null;
};

const temp = g("temperature");
const hum = g("humidity");        ← Extracts RH% (e.g., 62.3)
const voc = g("voc", "tvoc_ppb");
const soilMoisture = g("soil_moisture_pct");

let moist = g("moisture");
if (moist === null && soilMoisture !== null) {
  moist = Math.round((25 - (soilMoisture / 100) * 17) * 10) / 10;
}
```

**Variable**: `hum` = RH% from air sensor (same as GH1's `humVal`)


#### Step 2: Create Hardcoded Threshold Alerts
**File**: `src/routes/api/public/cron/sync-firebase.ts` lines 241-260

```typescript
// 2. Threshold Alerts (GH1 Parity)
if (dev.silo_id && (temp != null || hum != null)) {
  const alertsToCreate = [];
  
  if (temp != null && temp > 35) {
    alertsToCreate.push({
      alert_id: `TEMP-${Date.now()}`,
      title: "High Temperature Warning",
      message: `Temperature reached ${temp.toFixed(1)}°C`,
      priority: "high",
    });
  }
  
  if (hum != null && hum > 14.5) {  ← COMPARES RH% TO 14.5
    alertsToCreate.push({
      alert_id: `HUM-${Date.now()}`,
      title: "High Humidity Warning",
      message: `Humidity reached ${hum.toFixed(1)}%`,
      priority: "medium",
    });
  }
}
```

**Comment says**: `// 2. Threshold Alerts (GH1 Parity)`

**Problem**: This is **NOT GH1 parity** because:
1. GH1's `firebaseRealtimeService` does NOT create threshold alerts
2. The threshold 14.5 appears to be copied from grain moisture logic
3. The variable `hum` contains RH% (60-80 range), not grain moisture (12-15 range)

---

## Root Cause Analysis

### Why 14.5 Was Used

Looking at GH1 pest score calculation (lines 124-129):
```javascript
if (grainMoisturePct !== null) {
  if (grainMoisturePct > 18) pestScore += 0.15
  else if (grainMoisturePct > 15) pestScore += 0.12
  else if (grainMoisturePct > 14) pestScore += 0.08   ← 14% threshold
  else if (grainMoisturePct > 13) pestScore += 0.03
}
```

And GH1 CSV classification (line 602):
```javascript
(derived.voc_relative_30min !== undefined && derived.voc_relative_30min > 100 && moisture > 14)
```

**Hypothesis**: The developer saw "14" or "14.5" associated with risk thresholds in GH1, but this was for **grain moisture content**, not **relative humidity**.

### Correct Threshold Values

**From GH1 codebase** (`routes/sensors.js` line 1173):
```javascript
summer: {
    temperature_threshold: { max: 35, critical_max: 40 },
    humidity_threshold: { max: 65, critical_max: 75 },  ← CORRECT RH% thresholds
    ventilation_frequency: 'continuous',
}
```

**Expected humidity alert thresholds**:
- Warning: RH% > 65
- Critical: RH% > 75-80

---


## Comparison Table

| Aspect | GH1 firebaseRealtimeService | GH2 sync-firebase |
|--------|----------------------------|-------------------|
| **Variable Name** | `humVal` | `hum` |
| **Source** | `payload.humidity` | `live.humidity` |
| **Value Range** | 40-80 (RH%) | 40-80 (RH%) |
| **Units** | Relative Humidity % | Relative Humidity % |
| **Usage** | Pest score calculation | Database write + Alerts |
| **Threshold Alerts?** | ❌ NO | ✅ YES (incorrect) |
| **Alert Threshold** | N/A (no alerts) | 14.5 (wrong value) |
| **Correct Threshold** | N/A | Should be 65-75 |

---

## Final Verdict

### B. FALSE POSITIVE — Audit Compared Different Metrics

**The audit claim is INCORRECT for the following reasons**:

1. **GH1 does NOT create humidity threshold alerts** in `firebaseRealtimeService.js`
   - Only creates LDR leakage alerts
   - Threshold checking happens in `realTimeDataService.js` (separate service)
   - Thresholds are read from database, not hardcoded

2. **The "14.5" threshold IS wrong, but for a different reason**:
   - It's comparing RH% (60-80 range) to grain moisture threshold (14-15 range)
   - This is a **copy-paste error**, not a parity regression
   - GH1 never had this hardcoded alert logic

3. **This is NEW functionality in GH2**:
   - GH2 added hardcoded threshold alerts to the Firebase sync cron
   - GH1 kept threshold checking separate in `realTimeDataService`
   - These are architectural differences, not parity issues

### The Real Problem

**GH2 introduced NEW alert logic** (not present in GH1's Firebase service) with an incorrect threshold value. This is:
- ❌ NOT a parity regression (GH1 didn't have this)
- ✅ A NEW bug introduced during GH2 development
- ✅ Threshold value copied from wrong context (grain moisture vs humidity)

### Impact Assessment

**If not fixed**:
- Normal humidity readings (60-70 RH%) will trigger false alerts
- Alert storm: Every cron cycle = new alert per device
- Example: 62.3% humidity → Alert: "High Humidity Warning: Humidity reached 62.3%"

**However**: This is NOT a "parity blocker" because GH1 **also doesn't create these alerts in Firebase service**.

---

## Recommended Action

### Option 1: Remove This Alert Logic (Match GH1 Architecture)
```typescript
// DELETE lines 253-260
// GH1 doesn't create threshold alerts in Firebase service
// Move this logic to a separate threshold monitoring service
```

### Option 2: Fix The Threshold Value
```typescript
// Change line 253:
if (hum != null && hum > 70) {  // Match GH1 defaults: { max: 65, critical_max: 75 }
```

### Option 3: Make It Configurable (Proper Solution)
```typescript
// Query thresholds from database like GH1's realTimeDataService does
const { data: deviceConfig } = await supabaseAdmin
  .from("sensor_devices")
  .select("thresholds")
  .eq("id", dev.id)
  .single();

if (deviceConfig?.thresholds?.humidity?.max && hum > deviceConfig.thresholds.humidity.max) {
  // Create alert
}
```

**Recommendation**: Use Option 1 (remove) or Option 2 (quick fix of 70), then implement proper threshold system later.

---

## Conclusion

**This is NOT a parity regression.** GH1's `firebaseRealtimeService.js` does not create humidity threshold alerts. The audit incorrectly assumed GH1 had this functionality.

However, the 14.5 threshold IS buggy because it compares relative humidity (60-80%) to a grain moisture threshold (14-15%). This bug was introduced in GH2 as new functionality.

**Status**: FALSE POSITIVE (not a parity issue, but still a bug)  
**Severity**: HIGH (will cause alert spam if deployed)  
**Root Cause**: Copy-paste error mixing grain moisture and relative humidity  
**Blocking GH1 Retirement**: NO (GH1 doesn't have this feature either)

