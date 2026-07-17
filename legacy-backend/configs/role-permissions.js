// configs/role-permissions.js
const { USER_ROLES } = require('./enum');

// Define permissions for each role
const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // Tenant Management (Admin owns the tenant)
    "tenant.manage",
    "users.manage",

    // Warehouse Management (all their warehouses)
    "warehouse.manage",
    "warehouse.create",
    "warehouse.update",
    "warehouse.delete",
    "warehouse.view",
    "warehouse.read",

    // Full Grain Management
    "batch.manage",
    "batch.create",
    "batch.update",
    "batch.delete",
    "batch.view",
    "batch.dispatch",
    "silo.manage",
    "silo.create",
    "silo.update",
    "silo.delete",
    "silo.view",
    "silo.configure",

    // Sensor & IoT Management
    "sensor.manage",
    "sensor.bulk_ingest",
    "sensor.configure",

    // AI & Analytics
    "ai.enable",
    "ai.configure",
    "advisories.create",
    "advisories.manage",

    // Alerts & Notifications
    "alerts.view",
    "alerts.manage",
    "notifications.manage",

    // Business Operations
    "buyers.manage",
    "insurance.view",
    "insurance.manage",
    "payment.manage",

    // System Control
    "actuator.control",
    "actuator.autoFanOn.enable",
    "thresholds.configure",
    "system.override",

    // Reporting
    "reports.generate",
    "reports.view",
    "pdf.generate",
  ],

  [USER_ROLES.MANAGER]: [
    // Warehouse Management (their assigned warehouse only)
    "warehouse.view",
    "warehouse.read",

    // Grain Operations Management (within their warehouse)
    "batch.view",
    "batch.manage",
    "batch.create",
    "batch.dispatch",
    "silo.view",
    "silo.monitor",

    // Team Management (technicians in their warehouse)
    "technician.view",
    "technician.assign",
    "technician.read",

    // Quality & Traceability
    "traceability.manage",
    "quality.assess",

    // Sensor Monitoring
    "sensor.view",
    "sensor.bulk_ingest",

    // Actuator Control (within policy)
    "actuator.control",
    "actuator.read",

    // Alerts & Advisory
    "alerts.view",
    "alerts.acknowledge",
    "advisories.view",
    "advisories.create",

    // Maintenance & Incidents
    "maintenance.view",
    "maintenance.create",
    "incidents.view",
    "incidents.create",

    // Business Operations
    "buyers.view",
    "buyers.manage",
    "insurance.view",
    "insurance.create",
    "payment.view",

    // Reporting
    "reports.view",
    "reports.generate",
    "pdf.generate",

    // Dashboard & Analytics (warehouse-specific)
    "dashboard.view",
    "analytics.view",

    // Threshold Configuration (limited, if permitted by admin)
    "thresholds.view",
  ],

  [USER_ROLES.TECHNICIAN]: [
    // Warehouse Access (their assigned warehouse only)
    "warehouse.view",
    "warehouse.read",

    // IoT & Sensor Management (silos in their warehouse)
    "sensor.view",
    "sensor.calibrate",
    "sensor.maintain",
    "sensor.bulk_ingest",

    // Equipment & Infrastructure
    "actuator.control",
    "actuator.maintain",
    "silo.inspect",
    "silo.maintain",
    "silo.view",

    // Monitoring & Alerts (their warehouse silos)
    "alerts.view",
    "alerts.acknowledge",
    "environmental.monitor",
    "iot.troubleshoot",

    // Basic Operations
    "batch.view",
    "maintenance.view",
    "maintenance.create",
    "incidents.view",
    "incidents.create",

    // Mobile & Field Work
    "mobile.access",
    "field.inspect",
    "notifications.view",

    // Dashboard & Analytics
    "dashboard.view",
    "analytics.view",

    // User Profile Management
    "user.read",
    "user.update",
  ],
};

