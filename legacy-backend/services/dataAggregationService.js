/**
 * Data Aggregation Service (IoT Spec Alignment)
 * 
 * Implements 30-second raw sampling → 5-minute averaging pipeline
 * Matches IoT spec: "Raw sampling: every 30 seconds, 5-minute averages stored to CSV"
 */

const SensorReading = require('../models/SensorReading');
const EventEmitter = require('events');

class DataAggregationService extends EventEmitter {
  constructor() {
    super();
    this.rawBuffer = new Map(); // silo_id -> array of 30s raw readings
    this.aggregationInterval = null;
    this.isRunning = false;
  }

  /**
   * Start the aggregation service
   * Processes raw 30s readings into 5-min averages every 5 minutes
   */
  start() {
    if (this.isRunning) {
      console.log('Data aggregation service already running');
      return;
    }

    this.isRunning = true;
    
    // Run aggregation every 5 minutes
    this.aggregationInterval = setInterval(() => {
      this.aggregateRawReadings();
    }, 5 * 60 * 1000); // 5 minutes

    console.log('Data aggregation service started (5-minute intervals)');
  }

  /**
   * Stop the aggregation service
   */
  stop() {
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
      this.aggregationInterval = null;
    }
    this.isRunning = false;
    console.log('Data aggregation service stopped');
  }

  /**
   * Buffer a raw 30-second reading
   * IoT spec: "Raw sampling: every 30 seconds"
   */
  bufferRawReading(reading) {
    const siloId = reading.silo_id?.toString() || reading.silo_id;
    if (!siloId) {
      console.warn('Cannot buffer reading without silo_id');
      return;
    }

    if (!this.rawBuffer.has(siloId)) {
      this.rawBuffer.set(siloId, []);
    }

    const buffer = this.rawBuffer.get(siloId);
    buffer.push({
      ...reading,
      timestamp: reading.timestamp || new Date()
    });

    // Keep only last 10 minutes of raw data (20 readings at 30s intervals)
    if (buffer.length > 20) {
      buffer.shift();
    }
  }

  /**
   * Aggregate raw 30s readings into 5-minute averages
   * IoT spec: "Averaging: 5-minute averages stored to CSV"
   */
  async aggregateRawReadings() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    for (const [siloId, rawReadings] of this.rawBuffer.entries()) {
      // Get readings from last 5 minutes
      const recentReadings = rawReadings.filter(r => 
        r.timestamp >= fiveMinutesAgo && r.timestamp <= now
      );

      if (recentReadings.length === 0) {
        continue;
      }

      try {
        // Calculate 5-minute averages (IoT spec)
        const aggregated = this.calculateAverages(recentReadings, siloId, now);
        
        // Store aggregated reading to database
        const aggregatedReading = new SensorReading(aggregated);
        await aggregatedReading.save();

        // Clear processed readings from buffer
        this.rawBuffer.set(siloId, rawReadings.filter(r => r.timestamp > now));

        this.emit('aggregated', {
          silo_id: siloId,
          timestamp: now,
          raw_count: recentReadings.length,
          aggregated_reading: aggregatedReading._id
        });

      } catch (error) {
        console.error(`Error aggregating readings for silo ${siloId}:`, error);
      }
    }
  }

  /**
   * Calculate 5-minute averages from raw 30s readings
   * IoT spec fields: T_core_avg_5m, RH_core_avg_5m, T_amb_avg_5m, RH_amb_avg_5m,
   * Grain_Moisture_avg_5m, VOC_index_avg_5m, etc.
   */
  calculateAverages(rawReadings, siloId, timestamp) {
    const count = rawReadings.length;
    if (count === 0) return null;

    // Average all numeric sensor values
    const avg = (field, subfield = 'value') => {
      const values = rawReadings
        .map(r => {
          const val = subfield ? r[field]?.[subfield] : r[field];
          return typeof val === 'number' ? val : null;
        })
        .filter(v => v !== null);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };

    // Get most recent actuation state (fan doesn't average)
    const latestActuation = rawReadings[rawReadings.length - 1]?.actuation_state || {};

    // Get most recent environmental context (weather API data)
    const latestEnv = rawReadings[rawReadings.length - 1]?.environmental_context || {};

    // Get most recent metadata
    const latestMetadata = rawReadings[rawReadings.length - 1]?.metadata || {};

    return {
      silo_id: rawReadings[0].silo_id,
      admin_id: rawReadings[0].admin_id,
      admin_id: rawReadings[0].admin_id,
      device_id: rawReadings[0].device_id,
      batch_id: rawReadings[0].batch_id,
      timestamp: timestamp,
      
      // 5-minute averaged core sensors (IoT spec)
      temperature: {
        value: avg('temperature', 'value'),
        unit: 'celsius'
      },
      humidity: {
        value: avg('humidity', 'value'),
        unit: 'percent'
      },
      
      // 5-minute averaged ambient sensors
      ambient: {
        temperature: {
          value: avg('ambient', 'temperature') || avg('ambient', 'temperature.value'),
          unit: 'celsius'
        },
        humidity: {
          value: avg('ambient', 'humidity') || avg('ambient', 'humidity.value'),
          unit: 'percent'
        },
        light: {
          value: avg('ambient', 'light') || avg('ambient', 'light.value'),
          unit: 'lux'
        }
      },
      
      // 5-minute averaged VOC (primary spoilage proxy)
      voc: {
        value: avg('voc', 'value'),
        unit: 'ppb'
      },
      
      // 5-minute averaged grain moisture
      moisture: {
        value: avg('moisture', 'value'),
        unit: 'percent'
      },
      
      // Most recent actuation state (fan doesn't average)
      actuation_state: {
        fan_state: latestActuation.fan_state ?? (latestActuation.fan_status === 'on' ? 1 : 0),
        fan_status: latestActuation.fan_status || 'off',
        fan_speed_factor: latestActuation.fan_speed_factor || 0,
        fan_duty_cycle: latestActuation.fan_duty_cycle || 0,
        fan_rpm: latestActuation.fan_rpm || 0,
        last_command_source: latestActuation.last_command_source,
        last_state_change: latestActuation.last_state_change
      },
      
      // Most recent environmental context (weather API)
      environmental_context: latestEnv,
      
      // Most recent metadata
      metadata: latestMetadata,
      
      // Quality indicators
      quality_indicators: {
        is_valid: true,
        confidence_score: 0.9,
        anomaly_detected: false,
        aggregation_window: '5min',
        raw_samples_count: count
      }
    };
  }

  /**
   * Get status of aggregation service
   */
  getStatus() {
    return {
      is_running: this.isRunning,
      buffer_size: this.rawBuffer.size,
      total_raw_readings: Array.from(this.rawBuffer.values())
        .reduce((sum, arr) => sum + arr.length, 0),
      next_aggregation: this.aggregationInterval ? 
        new Date(Date.now() + 5 * 60 * 1000) : null
    };
  }
}

// Singleton instance
const dataAggregationService = new DataAggregationService();

module.exports = dataAggregationService;

