const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const ActivityLog = require('../models/ActivityLog');
const { USER_ROLES } = require('../configs/enum');

/**
 * GET /api/activity-logs
 * Get activity logs with filtering (admin/manager see all, technician sees grain only)
 */
router.get('/', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build filter based on role
        let filter = {};

        if (req.user.role === USER_ROLES.SUPER_ADMIN) {
            // Super admin sees all; can scope by admin_id
            if (req.query.admin_id) filter.admin_id = req.query.admin_id;
        } else if (req.user.role === 'admin' || req.user.role === 'manager') {
            // Admin & Manager see all logs for their admin context
            filter.admin_id = req.user.admin_id || req.user._id;
        } else if (req.user.role === 'technician') {
            // Technician only sees grain-related logs
            filter.admin_id = req.user.admin_id;
            filter.category = { $in: ['batch', 'spoilage'] };
        } else {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Optional filters
        if (req.query.category && req.user.role !== 'technician') {
            filter.category = req.query.category;
        }
        if (req.query.action) filter.action = req.query.action;
        if (req.query.severity) filter.severity = req.query.severity;
        if (req.query.entity_type) filter.entity_type = req.query.entity_type;
        if (req.query.user_id) filter.user_id = req.query.user_id;

        // Date range filter
        if (req.query.from || req.query.to) {
            filter.created_at = {};
            if (req.query.from) filter.created_at.$gte = new Date(req.query.from);
            if (req.query.to) filter.created_at.$lte = new Date(req.query.to);
        }

        // Search in description
        if (req.query.search) {
            filter.description = { $regex: req.query.search, $options: 'i' };
        }

        const [logs, total] = await Promise.all([
            ActivityLog.find(filter)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ActivityLog.countDocuments(filter)
        ]);

        // Get category counts for summary (using same admin filter as main query)
        // IMPORTANT: aggregation $match needs ObjectId, not string
        let categoryFilter = {};
        if (req.user.role === USER_ROLES.SUPER_ADMIN) {
            if (req.query.admin_id) {
                categoryFilter.admin_id = new mongoose.Types.ObjectId(req.query.admin_id);
            }
        } else {
            const aid = req.user.admin_id || req.user._id;
            if (aid) {
                categoryFilter.admin_id = new mongoose.Types.ObjectId(aid.toString());
            }
        }

        const categoryCounts = await ActivityLog.aggregate([
            { $match: categoryFilter },
            { $group: { _id: '$category', count: { $sum: 1 } } }
        ]);

        res.json({
            logs,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            },
            summary: {
                categories: categoryCounts.reduce((acc, c) => { acc[c._id] = c.count; return acc; }, {})
            }
        });

    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/activity-logs/batch/:batchId
 * Get full timeline for a specific batch (used in batch detail & PDF)
 */
router.get('/batch/:batchId', auth, async (req, res) => {
    try {
        const logs = await ActivityLog.find({
            entity_id: req.params.batchId,
            entity_type: 'GrainBatch'
        }).sort({ created_at: 1 }).lean();

        res.json({ logs, total: logs.length });
    } catch (error) {
        console.error('Get batch timeline error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/activity-logs/stats
 * Get daily log count for last 30 days
 */
router.get('/stats', auth, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        let matchFilter = { created_at: { $gte: thirtyDaysAgo } };
        if (req.user.role !== USER_ROLES.SUPER_ADMIN) {
            matchFilter.admin_id = req.user.admin_id || req.user._id;
        }

        const dailyStats = await ActivityLog.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
                        severity: '$severity'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        const recentCritical = await ActivityLog.find({
            ...matchFilter,
            severity: 'critical'
        }).sort({ created_at: -1 }).limit(5).lean();

        res.json({
            daily_stats: dailyStats,
            recent_critical: recentCritical
        });

    } catch (error) {
        console.error('Get log stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/activity-logs/entity/:type/:id
 * Get all logs for a specific entity (e.g., InsuranceClaim, GrainBatch)
 */
router.get('/entity/:type/:id', auth, async (req, res) => {
    try {
        const { type, id } = req.params;
        const logs = await ActivityLog.find({
            entity_type: type,
            entity_id: id
        }).sort({ created_at: -1 }).lean();

        res.json({ logs, total: logs.length });
    } catch (error) {
        console.error('Get entity logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/activity-logs/user/:userId
 * Get all logs performed by a specific user
 */
router.get('/user/:userId', auth, async (req, res) => {
    try {
        const logs = await ActivityLog.find({
            user_id: req.params.userId
        }).sort({ created_at: -1 }).lean();

        res.json({ logs, total: logs.length });
    } catch (error) {
        console.error('Get user logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/activity-logs/export
 * Export logs as CSV (returns raw data for frontend to process or generates a file)
 */
router.get('/export', auth, async (req, res) => {
    try {
        // Reuse the logic from the main GET / endpoint but without pagination
        let filter = {};
        if (req.user.role === USER_ROLES.SUPER_ADMIN) {
            if (req.query.admin_id) filter.admin_id = req.query.admin_id;
        } else {
            filter.admin_id = req.user.admin_id || req.user._id;
        }

        if (req.query.category) filter.category = req.query.category;
        if (req.query.action) filter.action = req.query.action;
        if (req.query.severity) filter.severity = req.query.severity;
        if (req.query.from || req.query.to) {
            filter.created_at = {};
            if (req.query.from) filter.created_at.$gte = new Date(req.query.from);
            if (req.query.to) filter.created_at.$lte = new Date(req.query.to);
        }

        const logs = await ActivityLog.find(filter).sort({ created_at: -1 }).lean();
        
        // For now, return JSON. In a full implementation, we'd use a CSV library like json2csv
        res.json({ logs });
    } catch (error) {
        console.error('Export logs error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