// Feature categories that different roles can access
const ROLE_FEATURE_ACCESS = {
  [USER_ROLES.SUPER_ADMIN]: "*", // Full access to everything

  [USER_ROLES.ADMIN]: [
    "user_management",
    "system_configuration",
    "advanced_analytics",
    "ai_predictions",
    "insurance_management",
    "payment_processing",
    "subscription_management",
    "feature_toggles",
    "bulk_operations",
    "data_export",
    "system_overrides",
  ],

  [USER_ROLES.SUPER_ADMIN]: [
    // System Administration
    'system.manage',
    'system.monitor',
    'system.configure',

    // Plan Management (Super Admin manages all plans)
    'plan.create',
    'plan.read',
    'plan.update',
    'plan.delete',

    // User Management (Global - can see all admins and their teams)
    'user.create',
    'user.read',
    'user.update',
    'user.delete',
    'user.manage',

    // Revenue Management
    'revenue.read',
    'revenue.manage',

    // Analytics (Global)
    'analytics.global',
    'analytics.read',

    // Security
    'security.manage',
    'security.audit',

    // All other permissions
    'admin.all',
    'manager.all',
    'technician.all'
  ],

  [USER_ROLES.ADMIN]: [
    // Plan Management (Admin buys and manages their plan)
    'plan.read.own',
    'plan.manage.own',

    // User Management (Admin manages their team - managers and technicians)
    'user.create.team',
    'user.read.team',
    'user.update.team',
    'user.delete.team',

    // Grain Management
    'grain.create',
    'grain.read',
    'grain.update',
    'grain.delete',
    'grain.manage',

    // Batch Management
    'batch.create',
    'batch.read',
    'batch.update',
    'batch.delete',
    'batch.manage',

    // Silo Management
    'silo.create',
    'silo.read',
    'silo.update',
    'silo.delete',
    'silo.manage',

    // Buyer Management
    'buyer.create',
    'buyer.read',
    'buyer.update',
    'buyer.delete',
    'buyer.manage',

    // IoT Management
    'sensor.create',
    'sensor.read',
    'sensor.update',
    'sensor.delete',
    'sensor.manage',

    // Actuator Management
    'actuator.create',
    'actuator.read',
    'actuator.update',
    'actuator.delete',
    'actuator.manage',

    // Analytics (Admin level)
    'analytics.read',
    'analytics.admin',

    // Reports
    'report.create',
    'report.read',
    'report.update',
    'report.delete',

    // Insurance
    'insurance.create',
    'insurance.read',
    'insurance.update',
    'insurance.delete',

    // Payments
    'payment.create',
    'payment.read',
    'payment.update',
    'payment.delete',

    // Settings
    'settings.read',
    'settings.update',

    // All manager and technician permissions
    'manager.all',
    'technician.all'
  ],

  [USER_ROLES.MANAGER]: [
    "grain_intake",
    "batch_management",
    "traceability",
    "basic_analytics",
    "reporting",
    "buyer_management",
    "dispatch_management",
    "insurance_claims",
    "mobile_access",
    // Grain Management (Read/Update only)
    'grain.read',
    'grain.update',

    // Batch Management (Read/Update only)
    'batch.read',
    'batch.update',

    // Silo Management (Read only)
    'silo.read',

    // Buyer Management (Read/Update only)
    'buyer.read',
    'buyer.update',

    // IoT Monitoring
    'sensor.read',
    'sensor.monitor',

    // Actuator Control
    'actuator.read',
    'actuator.control',

    // Analytics (Read only)
    'analytics.read',

    // Reports (Read/Create)
    'report.read',
    'report.create',

    // Quality Management
    'quality.read',
    'quality.update',

    // Dispatch Management
    'dispatch.create',
    'dispatch.read',
    'dispatch.update',

    // Team Management (Technicians only)
    'technician.read',
    'technician.assign',

    // All technician permissions
    'technician.all'
  ],

  [USER_ROLES.TECHNICIAN]: [
    "iot_monitoring",
    "sensor_management",
    "environmental_control",
    "maintenance_logs",
    "field_inspections",
    "alert_handling",
    "mobile_access",
    "basic_reporting",
  ],
};

// Hierarchical permissions - higher roles inherit lower role permissions
const ROLE_HIERARCHY = {
  [USER_ROLES.SUPER_ADMIN]: [
    USER_ROLES.ADMIN,
    USER_ROLES.MANAGER,
    USER_ROLES.TECHNICIAN,
  ],
  [USER_ROLES.ADMIN]: [
    USER_ROLES.MANAGER,
    USER_ROLES.TECHNICIAN,
  ],
  [USER_ROLES.MANAGER]: [
    USER_ROLES.TECHNICIAN,
  ],
  [USER_ROLES.TECHNICIAN]: [],
};

// Permission inheritance system
const PERMISSION_INHERITANCE = {
  [USER_ROLES.SUPER_ADMIN]: [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN],
  [USER_ROLES.ADMIN]: [USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN],
  [USER_ROLES.MANAGER]: [USER_ROLES.TECHNICIAN],
  [USER_ROLES.TECHNICIAN]: [],
};

// Get all permissions for a role including inherited ones
const getAllPermissions = (role) => {
  let permissions = [...(ROLE_PERMISSIONS[role] || [])];

  // Add inherited permissions
  const inheritsFrom = ROLE_HIERARCHY[role] || [];
  inheritsFrom.forEach((inheritedRole) => {
    permissions = [...permissions, ...(ROLE_PERMISSIONS[inheritedRole] || [])];
  });

  // Remove duplicates
  return [...new Set(permissions)];
};

// Check if role has specific permission
const hasPermission = (role, permission) => {
  if (role === USER_ROLES.SUPER_ADMIN) return true;

  const allPermissions = getAllPermissions(role);
  return allPermissions.includes(permission);
};

// Helper function to get all permissions for a role
function getRolePermissions(userRole) {
  if (!userRole) return [];

  const allPermissions = new Set();

  // Add direct permissions
  const directPermissions = ROLE_PERMISSIONS[userRole] || [];
  directPermissions.forEach(permission => allPermissions.add(permission));

  // Add inherited permissions
  const inheritedRoles = PERMISSION_INHERITANCE[userRole] || [];
  inheritedRoles.forEach(role => {
    const inheritedPermissions = ROLE_PERMISSIONS[role] || [];
    inheritedPermissions.forEach(permission => allPermissions.add(permission));
  });

  return Array.from(allPermissions);
}

// Helper function to check if user can manage another user
function canManageUser(managerRole, targetUserRole) {
  const roleHierarchy = {
    [USER_ROLES.SUPER_ADMIN]: 4,
    [USER_ROLES.ADMIN]: 3,
    [USER_ROLES.MANAGER]: 2,
    [USER_ROLES.TECHNICIAN]: 1
  };

  const managerLevel = roleHierarchy[managerRole] || 0;
  const targetLevel = roleHierarchy[targetUserRole] || 0;

  return managerLevel > targetLevel;
}

// Helper function to check tenant access
function canAccessTenant(userRole, userTenantId, targetTenantId) {
  // Super admin can access all tenants
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return true;
  }

  // Other roles can only access their own tenant
  return userTenantId && userTenantId.toString() === targetTenantId.toString();
}

module.exports = {
  ROLE_PERMISSIONS,
  PERMISSION_INHERITANCE,
  hasPermission,
  getRolePermissions,
  canManageUser,
  canAccessTenant
};