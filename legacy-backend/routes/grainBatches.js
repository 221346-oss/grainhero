const express = require("express");
const router = express.Router();
const GrainBatch = require("../models/GrainBatch");
const Silo = require("../models/Silo");
const { auth } = require("../middleware/auth");
const {
  requirePermission,
  requireAdminAccess,
} = require("../middleware/permission");
const { requireWarehouseAccess, getWarehouseFilter } = require("../middleware/warehouseAccess");
const { body, validationResult, param, query } = require("express-validator");
const { BATCH_STATUSES } = require("../configs/enum");
const QRCode = require("qrcode");
const PDFKit = require("pdfkit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const LoggingService = require("../services/loggingService");
const NotificationService = require("../services/notificationService");
const DispatchTransaction = require("../models/DispatchTransaction");

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = "uploads/spoilage-events";
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `spoilage-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * @swagger
 * tags:
 *   name: Grain Batches
 *   description: Grain batch management and traceability
 */

/**
 * @swagger
 * /grain-batches/test:
 *   get:
 *     summary: Test endpoint to verify API is working
 *     tags: [Grain Batches]
 *     responses:
 *       200:
 *         description: API is working
 */
router.get("/test", (req, res) => {
  res.json({
    message: "Grain Batches API is working!",
    timestamp: new Date().toISOString(),
  });
});

/**
 * @swagger
 * /grain-batches/generate-id/{grain_type}:
 *   get:
 *     summary: Generate next batch ID for a grain type
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grain_type
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Generated batch ID
 *       401:
 *         description: Unauthorized
 */
router.get("/generate-id/:grain_type", [auth], async (req, res) => {
  try {
    const { grain_type } = req.params;
    const currentYear = new Date().getFullYear();

    // Map grain types to abbreviations
    const grainAbbreviations = {
      'Wheat': 'WB',
      'Rice': 'RB',
      'Maize': 'MB',
      'Corn': 'CB',
      'Barley': 'BB',
      'Sorghum': 'SB'
    };

    const abbreviation = grainAbbreviations[grain_type];
    if (!abbreviation) {
      return res.status(400).json({ error: "Invalid grain type" });
    }

    const adminId = req.user.admin_id || req.user._id;
    const existingBatches = await GrainBatch.find({
      admin_id: adminId,
      grain_type: grain_type,
      intake_date: {
        $gte: new Date(`${currentYear}-01-01`),
        $lt: new Date(`${currentYear + 1}-01-01`)
      }
    }).sort({ createdAt: -1 });

    // Calculate next sequence number
    const nextSequence = existingBatches.length + 1;
    const sequenceStr = String(nextSequence).padStart(3, '0');

    const batch_id = `${abbreviation}-${sequenceStr}-${currentYear}`;

    res.json({
      batch_id,
      sequence: nextSequence,
      grain_type,
      year: currentYear
    });
  } catch (error) {
    console.error("Generate ID error:", error);
    res.status(500).json({ error: "Failed to generate batch ID" });
  }
});

/**
 * @swagger
 * /grain-batches/available-silos/{grain_type}:
 *   get:
 *     summary: Get available silos for a grain type (empty or containing same grain type)
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grain_type
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of available silos
 *       401:
 *         description: Unauthorized
 */
router.get("/available-silos/:grain_type", [auth], async (req, res) => {
  try {
    const { grain_type } = req.params;
    const adminId = req.user.admin_id || req.user._id;

    // Get all silos for this admin
    const silos = await Silo.find({ admin_id: adminId }).sort({ name: 1 });

    // For each silo, check what grain types it currently contains
    const availableSilos = [];

    for (const silo of silos) {
      // Find all active batches in this silo
      const batchesInSilo = await GrainBatch.find({
        silo_id: silo._id,
        status: { $in: ['stored', 'processing', 'on_hold'] } // Active statuses
      }).select('grain_type').lean();

      // Check what grain types are in this silo
      const grainTypesInSilo = [...new Set(batchesInSilo.map(b => b.grain_type))];

      // Include silo if:
      // 1. It's empty (no active batches), OR
      // 2. It only contains the same grain type we're looking for
      if (grainTypesInSilo.length === 0 || grainTypesInSilo.every(gt => gt === grain_type)) {
        availableSilos.push({
          _id: silo._id,
          name: silo.name,
          silo_id: silo.silo_id,
          capacity_kg: silo.capacity_kg,
          current_occupancy_kg: silo.current_occupancy_kg,
          grain_types_stored: grainTypesInSilo,
          is_empty: grainTypesInSilo.length === 0
        });
      }
    }

    res.json({
      silos: availableSilos,
      total: availableSilos.length,
      grain_type,
      filtered_by: availableSilos.length < silos.length ? `Showing only silos compatible with ${grain_type}` : 'All silos available'
    });
  } catch (error) {
    console.error("Get available silos error:", error);
    res.status(500).json({ error: "Failed to get available silos" });
  }
});

/**
 * @swagger
 * /grain-batches:
 *   post:
 *     summary: Create a new grain batch
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - batch_id
 *               - silo_id
 *               - grain_type
 *               - quantity_kg
 *             properties:
 *               batch_id:
 *                 type: string
 *               silo_id:
 *                 type: string
 *               grain_type:
 *                 type: string
 *                 enum: [Wheat, Rice, Maize, Corn, Barley, Sorghum]
 *               quantity_kg:
 *                 type: number
 *               variety:
 *                 type: string
 *               grade:
 *                 type: string
 *               moisture_content:
 *                 type: number
 *               farmer_name:
 *                 type: string
 *               farmer_contact:
 *                 type: string
 *               harvest_date:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Batch created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Insufficient permissions
 */
router.post(
  "/",
  [
    auth,
    requirePermission("batch.create"),
    [
      body("batch_id").notEmpty().withMessage("Batch ID is required"),
      body("silo_id").isMongoId().withMessage("Valid silo ID is required"),
      body("grain_type")
        .isIn(["Wheat", "Rice", "Maize", "Corn", "Barley", "Sorghum"])
        .withMessage("Invalid grain type"),
      body("quantity_kg")
        .isFloat({ min: 0.1 })
        .withMessage("Quantity must be positive"),
      body("moisture_content")
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage("Moisture content must be between 0-100%"),
    ],
  ],
  async (req, res) => {
    console.log("=== GRAIN BATCH CREATE REQUEST ===");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("User:", req.user);
    console.log("Auth token:", req.headers.authorization);

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        batch_id,
        silo_id,
        grain_type,
        quantity_kg,
        variety,
        grade,
        moisture_content,
        protein_content,
        farmer_name,
        farmer_contact,
        source_location,
        harvest_date,
        notes,
        purchase_price_per_kg,
      } = req.body;

      const adminId = req.user.admin_id || req.user._id;

      // ── Wet Grain Gate ────────────────────────────────────────────────────
      // Block intake of grain that is too wet to store safely.
      // Thresholds reference:
      //   Rice  : IRRI Rice Knowledge Bank safe storage ≤ 13.5% MC
      //   Wheat : ASABE D245.6 / FAO safe storage ≤ 14% MC
      // Moisture is optional on the schema, but when supplied it must comply.
      if (moisture_content !== undefined && moisture_content !== null) {
        const grainLower = (grain_type || "").toLowerCase();
        if (grainLower === "wheat" && moisture_content > 14) {
          return res.status(400).json({
            error: "Wet Grain Gate",
            message: `Wheat moisture content of ${moisture_content}% exceeds the safe storage limit of 14%. `
              + "Please dry the grain before intake to prevent mould and spoilage.",
            grain_type,
            moisture_content,
            max_allowed: 14,
          });
        }
        if (grainLower === "rice" && moisture_content > 13.5) {
          return res.status(400).json({
            error: "Wet Grain Gate",
            message: `Rice moisture content of ${moisture_content}% exceeds the safe storage limit of 13.5%. `
              + "Please dry the grain before intake to prevent mould and spoilage.",
            grain_type,
            moisture_content,
            max_allowed: 13.5,
          });
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      // Check if silo exists and belongs to the admin
      const silo = await Silo.findOne({
        _id: silo_id,
        admin_id: adminId,
      });
      if (!silo) {
        return res.status(404).json({ error: "Silo not found" });
      }

      if (silo.available_capacity_kg < quantity_kg) {
        return res.status(400).json({
          error: "Insufficient silo capacity",
          available: silo.available_capacity_kg,
          requested: quantity_kg,
        });
      }

      // Calculate total purchase value if purchase price is provided
      const total_purchase_value = purchase_price_per_kg
        ? purchase_price_per_kg * quantity_kg
        : null;

      // Create batch
      const batch = new GrainBatch({
        batch_id,
        admin_id: adminId,
        silo_id,
        grain_type,
        quantity_kg,
        variety,
        grade,
        moisture_content,
        protein_content,
        farmer_name,
        farmer_contact,
        source_location,
        harvest_date: harvest_date ? new Date(harvest_date) : null,
        notes,
        purchase_price_per_kg: purchase_price_per_kg || null,
        total_purchase_value: total_purchase_value || null,
        created_by: req.user._id,
      });

      // Generate QR code
      batch.generateQRCode();

      await batch.save();

      // Update silo occupancy
      await silo.addBatch(batch._id, quantity_kg);

      // Generate QR code image
      const qrCodeUrl = await QRCode.toDataURL(batch.qr_code);

      res.status(201).json({
        message: "Batch created successfully",
        batch: {
          ...batch.toObject(),
          qr_code_image: qrCodeUrl,
        },
      });

      // Log batch creation (async, don't await)
      LoggingService.logBatchCreated(req.user, batch, req.ip).catch(() => { });
    } catch (error) {
      console.error("Create batch error:", error);
      if (error.code === 11000) {
        return res.status(400).json({ error: "Batch ID already exists" });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches:
 *   get:
 *     summary: Get all grain batches for tenant
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: grain_type
 *         schema:
 *           type: string
 *       - in: query
 *         name: silo_id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of batches
 */
router.get(
  "/",
  [auth, requirePermission("batch.view")],
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const adminId = req.user.admin_id || req.user._id;

      // Build filter scoped to admin
      let filter = { admin_id: adminId };

      if (req.query.status) filter.status = req.query.status;
      if (req.query.grain_type) filter.grain_type = req.query.grain_type;
      if (req.query.silo_id) filter.silo_id = req.query.silo_id;

      // Get batches with pagination
      const [batches, total] = await Promise.all([
        GrainBatch.find(filter)
          .populate("silo_id", "name silo_id capacity_kg")
          .populate("buyer_id", "name contact_info")
          .populate("created_by", "name email")
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        GrainBatch.countDocuments(filter),
      ]);

      res.json({
        batches,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit,
        },
      });
    } catch (error) {
      console.error("Get batches error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}:
 *   get:
 *     summary: Get batch by ID
 *     tags: [Grain Batches]
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
 *         description: Batch details
 *       404:
 *         description: Batch not found
 */
router.get(
  "/:id",
  [
    auth,
    requirePermission("batch.view"),
    requireAdminAccess,
    param("id").isMongoId().withMessage("Valid batch ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminId = req.user.admin_id || req.user._id;

      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: adminId,
      })
        .populate("silo_id")
        .populate("buyer_id")
        .populate("created_by", "name email")
        .populate("updated_by", "name email");

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Generate QR code image if needed
      let qrCodeImage = null;
      if (batch.qr_code) {
        qrCodeImage = await QRCode.toDataURL(batch.qr_code);
      }

      res.json({
        ...batch.toObject(),
        qr_code_image: qrCodeImage,
      });
    } catch (error) {
      console.error("Get batch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}:
 *   put:
 *     summary: Update batch
 *     tags: [Grain Batches]
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
 *         description: Batch updated
 */
router.put(
  "/:id",
  [
    auth,
    requirePermission("batch.manage"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminId = req.user.admin_id || req.user._id;

      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: adminId,
      });

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Update allowed fields
      const allowedUpdates = [
        "variety",
        "grade",
        "moisture_content",
        "protein_content",
        "farmer_name",
        "farmer_contact",
        "source_location",
        "notes",
        "tags",
        "insured",
        "insurance_policy_number",
        "insurance_value",
      ];

      allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
          batch[field] = req.body[field];
        }
      });

      batch.updated_by = req.user._id;
      await batch.save();

      // Log batch update
      const changes = {};
      allowedUpdates.forEach(f => { if (req.body[f] !== undefined) changes[f] = req.body[f]; });
      LoggingService.logBatchUpdated(req.user, batch, changes, req.ip).catch(() => { });

      res.json({
        message: "Batch updated successfully",
        batch,
      });
    } catch (error) {
      console.error("Update batch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}/buyers:
 *   get:
 *     summary: Get available buyers for dispatch
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/buyers",
  [
    auth,
    requirePermission("batch.dispatch"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
  ],
  async (req, res) => {
    try {
      const adminId = req.user.admin_id || req.user._id;

      // Get all active buyers for this admin
      const buyers = await Buyer.find({
        admin_id: adminId,
        status: "active",
      })
        .select("_id name company_name contact_person location buyer_type rating")
        .sort({ name: 1 })
        .lean();

      res.json({
        buyers: buyers.map(buyer => ({
          _id: buyer._id,
          name: buyer.name,
          company_name: buyer.company_name,
          contact: buyer.contact_person,
          location: buyer.location,
          buyer_type: buyer.buyer_type,
          rating: buyer.rating,
        })),
        total: buyers.length,
      });
    } catch (error) {
      console.error("Get buyers for dispatch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}/dispatch:
 *   post:
 *     summary: Dispatch batch to buyer
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/dispatch",
  [
    auth,
    requirePermission("batch.dispatch"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
    [
      body("buyer_id").isMongoId().withMessage("Valid buyer ID is required"),
      body("sell_price_per_kg")
        .isFloat({ min: 0 })
        .withMessage("Sell price per kg is required and must be positive"),
      body("dispatched_quantity_kg")
        .optional()
        .isFloat({ min: 0.1 })
        .withMessage("Dispatched quantity must be positive"),
      body("dispatch_details.vehicle_number")
        .optional()
        .notEmpty()
        .withMessage("Vehicle number is required if dispatch details provided"),
      body("dispatch_details.driver_name")
        .optional()
        .notEmpty()
        .withMessage("Driver name is required if dispatch details provided"),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminId = req.user.admin_id || req.user._id;

      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: adminId,
      });

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Check if batch can be dispatched
      const availableQuantity = batch.quantity_kg - (batch.dispatched_quantity_kg || 0);
      if (availableQuantity <= 0) {
        return res.status(400).json({ error: "Batch is already fully dispatched" });
      }

      const dispatchedQuantity = req.body.dispatched_quantity_kg || availableQuantity;

      // Validate dispatch quantity
      if (dispatchedQuantity > availableQuantity) {
        return res.status(400).json({
          error: `Cannot dispatch more than available quantity. Available: ${availableQuantity} kg`
        });
      }

      const sellPricePerKg = parseFloat(req.body.sell_price_per_kg);
      const buyerId = req.body.buyer_id;

      // Dispatch batch (handles partial dispatch)
      await batch.dispatch(
        buyerId,
        req.body.dispatch_details || {},
        sellPricePerKg,
        dispatchedQuantity
      );

      // Calculate remaining quantity after dispatch
      const remainingQuantity = batch.quantity_kg - batch.dispatched_quantity_kg;

      // Update silo occupancy - only remove dispatched quantity
      const silo = await Silo.findById(batch.silo_id);
      if (silo) {
        await silo.removeBatch(dispatchedQuantity);
      }

      // Reload batch to get updated values
      await batch.populate('buyer_id', 'name company_name contact_person');

      res.json({
        message: "Batch dispatched successfully",
        batch: {
          ...batch.toObject(),
          dispatched_quantity: batch.dispatched_quantity_kg,
          remaining_quantity: remainingQuantity,
          revenue: batch.revenue,
          profit: batch.profit,
        },
      });

      // Log dispatch & create transaction (async)
      LoggingService.logBatchDispatched(req.user, batch, {
        buyer_id: buyerId,
        quantity_kg: dispatchedQuantity,
        sell_price_per_kg: sellPricePerKg
      }, req.ip).catch(() => { });

      // Create dispatch transaction record
      const dt = new DispatchTransaction({
        admin_id: req.user.admin_id || req.user._id,
        batch_id: batch._id,
        batch_ref: batch.batch_id,
        buyer_id: buyerId,
        grain_type: batch.grain_type,
        quantity_kg: dispatchedQuantity,
        sell_price_per_kg: sellPricePerKg,
        total_amount: sellPricePerKg * dispatchedQuantity,
        vehicle_number: req.body.dispatch_details?.vehicle_number,
        driver_name: req.body.dispatch_details?.driver_name,
        driver_contact: req.body.dispatch_details?.driver_contact,
        destination: req.body.dispatch_details?.destination,
        dispatched_by: req.user._id
      });
      dt.save().catch(err => console.error('DispatchTransaction save error:', err));

      // Notify admin/manager
      const Buyer = require("../models/Buyer");
      const buyerDoc = await Buyer.findById(buyerId).select('name');
      NotificationService.notifyDispatch(req.user.admin_id || req.user._id, batch, buyerDoc?.name || 'Unknown', dispatchedQuantity).catch(() => { });
    } catch (error) {
      console.error("Dispatch batch error:", error);
      if (error.message.includes('exceeds available')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}/dispatch-simple:
 *   post:
 *     summary: Dispatch batch with simple buyer details
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               buyer_name:
 *                 type: string
 *               buyer_contact:
 *                 type: string
 *               quantity_dispatched:
 *                 type: number
 *               dispatch_date:
 *                 type: string
 *               notes:
 *                 type: string
 */
router.post(
  "/:id/dispatch-simple",
  [
    auth,
    requirePermission("batch.dispatch"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
    [
      body("buyer_name").notEmpty().withMessage("Buyer name is required"),
      body("buyer_contact").notEmpty().withMessage("Buyer contact is required"),
      body("quantity_dispatched")
        .optional()
        .isNumeric()
        .withMessage("Quantity must be a number"),
      body("sell_price_per_kg")
        .optional()
        .isNumeric()
        .withMessage("Sell price per kg must be a number"),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminId = req.user.admin_id || req.user._id;
      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: adminId,
      });

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Check available quantity
      const availableQuantity = batch.quantity_kg - (batch.dispatched_quantity_kg || 0);
      if (availableQuantity <= 0) {
        return res
          .status(400)
          .json({ error: "Batch is already fully dispatched" });
      }

      const dispatchedQuantity = req.body.quantity_dispatched
        ? parseFloat(req.body.quantity_dispatched)
        : availableQuantity;

      if (dispatchedQuantity > availableQuantity) {
        return res.status(400).json({
          error: `Cannot dispatch more than available quantity. Available: ${availableQuantity} kg`
        });
      }

      // Buyer upsert logic: unify with manual buyer creation
      const Buyer = require("../models/Buyer");

      // Build query for duplicate detection (email or phone)
      const buyerQueryOr = [];
      if (req.body.buyer_email) {
        buyerQueryOr.push({ "contact_person.email": req.body.buyer_email });
      }
      if (req.body.buyer_contact) {
        buyerQueryOr.push({ "contact_person.phone": req.body.buyer_contact });
      }

      if (buyerQueryOr.length === 0) {
        return res
          .status(400)
          .json({ error: "Buyer email or contact is required" });
      }

      // Ensure admin_id is correctly set (for admin users, it's their own _id; for managers/technicians, it's their admin_id)
      // adminId already declared

      const buyerQuery = {
        admin_id: adminId,
        $or: buyerQueryOr,
      };

      const buyerUpdate = {
        $set: {
          name: req.body.buyer_name,
          company_name: req.body.buyer_name,
          contact_person: {
            name: req.body.buyer_name,
            email: req.body.buyer_email || null,
            phone: req.body.buyer_contact,
          },
          status: "active",
          admin_id: adminId,
        },
      };

      const buyer = await Buyer.findOneAndUpdate(buyerQuery, buyerUpdate, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });

      // Use dispatch method to handle revenue calculation
      const sellPricePerKg = req.body.sell_price_per_kg
        ? parseFloat(req.body.sell_price_per_kg)
        : null;

      const dispatchDetails = {
        buyer_name: buyer.name,
        buyer_contact: buyer.contact_person.phone,
        quantity: dispatchedQuantity,
        dispatch_date: req.body.dispatch_date || new Date().toISOString(),
        notes: req.body.notes || "",
      };

      // Dispatch batch using the model method (handles revenue calculation)
      if (sellPricePerKg) {
        await batch.dispatch(buyer._id, dispatchDetails, sellPricePerKg, dispatchedQuantity);
      } else {
        // If no sell price, just update dispatch info without revenue calculation
        batch.buyer_id = buyer._id;
        batch.dispatch_details = dispatchDetails;
        batch.actual_dispatch_date = new Date();
        batch.dispatched_quantity_kg = (batch.dispatched_quantity_kg || 0) + dispatchedQuantity;
        if (batch.dispatched_quantity_kg >= batch.quantity_kg) {
          batch.status = BATCH_STATUSES.DISPATCHED;
        }
        await batch.save();
      }

      // Update silo occupancy - only remove dispatched quantity
      const silo = await Silo.findById(batch.silo_id);
      if (silo) {
        await silo.removeBatch(dispatchedQuantity);
      }

      res.json({
        message: "Batch dispatched successfully",
        batch,
      });
    } catch (error) {
      console.error("Simple dispatch batch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}/risk-assessment:
 *   put:
 *     summary: Update risk assessment for batch
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 */
router.put(
  "/:id/risk-assessment",
  [
    auth,
    requirePermission("ai.enable"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
    [
      body("risk_score")
        .isFloat({ min: 0, max: 100 })
        .withMessage("Risk score must be between 0-100"),
      body("confidence")
        .optional()
        .isFloat({ min: 0, max: 1 })
        .withMessage("Confidence must be between 0-1"),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminId = req.user.admin_id || req.user._id;

      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: adminId,
      });

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      await batch.updateRiskScore(
        req.body.risk_score,
        req.body.confidence || 0.8
      );

      res.json({
        message: "Risk assessment updated successfully",
        batch: {
          _id: batch._id,
          risk_score: batch.risk_score,
          spoilage_label: batch.spoilage_label,
          ai_prediction_confidence: batch.ai_prediction_confidence,
          last_risk_assessment: batch.last_risk_assessment,
        },
      });
    } catch (error) {
      console.error("Update risk assessment error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/qr/{qr_code}:
 *   get:
 *     summary: Get batch by QR code
 *     tags: [Grain Batches]
 *     parameters:
 *       - in: path
 *         name: qr_code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Batch details
 *       404:
 *         description: Batch not found
 */
router.get("/qr/:qr_code", async (req, res) => {
  try {
    const batch = await GrainBatch.findOne({ qr_code: req.params.qr_code })
      .populate("silo_id", "name location capacity_kg")
      .populate("buyer_id", "name contact_info")
      .select(
        "batch_id grain_type quantity_kg status intake_date dispatch_details farmer_name risk_score spoilage_label"
      );

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    res.json({
      message: "Batch found",
      batch,
    });
  } catch (error) {
    console.error("Get batch by QR error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * @swagger
 * /grain-batches/stats:
 *   get:
 *     summary: Get batch statistics for tenant
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch statistics
 */
router.get(
  "/stats",
  [auth, requirePermission("batch.view")],
  async (req, res) => {
    try {
      const adminId = req.user.admin_id || req.user._id;
      const stats = await GrainBatch.aggregate([
        { $match: { admin_id: adminId } },
        {
          $group: {
            _id: null,
            total_batches: { $sum: 1 },
            total_quantity: { $sum: "$quantity_kg" },
            stored_batches: {
              $sum: { $cond: [{ $eq: ["$status", "stored"] }, 1, 0] },
            },
            dispatched_batches: {
              $sum: { $cond: [{ $eq: ["$status", "dispatched"] }, 1, 0] },
            },
            high_risk_batches: {
              $sum: { $cond: [{ $gte: ["$risk_score", 70] }, 1, 0] },
            },
            avg_risk_score: { $avg: "$risk_score" },
            avg_storage_duration: {
              $avg: {
                $divide: [
                  { $subtract: [new Date(), "$intake_date"] },
                  1000 * 60 * 60 * 24, // Convert to days
                ],
              },
            },
          },
        },
      ]);

      const grainTypeStats = await GrainBatch.aggregate([
        { $match: { admin_id: adminId } },
        {
          $group: {
            _id: "$grain_type",
            count: { $sum: 1 },
            total_quantity: { $sum: "$quantity_kg" },
            avg_risk_score: { $avg: "$risk_score" },
          },
        },
      ]);

      res.json({
        overall_stats: stats[0] || {},
        grain_type_stats: grainTypeStats,
      });
    } catch (error) {
      console.error("Get batch stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}:
 *   put:
 *     summary: Update grain batch
 *     tags: [Grain Batches]
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
 *               batch_id:
 *                 type: string
 *               grain_type:
 *                 type: string
 *               quantity_kg:
 *                 type: number
 *               silo_id:
 *                 type: string
 *               farmer_name:
 *                 type: string
 *               farmer_contact:
 *                 type: string
 *               moisture_content:
 *                 type: number
 *               variety:
 *                 type: string
 *               grade:
 *                 type: string
 *               harvest_date:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch updated successfully
 *       404:
 *         description: Batch not found
 *       403:
 *         description: Insufficient permissions
 */
router.put(
  "/:id",
  [
    auth,
    requirePermission("batch.update"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
    [
      body("batch_id")
        .optional()
        .isString()
        .withMessage("Batch ID must be a string"),
      body("grain_type")
        .optional()
        .isString()
        .withMessage("Grain type must be a string"),
      body("quantity_kg")
        .optional()
        .isNumeric()
        .withMessage("Quantity must be a number"),
      body("silo_id")
        .optional()
        .isMongoId()
        .withMessage("Valid silo ID is required"),
      body("farmer_name")
        .optional()
        .isString()
        .withMessage("Farmer name must be a string"),
      body("farmer_contact")
        .optional()
        .isString()
        .withMessage("Farmer contact must be a string"),
      body("moisture_content")
        .optional()
        .isNumeric()
        .withMessage("Moisture content must be a number"),
      body("variety")
        .optional()
        .isString()
        .withMessage("Variety must be a string"),
      body("grade").optional().isString().withMessage("Grade must be a string"),
      body("harvest_date")
        .optional()
        .isISO8601()
        .withMessage("Harvest date must be a valid date"),
      body("notes").optional().isString().withMessage("Notes must be a string"),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: req.user.admin_id,
      });

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Update batch fields
      const updateData = { ...req.body };
      if (updateData.harvest_date) {
        updateData.harvest_date = new Date(updateData.harvest_date);
      }
      updateData.updated_by = req.user._id;

      const updatedBatch = await GrainBatch.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("silo_id", "name silo_id capacity_kg")
        .populate("buyer_id", "name contact_info");

      res.json({
        message: "Batch updated successfully",
        batch: updatedBatch,
      });
    } catch (error) {
      console.error("Update batch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}:
 *   delete:
 *     summary: Delete grain batch
 *     tags: [Grain Batches]
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
 *         description: Batch deleted successfully
 *       404:
 *         description: Batch not found
 *       403:
 *         description: Insufficient permissions
 */
router.delete(
  "/:id",
  [
    auth,
    requirePermission("batch.delete"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
  ],
  async (req, res) => {
    try {
      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: req.user.admin_id,
      });

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Update silo occupancy before deleting
      const silo = await Silo.findById(batch.silo_id);
      if (silo) {
        await silo.removeBatch(batch.quantity_kg);
      }

      await GrainBatch.findByIdAndDelete(req.params.id);

      res.json({
        message: "Batch deleted successfully",
      });
    } catch (error) {
      console.error("Delete batch error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ============= INSURANCE & LOSS CLAIM SUPPORT =============

/**
 * @swagger
 * /grain-batches/{id}/spoilage-event:
 *   post:
 *     summary: Log a spoilage event for insurance claim
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/:id/spoilage-event",
  [
    auth,
    requirePermission("insurance.create"),
    upload.array("photos", 10), // Allow up to 10 photos
    param("id").isMongoId().withMessage("Valid batch ID is required"),
    [
      body("event_type")
        .isIn(["mold", "insect", "moisture", "contamination", "other"])
        .withMessage("Invalid event type"),
      body("severity")
        .isIn(["minor", "moderate", "severe", "total_loss"])
        .withMessage("Invalid severity level"),
      body("description")
        .notEmpty()
        .withMessage("Event description is required"),
      body("estimated_loss_kg")
        .isFloat({ min: 0 })
        .withMessage("Estimated loss must be positive"),
      body("estimated_value_loss")
        .optional()
        .isFloat({ min: 0 })
        .withMessage("Estimated value loss must be positive"),
    ],
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const adminId = req.user.admin_id || req.user._id;
      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: adminId,
      });

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Create spoilage event object
      const spoilageEvent = {
        event_id: `SPEV-${Date.now()}`,
        event_type: req.body.event_type,
        severity: req.body.severity,
        description: req.body.description,
        estimated_loss_kg: req.body.estimated_loss_kg,
        estimated_value_loss: req.body.estimated_value_loss,
        detected_date: new Date(),
        reported_by: req.user._id,
        photos: req.files
          ? req.files.map((file) => ({
            filename: file.filename,
            original_name: file.originalname,
            path: file.path,
            size: file.size,
            upload_date: new Date(),
          }))
          : [],
        environmental_conditions: {
          temperature: req.body.temperature,
          humidity: req.body.humidity,
          moisture_content: batch.moisture_content,
        },
      };

      // Add to batch's spoilage events array (we need to add this field to the model)
      if (!batch.spoilage_events) batch.spoilage_events = [];
      batch.spoilage_events.push(spoilageEvent);

      // Update batch status if severe damage
      if (req.body.severity === "total_loss") {
        batch.status = "damaged";
      }

      await batch.save();

      res.status(201).json({
        message: "Spoilage event logged successfully",
        event_id: spoilageEvent.event_id,
        batch_id: batch.batch_id,
        photos_uploaded: spoilageEvent.photos.length,
      });
    } catch (error) {
      console.error("Log spoilage event error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}/insurance-report:
 *   get:
 *     summary: Generate insurance report PDF for batch
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/insurance-report",
  [
    auth,
    requirePermission("insurance.view"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
  ],
  async (req, res) => {
    try {
      const adminId = req.user.admin_id || req.user._id;
      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: adminId,
      })
        .populate("silo_id")
        .populate("created_by", "name email");

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      // Create PDF document
      const doc = new PDFKit();
      const filename = `insurance-report-${batch.batch_id}-${Date.now()}.pdf`;

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      doc.pipe(res);

      // PDF Header
      doc.fontSize(20).text("GrainHero Insurance Report", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Report Generated: ${new Date().toLocaleDateString()}`, {
          align: "right",
        });
      doc.moveDown(2);

      // Batch Information
      doc.fontSize(16).text("Batch Information", { underline: true });
      doc.fontSize(12);
      doc.text(`Batch ID: ${batch.batch_id}`);
      doc.text(`Grain Type: ${batch.grain_type}`);
      doc.text(`Quantity: ${batch.quantity_kg} kg`);
      doc.text(`Intake Date: ${batch.intake_date?.toLocaleDateString()}`);
      doc.text(`Storage Location: ${batch.silo_id?.name || "N/A"}`);
      doc.text(`Insurance Policy: ${batch.insurance_policy_number || "N/A"}`);
      doc.text(`Insured Value: ₨${batch.insurance_value || "N/A"}`);
      doc.moveDown();

      // Risk Assessment
      doc.fontSize(16).text("Risk Assessment", { underline: true });
      doc.fontSize(12);
      doc.text(`Current Risk Score: ${batch.risk_score || "N/A"}%`);
      doc.text(`Spoilage Label: ${batch.spoilage_label || "N/A"}`);
      doc.text(
        `Last Assessment: ${batch.last_risk_assessment?.toLocaleDateString() || "N/A"
        }`
      );
      doc.moveDown();

      // Spoilage Events
      if (batch.spoilage_events && batch.spoilage_events.length > 0) {
        doc.fontSize(16).text("Spoilage Events", { underline: true });
        doc.fontSize(12);

        batch.spoilage_events.forEach((event, index) => {
          doc.text(`Event ${index + 1}:`);
          doc.text(`  Type: ${event.event_type}`);
          doc.text(`  Severity: ${event.severity}`);
          doc.text(`  Date: ${event.detected_date?.toLocaleDateString()}`);
          doc.text(`  Estimated Loss: ${event.estimated_loss_kg} kg`);
          doc.text(`  Value Loss: ₨${event.estimated_value_loss || "N/A"}`);
          doc.text(`  Description: ${event.description}`);
          doc.text(`  Photos: ${event.photos?.length || 0} attached`);
          doc.moveDown();
        });
      }

      // Footer
      doc.fontSize(10);
      doc.text(
        "This report is generated by GrainHero AI-Powered Storage Management System",
        { align: "center" }
      );
      doc.text("Contact: support@grainhero.com", { align: "center" });

      doc.end();
    } catch (error) {
      console.error("Generate insurance report error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /grain-batches/{id}/export-insurance:
 *   get:
 *     summary: Export batch data in insurance company format
 *     tags: [Grain Batches]
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/export-insurance",
  [
    auth,
    requirePermission("insurance.manage"),
    param("id").isMongoId().withMessage("Valid batch ID is required"),
  ],
  async (req, res) => {
    try {
      const { format } = req.query; // efu, adamjee, ztbl
      const adminId = req.user.admin_id || req.user._id;
      const batch = await GrainBatch.findOne({
        _id: req.params.id,
        admin_id: adminId,
      })
        .populate("silo_id")
        .populate("created_by", "name email");

      if (!batch) {
        return res.status(404).json({ error: "Batch not found" });
      }

      let exportData = {};

      // Format data according to insurance company requirements
      switch (format) {
        case "efu":
          exportData = {
            policy_number: batch.insurance_policy_number,
            commodity_type: batch.grain_type,
            quantity_metric_tons: (batch.quantity_kg / 1000).toFixed(2),
            storage_location: batch.silo_id?.name,
            intake_date: batch.intake_date?.toISOString().split("T")[0],
            risk_assessment: batch.risk_score,
            claim_events:
              batch.spoilage_events?.map((event) => ({
                event_type: event.event_type,
                severity: event.severity,
                loss_quantity: event.estimated_loss_kg,
                loss_value: event.estimated_value_loss,
                event_date: event.detected_date?.toISOString().split("T")[0],
              })) || [],
          };
          break;

        case "adamjee":
          exportData = {
            InsurancePolicy: batch.insurance_policy_number,
            CommodityName: batch.grain_type,
            StoredQuantityKG: batch.quantity_kg,
            StorageLocation: batch.silo_id?.name,
            StorageDate: batch.intake_date?.toISOString(),
            RiskScore: batch.risk_score,
            SpoilageLabel: batch.spoilage_label,
            Events: batch.spoilage_events || [],
          };
          break;

        case "ztbl":
          exportData = {
            batch_reference: batch.batch_id,
            grain_commodity: batch.grain_type,
            weight_kg: batch.quantity_kg,
            storage_facility: batch.silo_id?.name,
            deposit_date: batch.intake_date,
            current_condition: batch.spoilage_label,
            ai_risk_assessment: batch.risk_score,
            damage_reports:
              batch.spoilage_events?.map((event) => ({
                damage_type: event.event_type,
                severity_level: event.severity,
                quantity_affected: event.estimated_loss_kg,
                estimated_loss: event.estimated_value_loss,
                inspection_date: event.detected_date,
              })) || [],
          };
          break;

        default:
          exportData = {
            batch_id: batch.batch_id,
            grain_type: batch.grain_type,
            quantity_kg: batch.quantity_kg,
            risk_score: batch.risk_score,
            spoilage_events: batch.spoilage_events || [],
          };
      }

      res.json({
        format: format || "standard",
        export_date: new Date().toISOString(),
        data: exportData,
      });
    } catch (error) {
      console.error("Export insurance data error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
