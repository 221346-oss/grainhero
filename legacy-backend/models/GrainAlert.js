const mongoose = require('mongoose');
const { ALERT_TYPES, ALERT_PRIORITIES, ALERT_ESCALATION_STATUSES, SENSOR_TYPES } = require('../configs/enum');

const grainAlertSchema = new mongoose.Schema({
  // Basic identification
  alert_id: {
    type: String,
    unique: true,
    required: [true, "Alert ID is required"]
  },
  
  // Admin and Tenant references
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Admin ID is required"],
    index: true
  },
  silo_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Silo',
    index: true
    // Not required — some alerts (subscription, insurance, user) are not silo-related
  },
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GrainBatch',
    index: true
  },
  device_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SensorDevice',
    index: true
  },
  
  // Alert details
  title: {
    type: String,
    required: [true, "Alert title is required"],
    trim: true,
    maxlength: [200, "Title cannot exceed 200 characters"]
  },
  message: {
    type: String,
    required: [true, "Alert message is required"],
    trim: true,
    maxlength: [1000, "Message cannot exceed 1000 characters"]
  },
  
  // Classification
  alert_type: {
    type: String,
    enum: {
      values: Object.values(ALERT_TYPES),
      message: `Alert type must be one of: ${Object.values(ALERT_TYPES).join(", ")}`
    },
    default: 'in-app'
  },
  priority: {
    type: String,
    enum: {
      values: Object.values(ALERT_PRIORITIES),
      message: `Priority must be one of: ${Object.values(ALERT_PRIORITIES).join(", ")}`
    },
    required: [true, "Priority is required"]
  },
  
  // Source information — expanded to cover all system events
  source: {
    type: String,
    enum: ['sensor', 'ai', 'manual', 'system', 'threshold', 'insurance', 'subscription', 'batch', 'payment', 'user'],
    required: [true, "Source is required"]
  },
  sensor_type: {
    type: String,
    enum: Object.values(SENSOR_TYPES)
  },
  
  // Trigger conditions
  trigger_conditions: {
    sensor_reading_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SensorReading'
    },
    threshold_type: {
      type: String,
      enum: ['min', 'max', 'critical_min', 'critical_max']
    },
    threshold_value: Number,
    actual_value: Number,
    deviation_percentage: Number
  },
  
  // Status and lifecycle
  status: {
    type: String,
    enum: {
      values: Object.values(ALERT_ESCALATION_STATUSES),
      message: `Status must be one of: ${Object.values(ALERT_ESCALATION_STATUSES).join(", ")}`
    },
    default: ALERT_ESCALATION_STATUSES.PENDING
  },
  
  // Timestamps
  triggered_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  acknowledged_at: Date,
  resolved_at: Date,
  
  // User interactions
  acknowledged_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolved_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Escalation
  escalation_level: {
    type: Number,
    default: 0,
    min: 0,
    max: 3
  },
  escalation_history: [{
    level: Number,
    escalated_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    escalated_at: Date,
    escalated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }],
  
  // Notification tracking
  notifications_sent: [{
    type: {
      type: String,
      enum: Object.values(ALERT_TYPES)
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sent_at: Date,
    delivery_status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending'
    },
    external_id: String, // For SMS/email tracking
    error_message: String
  }],
  
  // Actions taken
  actions_taken: [{
    action_type: {
      type: String,
      enum: ['manual_override', 'actuator_control', 'inspection', 'maintenance', 'other']
    },
    description: String,
    taken_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    taken_at: Date,
    effectiveness: {
      type: String,
      enum: ['effective', 'partially_effective', 'ineffective', 'unknown']
    }
  }],
  
  // AI and prediction context
  ai_context: {
    risk_score: {
      type: Number,
      min: 0,
      max: 100
    },
    prediction_confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    contributing_factors: [String],
    recommended_actions: [String]
  },
  
  // Environmental context
  environmental_context: {
    weather_conditions: {
      temperature: Number,
      humidity: Number,
      pressure: Number,
      conditions: String
    },
    seasonal_factor: String,
    historical_pattern: String
  },
  
  // Related alerts and incidents
  related_alerts: [{
    alert_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GrainAlert'
    },
    relationship_type: {
      type: String,
      enum: ['duplicate', 'related', 'follow_up', 'escalation']
    }
  }],
  
  // Resolution details
  resolution: {
    resolution_type: {
      type: String,
      enum: ['resolved', 'false_positive', 'acknowledged', 'escalated', 'auto_resolved']
    },
    resolution_notes: String,
    time_to_acknowledge: Number, // minutes
    time_to_resolve: Number, // minutes
    recurring: {
      type: Boolean,
      default: false
    }
  },
  
  // Configuration
  auto_resolve: {
    type: Boolean,
    default: false
  },
  auto_resolve_after: {
    type: Number,
    default: 24 // hours
  },
  suppress_similar: {
    type: Boolean,
    default: false
  },
  suppression_period: {
    type: Number,
    default: 60 // minutes
  },
  
  // Metadata
  tags: [String],
  custom_fields: mongoose.Schema.Types.Mixed,
  
  // Audit trail
  created_by: {
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

// Indexes for better query performance (alert_id already has unique index)
grainAlertSchema.index({ admin_id: 1, status: 1, triggered_at: -1 });
grainAlertSchema.index({ silo_id: 1, status: 1 });
grainAlertSchema.index({ priority: 1, status: 1 });
grainAlertSchema.index({ triggered_at: -1 });
grainAlertSchema.index({ assigned_to: 1, status: 1 });
grainAlertSchema.index({ source: 1, sensor_type: 1 });

// Compound indexes for common queries
grainAlertSchema.index({ 
  admin_id: 1, 
  priority: 1, 
  status: 1, 
  triggered_at: -1 
});

// Exclude deleted alerts by default
grainAlertSchema.pre(/^find/, function() {
  this.where({ deleted_at: null });
});

// Virtual for response time
grainAlertSchema.virtual('response_time_minutes').get(function() {
  if (!this.acknowledged_at) return null;
  return Math.round((this.acknowledged_at - this.triggered_at) / (1000 * 60));
});

// Virtual for resolution time
grainAlertSchema.virtual('resolution_time_minutes').get(function() {
  if (!this.resolved_at) return null;
  return Math.round((this.resolved_at - this.triggered_at) / (1000 * 60));
});

// Virtual for is active
grainAlertSchema.virtual('is_active').get(function() {
  return this.status === ALERT_ESCALATION_STATUSES.PENDING || 
         this.status === ALERT_ESCALATION_STATUSES.ACKNOWLEDGED;
});

// Method to acknowledge alert
grainAlertSchema.methods.acknowledge = function(userId, notes) {
  this.status = ALERT_ESCALATION_STATUSES.ACKNOWLEDGED;
  this.acknowledged_at = new Date();
  this.acknowledged_by = userId;
  
  if (notes) {
    this.actions_taken.push({
      action_type: 'other',
      description: `Acknowledged: ${notes}`,
      taken_by: userId,
      taken_at: new Date()
    });
  }
  
  return this.save();
};

// Method to resolve alert
grainAlertSchema.methods.resolve = function(userId, resolutionType, notes) {
  this.status = ALERT_ESCALATION_STATUSES.RESOLVED;
  this.resolved_at = new Date();
  this.resolved_by = userId;
  
  this.resolution = {
    resolution_type: resolutionType,
    resolution_notes: notes,
    time_to_acknowledge: this.acknowledged_at ? 
      Math.round((this.acknowledged_at - this.triggered_at) / (1000 * 60)) : null,
    time_to_resolve: Math.round((new Date() - this.triggered_at) / (1000 * 60))
  };
  
  return this.save();
};

// Method to escalate alert
grainAlertSchema.methods.escalate = function(userId, escalateToUserId, reason) {
  this.escalation_level += 1;
  this.assigned_to = escalateToUserId;
  
  this.escalation_history.push({
    level: this.escalation_level,
    escalated_to: escalateToUserId,
    escalated_at: new Date(),
    escalated_by: userId,
    reason: reason
  });
  
  return this.save();
};

// Method to add action taken
grainAlertSchema.methods.addAction = function(actionType, description, userId, effectiveness) {
  this.actions_taken.push({
    action_type: actionType,
    description: description,
    taken_by: userId,
    taken_at: new Date(),
    effectiveness: effectiveness
  });
  
  return this.save();
};

// Static method to get alert statistics
grainAlertSchema.statics.getStatistics = function(adminId, dateRange) {
  const matchQuery = { admin_id: adminId };
  
  if (dateRange) {
    matchQuery.triggered_at = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total_alerts: { $sum: 1 },
        critical_alerts: {
          $sum: { $cond: [{ $eq: ['$priority', ALERT_PRIORITIES.CRITICAL] }, 1, 0] }
        },
        high_alerts: {
          $sum: { $cond: [{ $eq: ['$priority', ALERT_PRIORITIES.HIGH] }, 1, 0] }
        },
        pending_alerts: {
          $sum: { $cond: [{ $eq: ['$status', ALERT_ESCALATION_STATUSES.PENDING] }, 1, 0] }
        },
        resolved_alerts: {
          $sum: { $cond: [{ $eq: ['$status', ALERT_ESCALATION_STATUSES.RESOLVED] }, 1, 0] }
        },
        avg_response_time: {
          $avg: {
            $cond: [
              { $ne: ['$acknowledged_at', null] },
              { $divide: [{ $subtract: ['$acknowledged_at', '$triggered_at'] }, 60000] },
              null
            ]
          }
        },
        avg_resolution_time: {
          $avg: {
            $cond: [
              { $ne: ['$resolved_at', null] },
              { $divide: [{ $subtract: ['$resolved_at', '$triggered_at'] }, 60000] },
              null
            ]
          }
        }
      }
    }
  ]);
};

// Generate unique alert ID
grainAlertSchema.pre('save', function(next) {
  if (!this.alert_id) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.alert_id = `AL-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('GrainAlert', grainAlertSchema);
