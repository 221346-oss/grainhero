const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const Buyer = require("../models/Buyer");
const GrainBatch = require("../models/GrainBatch");
const { BUYER_STATUSES } = require("../configs/enum");
const { body, validationResult } = require("express-validator");
const LoggingService = require("../services/loggingService");

const buildSearchFilters = (adminId, query) => {
  const filters = { admin_id: adminId };
  if (!query) return filters;

  const { q, status, city } = query;
  if (q) {
    const regex = new RegExp(q.trim(), "i");
    filters.$or = [
      { name: regex },
      { company_name: regex },
      { "contact_person.name": regex },
      { "contact_person.email": regex },
      { "contact_person.phone": regex },
    ];
  }
  if (status && status !== "all") {
    filters.status = status;
  }
  if (city && city !== "all") {
    filters["location.city"] = new RegExp(`^${city}$`, "i");
  }
  return filters;
};

const mapBuyerStats = (buyers, stats) => {
  const statsMap = new Map();
  stats.forEach((entry) => {
    statsMap.set(entry._id.toString(), entry);
  });

  return buyers.map((buyer) => {
    const extra = statsMap.get(buyer._id.toString());
    return {
      ...buyer,
      totalOrders: extra?.totalOrders || 0,
      lastOrderDate: extra?.lastOrderDate || null,
    };
  });
};

router.get("/dashboard", auth, async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user._id;

    const filters = buildSearchFilters(adminId, req.query);
    filters.deleted_at = null;  // Only include non-deleted buyers
    const buyers = await Buyer.find(filters).sort({ created_at: -1 }).lean();
    const buyerIds = buyers.map((b) => b._id);

    let batchStats = [];
    if (buyerIds.length > 0) {
      batchStats = await GrainBatch.aggregate([
        {
          $match: {
            buyer_id: { $in: buyerIds },
            admin_id: adminId,
          },
        },
        {
          $group: {
            _id: "$buyer_id",
            totalOrders: { $sum: 1 },
            lastOrderDate: { $max: "$actual_dispatch_date" },
          },
        },
      ]);
    }

    const buyersWithStats = mapBuyerStats(buyers, batchStats);

    const summaryPromise = Promise.all([
      Buyer.countDocuments({ admin_id: adminId, deleted_at: null }),
      GrainBatch.countDocuments({
        admin_id: adminId,
        buyer_id: { $ne: null },
        status: { $in: ["processing", "on_hold", "stored"] },
      }),
      GrainBatch.countDocuments({
        admin_id: adminId,
        buyer_id: { $ne: null },
        expected_dispatch_date: { $gte: new Date() },
      }),
      Buyer.findOne({ admin_id: adminId, deleted_at: null }).sort({ rating: -1 }).lean(),
    ]);

    const [totalBuyers, activeContracts, scheduledDispatches, topBuyer] =
      await summaryPromise;

    const buyerNameMap = buyers.reduce((acc, buyer) => {
      acc[buyer._id.toString()] = buyer.name;
      return acc;
    }, {});

    const recentContractsRaw = await GrainBatch.find({
      admin_id: adminId,
      buyer_id: { $ne: null },
    })
      .sort({ updated_at: -1 })
      .limit(5)
      .lean();

    const recentContracts = recentContractsRaw.map((item) => ({
      id: item.batch_id,
      buyer: buyerNameMap[item.buyer_id?.toString()] || "Unknown",
      grain: item.grain_type,
      quantity_kg: item.quantity_kg,
      price_per_kg: item.purchase_price_per_kg,
      status: item.status,
    }));

    const upcomingDispatchesRaw = await GrainBatch.find({
      admin_id: adminId,
      buyer_id: { $ne: null },
      expected_dispatch_date: { $ne: null },
    })
      .sort({ expected_dispatch_date: 1 })
      .limit(5)
      .lean();

    const upcomingDispatches = upcomingDispatchesRaw.map((item) => ({
      id: item.batch_id,
      buyer: buyerNameMap[item.buyer_id?.toString()] || "Unknown",
      batch: item.batch_id,
      quantity_kg: item.quantity_kg,
      eta: item.expected_dispatch_date,
      status: item.status === "dispatched" ? "confirmed" : "scheduled",
    }));

    res.json({
      buyers: buyersWithStats,
      summary: {
        totalBuyers,
        activeContracts,
        scheduledDispatches,
        topRating: topBuyer?.rating || null,
      },
      recentContracts,
      upcomingDispatches,
    });
  } catch (error) {
    console.error("Error fetching buyers dashboard:", error);
    res.status(500).json({ message: "Failed to fetch buyers data" });
  }
});

