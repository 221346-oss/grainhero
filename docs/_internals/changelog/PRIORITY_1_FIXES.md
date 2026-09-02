# Priority 1 Fixes — Quick Wins (1 Day Work)

These are the **absolutely critical** one-line or minimal changes needed before any production cutover.

---

## Fix 1: Humidity Alert Threshold ⚠️ CRITICAL BUG

**File**: `grainhero 2/src/routes/api/public/cron/sync-firebase.ts`  
**Line**: 253

### Current (WRONG):

```typescript
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

### Fixed (CORRECT):

```typescript
if (hum != null && hum > 65) {
  // Changed from 14.5 to 65
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

**Why**: Normal grain moisture is 12-15%. A threshold of 14.5% creates false alerts on every reading.

**Test**:

1. Deploy fix to staging
2. Wait for 1 cron cycle
3. Verify NO alerts generated for humidity values 12-65%
4. Manually set humidity to 70% in Firebase → verify alert IS generated

---

## Fix 2: LDR Alert Throttling

**File**: `grainhero 2/src/routes/api/public/cron/sync-firebase.ts`  
**Lines**: 260-275

### Current (NO THROTTLE):

```typescript
if (fanState === 0 && servoState === 0 && ambientLight != null && ambientLight > 5) {
  alertsToCreate.push({
    alert_id: `LEAK-${Date.now()}`,
    silo_id: dev.silo_id,
    warehouse_id: dev.warehouse_id,
    batch_id: batchId,
    title: "⚠️ Silo Light Leakage Detected",
    message: `LDR sensor detected ${ambientLight.toFixed(1)}% light...`,
    priority: ambientLight > 30 ? "critical" : "high",
    status: "pending",
    triggered_at: now.toISOString(),
  });
}
```

### Fixed (WITH THROTTLE):

```typescript
// Check for recent LDR alerts (within 30 minutes)
const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
const { data: recentLDRAlert } = await supabaseAdmin
  .from("grain_alerts")
  .select("id")
  .eq("silo_id", dev.silo_id)
  .ilike("title", "%Light Leakage%")
  .gte("triggered_at", thirtyMinutesAgo)
  .limit(1);

if (!recentLDRAlert || recentLDRAlert.length === 0) {
  if (fanState === 0 && servoState === 0 && ambientLight != null && ambientLight > 5) {
    alertsToCreate.push({
      alert_id: `LEAK-${Date.now()}`,
      silo_id: dev.silo_id,
      warehouse_id: dev.warehouse_id,
      batch_id: batchId,
      title: "⚠️ Silo Light Leakage Detected",
      message: `LDR sensor detected ${ambientLight.toFixed(1)}% light...`,
      priority: ambientLight > 30 ? "critical" : "high",
      status: "pending",
      triggered_at: now.toISOString(),
    });
  }
}
```

**Why**: Without throttle, cron creates a new alert every 5-10 minutes during an actual breach.

**Test**:

1. Simulate breach: Set `ambientLight=10`, `fanState=0`, `servoState=0`
2. Wait for 1st alert
3. Wait 10 more minutes (should NOT create 2nd alert)
4. Wait 30 minutes (should create 2nd alert)

---

## Fix 3: Duplicate Sensor Reading Prevention

**File**: `grainhero 2/supabase/migrations/`  
**Create New Migration**: `YYYYMMDDHHMMSS_add_sensor_reading_unique_constraint.sql`

### Migration SQL:

```sql
-- Prevent duplicate sensor readings if cron runs twice
CREATE UNIQUE INDEX IF NOT EXISTS sensor_readings_device_timestamp_unique
ON sensor_readings (device_id, reading_timestamp);

-- Add constraint name for easier management
ALTER TABLE sensor_readings
ADD CONSTRAINT sensor_readings_no_duplicates
UNIQUE USING INDEX sensor_readings_device_timestamp_unique;
```

### Update Insert Logic:

**File**: `sync-firebase.ts` line 186

**Current**:

```typescript
const { error } = await supabaseAdmin.from("sensor_readings").insert({
  device_id: dev.id,
  admin_id: dev.admin_id,
  // ... other fields
  reading_timestamp: readingTime,
});
```

**Fixed (with upsert)**:

```typescript
const { error } = await supabaseAdmin.from("sensor_readings").upsert(
  {
    device_id: dev.id,
    admin_id: dev.admin_id,
    // ... other fields
    reading_timestamp: readingTime,
  },
  {
    onConflict: "device_id,reading_timestamp",
    ignoreDuplicates: true, // Skip if already exists
  },
);
```

**Why**: If cron is triggered manually or runs twice due to scheduler bug, prevents duplicate rows.

**Test**:

1. Insert a reading with `device_id=1, timestamp='2026-07-09T10:00:00Z'`
2. Try inserting the exact same reading again
3. Verify: Only 1 row exists, no error thrown

---

## Fix 4: Robust Error Handling

**File**: `grainhero 2/src/routes/api/public/cron/sync-firebase.ts`  
**Lines**: 230-290

### Current (BRITTLE):

```typescript
// Silo update (no error handling)
if (dev.silo_id) {
  await supabaseAdmin
    .from("silos")
    .update({
      current_temperature: temp,
      current_humidity: hum,
      current_moisture: moist,
    })
    .eq("id", dev.silo_id);
}

// Alert creation (no error handling)
if (alertsToCreate.length > 0) {
  await supabaseAdmin.from("grain_alerts").insert(alertsToCreate);
}

// Actuator sync (no error handling)
if (dev.silo_id) {
  await supabaseAdmin
    .from("actuators")
    .update({ is_on: !!fanOn, power_level: pwm })
    .eq("silo_id", dev.silo_id)
    .eq("actuator_type", "fan");
}
```

### Fixed (ROBUST):

```typescript
// Silo update (with error handling)
if (dev.silo_id) {
  try {
    await supabaseAdmin
      .from("silos")
      .update({
        current_temperature: temp,
        current_humidity: hum,
        current_moisture: moist,
      })
      .eq("id", dev.silo_id);
  } catch (siloErr) {
    console.error(`Silo update failed for ${dev.silo_id}:`, siloErr);
    // Continue processing other devices
  }
}

// Alert creation (with error handling)
if (alertsToCreate.length > 0) {
  try {
    await supabaseAdmin.from("grain_alerts").insert(alertsToCreate);
  } catch (alertErr) {
    console.error(`Alert creation failed for device ${dev.id}:`, alertErr);
    // Continue processing
  }
}

// Actuator sync (with error handling)
if (dev.silo_id) {
  try {
    const { error: actuatorErr } = await supabaseAdmin
      .from("actuators")
      .update({ is_on: !!fanOn, power_level: pwm })
      .eq("silo_id", dev.silo_id)
      .eq("actuator_type", "fan");

    if (actuatorErr) {
      console.warn(`Actuator sync warning for silo ${dev.silo_id}:`, actuatorErr);
    }
  } catch (err) {
    console.error(`Actuator sync error for silo ${dev.silo_id}:`, err);
  }
}
```

**Why**: Current code breaks the entire sync loop if any Supabase write fails. This isolates errors per device.

**Test**:

1. Temporarily break permissions on `silos` table
2. Run cron sync
3. Verify: Other devices still sync successfully
4. Check logs: Error logged but sync continues

---

## Testing Checklist

After implementing all 4 fixes:

### Smoke Tests (30 minutes)

- [ ] Deploy to staging environment
- [ ] Trigger manual cron execution
- [ ] Verify no false humidity alerts (humidity 12-15% should be silent)
- [ ] Check Supabase: No duplicate sensor_readings rows
- [ ] Check logs: Errors logged but sync completes

### Integration Tests (1 hour)

- [ ] Simulate 3 devices with readings
- [ ] Set device 1: humidity=70% (should alert)
- [ ] Set device 2: humidity=15% (should NOT alert)
- [ ] Set device 3: light=10%, fan=off, lid=closed (should alert once per 30min)
- [ ] Run cron twice in quick succession (should not duplicate)
- [ ] Break `silos` table permissions → verify device 2 & 3 still sync

### Load Test (optional, 1 hour)

- [ ] Simulate 50 devices
- [ ] Run cron sync
- [ ] Verify all 50 synced within 30 seconds
- [ ] Check CPU/memory usage on server

---

## Deployment Steps

### 1. Database Migration

```bash
cd grainhero\ 2/supabase/migrations
# Create new migration file
cat > 20260709120000_fix_sensor_duplicates.sql << 'EOF'
CREATE UNIQUE INDEX IF NOT EXISTS sensor_readings_device_timestamp_unique
ON sensor_readings (device_id, reading_timestamp);

ALTER TABLE sensor_readings
ADD CONSTRAINT sensor_readings_no_duplicates
UNIQUE USING INDEX sensor_readings_device_timestamp_unique;
EOF

# Apply migration
supabase db push
```

### 2. Code Changes

```bash
# Open the sync file
code src/routes/api/public/cron/sync-firebase.ts

# Make changes:
# - Line 253: Change 14.5 → 65
# - Line 260: Add LDR throttle check
# - Line 186: Change insert() → upsert()
# - Lines 230-290: Wrap in try-catch blocks

# Commit changes
git add .
git commit -m "fix: Critical IoT pipeline bugs (humidity threshold, throttling, duplicates, error handling)"
```

### 3. Staging Deploy

```bash
# Deploy to staging
npm run deploy:staging

# Wait 10 minutes for first cron cycle
# Check logs
npm run logs:staging -- --filter="sync-firebase"
```

### 4. Production Deploy (only after testing passes)

```bash
# Tag release
git tag v2.1.0-iot-fixes
git push --tags

# Deploy to production
npm run deploy:production

# Monitor for 24 hours before declaring success
```

---

## Rollback Plan

If any issues arise in production:

```bash
# Immediate rollback
npm run deploy:production -- --rollback

# Database rollback (if needed)
cd supabase/migrations
supabase db reset --version <previous_version>
```

**Rollback Criteria**:

- More than 10 false alerts in first hour
- Duplicate readings appearing
- Sync loop crashes

---

## Success Criteria

After 24 hours in production:

- [ ] Zero false humidity alerts (for readings 12-65%)
- [ ] Zero duplicate sensor_readings rows
- [ ] LDR alerts max 1 per 30 minutes per silo
- [ ] All devices syncing successfully (check `sensor_devices.last_ping_at`)
- [ ] No sync loop crashes in logs

**If all criteria met**: Proceed to Priority 2 fixes (Realtime + Buffering)
