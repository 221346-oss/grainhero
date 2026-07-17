const ActivityLog = require('../models/ActivityLog');

/**
 * Centralized Activity Logging Service
 * Every important action in the system goes through here
 */
class LoggingService {
    /**
     * Create an activity log entry
     * @param {Object} params
     * @param {string} params.action - Action enum value
     * @param {string} params.category - Category enum value
     * @param {string} params.description - Human-readable description
     * @param {Object} params.user - req.user object
     * @param {string} params.entity_type - Model name
     * @param {string} params.entity_id - MongoDB ObjectId
     * @param {string} params.entity_ref - Human-readable reference (e.g. batch_id)
     * @param {Object} params.metadata - Additional data
     * @param {string} params.severity - 'info' | 'warning' | 'critical'
     * @param {string} params.ip_address - Request IP
     */
    static async log({
        action,
        category,
        description,
        user,
        entity_type,
        entity_id,
        entity_ref,
        metadata = {},
        severity = 'info',
        ip_address
    }) {
        try {
            const logEntry = new ActivityLog({
                admin_id: user.admin_id || user._id,
                admin_id: user.admin_id || user.owned_admin_id,
                user_id: user._id,
                user_name: user.name || user.email,
                user_role: user.role,
                action,
                category,
                description,
                entity_type,
                entity_id,
                entity_ref,
                metadata,
                severity,
                ip_address
            });

            await logEntry.save();
            return logEntry;
        } catch (error) {
            // Don't let logging failures crash the main operation
            console.error('ActivityLog save error:', error.message);
            return null;
        }
    }

    // ====== Batch Logging Helpers ======
    static async logBatchCreated(user, batch, ip) {
        return this.log({
            action: 'batch_created',
            category: 'batch',
            description: `Batch ${batch.batch_id} created - ${batch.grain_type}, ${batch.quantity_kg}kg`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            metadata: {
                grain_type: batch.grain_type,
                quantity_kg: batch.quantity_kg,
                silo_id: batch.silo_id,
                farmer_name: batch.farmer_name
            },
            ip_address: ip
        });
    }

    static async logBatchUpdated(user, batch, changes, ip) {
        return this.log({
            action: 'batch_updated',
            category: 'batch',
            description: `Batch ${batch.batch_id} updated - fields: ${Object.keys(changes).join(', ')}`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            metadata: { changes },
            ip_address: ip
        });
    }

    static async logBatchDispatched(user, batch, dispatchDetails, ip) {
        return this.log({
            action: 'batch_dispatched',
            category: 'dispatch',
            description: `Batch ${batch.batch_id} dispatched - ${dispatchDetails.quantity_kg || batch.quantity_kg}kg to buyer`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            metadata: dispatchDetails,
            ip_address: ip
        });
    }

    static async logBatchDeleted(user, batch, ip) {
        return this.log({
            action: 'batch_deleted',
            category: 'batch',
            description: `Batch ${batch.batch_id} deleted`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            severity: 'warning',
            ip_address: ip
        });
    }

    // ====== Spoilage Logging Helpers ======
    static async logSpoilageEvent(user, batch, spoilageEvent, ip) {
        return this.log({
            action: 'spoilage_event_logged',
            category: 'spoilage',
            description: `Spoilage event on batch ${batch.batch_id} - ${spoilageEvent.event_type} (${spoilageEvent.severity})`,
            user,
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            entity_ref: batch.batch_id,
            metadata: {
                event_type: spoilageEvent.event_type,
                severity: spoilageEvent.severity,
                estimated_loss_kg: spoilageEvent.estimated_loss_kg,
                estimated_value_loss: spoilageEvent.estimated_value_loss
            },
            severity: spoilageEvent.severity === 'severe' || spoilageEvent.severity === 'total_loss' ? 'critical' : 'warning',
            ip_address: ip
        });
    }

    // ====== Buyer Logging Helpers ======
    static async logBuyerCreated(user, buyer, ip) {
        return this.log({
            action: 'buyer_created',
            category: 'buyer',
            description: `Buyer "${buyer.name}" created`,
            user,
            entity_type: 'Buyer',
            entity_id: buyer._id,
            entity_ref: buyer.name,
            ip_address: ip
        });
    }

