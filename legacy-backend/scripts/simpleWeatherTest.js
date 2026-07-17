#!/usr/bin/env node

/**
 * Simple test script for OpenWeather API integration
 * This script tests the core functionality
 */

// Load environment variables first
require('dotenv').config();

const weatherService = require('../services/weatherService');

async function runSimpleTest() {
  console.log('🔍 Running simple OpenWeather API integration test...');
  
  try {
    // Test with Islamabad coordinates
    const latitude = 33.6844;   // Islamabad
    const longitude = 73.0479;  // Islamabad
    
    console.log(`\n📍 Testing location: Islamabad, Pakistan (${latitude}, ${longitude})`);
    
    // Test current weather
    console.log('\n🌤️  Fetching current weather...');
    const currentWeather = await weatherService.getCurrentWeather(latitude, longitude);
    console.log('✅ Current weather fetched successfully');
    console.log(`   Temperature: ${currentWeather.temperature}°C`);
    console.log(`   Humidity: ${currentWeather.humidity}%`);
    console.log(`   Pressure: ${currentWeather.pressure} hPa`);
    console.log(`   Weather: ${currentWeather.weather_condition}`);
    
    // Test air quality
    console.log('\n🌍 Fetching air quality data...');
    const airQuality = await weatherService.getAirQuality(latitude, longitude);
    console.log('✅ Air quality data fetched successfully');
    console.log(`   AQI: ${airQuality.aqi}`);
    console.log(`   PM2.5: ${airQuality.pm2_5} μg/m³`);
    console.log(`   PM10: ${airQuality.pm10} μg/m³`);
    
    // Test weather forecast
    console.log('\n🔮 Fetching weather forecast...');
    const forecast = await weatherService.getWeatherForecast(latitude, longitude);
    console.log('✅ Weather forecast fetched successfully');
    console.log(`   Forecast periods: ${forecast.length}`);
    if (forecast.length > 0) {
      console.log(`   Next forecast: ${forecast[0].temperature}°C, ${forecast[0].weather_condition}`);
    }
    
    console.log('\n🎉 Simple test passed!');
    console.log('✅ OpenWeather API integration is working correctly');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error in simple test:', error.message);
    console.error('🔧 Troubleshooting steps:');
    console.error('   1. Check your internet connection');
    console.error('   2. Verify your OPENWEATHER_API_KEY in .env file');
    console.error('   3. Ensure your API key is active at https://home.openweathermap.org/api_keys');
    
    return false;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  runSimpleTest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = runSimpleTest;