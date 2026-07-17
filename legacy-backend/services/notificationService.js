const NotificationModel = require('../models/Notification');
const User = require('../models/User');
const UserPushSubscription = require('../models/UserPushSubscription');
const sendEmail = require('../utils/emailHelper');
const pushAdapter = require('./pushNotificationAdapter');

/**
 * Notification Service
 * Sends in-app, email, and SMS notifications to admin/manager users
 */
class NotificationService {

    /**
     * Send notification to specific users
     * @param {Object} params
     */
    static async notify({
        admin_id,
        recipient_ids = [],
        title,
        message,
        type = 'info',
        category = 'system',
        entity_type,
        entity_id,
        action_url,
        channels = { in_app: true, email: false, sms: false }
    }) {
        try {
            const notifications = [];

            for (const recipientId of recipient_ids) {
                const notification = new NotificationModel({
                    admin_id,
                    recipient_id: recipientId,
                    title,
                    message,
                    type,
                    category,
                    entity_type,
                    entity_id,
                    action_url,
                    channels
                });

                await notification.save();
                notifications.push(notification);

                // Send email if requested
                if (channels.email) {
                    await this._sendEmailNotification(recipientId, title, message);
                    notification.email_sent = true;
                    await notification.save();
                }
            }

            return notifications;
        } catch (error) {
            console.error('Notification service error:', error.message);
            return [];
        }
    }

    /**
     * Notify all admins and managers of an administrative context
     */
    static async notifyAdminsAndManagers({
        admin_id,
        title,
        message,
        type = 'info',
        category = 'system',
        entity_type,
        entity_id,
        action_url,
        channels = { in_app: true, email: true, sms: false }
    }) {
        try {
            // Find all admin and manager users for this administrative context
            const users = await User.find({
                $or: [
                    { admin_id: admin_id, role: { $in: ['admin', 'manager'] } },
                    { _id: admin_id, role: 'admin' }
                ],
                status: 'active'
            }).select('_id');

            const recipient_ids = users.map(u => u._id);

            return this.notify({
                admin_id,
                recipient_ids,
                title,
                message,
                type,
                category,
                entity_type,
                entity_id,
                action_url,
                channels
            });
        } catch (error) {
            console.error('Notify admins/managers error:', error.message);
            return [];
        }
    }