router.post(
  "/",
  auth,
  [
    body("name").trim().notEmpty().withMessage("Buyer name is required"),
    body("contactPerson.name")
      .trim()
      .notEmpty()
      .withMessage("Contact name is required"),
    body("contactPerson.email")
      .optional()
      .isEmail()
      .withMessage("Invalid contact email"),
    body("status")
      .optional()
      .isIn(Object.values(BUYER_STATUSES))
      .withMessage("Invalid status"),
    body("rating")
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage("Rating must be between 0 and 5"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const adminId = req.user.admin_id || req.user._id;

      const payload = req.body;

      // Check for duplicate buyer by email or phone (same logic as dispatch)
      const duplicateQuery = {
        admin_id: adminId,
        $or: [],
      };

      if (payload.contactPerson?.email) {
        duplicateQuery.$or.push({
          "contact_person.email": payload.contactPerson.email,
        });
      }
      if (payload.contactPerson?.phone) {
        duplicateQuery.$or.push({
          "contact_person.phone": payload.contactPerson.phone,
        });
      }

      // If no email or phone provided, can't check for duplicates - proceed with create
      if (duplicateQuery.$or.length === 0) {
        const buyer = await Buyer.create({
          admin_id: adminId,
          name: payload.name,
          company_name: payload.companyName || payload.name,
          buyer_type: payload.buyerType,
          contact_person: {
            name: payload.contactPerson.name,
            email: payload.contactPerson.email,
            phone: payload.contactPerson.phone,
            designation: payload.contactPerson.designation,
          },
          location: {
            address: payload.location?.address,
            city: payload.location?.city,
            state: payload.location?.state,
            country: payload.location?.country,
          },
          status: payload.status || BUYER_STATUSES.ACTIVE,
          rating: payload.rating ?? 4,
          notes: payload.notes,
          tags: payload.tags,
          preferred_grain_types: payload.preferredGrainTypes,
          preferred_payment_terms: payload.preferredPaymentTerms,
        });
        return res.status(201).json({ buyer, isNew: true });
      }

      // Check if buyer exists
      const existingBuyer = await Buyer.findOne(duplicateQuery);

      if (existingBuyer) {
        // Return existing buyer with flag indicating it's a duplicate
        return res.status(200).json({
          buyer: existingBuyer,
          isNew: false,
          message: "Buyer with this email or phone already exists",
        });
      }

      // No duplicate found, create new buyer
      const buyer = await Buyer.create({
        admin_id: adminId,
        name: payload.name,
        company_name: payload.companyName || payload.name,
        buyer_type: payload.buyerType,
        contact_person: {
          name: payload.contactPerson.name,
          email: payload.contactPerson.email,
          phone: payload.contactPerson.phone,
          designation: payload.contactPerson.designation,
        },
        location: {
          address: payload.location?.address,
          city: payload.location?.city,
          state: payload.location?.state,
          country: payload.location?.country,
        },
        status: payload.status || BUYER_STATUSES.ACTIVE,
        rating: payload.rating ?? 4,
        notes: payload.notes,
        tags: payload.tags,
        preferred_grain_types: payload.preferredGrainTypes,
        preferred_payment_terms: payload.preferredPaymentTerms,
      });

      res.status(201).json({ buyer, isNew: true });

      // Log buyer creation
      LoggingService.logBuyerCreated(req.user, buyer, req.ip).catch(() => { });
    } catch (error) {
      console.error("Error creating buyer:", error);
      if (error.code === 11000) {
        return res
          .status(409)
          .json({ message: "Buyer already exists with this information" });
      }
      res.status(500).json({ message: "Failed to create buyer" });
    }
  }
);