    static async logBuyerUpdated(user, buyer, ip) {
        return this.log({
            action: 'buyer_updated',
            category: 'buyer',
            description: `Buyer "${buyer.name}" updated`,
            user,
            entity_type: 'Buyer',
            entity_id: buyer._id,
            entity_ref: buyer.name,
            ip_address: ip
        });
    }

    // ====== Payment Logging Helpers ======
    static async logBuyerPayment(user, payment, buyerName, ip) {
        return this.log({
            action: 'buyer_payment_logged',
            category: 'payment',
            description: `Payment of ${payment.currency} ${payment.amount} recorded from ${buyerName} via ${payment.payment_method}`,
            user,
            entity_type: 'BuyerPayment',
            entity_id: payment._id,
            entity_ref: buyerName,
            metadata: {
                amount: payment.amount,
                payment_method: payment.payment_method,
                buyer_id: payment.buyer_id
            },
            ip_address: ip
        });
    }

    // ====== Invoice Logging Helpers ======
    static async logInvoiceGenerated(user, invoice, ip) {
        return this.log({
            action: 'invoice_generated',
            category: 'invoice',
            description: `Invoice #${invoice.invoice_number} generated for ${invoice.buyer_name} - ${invoice.currency} ${invoice.total_amount}`,
            user,
            entity_type: 'BuyerInvoice',
            entity_id: invoice._id,
            entity_ref: invoice.invoice_number,
            metadata: {
                total_amount: invoice.total_amount,
                buyer_id: invoice.buyer_id
            },
            ip_address: ip
        });
    }

    static async logInvoiceEmailed(user, invoice, recipientEmail, ip) {
        return this.log({
            action: 'invoice_emailed',
            category: 'invoice',
            description: `Invoice #${invoice.invoice_number} emailed to ${recipientEmail}`,
            user,
            entity_type: 'BuyerInvoice',
            entity_id: invoice._id,
            entity_ref: invoice.invoice_number,
            ip_address: ip
        });
    }

    // ====== Insurance Logging Helpers ======
    static async logInsuranceClaimFiled(user, claim, ip) {
        return this.log({
            action: 'insurance_claim_filed',
            category: 'insurance',
            description: `Insurance claim ${claim.claim_number} filed - ${claim.claim_type}`,
            user,
            entity_type: 'InsuranceClaim',
            entity_id: claim._id,
            entity_ref: claim.claim_number,
            severity: 'warning',
            ip_address: ip
        });
    }

    static async logInsurancePolicyCreated(user, policy, ip) {
        return this.log({
            action: 'insurance_policy_created',
            category: 'insurance',
            description: `Insurance policy ${policy.policy_number} created - ${policy.provider_name} (${policy.coverage_type})`,
            user,
            entity_type: 'InsurancePolicy',
            entity_id: policy._id,
            entity_ref: policy.policy_number,
            metadata: {
                provider: policy.provider_name,
                coverage_type: policy.coverage_type,
                coverage_amount: policy.coverage_amount,
                premium_amount: policy.premium_amount
            },
            ip_address: ip
        });
    }

    static async logInsurancePolicyUpdated(user, policy, changes, ip) {
        return this.log({
            action: 'insurance_policy_updated',
            category: 'insurance',
            description: `Insurance policy ${policy.policy_number} updated - fields: ${Object.keys(changes).join(', ')}`,
            user,
            entity_type: 'InsurancePolicy',
            entity_id: policy._id,
            entity_ref: policy.policy_number,
            metadata: { changes },
            ip_address: ip
        });
    }

    static async logInsurancePolicyRenewed(user, policy, ip) {
        return this.log({
            action: 'insurance_policy_renewed',
            category: 'insurance',
            description: `Insurance policy ${policy.policy_number} renewed until ${new Date(policy.end_date).toLocaleDateString()}`,
            user,
            entity_type: 'InsurancePolicy',
            entity_id: policy._id,
            entity_ref: policy.policy_number,
            metadata: { new_end_date: policy.end_date },
            ip_address: ip
        });
    }

