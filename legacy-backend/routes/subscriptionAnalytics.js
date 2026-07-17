// routes/subscriptionAnalytics.js
// Analytics endpoints for subscription data

const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const { requireAdmin, requireSuperAdmin } = require("../middleware/roleAuth");
const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { getActiveSubscription } = require("../middleware/subscription");
const { updateUsageStats, checkUsageLimits } = require("../services/usageTracking");
const { SUBSCRIPTION_STATUSES } = require("../configs/enum");

/**
 * Get subscription analytics for current user
 */
router.get("/my-analytics", auth, async (req, res) => {
  try {
    const user = req.user;
    const subscription = await getActiveSubscription(user);

    if (!subscription) {
      return res.status(404).json({
        error: "No active subscription found",
      });
    }

    // Update usage stats
    await updateUsageStats(subscription._id);
    await subscription.populate("admin_id");

    // Check for limit warnings
    const warnings = await checkUsageLimits(subscription._id);

    // Calculate usage percentages
    const usagePercentages = {
      users:
        subscription.features.max_users === -1
          ? 0
          : Math.round(
              (subscription.current_usage.users /
                subscription.features.max_users) *
                100
            ),
      batches:
        subscription.features.max_batches === -1
          ? 0
          : Math.round(
              (subscription.current_usage.batches /
                subscription.features.max_batches) *
                100
            ),
      devices:
        subscription.features.max_devices === -1
          ? 0
          : Math.round(
              (subscription.current_usage.devices /
                subscription.features.max_devices) *
                100
            ),
      storage_gb:
        subscription.features.max_storage_gb === -1
          ? 0
          : Math.round(
              (subscription.current_usage.storage_gb /
                subscription.features.max_storage_gb) *
                100
            ),
    };

    res.json({
      subscription: {
        id: subscription._id,
        plan_name: subscription.plan_name,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        next_payment_date: subscription.next_payment_date,
      },
      usage: subscription.current_usage,
      limits: {
        users: subscription.features.max_users,
        batches: subscription.features.max_batches,
        devices: subscription.features.max_devices,
        storage_gb: subscription.features.max_storage_gb,
      },
      usagePercentages,
      warnings: warnings ? warnings.warnings : [],
    });
  } catch (error) {
    console.error("Error fetching subscription analytics:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get all subscription analytics (super admin only)
 */
router.get("/all-analytics", auth, requireSuperAdmin, async (req, res) => {
  try {
    const subscriptions = await Subscription.find({
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      deleted_at: null,
    })
      .populate("admin_id")
      .populate("created_by", "name email")
      .sort({ created_at: -1 });

    const analytics = await Promise.all(
      subscriptions.map(async (sub) => {
        await updateUsageStats(sub._id);
        const warnings = await checkUsageLimits(sub._id);

        return {
          subscription_id: sub._id,
          plan_name: sub.plan_name,
          tenant: sub.admin_id?.name || "N/A",
          status: sub.status,
          price_per_month: sub.price_per_month,
          usage: sub.current_usage,
          limits: {
            users: sub.features.max_users,
            batches: sub.features.max_batches,
            devices: sub.features.max_devices,
            storage_gb: sub.features.max_storage_gb,
          },
          warnings: warnings ? warnings.warnings.length : 0,
          created_at: sub.created_at,
        };
      })
    );

    // Calculate summary statistics
    const summary = {
      total_subscriptions: analytics.length,
      total_revenue: analytics.reduce(
        (sum, sub) => sum + (sub.price_per_month || 0),
        0
      ),
      plans_distribution: analytics.reduce((acc, sub) => {
        acc[sub.plan_name] = (acc[sub.plan_name] || 0) + 1;
        return acc;
      }, {}),
      total_warnings: analytics.reduce(
        (sum, sub) => sum + (sub.warnings || 0),
        0
      ),
    };

    res.json({
      summary,
      subscriptions: analytics,
    });
  } catch (error) {
    console.error("Error fetching all analytics:", error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * Get subscription usage warnings
 */
router.get("/warnings", auth, async (req, res) => {
  try {
    const user = req.user;
    const subscription = await getActiveSubscription(user);

    if (!subscription) {
      return res.status(404).json({
        error: "No active subscription found",
      });
    }

    await updateUsageStats(subscription._id);
    const warnings = await checkUsageLimits(subscription._id);

    res.json({
      hasWarnings: warnings !== null,
      warnings: warnings ? warnings.warnings : [],
    });
  } catch (error) {
    console.error("Error fetching warnings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;

