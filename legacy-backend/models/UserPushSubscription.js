const mongoose = require('mongoose');

const userPushSubscriptionSchema = new mongoose.Schema({
    // User this subscription belongs to
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    // Push subscription details
    subscription: {
        endpoint: {
            type: String,
            required: true,
            unique: true
        },
        expirationTime: Date,
        keys: {
            p256dh: String,
            auth: String
        }
    },

    // Device information
    user_agent: String,
    device_type: {
        type: String,
        enum: ['desktop', 'mobile', 'tablet'],
        default: 'desktop'
    },

    // Notification preferences for this user
    preferences: {
        push_enabled: { type: Boolean, default: true },
        
        // Category-specific preferences
        categories: {
            spoilage: { type: Boolean, default: true },
            dispatch: { type: Boolean, default: true },
            payment: { type: Boolean, default: true },
            insurance: { type: Boolean, default: true },
            invoice: { type: Boolean, default: true },
            batch: { type: Boolean, default: true },
            system: { type: Boolean, default: true }
        },

        // Quiet hours (optional)
        quiet_hours_enabled: { type: Boolean, default: false },
        quiet_hours_start: String, // HH:MM format
        quiet_hours_end: String,   // HH:MM format
        quiet_hours_timezone: String, // e.g., 'America/New_York'

        // Sound and vibration
        sound_enabled: { type: Boolean, default: true },
        vibration_enabled: { type: Boolean, default: true },

        // Frequency settings
        batch_digest: { type: Boolean, default: false }, // Batch multiple notifications
        digest_frequency: {
            type: String,
            enum: ['immediate', 'hourly', 'daily'],
            default: 'immediate'
        }
    },

    // Subscription status
    is_active: { type: Boolean, default: true },
    last_used: Date,
    failed_attempts: { type: Number, default: 0 },
    marked_invalid: { type: Boolean, default: false }

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

// Indexes
userPushSubscriptionSchema.index({ user_id: 1, is_active: 1 });
userPushSubscriptionSchema.index({ endpoint: 1 });
userPushSubscriptionSchema.index({ 'preferences.push_enabled': 1 });

module.exports = mongoose.model('UserPushSubscription', userPushSubscriptionSchema);