    static async logInsurancePolicyCancelled(user, policy, reason, ip) {
        return this.log({
            action: 'insurance_policy_cancelled',
            category: 'insurance',
            description: `Insurance policy ${policy.policy_number} cancelled - Reason: ${reason}`,
            user,
            entity_type: 'InsurancePolicy',
            entity_id: policy._id,
            entity_ref: policy.policy_number,
            metadata: { reason },
            severity: 'warning',
            ip_address: ip
        });
    }

    static async logInsuranceClaimReviewed(user, claim, ip) {
        return this.log({
            action: 'insurance_claim_reviewed',
            category: 'insurance',
            description: `Insurance claim ${claim.claim_number} moved to review`,
            user,
            entity_type: 'InsuranceClaim',
            entity_id: claim._id,
            entity_ref: claim.claim_number,
            ip_address: ip
        });
    }

    static async logInsuranceClaimApproved(user, claim, approvedAmount, ip) {
        return this.log({
            action: 'insurance_claim_approved',
            category: 'insurance',
            description: `Insurance claim ${claim.claim_number} approved - PKR ${approvedAmount.toLocaleString()}`,
            user,
            entity_type: 'InsuranceClaim',
            entity_id: claim._id,
            entity_ref: claim.claim_number,
            metadata: {
                amount_claimed: claim.amount_claimed,
                amount_approved: approvedAmount
            },
            ip_address: ip
        });
    }

    static async logInsuranceClaimRejected(user, claim, reason, ip) {
        return this.log({
            action: 'insurance_claim_rejected',
            category: 'insurance',
            description: `Insurance claim ${claim.claim_number} rejected - ${reason}`,
            user,
            entity_type: 'InsuranceClaim',
            entity_id: claim._id,
            entity_ref: claim.claim_number,
            metadata: { reason },
            severity: 'warning',
            ip_address: ip
        });
    }

    static async logInsuranceClaimPaymentProcessed(user, claim, payment, ip) {
        return this.log({
            action: 'insurance_claim_payment_processed',
            category: 'insurance',
            description: `Payment of PKR ${payment.amount?.toLocaleString() || claim.amount_approved?.toLocaleString()} processed for claim ${claim.claim_number}`,
            user,
            entity_type: 'InsuranceClaim',
            entity_id: claim._id,
            entity_ref: claim.claim_number,
            metadata: {
                payment_method: payment.payment_method,
                payment_reference: payment.payment_reference,
                amount: payment.amount || claim.amount_approved
            },
            ip_address: ip
        });
    }

    static async logInsuranceClaimDocumentUploaded(user, claim, documentType, ip) {
        return this.log({
            action: 'insurance_claim_document_uploaded',
            category: 'insurance',
            description: `Document (${documentType}) uploaded for claim ${claim.claim_number}`,
            user,
            entity_type: 'InsuranceClaim',
            entity_id: claim._id,
            entity_ref: claim.claim_number,
            metadata: { document_type: documentType },
            ip_address: ip
        });
    }

    static async logInsuranceCoverageRequested(user, requestData, ip) {
        return this.log({
            action: 'insurance_coverage_requested',
            category: 'insurance',
            description: `Insurance coverage requested - Provider: ${requestData.preferred_provider}, Type: ${requestData.coverage_type}`,
            user,
            entity_type: 'InsurancePolicy',
            metadata: {
                preferred_provider: requestData.preferred_provider,
                coverage_type: requestData.coverage_type
            },
            ip_address: ip
        });
    }

    // ====== Alert Logging Helpers ======
    static async logAlertAcknowledged(user, alert, ip) {
        return this.log({
            action: 'alert_acknowledged',
            category: 'alert',
            description: `Alert "${alert.title}" acknowledged`,
            user,
            entity_type: 'GrainAlert',
            entity_id: alert._id,
            entity_ref: alert.alert_id,
            ip_address: ip
        });
    }

