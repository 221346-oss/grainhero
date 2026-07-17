const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');
const SensorReading = require('../models/SensorReading');
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const Silo = require('../models/Silo');
const { createCacheMiddleware } = require('../middleware/cache');

// Get current environmental data for a location
router.get('/current/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const environmentalData = await weatherService.getEnvironmentalData(latitude, longitude);
    
    res.json({
      success: true,
      data: environmentalData
    });
  } catch (error) {
    console.error('Error fetching environmental data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch environmental data',
      message: error.message 
    });
  }
});

// Get environmental data with impact assessment
router.get('/impact/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const environmentalData = await weatherService.getEnvironmentalData(latitude, longitude);
    const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);
    const aqiLevel = weatherService.getAQILevel(environmentalData.airQuality.aqi);

    res.json({
      success: true,
      data: {
        ...environmentalData,
        impact_assessment: impactAssessment,
        aqi_level: aqiLevel
      }
    });
  } catch (error) {
    console.error('Error fetching environmental impact data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch environmental impact data',
      message: error.message 
    });
  }
});

// Store environmental data in database
router.post('/store', [
  body('admin_id').isMongoId().withMessage('Valid admin ID required'),
  body('silo_id').isMongoId().withMessage('Valid silo ID required'),
  body('device_id').isMongoId().withMessage('Valid device ID required'),
  body('lat').isFloat().withMessage('Valid latitude required'),
  body('lon').isFloat().withMessage('Valid longitude required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { admin_id, silo_id, device_id, lat, lon } = req.body;

    // Fetch environmental data
    const environmentalData = await weatherService.getEnvironmentalData(lat, lon);
    const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);
    const aqiLevel = weatherService.getAQILevel(environmentalData.airQuality.aqi);

    // Create sensor reading with environmental context
    const sensorReading = new SensorReading({
      admin_id,
      silo_id,
      device_id,
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
      }
    });

    await sensorReading.save();

    res.json({
      success: true,
      message: 'Environmental data stored successfully',
      data: {
        reading_id: sensorReading._id,
        environmental_data: environmentalData,
        impact_assessment: impactAssessment,
        aqi_level: aqiLevel
      }
    });
  } catch (error) {
    console.error('Error storing environmental data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to store environmental data',
      message: error.message 
    });
  }
});

function calculateDewPoint(tempC, humidity) {
  if (tempC === undefined || humidity === undefined || humidity <= 0) return null;
  const a = 17.27;
  const b = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
  return Number(((b * alpha) / (a - alpha)).toFixed(2));
}

function calculateHeatIndex(tempC, humidity) {
  if (tempC === undefined || humidity === undefined) return null;
  const tempF = (tempC * 9) / 5 + 32;
  const hi =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * humidity -
    0.22475541 * tempF * humidity -
    6.83783e-3 * tempF * tempF -
    5.481717e-2 * humidity * humidity +
    1.22874e-3 * tempF * tempF * humidity +
    8.5282e-4 * tempF * humidity * humidity -
    1.99e-6 * tempF * tempF * humidity * humidity;
  const hiC = ((hi - 32) * 5) / 9;
  return Number(hiC.toFixed(2));
}

async function buildFallbackHistory(lat, lon, limit) {
  const environmentalData = await weatherService.getEnvironmentalData(lat, lon);
  const baseReading = {
    _id: `fallback-${Date.now()}`,
    timestamp: environmentalData.weather.timestamp,
    environmental_context: {
      weather: environmentalData.weather,
      air_quality_index: environmentalData.airQuality.aqi,
      pmd_data: {
        pm25: environmentalData.airQuality.pm2_5,
        pm10: environmentalData.airQuality.pm10,
        ozone: environmentalData.airQuality.o3
      }
    },
    derived_metrics: {
      dew_point: calculateDewPoint(
        environmentalData.weather.temperature,
        environmentalData.weather.humidity
      ),
      heat_index: calculateHeatIndex(
        environmentalData.weather.temperature,
        environmentalData.weather.humidity
      )
    },
    source: 'openweather_current'
  };

  const forecastReadings = (environmentalData.forecast || [])
    .slice(0, parseInt(limit) || 8)
    .map((entry, index) => ({
      _id: `fallback-forecast-${index}`,
      timestamp: entry.timestamp,
      environmental_context: {
        weather: {
          temperature: entry.temperature,
          humidity: entry.humidity,
          pressure: entry.pressure,
          wind_speed: entry.wind_speed,
          precipitation: entry.precipitation
        }
      },
      derived_metrics: {
        dew_point: calculateDewPoint(entry.temperature, entry.humidity)
      },
      source: 'openweather_forecast'
    }));

  return [baseReading, ...forecastReadings];
}

