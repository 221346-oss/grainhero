const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const { auth } = require("../middleware/auth");
const {
  requirePermission,
  requireAdminAccess,
} = require("../middleware/permission");
const { requireWarehouseAccess, getWarehouseFilter } = require("../middleware/warehouseAccess");
const Silo = require("../models/Silo");
const LoggingService = require("../services/loggingService");

/**
 * @swagger
 * tags:
 *   name: Silos
 *   description: Grain storage silo management
 */

/**
 * @swagger
 * /silos/test:
 *   get:
 *     summary: Test endpoint to verify silos API is working
 *     tags: [Silos]
 *     responses:
 *       200:
 *         description: API is working
 */
router.get("/test", (req, res) => {
  res.json({
    message: "Silos API is working!",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /silos:
 *   get:
 *     summary: Get all silos for tenant
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of silos
 */
//const { requireWarehouseAccess, getWarehouseFilter } = require("../middleware/warehouseAccess");

router.get(
  "/",
  [
    auth,
    requirePermission("batch.view"), // reuse view permission for storage
    requireWarehouseAccess(),
  ],
  async (req, res) => {
    try {
      const adminId = req.user.admin_id || req.user._id;
      console.log("Silos GET request - Admin ID:", adminId);

      let filter = {};

      // Super Admin: See all silos
      if (req.user.role === "super_admin") {
        filter = {};
      }
      // Admin: See silos in their warehouses
      else if (req.user.role === "admin") {
        const Warehouse = require("../models/Warehouse");
        const warehouses = await Warehouse.find({ admin_id: adminId }).select("_id");
        filter = { warehouse_id: { $in: warehouses.map(w => w._id) } };
      }
      // Manager and Technician: See silos in their assigned warehouse
      else if (req.user.role === "manager" || req.user.role === "technician") {
        if (!req.user.warehouse_id) {
          return res.status(403).json({ error: "User not assigned to any warehouse" });
        }
        filter = { warehouse_id: req.user.warehouse_id };
      }

      // Always scope by admin_id to ensure strict siloing
      filter.admin_id = adminId;

      if (req.query.status) filter.status = req.query.status;

      console.log("Using filter (temporarily showing all silos):", filter);

      console.log("Silos filter:", filter);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [silos, total] = await Promise.all([
        Silo.find(filter)
          .populate({ path: "current_batch_id", select: "batch_id grain_type" })
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Silo.countDocuments(filter),
      ]);

      console.log("Found silos:", silos.length);
      console.log("Total silos in DB:", total);

      // Map to frontend-friendly shape for current_batch_id and alias VOC
      const mapped = silos.map((s) => {
        // Compute live storage_days from batch_loaded_date
        let storage_days = null;
        let storage_hours = null;
        if (s.batch_loaded_date) {
          const endDate = s.batch_dispatched_date ? new Date(s.batch_dispatched_date) : new Date();
          const diffMs = endDate - new Date(s.batch_loaded_date);
          storage_days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          storage_hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        }

        return {
          ...s,
          current_batch_id: s.current_batch_id
            ? {
              batch_id: s.current_batch_id.batch_id,
              grain_type: s.current_batch_id.grain_type,
            }
            : undefined,
          current_conditions: s.current_conditions ? {
            ...s.current_conditions,
            tvoc: s.current_conditions.voc?.value,
            tvoc_ppb: s.current_conditions.voc?.value
          } : s.current_conditions,
          // Storage tracking for frontend display
          batch_loaded_date: s.batch_loaded_date || null,
          batch_dispatched_date: s.batch_dispatched_date || null,
          storage_days,
          storage_hours,
          is_storage_active: s.batch_loaded_date && !s.batch_dispatched_date,
        };
      });

      res.json({
        silos: mapped,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit,
        },
      });
    } catch (error) {
      console.error("Get silos error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /silos/stats:
 *   get:
 *     summary: Get silo statistics for tenant
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Silo statistics
 */
router.get(
  "/stats",
  [auth, requirePermission("batch.view")],
  async (req, res) => {
    try {
      const adminId = req.user.admin_id || req.user._id;
      const silos = await Silo.find({ admin_id: adminId }).lean();
      const total = silos.length;
      const totalCapacity = silos.reduce(
        (sum, s) => sum + (s.capacity_kg || 0),
        0
      );
      const totalCurrent = silos.reduce(
        (sum, s) => sum + (s.current_occupancy_kg || 0),
        0
      );
      const utilization =
        totalCapacity > 0
          ? Math.round((totalCurrent / totalCapacity) * 100)
          : 0;
      const byStatus = silos.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {});
      res.json({ total, totalCapacity, totalCurrent, utilization, byStatus });
    } catch (error) {
      console.error("Get silo stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /silos:
 *   post:
 *     summary: Create a new silo
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - silo_id
 *               - name
 *               - capacity_kg
 *             properties:
 *               silo_id:
 *                 type: string
 *                 description: (optional) auto-generated if omitted; immutable
 *               name:
 *                 type: string
 *                 description: name is generated by the system and is immutable; don't supply
 *               capacity_kg:
 *                 type: number
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, offline, maintenance]
 *     responses:
 *       201:
 *         description: Silo created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  [
    auth,
    requirePermission("batch.create"), // reuse batch permission for silo management
    [
      body("silo_id").optional().isString().withMessage("Invalid silo_id"),
      // name is generated by system and is immutable; client should not supply it
      body("capacity_kg")
        .isFloat({ min: 1 })
        .withMessage("Capacity must be a positive number"),
      body("warehouse_id")
        .optional({ values: 'falsy' }) // Treat empty string, null, undefined as optional
        .custom((value) => {
          // If value is provided and not empty, it must be a valid MongoDB ObjectId
          if (value && value.trim() !== '') {
            return require('mongoose').Types.ObjectId.isValid(value);
          }
          return true; // Empty string or null is allowed (will be auto-determined)
        })
        .withMessage("Invalid warehouse_id"),
      body("location").optional(),
      body("status").optional().isIn(["active", "offline", "maintenance"]),
    ],
  ],
  async (req, res) => {
    try {
      console.log("=== SILO CREATION REQUEST ===");
      console.log("Request body:", req.body);
      console.log("User admin_id:", req.user.admin_id);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        silo_id,
        capacity_kg,
        location,
        status = "active",
      } = req.body;
      // name is generated by the system and is immutable; ignore any provided name

      // Check if silo_id already exists for this tenant
      console.log(
        "Checking for existing silo with silo_id:",
        silo_id,
        "admin_id:",
        req.user.admin_id
      );
      const existingSilo = await Silo.findOne({
        silo_id,
        admin_id: req.user.admin_id,
      });

      if (existingSilo) {
        console.log("Silo ID already exists:", existingSilo);
        return res.status(400).json({
          error: "Silo ID already exists for this tenant",
        });
      }

      // Determine warehouse_id if not provided
      // Handle empty string, null, or undefined as "not provided"
      let warehouse_id = req.body.warehouse_id;
      // Treat empty string as undefined/null
      if (warehouse_id === '' || warehouse_id === null || warehouse_id === undefined) {
        warehouse_id = null;
      }
      const Warehouse = require("../models/Warehouse");
      if (!warehouse_id) {
        if (req.user.role === "manager" || req.user.role === "technician") {
          warehouse_id = req.user.warehouse_id;
        } else if (req.user.role === "admin") {
          const warehouses = await Warehouse.find({ admin_id: req.user._id }).select("_id");
          if (warehouses.length === 1) {
            warehouse_id = warehouses[0]._id;
          } else if (warehouses.length === 0) {
            // Auto-create a default warehouse for this admin if their plan allows it
            const planHelpers = require("../configs/plan-features");
            const currentCount = await Warehouse.countDocuments({ admin_id: req.user._id });
            if (!planHelpers.isWithinLimits(req.user.subscription_plan, 'warehouses', currentCount + 1)) {
              return res.status(403).json({ error: "No warehouse exists and your subscription plan prevents auto-creation of a warehouse. Please create one manually." });
            }

            console.log("No warehouses found for admin - creating a default warehouse...");
            const WarehouseFinancials = require("../models/WarehouseFinancials");
            const autoName = `${req.user.name || 'Warehouse'} Default`;
            const newWarehouse = new Warehouse({
              name: autoName,
              location: {},
              admin_id: req.user._id,
              created_by: req.user._id
            });
            await newWarehouse.save();
            const financials = new WarehouseFinancials({ warehouse_id: newWarehouse._id });
            await financials.save();
            warehouse_id = newWarehouse._id;
            // attach info for response later
            req._auto_created_warehouse = newWarehouse;
          } else {
            return res.status(400).json({ error: "Multiple warehouses found. Please specify warehouse_id" });
          }
        } else {
          return res.status(400).json({ error: "warehouse_id is required" });
        }
      }

      // Enforce per-warehouse silo limit (max 3 per warehouse)
      const siloCount = await Silo.countDocuments({ warehouse_id });
      if (siloCount >= 3) {
        return res.status(400).json({ error: "Warehouse silo limit reached (3 silos per warehouse)." });
      }

      // Enforce plan-wide silo limit for the admin (based on subscription_plan)
      const planHelpers = require("../configs/plan-features");
      const adminId = req.user.admin_id || req.user._id;
      const adminSiloCount = await Silo.countDocuments({ admin_id: adminId });
      if (!planHelpers.isWithinLimits(req.user.subscription_plan, 'silos', adminSiloCount + 1)) {
        return res.status(403).json({ error: "Silo creation limit reached for your subscription plan" });
      }

      const silo = new Silo({
        silo_id,
        capacity_kg,
        location,
        status,
        admin_id: adminId,
        warehouse_id,
        created_by: req.user._id,
        current_occupancy_kg: 0,
        batch_loaded_date: new Date(), // Track creation time for ML Storage_Days computation
        batch_dispatched_date: null,
        current_conditions: {
          temperature: { value: 20, timestamp: new Date() },
          humidity: { value: 50, timestamp: new Date() },
          co2: { value: 400, timestamp: new Date() },
        },
      });

      await silo.save();
      
      // Log silo creation
      try {
        await LoggingService.logSiloAction(req.user, 'silo_created', silo, req.ip);
      } catch (logErr) { console.error('Logging error:', logErr.message); }

      const responsePayload = { message: "Silo created successfully", silo };
      if (req._auto_created_warehouse) {
        responsePayload.createdWarehouse = {
          _id: req._auto_created_warehouse._id,
          warehouse_id: req._auto_created_warehouse.warehouse_id,
          name: req._auto_created_warehouse.name,
        };
      }
      res.status(201).json(responsePayload);
    } catch (error) {
      if (error && error.name === "ValidationError") {
        console.error("Create silo validation error:", error);
        return res.status(400).json({ error: error.message, details: error.errors });
      }
      console.error("Create silo error:", error);
      res.status(500).json({ error: "Failed to create silo" });
    }
  }
);

/**
 * @swagger
 * /silos/{id}:
 *   get:
 *     summary: Get a single silo by ID
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silo details
 *       404:
 *         description: Silo not found
 */
router.get(
  "/:id",
  [auth, requirePermission("batch.view")],
  async (req, res) => {
    try {
      const adminId = req.user.admin_id || req.user._id;
      const silo = await Silo.findOne({
        _id: req.params.id,
        admin_id: adminId,
      }).populate("current_batch_id", "batch_id grain_type");

      if (!silo) {
        return res.status(404).json({ error: "Silo not found" });
      }

      // Process silo to include tvoc aliases if current_conditions exists
      const siloObj = silo.toObject();
      if (siloObj.current_conditions) {
        siloObj.current_conditions.tvoc = siloObj.current_conditions.voc?.value;
        siloObj.current_conditions.tvoc_ppb = siloObj.current_conditions.voc?.value;
      }

      res.json({ silo: siloObj });
    } catch (error) {
      console.error("Get silo error:", error);
      res.status(500).json({ error: "Failed to get silo" });
    }
  }
);

/**
 * @swagger
 * /silos/{id}:
 *   put:
 *     summary: Update a silo
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               capacity_kg:
 *                 type: number
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, offline, maintenance]
 *     responses:
 *       200:
 *         description: Silo updated successfully
 *       404:
 *         description: Silo not found
 */
router.put(
  "/:id",
  [
    auth,
    requirePermission("batch.update"),
    [
      // name is immutable and cannot be updated
      body("capacity_kg")
        .optional()
        .isFloat({ min: 1 })
        .withMessage("Capacity must be positive"),
      body("status").optional().isIn(["active", "offline", "maintenance"]),
    ],
  ],
  async (req, res) => {
    try {
      console.log("=== SILO UPDATE REQUEST ===");
      console.log("Silo ID:", req.params.id);
      console.log("User admin_id:", req.user.admin_id);
      console.log("Update data:", req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

        const adminId = req.user.admin_id || req.user._id;

      const silo = await Silo.findOne({
        _id: req.params.id,
        admin_id: adminId,
      });

      console.log("Found silo:", silo ? "Yes" : "No");

      if (!silo) {
        return res.status(404).json({ error: "Silo not found" });
      }

      // Disallow updating immutable fields (silo_id and name)
      if (Object.prototype.hasOwnProperty.call(req.body, 'name') || Object.prototype.hasOwnProperty.call(req.body, 'silo_id')) {
        return res.status(400).json({ error: "silo_id and name are immutable and cannot be updated" });
      }

      const { capacity_kg, location, status } = req.body;

      if (capacity_kg !== undefined) silo.capacity_kg = capacity_kg;
      if (location !== undefined) silo.location = location;
      if (status) silo.status = status;

      await silo.save();

      // Log silo update
      try {
        await LoggingService.logSiloAction(req.user, 'silo_updated', silo, req.ip);
      } catch (logErr) { console.error('Logging error:', logErr.message); }

      res.json({
        message: "Silo updated successfully",
        silo,
      });
    } catch (error) {
      console.error("Update silo error:", error);
      res.status(500).json({ error: "Failed to update silo" });
    }
  }
);

/**
 * @swagger
 * /silos/{id}:
 *   delete:
 *     summary: Delete a silo
 *     tags: [Silos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silo deleted successfully
 *       404:
 *         description: Silo not found
 *       400:
 *         description: Cannot delete silo with grain
 */
router.delete(
  "/:id",
  [auth, requirePermission("batch.delete")],
  async (req, res) => {
    try {
        const adminId = req.user.admin_id || req.user._id;
      const silo = await Silo.findOne({
        _id: req.params.id,
        admin_id: adminId,
      });

      if (!silo) {
        return res.status(404).json({ error: "Silo not found" });
      }

      // Check if silo has grain
      if (silo.current_occupancy_kg > 0) {
        return res.status(400).json({
          error: "Cannot delete silo with grain. Please empty the silo first.",
        });
      }

      await Silo.findByIdAndDelete(req.params.id);

      // Log silo deletion
      try {
        // Create a mock object for logging since it's deleted
        await LoggingService.logSiloAction(req.user, 'silo_deleted', silo, req.ip);
      } catch (logErr) { console.error('Logging error:', logErr.message); }

      res.json({ message: "Silo deleted successfully" });
    } catch (error) {
      console.error("Delete silo error:", error);
      res.status(500).json({ error: "Failed to delete silo" });
    }
  }
);

module.exports = router;
