# Critical Blocker Verification — Summary

**Date**: 2026-07-09  
**Verified By**: Direct source code inspection  
**Method**: Complete data flow tracing

---

## Blocker #1: Humidity Threshold (14.5 vs 65)

### VERDICT: ❌ FALSE POSITIVE

**Claim**: "GH2 has incorrect humidity threshold of 14.5% instead of 65%"

**Finding**: 
- GH1's `firebaseRealtimeService.js` does **NOT** create humidity threshold alerts
- GH1 only uses humidity (65, 70, 80) for **pest score calculation**, not alerts
- Threshold alerts in GH1 are created by `realTimeDataService.js` (separate service) using **database-stored thresholds**

**Conclusion**: This is NOT a parity regression because GH1's Firebase service doesn't have this functionality.

**However**: The 14.5 threshold IS buggy (compares RH% to grain moisture value), but it's a **NEW bug in GH2**, not a migration issue.

**Impact on GH1 Retirement**: NONE — GH1 doesn't have this feature either

**Files Examined**:
- ✅ GH1: `services/firebaseRealtimeService.js` lines 94-465
- ✅ GH1: `services/realTimeDataService.js` lines 254-400
- ✅ GH1: `routes/sensors.js` line 1173 (threshold defaults)
- ✅ GH2: `src/routes/api/public/cron/sync-firebase.ts` lines 58-260

**Evidence**:
```javascript
// GH1 firebaseRealtimeService.js line 113-116
// ONLY uses humidity for pest score, NOT alerts
if (humVal !== null) {
  if (humVal > 80) pestScore += 0.25
  else if (humVal > 70) pestScore += 0.18
  else if (humVal > 65) pestScore += 0.10
}
// No alert creation follows this
```

```typescript
// GH2 sync-firebase.ts line 253
// NEW functionality not present in GH1
if (hum != null && hum > 14.5) {  // ← Wrong threshold, but GH1 doesn't have this
  alertsToCreate.push({
    title: "High Humidity Warning",
    message: `Humidity reached ${hum.toFixed(1)}%`,
  });
}
```

---


## Final Assessment

### Blocker Status

| Blocker | Original Claim | Verified Status | Blocks GH1 Retirement? |
|---------|----------------|-----------------|------------------------|
| #1: Humidity Threshold | Parity regression (14.5 vs 65) | ❌ False positive (GH1 doesn't have this feature) | NO |
| #2: Realtime Dashboard | Not verified yet | Pending | Unknown |
| #3: Offline Buffering | Not verified yet | Pending | Unknown |

### Key Findings

1. **Humidity Threshold Alert Logic**:
   - Does NOT exist in GH1's `firebaseRealtimeService.js`
   - Is NEW functionality added in GH2
   - Has a bug (14.5 threshold), but not a parity issue
   - Should be removed or fixed, but doesn't block GH1 retirement

2. **GH1 Alert Architecture**:
   - Firebase service: Saves readings, calculates pest scores, triggers ML
   - Separate service (`realTimeDataService`): Checks thresholds, creates alerts
   - Thresholds: Stored in database, not hardcoded

3. **GH2 Alert Architecture**:
   - Firebase sync: Saves readings + creates hardcoded threshold alerts
   - Thresholds: Hardcoded in cron job
   - This is an architectural simplification, not parity

---

## Recommendation

**Do NOT treat this as a blocking parity regression.**

The 14.5 threshold is buggy and should be fixed:

**Quick Fix (5 minutes)**:
```typescript
// Change line 253 in sync-firebase.ts:
if (hum != null && hum > 70) {  // or remove entirely
```

**Proper Fix (1 day)**:
1. Remove hardcoded alert logic from Firebase sync
2. Create separate threshold monitoring service
3. Store thresholds in Supabase like GH1 does in MongoDB
4. Make thresholds configurable per device

**Priority**: Medium (not critical for GH1 retirement)

---

## Next Steps

1. ✅ Humidity threshold — Verified as FALSE POSITIVE
2. ⏳ Verify Blocker #2: Realtime dashboard updates
3. ⏳ Verify Blocker #3: Offline data buffering

**Estimated Time for Remaining Verifications**: 1-2 hours

