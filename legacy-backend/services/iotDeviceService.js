const SensorDevice = require('../models/SensorDevice');
const SensorReading = require('../models/SensorReading');
const GrainAlert = require('../models/GrainAlert');
const { v4: uuidv4 } = require('uuid');

class IoTDeviceService {
  constructor() {
    this.deviceCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Process incoming sensor data from IoT devices
   */
  async processSensorData(deviceId, payload) {
    try {
      // Get device from cache or database
      let device = this.deviceCache.get(deviceId);
      const cacheTime = this.deviceCache.get(`${deviceId}_time`);
      
      if (!device || !cacheTime || (Date.now() - cacheTime > this.cacheExpiry)) {
        device = await SensorDevice.findOne({ device_id: deviceId });
        if (device) {
          this.deviceCache.set(deviceId, device);
          this.deviceCache.set(`${deviceId}_time`, Date.now());
        }
      }
      
      if (!device) {
        throw new Error(`Device ${deviceId} not found`);
      }

      // Validate payload
      const validatedPayload = this.validateSensorPayload(payload);
      
      // Create sensor reading
      const reading = new SensorReading({
        device_id: device._id,
        admin_id: device.admin_id,
        silo_id: device.silo_id,
        timestamp: validatedPayload.timestamp || new Date(),
        ...validatedPayload.readings,
        quality_indicators: {
          is_valid: true,
          confidence_score: validatedPayload.quality?.confidence_score || 0.95,
          anomaly_detected: validatedPayload.quality?.anomaly_detected || false
        },
        device_metrics: {
          battery_level: validatedPayload.battery_level || device.battery_level,
          signal_strength: validatedPayload.signal_strength || device.signal_strength
        },
        raw_payload: validatedPayload
      });

      // Save reading
      await reading.save();

      // Update device heartbeat and stats
      await device.updateHeartbeat();
      await device.incrementReadingCount();

      // Check thresholds and create alerts if needed
      const violations = await this.checkThresholdViolations(reading, device);
      if (violations.length > 0) {
        await this.createThresholdAlerts(device, reading, violations);
      }

      // Check for anomalies
      const anomalies = await this.detectAnomalies(reading);
      if (anomalies.length > 0) {
        await this.createAnomalyAlerts(device, reading, anomalies);
      }

      console.log(`✅ Processed sensor data for device ${deviceId}`);
      
      return {
        success: true,
        reading_id: reading._id,
        alerts_triggered: violations.length + anomalies.length
      };
    } catch (error) {
      console.error(`Error processing sensor data for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Process actuator command feedback
   */
  async processActuatorFeedback(deviceId, feedback) {
    try {
      const device = await SensorDevice.findOne({ device_id: deviceId });
      if (!device) {
        throw new Error(`Actuator ${deviceId} not found`);
      }

      // Update device status
      device.status = feedback.status || device.status;
      device.current_value = feedback.current_value;
      device.last_activity = new Date();
      
      if (feedback.battery_level !== undefined) {
        device.battery_level = feedback.battery_level;
      }
      
      if (feedback.signal_strength !== undefined) {
        device.signal_strength = feedback.signal_strength;
      }
      
      await device.save();

      console.log(`✅ Processed actuator feedback for device ${deviceId}`);
      
      return {
        success: true,
        device_id: deviceId
      };
    } catch (error) {
      console.error(`Error processing actuator feedback for device ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Validate sensor payload structure
   */
  validateSensorPayload(payload) {
    const validated = {
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      readings: {},
      quality: payload.quality || {},
      battery_level: payload.battery_level,
      signal_strength: payload.signal_strength
    };

    // Validate and extract sensor readings
    const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'tvoc', 'moisture', 'light', 'pressure', 'ph'];
    
    sensorTypes.forEach(type => {
      if (payload[type] !== undefined) {
        if (typeof payload[type] === 'object' && payload[type].value !== undefined) {
          validated.readings[type] = {
            value: payload[type].value,
            unit: payload[type].unit || this.getDefaultUnit(type)
          };
        } else if (typeof payload[type] === 'number') {
          validated.readings[type] = {
            value: payload[type],
            unit: this.getDefaultUnit(type)
          };
        }
      }
    });

    // Map tvoc alias to voc for consistency
    if (validated.readings.tvoc && !validated.readings.voc) {
      validated.readings.voc = validated.readings.tvoc;
      delete validated.readings.tvoc;
    }

    // Include actuator-related fields if present
    if (typeof payload.pwm_speed === 'number') {
      validated.readings.pwm_speed = { value: payload.pwm_speed, unit: 'percent' };
    }
    if (typeof payload.servo_state === 'boolean' || typeof payload.servo_state === 'number') {
      const val = typeof payload.servo_state === 'boolean' ? (payload.servo_state ? 1 : 0) : payload.servo_state;
      validated.readings.servo_state = { value: val, unit: 'boolean' };
    }

    // Handle ambient readings
    if (payload.ambient) {
      validated.readings.ambient = {};
      ['temperature', 'humidity', 'light'].forEach(type => {
        if (payload.ambient[type] !== undefined) {
          if (typeof payload.ambient[type] === 'object' && payload.ambient[type].value !== undefined) {
            validated.readings.ambient[type] = {
              value: payload.ambient[type].value,
              unit: payload.ambient[type].unit || this.getDefaultUnit(`ambient_${type}`)
            };
          } else if (typeof payload.ambient[type] === 'number') {
            validated.readings.ambient[type] = {
              value: payload.ambient[type],
              unit: this.getDefaultUnit(`ambient_${type}`)
            };
          }
        }
      });
    }

    return validated;
  }

  /**
   * Get default unit for sensor type
   */
  getDefaultUnit(type) {
    const units = {
      temperature: 'celsius',
      humidity: 'percent',
      co2: 'ppm',
      voc: 'ppb',
      moisture: 'percent',
      light: 'lux',
      pressure: 'hPa',
      ph: 'pH',
      ambient_temperature: 'celsius',
      ambient_humidity: 'percent',
      ambient_light: 'lux'
    };
    return units[type] || 'unknown';
  }

  /**
   * Check for threshold violations
   */
  async checkThresholdViolations(reading, device) {
    try {
      const violations = [];
      const sensorTypes = ['temperature', 'humidity', 'voc', 'moisture', 'co2'];
      
      if (!device.thresholds) {
        return violations;
      }

      for (const type of sensorTypes) {
        const value = reading[type]?.value;
        const threshold = device.thresholds[type];
        
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
   * Create threshold violation alerts
   */
  async createThresholdAlerts(device, reading, violations) {
    try {
      for (const violation of violations) {
        const alert = new GrainAlert({
          alert_id: uuidv4(),
          admin_id: device.admin_id,
          silo_id: device.silo_id,
          device_id: device._id,
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
        console.log(`🚨 Created threshold alert for device ${device.device_id}`);
      }
    } catch (error) {
      console.error('Create threshold alerts error:', error);
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
   * Create anomaly alerts
   */
  async createAnomalyAlerts(device, reading, anomalies) {
    try {
      for (const anomaly of anomalies) {
        const alert = new GrainAlert({
          alert_id: uuidv4(),
          admin_id: device.admin_id,
          silo_id: device.silo_id,
          device_id: device._id,
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
        console.log(`🚨 Created anomaly alert for device ${device.device_id}`);
      }
    } catch (error) {
      console.error('Create anomaly alerts error:', error);
    }
  }

  /**
   * Register a new IoT device
   */
  async registerDevice(deviceData) {
    try {
      const device = new SensorDevice({
        ...deviceData,
        device_type: deviceData.device_type || 'sensor',
        communication_protocol: deviceData.communication_protocol || 'mqtt',
        expected_heartbeat_interval: deviceData.data_transmission_interval || 300,
        connection_status: 'offline'
      });

      await device.save();
      
      // Clear cache for this device
      this.deviceCache.delete(device.device_id);
      
      console.log(`✅ Registered new IoT device: ${device.device_id}`);
      
      return device;
    } catch (error) {
      console.error('Register device error:', error);
      throw error;
    }
  }

  /**
   * Update device status
   */
  async updateDeviceStatus(deviceId, statusData) {
    try {
      const device = await SensorDevice.findOneAndUpdate(
        { device_id: deviceId },
        { 
          $set: {
            ...statusData,
            last_heartbeat: new Date(),
            connection_status: 'online'
          }
        },
        { new: true }
      );
      
      if (device) {
        // Update cache
        this.deviceCache.set(deviceId, device);
        this.deviceCache.set(`${deviceId}_time`, Date.now());
      }
      
      return device;
    } catch (error) {
      console.error(`Update device status error for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Get device by ID
   */
  async getDevice(deviceId) {
    try {
      // Check cache first
      let device = this.deviceCache.get(deviceId);
      const cacheTime = this.deviceCache.get(`${deviceId}_time`);
      
      if (!device || !cacheTime || (Date.now() - cacheTime > this.cacheExpiry)) {
        device = await SensorDevice.findOne({ device_id: deviceId });
        if (device) {
          this.deviceCache.set(deviceId, device);
          this.deviceCache.set(`${deviceId}_time`, Date.now());
        }
      }
      
      return device;
    } catch (error) {
      console.error(`Get device error for ${deviceId}:`, error);
      throw error;
    }
  }

  /**
   * Clear device cache
   */
  clearCache() {
    this.deviceCache.clear();
  }
}

module.exports = new IoTDeviceService();
