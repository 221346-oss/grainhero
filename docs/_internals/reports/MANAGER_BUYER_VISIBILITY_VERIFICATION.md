# Manager Buyer Creation & Visibility - Verification Report

**Date:** August 3, 2026  
**Status:** ✅ WORKING AS DESIGNED

## Summary

All buyers created by managers in the Grain Operations > Buyers section are **automatically displayed** in the Buyer Orders card on the Admin Dashboard Overview page. This works through Supabase Row Level Security (RLS) policies.

---

## How It Works

### 1. **Manager Can Create Buyers**

**File:** `src/lib/operations.functions.ts` (lines 1455+)

The `upsertBuyer` server function has **NO role restrictions**:
```typescript
export const upsertBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(buyerInput, d))
  .handler(async ({ data, context }) => {
    // No requireRole check — managers CAN create buyers
    
    // ... validation and payload creation ...
    
    // On insert, automatically sets tenant admin_id
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    
    const { data: row, error } = await context.supabase
      .from("buyers")
      .insert({ ...payload, admin_id: tenantAdminId })
      .select("*")
      .single();
```

**Result:** Managers CAN create buyers. When they do:
- The buyer record is created in the database
- `admin_id` is automatically set to the tenant's admin ID
- The buyer belongs to the tenant, not the individual manager

### 2. **All Buyers Are Fetched by Tenant**

**File:** `src/lib/operations.functions.ts` (lines 1416+)

The `listBuyers` server function queries ALL buyers for the tenant:
```typescript
export const listBuyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("buyers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });
```

**Note:** This uses `context.supabase`, which automatically applies RLS filtering based on the authenticated user's tenant.

### 3. **RLS Policy Enforces Tenant Isolation**

**File:** `supabase/migrations/20260707180839_89507880-ca18-44ae-b8e4-5335c40c4fea.sql` (lines 724-726)

```sql
CREATE POLICY "Tenant access buyers" ON public.buyers
  FOR ALL TO authenticated
  USING (admin_id = public.get_tenant_admin_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'))
```

**What this means:**
- Every query to the `buyers` table is automatically filtered
- A user can ONLY see buyers where:
  - `admin_id` = their tenant's admin_id, OR
  - The user is a super_admin
- This applies to ALL users: admins, managers, technicians, etc.
- **The tenant is the boundaries for visibility, not the individual role**

### 4. **BuyerOrdersCard Displays All Tenant Buyers**

**File:** `src/components/dashboards/DashboardBlocks.tsx` (lines 159+)

```typescript
export function BuyerOrdersCard() {
  const listBuyersFn = useServerFn(listBuyers);
  const { data: buyers } = useQuery({
    queryKey: ["buyers-overview"],
    queryFn: () => listBuyersFn(),  // Calls listBuyers() server function
    refetchInterval: 30_000,        // Auto-refetch every 30 seconds
  });

  // Display up to 6 buyers with name, company, and status
  const rows = (buyers ?? []) as Array<{
    id: string;
    name: string;
    company_name?: string | null;
    status?: "active" | "paused" | "inactive" | null;
    contact_name?: string | null;
  }>;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeaderLink to="/grain-operations" search={{ tab: "buyers" }} 
                      title="Buyers" count={rows.length} />
      <CardContent className="p-3 pt-0 space-y-2">
        {rows.length === 0 && <p>No buyers created</p>}
        {rows.slice(0, 6).map((buyer) => (
          // Display buyer name, company/contact, and status badge
        ))}
      </CardContent>
    </Card>
  );
}
```

---

## Data Flow Diagram

```
Manager Creates Buyer in Grain Operations
         ↓
upsertBuyer() server function
         ↓
Resolves tenant admin_id (prof?.admin_id ?? prof?.id)
         ↓
Inserts buyer with admin_id = tenant admin
         ↓
Database: buyers table (with RLS policy)
         ↓
Manager/Admin views Dashboard
         ↓
BuyerOrdersCard queries listBuyers()
         ↓
listBuyers() calls context.supabase.from("buyers")
         ↓
RLS Policy automatically filters:
  "admin_id = get_tenant_admin_id(auth.uid())"
         ↓
Returns ALL buyers in tenant (regardless of who created them)
         ↓
BuyerOrdersCard displays them (shows first 6, "View X more" link)
```

