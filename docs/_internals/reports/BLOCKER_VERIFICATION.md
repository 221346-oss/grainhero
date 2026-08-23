# Critical Blocker Verification — Exact Code Comparison

**Date**: 2026-07-09  
**Method**: Direct source code extraction and comparison

---

## Blocker #1: Humidity Alert Threshold

### Claim

"GH2 has incorrect humidity threshold of 14.5% instead of 65%"

### GH1 Code (Exact)

**File**: `services/realTimeDataService.js` lines 254-296

```javascript
async checkThresholdViolations(reading) {
    try {
        const violations = [];
        const sensorTypes = ['temperature', 'humidity', 'voc', 'moisture'];

        // Get sensor device to check thresholds
        const sensorDevice = await require('../models/SensorDevice').findById(reading.device_id);
        if (!sensorDevice || !sensorDevice.thresholds) {
            return violations;
        }

        for (const type of sensorTypes) {
            const value = reading[type]?.value;
            const threshold = sensorDevice.thresholds[type];

            if (value !== undefined && threshold) {
                if (threshold.critical_min !== undefined && value < threshold.critical_min) {
                    violations.push({
                        sensor_type: type,
                        threshold_type: 'critical_min',
                        threshold_value: threshold.critical_min,
                        actual_value: value,
                        severity: 'critical'
                    });
                } else if (threshold.critical_max !== undefined && value > threshold.critical_max) {
                    violations.push({
                        sensor_type: type,
                        threshold_type: 'critical_max',
                        threshold_value: threshold.critical_max,
                        actual_value: value,
                        severity: 'critical'
                    });
                }
                // ... continues with min/max checks
            }
        }
        return violations;
    }
}
```

**Key Point**: GH1 reads thresholds **dynamically from SensorDevice.thresholds** object in database.

### GH2 Code (Exact)

**File**: `src/routes/api/public/cron/sync-firebase.ts` lines 241-260

```typescript
// 2. Threshold Alerts (GH1 Parity)
if (dev.silo_id && (temp != null || hum != null)) {
  const alertsToCreate = [];
  if (temp != null && temp > 35) {
    alertsToCreate.push({
      alert_id: `TEMP-${Date.now()}`,
      silo_id: dev.silo_id,
      warehouse_id: dev.warehouse_id,
      batch_id: batchId,
      title: "High Temperature Warning",
      message: `Temperature reached ${temp.toFixed(1)}°C`,
      priority: "high",
      status: "pending",
      triggered_at: now.toISOString(),
    });
  }
  if (hum != null && hum > 14.5) {
    alertsToCreate.push({
      alert_id: `HUM-${Date.now()}`,
      silo_id: dev.silo_id,
      warehouse_id: dev.warehouse_id,
      batch_id: batchId,
      title: "High Humidity Warning",
      message: `Humidity reached ${hum.toFixed(1)}%`,
      priority: "medium",
      status: "pending",
      triggered_at: now.toISOString(),
    });
  }
```

**Key Point**: GH2 uses **hardcoded threshold of 14.5%**.

### Behavioral Difference

**GH1 Behavior**:

- Reads thresholds from `sensorDevice.thresholds.humidity` object
- Threshold values are **configurable per device** in database
- Example defaults found in code: `{ max: 65, critical_max: 75 }` (from routes/sensors.js line 1173)

**GH2 Behavior**:

- Hardcoded threshold: `hum > 14.5`
- Not configurable
- **This is GRAIN MOISTURE, not HUMIDITY**

### Root Cause Analysis

Looking at the surrounding GH2 code (line 72-75):

```typescript
let moist = g("moisture");
if (moist === null && soilMoisture !== null) {
  moist = Math.round((25 - (soilMoisture / 100) * 17) * 10) / 10;
}
```

**The variable `hum` in GH2 is actually humidity (RH%), not moisture content.**

Normal grain storage:

- **Humidity (RH%)**: Should be < 65-70% (air humidity)
- **Moisture content (MC%)**: Should be 12-15% (grain water content)

The value 14.5 is a valid moisture content threshold, but it's being compared against **humidity (RH%)** which is typically 50-80% in storage.

### Verdict

**❌ THIS IS A REGRESSION (Copy-Paste Error)**

The developer copied a moisture threshold (14.5%) and applied it to humidity checking. This will trigger false alerts on **every single reading** since normal humidity is 50-80%.

### Minimal Fix

**Option 1: Match GH1 Static Defaults**

```typescript
// Change line 253 from:
if (hum != null && hum > 14.5) {

// To:
if (hum != null && hum > 70) {  // Critical threshold from GH1 defaults
```

**Option 2: Remove Hardcoded Thresholds (Proper Solution)**

```typescript
// Query sensor device thresholds from database
const { data: deviceConfig } = await supabaseAdmin
  .from("sensor_devices")
  .select("thresholds")
  .eq("id", dev.id)
  .single();

if (deviceConfig?.thresholds?.humidity?.critical_max && hum != null) {
  if (hum > deviceConfig.thresholds.humidity.critical_max) {
    alertsToCreate.push({
      /* ... */
    });
  }
}
```

**Recommendation**: Use Option 1 immediately (1-line fix), then implement Option 2 in Phase 2.

---

## Blocker #2: Realtime Dashboard Updates

### Claim

"GH2 lacks WebSocket/realtime updates, dashboard shows 5-10 min old data"

### GH1 Code (Exact)

**File**: `services/firebaseRealtimeService.js` line 461

```javascript
// Inside handleLatest() function, after processing sensor reading:
io.emit("sensor_reading", {
  type: "sensor_reading",
  data: liveData,
  timestamp: new Date(),
});
```

**File**: `services/realTimeDataService.js` line 507

```javascript
broadcastSensorReading(reading) {
    const message = {
        type: 'sensor_reading',
        data: reading,
        timestamp: new Date()
    };

    this.connectedClients.forEach((client, clientId) => {
        if (client.subscribedSilos.has(reading.silo_id.toString()) ||
            client.subscribedSensors.has(reading.device_id.toString())) {
            try {
                client.socket.emit('sensor_reading', message);
            } catch (error) {
                console.error(`Broadcast to client ${clientId} error:`, error);
                this.removeClient(clientId);
            }
        }
    });
}
```

**Key Point**: GH1 uses **Socket.IO** to push sensor readings to connected clients **immediately** when Firebase listener triggers.
