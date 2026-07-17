const express = require('express');
const router = express.Router();
const SensorDevice = require('../models/SensorDevice');
const Actuator = require('../models/Actuator');
const SensorReading = require('../models/SensorReading');
const GrainAlert = require('../models/GrainAlert');
const { auth } = require('../middleware/auth');
const { requirePermission, requireAdminAccess } = require('../middleware/permission');
const { body, validationResult, param, query } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * tags:
 *   name: Device Health
 *   description: IoT device health monitoring and calibration
 */

/**
 * @swagger
 * /device-health/overview:
 *   get:
 *     summary: Get device health overview
 *     tags: [Device Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/overview', [
    auth,
    requirePermission('sensor.view'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { silo_id } = req.query;
        const adminId = req.user.admin_id || req.user._id;
        
        const filter = { admin_id: adminId };
        if (silo_id) filter.silo_id = silo_id;

        // Get all devices
        const [sensors, actuators] = await Promise.all([
            SensorDevice.find(filter).populate('silo_id', 'name silo_id'),
            Actuator.find(filter).populate('silo_id', 'name silo_id')
        ]);

        // Calculate health metrics
        const healthMetrics = await calculateHealthMetrics(sensors, actuators);
        
        // Get recent alerts
        const recentAlerts = await GrainAlert.find({
            admin_id: adminId,
            source: { $in: ['sensor', 'actuator'] },
            created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        }).sort({ created_at: -1 }).limit(10);

        // Get maintenance due devices
        const maintenanceDue = await getMaintenanceDueDevices(sensors, actuators);

        res.json({
            overview: healthMetrics,
            recent_alerts: recentAlerts,
            maintenance_due: maintenanceDue,
            total_devices: sensors.length + actuators.length,
            healthy_devices: healthMetrics.healthy_devices,
            warning_devices: healthMetrics.warning_devices,
            error_devices: healthMetrics.error_devices
        });

    } catch (error) {
        console.error('Device health overview error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /device-health/devices:
 *   get:
 *     summary: Get detailed device health status
 *     tags: [Device Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/devices', [
    auth,
    requirePermission('sensor.view'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { device_type, health_status, silo_id } = req.query;
        const adminId = req.user.admin_id || req.user._id;
        
        const filter = { admin_id: adminId };
        if (silo_id) filter.silo_id = silo_id;

        let devices = [];
        
        if (!device_type || device_type === 'sensor') {
            const sensors = await SensorDevice.find(filter)
                .populate('silo_id', 'name silo_id')
                .sort({ created_at: -1 });
            
            const sensorHealth = await Promise.all(sensors.map(async (sensor) => {
                const healthStatus = await getDeviceHealthStatus(sensor, 'sensor');
                return {
                    ...sensor.toObject(),
                    health_status: healthStatus.status,
                    health_score: healthStatus.score,
                    last_reading: await getLastReading(sensor._id),
                    uptime_percentage: sensor.health_metrics?.uptime_percentage || 0,
                    error_count: sensor.health_metrics?.error_count || 0,
                    battery_level: sensor.battery_level || 0,
                    signal_strength: sensor.signal_strength || 0
                };
            }));
            
            devices = [...devices, ...sensorHealth];
        }

        if (!device_type || device_type === 'actuator') {
            const actuators = await Actuator.find(filter)
                .populate('silo_id', 'name silo_id')
                .sort({ created_at: -1 });
            
            const actuatorHealth = await Promise.all(actuators.map(async (actuator) => {
                const healthStatus = await getDeviceHealthStatus(actuator, 'actuator');
                return {
                    ...actuator.toObject(),
                    health_status: healthStatus.status,
                    health_score: healthStatus.score,
                    uptime_percentage: actuator.health_metrics?.uptime_percentage || 0,
                    error_count: actuator.health_metrics?.error_count || 0,
                    efficiency_rating: actuator.performance_metrics?.efficiency_rating || 0,
                    energy_consumption: actuator.performance_metrics?.energy_consumption?.current || 0
                };
            }));
            
            devices = [...devices, ...actuatorHealth];
        }

        // Filter by health status if specified
        if (health_status && health_status !== 'all') {
            devices = devices.filter(device => device.health_status === health_status);
        }

        res.json({
            devices,
            total_devices: devices.length,
            health_summary: {
                healthy: devices.filter(d => d.health_status === 'healthy').length,
                warning: devices.filter(d => d.health_status === 'warning').length,
                error: devices.filter(d => d.health_status === 'error').length,
                offline: devices.filter(d => d.health_status === 'offline').length
            }
        });

    } catch (error) {
        console.error('Get device health error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /device-health/{deviceId}/calibrate:
 *   post:
 *     summary: Calibrate a device
 *     tags: [Device Health]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:deviceId/calibrate', [
    auth,
    requirePermission('sensor.calibrate'),
    requireAdminAccess,
    param('deviceId').isMongoId().withMessage('Valid device ID is required'),
    [
        body('calibration_type').isIn(['full', 'sensor', 'actuator']).withMessage('Valid calibration type is required'),
        body('calibration_data').isObject().withMessage('Calibration data is required'),
        body('reference_values').optional().isObject().withMessage('Reference values must be object'),
        body('notes').optional().isString().withMessage('Notes must be string')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { deviceId } = req.params;
        const { calibration_type, calibration_data, reference_values, notes } = req.body;
        const adminId = req.user.admin_id || req.user._id;

        // Find device (sensor or actuator)
        let device = await SensorDevice.findById(deviceId);
        let deviceType = 'sensor';
        
        if (!device) {
            device = await Actuator.findById(deviceId);
            deviceType = 'actuator';
        }

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        if (device.admin_id.toString() !== adminId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Perform calibration
        const calibrationResult = await performDeviceCalibration(device, deviceType, {
            calibration_type,
            calibration_data,
            reference_values,
            notes,
            calibrated_by: req.user._id
        });

        // Update device calibration records
        if (!device.calibration_history) {
            device.calibration_history = [];
        }

        device.calibration_history.push({
            calibration_id: uuidv4(),
            calibration_type,
            calibration_data,
            reference_values,
            notes,
            calibrated_by: req.user._id,
            calibrated_at: new Date(),
            success: calibrationResult.success,
            accuracy_score: calibrationResult.accuracy_score
        });

        // Update last calibration date
        device.last_calibration_date = new Date();
        device.calibration_due_date = new Date(Date.now() + (device.calibration_interval_days || 30) * 24 * 60 * 60 * 1000);

        await device.save();

        // Create calibration alert if needed
        if (calibrationResult.success) {
            const alert = new GrainAlert({
                alert_id: uuidv4(),
                admin_id: device.admin_id,
                silo_id: device.silo_id,
                device_id: device._id,
                title: 'Device Calibration Completed',
                message: `${deviceType} ${device.name || device.device_name} has been successfully calibrated`,
                alert_type: 'in-app',
                priority: 'medium',
                source: 'system',
                sensor_type: 'calibration',
                trigger_conditions: {
                    calibration_id: device.calibration_history[device.calibration_history.length - 1].calibration_id,
                    accuracy_score: calibrationResult.accuracy_score
                }
            });

            await alert.save();
        }

        res.json({
            message: 'Device calibration completed',
            calibration_result: calibrationResult,
            device_type: deviceType,
            next_calibration_due: device.calibration_due_date
        });

    } catch (error) {
        console.error('Device calibration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /device-health/{deviceId}/maintenance:
 *   post:
 *     summary: Record device maintenance
 *     tags: [Device Health]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:deviceId/maintenance', [
    auth,
    requirePermission('sensor.manage'),
    requireAdminAccess,
    param('deviceId').isMongoId().withMessage('Valid device ID is required'),
    [
        body('maintenance_type').isString().withMessage('Maintenance type is required'),
        body('maintenance_actions').isArray().withMessage('Maintenance actions must be array'),
        body('parts_replaced').optional().isArray().withMessage('Parts replaced must be array'),
        body('cost').optional().isFloat({ min: 0 }).withMessage('Cost must be positive'),
        body('notes').optional().isString().withMessage('Notes must be string')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { deviceId } = req.params;
        const { maintenance_type, maintenance_actions, parts_replaced, cost, notes } = req.body;
        const adminId = req.user.admin_id || req.user._id;

        // Find device
        let device = await SensorDevice.findById(deviceId);
        let deviceType = 'sensor';
        
        if (!device) {
            device = await Actuator.findById(deviceId);
            deviceType = 'actuator';
        }

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        if (device.admin_id.toString() !== adminId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Record maintenance
        const maintenanceRecord = {
            maintenance_id: uuidv4(),
            maintenance_type,
            maintenance_actions,
            parts_replaced,
            cost,
            notes,
            performed_by: req.user._id,
            performed_at: new Date(),
            device_type: deviceType
        };

        if (!device.maintenance_history) {
            device.maintenance_history = [];
        }

        device.maintenance_history.push(maintenanceRecord);

        // Update maintenance dates
        device.last_maintenance_date = new Date();
        device.next_maintenance_due = new Date(Date.now() + (device.maintenance_interval_days || 90) * 24 * 60 * 60 * 1000);

        // Reset error count after maintenance
        if (device.health_metrics) {
            device.health_metrics.error_count = 0;
        }

        await device.save();

        // Create maintenance alert
        const alert = new GrainAlert({
            alert_id: uuidv4(),
            admin_id: device.admin_id,
            silo_id: device.silo_id,
            device_id: device._id,
            title: 'Device Maintenance Completed',
            message: `${deviceType} ${device.name || device.device_name} maintenance completed: ${maintenance_type}`,
            alert_type: 'in-app',
            priority: 'medium',
            source: 'system',
            sensor_type: 'maintenance',
            trigger_conditions: {
                maintenance_id: maintenanceRecord.maintenance_id,
                maintenance_type,
                cost
            }
        });

        await alert.save();

        res.json({
            message: 'Maintenance recorded successfully',
            maintenance_record: maintenanceRecord,
            next_maintenance_due: device.next_maintenance_due
        });

    } catch (error) {
        console.error('Device maintenance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /device-health/{deviceId}/diagnostics:
 *   get:
 *     summary: Run device diagnostics
 *     tags: [Device Health]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:deviceId/diagnostics', [
    auth,
    requirePermission('sensor.view'),
    requireAdminAccess,
    param('deviceId').isMongoId().withMessage('Valid device ID is required')
], async (req, res) => {
    try {
        const { deviceId } = req.params;
        const adminId = req.user.admin_id || req.user._id;

        // Find device
        let device = await SensorDevice.findById(deviceId);
        let deviceType = 'sensor';
        
        if (!device) {
            device = await Actuator.findById(deviceId);
            deviceType = 'actuator';
        }

        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        if (device.admin_id.toString() !== adminId.toString()) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Run diagnostics
        const diagnostics = await runDeviceDiagnostics(device, deviceType);

        res.json({
            device_id: deviceId,
            device_type: deviceType,
            diagnostics,
            timestamp: new Date()
        });

    } catch (error) {
        console.error('Device diagnostics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /device-health/bulk-calibration:
 *   post:
 *     summary: Perform bulk calibration on multiple devices
 *     tags: [Device Health]
 *     security:
 *       - bearerAuth: []
 */
