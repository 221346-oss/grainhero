# RLS Policy Fix - Monitoring Incidents

**Date:** 2026-08-07  
**Priority:** P0 - Critical Bug Fix  
**Status:** ✅ Completed

## Problem Sequence

### Issue 1: Invalid Enum Value
**Error:** `invalid input value for enum alert_status: "open"`

**Cause:** The `alert_status` enum was missing values: `open`, `investigating`, `dismissed`

**Solution:** ✅ Applied SQL migration to add missing enum values

### Issue 2: RLS Policy Violation
**Error:** `new row violates row-level security policy for table "grain_alerts"`

**Cause:** The insert was missing the required `admin_id` field

**Solution:** ✅ Added `admin_id: tenantId` to the insert statement

### Issue 3: CHECK Constraint Violation
**Error:** `new row for relation "grain_alerts" violates check constraint "grain_alerts_alert_type_check"`

**Cause:** The `alert_type` field was set to `"field_incident"` but the CHECK constraint only allows:
- `'SMS'`
- `'voice'`
- `'in-app'`
- `'email'`
- `'push'`

**Solution:** ✅ Changed `alert_type: "field_incident"` to `alert_type: "in-app"`

## Root Cause Analysis

### Table Schema
```sql
CREATE TABLE public.grain_alerts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id     VARCHAR(100) UNIQUE NOT NULL,
  admin_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,  -- ⚠️ REQUIRED
  alert_type   VARCHAR(20) DEFAULT 'in-app'
                 CHECK (alert_type IN ('SMS','voice','in-app','email','push')),  -- ⚠️ CONSTRAINT
  source       VARCHAR(30) NOT NULL
                 CHECK (source IN ('sensor','ai','manual','system','threshold','insurance','subscription','batch','payment','user','field_incident')),
  -- ... other fields
);
```

**Key Constraints:**
1. `admin_id` is NOT NULL and required by RLS policy
2. `alert_type` must be one of: SMS, voice, in-app, email, push
3. `source` can include 'field_incident' (added in migration `20260727130000_field_incidents.sql`)

**Note:** We use `source='field_incident'` to identify field incidents, NOT `alert_type`. The `alert_type` refers to the notification delivery method.

### RLS Policy
```sql
CREATE POLICY "Tenant access alerts" ON public.grain_alerts
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));
```

The policy checks that:
- **USING clause**: User can only read rows where `admin_id` matches their tenant
- **WITH CHECK clause**: User can only insert/update rows where `admin_id` matches their tenant

### The Missing Field
The insert statement in `reportMobileFieldIncident` was missing `admin_id`:

```typescript
// ❌ BEFORE (Missing admin_id)
await context.supabase.from("grain_alerts").insert({
  alert_id: `field-${Date.now()}-...`,
  title: cat,
  message: formattedNotes || null,
  // ... no admin_id!
})
```

## Solution

### Fixed Insert Statement
**File:** `src/lib/field-settings.functions.ts`

```typescript
// ✅ AFTER (With admin_id and correct alert_type)
await context.supabase.from("grain_alerts").insert({
  alert_id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  admin_id: tenantId, // Required for RLS policy and NOT NULL constraint
  title: cat,
  message: formattedNotes || null,
  priority: data.severity === "high" ? "critical" : data.severity,
  status: "open",
  alert_type: "in-app", // Must be one of: SMS, voice, in-app, email, push (notification type)
  source: "field_incident", // Identifies this as a field incident
  created_by: context.userId,
  recipient_id: recipientId,
  triggered_at: new Date().toISOString(),
  custom_fields: {
    silo_id: data.silo_id ?? null,
    reporter_name: reporterName,
    reporter_role: data.reporter_role?.trim() || null,
    target_role: targetRole,
  } as never,
})
```

### How admin_id is Obtained
The `tenantId` is already resolved earlier in the function:

