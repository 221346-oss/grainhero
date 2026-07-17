require('dotenv').config();
const mongoose = require('mongoose');

const connectionString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;

async function searchMac() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(connectionString);
    console.log('Connected.');

    const sensorCollection = mongoose.connection.collection('sensordevices');
    
    // Try formats
    const idRaw = "004B12387760";
    const idMac = "00:4B:12:38:77:60";
    const idMacLower = "00:4b:12:38:77:60";
    
    const queries = [
        { device_id: idRaw },
        { device_id: idMac },
        { device_id: idMacLower },
        { mac_address: idRaw },
        { mac_address: idMac },
        { mac_address: idMacLower }
    ];

    let found = null;
    for (const q of queries) {
        console.log("Trying query:", q);
        found = await sensorCollection.findOne(q);
        if (found) {
            console.log("Found device:", found._id);
            break;
        }
    }

    if (found) {
        const result = await sensorCollection.updateOne(
            { _id: found._id },
            {
                $set: {
                    device_type: 'actuator',
                    type: 'actuator',
                    capabilities: { fan: true, servo: true, pwm: true }
                }
            }
        );
        console.log('Update result:', result);
    } else {
        console.log("Device NOT found with any MAC format.");
        
        // Final attempt: Check if there's a device with *similar* ID (maybe just the last part?)
        // Or just list ALL device IDs again to be absolutely sure.
        const allDevices = await sensorCollection.find({}, {projection: {device_id: 1, mac_address: 1}}).toArray();
        console.log("All existing Device IDs:", allDevices);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

searchMac();
