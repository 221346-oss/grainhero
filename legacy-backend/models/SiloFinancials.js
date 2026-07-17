const mongoose = require('mongoose');

const siloFinancialsSchema = new mongoose.Schema({
  // Silo reference
  silo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Silo',
    required: [true, "Silo ID is required"],
    unique: true
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Admin ID is required"],
    index: true
  },

  // Revenue contribution
  revenue: {
    total_revenue_contribution: {
      type: Number,
      default: 0,
      min: 0
    },
    monthly_revenue_contribution: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Throughput contribution
  throughput: {
    total_kg_processed: {
      type: Number,
      default: 0,
      min: 0
    },
    monthly_kg_processed: {
      type: Number,
      default: 0,
      min: 0
    },
    batches_processed: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Spoilage risk impact
  spoilage_risk: {
    current_risk_score: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    potential_loss_kg: {
      type: Number,
      default: 0,
      min: 0
    },
    potential_value_loss: {
      type: Number,
      default: 0,
      min: 0
    },
    actual_spoilage_kg: {
      type: Number,
      default: 0,
      min: 0
    },
    actual_value_loss: {
      type: Number,
      default: 0,
      min: 0
    },
    spoilage_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },

  // Operational efficiency
  efficiency: {
    utilization_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    average_storage_duration_days: {
      type: Number,
      default: 0,
      min: 0
    },
    turnover_rate: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Cost per batch
  cost_metrics: {
    average_cost_per_batch: {
      type: Number,
      default: 0,
      min: 0
    },
    average_cost_per_kg: {
      type: Number,
      default: 0,
      min: 0
    },
    maintenance_cost_per_month: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Currency
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'PKR', 'EUR', 'GBP', 'INR']
  },

  // Audit trail
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  last_calculated_at: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  versionKey: false
});

// Indexes
siloFinancialsSchema.index({ 'spoilage_risk.current_risk_score': -1 });

// Method to calculate spoilage percentage
siloFinancialsSchema.methods.calculateSpoilagePercentage = function (totalKg) {
  if (totalKg > 0) {
    this.spoilage_risk.spoilage_percentage = Math.round(
      (this.spoilage_risk.actual_spoilage_kg / totalKg) * 100
    );
  }
  return this.save();
};

// Method to update efficiency metrics
siloFinancialsSchema.methods.updateEfficiency = async function () {
  const Silo = mongoose.model('Silo');
  const GrainBatch = mongoose.model('GrainBatch');

  const silo = await Silo.findById(this.silo_id);
  if (!silo) return this;

  // Calculate utilization
  if (silo.capacity_kg > 0) {
    this.efficiency.utilization_percentage = Math.round(
      (silo.current_occupancy_kg / silo.capacity_kg) * 100
    );
  }

  // Calculate average storage duration
  const batches = await GrainBatch.find({ silo_id: this.silo_id });
  if (batches.length > 0) {
    const totalDays = batches.reduce((sum, batch) => {
      return sum + (batch.storage_duration_days || 0);
    }, 0);
    this.efficiency.average_storage_duration_days = Math.round(totalDays / batches.length);
  }

  return this.save();
};

module.exports = mongoose.model('SiloFinancials', siloFinancialsSchema);

