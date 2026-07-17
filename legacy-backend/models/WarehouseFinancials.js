const mongoose = require('mongoose');

const warehouseFinancialsSchema = new mongoose.Schema({
  // Warehouse reference
  warehouse_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: [true, "Warehouse ID is required"],
    unique: true
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Admin ID is required"],
    index: true
  },

  // Revenue and income
  revenue: {
    total_revenue: {
      type: Number,
      default: 0,
      min: 0
    },
    monthly_revenue: {
      type: Number,
      default: 0,
      min: 0
    },
    yearly_revenue: {
      type: Number,
      default: 0,
      min: 0
    },
    revenue_by_grain_type: [{
      grain_type: String,
      amount: { type: Number, default: 0 }
    }]
  },

  // Costs and expenses
  expenses: {
    total_expenses: {
      type: Number,
      default: 0,
      min: 0
    },
    monthly_expenses: {
      type: Number,
      default: 0,
      min: 0
    },
    operating_costs: {
      type: Number,
      default: 0,
      min: 0
    },
    maintenance_costs: {
      type: Number,
      default: 0,
      min: 0
    },
    labor_costs: {
      type: Number,
      default: 0,
      min: 0
    },
    utility_costs: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Profit and margins
  profit: {
    total_profit: {
      type: Number,
      default: 0
    },
    monthly_profit: {
      type: Number,
      default: 0
    },
    profit_margin_percentage: {
      type: Number,
      default: 0
    }
  },

  // Throughput metrics
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
    average_throughput_per_day: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Spoilage and loss
  spoilage: {
    total_spoilage_kg: {
      type: Number,
      default: 0,
      min: 0
    },
    spoilage_value_loss: {
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

  // Projections
  projections: {
    projected_revenue_next_month: {
      type: Number,
      default: 0
    },
    projected_revenue_next_quarter: {
      type: Number,
      default: 0
    },
    projected_revenue_next_year: {
      type: Number,
      default: 0
    },
    projected_profit_next_month: {
      type: Number,
      default: 0
    },
    projected_profit_next_quarter: {
      type: Number,
      default: 0
    },
    projection_confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    last_projection_date: Date
  },

  // Performance trends
  trends: {
    revenue_trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable'],
      default: 'stable'
    },
    profit_trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable'],
      default: 'stable'
    },
    throughput_trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable'],
      default: 'stable'
    },
    spoilage_trend: {
      type: String,
      enum: ['increasing', 'decreasing', 'stable'],
      default: 'stable'
    }
  },

  // Historical data (monthly snapshots)
  monthly_snapshots: [{
    month: String, // Format: "YYYY-MM"
    revenue: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    throughput_kg: { type: Number, default: 0 },
    spoilage_kg: { type: Number, default: 0 },
    spoilage_value_loss: { type: Number, default: 0 }
  }],

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
warehouseFinancialsSchema.index({ 'projections.last_projection_date': -1 });

// Method to calculate profit
warehouseFinancialsSchema.methods.calculateProfit = function () {
  this.profit.total_profit = this.revenue.total_revenue - this.expenses.total_expenses;
  this.profit.monthly_profit = this.revenue.monthly_revenue - this.expenses.monthly_expenses;

  if (this.revenue.total_revenue > 0) {
    this.profit.profit_margin_percentage = Math.round(
      (this.profit.total_profit / this.revenue.total_revenue) * 100
    );
  }

  return this.save();
};

// Method to update trends
warehouseFinancialsSchema.methods.updateTrends = function () {
  if (this.monthly_snapshots.length >= 2) {
    const recent = this.monthly_snapshots.slice(-2);
    const older = this.monthly_snapshots.slice(-3, -1);

    // Revenue trend
    if (recent.length === 2 && older.length >= 1) {
      const recentAvg = (recent[0].revenue + recent[1].revenue) / 2;
      const olderAvg = older[0].revenue;
      this.trends.revenue_trend = recentAvg > olderAvg ? 'increasing' :
        recentAvg < olderAvg ? 'decreasing' : 'stable';
    }

    // Profit trend
    if (recent.length === 2 && older.length >= 1) {
      const recentAvg = (recent[0].profit + recent[1].profit) / 2;
      const olderAvg = older[0].profit;
      this.trends.profit_trend = recentAvg > olderAvg ? 'increasing' :
        recentAvg < olderAvg ? 'decreasing' : 'stable';
    }
  }

  return this.save();
};

module.exports = mongoose.model('WarehouseFinancials', warehouseFinancialsSchema);

