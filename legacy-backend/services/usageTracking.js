// services/usageTracking.js
// Service to track and update subscription usage

const Subscription = require("../models/Subscription");
const User = require("../models/User");
const GrainBatch = require("../models/GrainBatch");
const SensorDevice = require("../models/SensorDevice");
const { SUBSCRIPTION_STATUSES } = require("../configs/enum");
const fs = require("fs");
const path = require("path");

/**
 * Update usage statistics for a subscription
 * @param {String} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Updated usage stats
 */
async function updateUsageStats(subscriptionId) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error("Subscription not found");
    }

    const adminId = subscription.admin_id;
    const tenantId = subscription.admin_id;

    // Count users (managers + technicians, excluding admin)
    const users = await User.countDocuments({
      admin_id: adminId,
      role: { $in: ["manager", "technician"] },
      deleted_at: null,
    });

    // Count grain batches
    const batches = await GrainBatch.countDocuments({
      admin_id: adminId,
      deleted_at: null,
    });

    // Count sensors/devices
    const devices = await SensorDevice.countDocuments({
      admin_id: adminId,
      deleted_at: null,
    });

    // Calculate storage from actual files
    const storage_gb = await calculateStorageGB(adminId);

    // Update subscription usage
    subscription.current_usage = {
      users: users,
      devices: devices,
      storage_gb: storage_gb,
      batches: batches,
    };

    await subscription.save();

    return subscription.current_usage;
  } catch (error) {
    console.error("Error updating usage stats:", error);
    throw error;
  }
}

/**
 * Check if usage is approaching limits and send warnings
 * @param {String} subscriptionId - Subscription ID
 * @returns {Promise<Object|null>} Warning object or null
 */
async function checkUsageLimits(subscriptionId) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription || subscription.status !== SUBSCRIPTION_STATUSES.ACTIVE) {
      return null;
    }

    const usage = subscription.current_usage;
    const features = subscription.features;
    const warnings = [];

    // Check each limit (80% threshold for warning)
    const thresholds = {
      users: 0.8,
      devices: 0.8,
      storage_gb: 0.8,
      batches: 0.8,
    };

    // Check users limit
    if (
      features.max_users !== -1 &&
      usage.users >= features.max_users * thresholds.users
    ) {
      warnings.push({
        type: "users",
        current: usage.users,
        limit: features.max_users,
        percentage: Math.round((usage.users / features.max_users) * 100),
        message: `You're using ${Math.round(
          (usage.users / features.max_users) * 100
        )}% of your user limit (${usage.users}/${features.max_users}).`,
      });
    }

    // Check batches limit
    if (
      features.max_batches !== -1 &&
      usage.batches >= features.max_batches * thresholds.batches
    ) {
      warnings.push({
        type: "batches",
        current: usage.batches,
        limit: features.max_batches,
        percentage: Math.round((usage.batches / features.max_batches) * 100),
        message: `You're using ${Math.round(
          (usage.batches / features.max_batches) * 100
        )}% of your grain batch limit (${usage.batches}/${
          features.max_batches
        }).`,
      });
    }

    // Check devices limit
    if (
      features.max_devices !== -1 &&
      usage.devices >= features.max_devices * thresholds.devices
    ) {
      warnings.push({
        type: "devices",
        current: usage.devices,
        limit: features.max_devices,
        percentage: Math.round((usage.devices / features.max_devices) * 100),
        message: `You're using ${Math.round(
          (usage.devices / features.max_devices) * 100
        )}% of your sensor limit (${usage.devices}/${features.max_devices}).`,
      });
    }

    // Check storage limit
    if (
      features.max_storage_gb !== -1 &&
      usage.storage_gb >= features.max_storage_gb * thresholds.storage_gb
    ) {
      warnings.push({
        type: "storage_gb",
        current: usage.storage_gb,
        limit: features.max_storage_gb,
        percentage: Math.round(
          (usage.storage_gb / features.max_storage_gb) * 100
        ),
        message: `You're using ${Math.round(
          (usage.storage_gb / features.max_storage_gb) * 100
        )}% of your storage limit (${usage.storage_gb}GB/${
          features.max_storage_gb
        }GB).`,
      });
    }

    return warnings.length > 0 ? { warnings, subscriptionId } : null;
  } catch (error) {
    console.error("Error checking usage limits:", error);
    return null;
  }
}

