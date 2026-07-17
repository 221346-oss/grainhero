const express = require('express');
const router = express.Router();
const SensorReading = require('../models/SensorReading');
const SensorDevice = require('../models/SensorDevice');
const Silo = require('../models/Silo');
const GrainAlert = require('../models/GrainAlert');
const { auth } = require('../middleware/auth');
const { requirePermission, requireAdminAccess } = require('../middleware/permission');
const { body, validationResult, param, query } = require('express-validator');
const realTimeDataService = require('../services/realTimeDataService');

/**
 * @swagger
 * tags:
 *   name: Dual Probe Monitoring
 *   description: Dual-probe environmental monitoring (ambient + core readings)
 */

/**
 * @swagger
 * /dual-probe/readings:
 *   post:
 *     summary: Submit dual-probe sensor reading
 *     tags: [Dual Probe Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_id
 *               - probe_type
 *               - readings
 *             properties:
 *               device_id:
 *                 type: string
 *               probe_type:
 *                 type: string
 *                 enum: [ambient, core]
 *               readings:
 *                 type: object
 *                 properties:
 *                   temperature:
 *                     type: object
 *                     properties:
 *                       value: { type: number }
 *                       unit: { type: string, default: "celsius" }
 *                   humidity:
 *                     type: object
 *                     properties:
 *                       value: { type: number, minimum: 0, maximum: 100 }
 *                       unit: { type: string, default: "percent" }
 *                   co2:
 *                     type: object
 *                     properties:
 *                       value: { type: number, minimum: 0 }
 *                       unit: { type: string, default: "ppm" }
 *                   voc:
 *                     type: object
 *                     properties:
 *                       value: { type: number, minimum: 0 }
 *                       unit: { type: string, default: "ppb" }
 *                   moisture:
 *                     type: object
 *                     properties:
 *                       value: { type: number, minimum: 0, maximum: 100 }
 *                       unit: { type: string, default: "percent" }
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               device_metrics:
 *                 type: object
 *                 properties:
 *                   battery_level: { type: number, minimum: 0, maximum: 100 }
 *                   signal_strength: { type: number, maximum: 0 }
 *                   uptime: { type: number }
 *                   memory_usage: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       201:
 *         description: Dual-probe reading recorded successfully
 */
