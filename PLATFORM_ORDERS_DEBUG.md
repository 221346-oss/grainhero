# Platform Orders Page Debugging Guide

## Issue
Cannot access `http://localhost:8080/platform/orders`

## Possible Causes & Solutions

### 1. **Role Permission Issue**
The page requires `super_admin` role. 

**Check your role:**
1. Open browser console (F12)
2. Run this query in the Supabase client:
```javascript
const { data } = await supabase.from('user_roles').select('*').eq('user_id', (await supabase.auth.getUser()).data.user.id);
console.log('Your roles:', data);
```

**Expected output:** You should see `role: "super_admin"` in the results.

**If not super_admin:**
- Run this SQL in Supabase SQL Editor:
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<your-user-id>', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### 2. **Build/Compilation Error**
The page might have a TypeScript or import error.

**Check:**
1. Look at your terminal where the dev server is running
2. Check for any TypeScript errors or warnings
3. Look for failed imports

**Common errors fixed:**
- ✅ Removed unused `assignmentOrder` state variable
- ✅ Removed unused `TechnicianAssignmentDialog` import

### 3. **Browser Console Error**
**Check browser console (F12) for errors like:**
- Network errors (500, 403, 401)
- React errors
- Supabase auth errors

### 4. **Page Route Configuration**
**Verify the route is accessible:**
```
File: src/routes/_authenticated/platform.orders.tsx
Route: /_authenticated/platform/orders
URL: http://localhost:8080/platform/orders
```

### 5. **Database Connection**
The page calls `listAllHardwareOrders()` which queries the database.

**Check:**
- Supabase is running
- Database connection is working
- `hardware_orders` table exists

## Quick Tests

### Test 1: Can you access other platform pages?
Try: `http://localhost:8080/platform` or `http://localhost:8080/platform/reporting`

If YES → Issue is specific to orders page
If NO → Issue is with platform section access (role-based)

### Test 2: Check if redirects are working
The `_authenticated/route.tsx` has this redirect:
```typescript
"/orders": "/platform/orders"
```

Try visiting: `http://localhost:8080/orders`
- Should redirect to `/platform/orders` if you're super_admin
- Should block if you're not

### Test 3: Check function access
Open browser console and run:
```javascript
// This will tell you if the function is accessible
fetch('http://localhost:8080/api/listAllHardwareOrders')
  .then(r => r.json())
  .then(data => console.log('Orders data:', data))
  .catch(err => console.error('Error:', err));
```

## Error Messages Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| "Forbidden" | You don't have super_admin role | Add super_admin role to your user |
| 401 Unauthorized | Not logged in | Go to /auth/login |
| 404 Not Found | Route doesn't exist | Check file exists at correct path |
| 500 Server Error | Database or function error | Check terminal/console for details |
| Blank page | React render error | Check browser console |

## Next Steps

Please provide:
1. What do you see on the page? (blank, error message, loading forever?)
2. Any errors in browser console (F12 → Console tab)
3. Any errors in terminal where dev server is running
4. Your user's role (run the role check query above)
