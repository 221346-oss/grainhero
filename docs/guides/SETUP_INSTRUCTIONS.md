# GrainHero Setup Instructions

## ✅ Navigation Changes Completed

### Sidebar Structure (as of latest update):

**Main Pinned Navigation:**

- Home
- Batches
- Silos
- Sensors
- Actuators
- Alerts
- AI Predictions
- Analytics
- **Activity Logs** ← Added to main sidebar
- Warehouses
- Buyers

**More → Insights Section:**

- Environmental
- Incidents
- Maintenance
- Device Health
- Data Visualization
- Reports
- ML Models
- Traceability
- Notifications

**More → Business Section:**

- ✅ Revenue
- ✅ Insurance
- ✅ Subscription

**More → Platform Section (super_admin only):**

- Tenants
- Users
- Pipeline
- Leads
- System Health
- Audit Logs
- System Logs
- Install Orders
- 🔍 Debug Data

---

## ❌ CRITICAL ISSUE: Missing Service Role Key

### Problem:

Your `.env` file is **missing** `SUPABASE_SERVICE_ROLE_KEY`, which is required for admin operations that bypass Row Level Security (RLS).

### Why You're Not Seeing Data:

The platform admin functions (like `getPlatformMetrics`, `listAllUsers`, `listAllTenants`) use `supabaseAdmin` which requires the service role key to:

- Read all users across all tenants
- Access the user_roles table
- Get full platform metrics
- Bypass RLS policies

### How to Fix:

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `frfgmbgzildtfchtmchr`

2. **Get Service Role Key:**
   - Go to: **Settings** → **API**
   - Find the **"service_role"** key (secret key)
   - **⚠️ IMPORTANT:** This is NOT the "anon" key - it's the SECRET service role key
   - Copy the entire key (starts with `eyJhbG...`)

3. **Add to .env file:**

   ```env
   SUPABASE_SERVICE_ROLE_KEY="your_service_role_key_here"
   ```

4. **Restart your dev server:**

   ```bash
   npm run dev
   ```

5. **Test:**
   - Go to: **More → Platform → 🔍 Debug Data**
   - You should now see:
     - ✅ Your role
     - ✅ Platform metrics
     - ✅ Users list with roles
     - ✅ Tenants list

---

## 💰 Currency Change (PKR instead of USD)

### Files that need currency changes:

1. **SuperAdminDashboard.tsx** - Line 103:

   ```typescript
   // Change from:
   <p className="text-3xl font-bold mt-1 text-slate-900">${(m as any)?.mrr?.toLocaleString() ?? "0"}</p>

   // To:
   <p className="text-3xl font-bold mt-1 text-slate-900">PKR {(m as any)?.mrr?.toLocaleString() ?? "0"}</p>
   ```

2. **SuperAdminDashboard.tsx** - Line 242:

   ```typescript
   // Change from:
   { to: "/platform/revenue", label: "Revenue", value: m ? `$${(m as any).mrr?.toLocaleString()}` : "—", icon: DollarSign },

   // To:
   { to: "/platform/revenue", label: "Revenue", value: m ? `PKR ${(m as any).mrr?.toLocaleString()}` : "—", icon: DollarSign },
   ```

3. **revenue-analytics.functions.ts** - Update currency field:

   ```typescript
   // Change the return statement to include:
   currency: "PKR",  // instead of "USD"
   ```

4. **reports.tsx** - Lines 80-81 (if you want reports in PKR too)

---

## 📊 Dashboard Analytics

The SuperAdminDashboard already has:

- ✅ 6 KPI cards (Tenants, Users, Subscriptions, MRR, Alerts, Logs)
- ✅ User Signups Chart (30 days with growth %)
- ✅ Role Distribution Chart
- ✅ Revenue by Plan Chart
- ✅ Revenue Trend Chart (12 months)
- ✅ Platform Insights Cards
- ✅ Recent Signups List

**These will work once you add the service role key!**

---

## 🔍 Current Status Summary

| Feature              | Status          | Notes                                                                 |
| -------------------- | --------------- | --------------------------------------------------------------------- |
| Navigation Structure | ✅ Complete     | Activity Logs in sidebar, Business section in More                    |
| Routes Exist         | ✅ Complete     | All routes verified: revenue, insurance, subscription, platform pages |
| Dashboard Charts     | ✅ Complete     | 4 analytics charts implemented                                        |
| User Role Display    | ✅ Complete     | Users page shows roles with badges                                    |
| Tenant Data Display  | ✅ Complete     | Tenants page shows all tenant info                                    |
| **Data Loading**     | ❌ **BLOCKED**  | **Missing SUPABASE_SERVICE_ROLE_KEY**                                 |
| Currency (PKR)       | ⚠️ Needs Update | Manual changes needed in 3-4 files                                    |

---

## 🎯 Next Steps (In Order)

1. **URGENT:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env`
2. Restart your dev server
3. Test Debug Data page
4. Once data loads, update currency to PKR in the files mentioned above
5. Remove the Debug Data link from navigation (optional, once everything works)

---

## 📝 Notes

- **Business Section IS there** - Click "More" button in sidebar → You'll see Business section with Revenue, Insurance, Subscription
- **Platform Section IS there** - Click "More" button → Platform section with all admin links
- **Users DO show roles** - The users page displays role badges (super_admin, admin, manager, etc.)
- **Data is NOT loading** because the service role key is missing - this is the ONLY blocker!

---

## 🆘 If Still Having Issues

1. Check browser console for errors
2. Check server logs for Supabase connection errors
3. Verify the service role key is correctly added to `.env` (no quotes issues, no extra spaces)
4. Make sure you restarted the dev server after adding the key
5. Go to Debug Data page and screenshot what you see

---

## Current .env Structure

Your `.env` should look like this:

```env
SUPABASE_PROJECT_ID="frfgmbgzildtfchtmchr"
SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmdtYmd6aWxkdGZjaHRtY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2Nzg4NzEsImV4cCI6MjA5MzI1NDg3MX0.NosVCB74WEpoOLcioOWO731wcxAuZf7Dkv3Eyj9O5bY"
SUPABASE_URL="https://frfgmbgzildtfchtmchr.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="PUT_YOUR_SERVICE_ROLE_KEY_HERE"
VITE_SUPABASE_PROJECT_ID="frfgmbgzildtfchtmchr"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZyZmdtYmd6aWxkdGZjaHRtY2hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2Nzg4NzEsImV4cCI6MjA5MzI1NDg3MX0.NosVCB74WEpoOLcioOWO731wcxAuZf7Dkv3Eyj9O5bY"
VITE_SUPABASE_URL="https://frfgmbgzildtfchtmchr.supabase.co"
```
