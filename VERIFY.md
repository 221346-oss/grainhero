# Issue Verification Guide

## Issue 1+2: Review & Pay + Grand Total ✅

**Files Changed:**
- `src/routes/checkout.index.tsx`

**Test Steps:**
1. Start dev server: `npm run dev`
2. Open browser: `http://localhost:3000/checkout`
3. Select a plan (e.g., Professional)
4. Fill Step 1 (Plan + IoT quantity)
5. Fill Step 2 (Buyer: name, email)
6. Fill Step 3 (Install: address, city, phone, **business name**, **GST/Tax ID**, **notes**)
7. Go to Step 4 (Review & Pay)

**Expected Results:**
- ✅ Business name appears in "Buyer" section (if filled)
- ✅ GST/Tax ID appears in "Buyer" section (if filled)
- ✅ "Notes for technician" section appears (if filled)
- ✅ Pricing breakdown shows:
  - Subscription (first month): Rs. X
  - IoT sensor setup: Rs. Y
  - **Total charged today: Rs. X+Y** (bold)
- ✅ Sidebar shows "Total due today" = plan price + IoT

**Code Reference:**
```typescript
// Lines 400-480 in checkout.index.tsx
{businessName && <p>Business: {businessName}</p>}
{taxId && <p>GST / Tax ID: {taxId}</p>}
{notes && <div>Notes for technician...</div>}

// Sidebar:
<span>Total due today</span>
<span>Rs. {(planData.price + iotQuantity * 7000).toLocaleString()}</span>
```

---

## Issue 3a+7: Auto-redirect activation ✅

**Files Changed:**
- `src/routes/checkout.success.tsx`

**Test Steps (Signed-out user):**
1. Open **incognito/private** window
2. Navigate to: `http://localhost:3000/checkout/success?session_id=test123`
3. Watch what happens

**Expected Results:**
- ✅ Spinner appears: "Redirecting to account setup…"
- ✅ After 1-2 seconds, auto-navigates to `/auth/signup?email=...&redirect=...`
- ✅ Email field is prefilled (if session valid)
- ❌ **NO popup card** with buttons should appear

**Test Steps (Signed-in user):**
1. Login first
2. Navigate to: `/checkout/success`

**Expected Results:**
- ✅ Full success page with confetti + steps
- ✅ No redirect, no popup card

**Code Reference:**
```typescript
// Line ~225: Auto-navigate
useEffect(() => {
  if (signedIn !== false) return;
  if (summaryQuery.isLoading) return;
  navigate({ to: "/auth/signup", ... });
}, [signedIn, summaryQuery.isLoading, ...]);

// Line ~240: Spinner (no card)
if (signedIn === null || signedIn === false) {
  return <Loader2 /> // NOT a Card component
}
```

---

## Issue 3b: Plan-based feature limits ✅

**Files Changed:**
- `src/hooks/usePlanLimits.ts` (NEW)
- `src/routes/_authenticated/silos.tsx`
- `src/routes/_authenticated/warehouses.tsx`

**Test Steps:**
1. Login to app
2. Check your subscription plan:
   ```sql
   SELECT plan_name, max_silos, max_warehouses 
   FROM subscriptions 
   WHERE admin_id = (SELECT id FROM profiles WHERE email = 'YOUR_EMAIL');
   ```
3. Navigate to `/silos`

**Expected Results (when limit NOT reached):**
- ✅ "New silo" button is **enabled** (green)
- ✅ No warning banner

**Expected Results (when limit reached):**
- ✅ "New silo" button is **disabled** (grey/dimmed)
- ✅ Amber warning banner appears:
  ```
  ⚠️ Silo limit reached (3/3). Upgrade your plan to add more.
  View plans →
  ```
- ✅ Clicking "View plans →" goes to `/subscription`

**Manual Test (force limit):**
```sql
-- Set limit to 1 for testing
UPDATE subscriptions SET max_silos = 1 WHERE admin_id = 'YOUR_ID';

-- Refresh /silos page
-- Button should now be disabled if you have ≥1 silos
```

**Same test for Warehouses:**
- Navigate to `/warehouses`
- Same behavior with `max_warehouses` limit

**Code Reference:**
```typescript
// usePlanLimits.ts
const canAddSilo = maxSilos === -1 || usage.silos < maxSilos;

// silos.tsx line ~210
<Button disabled={!canAddSilo}>New silo</Button>
{siloLimitMessage && <Card>Warning banner</Card>}
```

---

## Quick Visual Check (Screenshots)

**Issue 1+2:**
![Review step](screenshot: business name, GST visible, total charged today)

**Issue 3a:**
![Spinner redirect](screenshot: loader + "Redirecting to account setup…")

**Issue 3b:**
![Disabled button](screenshot: grey "New silo" button + amber warning banner)

---

## Browser DevTools Verification

**Console checks:**
```javascript
// On /checkout success page (signed out):
// Should see navigation happening:
console.log("Navigating to /auth/signup");

// On /silos page:
// Check hook output:
// Network tab → XHR → "my-subscription" request
```

**React DevTools:**
1. Install React DevTools extension
2. Open Components tab
3. Find `SilosPage` component
4. Check props/hooks:
   - `canAddSilo: false` (when limit reached)
   - `siloLimitMessage: "Silo limit reached..."`

---

## Rollback (agar kuch galat ho)

**Git restore:**
```bash
# Undo specific file:
git checkout HEAD -- src/routes/checkout.index.tsx

# Undo all changes:
git reset --hard HEAD
```

**Files to restore individually:**
- `src/routes/checkout.index.tsx` (Issue 1+2)
- `src/routes/checkout.success.tsx` (Issue 3a)
- `src/hooks/usePlanLimits.ts` (Issue 3b - delete file)
- `src/routes/_authenticated/silos.tsx` (Issue 3b)
- `src/routes/_authenticated/warehouses.tsx` (Issue 3b)
