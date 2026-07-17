#!/usr/bin/env node

/**
 * IoT Device Simulator for GrainHero System
 * 
 * This script simulates IoT devices sending data to the GrainHero backend
 * for testing purposes. It can simulate both sensor and actuator devices.
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const API_KEY = process.env.API_KEY || 'simulator-key';
const DEVICE_COUNT = process.env.DEVICE_COUNT || 5;
const SEND_INTERVAL = process.env.SEND_INTERVAL || 30000; // 30 seconds

// Device templates
const SENSOR_TEMPLATES = [
  {
    type: 'temperature',
    name: 'Temperature Sensor',
    unit: 'celsius',
    min: 15,
    max: 35,
    variation: 2
  },
  {
    type: 'humidity',
    name: 'Humidity Sensor',
    unit: 'percent',
    min: 30,
    max: 80,
    variation: 5
  },
  {
    type: 'voc',
    name: 'VOC Sensor',
    unit: 'ppb',
    min: 0,
    max: 1000,
    variation: 50
  },
  {
    type: 'moisture',
    name: 'Moisture Sensor',
    unit: 'percent',
    min: 8,
    max: 18,
    variation: 1
  },
  {
    type: 'co2',
    name: 'CO2 Sensor',
    unit: 'ppm',
    min: 400,
    max: 2000,
    variation: 100
  }
];

const ACTUATOR_TEMPLATES = [
  {
    type: 'fan',
    name: 'Ventilation Fan',
    category: 'ventilation',
    unit: 'RPM',
    min: 0,
    max: 2000
  },
  {
    type: 'humidifier',
    name: 'Humidifier',
    category: 'humidity_control',
    unit: 'percent',
    min: 0,
    max: 100
  },
  {
    type: 'alarm',
    name: 'Alert System',
    category: 'alert',
    unit: 'dB',
    min: 0,
    max: 120
  }
];

// Generate random value within range
function getRandomValue(min, max, variation = 0, currentValue = null) {
  if (currentValue === null) {
    return Math.random() * (max - min) + min;
  }
  
  // Add some variation to current value
  const newValue = currentValue + (Math.random() * variation * 2 - variation);
  return Math.max(min, Math.min(max, newValue));
}

// Generate device ID
function generateDeviceId(type, index) {
  const prefix = type === 'sensor' ? 'SENSOR' : 'ACTUATOR';
  return `${prefix}-${uuidv4().substring(0, 6).toUpperCase()}-${index.toString().padStart(3, '0')}`;
}

// Create simulated devices
function createSimulatedDevices() {
  const devices = [];
  
  // Create sensor devices
  for (let i = 0; i < DEVICE_COUNT; i++) {
    const template = SENSOR_TEMPLATES[i % SENSOR_TEMPLATES.length];
    const deviceId = generateDeviceId('sensor', i);
    
    devices.push({
      device_id: deviceId,
      device_name: `${template.name} ${i + 1}`,
      type: 'sensor',
      category: 'environmental',
      sensor_type: template.type,
      unit: template.unit,
      min: template.min,
      max: template.max,
      variation: template.variation,
      current_value: getRandomValue(template.min, template.max),
      status: 'online',
      battery_level: Math.floor(Math.random() * 40) + 60, // 60-100%
      signal_strength: Math.floor(Math.random() * 50) - 50 // -50 to 0 dBm
    });
  }
  
  // Create actuator devices
  for (let i = 0; i < 2; i++) {
    const template = ACTUATOR_TEMPLATES[i % ACTUATOR_TEMPLATES.length];
    const deviceId = generateDeviceId('actuator', i);
    
    devices.push({
      device_id: deviceId,
      device_name: `${template.name} ${i + 1}`,
      type: 'actuator',
      category: template.category,
      unit: template.unit,
      min: template.min,
      max: template.max,
      current_value: template.min,
      status: 'offline',
      battery_level: Math.floor(Math.random() * 40) + 60, // 60-100%
      signal_strength: Math.floor(Math.random() * 50) - 50 // -50 to 0 dBm
    });
  }
  
  return devices;
}

// Send sensor data to backend
async function sendSensorData(device) {
  try {
    // Update device value with some variation
    if (device.type === 'sensor') {
      device.current_value = getRandomValue(
        device.min, 
        device.max, 
        device.variation, 
        device.current_value
      );
    }
    
    const payload = {
      device_id: device.device_id,
      timestamp: new Date().toISOString(),
      [device.sensor_type]: {
        value: device.current_value,
        unit: device.unit
      },
      battery_level: device.battery_level,
      signal_strength: device.signal_strength,
      quality: {
        confidence_score: 0.95,
        is_valid: true
      }
    };
    
    const response = await axios.post(
      `${BACKEND_URL}/api/sensors/iot-data`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Sent data for ${device.device_name} (${device.device_id}): ${device.current_value.toFixed(2)} ${device.unit}`);
    return response.data;
  } catch (error) {
    console.error(`❌ Error sending data for ${device.device_id}:`, error.message);
    return null;
  }
}

// Send actuator status to backend
async function sendActuatorStatus(device) {
  try {
    const payload = {
      device_id: device.device_id,
      status: device.status,
      current_value: device.current_value,
      battery_level: device.battery_level,
      signal_strength: device.signal_strength,
      timestamp: new Date().toISOString()
    };
    
    // In a real implementation, this would be sent via MQTT
    // For simulation, we'll just log it
    console.log(`🔄 Actuator status for ${device.device_name} (${device.device_id}): ${device.status} at ${device.current_value} ${device.unit}`);
    return payload;
  } catch (error) {
    console.error(`❌ Error sending actuator status for ${device.device_id}:`, error.message);
    return null;
  }
}

// Simulate device control
async function simulateDeviceControl(device) {
  if (device.type !== 'actuator') return;
  
  // Randomly change actuator state
  if (Math.random() > 0.7) { // 30% chance to change state
    device.status = device.status === 'online' ? 'offline' : 'online';
    
    if (device.status === 'online') {
      device.current_value = getRandomValue(device.min, device.max);
    } else {
      device.current_value = 0;
    }
    
    await sendActuatorStatus(device);
  }
}

// Register devices with backend
async function registerDevices(devices) {
  console.log('🔄 Registering devices with backend...');
  
  for (const device of devices) {
    try {
      // For simulation purposes, we'll just log the registration
      // In a real scenario, you would make an API call to register the device
      console.log(`📋 Registered ${device.type}: ${device.device_name} (${device.device_id})`);
    } catch (error) {
      console.error(`❌ Error registering device ${device.device_id}:`, error.message);
    }
  }
  
  console.log('✅ Device registration complete');
}

// Main simulation loop
async function runSimulation() {
  console.log(`🚀 Starting IoT Device Simulator`);
  console.log(`📡 Backend URL: ${BACKEND_URL}`);
  console.log(`⏱️  Send interval: ${SEND_INTERVAL / 1000} seconds`);
  console.log(`📊 Device count: ${DEVICE_COUNT} sensors + 2 actuators`);
  
  // Create simulated devices
  const devices = createSimulatedDevices();
  
  // Register devices
  await registerDevices(devices);
  
  console.log('\n🔄 Starting data transmission...\n');
  
  // Send initial data
  for (const device of devices) {
    if (device.type === 'sensor') {
      await sendSensorData(device);
    } else {
      await sendActuatorStatus(device);
    }
  }
  
  // Set up interval for continuous data sending
  setInterval(async () => {
    console.log(`\n⏰ ${new Date().toISOString()} - Sending data batch...`);
    
    for (const device of devices) {
      if (device.type === 'sensor') {
        await sendSensorData(device);
      } else {
        await simulateDeviceControl(device);
        await sendActuatorStatus(device);
      }
    }
    
    console.log(`✅ Data batch sent\n`);
  }, SEND_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down IoT Device Simulator...');
  process.exit(0);
});

// Run the simulator
if (require.main === module) {
  runSimulation().catch(console.error);
}

module.exports = {
  createSimulatedDevices,
  sendSensorData,
  sendActuatorStatus,
  simulateDeviceControl
};