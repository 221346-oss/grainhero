/**
 * Fan Control Service (IoT Spec Alignment)
 * 
 * Implements fan state machine with hysteresis and min ON/OFF durations
 * IoT Spec:
 * - ON: RH_core > 65% AND Grain_Moisture > 14% OR ML risk high (if external conditions safe)
 * - OFF: RH_core < 62% AND Grain_Moisture < 13.5% (hysteresis: ON at 65%, OFF at 62%)
 * - NEVER: Rainfall > 0 OR Ambient_RH > 80% OR T_core - Dew_Point < 1°C
 * - Hysteresis & min on/off times to avoid short-cycling
 */

const EventEmitter = require('events');

class FanControlService extends EventEmitter {
  constructor() {
    super();
    this.fanStates = new Map(); // silo_id -> { state, lastChange, minDurationOn, minDurationOff }
    this.config = {
      // Hysteresis thresholds (IoT spec)
      rh_on_threshold: 65, // Turn ON when RH > 65%
      rh_off_threshold: 62, // Turn OFF when RH < 62% (hysteresis prevents short-cycling)
      moisture_on_threshold: 14, // Turn ON when moisture > 14%
      moisture_off_threshold: 13.5, // Turn OFF when moisture < 13.5%
      
      // Min durations (IoT spec: avoid short-cycling)
      min_duration_on_ms: 5 * 60 * 1000, // 5 minutes minimum ON time
      min_duration_off_ms: 5 * 60 * 1000, // 5 minutes minimum OFF time
      
      // Guardrail thresholds
      max_ambient_rh: 80, // Never ventilate if ambient RH > 80%
      min_dew_point_gap: 1 // Never ventilate if T_core - Dew_Point < 1°C
    };
  }

  /**
   * Get current fan state for a silo
   */
  getFanState(siloId) {
    const state = this.fanStates.get(siloId.toString());
    return state || {
      state: 0, // OFF
      lastChange: new Date(),
      minDurationOn: this.config.min_duration_on_ms,
      minDurationOff: this.config.min_duration_off_ms
    };
  }

  /**
   * Calculate fan recommendation based on IoT spec logic
   * @param {Object} reading - SensorReading with derived_metrics
   * @returns {Object} { recommendation: 'run'|'stop'|'hold', reason: string, fan_state: 0|1 }
   */
  calculateFanRecommendation(reading) {
    const siloId = reading.silo_id?.toString() || reading.silo_id;
    const currentState = this.getFanState(siloId);
    const now = new Date();
    
    // Extract sensor values
    const coreRH = reading.humidity?.value;
    const grainMoisture = reading.moisture?.value;
    const coreTemp = reading.temperature?.value;
    const dewPoint = reading.derived_metrics?.dew_point;
    const mlRiskClass = reading.derived_metrics?.ml_risk_class;
    const guardrails = reading.derived_metrics?.guardrails || {};
    
    // Check guardrails first (IoT spec: NEVER ventilate if...)
    if (guardrails.venting_blocked) {
      return {
        recommendation: 'hold',
        reason: guardrails.reasons?.join('; ') || 'Guardrails active',
        fan_state: 0, // Force OFF
        should_change: currentState.state === 1 // Only log if currently ON
      };
    }
    
    // Check min duration constraints (hysteresis)
    const timeSinceLastChange = now - currentState.lastChange;
    const isCurrentlyOn = currentState.state === 1;
    
    if (isCurrentlyOn && timeSinceLastChange < currentState.minDurationOn) {
      // Fan is ON but hasn't met min duration - keep it ON
      return {
        recommendation: 'hold',
        reason: `Min ON duration not met (${Math.round((currentState.minDurationOn - timeSinceLastChange) / 1000)}s remaining)`,
        fan_state: 1,
        should_change: false
      };
    }
    
    if (!isCurrentlyOn && timeSinceLastChange < currentState.minDurationOff) {
      // Fan is OFF but hasn't met min duration - keep it OFF
      return {
        recommendation: 'hold',
        reason: `Min OFF duration not met (${Math.round((currentState.minDurationOff - timeSinceLastChange) / 1000)}s remaining)`,
        fan_state: 0,
        should_change: false
      };
    }
    
    // IoT Spec Fan ON conditions:
    // 1. RH_core > 65% AND Grain_Moisture > 14%
    // 2. OR ML risk high (risky/spoiled) AND external conditions safe
    const shouldTurnOn = 
      (coreRH > this.config.rh_on_threshold && grainMoisture > this.config.moisture_on_threshold) ||
      ((mlRiskClass === 'risky' || mlRiskClass === 'spoiled') && !guardrails.venting_blocked);
    
    // IoT Spec Fan OFF conditions:
    // RH_core < 62% AND Grain_Moisture < 13.5% (hysteresis)
    const shouldTurnOff = 
      coreRH < this.config.rh_off_threshold && 
      grainMoisture < this.config.moisture_off_threshold;
    
    // Determine recommendation
    let recommendation, reason, newState;
    
    if (shouldTurnOn && !isCurrentlyOn) {
      recommendation = 'run';
      reason = `RH=${coreRH?.toFixed(1)}% > ${this.config.rh_on_threshold}% AND Moisture=${grainMoisture?.toFixed(1)}% > ${this.config.moisture_on_threshold}% OR ML risk=${mlRiskClass}`;
      newState = 1;
    } else if (shouldTurnOff && isCurrentlyOn) {
      recommendation = 'stop';
      reason = `RH=${coreRH?.toFixed(1)}% < ${this.config.rh_off_threshold}% AND Moisture=${grainMoisture?.toFixed(1)}% < ${this.config.moisture_off_threshold}% (hysteresis)`;
      newState = 0;
    } else {
      // Maintain current state
      recommendation = 'hold';
      reason = `Maintaining current state (ON=${isCurrentlyOn})`;
      newState = currentState.state;
    }
    
    return {
      recommendation,
      reason,
      fan_state: newState,
      should_change: newState !== currentState.state
    };
  }

  /**
   * Update fan state for a silo (called when recommendation changes)
   */
  updateFanState(siloId, newState, reason) {
    const siloIdStr = siloId.toString();
    const currentState = this.getFanState(siloIdStr);
    
    if (newState !== currentState.state) {
      this.fanStates.set(siloIdStr, {
        state: newState,
        lastChange: new Date(),
        minDurationOn: this.config.min_duration_on_ms,
        minDurationOff: this.config.min_duration_off_ms,
        lastReason: reason
      });
      
      this.emit('fanStateChanged', {
        silo_id: siloIdStr,
        old_state: currentState.state,
        new_state: newState,
        reason,
        timestamp: new Date()
      });
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      active_silos: this.fanStates.size,
      config: this.config,
      fan_states: Array.from(this.fanStates.entries()).map(([siloId, state]) => ({
        silo_id: siloId,
        state: state.state,
        last_change: state.lastChange,
        last_reason: state.lastReason
      }))
    };
  }
}

// Singleton instance
const fanControlService = new FanControlService();

module.exports = fanControlService;

