// services/limitWarningService.js
// Automated service to check and send limit warnings

const Subscription = require("../models/Subscription");
const User = require("../models/User");
const { updateUsageStats, checkUsageLimits } = require("./usageTracking");
const sendEmail = require("../utils/emailHelper");
const { SUBSCRIPTION_STATUSES } = require("../configs/enum");

/**
 * Check all active subscriptions and send warnings if needed
 * This should be run periodically (e.g., daily via cron job)
 */
async function checkAllSubscriptionsForWarnings() {
  try {
    const activeSubscriptions = await Subscription.find({
      status: SUBSCRIPTION_STATUSES.ACTIVE,
      deleted_at: null,
    }).populate("admin_id");

    console.log(
      `Checking ${activeSubscriptions.length} active subscriptions for limit warnings...`
    );

    let warningsSent = 0;

    for (const subscription of activeSubscriptions) {
      try {
        // Update usage stats
        await updateUsageStats(subscription._id);

        // Check for warnings
        const warningResult = await checkUsageLimits(subscription._id);

        if (warningResult && warningResult.warnings.length > 0) {
          // Get admin user for this subscription
          const adminUser = await User.findOne({
            admin_id: subscription.admin_id,
            role: "admin",
          });

          if (adminUser) {
            // Send warning email
            const warningMessages = warningResult.warnings
              .map((w) => `• ${w.message}`)
              .join("\n");

            const emailContent = `
Dear ${adminUser.name || "Admin"},

Your GrainHero subscription is approaching its usage limits:

${warningMessages}

Current Usage:
- Users: ${subscription.current_usage.users} / ${subscription.features.max_users === -1 ? "Unlimited" : subscription.features.max_users}
- Grain Batches: ${subscription.current_usage.batches} / ${subscription.features.max_batches === -1 ? "Unlimited" : subscription.features.max_batches}
- Sensors: ${subscription.current_usage.devices} / ${subscription.features.max_devices === -1 ? "Unlimited" : subscription.features.max_devices}
- Storage: ${subscription.current_usage.storage_gb}GB / ${subscription.features.max_storage_gb === -1 ? "Unlimited" : subscription.features.max_storage_gb + "GB"}

To avoid service interruptions, please consider upgrading your plan:
${process.env.FRONT_END_URL || "https://grainhero.com"}/pricing

Best regards,
The GrainHero Team
📧 noreply.grainhero1@gmail.com
📞 03110851784
            `;

            await sendEmail(
              adminUser.email,
              "Usage Limit Warning - GrainHero",
              emailContent,
              emailContent.replace(/\n/g, "<br>")
            );

            warningsSent++;
            console.log(
              `Warning email sent to ${adminUser.email} for subscription ${subscription._id}`
            );
          }
        }
      } catch (error) {
        console.error(
          `Error checking subscription ${subscription._id}:`,
          error.message
        );
      }
    }

    console.log(
      `Limit warning check completed. ${warningsSent} warning emails sent.`
    );
    return { checked: activeSubscriptions.length, warningsSent };
  } catch (error) {
    console.error("Error in limit warning service:", error);
    throw error;
  }
}

/**
 * Start periodic limit warning checks
 * Run daily at 9 AM
 */
function startLimitWarningScheduler() {
  // Check immediately on startup
  checkAllSubscriptionsForWarnings().catch((err) => {
    console.error("Error in initial limit warning check:", err);
  });

  // Schedule daily checks (24 hours = 86400000 ms)
  const dailyInterval = 24 * 60 * 60 * 1000;
  setInterval(() => {
    checkAllSubscriptionsForWarnings().catch((err) => {
      console.error("Error in scheduled limit warning check:", err);
    });
  }, dailyInterval);

  console.log("Limit warning scheduler started (daily checks)");
}

module.exports = {
  checkAllSubscriptionsForWarnings,
  startLimitWarningScheduler,
};

