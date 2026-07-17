const mongoose = require('mongoose');
const { DEVICE_STATUSES, GEO_JSON_TYPES } = require('../configs/enum');

const warehouseSchema = new mongoose.Schema({
  // Basic identification
  warehouse_id: {
    type: String,
    required: [true, "Warehouse ID is required"],
    unique: true,
    trim: true,
    immutable: true
  },
  name: {
    type: String,
    required: [true, "Warehouse name is required"],
    trim: true
  },


  // Admin and tenant
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Admin ID is required"]
  },
  // Location information
  location: {
    description: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postal_code: String
    }
  },

  // Physical specifications
  total_capacity_kg: {
    type: Number,
    default: 0,
    min: [0, "Capacity cannot be negative"]
  },
  total_silos: {
    type: Number,
    default: 0,
    min: 0
  },

  // Status
  status: {
    type: String,
    enum: {
      values: Object.values(DEVICE_STATUSES),
      message: `Status must be one of: ${Object.values(DEVICE_STATUSES).join(", ")}`
    },
    default: DEVICE_STATUSES.ACTIVE
  },

  // Manager assignment (exactly one manager per warehouse)
  manager_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Will be set when manager is assigned
  },

  // Team members (technicians assigned to this warehouse)
  technician_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
    current_occupancy_kg: {
      type: Number,
      default: 0
    },
    utilization_percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    last_activity_date: Date
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

  // Notes and metadata
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
warehouseSchema.index({ admin_id: 1, status: 1 });
warehouseSchema.index({ manager_id: 1 });
warehouseSchema.index({ status: 1 });

// Ensure warehouse names are unique per admin
warehouseSchema.index({ admin_id: 1, name: 1 }, { unique: true });

// Exclude deleted warehouses by default
warehouseSchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

// Virtual for occupancy percentage
warehouseSchema.virtual('occupancy_percentage').get(function () {
  if (this.total_capacity_kg <= 0) return 0;
  return Math.round((this.statistics.current_occupancy_kg / this.total_capacity_kg) * 100);
});

// Virtual for available capacity
warehouseSchema.virtual('available_capacity_kg').get(function () {
  return Math.max(0, this.total_capacity_kg - this.statistics.current_occupancy_kg);
});

// Method to assign manager
warehouseSchema.methods.assignManager = function (managerId) {
  this.manager_id = managerId;
  return this.save();
};

// Method to add technician
warehouseSchema.methods.addTechnician = function (technicianId) {
  if (!this.technician_ids.includes(technicianId)) {
    this.technician_ids.push(technicianId);
  }
  return this.save();
};

// Method to remove technician
warehouseSchema.methods.removeTechnician = function (technicianId) {
  this.technician_ids = this.technician_ids.filter(
    id => id.toString() !== technicianId.toString()
  );
  return this.save();
};

// Method to update statistics
warehouseSchema.methods.updateStatistics = async function () {
  const Silo = mongoose.model('Silo');
  const silos = await Silo.find({ warehouse_id: this._id });

  this.total_silos = silos.length;
  this.total_capacity_kg = silos.reduce((sum, silo) => sum + (silo.capacity_kg || 0), 0);
  this.statistics.current_occupancy_kg = silos.reduce(
    (sum, silo) => sum + (silo.current_occupancy_kg || 0),
    0
  );
  this.statistics.utilization_percentage = this.total_capacity_kg > 0
    ? Math.round((this.statistics.current_occupancy_kg / this.total_capacity_kg) * 100)
    : 0;

  return this.save();
};

// Auto-generate warehouse_id if missing (before validate) using sequential W001 numbering per admin
warehouseSchema.pre('validate', async function () {
  if (this.isNew && !this.warehouse_id) {
    const Warehouse = mongoose.model('Warehouse');
    // Find max numeric suffix among this admin's warehouses
    const regex = /^W(\d{3})$/;
    const warehouses = await Warehouse.find({ admin_id: this.admin_id }).select('warehouse_id');
    let max = 0;
    for (const w of warehouses) {
      const m = regex.exec(w.warehouse_id || '');
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
    const next = (max + 1).toString().padStart(3, '0');
    this.warehouse_id = `W${next}`;
  }
});

module.exports = mongoose.model('Warehouse', warehouseSchema);

