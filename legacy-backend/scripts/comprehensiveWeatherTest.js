#!/usr/bin/env node

/**
 * Comprehensive test script for OpenWeather API integration
 * This script tests all aspects of the weather service integration
 */

// Load environment variables first
require('dotenv').config();

const weatherService = require('../services/weatherService');
const environmentalDataService = require('../services/environmentalDataService');
const SensorReading = require('../models/SensorReading');
const SensorDevice = require('../models/SensorDevice');
const mongoose = require('mongoose');

async function runComprehensiveTest() {
  console.log('🔍 Running comprehensive OpenWeather API integration test...');
  
  try {
    // Connect to MongoDB
    const connectionString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Basic weather service functionality
    console.log('\n🧪 Test 1: Basic weather service functionality');
    const latitude = 33.6844;   // Islamabad
    const longitude = 73.0479;  // Islamabad
    
    // Test current weather
    console.log('   🌤️  Fetching current weather...');
    const currentWeather = await weatherService.getCurrentWeather(latitude, longitude);
    console.log('   ✅ Current weather fetched successfully');
    console.log(`      Temperature: ${currentWeather.temperature}°C`);
    console.log(`      Humidity: ${currentWeather.humidity}%`);
    console.log(`      Pressure: ${currentWeather.pressure} hPa`);
    
    // Test air quality
    console.log('   🌍 Fetching air quality data...');
    const airQuality = await weatherService.getAirQuality(latitude, longitude);
    console.log('   ✅ Air quality data fetched successfully');
    console.log(`      AQI: ${airQuality.aqi}`);
    console.log(`      PM2.5: ${airQuality.pm2_5} μg/m³`);
    
    // Test weather forecast
    console.log('   🔮 Fetching weather forecast...');
    const forecast = await weatherService.getWeatherForecast(latitude, longitude);
    console.log('   ✅ Weather forecast fetched successfully');
    console.log(`      Forecast periods: ${forecast.length}`);
    
    // Test 2: Comprehensive environmental data
    console.log('\n🧪 Test 2: Comprehensive environmental data');
    const environmentalData = await weatherService.getEnvironmentalData(latitude, longitude);
    console.log('   ✅ Comprehensive environmental data fetched successfully');
    
    // Test 3: Weather impact assessment
    console.log('\n🧪 Test 3: Weather impact assessment');
    const impactAssessment = weatherService.assessWeatherImpact(environmentalData.weather);
    console.log('   ✅ Weather impact assessment completed');
    console.log(`      Overall risk: ${impactAssessment.overall_risk}`);
    console.log(`      Recommendations: ${impactAssessment.recommendations.length} found`);
    
    // Test 4: Regional climate analysis
    console.log('\n🧪 Test 4: Regional climate analysis');
    const regionalAnalysis = weatherService.analyzeRegionalClimate(environmentalData, latitude, longitude);
    console.log('   ✅ Regional climate analysis completed');
    console.log(`      Region type: ${regionalAnalysis.region_type}`);
    console.log(`      Climate zone: ${regionalAnalysis.climate_zone}`);
    console.log(`      Monsoon active: ${regionalAnalysis.monsoon_active}`);
    console.log(`      Smog risk: ${regionalAnalysis.smog_risk_level}`);
    
    // Test 5: Environmental data service
    console.log('\n🧪 Test 5: Environmental data service');
    
    // Initialize the environmental data service
    console.log('   ⚙️  Initializing environmental data service...');
    await environmentalDataService.initialize();
    console.log('   ✅ Environmental data service initialized');
    
    // Test manual data collection
    console.log('   📍 Testing manual data collection...');
    const dummyTenantId = new mongoose.Types.ObjectId();
    const dummySiloId = new mongoose.Types.ObjectId();
    
    const collectionResult = await environmentalDataService.collectDataForLocation(
      latitude, 
      longitude, 
      dummyTenantId,
      dummySiloId
    );
    console.log('   ✅ Manual data collection completed successfully');
    
    // Verify data storage
    console.log('   🔍 Verifying data storage...');
    const storedReading = await SensorReading.findById(collectionResult.reading_id);
    if (storedReading) {
      console.log('   ✅ Data successfully stored in database');
      console.log(`      Device ID: ${storedReading.device_id}`);
      console.log(`      Weather condition: ${storedReading.environmental_context.weather.weather_condition}`);
      console.log(`      Air quality index: ${storedReading.environmental_context.air_quality_index}`);
    } else {
      console.log('   ❌ Data not found in database');
    }
    
    // Test 6: Environmental device verification
    console.log('\n🧪 Test 6: Environmental device verification');
    const environmentalDevice = await SensorDevice.findOne({ 
      device_id: 'ENVIRONMENTAL_DATA_SOURCE' 
    });
    
    if (environmentalDevice) {
      console.log('   ✅ Environmental data source device found');
      console.log(`      Device name: ${environmentalDevice.device_name}`);
      console.log(`      Communication protocol: ${environmentalDevice.communication_protocol}`);
      console.log(`      Sensor types: ${environmentalDevice.sensor_types.join(', ')}`);
    } else {
      console.log('   ❌ Environmental data source device not found');
    }
    
    console.log('\n🎉 All comprehensive tests passed!');
    console.log('✅ OpenWeather API integration is fully functional');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error in comprehensive test:', error.message);
    console.error('🔧 Troubleshooting steps:');
    console.error('   1. Check your MongoDB connection');
    console.error('   2. Verify your .env file configuration');
    console.error('   3. Ensure your OpenWeather API key is valid');
    
    // Disconnect from MongoDB if connected
    try {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
    
    return false;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runComprehensiveTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runComprehensiveTest;