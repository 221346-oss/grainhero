#!/usr/bin/env node

/**
 * Test script for OpenWeather API integration
 * This script tests if the OpenWeather API is properly configured and working
 */

// Load environment variables first
require('dotenv').config();

const weatherService = require('../services/weatherService');

async function testWeatherAPI() {
  console.log('🔍 Testing OpenWeather API Integration...');
  
  // Check if API key is configured
  if (!process.env.OPENWEATHER_API_KEY) {
    console.error('\n❌ OPENWEATHER_API_KEY not found in environment variables');
    console.error('🔑 Please check your .env file and ensure OPENWEATHER_API_KEY is set');
    console.error('   Get your free API key from: https://home.openweathermap.org/api_keys');
    process.exit(1);
  }
  
  // Test with Islamabad coordinates (from project requirements)
  const latitude = 33.6844;   // Islamabad
  const longitude = 73.0479;  // Islamabad
  
  try {
    console.log(`\n📍 Testing location: Islamabad, Pakistan (${latitude}, ${longitude})`);
    
    // Test current weather
    console.log('\n🌤️  Fetching current weather...');
    const currentWeather = await weatherService.getCurrentWeather(latitude, longitude);
    console.log('✅ Current weather fetched successfully');
    console.log(`   Temperature: ${currentWeather.temperature}°C`);
    console.log(`   Humidity: ${currentWeather.humidity}%`);
    console.log(`   Pressure: ${currentWeather.pressure} hPa`);
    
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
    
    // Test comprehensive environmental data
    console.log('\n📊 Fetching comprehensive environmental data...');
    const environmentalData = await weatherService.getEnvironmentalData(latitude, longitude);
    console.log('✅ Comprehensive environmental data fetched successfully');
    
    console.log('\n🎉 All OpenWeather API tests passed!');
    console.log('✅ OpenWeather API integration is working correctly');
    
    return true;
  } catch (error) {
    console.error('\n❌ Error testing OpenWeather API:', error.message);
    console.error('🔧 Troubleshooting steps:');
    console.error('   1. Check your internet connection');
    console.error('   2. Verify your OPENWEATHER_API_KEY in .env file');
    console.error('   3. Ensure your API key is active at https://home.openweathermap.org/api_keys');
    console.error('   4. Check if you have exceeded your API call limit');
    
    return false;
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testWeatherAPI().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testWeatherAPI;