```typescript
// Resolve tenant id via existing helper
const { data: profile } = await context.supabase
  .from("profiles")
  .select("admin_id, id, name, email")
  .eq("id", context.userId)
  .maybeSingle();

const tenantId = (profile?.admin_id as string) ?? profile?.id ?? context.userId;
```

**Logic:**
- If user has `admin_id`, use that (user is a team member)
- Otherwise use their own `id` (user is the admin)
- Fallback to `context.userId`

## Verification

### Other grain_alerts Inserts
Checked all other places where `grain_alerts` are inserted - they all correctly include `admin_id`:

1. ✅ `src/lib/ml-pipeline.functions.ts` - Has `admin_id: silo.admin_id`
2. ✅ `src/routes/api/public/cron/sync-firebase.ts` - Includes `admin_id` in alertsToCreate
3. ✅ `src/routes/api/public/hooks/sensor-offline-detector.ts` - Includes `admin_id` in rows

Only `reportMobileFieldIncident` was missing it.

## Testing Checklist

**After applying this fix:**
- [ ] Create incident from monitoring page → manager
- [ ] Verify incident is created without RLS error
- [ ] Verify incident appears in monitoring page (All tab)
- [ ] Verify incident appears in monitoring page (Active tab)
- [ ] Verify incident appears in monitoring page (Incoming tab for recipient)
- [ ] Verify incident appears in field incidents page
- [ ] Verify notification is sent to manager
- [ ] Create incident from monitoring page → technician
- [ ] Verify incident is created without RLS error
- [ ] Verify technician sees incident in Incoming tab
- [ ] Create incident from monitoring page → admin
- [ ] Verify incident is created without RLS error

## Complete Fix Summary

### Changes Required (In Order)

1. ✅ **Database Migration**: Add enum values `open`, `investigating`, `dismissed`
   ```sql
   ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'open';
   ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'investigating';
   ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'dismissed';
   ```

2. ✅ **Code Fix 1**: Add `admin_id` to insert statement in `src/lib/field-settings.functions.ts`
   - Added: `admin_id: tenantId,`

3. ✅ **Code Fix 2**: Change `alert_type` from `"field_incident"` to `"in-app"`
   - Changed: `alert_type: "field_incident"` → `alert_type: "in-app"`
   - Reason: alert_type CHECK constraint only allows: SMS, voice, in-app, email, push

### Files Modified
- `src/lib/field-settings.functions.ts` - Added `admin_id` to grain_alerts insert
- `supabase/migrations/20260807000000_add_field_incident_statuses.sql` - Added enum values

## Why This Happened

The original code was inserting into `field_incidents` table, which likely had different RLS policies or no RLS at all. When we migrated to use `grain_alerts` table for data consistency, we needed to:

1. Match the table schema (including all required fields like `admin_id`)
2. Satisfy the RLS policies (which check `admin_id` for tenant isolation)

The `admin_id` field serves dual purpose:
- **Data Integrity**: Ensures every alert belongs to a tenant
- **Security**: RLS policy uses it to enforce tenant isolation

## Related Documentation
- [Monitoring Incidents Data Sync Fix](./MONITORING_INCIDENTS_DATA_SYNC_FIX.md) - Original fix that moved from field_incidents to grain_alerts
- Table schema: `supabase/migrations/20260707180839_89507880-ca18-44ae-b8e4-5335c40c4fea.sql`
- RLS policies: Same migration file (lines 680-682)

## Key Takeaways

**When inserting into grain_alerts:**
1. Always include `admin_id` (required by schema and RLS)
2. Always include `alert_id` (unique identifier)
3. Always include `title` and `message` (both NOT NULL)
4. Always include `priority` (NOT NULL)
5. Always include `source` (NOT NULL, must match CHECK constraint)
6. Set appropriate `status` (must be valid enum value)

**For field incidents specifically:**
- Set `source: "field_incident"`
- Set `alert_type: "field_incident"`
- Set `recipient_id` for routing
- Use `custom_fields` for additional metadata
