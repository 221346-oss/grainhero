const cron = require('node-cron');
const weatherService = require('./weatherService');
const SensorReading = require('../models/SensorReading');
const Silo = require('../models/Silo');
const SensorDevice = require('../models/SensorDevice');
const mongoose = require('mongoose');
const { SENSOR_TYPES } = require('../configs/enum');

class EnvironmentalDataService {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
    this.environmentalDeviceId = null;
  }

  /**
   * Initialize the environmental data service
   * Creates a special device for environmental data if it doesn't exist
   */
  async initialize() {
    try {
      // Check if environmental device already exists
      let environmentalDevice = await SensorDevice.findOne({ 
        device_id: 'ENVIRONMENTAL_DATA_SOURCE' 
      });
      
      if (!environmentalDevice) {
        // Create a dummy admin ID and silo ID for the environmental device
        // In a real implementation, these would be set per silo
        const dummyAdminId = new mongoose.Types.ObjectId();
        const dummySiloId = new mongoose.Types.ObjectId();
        const dummyCreatorId = dummyAdminId;
        
        // Create a special device for environmental data
        environmentalDevice = new SensorDevice({
          device_id: 'ENVIRONMENTAL_DATA_SOURCE',
          device_name: 'OpenWeather API Data Source',
          model: 'OpenWeather API',
          manufacturer: 'OpenWeatherMap',
          sensor_types: [
            SENSOR_TYPES.TEMPERATURE,
            SENSOR_TYPES.HUMIDITY,
            SENSOR_TYPES.PRESSURE,
            SENSOR_TYPES.LIGHT
          ],
          device_type: 'sensor',
          category: 'environmental',
          status: 'active',
          communication_protocol: 'http', // Valid enum value
          admin_id: dummyAdminId,
          silo_id: dummySiloId,
          created_by: dummyCreatorId,
          data_transmission_interval: 300 // 5 minutes
        });
        
        await environmentalDevice.save();
        console.log('Created environmental data source device');
      }
      
      this.environmentalDeviceId = environmentalDevice._id;
      console.log('Environmental data service initialized with device ID:', this.environmentalDeviceId);
    } catch (error) {
      console.error('Error initializing environmental data service:', error);
      throw error;
    }
  }

  /**
   * Start the environmental data collection service
   */
  async start() {
    if (this.isRunning) {
      console.log('Environmental data service is already running');
      return;
    }

    try {
      // Initialize the service
      await this.initialize();
      
      console.log('Starting environmental data collection service...');
      
      // Collect data every 5 minutes for ML model (aligned with project requirements)
      this.scheduleDataCollection('*/5 * * * *', '5min');
      
      // Collect data every 15 minutes for more frequent updates
      this.scheduleDataCollection('*/15 * * * *', '15min');
      
      // Collect data every hour for backup/historical
      this.scheduleDataCollection('0 * * * *', '1hour');
      
      // Collect data every 6 hours for long-term trends
      this.scheduleDataCollection('0 */6 * * *', '6hour');
      
      this.isRunning = true;
      console.log('Environmental data service started successfully');
    } catch (error) {
      console.error('Error starting environmental data service:', error);
      throw error;
    }
  }

  /**
   * Stop the environmental data collection service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Environmental data service is not running');
      return;
    }

    console.log('Stopping environmental data collection service...');
    
    this.jobs.forEach((job, key) => {
      job.destroy();
      console.log(`Stopped job: ${key}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('Environmental data service stopped');
  }

  /**
   * Schedule data collection for a specific interval
   * @param {string} cronExpression - Cron expression for scheduling
   * @param {string} intervalName - Name of the interval for logging
   */
  scheduleDataCollection(cronExpression, intervalName) {
    const job = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Starting ${intervalName} environmental data collection...`);
        await this.collectEnvironmentalData();
        console.log(`${intervalName} environmental data collection completed`);
      } catch (error) {
        console.error(`Error in ${intervalName} environmental data collection:`, error);
      }
    }, {
      scheduled: false
    });

    job.start();
    this.jobs.set(intervalName, job);
    console.log(`Scheduled ${intervalName} environmental data collection`);
  }

  /**
   * Collect environmental data for all silos
   */
  async collectEnvironmentalData() {
    try {
      // Get all silos with their locations
      const silos = await Silo.find({ 
        'location.coordinates.latitude': { $exists: true },
        'location.coordinates.longitude': { $exists: true }
      }); // Removed populate('admin_id', '_id') as it's causing StrictPopulateError

      if (silos.length === 0) {
        console.log('No silos with location data found');
        return;
      }

      console.log(`Found ${silos.length} silos with location data`);

      // Collect data for each silo
      const collectionPromises = silos.map(silo => 
        this.collectDataForSilo(silo)
      );

      const results = await Promise.allSettled(collectionPromises);
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Environmental data collection completed: ${successful} successful, ${failed} failed`);
      
      if (failed > 0) {
        console.log('Failed collections:', results
          .filter(r => r.status === 'rejected')
          .map(r => r.reason.message)
        );
      }
    } catch (error) {
      console.error('Error in environmental data collection:', error);
      throw error;
    }
  }

  /**
   * Collect environmental data for a specific silo
   * @param {Object} silo - Silo object with location data
   */
  async collectDataForSilo(silo) {
    try {
      const { latitude, longitude } = silo.location.coordinates;
      
      if (!latitude || !longitude) {
        throw new Error(`Silo ${silo.silo_id} has no location data`);
      }

      // Fetch environmental data
      const environmentalData = await weatherService.getEnvironmentalData(latitude, longitude);
      const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);

      // Create sensor reading with environmental context
      const sensorReading = new SensorReading({
        admin_id: silo.admin_id,
        admin_id: silo.admin_id,
        silo_id: silo._id,
        device_id: this.environmentalDeviceId,
        timestamp: new Date(),
        environmental_context: {
          weather: environmentalData.weather,
          air_quality_index: environmentalData.airQuality.aqi,
          pmd_data: {
            pm25: environmentalData.airQuality.pm2_5,
            pm10: environmentalData.airQuality.pm10,
            ozone: environmentalData.airQuality.o3
          }
        },
        quality_indicators: {
          is_valid: true,
          confidence_score: 0.9,
          anomaly_detected: false
        },
        // Add impact assessment as metadata
        raw_payload: {
          impact_assessment: impactAssessment,
          aqi_level: weatherService.getAQILevel(environmentalData.airQuality.aqi),
          collection_source: 'automated_environmental_service'
        }
      });

      await sensorReading.save();
      
      console.log(`Environmental data collected for silo ${silo.silo_id} at ${latitude}, ${longitude}`);
      
      return {
        silo_id: silo.silo_id,
        reading_id: sensorReading._id,
        timestamp: sensorReading.timestamp,
        impact_assessment: impactAssessment
      };
    } catch (error) {
      console.error(`Error collecting data for silo ${silo.silo_id}:`, error);
      throw error;
    }
  }

  /**
   * Manually trigger data collection for a specific location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @param {string} admin_id - Admin ID
   * @param {string} silo_id - Silo ID (optional)
   */
  async collectDataForLocation(lat, lon, admin_id, silo_id = null) {
    try {
      console.log(`Manually collecting environmental data for location ${lat}, ${lon}`);
      
      const environmentalData = await weatherService.getEnvironmentalData(lat, lon);
      const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);
      
      const sensorReading = new SensorReading({
        admin_id,
        admin_id: null, // Global environmental reading
        silo_id,
        device_id: this.environmentalDeviceId,
        timestamp: new Date(),
        environmental_context: {
          weather: environmentalData.weather,
          air_quality_index: environmentalData.airQuality.aqi,
          pmd_data: {
            pm25: environmentalData.airQuality.pm2_5,
            pm10: environmentalData.airQuality.pm10,
            ozone: environmentalData.airQuality.o3
          }
        },
        quality_indicators: {
          is_valid: true,
          confidence_score: 0.9,
          anomaly_detected: false
        },
        raw_payload: {
          impact_assessment: impactAssessment,
          aqi_level: weatherService.getAQILevel(environmentalData.airQuality.aqi),
          collection_source: 'manual_environmental_service'
        }
      });

      await sensorReading.save();
      
      console.log(`Manual environmental data collection completed for location ${lat}, ${lon}`);
      
      return {
        reading_id: sensorReading._id,
        timestamp: sensorReading.timestamp,
        environmental_data: environmentalData,
        impact_assessment: impactAssessment
      };
    } catch (error) {
      console.error(`Error in manual data collection for location ${lat}, ${lon}:`, error);
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: Array.from(this.jobs.keys()),
      jobCount: this.jobs.size
    };
  }
}

// Create singleton instance
const environmentalDataService = new EnvironmentalDataService();

module.exports = environmentalDataService;