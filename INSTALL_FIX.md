# 🔧 Build Error Fix Guide

## ❌ Problem: `npm run build` nahi chal raha

**Error:** `'vite' is not recognized as an internal or external command`

**Reason:** Dependencies (`node_modules`) install nahi hue hain.

---

## ✅ Solution: Dependencies Install Karo

### Option 1: NPM se (Slow but reliable - 5-10 minutes)

```powershell
# Open PowerShell as Administrator
# Navigate to project
cd "c:\1. Shift this in D\Internship NASTP\Shaheer Startup\GrainHero Supabase"

# Clear npm cache (optional but recommended)
npm cache clean --force

# Install dependencies
npm install

# This will take 5-10 minutes - DON'T CLOSE THE WINDOW
# You'll see progress like:
# npm WARN deprecated ...
# added 1523 packages in 8m
```

**After install completes:**
```powershell
npm run build
```

---

### Option 2: Bun se (Fast ⚡ - 30 seconds)

**Step 1: Install Bun**
```powershell
# Open PowerShell as Administrator
irm bun.sh/install.ps1 | iex

# Close and reopen PowerShell
```

**Step 2: Install Dependencies**
```powershell
cd "c:\1. Shift this in D\Internship NASTP\Shaheer Startup\GrainHero Supabase"
bun install
# Takes only 30-60 seconds!
```

**Step 3: Build**
```powershell
bun run build
```

---

### Option 3: Yarn se (Medium speed - 2-3 minutes)

```powershell
# Install yarn globally (if not installed)
npm install -g yarn

# Navigate to project
cd "c:\1. Shift this in D\Internship NASTP\Shaheer Startup\GrainHero Supabase"

# Install dependencies
yarn install

# Build
yarn build
```

---

## 🚦 Install Status Check Karo

### Check if node_modules exist:
```powershell
Test-Path "node_modules"
# Should return: True
```

### Check if vite installed:
```powershell
Test-Path "node_modules/.bin/vite.cmd"
# Should return: True
```

### Check package count:
```powershell
(Get-ChildItem "node_modules" -Directory).Count
# Should show ~1500+ folders
```

---

## ⚠️ Common Issues During Install

### Issue 1: "EPERM: operation not permitted"
**Fix:** Close VS Code, run PowerShell as Administrator

### Issue 2: "ENOENT: no such file or directory"
**Fix:** 
```powershell
# Delete node_modules and package-lock.json
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Reinstall
npm install
```

### Issue 3: "Network timeout"
**Fix:**
```powershell
# Increase timeout
npm install --fetch-timeout=60000

# Or use different registry
npm install --registry=https://registry.npmmirror.com
```

### Issue 4: "Disk space" error
**Fix:** Free up at least 5GB space on C: drive

---

## 📊 Installation Progress (what to expect)

### NPM Install Timeline:
```
0:00 - npm install started
0:30 - Downloading packages... (300/1500)
2:00 - Downloading packages... (800/1500)
4:00 - Building native modules...
6:00 - Finalizing...
8:00 - ✅ Done! added 1523 packages
```

**Don't panic if it seems stuck!** npm is working in background.

### Bun Install Timeline:
```
0:00 - bun install started
0:15 - Resolving dependencies...
0:25 - Downloading...
0:30 - ✅ Done! installed 1523 packages
```

---

## 🎯 After Successful Install

### Test if it worked:
```powershell
# Try building
npm run build

# Expected output:
# > build
# > vite build
# 
# vite v6.1.2 building for production...
# ✓ 234 modules transformed.
# dist/client/... 
# ✓ built in 12.34s
```

### Run dev server:
```powershell
npm run dev

# Expected:
# VITE v6.1.2  ready in 823 ms
# ➜  Local:   http://localhost:3000/
```

---

## 🔄 Alternative: Use Lovable Cloud Build

Agar local build nahi ho raha, **Lovable dashboard pe push karo** — woh automatically build karega:

1. Git commit karo:
   ```powershell
   git add .
   git commit -m "Added grand total and plan limits"
   git push origin main
   ```

2. Lovable dashboard pe check karo — automatic build trigger hoga
3. Live preview link se test karo

---

## 📝 Install Command Reference

| Command | Speed | Reliability |
|---------|-------|-------------|
| `npm install` | 🐌 Slow (8-10 min) | ✅ Most reliable |
| `bun install` | ⚡ Fast (30 sec) | ✅ Reliable (if Bun installed) |
| `yarn install` | 🚀 Medium (2-3 min) | ✅ Reliable |
| `pnpm install` | 🚀 Fast (1-2 min) | ✅ Reliable (if pnpm installed) |

---

## 🆘 Still Not Working?

1. **Check Node.js version:**
   ```powershell
   node --version
   # Should be v18 or higher
   ```

2. **Reinstall Node.js:** Download from https://nodejs.org/

3. **Try different terminal:**
   - Git Bash
   - Command Prompt (CMD)
   - Windows Terminal

4. **Contact me with:**
   - Screenshot of error
   - Output of: `node --version`
   - Output of: `npm --version`
