const mongoose = require('mongoose');
const { GRAIN_TYPES, BATCH_STATUSES, SPOILAGE_LABELS } = require('../configs/enum');

const grainBatchSchema = new mongoose.Schema({
  // Basic identification
  batch_id: {
    type: String,
    required: [true, "Batch ID is required"],
    unique: true,
    trim: true
  },
  qr_code: {
    type: String,
    unique: true,
    sparse: true // Allows multiple null values
  },

  // Admin and location
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
  farmhouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmhouse'
  },

  // Grain details
  grain_type: {
    type: String,
    enum: {
      values: Object.values(GRAIN_TYPES),
      message: `Grain type must be one of: ${Object.values(GRAIN_TYPES).join(", ")}`
    },
    required: [true, "Grain type is required"]
  },
  variety: {
    type: String,
    trim: true
  },
  grade: {
    type: String,
    enum: ['A', 'B', 'C', 'Premium', 'Standard'],
    default: 'Standard'
  },

  // Quantity and measurements
  quantity_kg: {
    type: Number,
    required: [true, "Quantity in kg is required"],
    min: [0, "Quantity cannot be negative"]
  },
  moisture_content: {
    type: Number,
    min: [0, "Moisture content cannot be negative"],
    max: [100, "Moisture content cannot exceed 100%"]
  },
  protein_content: Number,
  test_weight: Number,

  // Status and tracking
  status: {
    type: String,
    enum: {
      values: Object.values(BATCH_STATUSES),
      message: `Status must be one of: ${Object.values(BATCH_STATUSES).join(", ")}`
    },
    default: BATCH_STATUSES.STORED
  },

  // Dates
  harvest_date: Date,
  intake_date: {
    type: Date,
    default: Date.now
  },
  expected_dispatch_date: Date,
  actual_dispatch_date: Date,

  // Source information
  farmer_name: String,
  farmer_contact: String,
  source_location: String,
  origin_coordinates: {
    latitude: Number,
    longitude: Number
  },

  // Quality and AI predictions
  spoilage_label: {
    type: String,
    enum: Object.values(SPOILAGE_LABELS),
    default: SPOILAGE_LABELS.SAFE
  },
  risk_score: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  ai_prediction_confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  last_risk_assessment: Date,

  // Environmental conditions at intake
  intake_conditions: {
    temperature: Number,
    humidity: Number,
    weather: String
  },

  // Insurance and financial
  insured: {
    type: Boolean,
    default: false
  },
  insurance_policy_number: String,
  insurance_value: Number,
  purchase_price_per_kg: Number,
  total_purchase_value: Number,
  sell_price_per_kg: Number,
  dispatched_quantity_kg: {
    type: Number,
    default: 0,
    min: [0, "Dispatched quantity cannot be negative"]
  },
  revenue: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  },

  // Buyer and dispatch information
  buyer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Buyer'
  },
  dispatch_details: {
    vehicle_number: String,
    driver_name: String,
    driver_contact: String,
    destination: String,
    transport_cost: Number
  },

  // Quality tests and certificates
  quality_tests: [{
    test_type: {
      type: String,
      enum: ['moisture', 'protein', 'aflatoxin', 'foreign_matter', 'damaged_kernels']
    },
    result: String,
    test_date: Date,
    tested_by: String,
    certificate_url: String
  }],

  // Sensor data summary
  sensor_summary: {
    avg_temperature: Number,
    avg_humidity: Number,
    avg_co2: Number,
    avg_voc: Number,
    last_updated: Date
  },

  // Notes and metadata
  notes: String,
  tags: [String],

  // Insurance and spoilage events
  spoilage_events: [{
    event_id: String,
    event_type: {
      type: String,
      enum: ['mold', 'pests', 'moisture', 'heat', 'smell', 'contamination', 'other']
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical']
    },
    description: String,
    estimated_loss_kg: Number,
    estimated_value_loss: Number,
    detected_date: { type: Date, default: Date.now },
    reported_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    photos: [{
      filename: String,
      original_name: String,
      path: String,
      size: Number,
      upload_date: { type: Date, default: Date.now }
    }],
    environmental_conditions: {
      temperature: Number,
      humidity: Number,
      moisture_content: Number
    }
  }],

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
grainBatchSchema.index({ admin_id: 1, status: 1 });
grainBatchSchema.index({ silo_id: 1 });
grainBatchSchema.index({ grain_type: 1 });
grainBatchSchema.index({ intake_date: -1 });
grainBatchSchema.index({ risk_score: -1 });
grainBatchSchema.index({ spoilage_label: 1 });

