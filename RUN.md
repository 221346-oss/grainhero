# 🚀 GrainHero Project Kaise Chalaye

## Option 1: Bun se (Recommended - Fast ⚡)

### Step 1: Bun Install Karo (agar nahi hai)
```powershell
# PowerShell mein run karo:
irm bun.sh/install.ps1 | iex
```

### Step 2: Dependencies Install Karo
```powershell
cd "c:\1. Shift this in D\Internship NASTP\Shaheer Startup\GrainHero Supabase"
bun install
```

### Step 3: Dev Server Start Karo
```powershell
bun run dev
```

---

## Option 2: NPM se (agar Bun nahi hai)

### Step 1: Node.js Check Karo
```powershell
node --version
# v18+ chahiye
```

### Step 2: Dependencies Install Karo
```powershell
cd "c:\1. Shift this in D\Internship NASTP\Shaheer Startup\GrainHero Supabase"
npm install
```

### Step 3: Dev Server Start Karo
```powershell
npm run dev
```

---

## ✅ Project Start Ho Gaya!

Terminal mein dikhega:
```
VITE v6.1.2  ready in 823 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**Browser kholo:** `http://localhost:3000`

---

## 🧪 Changes Verify Karne Ke Liye

### Issue 1+2: Grand Total (Step 1 mein)
1. Browser: `http://localhost:3000/checkout`
2. Koi plan select karo (e.g., Professional)
3. IoT quantity change karo (e.g., 2)
4. **Neeche emerald-gradient card dikhega** with:
   - Monthly subscription: Rs. X
   - IoT setup: Rs. Y
   - **Total due today: Rs. X+Y** (bold, big)

### Issue 3a: Auto-redirect
1. **Incognito window** kholo
2. Go to: `http://localhost:3000/checkout/success?session_id=test`
3. Spinner dikhega → auto-redirect to signup

### Issue 3b: Plan Limits
1. Login karo
2. Go to: `http://localhost:3000/silos`
3. Agar plan limit reach ho chuki (check database):
   - "New silo" button **disabled** hoga
   - Amber warning banner dikhega

---

## 🛠️ Troubleshooting

### Error: "Cannot find module '@tanstack/react-router'"
**Fix:** Dependencies install nahi hue
```powershell
bun install
# ya
npm install
```

### Error: "Port 3000 is already in use"
**Fix:** Koi aur app 3000 port use kar raha
```powershell
# Kill existing process
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

# Ya different port use karo
bun run dev --port 3001
```

### Error: "SUPABASE_URL not found"
**Fix:** Environment variables missing hain
1. Check `.env` file exist karta hai
2. Lovable dashboard se keys copy karo

### Page blank dikhta hai / White screen
**Fix:**
1. Browser console kholo (F12)
2. Errors check karo
3. Hard refresh: `Ctrl + Shift + R`

### Changes nahi dikh rahe
**Fix:**
1. Dev server restart karo: `Ctrl + C` then `bun run dev`
2. Browser cache clear: `Ctrl + Shift + Delete`
3. Hard refresh: `Ctrl + Shift + R`

---

## 📝 Useful Commands

```powershell
# Dev server start (hot reload)
bun run dev

# Production build
bun run build

# Build preview (test production build locally)
bun run preview

# Lint check
bun run lint

# Code format
bun run format
```

---

## 🗂️ Files Changed (Recent)

1. **src/routes/checkout.index.tsx**
   - Grand total card added on Step 1 (line ~340)
   - Review step expanded (line ~420)

2. **src/routes/checkout.success.tsx**
   - Auto-redirect for signed-out users (line ~225)
   - Removed popup card

3. **src/hooks/usePlanLimits.ts** (NEW)
   - Plan limit checking hook

4. **src/routes/_authenticated/silos.tsx**
   - Plan limit enforcement on "New silo" button

5. **src/routes/_authenticated/warehouses.tsx**
   - Plan limit enforcement on "New warehouse" button

---

## 🔥 Quick Start (Single Command)

```powershell
cd "c:\1. Shift this in D\Internship NASTP\Shaheer Startup\GrainHero Supabase" ; bun install ; bun run dev
```

---

## 📸 Expected Results

### Checkout Step 1:
![Grand total card visible below IoT sensor card]

### Silos Page (limit reached):
![Disabled "New silo" button + amber warning banner]

### Success Page (signed out):
![Spinner → auto-redirect to signup]
