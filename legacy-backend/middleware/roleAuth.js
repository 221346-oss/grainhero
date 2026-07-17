const { hasPermission, canManageUser, canAccessTenant } = require('../configs/role-permissions');
const { USER_ROLES } = require('../configs/enum');

// Middleware to check if user has specific permission
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const userRole = req.user.role;
    
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ 
        error: `Access denied. Required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS',
        user_role: userRole,
        required_permission: permission
      });
    }

    next();
  };
};

// Middleware to check if user can manage another user
const requireUserManagement = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const managerRole = req.user.role;
  const targetUserId = req.params.userId || req.body.userId;
  
  // If no target user specified, allow (for listing users)
  if (!targetUserId) {
    return next();
  }

  // Get target user role from request body or params
  const targetUserRole = req.body.role || req.params.role;
  
  if (targetUserRole && !canManageUser(managerRole, targetUserRole)) {
    return res.status(403).json({ 
      error: `Cannot manage user with role: ${targetUserRole}`,
      code: 'INSUFFICIENT_ROLE_HIERARCHY',
      manager_role: managerRole,
      target_role: targetUserRole
    });
  }

  next();
};

// Middleware to check tenant access
const requireTenantAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role;

  // Super admin can access all admins and their teams
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return next();
  }

  // Determine admin_id based on user role
  let userAdminId;
  
  if (userRole === USER_ROLES.ADMIN) {
    // Admin users are their own admin
    userAdminId = req.user._id;
  } else if (userRole === USER_ROLES.MANAGER || userRole === USER_ROLES.TECHNICIAN) {
    // Managers and technicians belong to their admin
    userAdminId = req.user.admin_id;
  }

  if (!userAdminId) {
    return res.status(400).json({ 
      error: 'Admin ID required',
      code: 'ADMIN_REQUIRED'
    });
  }

  // Set the admin_id in the request for use by route handlers
  req.user.admin_id = userAdminId;

  next();
};

// Middleware to check if user is admin or super admin
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role;
  
  if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
    return res.status(403).json({ 
      error: 'Admin privileges required',
      code: 'ADMIN_REQUIRED',
      user_role: userRole
    });
  }

  next();
};

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const userRole = req.user.role;
  
  if (userRole !== USER_ROLES.SUPER_ADMIN) {
    return res.status(403).json({ 
      error: 'Super admin privileges required',
      code: 'SUPER_ADMIN_REQUIRED',
      user_role: userRole
    });
  }

  next();
};

// Middleware to check if user can create users with specific role
const requireUserCreationPermission = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const managerRole = req.user.role;
  const targetRole = req.body.role;

  if (!targetRole) {
    return res.status(400).json({ 
      error: 'User role is required',
      code: 'ROLE_REQUIRED'
    });
  }

  // Check if manager can create users with this role
  if (!canManageUser(managerRole, targetRole)) {
    return res.status(403).json({ 
      error: `Cannot create user with role: ${targetRole}`,
      code: 'INSUFFICIENT_ROLE_HIERARCHY',
      manager_role: managerRole,
      target_role: targetRole
    });
  }

  next();
};

module.exports = {
  requirePermission,
  requireUserManagement,
  requireTenantAccess,
  requireAdmin,
  requireSuperAdmin,
  requireUserCreationPermission
};
