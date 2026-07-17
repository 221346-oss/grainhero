// configs/plan-mapping.js
// Centralized plan mapping to ensure consistency across the entire application

/**
 * Plan ID Mapping:
 * - Internal IDs used in code: basic, intermediate, pro
 * - Branded names shown to users: Grain Starter, Grain Professional, Grain Enterprise
 * - Plan feature keys: basic, standard, professional, enterprise
 */

const PLAN_MAPPING = {
  // Checkout/Stripe plan IDs -> Plan feature keys
  basic: {
    planKey: 'basic', // Key in plan-features.js
    brandedName: 'Starter',
    displayName: 'Starter',
    subscriptionPlanName: 'Starter', // For Subscription model
    price: 1499,
    stripePriceId: null // Will be set dynamically
  },
  intermediate: {
    planKey: 'standard', // Maps to 'standard' in plan-features.js
    brandedName: 'Professional',
    displayName: 'Professional',
    subscriptionPlanName: 'Professional',
    price: 3899,
    stripePriceId: null
  },
  pro: {
    planKey: 'professional', // Maps to 'professional' in plan-features.js
    brandedName: 'Enterprise',
    displayName: 'Enterprise',
    subscriptionPlanName: 'Enterprise',
    price: 5999,
    stripePriceId: null
  },
  // For future use or manual assignments
  standard: {
    planKey: 'standard',
    brandedName: 'Professional',
    displayName: 'Professional',
    subscriptionPlanName: 'Professional',
    price: 3899,
    stripePriceId: null
  },
  professional: {
    planKey: 'professional',
    brandedName: 'Enterprise',
    displayName: 'Enterprise',
    subscriptionPlanName: 'Enterprise',
    price: 5999,
    stripePriceId: null
  },
  enterprise: {
    planKey: 'enterprise',
    brandedName: 'Grain Enterprise Plus',
    displayName: 'Grain Enterprise Plus',
    subscriptionPlanName: 'Grain Enterprise Plus',
    price: 1999,
    stripePriceId: null
  }
};

/**
 * Get plan mapping by checkout plan ID (basic, intermediate, pro)
 */
function getPlanMapping(checkoutPlanId) {
  return PLAN_MAPPING[checkoutPlanId] || PLAN_MAPPING.basic;
}

/**
 * Get plan mapping by plan feature key (basic, standard, professional, enterprise)
 */
function getPlanMappingByKey(planKey) {
  // Find mapping where planKey matches
  for (const [key, mapping] of Object.entries(PLAN_MAPPING)) {
    if (mapping.planKey === planKey) {
      return mapping;
    }
  }
  return PLAN_MAPPING.basic;
}

/**
 * Convert checkout plan ID to plan feature key
 * e.g., 'intermediate' -> 'standard', 'pro' -> 'professional'
 */
function checkoutPlanIdToPlanKey(checkoutPlanId) {
  const mapping = getPlanMapping(checkoutPlanId);
  return mapping.planKey;
}

/**
 * Convert plan feature key to checkout plan ID
 * e.g., 'standard' -> 'intermediate', 'professional' -> 'pro'
 */
function planKeyToCheckoutPlanId(planKey) {
  // Reverse lookup
  if (planKey === 'basic') return 'basic';
  if (planKey === 'standard') return 'intermediate';
  if (planKey === 'professional') return 'pro';
  if (planKey === 'enterprise') return 'enterprise';
  return 'basic';
}

/**
 * Get branded name for display
 */
function getBrandedName(checkoutPlanId) {
  const mapping = getPlanMapping(checkoutPlanId);
  return mapping.brandedName;
}

/**
 * Get subscription plan name for Subscription model
 */
function getSubscriptionPlanName(checkoutPlanId) {
  const mapping = getPlanMapping(checkoutPlanId);
  return mapping.subscriptionPlanName;
}

/**
 * Validate plan ID
 */
function isValidPlanId(planId) {
  return Object.keys(PLAN_MAPPING).includes(planId);
}

/**
 * Get all valid plan IDs
 */
function getValidPlanIds() {
  return Object.keys(PLAN_MAPPING);
}

module.exports = {
  PLAN_MAPPING,
  getPlanMapping,
  getPlanMappingByKey,
  checkoutPlanIdToPlanKey,
  planKeyToCheckoutPlanId,
  getBrandedName,
  getSubscriptionPlanName,
  isValidPlanId,
  getValidPlanIds
};

