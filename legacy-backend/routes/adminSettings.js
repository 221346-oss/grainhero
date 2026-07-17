const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

/**
 * @swagger
 * /api/tenant/settings:
 *   get:
 *     summary: Get admin/farm settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings retrieved successfully
 */
router.get('/settings', auth, async (req, res) => {
  try {
    // Determine the admin user whose settings we are fetching
    const adminId = req.user.role === 'admin' ? req.user._id : req.user.admin_id;
    
    if (!adminId) {
      return res.status(404).json({ error: 'Admin not found for user' });
    }

    const admin = await User.findById(adminId);
    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Return settings in the format expected by the frontend
    const settings = {
      business_type: admin.business_type || 'farm',
      location: {
        address: admin.address?.street || '',
        city: admin.address?.city || '',
        country: admin.address?.country || 'Pakistan'
      },
      system: {
        timezone: admin.preferences?.timezone || 'UTC',
        locale: admin.preferences?.language || 'en',
        currency: admin.preferences?.currency || 'USD',
        auto_backup: true,
        data_retention_days: 365,
        session_timeout_minutes: 60,
        two_factor_auth: admin.two_factor_enabled || false
      },
      notifications: {
        email_alerts: admin.preferences?.notifications?.email ?? true,
        sms_alerts: admin.preferences?.notifications?.sms ?? false,
        push_notifications: admin.preferences?.notifications?.push ?? true,
        weekly_reports: true,
        monthly_reports: true
      },
      integrations: {
        weather_api: true,
        market_prices: true,
        government_data: false
      }
    };

    res.json(settings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

/**
 * @swagger
 * /api/tenant/settings:
 *   put:
 *     summary: Update admin/farm settings
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 */
router.put('/settings', auth, async (req, res) => {
  try {
    const { business_type, location, system, notifications } = req.body;

    // Only admins can update their own settings
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update farm settings' });
    }

    const admin = await User.findById(req.user._id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Update admin fields
    if (business_type) {
      admin.business_type = business_type;
    }

    if (location) {
      admin.address = {
        ...admin.address,
        street: location.address || admin.address?.street,
        city: location.city || admin.address?.city,
        country: location.country || admin.address?.country
      };
    }

    if (system) {
      if (!admin.preferences) admin.preferences = {};
      if (system.timezone) admin.preferences.timezone = system.timezone;
      if (system.locale) admin.preferences.language = system.locale;
      if (system.currency) admin.preferences.currency = system.currency;
    }

    if (notifications) {
      if (!admin.preferences) admin.preferences = {};
      if (!admin.preferences.notifications) admin.preferences.notifications = {};
      if (typeof notifications.email_alerts === 'boolean') admin.preferences.notifications.email = notifications.email_alerts;
      if (typeof notifications.sms_alerts === 'boolean') admin.preferences.notifications.sms = notifications.sms_alerts;
      if (typeof notifications.push_notifications === 'boolean') admin.preferences.notifications.push = notifications.push_notifications;
    }

    admin.markModified('preferences');
    await admin.save();

    // Log settings update
    try {
      const LoggingService = require('../services/loggingService');
      await LoggingService.logSettingsUpdated(req.user, 'admin_settings', req.body, req.ip);
    } catch (logErr) { console.error('Logging error:', logErr.message); }

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
});

module.exports = router;