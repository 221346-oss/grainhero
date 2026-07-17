const mongoose = require('mongoose');
const { ACTUATOR_TYPES, ACTUATOR_ACTIONS, ACTUATOR_TRIGGERED_BY, ACTUATOR_TRIGGER_TYPES } = require('../configs/enum');

const actuatorSchema = new mongoose.Schema({
  // Basic identification
  actuator_id: {
    type: String,
    required: [true, "Actuator ID is required"],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, "Actuator name is required"],
    trim: true
  },

  // Tenant and location
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Admin ID is required"]
  },
  silo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Silo',
    required: [true, "Silo ID is required"]
  },

  // Device specifications
  actuator_type: {
    type: String,
    required: [true, "Actuator type is required"],
    enum: Object.values(ACTUATOR_TYPES)
  },
  model: String,
  manufacturer: String,
  mac_address: {
    type: String,
    unique: true,
    sparse: true
  },

  // Current status
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error', 'offline'],
    default: 'inactive'
  },
  is_enabled: {
    type: Boolean,
    default: true
  },
  is_on: {
    type: Boolean,
    default: false
  },

  // Control settings
  control_mode: {
    type: String,
    enum: ['manual', 'automatic', 'scheduled', 'ai_controlled'],
    default: 'manual'
  },
  power_level: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Centralized Control State (IoT Spec Alignment)
  ml_requested_fan: { type: Boolean, default: false },
  human_requested_fan: { type: Boolean, default: false },
  target_fan_speed: { type: Number, min: 0, max: 100, default: 0 },
  ml_decision: { type: String, default: 'idle' },

  // Thresholds for automatic control
  thresholds: {
    temperature: {
      min: Number,
      max: Number,
      critical_min: Number,
      critical_max: Number
    },
    humidity: {
      min: Number,
      max: Number,
      critical_min: Number,
      critical_max: Number
    },
    co2: {
      min: Number,
      max: Number,
      critical_min: Number,
      critical_max: Number
    },
    voc: {
      min: Number,
      max: Number,
      critical_min: Number,
      critical_max: Number
    },
    moisture: {
      min: Number,
      max: Number,
      critical_min: Number,
      critical_max: Number
    }
  },

  // AI control settings
  ai_control: {
    enabled: {
      type: Boolean,
      default: false
    },
    risk_score_threshold: {
      type: Number,
      min: 0,
      max: 100,
      default: 70
    },
    prediction_confidence_threshold: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.8
    }
  },

  // Scheduling
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    cron_expression: String,
    timezone: {
      type: String,
      default: 'UTC'
    },
    active_hours: {
      start: String, // HH:MM format
      end: String
    },
    days_of_week: [{
      type: Number,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    }]
  },

  // Device health metrics
  health_metrics: {
    last_heartbeat: Date,
    uptime_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    },
    error_count: {
      type: Number,
      default: 0
    },
    last_error: {
      message: String,
      timestamp: Date,
      error_code: String
    },
    total_operations: {
      type: Number,
      default: 0
    },
    total_runtime_hours: {
      type: Number,
      default: 0
    }
  },

  // Performance metrics
  performance_metrics: {
    energy_consumption: {
      current: Number, // watts
      average: Number,
      total_kwh: Number
    },
    efficiency_rating: {
      type: Number,
      min: 0,
      max: 100
    },
    maintenance_interval_days: {
      type: Number,
      default: 30
    },
    last_maintenance: Date,
    next_maintenance_due: Date
  },

  // Safety and limits
  safety_limits: {
    max_runtime_hours: {
      type: Number,
      default: 24
    },
    cooldown_period_minutes: {
      type: Number,
      default: 5
    },
    emergency_shutdown_enabled: {
      type: Boolean,
      default: true
    }
  },

  // Current operation context
  current_operation: {
    started_at: Date,
    triggered_by: {
      type: String,
      enum: Object.values(ACTUATOR_TRIGGERED_BY)
    },
    trigger_type: {
      type: String,
      enum: Object.values(ACTUATOR_TRIGGER_TYPES)
    },
    target_conditions: mongoose.Schema.Types.Mixed,
    expected_duration_minutes: Number
  },

  // Tags and metadata
  tags: [String],
  notes: String,

  // Audit fields
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Soft delete
  deleted_at: {
    type: Date,
    default: null,
    select: false
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes for better query performance
actuatorSchema.index({ admin_id: 1, status: 1 });
actuatorSchema.index({ silo_id: 1, actuator_type: 1 });
actuatorSchema.index({ control_mode: 1, is_enabled: 1 });
actuatorSchema.index({ 'health_metrics.last_heartbeat': -1 });

// Exclude deleted actuators by default
actuatorSchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

// Virtual for operation status
actuatorSchema.virtual('operation_status').get(function () {
  if (!this.is_enabled) return 'disabled';
  if (this.status === 'maintenance') return 'maintenance';
  if (this.status === 'error') return 'error';
  if (this.status === 'offline') return 'offline';
  if (this.is_on) return 'running';
  return 'idle';
});

// Method to update heartbeat
actuatorSchema.methods.updateHeartbeat = function () {
  this.health_metrics.last_heartbeat = new Date();
  this.health_metrics.uptime_percentage = Math.min(100, this.health_metrics.uptime_percentage + 0.1);
  return this.save();
};

// Method to record error
actuatorSchema.methods.recordError = function (errorMessage, errorCode = 'UNKNOWN') {
  this.health_metrics.error_count += 1;
  this.health_metrics.last_error = {
    message: errorMessage,
    timestamp: new Date(),
    error_code: errorCode
  };
  this.health_metrics.uptime_percentage = Math.max(0, this.health_metrics.uptime_percentage - 5);
  return this.save();
};

// Method to start operation (REQUEST ONLY - authority on hardware)
actuatorSchema.methods.startOperation = function (triggeredBy, triggerType, targetConditions = {}) {
  this.is_on = true; // This represents current local intention

  // Set centralized state variables
  if (triggeredBy === 'AI') {
    this.ml_requested_fan = true;
    this.ml_decision = 'fan_on';
  } else {
    this.human_requested_fan = true;
  }

  if (this.power_level === 0) {
    this.power_level = 60; // Default requested speed
  }
  this.target_fan_speed = this.power_level;

  this.current_operation = {
    started_at: new Date(),
    triggered_by: triggeredBy,
    trigger_type: triggerType,
    target_conditions: targetConditions
  };
  this.health_metrics.total_operations += 1;
  return this.save();
};

// Method to stop operation (REQUEST ONLY)
actuatorSchema.methods.stopOperation = function () {
  if (this.current_operation?.started_at) {
    const runtimeHours = (new Date() - this.current_operation.started_at) / (1000 * 60 * 60);
    this.health_metrics.total_runtime_hours += runtimeHours;
  }

  this.is_on = false;
  this.current_operation = null;

  // Clear centralized state requests
  this.ml_requested_fan = false;
  this.human_requested_fan = false;
  this.target_fan_speed = 0;
  this.ml_decision = 'idle';

  return this.save();
};

// Method to check if maintenance is due
actuatorSchema.methods.isMaintenanceDue = function () {
  if (!this.performance_metrics.last_maintenance) return true;

  const daysSinceMaintenance = (new Date() - this.performance_metrics.last_maintenance) / (1000 * 60 * 60 * 24);
  return daysSinceMaintenance >= this.performance_metrics.maintenance_interval_days;
};

// Method to check if actuator should be triggered based on sensor data
actuatorSchema.methods.shouldTrigger = function (sensorReading, riskScore = 0) {
  if (!this.is_enabled || this.status !== 'active') return false;

  // Check AI control
  if (this.ai_control.enabled && riskScore >= this.ai_control.risk_score_threshold) {
    return true;
  }

  // Check threshold-based triggers
  const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];

  for (const type of sensorTypes) {
    const value = sensorReading[type]?.value;
    const threshold = this.thresholds[type];

    if (value !== undefined && threshold) {
      if ((threshold.critical_min !== undefined && value < threshold.critical_min) ||
        (threshold.critical_max !== undefined && value > threshold.critical_max)) {
        return true;
      }
    }
  }

  return false;
};