router.post('/readings', [
    auth,
    requirePermission('sensor.bulk_ingest'),
    requireAdminAccess,
    [
        body('device_id').isMongoId().withMessage('Valid device ID is required'),
        body('probe_type').isIn(['ambient', 'core']).withMessage('Probe type must be ambient or core'),
        body('readings').isObject().withMessage('Readings object is required'),
        body('timestamp').optional().isISO8601().withMessage('Invalid timestamp format')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { device_id, probe_type, readings, timestamp, device_metrics } = req.body;

        // Find sensor device
        const sensorDevice = await SensorDevice.findById(device_id);
        if (!sensorDevice) {
            return res.status(404).json({ error: 'Sensor device not found' });
        }

        if (!sensorDevice.is_enabled) {
            return res.status(400).json({ error: 'Sensor device is disabled' });
        }

        // Create sensor reading with probe type
        const reading = new SensorReading({
            device_id,
            admin_id: sensorDevice.admin_id,
            silo_id: sensorDevice.silo_id,
            timestamp: timestamp ? new Date(timestamp) : new Date(),
            probe_type, // Add probe type to distinguish ambient vs core
            ...readings,
            device_metrics
        });

        // Add probe-specific metadata
        reading.metadata = {
            probe_type,
            reading_sequence: await getNextReadingSequence(device_id, probe_type),
            calibration_applied: await getCalibrationOffsets(device_id, probe_type)
        };

        await reading.save();

        // Update device heartbeat
        await sensorDevice.updateHeartbeat();
        await sensorDevice.incrementReadingCount();

        // Process with real-time service
        await realTimeDataService.processSensorReading(reading);

        // Check for probe-specific alerts
        await checkProbeSpecificAlerts(reading, sensorDevice);

        res.status(201).json({
            message: 'Dual-probe reading recorded successfully',
            reading_id: reading._id,
            probe_type,
            processing_status: 'completed'
        });

    } catch (error) {
        console.error('Dual-probe reading error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dual-probe/readings:
 *   get:
 *     summary: Get dual-probe readings with comparison
 *     tags: [Dual Probe Monitoring]
 *     security:
 *       - bearerAuth: []
 */
router.get('/readings', [
    auth,
    requirePermission('sensor.view'),
    requireAdminAccess
], async (req, res) => {
    try {
        const {
            device_id,
            silo_id,
            start_date,
            end_date,
            probe_type,
            comparison = 'true'
        } = req.query;

        const startDate = start_date ? new Date(start_date) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const endDate = end_date ? new Date(end_date) : new Date();

        const filter = {
            admin_id: req.user.admin_id || req.user._id,
            timestamp: { $gte: startDate, $lte: endDate }
        };

        if (device_id) filter.device_id = device_id;
        if (silo_id) filter.silo_id = silo_id;
        if (probe_type) filter.probe_type = probe_type;

        const readings = await SensorReading.find(filter)
            .populate('device_id', 'device_name sensor_types')
            .populate('silo_id', 'name silo_id')
            .sort({ timestamp: -1 })
            .limit(1000);

        let result = { readings };

        // If comparison is requested, analyze ambient vs core differences
        if (comparison === 'true') {
            const comparisonData = await analyzeProbeComparison(filter, startDate, endDate);
            result.comparison = comparisonData;
        }

        // Get aggregated data by probe type
        const aggregatedData = await getAggregatedProbeData(filter);
        result.aggregated_data = aggregatedData;

        res.json(result);

    } catch (error) {
        console.error('Get dual-probe readings error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dual-probe/analysis:
 *   get:
 *     summary: Get dual-probe analysis and insights
 *     tags: [Dual Probe Monitoring]
 *     security:
 *       - bearerAuth: []
 */
router.get('/analysis', [
    auth,
    requirePermission('sensor.view'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { silo_id, days = 7 } = req.query;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - parseInt(days) * 24 * 60 * 60 * 1000);

        const filter = {
            admin_id: req.user.admin_id || req.user._id,
            timestamp: { $gte: startDate, $lte: endDate }
        };

        if (silo_id) filter.silo_id = silo_id;

        // Get analysis data
        const analysis = await performDualProbeAnalysis(filter, startDate, endDate);

        res.json({
            analysis_period: { start: startDate, end: endDate },
            silo_id: silo_id || 'all',
            analysis
        });

    } catch (error) {
        console.error('Dual-probe analysis error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dual-probe/calibration:
 *   post:
 *     summary: Calibrate dual-probe sensors
 *     tags: [Dual Probe Monitoring]
 *     security:
 *       - bearerAuth: []
 */
router.post('/calibration', [
    auth,
    requirePermission('sensor.calibrate'),
    requireAdminAccess,
    [
        body('device_id').isMongoId().withMessage('Valid device ID is required'),
        body('probe_type').isIn(['ambient', 'core']).withMessage('Probe type must be ambient or core'),
        body('calibration_data').isObject().withMessage('Calibration data is required')
    ]
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { device_id, probe_type, calibration_data } = req.body;

        const sensorDevice = await SensorDevice.findById(device_id);
        if (!sensorDevice) {
            return res.status(404).json({ error: 'Sensor device not found' });
        }

        // Update calibration data
        if (!sensorDevice.calibration_data) {
            sensorDevice.calibration_data = {};
        }

        sensorDevice.calibration_data[probe_type] = {
            ...calibration_data,
            calibrated_at: new Date(),
            calibrated_by: req.user._id
        };

        await sensorDevice.save();

        res.json({
            message: 'Dual-probe calibration completed successfully',
            probe_type,
            calibration_data: sensorDevice.calibration_data[probe_type]
        });

    } catch (error) {
        console.error('Dual-probe calibration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /dual-probe/health:
 *   get:
 *     summary: Get dual-probe system health status
 *     tags: [Dual Probe Monitoring]
 *     security:
 *       - bearerAuth: []
 */
router.get('/health', [
    auth,
    requirePermission('sensor.view'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { silo_id } = req.query;

        const filter = { admin_id: req.user.admin_id || req.user._id };
        if (silo_id) filter.silo_id = silo_id;

        // Get health status for all dual-probe devices
        const devices = await SensorDevice.find(filter)
            .populate('silo_id', 'name silo_id');

        const healthStatus = await Promise.all(devices.map(async (device) => {
            const ambientReadings = await SensorReading.find({
                device_id: device._id,
                probe_type: 'ambient',
                timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
            }).sort({ timestamp: -1 }).limit(10);

            const coreReadings = await SensorReading.find({
                device_id: device._id,
                probe_type: 'core',
                timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
            }).sort({ timestamp: -1 }).limit(10);

            return {
                device_id: device._id,
                device_name: device.device_name,
                silo: device.silo_id,
                ambient_status: getProbeHealthStatus(ambientReadings),
                core_status: getProbeHealthStatus(coreReadings),
                overall_health: getOverallProbeHealth(ambientReadings, coreReadings)
            };
        }));

        res.json({
            health_status: healthStatus,
            summary: {
                total_devices: devices.length,
                healthy_devices: healthStatus.filter(h => h.overall_health === 'healthy').length,
                warning_devices: healthStatus.filter(h => h.overall_health === 'warning').length,
                error_devices: healthStatus.filter(h => h.overall_health === 'error').length
            }
        });

    } catch (error) {
        console.error('Dual-probe health error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Helper functions

async function getNextReadingSequence(deviceId, probeType) {
    const lastReading = await SensorReading.findOne({
        device_id: deviceId,
        probe_type: probeType
    }).sort({ timestamp: -1 });

    return lastReading ? (lastReading.metadata?.reading_sequence || 0) + 1 : 1;
}

async function getCalibrationOffsets(deviceId, probeType) {
    const device = await SensorDevice.findById(deviceId);
    if (!device?.calibration_data?.[probeType]) {
        return null;
    }

    return device.calibration_data[probeType].offsets || null;
}

async function checkProbeSpecificAlerts(reading, sensorDevice) {
    try {
        const probeType = reading.probe_type;
        const silo = await Silo.findById(reading.silo_id);
        
        if (!silo) return;

        // Check for probe-specific threshold violations
        const violations = await checkProbeThresholds(reading, sensorDevice, probeType);
        
        if (violations.length > 0) {
            for (const violation of violations) {
                const alert = new GrainAlert({
                    alert_id: require('uuid').v4(),
                    admin_id: reading.admin_id,
                    silo_id: reading.silo_id,
                    device_id: reading.device_id,
                    title: `${probeType.toUpperCase()} ${violation.sensor_type.toUpperCase()} ${violation.severity.toUpperCase()}`,
                    message: `${probeType} probe ${violation.sensor_type} ${violation.threshold_type.replace('_', ' ')}: ${violation.actual_value} (threshold: ${violation.threshold_value})`,
                    alert_type: 'in-app',
                    priority: violation.severity === 'critical' ? 'critical' : 'high',
                    source: 'sensor',
                    sensor_type: violation.sensor_type,
                    trigger_conditions: {
                        sensor_reading_id: reading._id,
                        probe_type,
                        threshold_type: violation.threshold_type,
                        threshold_value: violation.threshold_value,
                        actual_value: violation.actual_value
                    }
                });

                await alert.save();
            }
        }

        // Check for ambient vs core differences
        if (probeType === 'core') {
            await checkAmbientCoreDifferences(reading, sensorDevice);
        }

    } catch (error) {
        console.error('Check probe-specific alerts error:', error);
    }
}

async function checkProbeThresholds(reading, sensorDevice, probeType) {
    const violations = [];
    const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
    
    // Get probe-specific thresholds
    const thresholds = sensorDevice.thresholds || {};
    const probeThresholds = thresholds[probeType] || thresholds; // Fallback to general thresholds
    
    for (const type of sensorTypes) {
        const value = reading[type]?.value;
        const threshold = probeThresholds[type];
        
        if (value !== undefined && threshold) {
            if (threshold.critical_min !== undefined && value < threshold.critical_min) {
                violations.push({
                    sensor_type: type,
                    threshold_type: 'critical_min',
                    threshold_value: threshold.critical_min,
                    actual_value: value,
                    severity: 'critical'
                });
            } else if (threshold.critical_max !== undefined && value > threshold.critical_max) {
                violations.push({
                    sensor_type: type,
                    threshold_type: 'critical_max',
                    threshold_value: threshold.critical_max,
                    actual_value: value,
                    severity: 'critical'
                });
            } else if (threshold.min !== undefined && value < threshold.min) {
                violations.push({
                    sensor_type: type,
                    threshold_type: 'min',
                    threshold_value: threshold.min,
                    actual_value: value,
                    severity: 'warning'
                });
            } else if (threshold.max !== undefined && value > threshold.max) {
                violations.push({
                    sensor_type: type,
                    threshold_type: 'max',
                    threshold_value: threshold.max,
                    actual_value: value,
                    severity: 'warning'
                });
            }
        }
    }
    
    return violations;
}

async function checkAmbientCoreDifferences(coreReading, sensorDevice) {
    try {
        // Get recent ambient reading from same device
        const ambientReading = await SensorReading.findOne({
            device_id: coreReading.device_id,
            probe_type: 'ambient',
            timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
        }).sort({ timestamp: -1 });

        if (!ambientReading) return;

        const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
        const significantDifferences = [];

        for (const type of sensorTypes) {
            const ambientValue = ambientReading[type]?.value;
            const coreValue = coreReading[type]?.value;
            
            if (ambientValue !== undefined && coreValue !== undefined) {
                const difference = Math.abs(coreValue - ambientValue);
                const percentageDiff = (difference / ambientValue) * 100;
                
                // Alert if difference is significant (>20% or >5 units for temperature)
                const threshold = type === 'temperature' ? 5 : 20;
                if (difference > threshold || percentageDiff > 20) {
                    significantDifferences.push({
                        sensor_type: type,
                        ambient_value: ambientValue,
                        core_value: coreValue,
                        difference,
                        percentage_difference: percentageDiff
                    });
                }
            }
        }

        if (significantDifferences.length > 0) {
            const alert = new GrainAlert({
                alert_id: require('uuid').v4(),
                admin_id: coreReading.admin_id,
                silo_id: coreReading.silo_id,
                device_id: coreReading.device_id,
                title: 'SIGNIFICANT AMBIENT-CORE DIFFERENCE',
                message: `Significant differences detected between ambient and core readings: ${significantDifferences.map(d => `${d.sensor_type} (${d.difference.toFixed(2)})`).join(', ')}`,
                alert_type: 'in-app',
                priority: 'high',
                source: 'sensor',
                sensor_type: 'dual_probe',
                trigger_conditions: {
                    sensor_reading_id: coreReading._id,
                    probe_type: 'core',
                    differences: significantDifferences
                }
            });

            await alert.save();
        }

    } catch (error) {
        console.error('Check ambient-core differences error:', error);
    }
}

async function analyzeProbeComparison(filter, startDate, endDate) {
    try {
        const ambientReadings = await SensorReading.find({
            ...filter,
            probe_type: 'ambient'
        }).sort({ timestamp: 1 });

        const coreReadings = await SensorReading.find({
            ...filter,
            probe_type: 'core'
        }).sort({ timestamp: 1 });

        const comparison = {
            ambient_stats: calculateProbeStats(ambientReadings),
            core_stats: calculateProbeStats(coreReadings),
            differences: calculateProbeDifferences(ambientReadings, coreReadings),
            correlation: calculateProbeCorrelation(ambientReadings, coreReadings)
        };

        return comparison;
    } catch (error) {
        console.error('Analyze probe comparison error:', error);
        return null;
    }
}

function calculateProbeStats(readings) {
    const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
    const stats = {};

    for (const type of sensorTypes) {
        const values = readings
            .map(r => r[type]?.value)
            .filter(v => v !== undefined);

        if (values.length > 0) {
            stats[type] = {
                count: values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                avg: values.reduce((sum, val) => sum + val, 0) / values.length,
                std_dev: calculateStandardDeviation(values)
            };
        }
    }

    return stats;
}

function calculateProbeDifferences(ambientReadings, coreReadings) {
    const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
    const differences = {};

    for (const type of sensorTypes) {
        const ambientValues = ambientReadings.map(r => r[type]?.value).filter(v => v !== undefined);
        const coreValues = coreReadings.map(r => r[type]?.value).filter(v => v !== undefined);

        if (ambientValues.length > 0 && coreValues.length > 0) {
            const ambientAvg = ambientValues.reduce((sum, val) => sum + val, 0) / ambientValues.length;
            const coreAvg = coreValues.reduce((sum, val) => sum + val, 0) / coreValues.length;
            
            differences[type] = {
                average_difference: coreAvg - ambientAvg,
                max_difference: Math.max(...coreValues) - Math.min(...ambientValues),
                min_difference: Math.min(...coreValues) - Math.max(...ambientValues)
            };
        }
    }

    return differences;
}

function calculateProbeCorrelation(ambientReadings, coreReadings) {
    const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];
    const correlations = {};

    for (const type of sensorTypes) {
        const ambientValues = ambientReadings.map(r => r[type]?.value).filter(v => v !== undefined);
        const coreValues = coreReadings.map(r => r[type]?.value).filter(v => v !== undefined);

        if (ambientValues.length > 0 && coreValues.length > 0) {
            correlations[type] = calculateCorrelation(ambientValues, coreValues);
        }
    }

    return correlations;
}

function calculateCorrelation(x, y) {
    const n = Math.min(x.length, y.length);
    if (n === 0) return 0;

    const sumX = x.slice(0, n).reduce((sum, val) => sum + val, 0);
    const sumY = y.slice(0, n).reduce((sum, val) => sum + val, 0);
    const sumXY = x.slice(0, n).reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.slice(0, n).reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.slice(0, n).reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
}

function calculateStandardDeviation(values) {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
}

async function getAggregatedProbeData(filter) {
    try {
        const aggregation = await SensorReading.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: {
                        probe_type: '$probe_type',
                        hour: { $dateToString: { format: '%Y-%m-%d %H:00', date: '$timestamp' } }
                    },
                    avg_temperature: { $avg: '$temperature.value' },
                    avg_humidity: { $avg: '$humidity.value' },
                    avg_co2: { $avg: '$co2.value' },
                    avg_voc: { $avg: '$voc.value' },
                    avg_moisture: { $avg: '$moisture.value' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.hour': 1 } }
        ]);

        return aggregation;
    } catch (error) {
        console.error('Get aggregated probe data error:', error);
        return [];
    }
}

async function performDualProbeAnalysis(filter, startDate, endDate) {
    try {
        const readings = await SensorReading.find(filter)
            .sort({ timestamp: 1 });

        const ambientReadings = readings.filter(r => r.probe_type === 'ambient');
        const coreReadings = readings.filter(r => r.probe_type === 'core');

        return {
            data_quality: {
                ambient_readings: ambientReadings.length,
                core_readings: coreReadings.length,
                data_completeness: calculateDataCompleteness(readings),
                temporal_coverage: calculateTemporalCoverage(readings, startDate, endDate)
            },
            environmental_insights: {
                temperature_gradient: calculateTemperatureGradient(ambientReadings, coreReadings),
                humidity_patterns: analyzeHumidityPatterns(ambientReadings, coreReadings),
                air_quality_trends: analyzeAirQualityTrends(ambientReadings, coreReadings)
            },
            recommendations: generateDualProbeRecommendations(ambientReadings, coreReadings)
        };
    } catch (error) {
        console.error('Perform dual-probe analysis error:', error);
        return null;
    }
}

function calculateDataCompleteness(readings) {
    const totalExpected = readings.length * 5; // 5 sensor types
    const actualReadings = readings.reduce((sum, reading) => {
        return sum + ['temperature', 'humidity', 'co2', 'voc', 'moisture']
            .filter(type => reading[type]?.value !== undefined).length;
    }, 0);

    return (actualReadings / totalExpected) * 100;
}

function calculateTemporalCoverage(readings, startDate, endDate) {
    const totalHours = (endDate - startDate) / (1000 * 60 * 60);
    const uniqueHours = new Set(readings.map(r => 
        new Date(r.timestamp).setMinutes(0, 0, 0).getTime()
    )).size;

    return (uniqueHours / totalHours) * 100;
}

function calculateTemperatureGradient(ambientReadings, coreReadings) {
    if (ambientReadings.length === 0 || coreReadings.length === 0) return null;

    const ambientTemp = ambientReadings.reduce((sum, r) => sum + (r.temperature?.value || 0), 0) / ambientReadings.length;
    const coreTemp = coreReadings.reduce((sum, r) => sum + (r.temperature?.value || 0), 0) / coreReadings.length;

    return {
        gradient: coreTemp - ambientTemp,
        ambient_average: ambientTemp,
        core_average: coreTemp,
        significance: Math.abs(coreTemp - ambientTemp) > 2 ? 'significant' : 'normal'
    };
}

function analyzeHumidityPatterns(ambientReadings, coreReadings) {
    // Implementation for humidity pattern analysis
    return {
        ambient_humidity_trend: 'stable',
        core_humidity_trend: 'stable',
        humidity_difference: 0
    };
}

function analyzeAirQualityTrends(ambientReadings, coreReadings) {
    // Implementation for air quality trend analysis
    return {
        co2_trend: 'stable',
        voc_trend: 'stable',
        air_quality_index: 'good'
    };
}

function generateDualProbeRecommendations(ambientReadings, coreReadings) {
    const recommendations = [];

    // Analyze temperature gradient
    const tempGradient = calculateTemperatureGradient(ambientReadings, coreReadings);
    if (tempGradient && Math.abs(tempGradient.gradient) > 5) {
        recommendations.push({
            type: 'temperature_management',
            priority: 'high',
            message: `Significant temperature gradient detected (${tempGradient.gradient.toFixed(1)}°C). Consider ventilation adjustments.`,
            action: 'Review ventilation settings and grain distribution'
        });
    }

    // Add more recommendation logic based on analysis
    return recommendations;
}

function getProbeHealthStatus(readings) {
    if (readings.length === 0) return 'no_data';
    
    const recentReadings = readings.filter(r => 
        new Date(r.timestamp) > new Date(Date.now() - 30 * 60 * 1000)
    );

    if (recentReadings.length === 0) return 'offline';
    if (recentReadings.length < 3) return 'warning';
    
    return 'healthy';
}

function getOverallProbeHealth(ambientReadings, coreReadings) {
    const ambientHealth = getProbeHealthStatus(ambientReadings);
    const coreHealth = getProbeHealthStatus(coreReadings);

    if (ambientHealth === 'no_data' && coreHealth === 'no_data') return 'error';
    if (ambientHealth === 'offline' || coreHealth === 'offline') return 'error';
    if (ambientHealth === 'warning' || coreHealth === 'warning') return 'warning';
    
    return 'healthy';
}

module.exports = router;
