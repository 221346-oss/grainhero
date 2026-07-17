const express = require('express');
const router = express.Router();
const Actuator = require('../models/Actuator');
const SensorReading = require('../models/SensorReading');
const Silo = require('../models/Silo');
const GrainAlert = require('../models/GrainAlert');
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { body, validationResult, param, query } = require('express-validator');
const { ACTUATOR_TYPES, ACTUATOR_ACTIONS, ACTUATOR_TRIGGERED_BY, ACTUATOR_TRIGGER_TYPES } = require('../configs/enum');
const firebaseRealtimeService = require('../services/firebaseRealtimeService');
const admin = require('firebase-admin');

/**
 * @swagger
 * tags:
 *   name: Actuators
 *   description: IoT actuator device control and management
 */

/**
 * @swagger
 * /actuators:
 *   post:
 *     summary: Register a new actuator device
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - actuator_id
 *               - name
 *               - silo_id
 *               - actuator_type
 *             properties:
 *               actuator_id:
 *                 type: string
 *               name:
 *                 type: string
 *               silo_id:
 *                 type: string
 *               actuator_type:
 *                 type: string
 *                 enum: [fan, vent, heater, cooler, alarm, light]
 *               model:
 *                 type: string
 *               manufacturer:
 *                 type: string
 *               mac_address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Actuator registered successfully
 */
