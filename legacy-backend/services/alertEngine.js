const GrainAlert = require('../models/GrainAlert');
const NotificationService = require('./notificationService');
const User = require('../models/User');
const { ALERT_PRIORITIES, ALERT_ESCALATION_STATUSES } = require('../configs/enum');

/**
 * AlertEngine — Central alert generation engine
 * Auto-creates GrainAlert records from system events and triggers notifications.
 * Covers: insurance, batches, subscriptions, sensors, payments, users.
 */
class AlertEngine {

    /**
     * Create an alert and notify relevant users
     */
    static async createAlert({
        admin_id,
        silo_id = null,
        batch_id = null,
        title,
        message,
        alert_type = 'in-app',
        priority = ALERT_PRIORITIES.MEDIUM,
        source = 'system',
        sensor_type = null,
        trigger_conditions = null,
        ai_context = null,
        tags = [],
        created_by = null
    }) {
        try {
            const alert = new GrainAlert({
                admin_id: admin_id || admin_id, // Fallback
                admin_id,
                silo_id,
                batch_id,
                title,
                message,
                alert_type,
                priority,
                source,
                sensor_type,
                trigger_conditions,
                ai_context,
                tags,
                created_by,
                status: ALERT_ESCALATION_STATUSES.PENDING
            });

            await alert.save();

            // Determine who to notify based on priority
            const rolesToNotify = this._getRolesToNotify(priority);
            await this._notifyUsers(alert.admin_id, alert, rolesToNotify);

            return alert;
        } catch (error) {
            console.error('AlertEngine.createAlert error:', error.message);
            return null;
        }
    }

    /**
     * Process a log entry and decide if it should generate an alert
     */
    static async processLogEntry(logEntry) {
        const alertConfig = this._getAlertConfigForAction(logEntry.action);
        if (!alertConfig) return null;

        return this.createAlert({
            admin_id: logEntry.admin_id,
            admin_id: logEntry.admin_id,
            title: alertConfig.title(logEntry),
            message: alertConfig.message(logEntry),
            priority: alertConfig.priority,
            source: alertConfig.source,
            tags: [logEntry.category, logEntry.action],
            created_by: logEntry.user_id
        });
    }

    /**
     * Alert configuration map — defines which actions trigger alerts
     */
    static _getAlertConfigForAction(action) {
        const configs = {
            // ── Batch Events ──
            batch_deleted: {
                priority: ALERT_PRIORITIES.CRITICAL,
                source: 'system',
                title: (log) => `⚠️ Batch Deleted: ${log.entity_ref || 'Unknown'}`,
                message: (log) => `${log.description}. Action by ${log.user_name || 'System'}.`
            },
            batch_quantity_modified: {
                priority: ALERT_PRIORITIES.HIGH,
                source: 'system',
                title: (log) => `📦 Batch Quantity Changed: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description
            },

            // ── Spoilage Events ──
            spoilage_event_logged: {
                priority: ALERT_PRIORITIES.HIGH,
                source: 'system',
                title: (log) => `🔴 Spoilage Detected: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description
            },

            // ── Insurance Events ──
            insurance_claim_filed: {
                priority: ALERT_PRIORITIES.HIGH,
                source: 'insurance',
                title: (log) => `🛡️ New Claim Filed: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description
            },
            insurance_claim_approved: {
                priority: ALERT_PRIORITIES.MEDIUM,
                source: 'insurance',
                title: (log) => `✅ Claim Approved: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description
            },
            insurance_claim_rejected: {
                priority: ALERT_PRIORITIES.HIGH,
                source: 'insurance',
                title: (log) => `❌ Claim Rejected: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description
            },
            insurance_claim_payment_processed: {
                priority: ALERT_PRIORITIES.MEDIUM,
                source: 'insurance',
                title: (log) => `💰 Claim Payment Processed: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description
            },
            insurance_policy_cancelled: {
                priority: ALERT_PRIORITIES.HIGH,
                source: 'insurance',
                title: (log) => `🛡️ Policy Cancelled: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description
            },

            // ── Subscription Events ──
            subscription_expired: {
                priority: ALERT_PRIORITIES.CRITICAL,
                source: 'subscription',
                title: () => `🔑 Subscription Expired`,
                message: (log) => log.description || 'Your subscription has expired. Please renew to continue using all features.'
            },
            subscription_cancelled: {
                priority: ALERT_PRIORITIES.HIGH,
                source: 'subscription',
                title: () => `🔑 Subscription Cancelled`,
                message: (log) => log.description || 'Your subscription has been cancelled.'
            },

            // ── Payment Events ──
            payment_overdue: {
                priority: ALERT_PRIORITIES.HIGH,
                source: 'payment',
                title: (log) => `💳 Payment Overdue: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description
            },

            // ── Sensor Events ──
            sensor_offline: {
                priority: ALERT_PRIORITIES.HIGH,
                source: 'sensor',
                title: (log) => `📡 Sensor Offline: ${log.entity_ref || 'Unknown'}`,
                message: (log) => log.description || 'A sensor device has gone offline.'
            },

            // ── User Events ──
            user_role_changed: {
                priority: ALERT_PRIORITIES.MEDIUM,
                source: 'user',
                title: (log) => `👤 User Role Changed`,
                message: (log) => log.description
            },
        };

        return configs[action] || null;
    }