// Get environmental data history (cached for 15 seconds, but limit is configurable)
router.get('/history/:admin_id', createCacheMiddleware(15 * 1000, null, { allowBypass: true }), async (req, res) => {
  try {
    const { admin_id } = req.params;
    const requestedLimit = parseInt(req.query.limit);
    const limit = requestedLimit && requestedLimit > 0 && requestedLimit <= 500
      ? requestedLimit
      : 50;
    const { start_date, end_date, lat, lon } = req.query;

    // Guard: if admin_id is not a valid ObjectId (e.g. "default"), skip DB and return weather fallback
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(admin_id)) {
      const fallbackLat = lat ? parseFloat(lat) : 31.5204;
      const fallbackLon = lon ? parseFloat(lon) : 74.3587;
      try {
        const fallbackHistory = await buildFallbackHistory(fallbackLat, fallbackLon, limit);
        return res.json({ success: true, data: fallbackHistory, fallback: true });
      } catch (fbErr) {
        return res.json({ success: true, data: [], fallback: true });
      }
    }

    let query = {
      admin_id,
      'environmental_context.weather': { $exists: true }
    };

    if (start_date && end_date) {
      query.timestamp = {
        $gte: new Date(start_date),
        $lte: new Date(end_date)
      };
    }

    const readings = await SensorReading.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('silo_id', 'silo_id name location')
      .populate('device_id', 'device_id name type')
      .select('timestamp environmental_context derived_metrics silo_id device_id');

    if (readings.length === 0) {
      const fallbackLat = lat ? parseFloat(lat) : 31.5204;
      const fallbackLon = lon ? parseFloat(lon) : 74.3587;
      const fallbackHistory = await buildFallbackHistory(fallbackLat, fallbackLon, limit);

      return res.json({
        success: true,
        data: fallbackHistory,
        fallback: true
      });
    }

    res.json({
      success: true,
      data: readings,
      fallback: false
    });
  } catch (error) {
    console.error('Error fetching environmental history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch environmental history',
      message: error.message
    });
  }
});

// Get environmental data statistics (cached for 30 seconds)
router.get('/stats/:admin_id', createCacheMiddleware(30 * 1000), async (req, res) => {
  try {
    const { admin_id } = req.params;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await SensorReading.aggregate([
      {
        $match: {
          admin_id: new require('mongoose').Types.ObjectId(admin_id),
          timestamp: { $gte: startDate },
          'environmental_context.weather': { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avg_temperature: { $avg: '$environmental_context.weather.temperature' },
          avg_humidity: { $avg: '$environmental_context.weather.humidity' },
          avg_pressure: { $avg: '$environmental_context.weather.pressure' },
          avg_wind_speed: { $avg: '$environmental_context.weather.wind_speed' },
          total_precipitation: { $sum: '$environmental_context.weather.precipitation' },
          avg_aqi: { $avg: '$environmental_context.air_quality_index' },
          max_temperature: { $max: '$environmental_context.weather.temperature' },
          min_temperature: { $min: '$environmental_context.weather.temperature' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {}
    });
  } catch (error) {
    console.error('Error fetching environmental statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch environmental statistics',
      message: error.message 
    });
  }
});

// Get weather forecast for a location
router.get('/forecast/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const forecast = await weatherService.getWeatherForecast(latitude, longitude);
    
    res.json({
      success: true,
      data: forecast
    });
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch weather forecast',
      message: error.message 
    });
  }
});

// Get air quality data for a location
router.get('/air-quality/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const airQuality = await weatherService.getAirQuality(latitude, longitude);
    const aqiLevel = weatherService.getAQILevel(airQuality.aqi);
    
    res.json({
      success: true,
      data: {
        ...airQuality,
        level_info: aqiLevel
      }
    });
  } catch (error) {
    console.error('Error fetching air quality:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch air quality data',
      message: error.message 
    });
  }
});

// Manual data collection trigger
router.post('/collect/:lat/:lon', [
  body('admin_id').isMongoId().withMessage('Valid admin ID required'),
  body('silo_id').optional().isMongoId().withMessage('Valid silo ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { lat, lon } = req.params;
    const { admin_id, silo_id } = req.body;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    const environmentalDataService = require('../services/environmentalDataService');
    const result = await environmentalDataService.collectDataForLocation(
      latitude, 
      longitude, 
      admin_id, 
      silo_id
    );

    res.json({
      success: true,
      message: 'Environmental data collected successfully',
      data: result
    });
  } catch (error) {
    console.error('Error in manual data collection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to collect environmental data',
      message: error.message 
    });
  }
});