    static async logAlertResolved(user, alert, resolutionType, ip) {
        return this.log({
            action: 'alert_resolved',
            category: 'alert',
            description: `Alert "${alert.title}" resolved (${resolutionType})`,
            user,
            entity_type: 'GrainAlert',
            entity_id: alert._id,
            entity_ref: alert.alert_id,
            metadata: { resolution_type: resolutionType },
            ip_address: ip
        });
    }

    static async logAlertEscalated(user, alert, escalatedToName, ip) {
        return this.log({
            action: 'alert_escalated',
            category: 'alert',
            description: `Alert "${alert.title}" escalated to ${escalatedToName}`,
            user,
            entity_type: 'GrainAlert',
            entity_id: alert._id,
            entity_ref: alert.alert_id,
            metadata: { escalated_to: escalatedToName },
            severity: 'warning',
            ip_address: ip
        });
    }

    // ====== User Management Logging Helpers ======
    static async logUserManagement(user, action, targetUser, ip) {
        return this.log({
            action,
            category: 'user',
            description: `User "${targetUser.name || targetUser.email}" — ${action.replace(/_/g, ' ')}`,
            user,
            entity_type: 'User',
            entity_id: targetUser._id,
            entity_ref: targetUser.email,
            metadata: {
                target_role: targetUser.role,
                target_name: targetUser.name
            },
            ip_address: ip
        });
    }

    // ====== Subscription Logging Helpers ======
    static async logSubscriptionEvent(user, action, tenantId, metadata, ip) {
        return this.log({
            action,
            category: 'subscription',
            description: `Subscription ${action.replace(/subscription_/g, '').replace(/_/g, ' ')}`,
            user,
            entity_type: 'Subscription',
            entity_ref: tenantId?.toString(),
            metadata: metadata || {},
            severity: action.includes('expired') || action.includes('cancelled') ? 'critical' : 'info',
            ip_address: ip
        });
    }

    // ====== Settings Logging Helpers ======
    static async logSettingsUpdated(user, settingType, changes, ip) {
        return this.log({
            action: 'settings_updated',
            category: 'system',
            description: `${settingType} settings updated`,
            user,
            entity_type: 'System',
            metadata: { setting_type: settingType, changes },
            ip_address: ip
        });
    }

    // ====== Report Logging Helpers ======
    // ====== Silo Logging Helpers ======
    static async logSiloAction(user, action, silo, ip) {
        return this.log({
            action,
            category: 'silo',
            description: `Silo "${silo.name || silo.silo_id}" — ${action.replace('silo_', '').replace('_', ' ')}`,
            user,
            entity_type: 'Silo',
            entity_id: silo._id,
            entity_ref: silo.silo_id,
            metadata: {
                capacity: silo.capacity_kg,
                warehouse_id: silo.warehouse_id
            },
            ip_address: ip
        });
    }

    // ====== Sensor Logging Helpers ======
    static async logSensorAction(user, action, sensor, ip) {
        return this.log({
            action,
            category: 'sensor',
            description: `Sensor "${sensor.device_id || sensor.name}" — ${action.replace('sensor_', '').replace('_', ' ')}`,
            user,
            entity_type: 'SensorDevice',
            entity_id: sensor._id,
            entity_ref: sensor.device_id,
            metadata: {
                silo_id: sensor.silo_id,
                sensor_type: sensor.sensor_type
            },
            ip_address: ip
        });
    }

    static async logReportGenerated(user, reportType, entityRef, ip) {
        return this.log({
            action: 'batch_report_generated',
            category: 'report',
            description: `${reportType} report generated for ${entityRef}`,
            user,
            entity_type: 'GrainBatch',
            entity_ref: entityRef,
            ip_address: ip
        });
    }

    static async logDataExported(user, exportType, filters, ip) {
        return this.log({
            action: 'data_exported',
            category: 'export',
            description: `${exportType} data exported`,
            user,
            entity_type: 'System',
            metadata: { export_type: exportType, filters },
            ip_address: ip
        });
    }
}

module.exports = LoggingService;