    /**
     * Determine which roles to notify based on alert priority
     */
    static _getRolesToNotify(priority) {
        switch (priority) {
            case ALERT_PRIORITIES.CRITICAL:
                return ['super_admin', 'admin', 'manager'];
            case ALERT_PRIORITIES.HIGH:
                return ['admin', 'manager'];
            case ALERT_PRIORITIES.MEDIUM:
                return ['admin', 'manager'];
            case ALERT_PRIORITIES.LOW:
                return ['admin'];
            default:
                return ['admin'];
        }
    }

    /**
     * Send notifications to users by role
     */
    static async _notifyUsers(adminId, alert, roles) {
        try {
            const users = await User.find({
                admin_id: adminId,
                role: { $in: roles },
                status: 'active'
            }).select('_id');

            if (users.length === 0) return;

            const notificationType = alert.priority === ALERT_PRIORITIES.CRITICAL ? 'critical' :
                alert.priority === ALERT_PRIORITIES.HIGH ? 'warning' : 'info';

            await NotificationService.notify({
                admin_id: adminId,
                recipient_ids: users.map(u => u._id),
                title: alert.title,
                message: alert.message,
                type: notificationType,
                category: 'system',
                entity_type: 'GrainAlert',
                entity_id: alert._id,
                action_url: '/grain-alerts',
                channels: {
                    in_app: true,
                    email: alert.priority === ALERT_PRIORITIES.CRITICAL || alert.priority === ALERT_PRIORITIES.HIGH,
                    sms: false
                }
            });
        } catch (error) {
            console.error('AlertEngine._notifyUsers error:', error.message);
        }
    }

    // ====== Scheduled Check Methods (called by cron or on-demand) ======

    /**
     * Check for insurance policies expiring soon
     */
    static async checkInsuranceRenewals() {
        try {
            const InsurancePolicy = require('../models/InsurancePolicy');

            // Policies expiring in 7 days
            const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const now = new Date();

            const expiringPolicies = await InsurancePolicy.find({
                status: 'active',
                end_date: { $gte: now, $lte: thirtyDays }
            });

            for (const policy of expiringPolicies) {
                const daysLeft = Math.ceil((new Date(policy.end_date) - now) / (1000 * 60 * 60 * 24));
                const priority = daysLeft <= 7 ? ALERT_PRIORITIES.CRITICAL : ALERT_PRIORITIES.HIGH;

                // Check if we already created an alert for this today
                const existingAlert = await GrainAlert.findOne({
                    admin_id: policy.admin_id,
                    source: 'insurance',
                    'tags': `policy_expiry_${policy._id}`,
                    triggered_at: { $gte: new Date(now.toDateString()) }
                });

                if (!existingAlert) {
                    await this.createAlert({
                        admin_id: policy.admin_id,
                        admin_id: policy.admin_id,
                        title: `🛡️ Policy Expiring in ${daysLeft} days: ${policy.policy_number}`,
                        message: `Insurance policy ${policy.policy_number} (${policy.provider_name}) expires on ${new Date(policy.end_date).toLocaleDateString()}. Coverage: PKR ${policy.coverage_amount?.toLocaleString()}.`,
                        priority,
                        source: 'insurance',
                        tags: ['insurance', 'policy_expiry', `policy_expiry_${policy._id}`]
                    });
                }
            }

            return expiringPolicies.length;
        } catch (error) {
            console.error('AlertEngine.checkInsuranceRenewals error:', error.message);
            return 0;
        }
    }

    /**
     * Check for batches with high risk scores
     */
    static async checkBatchQualityDegradation() {
        try {
            const GrainBatch = require('../models/GrainBatch');
            const now = new Date();

            const riskyBatches = await GrainBatch.find({
                status: 'stored',
                risk_score: { $gte: 70 }
            });

            let alertCount = 0;
            for (const batch of riskyBatches) {
                // Don't alert more than once per day per batch
                const existingAlert = await GrainAlert.findOne({
                    batch_id: batch._id,
                    source: 'ai',
                    triggered_at: { $gte: new Date(now.toDateString()) }
                });

                if (!existingAlert) {
                    const priority = batch.risk_score >= 90 ? ALERT_PRIORITIES.CRITICAL :
                        batch.risk_score >= 80 ? ALERT_PRIORITIES.HIGH : ALERT_PRIORITIES.MEDIUM;

                    await this.createAlert({
                        admin_id: batch.admin_id,
                        admin_id: batch.admin_id,
                        silo_id: batch.silo_id,
                        batch_id: batch._id,
                        title: `⚠️ High Risk Batch: ${batch.batch_id}`,
                        message: `Batch ${batch.batch_id} (${batch.grain_type}) has a risk score of ${batch.risk_score}%. ${batch.quantity_kg}kg at risk.`,
                        priority,
                        source: 'ai',
                        ai_context: {
                            risk_score: batch.risk_score,
                            prediction_confidence: batch.ai_prediction_confidence
                        },
                        tags: ['batch', 'quality_degradation']
                    });
                    alertCount++;
                }
            }
            return alertCount;
        } catch (error) {
            console.error('AlertEngine.checkBatchQualityDegradation error:', error.message);
            return 0;
        }
    }
}

module.exports = AlertEngine;
