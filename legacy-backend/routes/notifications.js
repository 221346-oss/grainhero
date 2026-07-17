const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requireAdminAccess } = require('../middleware/permission');
const Notification = require('../models/Notification');
const UserPushSubscription = require('../models/UserPushSubscription');
const NotificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 * Get notifications for the current user
 */
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { recipient_id: req.user._id };
        if (req.query.read !== undefined) filter.read = req.query.read === 'true';
        if (req.query.category) filter.category = req.query.category;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ recipient_id: req.user._id, read: false })
        ]);

        res.json({
            notifications,
            unread_count: unreadCount,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/notifications/unread-count
 * Quick unread count for badge
 */
router.get('/unread-count', auth, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            recipient_id: req.user._id,
            read: false
        });
        res.json({ unread_count: count });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
router.patch('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, recipient_id: req.user._id },
            { read: true, read_at: new Date() },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ message: 'Marked as read', notification });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch('/mark-all-read', auth, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient_id: req.user._id, read: false },
            { read: true, read_at: new Date() }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/subscribe
 * Subscribe user to push notifications
 */
router.post('/subscribe', auth, async (req, res) => {
    try {
        const { subscription, deviceType = 'desktop' } = req.body;

        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ error: 'Invalid subscription object' });
        }

        // Check if subscription already exists
        let pushSub = await UserPushSubscription.findOne({
            'subscription.endpoint': subscription.endpoint
        });

        if (pushSub && pushSub.user_id.toString() !== req.user._id.toString()) {
            return res.status(400).json({ error: 'Subscription already in use by another user' });
        }

        if (!pushSub) {
            pushSub = new UserPushSubscription({
                user_id: req.user._id,
                subscription,
                device_type: deviceType,
                user_agent: req.headers['user-agent']
            });
        } else {
            pushSub.subscription = subscription;
            pushSub.device_type = deviceType;
            pushSub.is_active = true;
            pushSub.marked_invalid = false;
        }

        await pushSub.save();

        res.json({
            message: 'Successfully subscribed to push notifications',
            subscription_id: pushSub._id
        });
    } catch (error) {
        console.error('Push subscription error:', error);
        res.status(500).json({ error: 'Failed to subscribe to push notifications' });
    }
});

/**
 * POST /api/notifications/unsubscribe
 * Unsubscribe user from push notifications
 */
router.post('/unsubscribe', auth, async (req, res) => {
    try {
        const { subscription_id } = req.body;

        const result = await UserPushSubscription.findOneAndUpdate(
            {
                _id: subscription_id,
                user_id: req.user._id
            },
            {
                is_active: false
            },
            { new: true }
        );

        if (!result) {
            return res.status(404).json({ error: 'Subscription not found' });
        }

        res.json({
            message: 'Successfully unsubscribed from push notifications'
        });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

/**
 * GET /api/notifications/preferences
 * Get user's notification preferences
 */
router.get('/preferences', auth, async (req, res) => {
    try {
        const subscriptions = await UserPushSubscription.find({
            user_id: req.user._id,
            is_active: true
        }).select('preferences device_type created_at');

        // Return combined preferences (merge all subscriptions)
        const preferences = subscriptions.length > 0
            ? subscriptions[0].preferences
            : {
                push_enabled: false,
                categories: {
                    spoilage: true,
                    dispatch: true,
                    payment: true,
                    insurance: true,
                    invoice: true,
                    batch: true,
                    system: true
                },
                quiet_hours_enabled: false,
                sound_enabled: true,
                vibration_enabled: true,
                batch_digest: false,
                digest_frequency: 'immediate'
            };

        res.json({
            preferences,
            subscription_count: subscriptions.length,
            subscriptions: subscriptions.map(s => ({
                id: s._id,
                device_type: s.device_type,
                created_at: s.created_at
            }))
        });
    } catch (error) {
        console.error('Get preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * PATCH /api/notifications/preferences
 * Update user's notification preferences
 */
router.patch('/preferences', auth, async (req, res) => {
    try {
        const { preferences } = req.body;

        // Find first active subscription
        let pushSub = await UserPushSubscription.findOne({
            user_id: req.user._id,
            is_active: true
        });

        if (!pushSub) {
            // No active browser subscription – return success with a soft warning
            // so the UI can still save the settings state locally
            return res.json({
                message: 'Preferences noted (pair a browser to activate push notifications)',
                preferences: preferences,
                no_subscription: true
            });
        }

        // Update preferences
        if (preferences.push_enabled !== undefined) {
            pushSub.preferences.push_enabled = preferences.push_enabled;
        }

        if (preferences.categories) {
            pushSub.preferences.categories = {
                ...pushSub.preferences.categories,
                ...preferences.categories
            };
        }

        if (preferences.quiet_hours_enabled !== undefined) {
            pushSub.preferences.quiet_hours_enabled = preferences.quiet_hours_enabled;
        }

        if (preferences.quiet_hours_start) {
            pushSub.preferences.quiet_hours_start = preferences.quiet_hours_start;
        }

        if (preferences.quiet_hours_end) {
            pushSub.preferences.quiet_hours_end = preferences.quiet_hours_end;
        }

        if (preferences.quiet_hours_timezone) {
            pushSub.preferences.quiet_hours_timezone = preferences.quiet_hours_timezone;
        }

        if (preferences.sound_enabled !== undefined) {
            pushSub.preferences.sound_enabled = preferences.sound_enabled;
        }

        if (preferences.vibration_enabled !== undefined) {
            pushSub.preferences.vibration_enabled = preferences.vibration_enabled;
        }

        if (preferences.batch_digest !== undefined) {
            pushSub.preferences.batch_digest = preferences.batch_digest;
        }

        if (preferences.digest_frequency) {
            pushSub.preferences.digest_frequency = preferences.digest_frequency;
        }

        await pushSub.save();

        res.json({
            message: 'Preferences updated successfully',
            preferences: pushSub.preferences
        });
    } catch (error) {
        console.error('Update preferences error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/test-push
 * Send a test push notification
 */
router.post('/test-push', auth, async (req, res) => {
    try {
        const results = await NotificationService.sendPushNotification({
            recipient_id: req.user._id,
            title: 'Test Notification',
            message: 'This is a test push notification from GrainHero',
            category: 'system',
            action_url: '/notifications'
        });

        if (results.length === 0) {
            return res.status(400).json({
                error: 'No active push subscriptions found. Please enable push notifications.'
            });
        }

        res.json({
            message: 'Test notification sent',
            results
        });
    } catch (error) {
        console.error('Test push error:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

/**
 * GET /api/notifications/push-config
 * Get push notification configuration for frontend
 */
router.get('/push-config', (req, res) => {
    try {
        const config = NotificationService.getPushProviderInfo();
        res.json(config);
    } catch (error) {
        res.status(500).json({ error: 'Push notifications not configured' });
    }
});

module.exports = router;
