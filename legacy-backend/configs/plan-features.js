// configs/plan-features.js

// Define the four subscription plans with their features and limits
const PLAN_FEATURES = {
  basic: {
    name: "Basic Plan",
    price: 1499,
    currency: "PKR",
    billingCycle: "monthly",
    description: "Perfect for small farms getting started with grain management",

    limits: {
      users: {
        managers: 2,
        technicians: 3,
        total: 5
      },
      grain_batches: 50,
      sensors: 10,
      silos: 3,
      warehouses: 1,
      storage_gb: 1,
      api_calls_per_month: 10000,
      reports_per_month: 5
    },

    features: {
      grain_management: true,
      basic_analytics: true,
      sensor_monitoring: true,
      basic_reports: true,
      email_support: true,
      mobile_app: false,
      ai_predictions: false,
      advanced_analytics: false,
      priority_support: false,
      custom_integrations: false,
      api_access: false,
      white_label: false
    },

    permissions: [
      'grain.read',
      'grain.create',
      'grain.update',
      'batch.read',
      'batch.create',
      'batch.update',
      'sensor.read',
      'sensor.monitor',
      'reports.read',
      'reports.create.basic',
      'analytics.read.basic'
    ]
  },

  standard: {
    name: "Standard Plan",
    price: 3899,
    currency: "PKR",
    billingCycle: "monthly",
    description: "Ideal for growing farms with more complex operations",

    limits: {
      users: {
        managers: 4,
        technicians: 6,
        total: 10
      },
      grain_batches: 200,
      sensors: 25,
      silos: 6,
      warehouses: 2,
      storage_gb: 5,
      api_calls_per_month: 50000,
      reports_per_month: 25
    },

    features: {
      grain_management: true,
      basic_analytics: true,
      sensor_monitoring: true,
      basic_reports: true,
      email_support: true,
      mobile_app: true,
      ai_predictions: false,
      advanced_analytics: true,
      priority_support: false,
      custom_integrations: false,
      api_access: true,
      white_label: false
    },

    permissions: [
      'grain.read',
      'grain.create',
      'grain.update',
      'grain.delete',
      'batch.read',
      'batch.create',
      'batch.update',
      'batch.delete',
      'sensor.read',
      'sensor.monitor',
      'sensor.create',
      'sensor.update',
      'reports.read',
      'reports.create',
      'reports.update',
      'analytics.read',
      'analytics.advanced'
    ]
  },

  professional: {
    name: "Professional Plan",
    price: 5999,
    currency: "PKR",
    billingCycle: "monthly",
    description: "Advanced features for professional grain operations",

    limits: {
      users: {
        managers: -1,
        technicians: -1,
        total: -1
      },
      grain_batches: 1000,
      sensors: 100,
      silos: 15,
      warehouses: 5,
      storage_gb: 20,
      api_calls_per_month: 200000,
      reports_per_month: 100
    },

    features: {
      grain_management: true,
      basic_analytics: true,
      sensor_monitoring: true,
      basic_reports: true,
      email_support: true,
      mobile_app: true,
      ai_predictions: true,
      advanced_analytics: true,
      priority_support: true,
      custom_integrations: true,
      api_access: true,
      white_label: false
    },

    permissions: [
      'grain.read',
      'grain.create',
      'grain.update',
      'grain.delete',
      'grain.manage',
      'batch.read',
      'batch.create',
      'batch.update',
      'batch.delete',
      'batch.manage',
      'sensor.read',
      'sensor.monitor',
      'sensor.create',
      'sensor.update',
      'sensor.delete',
      'sensor.manage',
      'silo.read',
      'silo.create',
      'silo.update',
      'silo.delete',
      'silo.manage',
      'buyer.read',
      'buyer.create',
      'buyer.update',
      'buyer.delete',
      'buyer.manage',
      'reports.read',
      'reports.create',
      'reports.update',
      'reports.delete',
      'analytics.read',
      'analytics.advanced',
      'analytics.ai',
      'ai.predictions',
      'risk.assessment',
      'spoilage.analysis'
    ]
  },

  enterprise: {
    name: "Enterprise Plan",
    price: 799,
    currency: "USD",
    billingCycle: "monthly",
    description: "Complete solution for large-scale grain operations",

    limits: {
      users: {
        managers: 50,
        technicians: 200,
        total: 250
      },
      grain_batches: -1, // Unlimited
      sensors: 500,
      silos: 100,
      warehouses: -1,
      storage_gb: 100,
      api_calls_per_month: -1, // Unlimited
      reports_per_month: -1 // Unlimited
    },

    features: {
      grain_management: true,
      basic_analytics: true,
      sensor_monitoring: true,
      basic_reports: true,
      email_support: true,
      mobile_app: true,
      ai_predictions: true,
      advanced_analytics: true,
      priority_support: true,
      custom_integrations: true,
      api_access: true,
      white_label: true
    },

    permissions: [
      'grain.read',
      'grain.create',
      'grain.update',
      'grain.delete',
      'grain.manage',
      'batch.read',
      'batch.create',
      'batch.update',
      'batch.delete',
      'batch.manage',
      'sensor.read',
      'sensor.monitor',
      'sensor.create',
      'sensor.update',
      'sensor.delete',
      'sensor.manage',
      'silo.read',
      'silo.create',
      'silo.update',
      'silo.delete',
      'silo.manage',
      'buyer.read',
      'buyer.create',
      'buyer.update',
      'buyer.delete',
      'buyer.manage',
      'reports.read',
      'reports.create',
      'reports.update',
      'reports.delete',
      'analytics.read',
      'analytics.advanced',
      'analytics.ai',
      'ai.predictions',
      'risk.assessment',
      'spoilage.analysis',
      'insurance.create',
      'insurance.read',
      'insurance.update',
      'insurance.delete',
      'insurance.manage',
      'payments.create',
      'payments.read',
      'payments.update',
      'payments.delete',
      'payments.manage',
      'custom.integrations',
      'white.label'
    ]
  }
}

