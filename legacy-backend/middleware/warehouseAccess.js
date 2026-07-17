/**
 * Warehouse Access Control Middleware
 * Ensures users can only access data from their assigned warehouse(s)
 */

const { USER_ROLES } = require('../configs/enum');
const Warehouse = require('../models/Warehouse');

/**
 * Middleware to ensure user has access to a specific warehouse
 * @param {boolean} allowSuperAdmin - Whether super admin can bypass (default: true)
 */
const requireWarehouseAccess = (allowSuperAdmin = true) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Super admin bypasses warehouse checks
      if (allowSuperAdmin && user.role === USER_ROLES.SUPER_ADMIN) {
        req.warehouseFilter = {}; // No filter for super admin
        return next();
      }

      // Admin can access all warehouses under their admin_id
      if (user.role === USER_ROLES.ADMIN) {
        req.warehouseFilter = { admin_id: user._id };
        return next();
      }

      // Manager: Can only access their assigned warehouse
      if (user.role === USER_ROLES.MANAGER) {
        if (!user.warehouse_id) {
          return res.status(403).json({ 
            error: "Manager not assigned to any warehouse" 
          });
        }
        req.warehouseFilter = { warehouse_id: user.warehouse_id };
        req.userWarehouseId = user.warehouse_id;
        return next();
      }

      // Technician: Can only access their assigned warehouse
      if (user.role === USER_ROLES.TECHNICIAN) {
        if (!user.warehouse_id) {
          return res.status(403).json({ 
            error: "Technician not assigned to any warehouse" 
          });
        }
        req.warehouseFilter = { warehouse_id: user.warehouse_id };
        req.userWarehouseId = user.warehouse_id;
        return next();
      }

      // Unknown role
      return res.status(403).json({ error: "Insufficient permissions" });
    } catch (error) {
      console.error("Warehouse access middleware error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
};

/**
 * Middleware to validate warehouse_id parameter matches user's access
 */
const validateWarehouseParam = async (req, res, next) => {
  try {
    const user = req.user;
    const warehouseId = req.params.warehouse_id || req.body.warehouse_id || req.query.warehouse_id;

    if (!warehouseId) {
      return next(); // No warehouse_id in request, skip validation
    }

    // Super admin can access any warehouse
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      return next();
    }

    // Admin can access warehouses under their admin_id
    if (user.role === USER_ROLES.ADMIN) {
      const warehouse = await Warehouse.findById(warehouseId);
      if (!warehouse || warehouse.admin_id.toString() !== user._id.toString()) {
        return res.status(403).json({ error: "Access denied to this warehouse" });
      }
      return next();
    }

    // Manager and Technician can only access their assigned warehouse
    if (user.role === USER_ROLES.MANAGER || user.role === USER_ROLES.TECHNICIAN) {
      if (warehouseId.toString() !== user.warehouse_id?.toString()) {
        return res.status(403).json({ error: "Access denied to this warehouse" });
      }
      return next();
    }

    return res.status(403).json({ error: "Insufficient permissions" });
  } catch (error) {
    console.error("Warehouse param validation error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Helper function to get warehouse filter based on user role
 */
const getWarehouseFilter = (user) => {
  if (!user) return null;

  // Super admin: no filter
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return {};
  }

  // Admin: filter by admin_id
  if (user.role === USER_ROLES.ADMIN) {
    return { admin_id: user._id };
  }

  // Manager and Technician: filter by warehouse_id
  if (user.role === USER_ROLES.MANAGER || user.role === USER_ROLES.TECHNICIAN) {
    if (!user.warehouse_id) {
      return null; // User not assigned to warehouse
    }
    return { warehouse_id: user.warehouse_id };
  }

  return null;
};

/**
 * Helper function to get accessible warehouse IDs for a user
 */
const getAccessibleWarehouseIds = async (user) => {
  if (!user) return [];

  // Super admin: all warehouses
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    const warehouses = await Warehouse.find({}).select('_id');
    return warehouses.map(w => w._id);
  }

  // Admin: all warehouses under their admin_id
  if (user.role === USER_ROLES.ADMIN) {
    const warehouses = await Warehouse.find({ admin_id: user._id }).select('_id');
    return warehouses.map(w => w._id);
  }

  // Manager and Technician: only their assigned warehouse
  if (user.role === USER_ROLES.MANAGER || user.role === USER_ROLES.TECHNICIAN) {
    return user.warehouse_id ? [user.warehouse_id] : [];
  }

  return [];
};

module.exports = {
  requireWarehouseAccess,
  validateWarehouseParam,
  getWarehouseFilter,
  getAccessibleWarehouseIds
};

