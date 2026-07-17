const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  maintenanceType: { type: String, required: true },
  equipmentId: { type: String },
  maintenanceDate: { type: Date, required: true },
  performedBy: { type: String },
  description: { type: String },
  partsUsed: { type: String },
  laborHours: { type: Number },
  totalCost: { type: Number },
  nextMaintenanceDate: { type: Date },
  status: { type: String },
  priority: { type: String },
  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema); 