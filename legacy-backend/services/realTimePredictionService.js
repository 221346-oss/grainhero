const EventEmitter = require('events');
const SensorReading = require('../models/SensorReading');
const GrainBatch = require('../models/GrainBatch');
const Silo = require('../models/Silo');
const aiSpoilageService = require('./aiSpoilageService');
const { v4: uuidv4 } = require('uuid');

class RealTimePredictionService extends EventEmitter {
    constructor() {
        super();
        this.activePredictions = new Map();
        this.predictionIntervals = new Map();
        this.isRunning = false;
        
        this.startRealTimeMonitoring();
    }

    /**
     * Start real-time monitoring for all active grain batches
     */
    async startRealTimeMonitoring() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log('Starting real-time prediction monitoring...');
        
        // Monitor all active batches every 5 minutes
        setInterval(async () => {
            await this.monitorAllBatches();
        }, 5 * 60 * 1000); // 5 minutes
        
        // Initial monitoring
        await this.monitorAllBatches();
    }

    /**
     * Monitor all active grain batches
     */
    async monitorAllBatches() {
        try {
            const activeBatches = await GrainBatch.find({
                status: { $in: ['stored', 'monitoring'] },
                deleted_at: null
            }).populate('silo_id');

            for (const batch of activeBatches) {
                await this.monitorBatch(batch);
            }
        } catch (error) {
            console.error('Error monitoring batches:', error);
        }
    }

    /**
     * Monitor a specific grain batch
     */
    async monitorBatch(batch) {
        try {
            // Check if batch has a valid silo_id
            if (!batch.silo_id || !batch.silo_id._id) {
                console.log(`Batch ${batch.batch_id} has no associated silo, skipping monitoring`);
                return;
            }

            // Get recent sensor readings for the batch's silo
            const recentReadings = await SensorReading.find({
                silo_id: batch.silo_id._id,
                timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // Last 30 minutes
            }).sort({ timestamp: -1 }).limit(10);

            if (recentReadings.length === 0) {
                console.log(`No recent readings for batch ${batch.batch_id}`);
                return;
            }

            // Calculate average environmental conditions
            const environmentalData = this.calculateAverageConditions(recentReadings);
            
            // Make prediction
            const prediction = await aiSpoilageService.predictSpoilage(
                batch._id,
                environmentalData,
                {
                    predictionType: 'general_spoilage',
                    horizon: 7,
                    userId: batch.created_by
                }
            );

            // Store prediction result
            this.activePredictions.set(batch._id.toString(), {
                batch_id: batch.batch_id,
                prediction_id: prediction.predictionId,
                timestamp: new Date(),
                environmental_data: environmentalData
            });

            // Emit real-time update
            this.emit('predictionUpdate', {
                batch_id: batch._id,
                batch_name: batch.batch_id,
                silo_name: batch.silo_id.name,
                prediction_id: prediction.predictionId,
                environmental_data: environmentalData,
                timestamp: new Date()
            });

        } catch (error) {
            console.error(`Error monitoring batch ${batch.batch_id}:`, error);
        }
    }

    /**
     * Calculate average environmental conditions from sensor readings
     */
    calculateAverageConditions(readings) {
        if (readings.length === 0) {
            return {
                temperature: 25,
                humidity: 60,
                co2: 400,
                moisture: 12,
                light: 100,
                pressure: 1013,
                ph: 7
            };
        }

        const totals = {
            temperature: 0,
            humidity: 0,
            co2: 0,
            moisture: 0,
            light: 0,
            pressure: 0,
            ph: 0
        };

        let count = 0;

        readings.forEach(reading => {
            if (reading.temperature?.value) {
                totals.temperature += reading.temperature.value;
                count++;
            }
            if (reading.humidity?.value) {
                totals.humidity += reading.humidity.value;
            }
            if (reading.co2?.value) {
                totals.co2 += reading.co2.value;
            }
            if (reading.moisture?.value) {
                totals.moisture += reading.moisture.value;
            }
            if (reading.light?.value) {
                totals.light += reading.light.value;
            }
            if (reading.pressure?.value) {
                totals.pressure += reading.pressure.value;
            }
            if (reading.ph?.value) {
                totals.ph += reading.ph.value;
            }
        });

        return {
            temperature: Math.round((totals.temperature / readings.length) * 100) / 100,
            humidity: Math.round((totals.humidity / readings.length) * 100) / 100,
            co2: Math.round((totals.co2 / readings.length) * 100) / 100,
            moisture: Math.round((totals.moisture / readings.length) * 100) / 100,
            light: Math.round((totals.light / readings.length) * 100) / 100,
            pressure: Math.round((totals.pressure / readings.length) * 100) / 100,
            ph: Math.round((totals.ph / readings.length) * 100) / 100,
            airflow: 1.0, // Default airflow
            pest_presence: 0, // Default no pests
            rainfall: 0 // Default no rain
        };
    }

    /**
     * Get real-time prediction for a specific batch
     */
    async getRealTimePrediction(batchId) {
        try {
            const batch = await GrainBatch.findById(batchId).populate('silo_id');
            if (!batch) {
                throw new Error('Batch not found');
            }

            // Get latest sensor readings
            const recentReadings = await SensorReading.find({
                silo_id: batch.silo_id._id,
                timestamp: { $gte: new Date(Date.now() - 10 * 60 * 1000) } // Last 10 minutes
            }).sort({ timestamp: -1 }).limit(5);

            const environmentalData = this.calculateAverageConditions(recentReadings);
            
            // Make immediate prediction
            const prediction = await aiSpoilageService.predictSpoilage(
                batchId,
                environmentalData,
                {
                    predictionType: 'general_spoilage',
                    horizon: 1, // 1 day horizon for real-time
                    userId: batch.created_by
                }
            );

            return {
                batch_id: batchId,
                batch_name: batch.batch_id,
                silo_name: batch.silo_id.name,
                prediction_id: prediction.predictionId,
                environmental_data: environmentalData,
                timestamp: new Date(),
                real_time: true
            };

        } catch (error) {
            console.error('Error getting real-time prediction:', error);
            throw error;
        }
    }

    /**
     * Get all active predictions
     */
    getActivePredictions() {
        return Array.from(this.activePredictions.values());
    }

    /**
     * Stop monitoring a specific batch
     */
    stopMonitoringBatch(batchId) {
        this.activePredictions.delete(batchId.toString());
        if (this.predictionIntervals.has(batchId.toString())) {
            clearInterval(this.predictionIntervals.get(batchId.toString()));
            this.predictionIntervals.delete(batchId.toString());
        }
    }

    /**
     * Start monitoring a specific batch
     */
    startMonitoringBatch(batchId) {
        const interval = setInterval(async () => {
            try {
                const batch = await GrainBatch.findById(batchId).populate('silo_id');
                if (batch) {
                    await this.monitorBatch(batch);
                }
            } catch (error) {
                console.error(`Error monitoring batch ${batchId}:`, error);
            }
        }, 5 * 60 * 1000); // 5 minutes

        this.predictionIntervals.set(batchId.toString(), interval);
    }

    /**
     * Get prediction statistics
     */
    getPredictionStats() {
        return {
            active_predictions: this.activePredictions.size,
            monitoring_batches: this.predictionIntervals.size,
            is_running: this.isRunning,
            last_update: new Date()
        };
    }

    /**
     * Stop all monitoring
     */
    stopAllMonitoring() {
        this.isRunning = false;
        this.activePredictions.clear();
        this.predictionIntervals.forEach(interval => clearInterval(interval));
        this.predictionIntervals.clear();
        console.log('Real-time monitoring stopped');
    }
}

module.exports = new RealTimePredictionService();
