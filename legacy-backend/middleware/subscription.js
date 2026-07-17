// middleware/subscription.js
// Middleware and helpers to check subscription features and limits from Subscription document

const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { getPlanFeatures } = require("../configs/plan-features");
const { checkoutPlanIdToPlanKey } = require("../configs/plan-mapping");
const { SUBSCRIPTION_STATUSES } = require("../configs/enum");

/**
 * Get active subscription for a user
 * @param {Object} user - User object
 * @returns {Promise<Object|null>} Active subscription or null
 */
async function getActiveSubscription(user) {
  try {
    if (!user) {
      return null;
    }

    const adminId = user.admin_id || user._id;

    if (adminId) {
      // Find active subscription for the tenant
      const subscription = await Subscription.findOne({
        admin_id: adminId,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        deleted_at: null,
      }).sort({ created_at: -1 });

      if (subscription) return subscription;
    }

    // Fallback: find by Stripe customer ID when admin_id is missing
    if (user.customerId) {
      const subscription = await Subscription.findOne({
        stripe_customer_id: user.customerId,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        deleted_at: null,
      }).sort({ created_at: -1 });

      if (subscription) return subscription;
    }

    // Last resort: find by created_by (user ID)
    const subscription = await Subscription.findOne({
      $or: [
        { created_by: user._id },
        { admin_id: user._id }
      ],
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      deleted_at: null,
    }).sort({ created_at: -1 });

    return subscription;
  } catch (error) {
    console.error("Error getting active subscription:", error);
    return null;
  }
}

/**
 * Get user's plan features (from Subscription or fallback to User model)
 * @param {Object} user - User object
 * @returns {Promise<Object>} Plan features object
 */
async function getUserPlanFeatures(user) {
  try {
    // First try to get from Subscription document
    const subscription = await getActiveSubscription(user);

    if (subscription) {
      // Return features from subscription
      return {
        planKey: subscription.plan_name,
        features: subscription.features,
        limits: {
          users: { total: subscription.features.max_users },
          grain_batches: subscription.features.max_batches,
          sensors: subscription.features.max_devices,
          storage_gb: subscription.features.max_storage_gb,
        },
        subscription: subscription,
      };
    }

    // Fallback to User model
    let planKey = "basic";
    if (user.subscription_plan) {
      planKey = user.subscription_plan;
    } else if (user.hasAccess && user.hasAccess !== "none") {
      // Convert checkout plan ID to plan key
      planKey = checkoutPlanIdToPlanKey(user.hasAccess);
    }

    const planFeatures = getPlanFeatures(planKey);
    return {
      planKey: planKey,
      features: planFeatures.features,
      limits: planFeatures.limits,
      subscription: null,
    };
  } catch (error) {
    console.error("Error getting user plan features:", error);
    // Return basic plan as fallback
    const planFeatures = getPlanFeatures("basic");
    return {
      planKey: "basic",
      features: planFeatures.features,
      limits: planFeatures.limits,
      subscription: null,
    };
  }
}

/**
 * Check if user has access to a specific feature
 * @param {Object} user - User object
 * @param {String} featureName - Feature name to check
 * @returns {Promise<Boolean>} True if user has access
 */
async function hasFeatureAccess(user, featureName) {
  try {
    const planData = await getUserPlanFeatures(user);

    // Check feature in subscription or plan features
    if (planData.subscription) {
      // Check subscription features object
      if (planData.subscription.features[featureName] !== undefined) {
        return planData.subscription.features[featureName] === true;
      }
    }

    // Fallback to plan features
    return planData.features[featureName] === true;
  } catch (error) {
    console.error("Error checking feature access:", error);
    return false;
  }
}

/**
 * Check if user is within limits for a resource
 * @param {Object} user - User object
 * @param {String} limitType - Type of limit (users, grain_batches, sensors, storage_gb)
 * @param {Number} currentCount - Current usage count
 * @returns {Promise<Object>} { withinLimit: Boolean, limit: Number, current: Number }
 */
async function checkLimit(user, limitType, currentCount) {
  try {
    const planData = await getUserPlanFeatures(user);

    let limit;
    if (planData.subscription) {
      // Get limit from subscription
      if (limitType === "users") {
        limit = planData.subscription.features.max_users;
      } else if (limitType === "grain_batches") {
        limit = planData.subscription.features.max_batches;
      } else if (limitType === "sensors") {
        limit = planData.subscription.features.max_devices;
      } else if (limitType === "storage_gb") {
        limit = planData.subscription.features.max_storage_gb;
      } else {
        limit = -1; // Unknown limit type
      }
    } else {
      // Get limit from plan features
      if (limitType === "users") {
        limit = planData.limits.users.total;
      } else {
        limit = planData.limits[limitType] || -1;
      }
    }

    // -1 means unlimited
    const withinLimit = limit === -1 || currentCount < limit;

    return {
      withinLimit,
      limit: limit === -1 ? "unlimited" : limit,
      current: currentCount,
      remaining: limit === -1 ? "unlimited" : Math.max(0, limit - currentCount),
    };
  } catch (error) {
    console.error("Error checking limit:", error);
    return {
      withinLimit: false,
      limit: 0,
      current: currentCount,
      remaining: 0,
    };
  }
}

/**
 * Middleware to check if user has feature access
 * @param {String} featureName - Feature name to check
 * @returns {Function} Express middleware
 */
function requireFeature(featureName) {
  return async (req, res, next) => {
    try {
      const hasAccess = await hasFeatureAccess(req.user, featureName);

      if (!hasAccess) {
        return res.status(403).json({
          error: "Feature not available",
          message: `This feature requires a higher subscription plan. Please upgrade to access ${featureName}.`,
          feature: featureName,
        });
      }

      next();
    } catch (error) {
      console.error("Error in requireFeature middleware:", error);
      return res
        .status(500)
        .json({ error: "Server error checking feature access" });
    }
  };
}

/**
 * Middleware to check if user is within resource limits
 * @param {String} limitType - Type of limit to check
 * @param {Function} getCurrentCount - Function to get current usage count
 * @returns {Function} Express middleware
 */
function requireWithinLimit(limitType, getCurrentCount) {
  return async (req, res, next) => {
    try {
      const currentCount = await getCurrentCount(req.user);
      const limitCheck = await checkLimit(
        req.user,
        limitType,
        currentCount + 1
      ); // +1 for the new resource being created

      if (!limitCheck.withinLimit) {
        return res.status(403).json({
          error: "Limit exceeded",
          message: `You have reached your ${limitType} limit (${limitCheck.limit}). Please upgrade your plan to add more.`,
          limit: limitCheck.limit,
          current: limitCheck.current,
          remaining: limitCheck.remaining,
        });
      }

      // Attach limit info to request for use in route handler
      req.subscriptionLimit = limitCheck;
      next();
    } catch (error) {
      console.error("Error in requireWithinLimit middleware:", error);
      return res.status(500).json({ error: "Server error checking limits" });
    }
  };
}

module.exports = {
  getActiveSubscription,
  getUserPlanFeatures,
  hasFeatureAccess,
  checkLimit,
  requireFeature,
  requireWithinLimit,
};
