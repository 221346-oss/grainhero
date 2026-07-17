const {
  hasPermission,
  ROLE_PERMISSIONS,
} = require("../configs/role-permissions");
const { USER_ROLES } = require("../configs/enum");

/**
 * Generic permission middleware
 * @param {string|array} permissions - Permission(s) required
 * @param {boolean} requireAll - Whether all permissions are required (default: false)
 */
const requirePermission = (permissions, requireAll = false) => {
  return (req, res, next) => {
    try {
      console.log("=== PERMISSION CHECK ===");
      console.log("User:", req.user);
      console.log("Required permissions:", permissions);

      if (!req.user) {
        console.log("No user found in request");
        return res.status(401).json({ error: "Authentication required" });
      }

      const userRole = req.user.role;
      console.log("User role:", userRole);

      // Super admin bypasses all permission checks
      if (userRole === USER_ROLES.SUPER_ADMIN) {
        return next();
      }

      // Convert single permission to array
      const permissionsArray = Array.isArray(permissions)
        ? permissions
        : [permissions];

      // Check permissions
      const hasRequiredPermissions = requireAll
        ? permissionsArray.every((perm) => hasPermission(userRole, perm))
        : permissionsArray.some((perm) => hasPermission(userRole, perm));

      if (!hasRequiredPermissions) {
        return res.status(403).json({
          error: "Insufficient permissions",
          required: permissionsArray,
          user_role: userRole,
        });
      }

      next();
    } catch (error) {
      console.error("Permission middleware error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Role-based middleware
 * @param {string|array} roles - Role(s) allowed
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const userRole = req.user.role;
      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          error: "Insufficient role privileges",
          required_roles: allowedRoles,
          user_role: userRole,
        });
      }

      next();
    } catch (error) {
      console.error("Role middleware error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Admin-based access control
 * Ensures user can only access resources from their admin's team
 */
const requireAdminAccess = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Super admin can access all admins and their teams
    if (req.user.role === USER_ROLES.SUPER_ADMIN) {
      return next();
    }

    // Determine admin_id based on user role
    let userAdminId;
    console.log("=== ADMIN ACCESS MIDDLEWARE ===");
    console.log("User role:", req.user.role);
    console.log("User ID:", req.user._id);
    console.log("User admin_id:", req.user.admin_id);
    
    if (req.user.role === USER_ROLES.ADMIN) {
      // Admin users are their own admin
      userAdminId = req.user._id;
      console.log("Admin user - using own ID as admin_id:", userAdminId);
    } else if (req.user.role === USER_ROLES.MANAGER || req.user.role === USER_ROLES.TECHNICIAN) {
      // Managers and technicians belong to their admin
      userAdminId = req.user.admin_id;
      console.log("Manager/Technician - using admin_id:", userAdminId);
    }

    if (!userAdminId) {
      console.log("ERROR: No admin_id determined");
      return res.status(400).json({ error: "Admin ID required" });
    }

    // Set the admin_id in the request for use by route handlers
    req.user.admin_id = userAdminId;
    console.log("Final admin_id set to:", req.user.admin_id);

    next();
  } catch (error) {
    console.error("Admin access middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Resource ownership middleware
 * Ensures user can only access resources they own or have permission to access
 */
const requireResourceOwnership = (resourceField = "created_by") => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Super admin and admin can access all resources
      if (
        req.user.role === USER_ROLES.SUPER_ADMIN ||
        req.user.role === USER_ROLES.ADMIN
      ) {
        return next();
      }

      // This middleware should be used after the resource is loaded
      // The resource should be attached to req.resource
      if (!req.resource) {
        return res
          .status(500)
          .json({ error: "Resource not found in request context" });
      }

      const resourceOwnerId = req.resource[resourceField];

      if (
        !resourceOwnerId ||
        resourceOwnerId.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({
          error: "Access denied. You can only access your own resources",
        });
      }

      next();
    } catch (error) {
      console.error("Resource ownership middleware error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Feature flag middleware
 * Checks if a feature is enabled for the user/tenant
 */
const requireFeature = (featureName) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Super admin bypasses feature checks
      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        return next();
      }

      // For now, we'll implement basic feature checking
      // In a full implementation, this would check against feature flags in the database
      const basicFeatures = {
        "ai.enable": [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
        "actuator.control": [USER_ROLES.ADMIN, USER_ROLES.TECHNICIAN],
        "sensor.manage": [USER_ROLES.ADMIN, USER_ROLES.TECHNICIAN],
        "batch.manage": [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
        "insurance.manage": [USER_ROLES.ADMIN],
        "reports.generate": [USER_ROLES.ADMIN, USER_ROLES.MANAGER],
        "system.override": [USER_ROLES.ADMIN],
      };

      const allowedRoles = basicFeatures[featureName];

      if (!allowedRoles || !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: `Feature '${featureName}' not available for your role`,
          user_role: req.user.role,
        });
      }

      next();
    } catch (error) {
      console.error("Feature middleware error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
};

// Specific role middlewares for backward compatibility
const requireSuperAdmin = requireRole(USER_ROLES.SUPER_ADMIN);
const requireAdmin = requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN]);
const requireManager = requireRole([
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
]);
const requireTechnician = requireRole([
  USER_ROLES.SUPER_ADMIN,
  USER_ROLES.ADMIN,
  USER_ROLES.MANAGER,
  USER_ROLES.TECHNICIAN,
]);

module.exports = {
  requirePermission,
  requireRole,
  requireAdminAccess,
  requireResourceOwnership,
  requireFeature,
  // Backward-compatible aliases
  superAdminOnly: requireSuperAdmin,
  adminOnly: requireAdmin,
  requireSuperAdmin,
  requireAdmin,
  requireManager,
  requireTechnician,
};
