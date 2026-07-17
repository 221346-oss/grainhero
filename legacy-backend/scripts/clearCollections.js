const mongoose = require('mongoose');
require('dotenv').config();

// Import models to ensure they're registered
const Silo = require('../models/Silo');
const GrainBatch = require('../models/GrainBatch');
const SensorDevice = require('../models/SensorReading');
const User = require('../models/User');

async function clearCollections() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farmhome');
    console.log('✅ Connected to MongoDB');

    // Clear collections
    console.log('🗑️  Clearing collections...');
    
    await Silo.deleteMany({});
    console.log('✅ Cleared Silos collection');
    
    await GrainBatch.deleteMany({});
    console.log('✅ Cleared GrainBatches collection');
    
    await SensorDevice.deleteMany({});
    console.log('✅ Cleared SensorDevices collection');

    console.log('🎉 All collections cleared successfully!');
    console.log('You can now create new records with the updated admin_id schema.');
    
  } catch (error) {
    console.error('❌ Error clearing collections:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

clearCollections();
