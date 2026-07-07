// lib/auth-utils.ts

import { User } from "@/app/[locale]/providers"



export interface RoleHierarchy {
  [key: string]: number
}

export const ROLE_HIERARCHY: RoleHierarchy = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  technician: 1
}

/**
 * Check if a user can manage another user based on role hierarchy
 */
export function canManageUser(managerRole: string, targetRole: string): boolean {
  const managerLevel = ROLE_HIERARCHY[managerRole] || 0
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0
  return managerLevel > targetLevel
}

/**
 * Check if user has access to a specific role-based route
 */
export function hasRouteAccess(userRole: string, route: string): boolean {
  const routePermissions: { [key: string]: string[] } = {
    // Super Admin only routes
    '/admin-management': ['super_admin'],
    '/plan-management': ['super_admin'],
    '/system-health': ['super_admin'],
    '/global-analytics': ['super_admin'],
    '/security-center': ['super_admin'],
    '/revenue-management': ['super_admin'],
    '/system-logs': ['super_admin'],
    '/server-monitoring': ['super_admin'],
    
    // Admin and Super Admin routes
    '/users': ['super_admin', 'admin'],
    '/settings': ['super_admin', 'admin'],

    '/warehouses': ['super_admin', 'admin'], // Warehouse management
    
    // Manager, Admin, and Super Admin routes
    '/grain-batches': ['super_admin', 'admin', 'manager'],
    '/buyers': ['super_admin', 'admin', 'manager'],
    '/traceability': ['super_admin', 'admin', 'manager'],
    '/ai-predictions': ['super_admin', 'admin', 'manager'],
    '/risk-assessment': ['super_admin', 'admin', 'manager'],
    '/spoilage-analysis': ['super_admin', 'admin', 'manager'],
    '/reports': ['super_admin', 'admin', 'manager'],
    '/payments': ['super_admin', 'admin', 'manager'],
    '/team-management': ['super_admin', 'admin', 'manager'], // Manager can manage technicians
    
    // All authenticated users
    '/dashboard': ['super_admin', 'admin', 'manager', 'technician'],
    '/sensors': ['super_admin', 'admin', 'technician'],
    '/environmental': ['super_admin', 'admin', 'manager', 'technician'],
    '/grain-alerts': ['super_admin', 'admin', 'manager', 'technician'],
    '/silos': ['super_admin', 'admin', 'manager', 'technician'],
    '/actuators': ['super_admin', 'admin', 'manager', 'technician'],
    '/maintenance': ['super_admin', 'admin', 'manager', 'technician'],
    '/incidents': ['super_admin', 'admin', 'manager', 'technician'],
    '/profile': ['super_admin', 'admin', 'manager', 'technician'],
    '/notifications': ['super_admin', 'admin', 'manager', 'technician']
  }
  
  const allowedRoles = routePermissions[route] || []
  return allowedRoles.includes(userRole)
}

/**
 * Get the appropriate dashboard redirect based on user role
 */
export function getDashboardRedirect(userRole: string): string {
  switch (userRole) {
    case 'super_admin':
      return '/dashboard' // Super admin sees their own dashboard
    case 'admin':
      return '/dashboard' // Admin sees customer dashboard
    case 'manager':
      return '/dashboard' // Manager sees manager dashboard
    case 'technician':
      return '/dashboard' // Technician sees technician dashboard
    default:
      return '/dashboard'
  }
}

/**
 * Get available roles that the current user can create/manage
 */
export function getAvailableRolesForCreation(userRole: string): string[] {
  switch (userRole) {
    case 'super_admin':
      return ['admin', 'manager', 'technician']
    case 'admin':
      return ['manager', 'technician']
    case 'manager':
      return [] // Managers cannot create users
    case 'technician':
      return [] // Technicians cannot create users
    default:
      return []
  }
}

/**
 * Check if user can access customer data
 */
export function canAccessCustomer(userRole: string, userCustomerId?: string, targetCustomerId?: string): boolean {
  // Super admin can access all customers
  if (userRole === 'super_admin') {
    return true
  }
  
  // Other roles can only access their own customer
  if (!userCustomerId || !targetCustomerId) {
    return false
  }
  
  return userCustomerId === targetCustomerId
}

/**
 * Get user-friendly role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleNames: { [key: string]: string } = {
    'super_admin': 'Super Admin',
    'admin': 'Admin',
    'manager': 'Manager',
    'technician': 'Technician'
  }
  
  return roleNames[role] || role
}

/**
 * Get role badge color class
 */