// Helper function to get plan features
function getPlanFeatures(planName) {
  return PLAN_FEATURES[planName] || PLAN_FEATURES.basic
}

// Helper function to check if user has access to a feature
function hasFeatureAccess(planName, feature) {
  const plan = getPlanFeatures(planName)
  return plan.features[feature] || false
}

// Helper function to check if user is within limits
function isWithinLimits(planName, limitType, currentCount) {
  const plan = getPlanFeatures(planName)
  const limit = plan.limits[limitType]

  // -1 means unlimited
  if (limit === -1) return true

  return currentCount <= limit
}

// Helper function to get remaining limit
function getRemainingLimit(planName, limitType, currentCount) {
  const plan = getPlanFeatures(planName)
  const limit = plan.limits[limitType]

  // -1 means unlimited
  if (limit === -1) return "Unlimited"

  return Math.max(0, limit - currentCount)
}

// Helper function to get plan usage percentage
function getUsagePercentage(planName, limitType, currentCount) {
  const plan = getPlanFeatures(planName)
  const limit = plan.limits[limitType]

  // -1 means unlimited
  if (limit === -1) return 0

  return Math.min(100, Math.round((currentCount / limit) * 100))
}

// Helper function to check if user can create a specific role
function canCreateRole(planName, role, currentCounts) {
  const plan = getPlanFeatures(planName)

  if (role === 'manager') {
    return isWithinLimits(planName, 'users.managers', currentCounts.managers + 1)
  } else if (role === 'technician') {
    return isWithinLimits(planName, 'users.technicians', currentCounts.technicians + 1)
  }

  return false
}

// Helper function to get upgrade suggestions
function getUpgradeSuggestions(planName, currentCounts) {
  const suggestions = []
  const plan = getPlanFeatures(planName)

  // Check user limits
  const totalUsers = currentCounts.managers + currentCounts.technicians
  if (!isWithinLimits(planName, 'users.total', totalUsers + 1)) {
    suggestions.push({
      type: 'users',
      message: `You've reached your user limit (${plan.limits.users.total}). Consider upgrading to add more team members.`,
      current: totalUsers,
      limit: plan.limits.users.total
    })
  }

  // Check grain batch limits
  if (!isWithinLimits(planName, 'grain_batches', currentCounts.grain_batches + 1)) {
    suggestions.push({
      type: 'grain_batches',
      message: `You've reached your grain batch limit (${plan.limits.grain_batches}). Upgrade for more capacity.`,
      current: currentCounts.grain_batches,
      limit: plan.limits.grain_batches
    })
  }

  // Check sensor limits
  if (!isWithinLimits(planName, 'sensors', currentCounts.sensors + 1)) {
    suggestions.push({
      type: 'sensors',
      message: `You've reached your sensor limit (${plan.limits.sensors}). Upgrade to monitor more locations.`,
      current: currentCounts.sensors,
      limit: plan.limits.sensors
    })
  }

  return suggestions
}

module.exports = {
  PLAN_FEATURES,
  getPlanFeatures,
  hasFeatureAccess,
  isWithinLimits,
  getRemainingLimit,
  getUsagePercentage,
  canCreateRole,
  getUpgradeSuggestions
}
