const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { requireWarehouseAccess, validateWarehouseParam, getWarehouseFilter } = require("../middleware/warehouseAccess");
const { requirePermission } = require("../middleware/permission");
const { USER_ROLES } = require("../configs/enum");

const Warehouse = require("../models/Warehouse");
const WarehouseFinancials = require("../models/WarehouseFinancials");
const Silo = require("../models/Silo");
const User = require("../models/User");
const GrainBatch = require("../models/GrainBatch");

/**
 * @swagger
 * /api/warehouses:
 *   get:
 *     summary: Get all warehouses (filtered by role)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 */
router.get("/", auth, requireWarehouseAccess(), async (req, res) => {
  try {
    const user = req.user;
    let query = {};

    // Super Admin: See all warehouses
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      query = {};
    }
    // Admin: See all their warehouses
    else if (user.role === USER_ROLES.ADMIN) {
      query = { admin_id: user._id };
    }
    // Manager: See only their assigned warehouse
    else if (user.role === USER_ROLES.MANAGER) {
      query = { _id: user.warehouse_id };
    }
    // Technician: See only their assigned warehouse
    else if (user.role === USER_ROLES.TECHNICIAN) {
      query = { _id: user.warehouse_id };
    }

    const warehouses = await Warehouse.find(query)
      .populate("admin_id", "name email")
      .populate("manager_id", "name email")
      .populate("technician_ids", "name email")
      .sort({ created_at: -1 });

    res.json(warehouses);
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

/**
 * @swagger
 * /api/warehouses/{id}:
 *   get:
 *     summary: Get warehouse by ID
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", auth, requireWarehouseAccess(), validateWarehouseParam, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate("admin_id", "name email")
      .populate("manager_id", "name email")
      .populate("technician_ids", "name email role");

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Get silos in this warehouse
    const silos = await Silo.find({ warehouse_id: warehouse._id });
    
    // Get financials if available
    const financials = await WarehouseFinancials.findOne({ warehouse_id: warehouse._id });

    res.json({
      ...warehouse.toObject(),
      silos,
      financials
    });
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

/**
 * @swagger
 * /api/warehouses:
 *   post:
 *     summary: Create a new warehouse (Admin only)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 */
router.post("/", auth, requirePermission(["warehouse.create", "warehouse.manage"]), async (req, res) => {
  try {
    const planHelpers = require("../configs/plan-features");
    const user = req.user;
    
    // Only Admin and Super Admin can create warehouses
    if (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only admins can create warehouses" });
    }

    // Check plan limit for warehouses
    const currentWarehouses = await Warehouse.countDocuments({ admin_id: user._id });
    if (!planHelpers.isWithinLimits(user.subscription_plan, 'warehouses', currentWarehouses + 1)) {
      return res.status(403).json({ error: "Warehouse creation limit reached for your subscription plan" });
    }

    const { warehouse_id, name, location, manager_id, notes } = req.body;

    // Check if warehouse_id already exists
    const existing = await Warehouse.findOne({ warehouse_id });
    if (existing) {
      return res.status(400).json({ error: "Warehouse ID already exists" });
    }

    // Validate manager if provided
    if (manager_id) {
      const manager = await User.findById(manager_id);
      if (!manager || manager.role !== USER_ROLES.MANAGER) {
        return res.status(400).json({ error: "Invalid manager ID" });
      }
      if (manager.admin_id.toString() !== user._id.toString() && user.role !== USER_ROLES.SUPER_ADMIN) {
        return res.status(403).json({ error: "Manager does not belong to your organization" });
      }
    }

    const warehouse = new Warehouse({
      warehouse_id,
      name,
      location,
      admin_id: user.role === USER_ROLES.SUPER_ADMIN ? (req.body.admin_id || user._id) : user._id,
      manager_id: manager_id || null,
      notes,
      created_by: user._id
    });

    await warehouse.save();

    // Assign manager if provided
    if (manager_id) {
      const manager = await User.findById(manager_id);
      manager.warehouse_id = warehouse._id;
      await manager.save();
      
      warehouse.manager_id = manager._id;
      await warehouse.save();
    }

    // Create financials record
    const financials = new WarehouseFinancials({
      warehouse_id: warehouse._id
    });
    await financials.save();

    res.status(201).json(warehouse);
  } catch (error) {
    console.error("Error creating warehouse:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

/**
 * @swagger
 * /api/warehouses/{id}:
 *   put:
 *     summary: Update warehouse (Admin only)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 */
router.put("/:id", auth, requireWarehouseAccess(), validateWarehouseParam, requirePermission(["warehouse.update", "warehouse.manage"]), async (req, res) => {
  try {
    const user = req.user;
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Only Admin and Super Admin can update
    if (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: "Only admins can update warehouses" });
    }

    const { name, location, manager_id, notes, status } = req.body;

    if (name) warehouse.name = name;
    if (location) warehouse.location = location;
    if (notes !== undefined) warehouse.notes = notes;
    if (status) warehouse.status = status;
    warehouse.updated_by = user._id;

    // Handle manager assignment
    if (manager_id !== undefined) {
      if (manager_id) {
        const manager = await User.findById(manager_id);
        if (!manager || manager.role !== USER_ROLES.MANAGER) {
          return res.status(400).json({ error: "Invalid manager ID" });
        }
        
        // Unassign previous manager
        if (warehouse.manager_id) {
          const prevManager = await User.findById(warehouse.manager_id);
          if (prevManager) {
            prevManager.warehouse_id = null;
            await prevManager.save();
          }
        }
        
        // Assign new manager
        manager.warehouse_id = warehouse._id;
        await manager.save();
        warehouse.manager_id = manager._id;
      } else {
        // Remove manager assignment
        if (warehouse.manager_id) {
          const prevManager = await User.findById(warehouse.manager_id);
          if (prevManager) {
            prevManager.warehouse_id = null;
            await prevManager.save();
          }
        }
        warehouse.manager_id = null;
      }
    }

    await warehouse.save();
    await warehouse.updateStatistics();

    res.json(warehouse);
  } catch (error) {
    console.error("Error updating warehouse:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

/**
 * @swagger
 * /api/warehouses/{id}/technicians:
 *   post:
 *     summary: Add technician to warehouse (Admin/Manager only)
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 */
router.post("/:id/technicians", auth, requireWarehouseAccess(), validateWarehouseParam, async (req, res) => {
  try {
    const user = req.user;
    const { technician_id } = req.body;

    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Manager can add technicians to their warehouse
    if (user.role === USER_ROLES.MANAGER) {
      if (warehouse.manager_id.toString() !== user._id.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    // Admin can add technicians to their warehouses
    else if (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const technician = await User.findById(technician_id);
    if (!technician || technician.role !== USER_ROLES.TECHNICIAN) {
      return res.status(400).json({ error: "Invalid technician ID" });
    }

    // Verify technician belongs to same admin
    if (technician.admin_id.toString() !== warehouse.admin_id.toString() && user.role !== USER_ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: "Technician does not belong to your organization" });
    }

    // Add technician to warehouse
    await warehouse.addTechnician(technician._id);
    
    // Update technician's warehouse_id
    technician.warehouse_id = warehouse._id;
    await technician.save();

    res.json({ message: "Technician added successfully", warehouse });
  } catch (error) {
    console.error("Error adding technician:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

/**
 * @swagger
 * /api/warehouses/{id}/technicians/{technician_id}:
 *   delete:
 *     summary: Remove technician from warehouse
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/:id/technicians/:technician_id", auth, requireWarehouseAccess(), validateWarehouseParam, async (req, res) => {
  try {
    const user = req.user;
    const warehouse = await Warehouse.findById(req.params.id);
    
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Manager can remove technicians from their warehouse
    if (user.role === USER_ROLES.MANAGER) {
      if (warehouse.manager_id.toString() !== user._id.toString()) {
        return res.status(403).json({ error: "Access denied" });
      }
    }
    // Admin can remove technicians
    else if (user.role !== USER_ROLES.ADMIN && user.role !== USER_ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    await warehouse.removeTechnician(req.params.technician_id);
    
    const technician = await User.findById(req.params.technician_id);
    if (technician) {
      technician.warehouse_id = null;
      await technician.save();
    }

    res.json({ message: "Technician removed successfully" });
  } catch (error) {
    console.error("Error removing technician:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

/**
 * @swagger
 * /api/warehouses/{id}/financials:
 *   get:
 *     summary: Get warehouse financials
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/financials", auth, requireWarehouseAccess(), validateWarehouseParam, async (req, res) => {
  try {
    const financials = await WarehouseFinancials.findOne({ warehouse_id: req.params.id });
    
    if (!financials) {
      return res.status(404).json({ error: "Financials not found for this warehouse" });
    }

    res.json(financials);
  } catch (error) {
    console.error("Error fetching warehouse financials:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

/**
 * @swagger
 * /api/warehouses/{id}/statistics:
 *   get:
 *     summary: Get warehouse statistics
 *     tags: [Warehouses]
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id/statistics", auth, requireWarehouseAccess(), validateWarehouseParam, async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    await warehouse.updateStatistics();
    
    const silos = await Silo.find({ warehouse_id: warehouse._id });
    const batches = await GrainBatch.find({ 
      silo_id: { $in: silos.map(s => s._id) } 
    });

    res.json({
      warehouse: warehouse.statistics,
      silo_count: silos.length,
      batch_count: batches.length,
      active_batches: batches.filter(b => b.status === 'stored').length
    });
  } catch (error) {
    console.error("Error fetching warehouse statistics:", error);
    res.status(500).json({ error: "Server error: " + error.message });
  }
});

module.exports = router;

