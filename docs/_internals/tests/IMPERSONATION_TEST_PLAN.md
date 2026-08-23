# Impersonation Feature Test Plan

## Current Issues

1. **Storage mismatch**: Functions use in-memory Map, but page-scope looks in activity_logs table
2. **In-memory storage**: Won't persist across server restarts or work in distributed environments

## Test Scenarios

### 1. Super Admin Tests

**As a super admin, I should be able to:**

- See the "View as" button only for admin users
- Click "View as" and see impersonation banner
- Navigate to different pages and see admin's view (not super admin view)
- Stop impersonation and return to super admin view

### 2. Admin View Tests

**When impersonating an admin, I should see:**

- Admin's dashboard with their tenant data only
- Admin's sidebar navigation (not platform/\* routes)
- Admin's permissions and restrictions
- Only data for that admin's tenant/organization

### 3. Data Visibility Tests

**Data should change based on context:**

- **Super Admin**: Platform-wide aggregated data
- **Impersonated Admin**: Only that admin's tenant data

### 4. Navigation Tests

**URLs should reflect the correct context:**

- Super admin: `/platform/users`, `/analytics`, etc.
- Impersonated admin: `/dashboard`, `/silos`, `/warehouses`, etc.

### 5. Permission Tests

**Permissions should reflect the impersonated user:**

- Admin can't see platform routes
- Admin can't access other tenants' data
- Admin has appropriate CRUD permissions for their tenant

## Testing Workflow

1. **Setup Test Users**:
   - Super admin user (you)
   - Admin user for tenant A
   - Admin user for tenant B
   - Regular users under each admin

2. **Test Impersonation Flow**:
   - Login as super admin
   - Go to `/platform/users`
   - Click "View as" for Admin A
   - Verify banner shows "Viewing as [Admin A]"
   - Navigate to `/dashboard` - should show Admin A's tenant data
   - Try to access `/platform/users` - should redirect or show error
   - Stop impersonation - return to super admin view

3. **Test Data Isolation**:
   - Create test data for each tenant
   - Verify impersonation shows only relevant tenant data

## Quick Test Commands

```bash
# Check current user roles
npx supabase sql --file - <<'EOF'
SELECT p.email, p.name, ur.role
FROM profiles p
LEFT JOIN user_roles ur ON p.id = ur.user_id
ORDER BY ur.role, p.email;
EOF

# Check activity logs (if used for impersonation)
npx supabase sql --file - <<'EOF'
SELECT * FROM activity_logs
WHERE category = 'impersonation'
ORDER BY created_at DESC
LIMIT 10;
EOF
```
