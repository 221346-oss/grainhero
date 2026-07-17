const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  // Basic policy information
  policy_number: {
    type: String,
    required: [true, "Policy number is required"],
    unique: true,
    trim: true
  },

  // Admin and Tenant references
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Admin ID is required"],
    index: true
  },
  // Insurance provider details
  provider_name: {
    type: String,
    required: [true, "Provider name is required"],
    trim: true
  },
  provider_contact: {
    email: String,
    phone: String,
    address: String
  },

  // Coverage details
  coverage_type: {
    type: String,
    enum: ['Comprehensive', 'Fire & Theft', 'Spoilage Only', 'Weather Damage', 'Custom'],
    required: [true, "Coverage type is required"]
  },
  coverage_amount: {
    type: Number,
    required: [true, "Coverage amount is required"],
    min: [0, "Coverage amount must be positive"]
  },
  premium_amount: {
    type: Number,
    required: [true, "Premium amount is required"],
    min: [0, "Premium amount must be positive"]
  },
  deductible: {
    type: Number,
    required: [true, "Deductible is required"],
    min: [0, "Deductible must be positive"]
  },

  // Policy dates
  start_date: {
    type: Date,
    required: [true, "Start date is required"]
  },
  end_date: {
    type: Date,
    required: [true, "End date is required"]
  },
  renewal_date: {
    type: Date,
    required: [true, "Renewal date is required"]
  },

  // Policy status
  status: {
    type: String,
    enum: ['active', 'expired', 'pending', 'cancelled', 'suspended'],
    default: 'active'
  },

  // Covered grain batches
  covered_batches: [{
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GrainBatch',
      required: true
    },
    grain_type: {
      type: String,
      required: true
    },
    quantity_kg: {
      type: Number,
      required: true,
      min: [0, "Quantity must be positive"]
    },
    coverage_value: {
      type: Number,
      required: true,
      min: [0, "Coverage value must be positive"]
    },
    coverage_percentage: {
      type: Number,
      default: 100,
      min: [0, "Coverage percentage must be between 0-100"],
      max: [100, "Coverage percentage must be between 0-100"]
    }
  }],

  // Risk assessment factors
  risk_factors: {
    fire_risk: {
      type: Number,
      default: 0,
      min: [0, "Fire risk must be between 0-100"],
      max: [100, "Fire risk must be between 0-100"]
    },
    theft_risk: {
      type: Number,
      default: 0,
      min: [0, "Theft risk must be between 0-100"],
      max: [100, "Theft risk must be between 0-100"]
    },
    spoilage_risk: {
      type: Number,
      default: 0,
      min: [0, "Spoilage risk must be between 0-100"],
      max: [100, "Spoilage risk must be between 0-100"]
    },
    weather_risk: {
      type: Number,
      default: 0,
      min: [0, "Weather risk must be between 0-100"],
      max: [100, "Weather risk must be between 0-100"]
    }
  },

  // Claims statistics
  claims_count: {
    type: Number,
    default: 0,
    min: [0, "Claims count cannot be negative"]
  },
  total_claims_amount: {
    type: Number,
    default: 0,
    min: [0, "Total claims amount cannot be negative"]
  },

  // Policy terms and conditions
  terms_conditions: {
    coverage_limits: String,
    exclusions: [String],
    claim_procedures: String,
    renewal_terms: String
  },

  // Premium calculation factors
  premium_factors: {
    base_rate: {
      type: Number,
      default: 0.02 // 2% base rate
    },
    risk_multiplier: {
      type: Number,
      default: 1.0
    },
    volume_discount: {
      type: Number,
      default: 0
    },
    loyalty_discount: {
      type: Number,
      default: 0
    }
  },

  // Configuration
  auto_renewal: {
    type: Boolean,
    default: true
  },
  notifications_enabled: {
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
insurancePolicySchema.index({ admin_id: 1, status: 1 });
insurancePolicySchema.index({ provider_name: 1 });
insurancePolicySchema.index({ end_date: 1 });
insurancePolicySchema.index({ renewal_date: 1 });

// Exclude deleted policies by default
insurancePolicySchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

// Virtual for overall risk score
insurancePolicySchema.virtual('overall_risk_score').get(function () {
  const factors = this.risk_factors;
  return Math.round((factors.fire_risk + factors.theft_risk + factors.spoilage_risk + factors.weather_risk) / 4);
});

// Virtual for policy expiry status
insurancePolicySchema.virtual('expiry_status').get(function () {
  const now = new Date();
  const daysUntilExpiry = (this.end_date - now) / (1000 * 60 * 60 * 24);

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry < 30) return 'expiring_soon';
  return 'active';
});

// Virtual for total covered value
insurancePolicySchema.virtual('total_covered_value').get(function () {
  return this.covered_batches.reduce((sum, batch) => sum + batch.coverage_value, 0);
});

// Method to calculate premium based on risk factors
insurancePolicySchema.methods.calculatePremium = function () {
  const basePremium = this.coverage_amount * this.premium_factors.base_rate;
  const riskMultiplier = this.premium_factors.risk_multiplier;
  const overallRisk = this.overall_risk_score / 100;

  let premium = basePremium * (1 + overallRisk) * riskMultiplier;

  // Apply discounts
  premium *= (1 - this.premium_factors.volume_discount / 100);
  premium *= (1 - this.premium_factors.loyalty_discount / 100);

  return Math.round(premium);
};

// Method to add batch to coverage
insurancePolicySchema.methods.addBatch = function (batchId, grainType, quantityKg, coverageValue) {
  const existingBatch = this.covered_batches.find(batch =>
    batch.batch_id.toString() === batchId.toString()
  );

  if (existingBatch) {
    existingBatch.quantity_kg = quantityKg;
    existingBatch.coverage_value = coverageValue;
  } else {
    this.covered_batches.push({
      batch_id: batchId,
      grain_type: grainType,
      quantity_kg: quantityKg,
      coverage_value: coverageValue
    });
  }

  return this.save();
};

// Method to remove batch from coverage
insurancePolicySchema.methods.removeBatch = function (batchId) {
  this.covered_batches = this.covered_batches.filter(batch =>
    batch.batch_id.toString() !== batchId.toString()
  );

  return this.save();
};

// Method to update risk factors
insurancePolicySchema.methods.updateRiskFactors = function (factors) {
  Object.keys(factors).forEach(key => {
    if (this.risk_factors[key] !== undefined) {
      this.risk_factors[key] = factors[key];
    }
  });

  // Recalculate premium based on new risk factors
  this.premium_amount = this.calculatePremium();

  return this.save();
};

// Method to renew policy
insurancePolicySchema.methods.renew = function (newEndDate) {
  this.start_date = this.end_date;
  this.end_date = newEndDate;
  this.renewal_date = new Date(newEndDate.getTime() - 15 * 24 * 60 * 60 * 1000); // 15 days before expiry
  this.status = 'active';

  return this.save();
};

// Method to cancel policy
insurancePolicySchema.methods.cancel = function (reason) {
  this.status = 'cancelled';
  this.notes = this.notes ? `${this.notes}\nCancelled: ${reason}` : `Cancelled: ${reason}`;

  return this.save();
};

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
