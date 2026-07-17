// scripts/migrate-subscriptions.js
// Migration script to update existing users and create Subscription records

require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Tenant = require("../models/Tenant");
const {
  checkoutPlanIdToPlanKey,
  getPlanMapping,
  getSubscriptionPlanName,
} = require("../configs/plan-mapping");
const { getPlanFeatures } = require("../configs/plan-features");
const {
  SUBSCRIPTION_STATUSES,
  BILLING_CYCLES,
  PAYMENT_STATUSES,
} = require("../configs/enum");

const connectionString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;

async function migrateSubscriptions() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");

    // Find all users with active subscriptions (hasAccess and customerId)
    const usersWithSubscriptions = await User.find({
      hasAccess: { $ne: "none" },
      customerId: { $exists: true, $ne: null },
    });

    console.log(
      `Found ${usersWithSubscriptions.length} users with subscriptions to migrate`
    );

    let migrated = 0;
    let errors = 0;

    for (const user of usersWithSubscriptions) {
      try {
        console.log(`\nProcessing user: ${user.email} (${user._id})`);

        // Ensure tenant exists
        let tenant = null;
        if (user.tenant_id) {
          tenant = await Tenant.findById(user.tenant_id);
        }

        if (!tenant) {
          // Create tenant if it doesn't exist
          tenant = new Tenant({
            name: `${user.name || "Admin User"}'s Farm`,
            email: user.email,
            business_type: "farm",
            created_by: user._id,
          });
          await tenant.save();
          console.log(`Created tenant: ${tenant._id}`);

          // Update user with tenant_id
          user.tenant_id = tenant._id;
          user.owned_tenant_id = tenant._id;
        }

        // Get plan mapping
        const planMapping = getPlanMapping(user.hasAccess);
        const planKey = checkoutPlanIdToPlanKey(user.hasAccess);
        const planFeatures = getPlanFeatures(planKey);
        const subscriptionPlanName = getSubscriptionPlanName(user.hasAccess);

        // Update user.subscription_plan if not set
        if (!user.subscription_plan) {
          user.subscription_plan = planKey;
          await user.save();
          console.log(`Updated user.subscription_plan to: ${planKey}`);
        }

        // Check if subscription already exists
        const existingSubscription = await Subscription.findOne({
          tenant_id: tenant._id,
          stripe_customer_id: user.customerId,
          status: {
            $in: [SUBSCRIPTION_STATUSES.ACTIVE, SUBSCRIPTION_STATUSES.TRIAL],
          },
        });

        if (existingSubscription) {
          console.log(
            `Subscription already exists: ${existingSubscription._id}`
          );
          continue;
        }

        // Create subscription record
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1); // Assume monthly for now

        const subscriptionFeatures = {
          max_users: planFeatures.limits.users.total,
          max_devices: planFeatures.limits.sensors,
          max_storage_gb: planFeatures.limits.storage_gb,
          max_batches:
            planFeatures.limits.grain_batches === -1
              ? -1
              : planFeatures.limits.grain_batches,
          ai_features: planFeatures.features.ai_predictions || false,
          priority_support: planFeatures.features.priority_support || false,
          custom_integrations:
            planFeatures.features.custom_integrations || false,
          advanced_analytics: planFeatures.features.advanced_analytics || false,
        };

        const subscription = new Subscription({
          tenant_id: tenant._id,
          plan_name: subscriptionPlanName,
          plan_description: planFeatures.description,
          price_per_month: planMapping.price,
          currency: planFeatures.currency || "USD",
          billing_cycle: BILLING_CYCLES.MONTHLY,
          start_date: user.created_at || now,
          end_date: endDate,
          status: SUBSCRIPTION_STATUSES.ACTIVE,
          payment_status: PAYMENT_STATUSES.PAID,
          last_payment_date: user.created_at || now,
          next_payment_date: endDate,
          payment_method: "stripe",
          stripe_customer_id: user.customerId,
          stripe_price_id: user.priceId || null,
          features: subscriptionFeatures,
          auto_renew: true,
          created_by: user._id,
        });

        await subscription.save();
        console.log(
          `Created subscription: ${subscription._id} for plan: ${subscriptionPlanName}`
        );
        migrated++;
      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error.message);
        errors++;
      }
    }

    console.log(`\n=== Migration Complete ===`);
    console.log(`Migrated: ${migrated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total processed: ${usersWithSubscriptions.length}`);
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run migration
if (require.main === module) {
  migrateSubscriptions()
    .then(() => {
      console.log("Migration script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration script failed:", error);
      process.exit(1);
    });
}

module.exports = { migrateSubscriptions };
