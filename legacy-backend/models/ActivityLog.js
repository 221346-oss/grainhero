const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Who performed the action
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    user_name: String,
    user_role: {
        type: String,
        enum: ['super_admin', 'admin', 'manager', 'technician']
    },

    // What happened
    action: {
        type: String,
        required: true,
        enum: [
            // Batch lifecycle
            'batch_created', 'batch_updated', 'batch_dispatched', 'batch_deleted',
            'batch_quantity_modified', 'batch_status_changed',
            // Spoilage
            'spoilage_event_logged', 'spoilage_photo_uploaded',
            // Buyer
            'buyer_created', 'buyer_updated', 'buyer_deleted',
            // Dispatch & payments
            'dispatch_completed', 'buyer_payment_logged', 'buyer_payment_updated',
            'payment_overdue',
            // Insurance — full lifecycle
            'insurance_policy_created', 'insurance_policy_updated',
            'insurance_policy_renewed', 'insurance_policy_cancelled', 'insurance_policy_deleted',
            'insurance_claim_filed', 'insurance_claim_updated',
            'insurance_claim_reviewed', 'insurance_claim_approved', 'insurance_claim_rejected',
            'insurance_claim_payment_processed', 'insurance_claim_document_uploaded',
            'insurance_claim_escalated', 'insurance_claim_closed',
            'insurance_coverage_requested',
            // Invoice
            'invoice_generated', 'invoice_emailed',
            // Reports
            'batch_report_generated', 'traceability_report_generated',
            // Silo
            'silo_created', 'silo_updated', 'silo_deleted',
            // Sensor & IoT
            'sensor_configured', 'sensor_calibrated', 'sensor_offline', 'sensor_online',
            'actuator_triggered', 'threshold_updated',
            // User management
            'user_created', 'user_updated', 'user_deleted', 'user_role_changed',
            'user_login', 'user_logout', 'user_invited',
            // Subscription
            'subscription_created', 'subscription_renewed', 'subscription_expired',
            'subscription_cancelled', 'subscription_payment_received',
            // Settings
            'settings_updated', 'tenant_settings_updated',
            // Alerts
            'alert_created', 'alert_acknowledged', 'alert_resolved', 'alert_escalated',
            // Export & Reports
            'report_exported', 'data_exported', 'log_exported',
            // Generic
            'other'
        ],
        index: true
    },

    // Category for filtering
    category: {
        type: String,
        enum: [
            'batch', 'spoilage', 'buyer', 'dispatch', 'payment',
            'insurance', 'invoice', 'report', 'system',
            'silo', 'sensor', 'user', 'subscription', 'threshold',
            'actuator', 'alert', 'export'
        ],
        index: true
    },

    // What entity was affected
    entity_type: {
        type: String,
        enum: [
            'GrainBatch', 'Buyer', 'InsurancePolicy', 'InsuranceClaim',
            'BuyerInvoice', 'BuyerPayment', 'User', 'Silo', 'System',
            'SensorDevice', 'Tenant', 'Subscription', 'Threshold',
            'Actuator', 'GrainAlert'
        ]
    },
    entity_id: {
        type: mongoose.Schema.Types.ObjectId
    },
    entity_ref: String, // human-readable ref like batch_id "WB-001-2026"

    // Description
    description: {
        type: String,
        required: true
    },

    // Additional metadata (flexible, keep it light)
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },

    // Severity for importance
    severity: {
        type: String,
        enum: ['info', 'warning', 'critical'],
        default: 'info'
    },

    // IP address for security auditing
    ip_address: String

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

// Indexes for fast querying
activityLogSchema.index({ admin_id: 1, created_at: -1 });
activityLogSchema.index({ user_id: 1, created_at: -1 });
activityLogSchema.index({ entity_type: 1, entity_id: 1 });
activityLogSchema.index({ category: 1, created_at: -1 });

// TTL index: auto-delete logs after 1 year (365 days)
// Insurance-related logs are EXEMPT from TTL for legal/compliance
activityLogSchema.index(
    { created_at: 1 },
    {
        expireAfterSeconds: 365 * 24 * 60 * 60,
        partialFilterExpression: { category: { $nin: ['insurance'] } }
    }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