// Get service status
router.get('/service/status', (req, res) => {
  try {
    const environmentalDataService = require('../services/environmentalDataService');
    const status = environmentalDataService.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting service status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get service status',
      message: error.message 
    });
  }
});

// Get environmental data for all user's locations (role-based)
router.get('/my-locations', auth, createCacheMiddleware(60 * 1000), async (req, res) => {
  try {
    const user = req.user;
    let silos = [];

    // Super Admin: See ALL silos
    if (user.role === 'super_admin') {
      silos = await Silo.find({
        'location.coordinates.latitude': { $exists: true },
        'location.coordinates.longitude': { $exists: true }
      })
      .populate('admin_id', 'name email')
      .select('silo_id name location admin_id');
    }
    // Admin: See all their silos across all locations
    else if (user.role === 'admin') {
      silos = await Silo.find({
        admin_id: user._id,
        'location.coordinates.latitude': { $exists: true },
        'location.coordinates.longitude': { $exists: true }
      })
      .select('silo_id name location');
    }
    // Manager/Technician: See silos under their admin
    else if (['manager', 'technician'].includes(user.role)) {
      const adminId = user.admin_id || user._id;
      silos = await Silo.find({
        admin_id: adminId,
        'location.coordinates.latitude': { $exists: true },
        'location.coordinates.longitude': { $exists: true }
      })
      .select('silo_id name location');
    }

    if (!silos || silos.length === 0) {
      try {
        const defaultLat = 31.5204;
        const defaultLon = 74.3587;

        const environmentalData = await weatherService.getEnvironmentalData(defaultLat, defaultLon);
        const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);
        const regionalAnalysis = weatherService.analyzeRegionalClimate(environmentalData, defaultLat, defaultLon);

        return res.json({
          success: true,
          data: {
            total_locations: 1,
            total_silos: 0,
            locations: [{
              city: 'Default Location',
              latitude: defaultLat,
              longitude: defaultLon,
              address: 'Demo location for environmental data',
              silos: [],
              silo_count: 0,
              weather: environmentalData.weather,
              air_quality: environmentalData.airQuality,
              aqi_level: weatherService.getAQILevel(environmentalData.airQuality.aqi),
              impact_assessment: impactAssessment,
              regional_analysis: regionalAnalysis
            }]
          }
        });
      } catch (error) {
        console.error('Error fetching default environmental location:', error);
      }
    }

    const locationGroups = {};
    for (const silo of silos) {
      if (!silo.location?.coordinates?.latitude || !silo.location?.coordinates?.longitude) continue;

      const lat = silo.location.coordinates.latitude;
      const lon = silo.location.coordinates.longitude;
      const city = silo.location.city || 'Unknown City';
      const key = `${city}_${lat.toFixed(2)}_${lon.toFixed(2)}`;

      if (!locationGroups[key]) {
        locationGroups[key] = {
          city: city,
          latitude: lat,
          longitude: lon,
          address: silo.location.address,
          silos: [],
          silo_count: 0
        };
      }

      locationGroups[key].silos.push({
        silo_id: silo.silo_id,
        name: silo.name,
        admin: silo.admin_id
      });
      locationGroups[key].silo_count++;
    }

    const locationsWithWeather = [];
    for (const [key, location] of Object.entries(locationGroups)) {
      try {
        const environmentalData = await weatherService.getEnvironmentalData(location.latitude, location.longitude);
        const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);
        const regionalAnalysis = weatherService.analyzeRegionalClimate(environmentalData, location.latitude, location.longitude);

        locationsWithWeather.push({
          ...location,
          weather: environmentalData.weather,
          air_quality: environmentalData.airQuality,
          aqi_level: weatherService.getAQILevel(environmentalData.airQuality.aqi),
          impact_assessment: impactAssessment,
          regional_analysis: regionalAnalysis
        });
      } catch (error) {
        console.error(`Failed to fetch weather for ${location.city}:`, error);
        locationsWithWeather.push({ ...location, error: 'Failed to fetch weather data' });
      }
    }

    res.json({
      success: true,
      data: {
        total_locations: locationsWithWeather.length,
        total_silos: silos.length,
        locations: locationsWithWeather
      }
    });
  } catch (error) {
    console.error('Error fetching my locations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch environmental data for your locations',
      message: error.message 
    });
  }
});

// Get regional thresholds for a location
router.get('/thresholds/:lat/:lon', async (req, res) => {
  try {
    const { lat, lon } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid latitude or longitude' 
      });
    }

    const thresholds = weatherService.getRegionalThresholds(latitude, longitude);
    
    res.json({
      success: true,
      data: thresholds
    });
  } catch (error) {
    console.error('Error fetching regional thresholds:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch regional thresholds',
      message: error.message 
    });
  }
});

module.exports = router;