/**
 * Increment usage counter for a resource type
 * @param {String} subscriptionId - Subscription ID
 * @param {String} resourceType - Type of resource (users, devices, batches, storage_gb)
 * @param {Number} increment - Amount to increment (default: 1)
 */
async function incrementUsage(subscriptionId, resourceType, increment = 1) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return;
    }

    if (subscription.current_usage[resourceType] !== undefined) {
      subscription.current_usage[resourceType] += increment;
      await subscription.save();
    }
  } catch (error) {
    console.error("Error incrementing usage:", error);
  }
}

/**
 * Decrement usage counter for a resource type
 * @param {String} subscriptionId - Subscription ID
 * @param {String} resourceType - Type of resource
 * @param {Number} decrement - Amount to decrement (default: 1)
 */
async function decrementUsage(subscriptionId, resourceType, decrement = 1) {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return;
    }

    if (subscription.current_usage[resourceType] !== undefined) {
      subscription.current_usage[resourceType] = Math.max(
        0,
        subscription.current_usage[resourceType] - decrement
      );
      await subscription.save();
    }
  } catch (error) {
    console.error("Error decrementing usage:", error);
  }
}

/**
 * Calculate total storage in GB for an admin
 * @param {String} adminId - Admin ID
 * @returns {Promise<Number>} Storage in GB
 */
async function calculateStorageGB(adminId) {
  try {
    let totalBytes = 0;

    // 1. Calculate from GrainBatch photos (stored in database with size)
    const batches = await GrainBatch.find({
      admin_id: adminId,
      "spoilage_events.photos": { $exists: true, $ne: [] },
    }).select("spoilage_events");

    batches.forEach((batch) => {
      if (batch.spoilage_events && Array.isArray(batch.spoilage_events)) {
        batch.spoilage_events.forEach((event) => {
          if (event.photos && Array.isArray(event.photos)) {
            event.photos.forEach((photo) => {
              if (photo.size) {
                totalBytes += photo.size;
              }
            });
          }
        });
      }
    });

    // 2. Calculate from files in uploads directory
    // Note: Since files are stored in shared directories, we calculate all files
    // In a multi-tenant production system, you'd want tenant-specific directories
    const uploadsDir = path.join(__dirname, "../uploads");
    if (fs.existsSync(uploadsDir)) {
      // For now, we calculate all files in uploads
      // TODO: If you implement tenant-specific directories, filter by tenant
      totalBytes += calculateDirectorySize(uploadsDir);
    }

    // 3. Calculate from spoilage-events directory (if exists)
    const spoilageDir = path.join(__dirname, "../uploads/spoilage-events");
    if (fs.existsSync(spoilageDir)) {
      // Same note as above - tenant-specific directories would be better
      totalBytes += calculateDirectorySize(spoilageDir);
    }

    // Convert bytes to GB (1 GB = 1024^3 bytes)
    const storageGB = totalBytes / (1024 * 1024 * 1024);
    return Math.round(storageGB * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error("Error calculating storage:", error);
    return 0; // Return 0 on error to avoid breaking the flow
  }
}

/**
 * Recursively calculate directory size
 * @param {String} dirPath - Directory path
 * @returns {Number} Total size in bytes
 */
function calculateDirectorySize(dirPath) {
  let totalSize = 0;
  try {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        totalSize += stats.size;
      } else if (stats.isDirectory()) {
        totalSize += calculateDirectorySize(filePath);
      }
    });
  } catch (error) {
    // Ignore errors (permissions, etc.)
    console.warn(`Error calculating size for ${dirPath}:`, error.message);
  }
  return totalSize;
}

module.exports = {
  updateUsageStats,
  checkUsageLimits,
  incrementUsage,
  decrementUsage,
  calculateStorageGB,
};