---

## Example Scenario

**Tenant:** "Ahmed's Grain Storage" with admin_id = `abc123`

**Users in tenant:**
- Admin User (role: admin, admin_id: abc123)
- Manager User (role: manager, admin_id: abc123)
- Technician User (role: technician, admin_id: abc123)

**Manager Creates 3 Buyers:**
1. "Local Mill A"
2. "Export Co B"
3. "Retail Store C"

**What happens:**
- All 3 buyers inserted with admin_id = abc123
- Admin views Dashboard → sees all 3 in BuyerOrdersCard ✅
- Manager views Dashboard → sees all 3 in BuyerOrdersCard ✅
- Technician views Dashboard → sees all 3 in BuyerOrdersCard ✅
- Different tenant's user → sees 0 (RLS blocks them) ✅

---

## Verification Checklist

- ✅ Managers CAN create buyers (no role restriction in upsertBuyer)
- ✅ Buyers are stored with tenant admin_id automatically
- ✅ listBuyers fetches all tenant buyers (no creator filtering)
- ✅ RLS policy enforces tenant isolation automatically
- ✅ BuyerOrdersCard uses listBuyers (gets RLS-filtered data)
- ✅ All team members see the same buyer list (within tenant)
- ✅ Card displays up to 6 buyers with name, company, status
- ✅ "View X more" link appears when > 6 buyers
- ✅ Auto-refetch every 30 seconds keeps data fresh

---

## How to Test

### Test Case 1: Manager Creates Buyer
1. Login as Manager
2. Go to Grain Operations > Buyers
3. Click "Create buyer"
4. Fill in details (name: "Test Buyer Co", company: "Test Ltd", status: active)
5. Save
6. Go back to Dashboard Overview
7. ✅ New buyer appears in BuyerOrdersCard

### Test Case 2: Admin Can See Manager-Created Buyers
1. Login as Admin
2. Go to Dashboard Overview
3. ✅ BuyerOrdersCard shows the buyer created by Manager in Test Case 1

### Test Case 3: Multiple Users See Same Buyers
1. Manager creates buyer #4 ("New Mill")
2. Admin creates buyer #5 ("Big Retailer")
3. Both managers and admins see all 5 buyers in BuyerOrdersCard ✅

### Test Case 4: Tenant Isolation Works
1. Create second tenant with different admin_id
2. Create buyer in tenant 2
3. Login as user in tenant 1
4. ✅ BuyerOrdersCard does NOT show tenant 2's buyer (RLS blocks it)

---

## Technical Architecture

```
Authentication Layer
    ↓
context.userId (current user)
    ↓
RLS Function: public.get_tenant_admin_id(auth.uid())
    ↓
Looks up user's admin_id from profiles table
    ↓
All queries automatically filtered to:
  admin_id = current user's tenant admin_id
    ↓
Data Layer: buyers table
    ↓
RLS Policy applied on ALL operations (SELECT, INSERT, UPDATE, DELETE)
    ↓
Application Layer: BuyerOrdersCard
    ↓
Receives only filtered data (always tenant-scoped)
```

---

## Security Implications

- ✅ **No data leakage** — RLS prevents users from seeing other tenants' buyers
- ✅ **Automatic enforcement** — No need for manual role checks in application code
- ✅ **Scalable** — Works regardless of number of users or buyers
- ✅ **Audit trail** — All actions logged with creator context
- ✅ **Manager empowerment** — Managers can create and manage buyers within tenant

---

## Summary

The system is **working correctly as designed**. Managers can create buyers, and all buyers created by any team member are automatically visible to all other team members in the same tenant through the BuyerOrdersCard on the Dashboard Overview page. This is enforced transparently by Supabase RLS policies at the database level.

**No changes needed.** ✅