router.post('/bulk-calibration', [
    auth,
    requirePermission('sensor.calibrate'),
    requireAdminAccess,
    [
        body('device_ids').isArray({ min: 1 }).withMessage('Device IDs array is required'),
        body('calibration_type').isIn(['full', 'sensor', 'actuator']).withMessage('Valid calibration type is required'),
        body('calibration_data').isObject().withMessage('Calibration data is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { device_ids, calibration_type, calibration_data } = req.body;
        const adminId = req.user.admin_id || req.user._id;
        const results = [];

        for (const deviceId of device_ids) {
            try {
                // Find device
                let device = await SensorDevice.findById(deviceId);
                let deviceType = 'sensor';
                
                if (!device) {
                    device = await Actuator.findById(deviceId);
                    deviceType = 'actuator';
                }

                if (!device || device.admin_id.toString() !== adminId.toString()) {
                    results.push({ device_id: deviceId, success: false, error: 'Device not found or access denied' });
                    continue;
                }

                // Perform calibration
                const calibrationResult = await performDeviceCalibration(device, deviceType, {
                    calibration_type,
                    calibration_data,
                    calibrated_by: req.user._id
                });

                // Update device
                if (!device.calibration_history) {
                    device.calibration_history = [];
                }

                device.calibration_history.push({
                    calibration_id: uuidv4(),
                    calibration_type,
                    calibration_data,
                    calibrated_by: req.user._id,
                    calibrated_at: new Date(),
                    success: calibrationResult.success,
                    accuracy_score: calibrationResult.accuracy_score
                });

                device.last_calibration_date = new Date();
                device.calibration_due_date = new Date(Date.now() + (device.calibration_interval_days || 30) * 24 * 60 * 60 * 1000);

                await device.save();

                results.push({ 
                    device_id: deviceId, 
                    success: true, 
                    calibration_result: calibrationResult 
                });

            } catch (error) {
                results.push({ device_id: deviceId, success: false, error: error.message });
            }
        }

        res.json({
            message: 'Bulk calibration completed',
            results,
            summary: {
                total: device_ids.length,
                successful: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length
            }
        });

    } catch (error) {
        console.error('Bulk calibration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions

async function calculateHealthMetrics(sensors, actuators) {
    const totalDevices = sensors.length + actuators.length;
    let healthyDevices = 0;
    let warningDevices = 0;
    let errorDevices = 0;

    // Check sensor health
    for (const sensor of sensors) {
        const healthStatus = await getDeviceHealthStatus(sensor, 'sensor');
        if (healthStatus.status === 'healthy') healthyDevices++;
        else if (healthStatus.status === 'warning') warningDevices++;
        else if (healthStatus.status !== 'offline') errorDevices++;
    }

    // Check actuator health
    for (const actuator of actuators) {
        const healthStatus = await getDeviceHealthStatus(actuator, 'actuator');
        if (healthStatus.status === 'healthy') healthyDevices++;
        else if (healthStatus.status === 'warning') warningDevices++;
        else if (healthStatus.status !== 'offline') errorDevices++;
    }

    return {
        total_devices: totalDevices,
        healthy_devices: healthyDevices,
        warning_devices: warningDevices,
        error_devices: errorDevices,
        health_percentage: totalDevices > 0 ? Math.round((healthyDevices / totalDevices) * 100) : 0
    };
}

async function getDeviceHealthStatus(device, deviceType) {
    const now = new Date();
    const lastHeartbeat = device.health_metrics?.last_heartbeat;
    
    // Check if device is offline
    if (!lastHeartbeat) {
        return { status: 'offline', score: 0 };
    }
    
    const minutesSinceHeartbeat = (now - lastHeartbeat) / (1000 * 60);
    const expectedInterval = deviceType === 'sensor' ? 5 : 10; // 5 min for sensors, 10 min for actuators
    
    if (minutesSinceHeartbeat > expectedInterval * 3) {
        return { status: 'offline', score: 0 };
    }

    // Calculate health score
    let score = 100;
    
    // Uptime penalty
    const uptime = device.health_metrics?.uptime_percentage || 0;
    if (uptime < 90) score -= (90 - uptime) * 2;
    
    // Error penalty
    const errorCount = device.health_metrics?.error_count || 0;
    score -= Math.min(errorCount * 5, 50);
    
    // Battery penalty (for sensors)
    if (deviceType === 'sensor' && device.battery_level < 20) {
        score -= (20 - device.battery_level) * 2;
    }
    
    // Signal strength penalty (for sensors)
    if (deviceType === 'sensor' && device.signal_strength < -70) {
        score -= Math.abs(device.signal_strength + 70) * 2;
    }

    // Determine status
    if (score >= 80) return { status: 'healthy', score };
    if (score >= 60) return { status: 'warning', score };
    return { status: 'error', score };
}

async function getLastReading(deviceId) {
    try {
        const reading = await SensorReading.findOne({ device_id: deviceId })
            .sort({ timestamp: -1 })
            .limit(1);
        return reading;
    } catch (error) {
        return null;
    }
}

async function getMaintenanceDueDevices(sensors, actuators) {
    const maintenanceDue = [];
    
    for (const sensor of sensors) {
        if (sensor.isMaintenanceDue && sensor.isMaintenanceDue()) {
            maintenanceDue.push({
                device_id: sensor._id,
                device_name: sensor.device_name,
                device_type: 'sensor',
                last_maintenance: sensor.last_maintenance_date,
                next_due: sensor.maintenance_due_date
            });
        }
    }
    
    for (const actuator of actuators) {
        if (actuator.isMaintenanceDue && actuator.isMaintenanceDue()) {
            maintenanceDue.push({
                device_id: actuator._id,
                device_name: actuator.name,
                device_type: 'actuator',
                last_maintenance: actuator.performance_metrics?.last_maintenance,
                next_due: actuator.performance_metrics?.next_maintenance_due
            });
        }
    }
    
    return maintenanceDue;
}

async function performDeviceCalibration(device, deviceType, calibrationData) {
    try {
        // Simulate calibration process
        const accuracyScore = Math.random() * 40 + 60; // 60-100% accuracy
        const success = accuracyScore >= 70;
        
        // Update device calibration data
        if (!device.calibration_data) {
            device.calibration_data = {};
        }
        
        device.calibration_data[deviceType] = {
            ...calibrationData.calibration_data,
            calibrated_at: new Date(),
            accuracy_score: accuracyScore,
            success
        };

        return {
            success,
            accuracy_score: accuracyScore,
            calibration_type: calibrationData.calibration_type,
            calibrated_at: new Date()
        };
    } catch (error) {
        return {
            success: false,
            accuracy_score: 0,
            error: error.message
        };
    }
}

async function runDeviceDiagnostics(device, deviceType) {
    const diagnostics = {
        connectivity: {
            status: 'online',
            last_heartbeat: device.health_metrics?.last_heartbeat,
            uptime_percentage: device.health_metrics?.uptime_percentage || 0
        },
        performance: {
            error_count: device.health_metrics?.error_count || 0,
            efficiency_rating: device.performance_metrics?.efficiency_rating || 0
        },
        hardware: {
            battery_level: device.battery_level || 0,
            signal_strength: device.signal_strength || 0,
            memory_usage: device.health_metrics?.memory_usage || 0
        },
        calibration: {
            last_calibration: device.last_calibration_date,
            next_due: device.calibration_due_date,
            accuracy_score: device.calibration_data?.[deviceType]?.accuracy_score || 0
        },
        maintenance: {
            last_maintenance: device.last_maintenance_date,
            next_due: device.next_maintenance_due,
            maintenance_count: device.maintenance_history?.length || 0
        }
    };

    // Add device-specific diagnostics
    if (deviceType === 'sensor') {
        diagnostics.sensor_specific = {
            sensor_types: device.sensor_types,
            data_transmission_interval: device.data_transmission_interval,
            auto_alerts: device.auto_alerts
        };
    } else if (deviceType === 'actuator') {
        diagnostics.actuator_specific = {
            actuator_type: device.actuator_type,
            control_mode: device.control_mode,
            power_level: device.power_level,
            is_on: device.is_on
        };
    }

    return diagnostics;
}

module.exports = router;
