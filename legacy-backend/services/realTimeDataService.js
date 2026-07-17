const EventEmitter = require('events');
const SensorReading = require('../models/SensorReading');
const Actuator = require('../models/Actuator');
const GrainAlert = require('../models/GrainAlert');
const { v4: uuidv4 } = require('uuid');

class RealTimeDataService extends EventEmitter {
    constructor() {
        super();
        this.connectedClients = new Map();
        this.dataBuffer = new Map(); // For offline buffering
        this.processingQueue = [];
        this.isProcessing = false;

        // Start processing queue
        this.startQueueProcessor();

        // Cleanup old buffered data every hour
        setInterval(() => this.cleanupOldBufferedData(), 60 * 60 * 1000);
    }

    /**
     * Add a client to the real-time data stream
     */
    addClient(clientId, socket) {
        this.connectedClients.set(clientId, {
            socket,
            subscribedSilos: new Set(),
            subscribedSensors: new Set(),
            lastHeartbeat: new Date()
        });

        console.log(`Client ${clientId} connected to real-time data service`);
        this.emit('clientConnected', clientId);
    }

    /**
     * Remove a client from the real-time data stream
     */
    removeClient(clientId) {
        this.connectedClients.delete(clientId);
        console.log(`Client ${clientId} disconnected from real-time data service`);
        this.emit('clientDisconnected', clientId);
    }

    /**
     * Subscribe client to silo data updates
     */
    subscribeToSilo(clientId, siloId) {
        const client = this.connectedClients.get(clientId);
        if (client) {
            client.subscribedSilos.add(siloId);
            console.log(`Client ${clientId} subscribed to silo ${siloId}`);
        }
    }

    /**
     * Subscribe client to sensor data updates
     */
    subscribeToSensor(clientId, sensorId) {
        const client = this.connectedClients.get(clientId);
        if (client) {
            client.subscribedSensors.add(sensorId);
            console.log(`Client ${clientId} subscribed to sensor ${sensorId}`);
        }
    }

    /**
     * Unsubscribe client from silo data updates
     */
    unsubscribeFromSilo(clientId, siloId) {
        const client = this.connectedClients.get(clientId);
        if (client) {
            client.subscribedSilos.delete(siloId);
            console.log(`Client ${clientId} unsubscribed from silo ${siloId}`);
        }
    }

    /**
     * Unsubscribe client from sensor data updates
     */
    unsubscribeFromSensor(clientId, sensorId) {
        const client = this.connectedClients.get(clientId);
        if (client) {
            client.subscribedSensors.delete(sensorId);
            console.log(`Client ${clientId} unsubscribed from sensor ${sensorId}`);
        }
    }

    /**
     * Process incoming sensor reading with real-time analysis
     */
    async processSensorReading(readingData) {
        try {
            // Add to processing queue for async processing
            this.processingQueue.push({
                type: 'sensor_reading',
                data: readingData,
                timestamp: new Date()
            });

            // Process immediately if queue is not busy
            if (!this.isProcessing) {
                this.startQueueProcessor();
            }

            // Broadcast to subscribed clients
            this.broadcastSensorReading(readingData);

        } catch (error) {
            console.error('Process sensor reading error:', error);
            this.emit('error', error);
        }
    }

    /**
     * Process actuator control command
     */
    async processActuatorCommand(commandData) {
        try {
            this.processingQueue.push({
                type: 'actuator_command',
                data: commandData,
                timestamp: new Date()
            });

            if (!this.isProcessing) {
                this.startQueueProcessor();
            }

            // Broadcast actuator status change
            this.broadcastActuatorStatus(commandData);

        } catch (error) {
            console.error('Process actuator command error:', error);
            this.emit('error', error);
        }
    }

    /**
     * Start processing the queue
     */
    async startQueueProcessor() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        while (this.processingQueue.length > 0) {
            const item = this.processingQueue.shift();

            try {
                switch (item.type) {
                    case 'sensor_reading':
                        await this.processSensorReadingItem(item.data);
                        break;
                    case 'actuator_command':
                        await this.processActuatorCommandItem(item.data);
                        break;
                }
            } catch (error) {
                console.error('Queue processing error:', error);
            }
        }

        this.isProcessing = false;