router.put(
  "/:id",
  auth,
  [
    body("name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Buyer name cannot be empty"),
    body("contactPerson.name")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Contact name cannot be empty"),
    body("contactPerson.email")
      .optional()
      .isEmail()
      .withMessage("Invalid contact email"),
    body("status")
      .optional()
      .isIn(Object.values(BUYER_STATUSES))
      .withMessage("Invalid status"),
    body("rating")
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage("Rating must be between 0 and 5"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const adminId = req.user.admin_id || req.user._id;

      const buyer = await Buyer.findOne({
        _id: req.params.id,
        admin_id: adminId,
      });

      if (!buyer) {
        return res.status(404).json({ message: "Buyer not found" });
      }

      const payload = req.body;

      // Update fields
      if (payload.name) buyer.name = payload.name;
      if (payload.companyName !== undefined)
        buyer.company_name = payload.companyName;
      if (payload.contactPerson) {
        if (payload.contactPerson.name)
          buyer.contact_person.name = payload.contactPerson.name;
        if (payload.contactPerson.email !== undefined)
          buyer.contact_person.email = payload.contactPerson.email;
        if (payload.contactPerson.phone !== undefined)
          buyer.contact_person.phone = payload.contactPerson.phone;
        if (payload.contactPerson.designation !== undefined)
          buyer.contact_person.designation = payload.contactPerson.designation;
      }
      if (payload.location) {
        if (payload.location.address !== undefined)
          buyer.location.address = payload.location.address;
        if (payload.location.city !== undefined)
          buyer.location.city = payload.location.city;
        if (payload.location.state !== undefined)
          buyer.location.state = payload.location.state;
        if (payload.location.country !== undefined)
          buyer.location.country = payload.location.country;
      }
      if (payload.status) buyer.status = payload.status;
      if (payload.rating !== undefined) buyer.rating = payload.rating;
      if (payload.notes !== undefined) buyer.notes = payload.notes;
      if (payload.tags) buyer.tags = payload.tags;
      if (payload.preferredGrainTypes)
        buyer.preferred_grain_types = payload.preferredGrainTypes;
      if (payload.preferredPaymentTerms !== undefined)
        buyer.preferred_payment_terms = payload.preferredPaymentTerms;

      await buyer.save();

      res.json(buyer);

      // Log buyer update
      LoggingService.logBuyerUpdated(req.user, buyer, req.ip).catch(() => { });
    } catch (error) {
      console.error("Error updating buyer:", error);
      res.status(500).json({ message: "Failed to update buyer" });
    }
  }
);

router.delete("/:id", auth, async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user._id;

    const buyer = await Buyer.findOne({
      _id: req.params.id,
      admin_id: adminId,
    });

    if (!buyer) {
      return res.status(404).json({ message: "Buyer not found" });
    }

    // Soft delete
    buyer.deleted_at = new Date();
    await buyer.save();

    res.json({ message: "Buyer deleted successfully" });

    // Log buyer deletion
    LoggingService.log({
      action: 'buyer_deleted',
      category: 'buyer',
      description: `Buyer "${buyer.name}" deleted`,
      user: req.user,
      entity_type: 'Buyer',
      entity_id: buyer._id,
      entity_ref: buyer.name,
      severity: 'warning',
      ip_address: req.ip
    }).catch(() => { });
  } catch (error) {
    console.error("Error deleting buyer:", error);
    res.status(500).json({ message: "Failed to delete buyer" });
  }
});

module.exports = router;
