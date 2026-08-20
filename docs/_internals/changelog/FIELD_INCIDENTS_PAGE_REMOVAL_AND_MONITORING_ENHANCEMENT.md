# Field Incidents Page Removal & Monitoring Enhancement

**Date:** 2026-08-07  
**Priority:** Feature Enhancement  
**Status:** ✅ Completed

## Overview

Removed the standalone field incidents page and consolidated all incident management into the monitoring page with enhanced detail panel and resolve/dismiss actions.

## Changes Made

### 1. Deleted Field Incidents Page ✅

**Removed Files:**
- `src/routes/_authenticated/manager.field-incidents.index.tsx`
- `src/routes/_authenticated/manager.field-incidents.all.tsx`
- `src/routes/_authenticated/manager.field-incidents.dismissed.tsx`
- `src/routes/_authenticated/manager.field-incidents.incoming.tsx`
- `src/routes/_authenticated/manager.field-incidents.resolved.tsx`
- `src/routes/_authenticated/platform.field-incidents.index.tsx`
- `src/routes/_authenticated/platform.field-incidents.all.tsx`
- `src/routes/_authenticated/platform.field-incidents.dismissed.tsx`
- `src/routes/_authenticated/platform.field-incidents.incoming.tsx`
- `src/routes/_authenticated/platform.field-incidents.resolved.tsx`

**Total:** 10 route files removed (5 manager routes + 5 platform routes)

### 2. Updated Dashboard Card Link ✅

**File:** `src/components/dashboards/ManagerBento.tsx`

Changed the "View all" link in the Open Field Incidents card:
- **From:** `/platform/field-incidents`
- **To:** `/manager/monitoring`

Now clicking on the card directs managers to the monitoring page incidents section.

### 3. Enhanced Incident Detail Panel ✅

**File:** `src/components/monitoring/IncidentsSection.tsx`

**Enhanced DetailPanel component to display:**

1. **Title** - Incident name/title
2. **Severity Level** - Critical, Medium, or Low with color-coded badges
3. **Description** - Full incident description/message
4. **Reported Date & Time** - Formatted as: "Month Day, Year, HH:MM:SS AM/PM"
   ```typescript
   new Date(row.triggered_at).toLocaleString('en-US', {
     year: 'numeric',
     month: 'long',
     day: 'numeric',
     hour: '2-digit',
     minute: '2-digit',
     second: '2-digit',
     hour12: true
   })
   ```
5. **Sent By** (for incoming incidents)
   - Shows reporter name
   - Shows reporter role from custom_fields (for field incidents)
   - Label changes to "Sent By" for incoming incidents, "Reported By" for own incidents
6. **Sent To** (for outgoing incidents)
   - Shows recipient name
   - Shows target role from custom_fields (for field incidents)

**Updated IncidentRow type:**
```typescript
type IncidentRow = {
  // ... existing fields
  custom_fields?: {
    reporter_role?: string;
    target_role?: string;
    [key: string]: any;
  };
};
```

### 4. Added Resolve & Dismiss Actions ✅

#### Backend Function
**File:** `src/lib/monitoring.functions.ts`

Created `updateIncidentStatus` function:
```typescript
export const updateIncidentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateIncidentStatusInput.parse(d))
  .handler(async ({ data, context }) => {
    // Updates grain_alerts table with:
    // - status: "resolved" or "dismissed"
    // - resolved_at: timestamp
    // - resolved_by: user ID
  });
```

**Permissions:** Manager, Admin, Super Admin only

#### Frontend Implementation
**File:** `src/components/monitoring/IncidentsSection.tsx`

**Added Mutations:**
1. **resolveMut** - Marks incident as resolved
   - Success message: "Incident marked as resolved"
   - Invalidates incidents query
   - Closes detail panel

2. **dismissMut** - Marks incident as dismissed
   - Success message: "Incident marked as dismissed"
   - Invalidates incidents query
   - Closes detail panel

**Added Action Buttons:**
- **Mark Resolved** button (green)
  - Icon: CheckCircle2
  - Shows loading spinner when pending
  
- **Mark Dismissed** button (outline)
  - Icon: Ban
  - Shows loading spinner when pending

**Visibility Rules:**
- Only shown to managers/admins
- Hidden if incident status is already "resolved" or "dismissed"
- Works for both field incidents and system incidents

### 5. Tab Behavior ✅

When manager marks an incident:

**Mark Resolved:**
- Incident removed from **Active** tab
- Incident moves to **Resolved** tab
- Status updated to `"resolved"` in database

**Mark Dismissed:**
- Incident removed from **Active** tab
- Incident moves to **Dismissed** tab
- Status updated to `"dismissed"` in database

Tab filtering logic (unchanged):
- **All**: Shows all incidents
- **Active**: status in [open, pending, investigating, acknowledged]
- **Resolved**: status in [resolved, closed]
- **Dismissed**: status === "dismissed"
- **Incoming**: isForMe && !isMine

## User Flow

### Before
1. Manager sees incident in dashboard card
2. Clicks "View all" → Goes to separate field incidents page
3. Must use field incidents page UI to manage incidents

### After
1. Manager sees incident in dashboard card
2. Clicks "View all" → Goes to monitoring page incidents section
3. Clicks on incident → Detail panel opens on the right
4. Detail panel shows:
   - Title, severity, description
   - Full date and time
   - Sent by (name + role)
   - Sent to (name + role)
   - Action buttons: Mark Resolved / Mark Dismissed
5. Clicks "Mark Resolved" or "Mark Dismissed"
6. Incident immediately moves to respective tab
7. Toast notification confirms action

## Database Changes

**Table:** `grain_alerts`

**Fields Updated:**
- `status` - Set to "resolved" or "dismissed"
- `resolved_at` - Set to current timestamp
- `resolved_by` - Set to current user ID

**No migration required** - These fields already exist and the status enum already includes "resolved" and "dismissed" values (added in previous migration).

## Benefits

1. ✅ **Consolidated UI** - Single location for all incident management
2. ✅ **Better UX** - Split-view detail panel shows all info at a glance
3. ✅ **Faster Actions** - Resolve/Dismiss with one click
4. ✅ **Auto Tab Switching** - Incidents automatically move to correct tab
5. ✅ **Role Visibility** - Shows who sent and who received with roles
6. ✅ **Reduced Complexity** - Removed 10 route files and associated complexity

## Testing Checklist

- [x] Manager dashboard card "View all" link goes to monitoring page
- [x] Clicking incident opens detail panel on the right
- [x] Detail panel shows title, severity, description
- [x] Detail panel shows formatted date and time
- [x] Detail panel shows "Sent By" with name and role (for incoming)
- [x] Detail panel shows "Sent To" with name and role (for outgoing)
- [x] "Mark Resolved" button visible for managers
- [x] "Mark Dismissed" button visible for managers
- [x] Clicking "Mark Resolved" moves incident to Resolved tab
- [x] Clicking "Mark Dismissed" moves incident to Dismissed tab
- [x] Buttons hidden when incident already resolved/dismissed
- [x] Loading spinner shows while action is pending
- [x] Toast notification shows on success
- [x] Error toast shows on failure
- [x] Detail panel closes after successful action
- [x] Incidents list refreshes after action

## Files Modified

1. `src/components/dashboards/ManagerBento.tsx` - Updated "View all" link
2. `src/components/monitoring/IncidentsSection.tsx` - Enhanced detail panel, added buttons
3. `src/lib/monitoring.functions.ts` - Added updateIncidentStatus function

## Files Deleted

10 field incidents route files (listed in section 1)

## Related Documentation

- [Monitoring Incidents Data Sync Fix](./MONITORING_INCIDENTS_DATA_SYNC_FIX.md) - Original migration to grain_alerts
- [RLS Policy Fix](./RLS_POLICY_FIX_MONITORING_INCIDENTS.md) - Database constraint fixes

## Technical Notes

**Why this consolidation?**
- Field incidents are now stored in `grain_alerts` table with `source='field_incident'`
- Monitoring page already shows all incidents (system + field)
- Duplicate pages caused confusion and maintenance overhead
- Single source of truth improves consistency

**For system incidents:**
- Still have assign technician dropdown
- Still have escalate button
- Now also have resolve/dismiss buttons

**For field incidents:**
- Removed old "Mark Closed" button
- Now have resolve/dismiss buttons (same as system incidents)
- Consistent behavior across all incident types

## Future Enhancements

Consider:
1. Add resolution notes textarea before resolving
2. Add confirmation dialog before dismissing
3. Add incident history/timeline view
4. Add bulk actions (resolve multiple, dismiss multiple)
5. Add filters for resolved by user
6. Add export resolved incidents to CSV
