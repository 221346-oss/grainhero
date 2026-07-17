const cron = require('node-cron');
const weatherService = require('./weatherService');
const SensorReading = require('../models/SensorReading');
const SensorDevice = require('../models/SensorDevice');
const fs = require('fs').promises;
const path = require('path');
const mongoose = require('mongoose');

/**
 * ML Data Collection Service
 * Collects weather data every 5 minutes for Rawalpindi and Islamabad
 * Formats data according to SmartBin ML model requirements
 */
class MLDataCollectionService {
  constructor() {
    this.isRunning = false;
    this.jobs = new Map();
    this.csvPath = path.join(__dirname, '../ml/live_weather_data.csv');
    this.environmentalDeviceId = null;
    
    // Fixed locations for Rawalpindi and Islamabad
    this.locations = [
      {
        name: 'Rawalpindi',
        latitude: 33.5651,
        longitude: 73.0169,
        admin_id: null // Will be set dynamically
      },
      {
        name: 'Islamabad',
        latitude: 33.6844,
        longitude: 73.0479,
        admin_id: null
      }
    ];
  }

  /**
   * Initialize the ML data collection service
   * Creates a special device for ML data if it doesn't exist
   */
  async initialize() {
    try {
      // Check if ML device already exists
      let mlDevice = await SensorDevice.findOne({ 
        device_id: 'ML_DATA_SOURCE' 
      });
      
      if (!mlDevice) {
        // Create a dummy admin ID and silo ID for the ML device
        const dummyAdminId = new mongoose.Types.ObjectId();
        const dummySiloId = new mongoose.Types.ObjectId();
        const dummyCreatorId = dummyAdminId;
        
        // Create a special device for ML data
        mlDevice = new SensorDevice({
          device_id: 'ML_DATA_SOURCE',
          device_name: 'OpenWeather API ML Data Source',
          model: 'OpenWeather API',
          manufacturer: 'OpenWeatherMap',
          sensor_types: ['temperature', 'humidity', 'pressure'],
          device_type: 'sensor',
          category: 'environmental',
          status: 'active',
          communication_protocol: 'http',
          admin_id: dummyAdminId,
          silo_id: dummySiloId,
          created_by: dummyCreatorId,
          data_transmission_interval: 300 // 5 minutes
        });
        
        await mlDevice.save();
        console.log('Created ML data source device');
      }
      
      this.environmentalDeviceId = mlDevice._id;
      console.log('ML data service initialized with device ID:', this.environmentalDeviceId);
    } catch (error) {
      console.error('Error initializing ML data service:', error);
      throw error;
    }
  }

  /**
   * Start the ML data collection service
   */
  async start() {
    if (this.isRunning) {
      console.log('ML data collection service is already running');
      return;
    }

    try {
      // Initialize the service
      await this.initialize();
      
      console.log('Starting ML data collection service for Rawalpindi and Islamabad...');
      
      // Initialize CSV file with headers
      this.initializeCSV();
      
      // Collect data every 5 minutes (5-minute average)
      const job = cron.schedule('*/5 * * * *', async () => {
        try {
          console.log('Collecting 5-minute average weather data...');
          await this.collectMLData();
          console.log('5-minute weather data collection completed');
        } catch (error) {
          console.error('Error in ML data collection:', error);
        }
      }, {
        scheduled: false
      });

      job.start();
      this.jobs.set('5min-ml-collection', job);
      this.isRunning = true;
      
      console.log('ML data collection service started - collecting every 5 minutes');
    } catch (error) {
      console.error('Error starting ML data collection service:', error);
      throw error;
    }
  }

