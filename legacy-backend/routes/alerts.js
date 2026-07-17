const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const GrainAlert = require('../models/GrainAlert');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const LoggingService = require('../services/loggingService');
const { ALERT_PRIORITIES, ALERT_ESCALATION_STATUSES } = require('../configs/enum');
const { body, validationResult, param } = require('express-validator');

// GET: Get all alerts for current admin
router.get('/', auth, async (req, res) => {
    try {
        const adminId = req.user.admin_id || req.user._id;
        const alerts = await GrainAlert.find({ admin_id: adminId }).sort({ triggered_at: -1 });
        res.json(alerts);
    } catch (err) {
        console.error("Get alerts error:", err);
        res.status(500).json({ error: err.message });
    }
});

// GET: Get alert summary/stats
router.get('/stats', auth, async (req, res) => {
    try {
        const adminId = req.user.admin_id || req.user._id;
        const stats = await GrainAlert.getStatistics(adminId);
        res.json(stats[0] || {});
    } catch (err) {
        console.error("Get alert stats error:", err);
        res.status(500).json({ error: err.message });
    }
});

// PATCH: Acknowledge an alert
router.patch('/:id/acknowledge', auth, async (req, res) => {
    try {
        const adminId = req.user.admin_id || req.user._id;
        const alert = await GrainAlert.findOne({ _id: req.params.id, admin_id: adminId });

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await alert.acknowledge(req.user._id, req.body.notes);
        res.json(alert);

        // Log action
        LoggingService.log({
            action: 'alert_acknowledged',
            category: 'alert',
            user: req.user,
            entity_id: alert._id,
            description: `Alert acknowledged: ${alert.title}`,
            ip_address: req.ip
        }).catch(() => { });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH: Resolve an alert
router.patch('/:id/resolve', auth, async (req, res) => {
    try {
        const adminId = req.user.admin_id || req.user._id;
        const alert = await GrainAlert.findOne({ _id: req.params.id, admin_id: adminId });

        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }

        await alert.resolve(req.user._id, req.body.resolution_type || 'resolved', req.body.notes);
        res.json(alert);

        // Log action
        LoggingService.log({
            action: 'alert_resolved',
            category: 'alert',
            user: req.user,
            entity_id: alert._id,
            description: `Alert resolved: ${alert.title}`,
            ip_address: req.ip
        }).catch(() => { });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
module.exports = router;