router.post('/', [
    auth,
    requirePermission('actuator.control'),
    [
        body('actuator_id').notEmpty().withMessage('Actuator ID is required'),
        body('name').notEmpty().withMessage('Actuator name is required'),
        body('silo_id').isMongoId().withMessage('Valid silo ID is required'),
        body('actuator_type').isIn(Object.values(ACTUATOR_TYPES)).withMessage('Valid actuator type is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        // Check if silo exists
        const silo = await Silo.findOne({
            _id: req.body.silo_id,
            admin_id: req.user.admin_id
        });

        if (!silo) {
            return res.status(404).json({ error: 'Silo not found' });
        }

        const actuator = new Actuator({
            ...req.body,
            admin_id: req.user.admin_id,
            created_by: req.user._id
        });

        await actuator.save();

        // Add actuator to silo
        if (!silo.actuators) silo.actuators = [];
        silo.actuators.push({
            actuator_id: actuator._id,
            actuator_type: req.body.actuator_type,
            is_primary: silo.actuators.length === 0 // First actuator is primary
        });

        await silo.save();

        res.status(201).json({
            message: 'Actuator registered successfully',
            actuator
        });

    } catch (error) {
        console.error('Register actuator error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Actuator ID or MAC address already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /actuators:
 *   get:
 *     summary: Get all actuators for tenant
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', [
    auth,
    requirePermission('actuator.control'),
], async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { admin_id: req.user.admin_id };

        if (req.query.status) filter.status = req.query.status;
        if (req.query.silo_id) filter.silo_id = req.query.silo_id;
        if (req.query.actuator_type) filter.actuator_type = req.query.actuator_type;
        if (req.query.control_mode) filter.control_mode = req.query.control_mode;

        const [actuators, total] = await Promise.all([
            Actuator.find(filter)
                .populate('silo_id', 'name silo_id')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Actuator.countDocuments(filter)
        ]);

        // Add virtual fields
        const actuatorsWithStatus = actuators.map(actuator => ({
            ...actuator,
            operation_status: getOperationStatus(actuator),
            health_status: getHealthStatus(actuator),
            maintenance_status: getMaintenanceStatus(actuator)
        }));

        res.json({
            actuators: actuatorsWithStatus,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        });

    } catch (error) {
        console.error('Get actuators error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /actuators/{id}:
 *   get:
 *     summary: Get actuator by ID
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', [
    auth,
    requirePermission('actuator.control'),
    param('id').isMongoId().withMessage('Valid actuator ID is required')
], async (req, res) => {
    try {
        const actuator = await Actuator.findOne({
            _id: req.params.id,
            admin_id: req.user.admin_id
        }).populate('silo_id');

        if (!actuator) {
            return res.status(404).json({ error: 'Actuator not found' });
        }

        // Get recent operations log
        const recentOperations = await getRecentOperations(req.params.id, 10);

        res.json({
            ...actuator.toObject(),
            operation_status: actuator.operation_status,
            health_status: actuator.health_status,
            maintenance_status: actuator.maintenance_status,
            recent_operations: recentOperations
        });

    } catch (error) {
        console.error('Get actuator error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /actuators/{id}:
 *   put:
 *     summary: Update actuator configuration
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id', [
    auth,
    requirePermission('actuator.control'),
    param('id').isMongoId().withMessage('Valid actuator ID is required')
], async (req, res) => {
    try {
        const actuator = await Actuator.findOne({
            _id: req.params.id,
            admin_id: req.user.admin_id
        });

        if (!actuator) {
            return res.status(404).json({ error: 'Actuator not found' });
        }

        // Update allowed fields
        const allowedUpdates = [
            'name', 'thresholds', 'control_mode', 'ai_control',
            'schedule', 'is_enabled', 'safety_limits', 'notes', 'tags'
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                actuator[field] = req.body[field];
            }
        });

        actuator.updated_by = req.user._id;
        await actuator.save();

        res.json({
            message: 'Actuator updated successfully',
            actuator
        });

    } catch (error) {
        console.error('Update actuator error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /actuators/{id}/control:
 *   post:
 *     summary: Control actuator (turn on/off, set power level)
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 */
const noCache = require('../middleware/noCache');

router.post('/:id/control', [
    auth,
    noCache, // Critical: Actuator control must never be cached
    requirePermission('actuator.control'),
    param('id').isMongoId().withMessage('Valid actuator ID is required'),
    [
        body('action').isIn(['on', 'off', 'toggle', 'set_power']).withMessage('Valid action is required'),
        body('power_level').optional().isFloat({ min: 0, max: 100 }).withMessage('Power level must be 0-100'),
        body('triggered_by').optional().isIn(Object.values(ACTUATOR_TRIGGERED_BY)).withMessage('Valid trigger source is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const actuator = await Actuator.findOne({
            _id: req.params.id,
            admin_id: req.user.admin_id
        });

        if (!actuator) {
            return res.status(404).json({ error: 'Actuator not found' });
        }

        if (!actuator.is_enabled) {
            return res.status(400).json({ error: 'Actuator is disabled' });
        }

        const { action, power_level, triggered_by = 'Manual' } = req.body;
        let result;

        switch (action) {
            case 'on':
                if (actuator.is_on) {
                    return res.status(400).json({ error: 'Actuator is already on' });
                }
                result = await actuator.startOperation(triggered_by, 'manual');
                break;

            case 'off':
                if (!actuator.is_on) {
                    return res.status(400).json({ error: 'Actuator is already off' });
                }
                result = await actuator.stopOperation();
                break;

            case 'toggle':
                if (actuator.is_on) {
                    result = await actuator.stopOperation();
                } else {
                    result = await actuator.startOperation(triggered_by, 'manual');
                }
                break;

            case 'set_power':
                if (power_level === undefined) {
                    return res.status(400).json({ error: 'Power level is required for set_power action' });
                }
                actuator.power_level = power_level;
                if (power_level > 0 && !actuator.is_on) {
                    result = await actuator.startOperation(triggered_by, 'manual');
                } else if (power_level === 0 && actuator.is_on) {
                    result = await actuator.stopOperation();
                }
                break;
        }

        // Log the operation
        await logActuatorOperation(actuator._id, action, triggered_by, req.user._id);

        // Sync with Firebase for hardware polling
        if (actuator.actuator_id) {
            await firebaseRealtimeService.writeControlState(actuator.actuator_id, actuator);
        }

        res.json({
            message: `Actuator ${action} successful`,
            actuator: result,
            action_performed: action,
            triggered_by: triggered_by
        });

    } catch (error) {
        console.error('Control actuator error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /actuators/{id}/ai-trigger:
 *   post:
 *     summary: Trigger actuator based on AI prediction
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/ai-trigger', [
    auth,
    requirePermission('actuator.autoFanOn.enable'),
    param('id').isMongoId().withMessage('Valid actuator ID is required'),
    [
        body('risk_score').isFloat({ min: 0, max: 100 }).withMessage('Risk score must be 0-100'),
        body('prediction_confidence').isFloat({ min: 0, max: 1 }).withMessage('Confidence must be 0-1'),
        body('sensor_data').isObject().withMessage('Sensor data is required'),
        body('recommended_action').isString().withMessage('Recommended action is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const actuator = await Actuator.findOne({
            _id: req.params.id,
            admin_id: req.user.admin_id
        });

        if (!actuator) {
            return res.status(404).json({ error: 'Actuator not found' });
        }

        if (!actuator.ai_control.enabled) {
            return res.status(400).json({ error: 'AI control is not enabled for this actuator' });
        }

        const { risk_score, prediction_confidence, sensor_data, recommended_action } = req.body;

        // Check if AI conditions are met
        if (risk_score < actuator.ai_control.risk_score_threshold) {
            return res.json({
                message: 'Risk score below threshold, no action needed',
                risk_score,
                threshold: actuator.ai_control.risk_score_threshold,
                action_taken: false
            });
        }

        if (prediction_confidence < actuator.ai_control.prediction_confidence_threshold) {
            return res.json({
                message: 'Prediction confidence below threshold, no action taken',
                confidence: prediction_confidence,
                threshold: actuator.ai_control.prediction_confidence_threshold,
                action_taken: false
            });
        }

        // Trigger the actuator
        const targetConditions = {
            risk_score,
            prediction_confidence,
            recommended_action,
            sensor_data
        };

        const result = await actuator.startOperation('AI', 'ai_prediction', targetConditions);

        // Log the AI-triggered operation
        await logActuatorOperation(actuator._id, 'ai_trigger', 'AI', req.user._id, {
            risk_score,
            prediction_confidence,
            recommended_action
        });

        // Sync with Firebase
        if (actuator.actuator_id) {
            await firebaseRealtimeService.writeControlState(actuator.actuator_id, actuator);
        }

        res.json({
            message: 'Actuator triggered by AI',
            actuator: result,
            ai_decision: {
                risk_score,
                prediction_confidence,
                recommended_action,
                action_taken: true
            }
        });

    } catch (error) {
        console.error('AI trigger actuator error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /actuators/{id}/schedule:
 *   post:
 *     summary: Set up scheduled operation for actuator
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/schedule', [
    auth,
    requirePermission('actuator.control'),
    param('id').isMongoId().withMessage('Valid actuator ID is required'),
    [
        body('enabled').isBoolean().withMessage('Enabled must be boolean'),
        body('cron_expression').optional().isString().withMessage('Cron expression must be string'),
        body('active_hours').optional().isObject().withMessage('Active hours must be object'),
        body('days_of_week').optional().isArray().withMessage('Days of week must be array')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const actuator = await Actuator.findOne({
            _id: req.params.id,
            admin_id: req.user.admin_id
        });

        if (!actuator) {
            return res.status(404).json({ error: 'Actuator not found' });
        }

        const { enabled, cron_expression, active_hours, days_of_week } = req.body;

        actuator.schedule = {
            enabled,
            cron_expression,
            active_hours,
            days_of_week,
            timezone: req.body.timezone || 'UTC'
        };

        actuator.updated_by = req.user._id;
        await actuator.save();

        res.json({
            message: 'Actuator schedule updated successfully',
            schedule: actuator.schedule
        });

    } catch (error) {
        console.error('Schedule actuator error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /actuators/{id}/maintenance:
 *   post:
 *     summary: Record maintenance for actuator
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:id/maintenance', [
    auth,
    requirePermission('actuator.control'),
    param('id').isMongoId().withMessage('Valid actuator ID is required'),
    [
        body('maintenance_type').isString().withMessage('Maintenance type is required'),
        body('notes').optional().isString().withMessage('Notes must be string'),
        body('next_maintenance_days').optional().isInt({ min: 1 }).withMessage('Next maintenance days must be positive')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const actuator = await Actuator.findOne({
            _id: req.params.id,
            admin_id: req.user.admin_id
        });

        if (!actuator) {
            return res.status(404).json({ error: 'Actuator not found' });
        }

        const { maintenance_type, notes, next_maintenance_days } = req.body;

        // Update maintenance records
        actuator.performance_metrics.last_maintenance = new Date();
        if (next_maintenance_days) {
            actuator.performance_metrics.maintenance_interval_days = next_maintenance_days;
        }
        actuator.performance_metrics.next_maintenance_due = new Date(
            Date.now() + (next_maintenance_days || actuator.performance_metrics.maintenance_interval_days) * 24 * 60 * 60 * 1000
        );

        actuator.updated_by = req.user._id;
        await actuator.save();

        // Log maintenance activity
        await logActuatorOperation(actuator._id, 'maintenance', 'Manual', req.user._id, {
            maintenance_type,
            notes
        });

        res.json({
            message: 'Maintenance recorded successfully',
            maintenance: {
                type: maintenance_type,
                performed_at: actuator.performance_metrics.last_maintenance,
                next_due: actuator.performance_metrics.next_maintenance_due
            }
        });

    } catch (error) {
        console.error('Maintenance actuator error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /actuators/bulk-control:
 *   post:
 *     summary: Control multiple actuators at once
 *     tags: [Actuators]
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk-control', [
    auth,
    requirePermission('actuator.control'),
    [
        body('actuator_ids').isArray({ min: 1 }).withMessage('Actuator IDs array is required'),
        body('action').isIn(['on', 'off', 'toggle']).withMessage('Valid action is required'),
        body('triggered_by').optional().isIn(Object.values(ACTUATOR_TRIGGERED_BY)).withMessage('Valid trigger source is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { actuator_ids, action, triggered_by = 'Manual' } = req.body;
        const results = [];

        for (const actuatorId of actuator_ids) {
            try {
                const actuator = await Actuator.findOne({
                    _id: actuatorId,
                    admin_id: req.user.admin_id
                });

                if (!actuator) {
                    results.push({ actuator_id: actuatorId, success: false, error: 'Actuator not found' });
                    continue;
                }

                if (!actuator.is_enabled) {
                    results.push({ actuator_id: actuatorId, success: false, error: 'Actuator is disabled' });
                    continue;
                }

                let result;
                switch (action) {
                    case 'on':
                        result = await actuator.startOperation(triggered_by, 'manual');
                        break;
                    case 'off':
                        result = await actuator.stopOperation();
                        break;
                    case 'toggle':
                        if (actuator.is_on) {
                            result = await actuator.stopOperation();
                        } else {
                            result = await actuator.startOperation(triggered_by, 'manual');
                        }
                        break;
                }

                await logActuatorOperation(actuatorId, action, triggered_by, req.user._id);

                // Sync with Firebase
                if (actuator.actuator_id) {
                    await firebaseRealtimeService.writeControlState(actuator.actuator_id, actuator);
                }

                results.push({ actuator_id: actuatorId, success: true, actuator: result });

            } catch (error) {
                results.push({ actuator_id: actuatorId, success: false, error: error.message });
            }
        }

        res.json({
            message: 'Bulk control operation completed',
            results,
            summary: {
                total: actuator_ids.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            }
        });

    } catch (error) {
        console.error('Bulk control error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions
function getOperationStatus(actuator) {
    if (!actuator.is_enabled) return 'disabled';
    if (actuator.status === 'maintenance') return 'maintenance';
    if (actuator.status === 'error') return 'error';
    if (actuator.status === 'offline') return 'offline';
    if (actuator.is_on) return 'running';
    return 'idle';
}

function getHealthStatus(actuator) {
    const now = new Date();
    const lastHeartbeat = actuator.health_metrics?.last_heartbeat;

    if (!lastHeartbeat) return 'unknown';

    const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
    const expectedInterval = 5; // 5 minutes expected heartbeat

    if (minutesSinceHeartbeat > expectedInterval * 3) return 'offline';
    if (actuator.health_metrics.error_count > 10) return 'error';
    if (actuator.health_metrics.uptime_percentage < 90) return 'poor';

    return 'healthy';
}

function getMaintenanceStatus(actuator) {
    if (!actuator.performance_metrics.last_maintenance) return 'unknown';

    const now = new Date();
    const daysSinceMaintenance = (now - actuator.performance_metrics.last_maintenance) / (1000 * 60 * 60 * 24);
    const intervalDays = actuator.performance_metrics.maintenance_interval_days;

    if (daysSinceMaintenance > intervalDays) return 'overdue';
    if (daysSinceMaintenance > intervalDays * 0.8) return 'due_soon';

    return 'current';
}

async function logActuatorOperation(actuatorId, action, triggeredBy, userId, metadata = {}) {
    try {
        // This would typically log to an operations log collection
        console.log(`Actuator ${actuatorId} ${action} triggered by ${triggeredBy} (user: ${userId})`, metadata);
    } catch (error) {
        console.error('Log actuator operation error:', error);
    }
}

async function getRecentOperations(actuatorId, limit = 10) {
    try {
        // This would typically query an operations log collection
        // For now, return mock data
        return [];
    } catch (error) {
        console.error('Get recent operations error:', error);
        return [];
    }
}

module.exports = router;
