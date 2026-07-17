/**
 * Risk Thresholds Configuration
 * 
 * Defines clear risk level mappings for spoilage predictions.
 * These thresholds are used consistently across:
 * - ML model risk score interpretation
 * - SensorReading derived metrics
 * - AI advisory generation
 * - Alert triggering
 * 
 * Thresholds can be adjusted per region/grain type via getThresholds() method.
 */

const RISK_THRESHOLDS = {
  // Base thresholds (used for most regions/grain types)
  base: {
    low: { min: 0, max: 30 },
    medium: { min: 30, max: 60 },
    high: { min: 60, max: 80 },
    critical: { min: 80, max: 100 }
  },
  
  // Regional adjustments (multipliers applied to base thresholds)
  regional: {
    coastal: {
      humidity_adjustment: 1.1, // Coastal regions tolerate slightly higher humidity
      moisture_adjustment: 1.05
    },
    mountain: {
      temperature_adjustment: 0.9, // Mountain regions have lower temp thresholds
      humidity_adjustment: 0.95
    },
    plains: {
      // No adjustments for plains (default)
    }
  },
  
  // Grain type specific adjustments
  grainType: {
    rice: {
      moisture_critical: 15, // Rice is more sensitive to moisture
      humidity_critical: 75
    },
    wheat: {
      moisture_critical: 16,
      humidity_critical: 80
    },
    corn: {
      moisture_critical: 17,
      humidity_critical: 85
    }
  }
};

/**
 * Get risk level from risk score
 * @param {number} riskScore - Risk score (0-100)
 * @param {Object} options - Optional: region, grainType
 * @returns {string} Risk level: 'low', 'medium', 'high', 'critical'
 */
function getRiskLevel(riskScore, options = {}) {
  if (typeof riskScore !== 'number' || isNaN(riskScore)) {
    return 'unknown';
  }
  
  const thresholds = RISK_THRESHOLDS.base;
  
  if (riskScore >= thresholds.critical.min) {
    return 'critical';
  } else if (riskScore >= thresholds.high.min) {
    return 'high';
  } else if (riskScore >= thresholds.medium.min) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Get risk level with action recommendations
 * @param {number} riskScore - Risk score (0-100)
 * @param {Object} options - Optional: region, grainType
 * @returns {Object} Risk level details with actions
 */
function getRiskLevelDetails(riskScore, options = {}) {
  const level = getRiskLevel(riskScore, options);
  
  const actionMap = {
    low: {
      level: 'low',
      color: '#10B981', // green
      description: 'Safe conditions - Monitor only',
      actions: ['Continue regular monitoring', 'Maintain current storage conditions'],
      urgency: 'none',
      requires_action: false
    },
    medium: {
      level: 'medium',
      color: '#F59E0B', // amber
      description: 'Moderate risk - Advisory recommended',
      actions: ['Review environmental conditions', 'Check sensor readings', 'Consider preventive measures'],
      urgency: 'low',
      requires_action: false
    },
    high: {
      level: 'high',
      color: '#EF4444', // red
      description: 'High risk - Immediate action required',
      actions: ['Activate ventilation systems', 'Review and implement advisories', 'Increase monitoring frequency'],
      urgency: 'high',
      requires_action: true,
      fan_recommendation: 'run'
    },
    critical: {
      level: 'critical',
      color: '#DC2626', // dark red
      description: 'Critical risk - Emergency response needed',
      actions: ['Immediate fan activation', 'Emergency inspection', 'Alert management', 'Consider grain relocation'],
      urgency: 'critical',
      requires_action: true,
      fan_recommendation: 'run',
      alarm_required: true
    }
  };
  
  return {
    ...actionMap[level],
    risk_score: riskScore,
    threshold_used: RISK_THRESHOLDS.base[level]
  };
}

/**
 * Get thresholds for a specific region and grain type
 * @param {string} region - Region type: 'coastal', 'mountain', 'plains'
 * @param {string} grainType - Grain type: 'rice', 'wheat', 'corn'
 * @returns {Object} Adjusted thresholds
 */
function getThresholds(region = 'plains', grainType = 'rice') {
  const base = RISK_THRESHOLDS.base;
  const regional = RISK_THRESHOLDS.regional[region] || {};
  const grain = RISK_THRESHOLDS.grainType[grainType] || RISK_THRESHOLDS.grainType.rice;
  
  return {
    risk_score: base,
    moisture: {
      safe: grain.moisture_critical - 3,
      risk: grain.moisture_critical - 1,
      critical: grain.moisture_critical
    },
    humidity: {
      safe: grain.humidity_critical - 10,
      risk: grain.humidity_critical - 5,
      critical: grain.humidity_critical
    },
    regional_adjustments: regional
  };
}

/**
 * Check if risk score requires immediate action
 * @param {number} riskScore - Risk score (0-100)
 * @returns {boolean} True if action required
 */
function requiresAction(riskScore) {
  const level = getRiskLevel(riskScore);
  return level === 'high' || level === 'critical';
}

/**
 * Check if risk score requires alert/notification
 * @param {number} riskScore - Risk score (0-100)
 * @returns {boolean} True if alert required
 */
function requiresAlert(riskScore) {
  const level = getRiskLevel(riskScore);
  return level === 'critical';
}

module.exports = {
  RISK_THRESHOLDS,
  getRiskLevel,
  getRiskLevelDetails,
  getThresholds,
  requiresAction,
  requiresAlert
};

