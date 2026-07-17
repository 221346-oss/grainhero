const mongoose = require('mongoose');
require('dotenv').config();

const Silo = require('../models/Silo');
const SensorDevice = require('../models/SensorDevice');
const GrainBatch = require('../models/GrainBatch');

async function fixBatch() {
  const connectionString = process.env.MONGO_URI || `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}`;
  await mongoose.connect(connectionString);
  console.log('Connected to MongoDB');

  let silo = await Silo.findOne({ silo_id: 'SILO-A-001' });
  if (!silo) {
    silo = await Silo.findOne();
  }
  if (!silo) {
    console.error('Silo SILO-A-001 not found. Please run seed script first.');
    process.exit(1);
  }

  const deviceId = '004B12387760';
  let device = await SensorDevice.findOne({ device_id: deviceId });
  if (!device) {
    device = new SensorDevice({
      device_id: deviceId,
      device_name: 'GrainHero Demo Device',
      admin_id: silo.admin_id,
      silo_id: silo._id,
      status: 'active',
      sensor_types: ['temperature', 'humidity', 'tvoc', 'pressure', 'moisture'],
    });
    await device.save();
    console.log('Created device:', deviceId);
  } else {
    device.silo_id = silo._id;
    await device.save();
    console.log('Linked device:', deviceId, 'to silo:', silo.name);
  }

  // Update batch to be older so storage_days > 0
  const batch = await GrainBatch.findOne({ silo_id: silo._id });
  if (batch) {
    batch.intake_date = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago
    batch.grain_type = 'Rice';
    await batch.save();
    console.log('Updated batch:', batch.batch_id, 'intake_date to 45 days ago');
  }

  process.exit(0);
}

fixBatch().catch(console.error);