  /**
   * Stop the service
   */
  stop() {
    if (!this.isRunning) {
      console.log('ML data collection service is not running');
      return;
    }

    console.log('Stopping ML data collection service...');
    
    this.jobs.forEach((job, key) => {
      job.destroy();
      console.log(`Stopped job: ${key}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    console.log('ML data collection service stopped');
  }

  /**
   * Initialize CSV file with headers matching SmartBin dataset
   */
  async initializeCSV() {
    try {
      // Check if file exists
      try {
        await fs.access(this.csvPath);
        console.log('CSV file already exists, appending to it');
      } catch {
        // File doesn't exist, create with headers
        const headers = [
          'Timestamp',
          'Location',
          'Temperature',
          'Humidity',
          'Airflow',
          'Dew_Point',
          'Ambient_Light',
          'Pest_Presence',
          'Grain_Moisture',
          'Rainfall',
          'Storage_Days',
          'Grain_Type',
          'AQI',
          'PM2_5',
          'PM10',
          'CO',
          'NO2',
          'O3',
          'Pressure',
          'Wind_Speed',
          'Cloudiness',
          'Weather_Condition'
        ].join(',') + '\n';
        
        await fs.writeFile(this.csvPath, headers);
        console.log('CSV file initialized with headers');
      }
    } catch (error) {
      console.error('Error initializing CSV file:', error);
    }
  }

  /**
   * Collect ML-formatted data for both locations
   */
  async collectMLData() {
    const timestamp = new Date().toISOString();
    
    for (const location of this.locations) {
      try {
        // Fetch weather and air quality data
        const environmentalData = await weatherService.getEnvironmentalData(
          location.latitude,
          location.longitude
        );

        // Format for ML model (matching SmartBin dataset)
        const mlRow = this.formatForML(environmentalData, location.name, timestamp);
        
        // Append to CSV
        await this.appendToCSV(mlRow);
        
        // Store in database
        await this.storeInDatabase(environmentalData, location, timestamp);
        
        console.log(`ML data collected for ${location.name}`);
      } catch (error) {
        console.error(`Error collecting data for ${location.name}:`, error);
      }
    }
  }

  /**
   * Format environmental data for ML model
   * Matches SmartBin dataset structure exactly
   */
  formatForML(environmentalData, locationName, timestamp) {
    const weather = environmentalData.weather;
    const airQuality = environmentalData.airQuality;
    
    // Calculate dew point
    const dewPoint = this.calculateDewPoint(weather.temperature, weather.humidity);
    
    return {
      Timestamp: timestamp,
      Location: locationName,
      Temperature: weather.temperature.toFixed(2),
      Humidity: weather.humidity.toFixed(2),
      Airflow: (weather.wind_speed * 0.5).toFixed(2), // Convert wind speed to airflow proxy
      Dew_Point: dewPoint.toFixed(2),
      Ambient_Light: this.estimateLightFromCloudiness(weather.cloudiness),
      Pest_Presence: 0, // Default, requires sensor input
      Grain_Moisture: weather.humidity > 80 ? 18.0 : weather.humidity > 70 ? 16.0 : weather.humidity > 60 ? 14.0 : 12.0, // Estimated from humidity
      Rainfall: weather.precipitation.toFixed(2),
      Storage_Days: 0, // Will be calculated per silo
      Grain_Type: 'Rice', // Default, will be updated per silo
      AQI: airQuality.aqi,
      PM2_5: airQuality.pm2_5.toFixed(2),
      PM10: airQuality.pm10.toFixed(2),
      CO: airQuality.co.toFixed(2),
      NO2: airQuality.no2.toFixed(2),
      O3: airQuality.o3.toFixed(2),
      Pressure: weather.pressure.toFixed(2),
      Wind_Speed: weather.wind_speed.toFixed(2),
      Cloudiness: weather.cloudiness,
      Weather_Condition: weather.weather_condition
    };
  }

  /**
   * Calculate dew point from temperature and humidity
   */
  calculateDewPoint(temperature, humidity) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
    const dewPoint = (b * alpha) / (a - alpha);
    return dewPoint;
  }

  /**
   * Estimate ambient light from cloudiness
   */
  estimateLightFromCloudiness(cloudiness) {
    // Cloudy day: 100-1000 lux, Clear day: 10000-25000 lux
    const clearSkyLight = 20000;
    const cloudyLight = 500;
    const lightLevel = clearSkyLight - (cloudiness / 100) * (clearSkyLight - cloudyLight);
    return Math.round(lightLevel);
  }

  /**
   * Append formatted row to CSV
   */
  async appendToCSV(mlRow) {
    try {
      const csvLine = [
        mlRow.Timestamp,
        mlRow.Location,
        mlRow.Temperature,
        mlRow.Humidity,
        mlRow.Airflow,
        mlRow.Dew_Point,
        mlRow.Ambient_Light,
        mlRow.Pest_Presence,
        mlRow.Grain_Moisture,
        mlRow.Rainfall,
        mlRow.Storage_Days,
        mlRow.Grain_Type,
        mlRow.AQI,
        mlRow.PM2_5,
        mlRow.PM10,
        mlRow.CO,
        mlRow.NO2,
        mlRow.O3,
        mlRow.Pressure,
        mlRow.Wind_Speed,
        mlRow.Cloudiness,
        mlRow.Weather_Condition
      ].join(',') + '\n';
      
      await fs.appendFile(this.csvPath, csvLine);
    } catch (error) {
      console.error('Error appending to CSV:', error);
    }
  }

  /**
   * Store in database for historical tracking
   */
  async storeInDatabase(environmentalData, location, timestamp) {
    try {
      // Create a sensor reading entry
      const sensorReading = new SensorReading({
        device_id: this.environmentalDeviceId || null, 
        admin_id: location.admin_id || null,
        admin_id: location.admin_id || null,
        silo_id: null, // Location-based, not silo-specific
        timestamp: new Date(timestamp),
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
          confidence_score: 0.95,
          anomaly_detected: false
        },
        raw_payload: {
          location: location.name,
          collection_source: 'ml_5min_average',
          ml_formatted: true
        }
      });

      await sensorReading.save();
    } catch (error) {
      console.error('Error storing in database:', error);
    }
  }

  /**
   * Get the last N records from CSV
   */
  async getRecentData(limit = 100) {
    try {
      const fileContent = await fs.readFile(this.csvPath, 'utf-8');
      const lines = fileContent.trim().split('\n');
      
      // Skip header
      const dataLines = lines.slice(1);
      
      // Get last N lines
      const recentLines = dataLines.slice(-limit);
      
      return {
        headers: lines[0].split(','),
        data: recentLines.map(line => line.split(','))
      };
    } catch (error) {
      console.error('Error reading CSV:', error);
      return { headers: [], data: [] };
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      locations: this.locations.map(l => ({ name: l.name, lat: l.latitude, lon: l.longitude })),
      csvPath: this.csvPath,
      activeJobs: Array.from(this.jobs.keys()),
      collectionInterval: '5 minutes'
    };
  }
}

// Create singleton instance
const mlDataCollectionService = new MLDataCollectionService();

module.exports = mlDataCollectionService;
