# Monitoring Incidents Data Sync Fix

**Date:** 2026-08-07  
**Priority:** P0 - Critical Bug Fix  
**Status:** ✅ Completed (Requires Migration)

## Problem

Incidents created from the monitoring page's "New Ticket" dialog were showing an error:

```
invalid input value for enum alert_status: "open"
```

### Root Causes

1. **Data Source Mismatch:**
   - `reportMobileFieldIncident` (ticket dialog) was inserting into `field_incidents` table
   - `getIncidents` (monitoring page) was reading from `grain_alerts` table with `source='field_incident'`

2. **Enum Mismatch:**
   - The code expected statuses: `open`, `investigating`, `dismissed`
   - The database `alert_status` enum only had: `pending`, `acknowledged`, `resolved`, `escalated`, `closed`

## Solution

### Part 1: Data Source Unification (✅ Completed)

Updated `reportMobileFieldIncident` function to insert into `grain_alerts` table instead of `field_incidents` table.

### Part 2: Database Schema Update (⚠️ Requires Migration)

Created migration to add missing enum values to `alert_status` type.

## Changes Made

### 1. **Database Migration** (`supabase/migrations/20260807000000_add_field_incident_statuses.sql`)

```sql
-- Add missing status values for field incidents
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'investigating';
ALTER TYPE public.alert_status ADD VALUE IF NOT EXISTS 'dismissed';
```

**⚠️ IMPORTANT:** This migration must be applied to the database before the code changes will work.

### 2. **Updated Insert Target** (`src/lib/field-settings.functions.ts`)

Changed from:

```typescript
await context.supabase.from("field_incidents").insert({
  tenant_id: tenantId,
  reporter_user_id: context.userId,
  category: cat,
  severity: data.severity,
  notes: formattedNotes || null,
  silo_id: data.silo_id ?? null,
  status: "open",
  source: "web",
});
```

To:

```typescript
await context.supabase.from("grain_alerts").insert({
  alert_id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  title: cat,
  message: formattedNotes || null,
  priority: data.severity === "high" ? "critical" : data.severity,
  status: "open", // Now valid after migration
  alert_type: "field_incident",
  source: "field_incident",
  created_by: context.userId,
  recipient_id: recipientId,
  triggered_at: new Date().toISOString(),
  custom_fields: {
    silo_id: data.silo_id ?? null,
    reporter_name: reporterName,
    reporter_role: data.reporter_role?.trim() || null,
    target_role: targetRole,
  },
});
```

### 3. **Added Recipient Resolution**

Added logic to find the appropriate recipient based on target_role:

```typescript
let recipientId: string | null = null;
if (targetRole !== "admin") {
  const { data: targetUsers } = await context.supabase
    .from("profiles")
    .select("id")
    .or(`admin_id.eq.${tenantId},id.eq.${tenantId}`)
    .eq("role", targetRole)
    .limit(1)
    .maybeSingle();
  recipientId = targetUsers?.id ?? null;
}
```

### 4. **Updated Notification Links**

Changed notification links to route to monitoring page:

```typescript
const notifLink = targetRole === "manager" ? "/manager/monitoring" : "/platform/monitoring";
```

## Deployment Steps

### Option 1: Supabase CLI (Recommended)

```bash
# If you have Supabase CLI installed
cd /path/to/grainhero
supabase db push
```

### Option 2: Supabase Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `supabase/migrations/20260807000000_add_field_incident_statuses.sql`
3. Paste and execute the SQL
4. Verify the enum values were added:
   ```sql
   SELECT enum_range(NULL::alert_status);
   ```
   Should return: `{pending,acknowledged,resolved,escalated,closed,open,investigating,dismissed}`

### Option 3: Lovable Auto-Deploy

If this is a Lovable-connected project, the migration should be applied automatically when you push changes to the connected branch.

## Data Structure Mapping

| Old (field_incidents) | New (grain_alerts)      | Notes                          |
| --------------------- | ----------------------- | ------------------------------ |
| `category`            | `title`                 | Incident title/category        |
| `severity`            | `priority`              | Severity level (high→critical) |
| `notes`               | `message`               | Incident description           |
| `reporter_user_id`    | `created_by`            | Reporter user ID               |
| `silo_id`             | `custom_fields.silo_id` | Affected silo (optional)       |
| `tenant_id`           | (implicit)              | Derived from user profile      |
| `status`              | `status`                | Now uses full enum set         |
| N/A                   | `source`                | Always "field_incident"        |
| N/A                   | `alert_type`            | Always "field_incident"        |
| N/A                   | `recipient_id`          | Target role recipient          |
| N/A                   | `triggered_at`          | Timestamp                      |

## Status Values After Migration

| Status          | Meaning                            | Use Case                          |
| --------------- | ---------------------------------- | --------------------------------- |
| `open`          | Newly created                      | Initial state for field incidents |
| `pending`       | Awaiting action                    | System alerts                     |
| `investigating` | Being looked into                  | Manager/tech working on incident  |
| `acknowledged`  | Seen but not resolved              | System alerts acknowledged        |
| `escalated`     | Escalated to higher level          | System incidents only             |
| `resolved`      | Fixed and completed                | Both field and system incidents   |
| `closed`        | Closed without action or completed | Field incidents                   |
| `dismissed`     | Closed without action              | Field incidents                   |

## Benefits

1. ✅ **Unified Data Source**: All field incidents now use `grain_alerts` table
2. ✅ **Consistent Display**: Incidents appear in both monitoring page and field incidents page
3. ✅ **Proper Routing**: Recipient resolution enables "Incoming" tab filtering
4. ✅ **Better Notifications**: Links route to the correct monitoring page based on role
5. ✅ **Complete Status Set**: All expected status values are now valid in database
6. ✅ **Backward Compatible**: `listOpenFieldIncidents` already reads from `grain_alerts`

## Testing Checklist

**After applying migration:**

- [ ] Verify migration was applied successfully
- [ ] Create incident from monitoring page → manager recipient
- [ ] Verify incident appears in monitoring page incidents section (All tab)
- [ ] Verify incident appears in monitoring page incidents section (Active tab)
- [ ] Verify incident appears in monitoring page incidents section (Incoming tab for recipient)
- [ ] Verify incident appears in field incidents page
- [ ] Verify notification is sent to manager with correct link
- [ ] Verify discussion feature works for the incident
- [ ] Verify incident can be closed from monitoring page
- [ ] Create incident from monitoring page → technician recipient
- [ ] Verify recipient sees incident in Incoming tab
- [ ] Verify incident can be set to "investigating" status
- [ ] Verify incident can be dismissed

## Related Files

- `supabase/migrations/20260807000000_add_field_incident_statuses.sql` - **NEW** enum values
- `src/lib/field-settings.functions.ts` - Updated `reportMobileFieldIncident`
- `src/lib/monitoring.functions.ts` - `getIncidents` already reads from `grain_alerts`
- `src/components/app/ReportTicketDialog.tsx` - Dialog component (no changes needed)
- `src/components/monitoring/IncidentsSection.tsx` - Display component (no changes needed)

## Migration Notes

**Database Change:** Adding enum values is a non-breaking change. Existing rows are not affected, and the new values are simply appended to the enum type.

**Rollback:** If needed, enum values cannot be removed from PostgreSQL enum types without recreating the type entirely. However, the new values don't break existing functionality.

## Follow-up Actions

Consider:

1. ✅ Migrating historical data from `field_incidents` to `grain_alerts` with `source='field_incident'`
2. ✅ Deprecating `field_incidents` table entirely
3. Adding database triggers to maintain backward compatibility if needed
4. Updating any other code that still references `field_incidents` table