// Method to get recommended action based on sensor data
actuatorSchema.methods.getRecommendedAction = function (sensorReading) {
  const actions = [];
  const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];

  for (const type of sensorTypes) {
    const value = sensorReading[type]?.value;
    const threshold = this.thresholds[type];

    if (value !== undefined && threshold) {
      if (threshold.critical_max !== undefined && value > threshold.critical_max) {
        actions.push({
          type: 'cooling',
          sensor_type: type,
          priority: 'critical',
          message: `${type} critically high: ${value} (threshold: ${threshold.critical_max})`
        });
      } else if (threshold.critical_min !== undefined && value < threshold.critical_min) {
        actions.push({
          type: 'heating',
          sensor_type: type,
          priority: 'critical',
          message: `${type} critically low: ${value} (threshold: ${threshold.critical_min})`
        });
      } else if (threshold.max !== undefined && value > threshold.max) {
        actions.push({
          type: 'ventilation',
          sensor_type: type,
          priority: 'high',
          message: `${type} above threshold: ${value} (threshold: ${threshold.max})`
        });
      } else if (threshold.min !== undefined && value < threshold.min) {
        actions.push({
          type: 'humidification',
          sensor_type: type,
          priority: 'high',
          message: `${type} below threshold: ${value} (threshold: ${threshold.min})`
        });
      }
    }
  }

  return actions;
};

module.exports = mongoose.model('Actuator', actuatorSchema);