        // Schedule next processing cycle
        setTimeout(() => this.startQueueProcessor(), 100);
    }

    /**
     * Backward-compatible wrapper
     */
    processQueue() {
        this.startQueueProcessor();
    }

    /**
     * Process individual sensor reading item
     */
    async processSensorReadingItem(readingData) {
        try {
            // Save reading to database
            const reading = new SensorReading(readingData);
            await reading.save();

            // Check for threshold violations
            const violations = await this.checkThresholdViolations(reading);

            if (violations.length > 0) {
                // Create alerts for violations
                for (const violation of violations) {
                    await this.createThresholdAlert(reading, violation);
                }

                // Trigger actuators if needed
                await this.triggerActuatorsForViolations(reading, violations);
            }

            // Check for anomalies
            const anomalies = await this.detectAnomalies(reading);
            if (anomalies.length > 0) {
                await this.createAnomalyAlert(reading, anomalies);
            }

            // Update silo conditions
            await this.updateSiloConditions(reading);

            this.emit('sensorReadingProcessed', reading);

        } catch (error) {
            console.error('Process sensor reading item error:', error);
        }
    }

    /**
     * Process individual actuator command item
     */
    async processActuatorCommandItem(commandData) {
        try {
            const { actuatorId, action, parameters } = commandData;

            const actuator = await Actuator.findById(actuatorId);
            if (!actuator) {
                throw new Error(`Actuator ${actuatorId} not found`);
            }

            // Execute the command
            let result;
            switch (action) {
                case 'on':
                    result = await actuator.startOperation('System', 'manual');
                    break;
                case 'off':
                    result = await actuator.stopOperation();
                    break;
                case 'set_power':
                    actuator.power_level = parameters.power_level;
                    if (parameters.power_level > 0 && !actuator.is_on) {
                        result = await actuator.startOperation('System', 'manual');
                    } else if (parameters.power_level === 0 && actuator.is_on) {
                        result = await actuator.stopOperation();
                    }
                    break;
            }

            this.emit('actuatorCommandProcessed', { actuatorId, action, result });

        } catch (error) {
            console.error('Process actuator command item error:', error);
        }
    }

    /**
     * Check for threshold violations in sensor reading
     */
    async checkThresholdViolations(reading) {
        try {
            const violations = [];
            const sensorTypes = ['temperature', 'humidity', 'voc', 'moisture'];

            // Get sensor device to check thresholds
            const sensorDevice = await require('../models/SensorDevice').findById(reading.device_id);
            if (!sensorDevice || !sensorDevice.thresholds) {
                return violations;
            }

            for (const type of sensorTypes) {
                const value = reading[type]?.value;
                const threshold = sensorDevice.thresholds[type];

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
        } catch (error) {
            console.error('Check threshold violations error:', error);
            return [];
        }
    }

    /**
     * Detect anomalies in sensor reading
     */
    async detectAnomalies(reading) {
        try {
            // Get historical data for anomaly detection
            const historicalData = await SensorReading.find({
                device_id: reading.device_id,
                timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
            }).limit(100);

            if (historicalData.length < 10) {
                return []; // Not enough data for anomaly detection
            }

            const anomalies = [];
            const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];

            for (const type of sensorTypes) {
                const value = reading[type]?.value;
                if (value === undefined) continue;

                const historicalValues = historicalData
                    .map(d => d[type]?.value)
                    .filter(v => v !== undefined);

                if (historicalValues.length < 5) continue;

                // Calculate statistics
                const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
                const variance = historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length;
                const stdDev = Math.sqrt(variance);

                // Check for anomaly (z-score > 3)
                const zScore = Math.abs((value - mean) / stdDev);
                if (zScore > 3) {
                    anomalies.push({
                        sensor_type: type,
                        value,
                        expected_range: {
                            min: mean - (2 * stdDev),
                            max: mean + (2 * stdDev)
                        },
                        z_score: zScore
                    });
                }
            }

            return anomalies;
        } catch (error) {
            console.error('Detect anomalies error:', error);
            return [];
        }
    }

    /**
     * Create threshold violation alert
     */
    async createThresholdAlert(reading, violation) {
        try {
            const alert = new GrainAlert({
                alert_id: uuidv4(),
                admin_id: reading.admin_id,
                silo_id: reading.silo_id,
                device_id: reading.device_id,
                title: `${violation.sensor_type.toUpperCase()} ${violation.severity.toUpperCase()}`,
                message: `${violation.sensor_type} ${violation.threshold_type.replace('_', ' ')}: ${violation.actual_value} (threshold: ${violation.threshold_value})`,
                alert_type: 'in-app',
                priority: violation.severity === 'critical' ? 'critical' : 'high',
                source: 'sensor',
                sensor_type: violation.sensor_type,
                trigger_conditions: {
                    sensor_reading_id: reading._id,
                    threshold_type: violation.threshold_type,
                    threshold_value: violation.threshold_value,
                    actual_value: violation.actual_value
                }
            });

            await alert.save();
            this.emit('alertCreated', alert);
        } catch (error) {
            console.error('Create threshold alert error:', error);
        }
    }

    /**
     * Create anomaly alert
     */
    async createAnomalyAlert(reading, anomalies) {
        try {
            for (const anomaly of anomalies) {
                const alert = new GrainAlert({
                    alert_id: uuidv4(),
                    admin_id: reading.admin_id,
                    silo_id: reading.silo_id,
                    device_id: reading.device_id,
                    title: `ANOMALY DETECTED: ${anomaly.sensor_type.toUpperCase()}`,
                    message: `${anomaly.sensor_type} reading ${anomaly.value} is outside normal range (${anomaly.expected_range.min} - ${anomaly.expected_range.max})`,
                    alert_type: 'in-app',
                    priority: 'high',
                    source: 'ai',
                    sensor_type: anomaly.sensor_type,
                    trigger_conditions: {
                        sensor_reading_id: reading._id,
                        anomaly_type: 'statistical',
                        z_score: anomaly.z_score,
                        expected_range: anomaly.expected_range
                    }
                });

                await alert.save();
                this.emit('alertCreated', alert);
            }
        } catch (error) {
            console.error('Create anomaly alert error:', error);
        }
    }

    /**
     * Trigger actuators for threshold violations
     */
    async triggerActuatorsForViolations(reading, violations) {
        try {
            const actuators = await Actuator.find({
                silo_id: reading.silo_id,
                is_enabled: true,
                status: 'active'
            });

            for (const actuator of actuators) {
                const shouldTrigger = actuator.shouldTrigger(reading);
                if (shouldTrigger) {
                    const recommendedActions = actuator.getRecommendedAction(reading);

                    // Start actuator operation
                    await actuator.startOperation('System', 'threshold', {
                        violations,
                        recommended_actions: recommendedActions
                    });

                    this.emit('actuatorTriggered', {
                        actuatorId: actuator._id,
                        reason: 'threshold_violation',
                        violations
                    });
                }
            }
        } catch (error) {
            console.error('Trigger actuators error:', error);
        }
    }

    /**
     * Update silo conditions based on sensor reading
     */
    async updateSiloConditions(reading) {
        try {
            const Silo = require('../models/Silo');
            const silo = await Silo.findById(reading.silo_id);
            if (!silo) return;

            const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];

            for (const type of sensorTypes) {
                if (reading[type]?.value !== undefined) {
                    await silo.updateCurrentConditions(type, reading[type].value, reading.device_id);
                }
            }

            this.emit('siloConditionsUpdated', { siloId: reading.silo_id, reading });
        } catch (error) {
            console.error('Update silo conditions error:', error);
        }
    }

    /**
     * Broadcast sensor reading to subscribed clients
     */
    broadcastSensorReading(reading) {
        const message = {
            type: 'sensor_reading',
            data: reading,
            timestamp: new Date()
        };

        this.connectedClients.forEach((client, clientId) => {
            if (client.subscribedSilos.has(reading.silo_id.toString()) ||
                client.subscribedSensors.has(reading.device_id.toString())) {

                try {
                    client.socket.emit('sensor_reading', message);
                } catch (error) {
                    console.error(`Broadcast to client ${clientId} error:`, error);
                    this.removeClient(clientId);
                }
            }
        });
    }

    /**
     * Broadcast actuator status to subscribed clients
     */
    broadcastActuatorStatus(actuatorData) {
        const message = {
            type: 'actuator_status',
            data: actuatorData,
            timestamp: new Date()
        };

        this.connectedClients.forEach((client, clientId) => {
            if (client.subscribedSilos.has(actuatorData.silo_id.toString())) {
                try {
                    client.socket.emit('actuator_status', message);
                } catch (error) {
                    console.error(`Broadcast to client ${clientId} error:`, error);
                    this.removeClient(clientId);
                }
            }
        });
    }

    /**
     * Buffer data for offline devices
     */
    bufferData(deviceId, data) {
        if (!this.dataBuffer.has(deviceId)) {
            this.dataBuffer.set(deviceId, []);
        }

        this.dataBuffer.get(deviceId).push({
            ...data,
            buffered_at: new Date()
        });

        // Limit buffer size
        const buffer = this.dataBuffer.get(deviceId);
        if (buffer.length > 1000) {
            buffer.splice(0, buffer.length - 1000);
        }
    }

    /**
     * Sync buffered data when device comes online
     */
    async syncBufferedData(deviceId) {
        const bufferedData = this.dataBuffer.get(deviceId);
        if (!bufferedData || bufferedData.length === 0) {
            return;
        }

        console.log(`Syncing ${bufferedData.length} buffered readings for device ${deviceId}`);

        for (const data of bufferedData) {
            try {
                await this.processSensorReading(data);
            } catch (error) {
                console.error(`Sync buffered data error for device ${deviceId}:`, error);
            }
        }

        // Clear buffer after successful sync
        this.dataBuffer.delete(deviceId);
    }

    /**
     * Cleanup old buffered data
     */
    cleanupOldBufferedData() {
        const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        this.dataBuffer.forEach((buffer, deviceId) => {
            const filteredBuffer = buffer.filter(item => item.buffered_at > cutoffTime);
            if (filteredBuffer.length === 0) {
                this.dataBuffer.delete(deviceId);
            } else {
                this.dataBuffer.set(deviceId, filteredBuffer);
            }
        });
    }

    /**
     * Get real-time statistics
     */
    getStats() {
        return {
            connectedClients: this.connectedClients.size,
            processingQueueLength: this.processingQueue.length,
            bufferedDevices: this.dataBuffer.size,
            totalBufferedReadings: Array.from(this.dataBuffer.values()).reduce((sum, buffer) => sum + buffer.length, 0)
        };
    }
}

module.exports = new RealTimeDataService();