// Exclude deleted batches by default
grainBatchSchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

// Virtual for total value
grainBatchSchema.virtual('total_value').get(function () {
  return this.quantity_kg * (this.purchase_price_per_kg || 0);
});

// Virtual for storage duration
grainBatchSchema.virtual('storage_duration_days').get(function () {
  const now = new Date();
  const intake = this.intake_date || this.created_at;
  return Math.floor((now - intake) / (1000 * 60 * 60 * 24));
});

// Method to update risk score
grainBatchSchema.methods.updateRiskScore = function (newScore, confidence) {
  this.risk_score = newScore;
  this.ai_prediction_confidence = confidence;
  this.last_risk_assessment = new Date();

  // Update spoilage label based on risk score
  if (newScore >= 80) {
    this.spoilage_label = SPOILAGE_LABELS.SPOILED;
  } else if (newScore >= 50) {
    this.spoilage_label = SPOILAGE_LABELS.RISKY;
  } else {
    this.spoilage_label = SPOILAGE_LABELS.SAFE;
  }

  return this.save();
};

// Method to dispatch batch (supports partial dispatch)
grainBatchSchema.methods.dispatch = function (buyerId, dispatchDetails, sellPricePerKg, dispatchedQuantityKg) {
  const quantityToDispatch = dispatchedQuantityKg || this.quantity_kg;

  // Validate dispatch quantity
  if (quantityToDispatch > this.quantity_kg - this.dispatched_quantity_kg) {
    throw new Error('Dispatched quantity exceeds available quantity');
  }

  // Update dispatched quantity
  this.dispatched_quantity_kg = (this.dispatched_quantity_kg || 0) + quantityToDispatch;

  // If all quantity is dispatched, mark as fully dispatched
  if (this.dispatched_quantity_kg >= this.quantity_kg) {
    this.status = BATCH_STATUSES.DISPATCHED;
  } else {
    // Partial dispatch - keep status as stored or processing
    this.status = this.status === BATCH_STATUSES.STORED ? BATCH_STATUSES.STORED : this.status;
  }

  // Set buyer and dispatch details (only if not already set)
  if (!this.buyer_id) {
    this.buyer_id = buyerId;
  }
  if (dispatchDetails) {
    this.dispatch_details = { ...this.dispatch_details, ...dispatchDetails };
  }

  // Calculate revenue and profit for this dispatch
  if (sellPricePerKg && this.purchase_price_per_kg) {
    const dispatchRevenue = sellPricePerKg * quantityToDispatch;
    const dispatchCost = this.purchase_price_per_kg * quantityToDispatch;
    const dispatchProfit = dispatchRevenue - dispatchCost;

    // Update sell price (weighted average if multiple dispatches)
    if (this.sell_price_per_kg) {
      const totalDispatched = this.dispatched_quantity_kg;
      const previousRevenue = this.sell_price_per_kg * (totalDispatched - quantityToDispatch);
      this.sell_price_per_kg = (previousRevenue + dispatchRevenue) / totalDispatched;
    } else {
      this.sell_price_per_kg = sellPricePerKg;
    }

    // Accumulate revenue and profit
    this.revenue = (this.revenue || 0) + dispatchRevenue;
    this.profit = (this.profit || 0) + dispatchProfit;
  }

  this.actual_dispatch_date = new Date();
  return this.save();
};

// Method to generate QR code
grainBatchSchema.methods.generateQRCode = function () {
  if (!this.qr_code) {
    this.qr_code = `GH-${this.batch_id}-${Date.now()}`;
  }
  return this.qr_code;
};

module.exports = mongoose.model('GrainBatch', grainBatchSchema);
