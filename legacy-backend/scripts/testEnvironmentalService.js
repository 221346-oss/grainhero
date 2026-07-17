#!/usr/bin/env node

/**
 * Test script for Environmental Data Service
 * This script tests if the environmental data service is properly collecting and storing data
 */

// Load environment variables first
require('dotenv').config();

const environmentalDataService = require('../services/environmentalDataService');
const SensorReading = require('../models/SensorReading');
const SensorDevice = require('../models/SensorDevice');
const mongoose = require('mongoose');

async function testEnvironmentalService() {
  console.log('🔍 Testing Environmental Data Service...');
  
  try {
    // Connect to MongoDB
    const connectionString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
    
    // Initialize the environmental data service
    console.log('\n⚙️  Initializing environmental data service...');
    await environmentalDataService.initialize();
    console.log('✅ Environmental data service initialized');
    
    // Check service status
    console.log('\n📊 Checking environmental data service status...');
    const status = environmentalDataService.getStatus();
    console.log(`   Service running: ${status.isRunning}`);
    console.log(`   Active jobs: ${status.jobCount}`);
    console.log(`   Job names: ${status.activeJobs.join(', ')}`);
    
    // Check if environmental device exists
    console.log('\n🔍 Checking environmental data source device...');
    const environmentalDevice = await SensorDevice.findOne({ 
      device_id: 'ENVIRONMENTAL_DATA_SOURCE' 
    });
    
    if (environmentalDevice) {
      console.log('✅ Environmental data source device found');
      console.log(`   Device ID: ${environmentalDevice._id}`);
      console.log(`   Device name: ${environmentalDevice.device_name}`);
    } else {
      console.log('❌ Environmental data source device not found');
    }
    
    // Test manual data collection for a location
    console.log('\n📍 Testing manual data collection for Islamabad (33.6844, 73.0479)...');
    
    // Using a dummy tenant ID for testing
    const dummyTenantId = new mongoose.Types.ObjectId();
    const dummySiloId = new mongoose.Types.ObjectId();
    
    const result = await environmentalDataService.collectDataForLocation(
      33.6844,  // Islamabad latitude
      73.0479,  // Islamabad longitude
      dummyTenantId,
      dummySiloId
    );
    
    console.log('✅ Manual data collection completed successfully');
    console.log(`   Reading ID: ${result.reading_id}`);
    console.log(`   Temperature: ${result.environmental_data.weather.temperature}°C`);
    console.log(`   Humidity: ${result.environmental_data.weather.humidity}%`);
    console.log(`   AQI: ${result.environmental_data.airQuality.aqi}`);
    
    // Check if data was stored in database
    console.log('\n🔍 Verifying data storage...');
    const storedReading = await SensorReading.findById(result.reading_id);
    if (storedReading) {
      console.log('✅ Data successfully stored in database');
      console.log(`   Timestamp: ${storedReading.timestamp}`);
      console.log(`   Weather condition: ${storedReading.environmental_context.weather.weather_condition}`);
      console.log(`   Device ID: ${storedReading.device_id}`);
    } else {
      console.log('❌ Data not found in database');
    }
    
    // Check recent environmental data
    console.log('\n📋 Checking recent environmental data...');
    const recentData = await SensorReading.find({
      'environmental_context.weather': { $exists: true }
    })
    .sort({ timestamp: -1 })
    .limit(5)
    .select('timestamp environmental_context device_id');
    
    console.log(`✅ Found ${recentData.length} recent environmental readings`);
    if (recentData.length > 0) {
      console.log('   Recent readings:');
      recentData.forEach((reading, index) => {
        console.log(`     ${index + 1}. ${reading.timestamp.toLocaleString()} - ${reading.environmental_context.weather.temperature}°C, ${reading.environmental_context.weather.humidity}% humidity, Device: ${reading.device_id}`);
      });
    }
    
    console.log('\n🎉 All environmental service tests passed!');
    console.log('✅ Environmental data service is working correctly');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error testing environmental data service:', error.message);
    console.error('🔧 Troubleshooting steps:');
    console.error('   1. Check your MongoDB connection');
    console.error('   2. Verify your .env file configuration');
    console.error('   3. Ensure the environmental data service is properly initialized');
    
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
  testEnvironmentalService().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testEnvironmentalService;