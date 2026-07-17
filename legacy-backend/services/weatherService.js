const axios = require('axios');
const cron = require('node-cron');

class WeatherService {
  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY;
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.airQualityUrl = 'https://api.openweathermap.org/data/2.5/air_pollution';
    this.forecastUrl = 'https://api.openweathermap.org/data/2.5/forecast';
    
    if (!this.apiKey) {
      console.warn('OPENWEATHER_API_KEY not found in environment variables');
    }
  }

  /**
   * Get current weather data for a specific location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Weather data
   */
  async getCurrentWeather(lat, lon) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeather API key not configured');
      }

      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return this.formatWeatherData(response.data);
    } catch (error) {
      console.error('Error fetching current weather:', error.message);
      throw error;
    }
  }

  /**
   * Get air quality data for a specific location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Air quality data
   */
  async getAirQuality(lat, lon) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeather API key not configured');
      }

      const response = await axios.get(this.airQualityUrl, {
        params: {
          lat,
          lon,
          appid: this.apiKey
        }
      });

      return this.formatAirQualityData(response.data);
    } catch (error) {
      console.error('Error fetching air quality:', error.message);
      throw error;
    }
  }

  /**
   * Get weather forecast for a specific location
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Forecast data
   */
  async getWeatherForecast(lat, lon) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenWeather API key not configured');
      }

      const response = await axios.get(this.forecastUrl, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        }
      });

      return this.formatForecastData(response.data);
    } catch (error) {
      console.error('Error fetching weather forecast:', error.message);
      throw error;
    }
  }

  /**
   * Get comprehensive environmental data (weather + air quality)
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Combined environmental data
   */
  async getEnvironmentalData(lat, lon) {
    try {
      const [weather, airQuality, forecast] = await Promise.all([
        this.getCurrentWeather(lat, lon),
        this.getAirQuality(lat, lon),
        this.getWeatherForecast(lat, lon)
      ]);

      return {
        weather,
        airQuality,
        forecast,
        timestamp: new Date(),
        location: { lat, lon }
      };
    } catch (error) {
      console.error('Error fetching environmental data:', error.message);
      throw error;
    }
  }

  /**
   * Format weather data for database storage
   * @param {Object} data - Raw weather data from API
   * @returns {Object} Formatted weather data
   */
  formatWeatherData(data) {
    return {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      wind_speed: data.wind?.speed || 0,
      wind_direction: data.wind?.deg || 0,
      precipitation: data.rain?.['1h'] || data.snow?.['1h'] || 0,
      visibility: data.visibility / 1000, // Convert to km
      uv_index: data.uvi || 0,
      cloudiness: data.clouds?.all || 0,
      weather_condition: data.weather[0]?.main || 'Unknown',
      weather_description: data.weather[0]?.description || 'Unknown',
      sunrise: new Date(data.sys.sunrise * 1000),
      sunset: new Date(data.sys.sunset * 1000),
      timestamp: new Date(data.dt * 1000)
    };
  }

  /**
   * Format air quality data for database storage
   * @param {Object} data - Raw air quality data from API
   * @returns {Object} Formatted air quality data
   */
  formatAirQualityData(data) {
    const aqi = data.list[0];
    const components = aqi.components;

    return {
      aqi: aqi.main.aqi,
      co: components.co,
      no: components.no,
      no2: components.no2,
      o3: components.o3,
      so2: components.so2,
      pm2_5: components.pm2_5,
      pm10: components.pm10,
      nh3: components.nh3,
      timestamp: new Date(aqi.dt * 1000)
    };
  }

  /**
   * Format forecast data for database storage
   * @param {Object} data - Raw forecast data from API
   * @returns {Object} Formatted forecast data
   */
  formatForecastData(data) {
    return data.list.map(item => ({
      timestamp: new Date(item.dt * 1000),
      temperature: item.main.temp,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      wind_speed: item.wind?.speed || 0,
      precipitation: item.rain?.['3h'] || item.snow?.['3h'] || 0,
      weather_condition: item.weather[0]?.main || 'Unknown',
      weather_description: item.weather[0]?.description || 'Unknown'
    }));
  }

  /**
   * Get AQI level description
   * @param {number} aqi - Air Quality Index value
   * @returns {Object} AQI level information
   */
  getAQILevel(aqi) {
    const levels = {
      1: { level: 'Good', color: '#00E400', description: 'Air quality is satisfactory' },
      2: { level: 'Fair', color: '#FFFF00', description: 'Air quality is acceptable' },
      3: { level: 'Moderate', color: '#FF7E00', description: 'Sensitive people may experience minor breathing discomfort' },
      4: { level: 'Poor', color: '#FF0000', description: 'Sensitive people may experience breathing discomfort' },
      5: { level: 'Very Poor', color: '#8F3F97', description: 'Everyone may experience breathing discomfort' }
    };

    return levels[aqi] || { level: 'Unknown', color: '#666666', description: 'Unknown air quality level' };
  }

  /**
   * Get weather condition impact on grain storage
   * @param {Object} weather - Weather data
   * @returns {Object} Impact assessment
   */
  assessWeatherImpact(weather) {
    const impacts = {
      temperature_risk: 'low',
      humidity_risk: 'low',
      precipitation_risk: 'low',
      overall_risk: 'low',
      recommendations: []
    };

    // Temperature assessment
    if (weather.temperature > 30) {
      impacts.temperature_risk = 'high';
      impacts.recommendations.push('High temperature detected - consider ventilation');
    } else if (weather.temperature > 25) {
      impacts.temperature_risk = 'medium';
      impacts.recommendations.push('Moderate temperature - monitor storage conditions');
    }

    // Humidity assessment
    if (weather.humidity > 80) {
      impacts.humidity_risk = 'high';
      impacts.recommendations.push('High humidity detected - risk of mold growth');
    } else if (weather.humidity > 70) {
      impacts.humidity_risk = 'medium';
      impacts.recommendations.push('Moderate humidity - monitor grain moisture');
    }

    // Precipitation assessment
    if (weather.precipitation > 5) {
      impacts.precipitation_risk = 'high';
      impacts.recommendations.push('Heavy precipitation - check for water ingress');
    } else if (weather.precipitation > 1) {
      impacts.precipitation_risk = 'medium';
      impacts.recommendations.push('Light precipitation - monitor storage integrity');
    }

    // Overall risk assessment
    const risks = [impacts.temperature_risk, impacts.humidity_risk, impacts.precipitation_risk];
    if (risks.includes('high')) {
      impacts.overall_risk = 'high';
    } else if (risks.includes('medium')) {
      impacts.overall_risk = 'medium';
    }

    return impacts;
  }

  /**
   * Analyze regional climate patterns (monsoon, smog, coastal humidity)
   * @param {Object} environmentalData - Complete environmental data
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {Object} Regional climate analysis
   */
  analyzeRegionalClimate(environmentalData, lat, lon) {
    const weather = environmentalData.weather;
    const airQuality = environmentalData.airQuality;
    const month = new Date().getMonth() + 1; // 1-12
    
    // Determine region type based on location
    const regionType = this.determineRegionType(lat, lon);
    
    // Monsoon season analysis (June-September in South Asia)
    const monsoonActive = month >= 6 && month <= 9;
    const monsoonIntensity = monsoonActive ? this.calculateMonsoonIntensity(weather) : 0;
    
    // Smog risk (October-January in Pakistan/North India)
    const smogSeason = (month >= 10 && month <= 12) || month === 1;
    const smogRisk = this.calculateSmogRisk(airQuality, weather, smogSeason);
    
    // Coastal humidity factor
    const coastalHumidityFactor = regionType.is_coastal ? 
      this.calculateCoastalHumidity(weather.humidity, weather.wind_speed) : 1.0;
    
    // Seasonal risk scoring
    const seasonalRisk = this.calculateSeasonalRisk(month, regionType, weather);
    
    // Climate zone classification
    const climateZone = this.classifyClimateZone(lat, regionType);
    
    // Trend analysis from forecast
    const trends = this.analyzeTrends(environmentalData.forecast);
    
    return {
      region_type: regionType.name,
      is_coastal: regionType.is_coastal,
      climate_zone: climateZone,
      
      // Monsoon analysis
      monsoon_active: monsoonActive,
      monsoon_intensity: monsoonIntensity,
      monsoon_risk_level: this.getMonsoonRiskLevel(monsoonIntensity),
      
      // Smog analysis
      smog_season: smogSeason,
      smog_risk: smogRisk,
      smog_risk_level: this.getSmogRiskLevel(smogRisk),
      
      // Regional factors
      coastal_humidity_factor: coastalHumidityFactor,
      seasonal_risk: seasonalRisk,
      seasonal_risk_level: this.getRiskLevel(seasonalRisk),
      
      // Forecast trends
      temp_trend: trends.temperature,
      humidity_trend: trends.humidity,
      rain_probability: trends.rain_probability,
      
      // Recommendations
      regional_recommendations: this.getRegionalRecommendations(
        regionType, monsoonActive, smogRisk, seasonalRisk
      )
    };
  }

  /**
   * Determine region type based on coordinates
   */
  determineRegionType(lat, lon) {
    // Pakistan regions
    if (lat >= 24 && lat <= 37 && lon >= 61 && lon <= 77) {
      // Karachi coastal area
      if (lat >= 24 && lat <= 25.5 && lon >= 66.5 && lon <= 67.5) {
        return { name: 'Coastal (Karachi)', is_coastal: true, region: 'southern' };
      }
      // Punjab (Lahore, Faisalabad area)
      if (lat >= 30 && lat <= 32.5 && lon >= 72 && lon <= 74.5) {
        return { name: 'Punjab Plains', is_coastal: false, region: 'central' };
      }
      // KPK mountainous
      if (lat >= 33 && lat <= 36) {
        return { name: 'Northern Mountains', is_coastal: false, region: 'northern' };
      }
      // Sindh interior
      if (lat >= 25 && lat <= 28 && lon >= 68 && lon <= 71) {
        return { name: 'Sindh Interior', is_coastal: false, region: 'southern' };
      }
    }
    
    // Default
    return { name: 'General Region', is_coastal: false, region: 'general' };
  }

  /**
   * Calculate monsoon intensity
   */
  calculateMonsoonIntensity(weather) {
    let intensity = 0;
    
    // High humidity during monsoon
    if (weather.humidity > 85) intensity += 40;
    else if (weather.humidity > 75) intensity += 25;
    else if (weather.humidity > 65) intensity += 10;
    
    // High precipitation
    if (weather.precipitation > 20) intensity += 40;
    else if (weather.precipitation > 10) intensity += 25;
    else if (weather.precipitation > 5) intensity += 15;
    
    // Cloud cover
    if (weather.cloudiness > 80) intensity += 20;
    else if (weather.cloudiness > 60) intensity += 10;
    
    return Math.min(100, intensity);
  }

  /**
   * Calculate smog risk
   */
  calculateSmogRisk(airQuality, weather, isSmogSeason) {
    if (!isSmogSeason) return 0;
    
    let risk = 0;
    
    // AQI component
    if (airQuality.aqi >= 4) risk += 40;
    else if (airQuality.aqi >= 3) risk += 25;
    else if (airQuality.aqi >= 2) risk += 10;
    
    // PM2.5 and PM10
    if (airQuality.pm2_5 > 55) risk += 30;
    else if (airQuality.pm2_5 > 35) risk += 15;
    
    if (airQuality.pm10 > 150) risk += 20;
    else if (airQuality.pm10 > 100) risk += 10;
    
    // Low wind speed traps pollutants
    if (weather.wind_speed < 2) risk += 10;
    else if (weather.wind_speed < 4) risk += 5;
    
    return Math.min(100, risk);
  }

  /**
   * Calculate coastal humidity factor
   */
  calculateCoastalHumidity(humidity, windSpeed) {
    const baseHumidityFactor = humidity / 100;
    const windFactor = windSpeed > 5 ? 1.2 : 1.0; // High wind brings more moisture
    return baseHumidityFactor * windFactor;
  }

  /**
   * Calculate seasonal risk
   */
  calculateSeasonalRisk(month, regionType, weather) {
    let risk = 30; // Base risk
    
    // Monsoon months (high risk)
    if (month >= 6 && month <= 9) risk += 25;
    
    // Smog months (medium risk)
    if ((month >= 10 && month <= 12) || month === 1) risk += 15;
    
    // Summer heat (high risk)
    if (month >= 4 && month <= 6 && weather.temperature > 35) risk += 20;
    
    // Coastal regions have higher base risk
    if (regionType.is_coastal) risk += 10;
    
    return Math.min(100, risk);
  }

  /**
   * Classify climate zone
   */
  classifyClimateZone(lat, regionType) {
    if (regionType.is_coastal) return 'Tropical Coastal';
    if (lat > 33) return 'Temperate Mountain';
    if (lat > 28) return 'Subtropical Continental';
    return 'Arid/Semi-Arid';
  }

  /**
   * Analyze trends from forecast data
   */
  analyzeTrends(forecast) {
    if (!forecast || forecast.length < 3) {
      return { temperature: 'stable', humidity: 'stable', rain_probability: 0 };
    }
    
    const temps = forecast.slice(0, 8).map(f => f.temperature);
    const humidities = forecast.slice(0, 8).map(f => f.humidity);
    const rains = forecast.slice(0, 8).map(f => f.precipitation);
    
    // Temperature trend
    const tempTrend = temps[temps.length - 1] - temps[0];
    const tempTrendDir = tempTrend > 2 ? 'increasing' : tempTrend < -2 ? 'decreasing' : 'stable';
    
    // Humidity trend
    const humTrend = humidities[humidities.length - 1] - humidities[0];
    const humTrendDir = humTrend > 5 ? 'increasing' : humTrend < -5 ? 'decreasing' : 'stable';
    
    // Rain probability (% of forecast periods with rain)
    const rainPeriods = rains.filter(r => r > 0.5).length;
    const rainProb = (rainPeriods / rains.length) * 100;
    
    return {
      temperature: tempTrendDir,
      humidity: humTrendDir,
      rain_probability: Math.round(rainProb)
    };
  }

  /**
   * Get regional recommendations
   */
  getRegionalRecommendations(regionType, monsoonActive, smogRisk, seasonalRisk) {
    const recommendations = [];
    
    if (regionType.is_coastal) {
      recommendations.push('Coastal region: Maintain enhanced dehumidification systems');
      recommendations.push('Monitor for salt corrosion in storage equipment');
    }
    
    if (monsoonActive) {
      recommendations.push('Monsoon season: Increase ventilation frequency');
      recommendations.push('Ensure drainage systems are clear');
      recommendations.push('Check for roof leaks and structural integrity');
    }
    
    if (smogRisk > 50) {
      recommendations.push('High smog risk: Use air filtration systems');
      recommendations.push('Limit outdoor air intake during peak smog hours');
    }
    
    if (seasonalRisk > 70) {
      recommendations.push('High seasonal risk: Conduct daily inspections');
      recommendations.push('Prepare emergency response protocols');
    }
    
    return recommendations;
  }

  /**
   * Get threshold adjustments based on region
   */
  getRegionalThresholds(lat, lon) {
    const regionType = this.determineRegionType(lat, lon);
    const baseThresholds = {
      temperature: { min: 10, max: 35, critical_min: 5, critical_max: 40 },
      humidity: { min: 40, max: 70, critical_min: 30, critical_max: 80 },
      moisture: { max: 14, critical_max: 18 }
    };
    
    // Adjust for coastal regions (higher humidity tolerance)
    if (regionType.is_coastal) {
      baseThresholds.humidity.max = 75;
      baseThresholds.humidity.critical_max = 85;
      baseThresholds.moisture.max = 15;
      baseThresholds.moisture.critical_max = 19;
    }
    
    // Adjust for mountain regions (lower temperature thresholds)
    if (regionType.name.includes('Mountain')) {
      baseThresholds.temperature.max = 30;
      baseThresholds.temperature.critical_max = 35;
    }
    
    return {
      region: regionType.name,
      thresholds: baseThresholds,
      adjustments: {
        coastal_factor: regionType.is_coastal ? 1.1 : 1.0,
        altitude_factor: regionType.name.includes('Mountain') ? 0.9 : 1.0
      }
    };
  }

  // Helper methods for risk levels
  getMonsoonRiskLevel(intensity) {
    if (intensity > 70) return 'high';
    if (intensity > 40) return 'medium';
    return 'low';
  }

  getSmogRiskLevel(risk) {
    if (risk > 60) return 'high';
    if (risk > 30) return 'medium';
    return 'low';
  }

  getRiskLevel(risk) {
    if (risk > 70) return 'high';
    if (risk > 40) return 'medium';
    return 'low';
  }
}

// Create singleton instance
const weatherService = new WeatherService();

module.exports = weatherService;
