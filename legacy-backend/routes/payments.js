const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permission");
const Subscription = require("../models/Subscription");
const { USER_ROLES } = require("../configs/enum");

/**
 * Helper to resolve administrative isolation scope
 */
function resolveIsolationScope(user, queryAdminId) {
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    // Super admin can view all; optionally scoped by admin_id query
    return queryAdminId ? { admin_id: queryAdminId } : {};
  }
  // Admin (and others) must be scoped to their admin identity
  return { admin_id: user.admin_id || user._id };
}

/**
 * GET /api/payments
 * List subscriptions/payments scoped to admin or globally (super admin)
 */
router.get(
  "/",
  auth,
  requirePermission("payment.view"),
  async (req, res) => {
    try {
      const { admin_id, status, page = 1, limit = 20 } = req.query;
      const adminId = req.user.admin_id || req.user._id;

      let filter = {};

      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        // Super admin can view all; optionally scoped by admin_id query
        if (admin_id) filter.admin_id = admin_id;
      } else {
        // Admin (and others) - filter by their administrative ID
        filter.admin_id = adminId;
      }

      if (status) filter.status = status;

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [items, total] = await Promise.all([
        Subscription.find(filter)
          .sort({ created_at: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Subscription.countDocuments(filter),
      ]);

      res.json({
        payments: items,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / parseInt(limit)),
          total_items: total,
          items_per_page: parseInt(limit),
        },
      });
    } catch (err) {
      console.error("Payments list error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /api/payments/summary
 * Summary metrics for payments/subscriptions
 */
router.get(
  "/summary",
  auth,
  requirePermission("payment.view"),
  async (req, res) => {
    try {
      const { admin_id } = req.query;
      const adminId = req.user.admin_id || req.user._id;

      let filter = {};
      if (req.user.role === USER_ROLES.SUPER_ADMIN) {
        if (admin_id) filter.admin_id = admin_id;
      } else {
        filter.admin_id = adminId;
      }

      const subs = await Subscription.find(filter);

      const summary = subs.reduce(
        (acc, sub) => {
          acc.total_subscriptions += 1;
          acc.total_revenue += sub.price_per_month || 0;
          acc.active += sub.status === "active" ? 1 : 0;
          acc.cancelled += sub.status === "cancelled" ? 1 : 0;
          acc.past_due += sub.payment_status === "failed" ? 1 : 0;
          return acc;
        },
        {
          total_subscriptions: 0,
          total_revenue: 0,
          active: 0,
          cancelled: 0,
          past_due: 0,
        }
      );

      res.json(summary);
    } catch (err) {
      console.error("Payments summary error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