export function getRoleBadgeColor(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'bg-red-100 text-red-800'
    case 'admin':
      return 'bg-blue-100 text-blue-800'
    case 'manager':
      return 'bg-green-100 text-green-800'
    case 'technician':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Check if user has permission for a specific action
 */
export function hasPermission(userRole: string, permission: string): boolean {
  const permissions: { [key: string]: string[] } = {
    'user.create': ['super_admin', 'admin'],
    'user.read': ['super_admin', 'admin'],
    'user.update': ['super_admin', 'admin'],
    'user.delete': ['super_admin', 'admin'],
    'customer.manage': ['super_admin'],
    'customer.read': ['super_admin', 'admin'],
    'customer.update': ['super_admin', 'admin'],
    'system.manage': ['super_admin'],
    'system.monitor': ['super_admin'],
    'warehouse.manage': ['super_admin', 'admin'],
    'warehouse.create': ['super_admin', 'admin'],
    'warehouse.update': ['super_admin', 'admin'],
    'warehouse.delete': ['super_admin', 'admin'],
    'warehouse.view': ['super_admin', 'admin', 'manager', 'technician'],
    'warehouse.read': ['super_admin', 'admin', 'manager', 'technician'],
    'grain.manage': ['super_admin', 'admin'],
    'grain.read': ['super_admin', 'admin', 'manager', 'technician'],
    'grain.update': ['super_admin', 'admin', 'manager'],
    'batch.manage': ['super_admin', 'admin', 'manager'],
    'batch.read': ['super_admin', 'admin', 'manager', 'technician'],
    'batch.update': ['super_admin', 'admin', 'manager'],
    'sensor.manage': ['super_admin', 'admin'],
    'sensor.read': ['super_admin', 'admin', 'technician'],
    'sensor.update': ['super_admin', 'admin'],
    'technician.view': ['super_admin', 'admin', 'manager'],
    'technician.assign': ['super_admin', 'admin', 'manager'],
    'technician.read': ['super_admin', 'admin', 'manager'],
    'actuator.control': ['super_admin', 'admin', 'manager', 'technician'],
    'actuator.read': ['super_admin', 'admin', 'manager', 'technician'],
    'maintenance.create': ['super_admin', 'admin', 'manager', 'technician'],
    'maintenance.view': ['super_admin', 'admin', 'manager', 'technician'],
    'incidents.create': ['super_admin', 'admin', 'manager', 'technician'],
    'incidents.view': ['super_admin', 'admin', 'manager', 'technician'],
    'reports.create': ['super_admin', 'admin', 'manager'],
    'reports.read': ['super_admin', 'admin', 'manager', 'technician'],
    'analytics.global': ['super_admin'],
    'analytics.customer': ['super_admin', 'admin'],
    'analytics.read': ['super_admin', 'admin', 'manager', 'technician']
  }
  
  const allowedRoles = permissions[permission] || []
  return allowedRoles.includes(userRole)
}

/**
 * Validate user session and redirect if necessary
 */
export function validateUserSession(user: User | null, currentPath: string): { isValid: boolean; redirectTo?: string } {
  if (!user) {
    return { isValid: false, redirectTo: '/auth/login' }
  }
  
  // Check if user has access to current route
  if (!hasRouteAccess(user.role, currentPath)) {
    return { isValid: false, redirectTo: '/not-allowed' }
  }
  
  return { isValid: true }
}

/**
 * Get user's customer information for display
 */
export function getUserCustomerInfo(): { name: string; type: 'owned' | 'member' | 'none' } {
  // This would need to be implemented based on your data structure
  // For now, returning placeholder
  return { name: 'Default Customer', type: 'member' }
}

/**
 * Get appropriate sidebar navigation items based on user role
 */
export function getSidebarNavigation(userRole: string): Array<{ name: string; label: string; href: string; icon: string; roles: string[] }> {
  const allNavItems = [
    { name: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', roles: ['super_admin', 'admin', 'manager', 'technician'] },
    { name: 'warehouses', label: 'Warehouses', href: '/warehouses', icon: 'Warehouse', roles: ['super_admin', 'admin', 'manager', 'technician'] },
    { name: 'silos', label: 'Silos', href: '/silos', icon: 'Container', roles: ['super_admin', 'admin', 'manager', 'technician'] },
    { name: 'grain-batches', label: 'Grain Batches', href: '/grain-batches', icon: 'Package', roles: ['super_admin', 'admin', 'manager'] },
    { name: 'sensors', label: 'Sensors', href: '/sensors', icon: 'Smartphone', roles: ['super_admin', 'admin', 'technician'] },
    { name: 'actuators', label: 'Actuators', href: '/actuators', icon: 'Zap', roles: ['super_admin', 'admin', 'manager', 'technician'] },
    { name: 'grain-alerts', label: 'Alerts', href: '/grain-alerts', icon: 'Bell', roles: ['super_admin', 'admin', 'manager', 'technician'] },
    { name: 'maintenance', label: 'Maintenance', href: '/maintenance', icon: 'Wrench', roles: ['super_admin', 'admin', 'manager', 'technician'] },
    { name: 'incidents', label: 'Incidents', href: '/incidents', icon: 'AlertTriangle', roles: ['super_admin', 'admin', 'manager', 'technician'] },
    { name: 'team-management', label: 'Team Management', href: '/team-management', icon: 'Users', roles: ['super_admin', 'admin', 'manager'] },
    { name: 'users', label: 'Users', href: '/users', icon: 'UserCog', roles: ['super_admin', 'admin'] },
    { name: 'reports', label: 'Reports', href: '/reports', icon: 'FileText', roles: ['super_admin', 'admin', 'manager'] },
    { name: 'admin-management', label: 'Customer Management', href: '/admin-management', icon: 'Building2', roles: ['super_admin'] },
    { name: 'settings', label: 'Settings', href: '/settings', icon: 'Settings', roles: ['super_admin', 'admin'] }
  ]
  
  return allNavItems.filter(item => item.roles.includes(userRole))
}
