const mongoose = require('mongoose');
const { DEVICE_STATUSES } = require('../configs/enum');

const siloSchema = new mongoose.Schema({
  // Basic identification
  silo_id: {
    type: String,
    required: [true, "Silo ID is required"],
    unique: true,
    trim: true,
    immutable: true
  },
  name: {
    type: String,
    required: [true, "Silo name is required"],
    trim: true,
    immutable: true
  },

  // Admin and location
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Admin ID is required"]
  },
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, "Warehouse ID is required"]
  },
  farmhouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmhouse'
  },

  // Physical specifications
  capacity_kg: {
    type: Number,
    required: [true, "Capacity in kg is required"],
    min: [1, "Capacity must be positive"]
  },
  dimensions: {
    height: Number, // meters
    diameter: Number, // meters
    volume: Number // cubic meters
  },

  // Location and installation
  location: {
    description: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: String,
    city: String,
    country: String,
    postal_code: String
  },

  // Current status and occupancy
  status: {
    type: String,
    enum: {
      values: Object.values(DEVICE_STATUSES),
      message: `Status must be one of: ${Object.values(DEVICE_STATUSES).join(", ")}`
    },
    default: DEVICE_STATUSES.ACTIVE
  },

  current_occupancy_kg: {
    type: Number,
    default: 0,
    min: [0, "Occupancy cannot be negative"]
  },

  // Current batch information
  current_batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GrainBatch'
  },

  // Batch storage tracking — used by ML to compute accurate Storage_Days
  batch_loaded_date: {
    type: Date,
    default: null
  },
  batch_dispatched_date: {
    type: Date,
    default: null
  },

  // Pest control
  fumigation_active: {
    type: Boolean,
    default: false
  },

  // Environmental control systems
  ventilation_system: {
    has_fans: {
      type: Boolean,
      default: false
    },
    fan_count: {
      type: Number,
      default: 0
    },
    has_vents: {
      type: Boolean,
      default: false
    },
    vent_count: {
      type: Number,
      default: 0
    },
    automatic_control: {
      type: Boolean,
      default: false
    }
  },

  temperature_control: {
    has_cooling: {
      type: Boolean,
      default: false
    },
    has_heating: {
      type: Boolean,
      default: false
    },
    target_temperature: {
      type: Number,
      default: 25
    },
    temperature_tolerance: {
      type: Number,
      default: 2
    }
  },

  // Sensor configuration
  sensors: [{
    device_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SensorDevice'
    },
    sensor_type: {
      type: String,
      enum: ['temperature', 'humidity', 'co2', 'voc', 'moisture', 'light', 'pressure']
    },
    position: {
      description: String,
      height_from_bottom: Number, // meters
      x: Number,
      y: Number,
      z: Number
    },
    is_primary: {
      type: Boolean,
      default: false
    }
  }],

  // Current environmental conditions (latest readings)
  current_conditions: {
    temperature: {
      value: Number,
      timestamp: Date,
      sensor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SensorDevice'
      }
    },
    humidity: {
      value: Number,
      timestamp: Date,
      sensor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SensorDevice'
      }
    },
    co2: {
      value: Number,
      timestamp: Date,
      sensor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SensorDevice'
      }
    },
    voc: {
      value: Number,
      timestamp: Date,
      sensor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SensorDevice'
      }
    },
    moisture: {
      value: Number,
      timestamp: Date,
      sensor_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SensorDevice'
      }
    },
    last_updated: Date
  },

  // Operational thresholds
  thresholds: {
    temperature: {
      min: { type: Number, default: 10 },
      max: { type: Number, default: 35 },
      critical_min: { type: Number, default: 5 },
      critical_max: { type: Number, default: 40 }
    },
    humidity: {
      min: { type: Number, default: 40 },
      max: { type: Number, default: 70 },
      critical_min: { type: Number, default: 30 },
      critical_max: { type: Number, default: 80 }
    },
    co2: {
      max: { type: Number, default: 1000 },
      critical_max: { type: Number, default: 5000 }
    },
    voc: {
      max: { type: Number, default: 500 },
      critical_max: { type: Number, default: 1000 }
    },
    moisture: {
      max: { type: Number, default: 14 },
      critical_max: { type: Number, default: 18 }
    }
  },

  // Maintenance and inspection
  last_inspection_date: Date,
  next_inspection_date: Date,
  inspection_interval_days: {
    type: Number,
    default: 30
  },

  last_cleaning_date: Date,
  cleaning_schedule: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'as_needed'],
    default: 'monthly'
  },

  // Construction and materials
  construction_details: {
    material: {
      type: String,
      enum: ['steel', 'concrete', 'fiberglass', 'wood', 'plastic'],
      default: 'steel'
    },
    construction_year: Number,
    manufacturer: String,
    model: String,
    warranty_expiry: Date
  },

  // Safety and compliance
  safety_features: {
    fire_suppression: {
      type: Boolean,
      default: false
    },
    explosion_vents: {
      type: Boolean,
      default: false
    },
    level_sensors: {
      type: Boolean,
      default: false
    },
    emergency_stops: {
      type: Boolean,
      default: false
    }
  },

  compliance_certificates: [{
    certificate_type: String,
    certificate_number: String,
    issued_date: Date,
    expiry_date: Date,
    issuing_authority: String,
    document_url: String
  }],

  // Operational statistics
  statistics: {
    total_batches_stored: {
      type: Number,
      default: 0
    },
    total_kg_processed: {
      type: Number,
      default: 0
    },
    average_storage_duration: Number, // days
    last_batch_date: Date,
    utilization_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Configuration
  is_active: {
    type: Boolean,
    default: true
  },
  auto_alerts: {
    type: Boolean,
    default: true
  },

  // Metadata
  notes: String,
  tags: [String],

  // Audit trail
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Creator is required"]
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
siloSchema.index({ admin_id: 1, status: 1 });
siloSchema.index({ warehouse_id: 1, status: 1 });
siloSchema.index({ farmhouse_id: 1 });
siloSchema.index({ current_batch_id: 1 });
siloSchema.index({ status: 1 });

// Ensure silo names are unique within a warehouse for an admin (prevents duplicate names)
siloSchema.index({ admin_id: 1, warehouse_id: 1, name: 1 }, { unique: true });

// Exclude deleted silos by default
siloSchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

// Virtual for occupancy percentage
siloSchema.virtual('occupancy_percentage').get(function () {
  if (this.capacity_kg <= 0) return 0;
  return Math.round((this.current_occupancy_kg / this.capacity_kg) * 100);
});

// Virtual for available capacity
siloSchema.virtual('available_capacity_kg').get(function () {
  return Math.max(0, this.capacity_kg - this.current_occupancy_kg);
});

// Virtual for inspection status
siloSchema.virtual('inspection_status').get(function () {
  if (!this.next_inspection_date) return 'unknown';

  const now = new Date();
  const daysUntilInspection = (this.next_inspection_date - now) / (1000 * 60 * 60 * 24);

  if (daysUntilInspection < 0) return 'overdue';
  if (daysUntilInspection < 7) return 'due_soon';

  return 'current';
});

// Method to update current conditions
siloSchema.methods.updateCurrentConditions = function (sensorType, value, sensorId) {
  if (!this.current_conditions) {
    this.current_conditions = {};
  }

  this.current_conditions[sensorType] = {
    value: value,
    timestamp: new Date(),
    sensor_id: sensorId
  };
  this.current_conditions.last_updated = new Date();

  return this.save({ validateBeforeSave: false });
};

// Method to add batch
siloSchema.methods.addBatch = function (batchId, quantityKg) {
  if (this.current_occupancy_kg + quantityKg > this.capacity_kg) {
    throw new Error('Insufficient capacity');
  }

  this.current_batch_id = batchId;
  this.current_occupancy_kg += quantityKg;
  this.batch_loaded_date = new Date(); // Track when batch entered for ML Storage_Days
  this.batch_dispatched_date = null;   // Reset dispatch date for new batch
  this.statistics.total_batches_stored += 1;
  this.statistics.total_kg_processed += quantityKg;
  this.statistics.last_batch_date = new Date();
  this.statistics.utilization_percentage = Math.round((this.current_occupancy_kg / this.capacity_kg) * 100);

  return this.save();
};

// Auto-generate `silo_id` and `name` (if missing) before validation. Names are unique per admin+warehouse.
siloSchema.pre('validate', async function () {
  // Only generate for new documents
  if (this.isNew) {
    const Silo = mongoose.model('Silo');

    // Generate a unique global silo_id if not provided using sequential S001 numbering
    if (!this.silo_id) {
      const regex = /^S(\d{3})$/;
      // get all silo ids (could be optimized with aggregation but ok for now)
      const silos = await Silo.find().select('silo_id');
      let max = 0;
      for (const s of silos) {
        const m = regex.exec(s.silo_id || '');
        if (m) {
          const n = parseInt(m[1], 10);
          if (n > max) max = n;
        }
      }
      const next = (max + 1).toString().padStart(3, '0');
      this.silo_id = `S${next}`;
    }

    // Generate a name if not provided using warehouse sequential count
    if (!this.name) {
      let base = 'Silo';
      try {
        if (this.warehouse_id) {
          const count = await Silo.countDocuments({ warehouse_id: this.warehouse_id });
          base = `Silo ${count + 1}`;
        }
      } catch (e) {
        // ignore and fallback to base
      }

      // Ensure uniqueness in case of race conditions
      let nameCandidate = base;
      let suffix = 0;
      while (await Silo.exists({ admin_id: this.admin_id, warehouse_id: this.warehouse_id, name: nameCandidate })) {
        suffix += 1;
        nameCandidate = `${base}-${suffix}`;
      }
      this.name = nameCandidate;
    }
  }
});

// Method to remove batch (dispatch)
siloSchema.methods.removeBatch = function (quantityKg) {
  this.current_occupancy_kg = Math.max(0, this.current_occupancy_kg - quantityKg);
  this.statistics.utilization_percentage = Math.round((this.current_occupancy_kg / this.capacity_kg) * 100);

  if (this.current_occupancy_kg === 0) {
    this.current_batch_id = null;
    this.batch_dispatched_date = new Date(); // Stop the storage day counter
  }

  return this.save();
};

// Method to check if conditions are within thresholds
siloSchema.methods.checkThresholds = function () {
  const alerts = [];
  const conditions = this.current_conditions;
  const thresholds = this.thresholds;

  if (!conditions || !thresholds) return alerts;

  const sensorTypes = ['temperature', 'humidity', 'co2', 'voc', 'moisture'];

  sensorTypes.forEach(type => {
    const condition = conditions[type];
    const threshold = thresholds[type];

    if (condition?.value !== undefined && threshold) {
      if (threshold.critical_min !== undefined && condition.value < threshold.critical_min) {
        alerts.push({
          type: 'critical',
          sensor_type: type,
          message: `${type} critically low: ${condition.value}`,
          threshold_type: 'critical_min',
          threshold_value: threshold.critical_min,
          actual_value: condition.value
        });
      } else if (threshold.critical_max !== undefined && condition.value > threshold.critical_max) {
        alerts.push({
          type: 'critical',
          sensor_type: type,
          message: `${type} critically high: ${condition.value}`,
          threshold_type: 'critical_max',
          threshold_value: threshold.critical_max,
          actual_value: condition.value
        });
      } else if (threshold.min !== undefined && condition.value < threshold.min) {
        alerts.push({
          type: 'warning',
          sensor_type: type,
          message: `${type} below threshold: ${condition.value}`,
          threshold_type: 'min',
          threshold_value: threshold.min,
          actual_value: condition.value
        });
      } else if (threshold.max !== undefined && condition.value > threshold.max) {
        alerts.push({
          type: 'warning',
          sensor_type: type,
          message: `${type} above threshold: ${condition.value}`,
          threshold_type: 'max',
          threshold_value: threshold.max,
          actual_value: condition.value
        });
      }
    }
  });

  return alerts;
};

module.exports = mongoose.model('Silo', siloSchema);