    /**
     * Send email to a user
     */
    static async _sendEmailNotification(userId, subject, messageBody) {
        try {
            const user = await User.findById(userId).select('email name');
            if (!user || !user.email) return;

            const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1a7a3a 0%, #2d9a4f 100%); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: #fff; margin: 0; font-size: 20px;">🌾 GrainHero Notification</h2>
          </div>
          <div style="padding: 24px; background: #f8faf8; border: 1px solid #e0e8e0; border-top: none; border-radius: 0 0 12px 12px;">
            <h3 style="color: #1a7a3a; margin-top: 0;">${subject}</h3>
            <p style="color: #333; line-height: 1.6;">${messageBody}</p>
            <hr style="border: none; border-top: 1px solid #e0e8e0; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; margin: 0;">
              This is an automated notification from GrainHero. Do not reply to this email.
            </p>
          </div>
        </div>
      `;

            await sendEmail(user.email, `GrainHero: ${subject}`, messageBody, html);
        } catch (error) {
            console.error('Email notification error:', error.message);
        }
    }

    /**
     * Send email to an external email address (for buyer invoices)
     */
    static async sendExternalEmail(email, subject, message, html) {
        try {
            await sendEmail(email, subject, message, html);
            return true;
        } catch (error) {
            console.error('External email error:', error.message);
            return false;
        }
    }

    // ====== Convenience Methods ======

    static async notifySpoilageEvent(admin_id, batch, spoilageEvent) {
        return this.notifyAdminsAndManagers({
            admin_id,
            title: `⚠️ Spoilage Alert: ${batch.batch_id}`,
            message: `${spoilageEvent.event_type} spoilage detected on batch ${batch.batch_id} (${spoilageEvent.severity}). Estimated loss: ${spoilageEvent.estimated_loss_kg || 'N/A'}kg. ${spoilageEvent.description || ''}`,
            type: spoilageEvent.severity === 'severe' || spoilageEvent.severity === 'total_loss' ? 'critical' : 'warning',
            category: 'spoilage',
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            action_url: `/grain-batches`,
            channels: { in_app: true, email: true, sms: false }
        });
    }

    static async notifyDispatch(admin_id, batch, buyerName, quantity) {
        return this.notifyAdminsAndManagers({
            admin_id,
            title: `🚚 Dispatch: ${batch.batch_id}`,
            message: `${quantity}kg of ${batch.grain_type} from batch ${batch.batch_id} dispatched to ${buyerName}`,
            type: 'success',
            category: 'dispatch',
            entity_type: 'GrainBatch',
            entity_id: batch._id,
            action_url: `/grain-batches`,
            channels: { in_app: true, email: true, sms: false }
        });
    }

    static async notifyPaymentReceived(admin_id, buyerName, amount, currency) {
        return this.notifyAdminsAndManagers({
            admin_id,
            title: `💰 Payment Received`,
            message: `Payment of ${currency} ${amount.toLocaleString()} received from ${buyerName}`,
            type: 'success',
            category: 'payment',
            action_url: `/activity-logs`,
            channels: { in_app: true, email: false, sms: false }
        });
    }

    static async notifyInvoiceGenerated(admin_id, invoiceNumber, buyerName) {
        return this.notifyAdminsAndManagers({
            admin_id,
            title: `📄 Invoice Generated`,
            message: `Invoice #${invoiceNumber} generated for ${buyerName}`,
            type: 'info',
            category: 'invoice',
            action_url: `/activity-logs`,
            channels: { in_app: true, email: false, sms: false }
        });
    }

    // ====== Push Notification Methods ======

    /**
     * Send push notifications to a user
     */
    static async sendPushNotification({
        notification_id,
        recipient_id,
        title,
        message,
        category = 'system',
        action_url = '/'
    }) {
        try {
            // Get user's active push subscriptions
            const subscriptions = await UserPushSubscription.find({
                user_id: recipient_id,
                is_active: true,
                'preferences.push_enabled': true,
                [`preferences.categories.${category}`]: true,
                marked_invalid: false
            });

            if (subscriptions.length === 0) {
                console.log(`[Push] No active subscriptions for user ${recipient_id}`);
                return [];
            }

            const results = [];

            for (const sub of subscriptions) {
                // Check quiet hours
                if (this._isInQuietHours(sub.preferences)) {
                    console.log(`[Push] User ${recipient_id} is in quiet hours, skipping push`);
                    continue;
                }

                try {
                    const result = await pushAdapter.sendPush({
                        subscription: sub.subscription,
                        title,
                        message,
                        tag: category,
                        data: {
                            category,
                            notification_id: notification_id?.toString()
                        },
                        action_url
                    });

                    if (result.success) {
                        // Update notification push status
                        if (notification_id) {
                            await NotificationModel.updateOne(
                                { _id: notification_id },
                                {
                                    'push.enabled': true,
                                    'push.sent': true,
                                    'push.sent_at': new Date(),
                                    'push.delivery_status': 'sent'
                                }
                            );
                        }

                        sub.last_used = new Date();
                        sub.failed_attempts = 0;
                        await sub.save();

                        results.push({ success: true, subscription_id: sub._id });
                    } else {
                        // Handle failed push
                        sub.failed_attempts += 1;

                        if (result.code === 'SUBSCRIPTION_EXPIRED' || sub.failed_attempts > 5) {
                            sub.marked_invalid = true;
                            sub.is_active = false;
                        }

                        await sub.save();

                        if (notification_id) {
                            await NotificationModel.updateOne(
                                { _id: notification_id },
                                {
                                    'push.delivery_status': 'failed'
                                }
                            );
                        }

                        results.push({
                            success: false,
                            subscription_id: sub._id,
                            error: result.error
                        });
                    }
                } catch (error) {
                    console.error(`[Push] Error sending to subscription ${sub._id}:`, error.message);
                    results.push({
                        success: false,
                        subscription_id: sub._id,
                        error: error.message
                    });
                }
            }

            return results;
        } catch (error) {
            console.error('[Push] Error in sendPushNotification:', error.message);
            return [];
        }
    }

    /**
     * Check if user is in quiet hours
     */
    static _isInQuietHours(preferences) {
        if (!preferences.quiet_hours_enabled) return false;

        try {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', {
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                timeZone: preferences.quiet_hours_timezone || 'UTC'
            });

            const [startHour, startMin] = preferences.quiet_hours_start.split(':').map(Number);
            const [endHour, endMin] = preferences.quiet_hours_end.split(':').map(Number);
            const [currentHour, currentMin] = timeStr.split(':').map(Number);

            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            const currentMinutes = currentHour * 60 + currentMin;

            if (startMinutes <= endMinutes) {
                return currentMinutes >= startMinutes && currentMinutes < endMinutes;
            } else {
                // Quiet hours span midnight
                return currentMinutes >= startMinutes || currentMinutes < endMinutes;
            }
        } catch (error) {
            console.error('[Push] Error checking quiet hours:', error.message);
            return false;
        }
    }

    /**
     * Get push notification provider info
     */
    static getPushProviderInfo() {
        return pushAdapter.getProviderInfo();
    }
}

module.exports = NotificationService;
