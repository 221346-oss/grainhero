const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permission");
const InsurancePolicy = require("../models/InsurancePolicy");
const InsuranceClaim = require("../models/InsuranceClaim");
const Subscription = require("../models/Subscription");
const GrainBatch = require("../models/GrainBatch");
const Silo = require("../models/Silo");
const { USER_ROLES } = require("../configs/enum");

/**
 * Helper to build isolation scope based on admin_id
 */
function getIsolationScope(user) {
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return {}; // Super admin sees all (legacy compatibility)
  }
  return { admin_id: user.admin_id || user._id };
}

/**
 * GET /api/reports/overview
 * Returns combined reports for insurance, payments/subscriptions, and key ops metrics.
 */
router.get(
  "/overview",
  auth,
  requirePermission("reports.view"),
  async (req, res) => {
    try {
      const scope = getIsolationScope(req.user);

      // Insurance stats
      const policies = await InsurancePolicy.find(scope);
      const claims = await InsuranceClaim.find(scope);
      const insurance = {
        total_policies: policies.length,
        active_policies: policies.filter((p) => p.status === "active").length,
        total_coverage: policies.reduce((sum, p) => sum + (p.coverage_amount || 0), 0),
        total_premium: policies.reduce((sum, p) => sum + (p.premium_amount || 0), 0),
        total_claims: claims.length,
        approved_claims: claims.filter((c) => c.status === "approved").length,
        total_claims_amount: claims.reduce((sum, c) => sum + (c.amount_approved || 0), 0),
      };

      // Payments/Subscription stats
      const subs = await Subscription.find(scope);
      const payments = subs.reduce(
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

      // Ops metrics (batches, silos)
      const batches = await GrainBatch.find(scope);
      const silos = await Silo.find(scope);
      const ops = {
        total_batches: batches.length,
        total_silos: silos.length,
        active_silos: silos.filter((s) => s.status === "active").length,
      };

      res.json({
        insurance,
        payments,
        ops,
      });
    } catch (err) {
      console.error("Reports overview error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = router;
