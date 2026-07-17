const webpush = require('web-push');
const admin = require('firebase-admin');

/**
 * Push Notification Adapter
 * Handles sending push notifications via Web Push API or Firebase Cloud Messaging
 */
class PushNotificationAdapter {

    constructor() {
        this.provider = this._detectProvider();
        this._initializeProvider();
    }

    /**
     * Detect which push provider to use based on env vars
     */
    _detectProvider() {
        if (process.env.FIREBASE_PROJECT_ID) {
            return 'firebase';
        }
        if (process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY) {
            return 'web-push';
        }
        console.warn('⚠️ No push notification provider configured. Using "mock" provider. Set FIREBASE_PROJECT_ID or WEB_PUSH keys in .env for real notifications.');
        return 'mock';
    }

    /**
     * Initialize the selected push provider
     */
    _initializeProvider() {
        if (this.provider === 'web-push') {
            webpush.setVapidDetails(
                process.env.WEB_PUSH_EMAIL || 'admin@grainhero.com',
                process.env.WEB_PUSH_PUBLIC_KEY,
                process.env.WEB_PUSH_PRIVATE_KEY
            );
        }
        // Firebase is initialized elsewhere in the app
    }

    /**
     * Send push notification to a user
     * @param {Object} params
     * @returns {Promise<{success: boolean, messageId: string, error: string}>}
     */
    async sendPush({
        subscription,
        title,
        message,
        icon = 'https://grainhero.com/icon-192x192.png',
        badge = 'https://grainhero.com/badge-72x72.png',
        tag,
        data = {},
        action_url = '/'
    }) {
        try {
            if (!subscription) {
                return { success: false, error: 'No subscription provided' };
            }

            const payload = {
                notification: {
                    title: title || 'GrainHero Notification',
                    body: message || '',
                    icon,
                    badge,
                    tag: tag || 'notification',
                    requireInteraction: false
                },
                data: {
                    ...data,
                    action_url: action_url || '/',
                    timestamp: new Date().toISOString()
                }
            };

            if (this.provider === 'web-push') {
                return await this._sendViaWebPush(subscription, payload);
            } else if (this.provider === 'firebase') {
                return await this._sendViaFirebase(subscription, payload);
            } else if (this.provider === 'mock') {
                console.log('[Push Mock] Notification would be sent:', { title, message });
                return { success: true, messageId: 'mock-id', provider: 'mock' };
            }

            return { success: false, error: 'Unknown provider' };
        } catch (error) {
            console.error('[Push Adapter] Error sending push:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send via Web Push API
     */
    async _sendViaWebPush(subscription, payload) {
        try {
            const result = await webpush.sendNotification(
                subscription,
                JSON.stringify(payload)
            );

            return {
                success: true,
                messageId: result.headers?.['x-serviceworker-version'] || 'web-push',
                provider: 'web-push'
            };
        } catch (error) {
            // Handle specific Web Push errors
            if (error.statusCode === 410 || error.statusCode === 404) {
                // Subscription is invalid/expired
                return {
                    success: false,
                    error: 'Subscription expired',
                    code: 'SUBSCRIPTION_EXPIRED'
                };
            }

            if (error.statusCode === 413) {
                // Payload too large
                return {
                    success: false,
                    error: 'Payload too large',
                    code: 'PAYLOAD_TOO_LARGE'
                };
            }

            throw error;
        }
    }

    /**
     * Send via Firebase Cloud Messaging
     */
    async _sendViaFirebase(subscription, payload) {
        try {
            // Convert web push format to FCM format if needed
            const fcmPayload = {
                notification: payload.notification,
                data: this._stringifyData(payload.data),
                webpush: {
                    headers: {
                        TTL: '86400' // 24 hours
                    },
                    data: this._stringifyData(payload.data),
                    notification: {
                        title: payload.notification.title,
                        body: payload.notification.body,
                        icon: payload.notification.icon,
                        badge: payload.notification.badge,
                        requireInteraction: payload.notification.requireInteraction
                    },
                    fcmOptions: {
                        link: payload.data.action_url
                    }
                }
            };

            // If subscription is a device token
            if (typeof subscription === 'string') {
                const result = await admin.messaging().send({
                    token: subscription,
                    ...fcmPayload
                });

                return {
                    success: true,
                    messageId: result,
                    provider: 'firebase'
                };
            }

            // If it's a subscription object (web), use sendToTopic as fallback
            return {
                success: false,
                error: 'Firebase requires device tokens, not subscription objects'
            };
        } catch (error) {
            console.error('[Firebase] Error sending message:', error.message);

            if (error.code === 'messaging/invalid-argument' || 
                error.code === 'messaging/invalid-registration-token') {
                return {
                    success: false,
                    error: 'Invalid registration token',
                    code: 'INVALID_TOKEN'
                };
            }

            throw error;
        }
    }

    /**
     * Convert all data values to strings (FCM requirement)
     */
    _stringifyData(data) {
        const stringified = {};
        for (const [key, value] of Object.entries(data)) {
            stringified[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
        return stringified;
    }

    /**
     * Validate a subscription token
     */
    async validateSubscription(subscription) {
        try {
            if (!subscription || !subscription.endpoint) {
                return { valid: false, reason: 'No endpoint' };
            }

            // Try sending a test notification with minimal payload
            const result = await this.sendPush({
                subscription,
                title: 'Test',
                message: 'Validating subscription...'
            });

            if (result.success) {
                return { valid: true };
            }

            if (result.code === 'SUBSCRIPTION_EXPIRED') {
                return { valid: false, reason: 'Subscription expired' };
            }

            return { valid: false, reason: result.error };
        } catch (error) {
            return { valid: false, reason: error.message };
        }
    }

    /**
     * Get provider info
     */
    getProviderInfo() {
        return {
            provider: this.provider,
            configured: true,
            publicKey: this.provider === 'web-push' ? process.env.WEB_PUSH_PUBLIC_KEY : null
        };
    }
}

// Create singleton instance
const pushAdapter = new PushNotificationAdapter();

module.exports = pushAdapter;
