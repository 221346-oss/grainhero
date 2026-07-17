#!/usr/bin/env node

/**
 * Check if environmental data is being collected and stored
 * This script verifies that the environmental data service is working
 */

// Load environment variables first
require('dotenv').config();

const SensorReading = require('../models/SensorReading');
const SensorDevice = require('../models/SensorDevice');
const mongoose = require('mongoose');

async function checkEnvironmentalData() {
  console.log('🔍 Checking environmental data collection...');
  
  try {
    // Connect to MongoDB
    const connectionString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;
    
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');
    
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
    
    // Check recent environmental data
    console.log('\n📋 Checking recent environmental data...');
    const recentData = await SensorReading.find({
      'environmental_context.weather': { $exists: true }
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .select('timestamp environmental_context device_id');
    
    console.log(`✅ Found ${recentData.length} recent environmental readings`);
    if (recentData.length > 0) {
      console.log('   Recent readings:');
      recentData.forEach((reading, index) => {
        console.log(`     ${index + 1}. ${reading.timestamp.toLocaleString()} - ${reading.environmental_context.weather.temperature}°C, ${reading.environmental_context.weather.humidity}% humidity`);
      });
    } else {
      console.log('   No environmental data found in database');
    }
    
    // Check total count of environmental readings
    const totalCount = await SensorReading.countDocuments({
      'environmental_context.weather': { $exists: true }
    });
    console.log(`\n📊 Total environmental readings in database: ${totalCount}`);
    
    console.log('\n✅ Environmental data check completed successfully');
    
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error checking environmental data:', error.message);
    
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

// Run the check if this script is executed directly
if (require.main === module) {
  checkEnvironmentalData().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = checkEnvironmentalData;