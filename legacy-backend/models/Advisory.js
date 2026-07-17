const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const advisorySchema = new mongoose.Schema({
  // Basic identification
  advisory_id: {
    type: String,
    required: [true, "Advisory ID is required"],
    unique: true,
    default: () => uuidv4()
  },
  
  // References
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
  prediction_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SpoilagePrediction'
  },
  
  // Advisory details
  title: {
    type: String,
    required: [true, "Advisory title is required"],
    trim: true
  },
  description: {
    type: String,
    required: [true, "Advisory description is required"],
    trim: true
  },
  
  // Classification
  advisory_type: {
    type: String,
    enum: [
      'preventive', 'corrective', 'emergency', 'maintenance', 
      'inspection', 'monitoring', 'environmental', 'equipment'
    ],
    required: [true, "Advisory type is required"]
  },
  
  // Priority and severity
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: [true, "Priority is required"]
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: [true, "Severity is required"]
  },
  
  // Action details
  action_type: {
    type: String,
    enum: [
      'temperature_control', 'humidity_control', 'ventilation', 
      'inspection', 'cleaning', 'maintenance', 'monitoring',
      'emergency_response', 'equipment_adjustment', 'data_collection'
    ],
    required: [true, "Action type is required"]
  },
  
  // Implementation details
  implementation_details: {
    steps: [{
      step_number: Number,
      description: String,
      estimated_time: Number, // minutes
      required_resources: [String],
      safety_considerations: [String]
    }],
    estimated_duration: Number, // minutes
    required_skills: [String],
    required_equipment: [String],
    safety_requirements: [String]
  },
  
  // Effectiveness and impact
  effectiveness_score: {
    type: Number,
    min: 0,
    max: 1,
    required: [true, "Effectiveness score is required"]
  },
  impact_assessment: {
    spoilage_prevention: Number, // 0-1
    cost_savings: Number, // estimated savings
    risk_reduction: Number, // 0-1
    implementation_cost: Number,
    maintenance_cost: Number
  },
  
  // Timing
  urgency_level: {
    type: String,
    enum: ['immediate', 'urgent', 'soon', 'scheduled'],
    required: [true, "Urgency level is required"]
  },
  recommended_timing: {
    start_time: Date,
    completion_deadline: Date,
    optimal_conditions: [String]
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['generated', 'assigned', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'generated'
  },
  implementation_status: {
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assigned_at: Date,
    started_at: Date,
    completed_at: Date,
    progress_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    }
  },
  
  // Results and feedback
  implementation_results: {
    actual_duration: Number, // minutes
    actual_cost: Number,
    effectiveness_achieved: Number, // 0-1
    issues_encountered: [String],
    lessons_learned: [String],
    follow_up_required: Boolean,
    follow_up_notes: String
  },
  
  // AI/ML context
  ai_context: {
    model_version: String,
    confidence_score: Number,
    feature_importance: mongoose.Schema.Types.Mixed,
    prediction_accuracy: Number,
    learning_feedback: mongoose.Schema.Types.Mixed
  },
  
  // Environmental context
  environmental_context: {
    temperature: Number,
    humidity: Number,
    air_quality: Number,
    weather_conditions: String,
    seasonal_factors: [String]
  },
  
  // Related advisories
  related_advisories: [{
    advisory_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Advisory'
    },
    relationship_type: {
      type: String,
      enum: ['prerequisite', 'follow_up', 'alternative', 'conflicting']
    }
  }],
  
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
advisorySchema.index({ admin_id: 1, status: 1 });
advisorySchema.index({ silo_id: 1, priority: 1 });
advisorySchema.index({ advisory_type: 1, urgency_level: 1 });
advisorySchema.index({ created_at: -1, priority: 1 });

// Exclude deleted advisories by default
advisorySchema.pre(/^find/, function() {
  this.where({ deleted_at: null });
});

// Virtual for completion status
advisorySchema.virtual('is_completed').get(function() {
  return this.status === 'completed';
});

// Virtual for overdue status
advisorySchema.virtual('is_overdue').get(function() {
  if (!this.recommended_timing?.completion_deadline) return false;
  return new Date() > this.recommended_timing.completion_deadline && this.status !== 'completed';
});

// Method to assign advisory
advisorySchema.methods.assignTo = function(userId) {
  this.status = 'assigned';
  this.implementation_status.assigned_to = userId;
  this.implementation_status.assigned_at = new Date();
  this.updated_by = userId;
  return this.save();
};

// Method to start implementation
advisorySchema.methods.startImplementation = function() {
  this.status = 'in_progress';
  this.implementation_status.started_at = new Date();
  return this.save();
};

// Method to complete implementation
advisorySchema.methods.completeImplementation = function(results) {
  this.status = 'completed';
  this.implementation_status.completed_at = new Date();
  this.implementation_status.progress_percentage = 100;
  this.implementation_results = {
    ...results,
    completed_at: new Date()
  };
  return this.save();
};

// Method to update progress
advisorySchema.methods.updateProgress = function(percentage, notes = '') {
  this.implementation_status.progress_percentage = Math.min(100, Math.max(0, percentage));
  
  if (!this.implementation_results) {
    this.implementation_results = {};
  }
  
  if (notes) {
    this.implementation_results.progress_notes = notes;
  }
  
  return this.save();
};

// Method to calculate effectiveness score
advisorySchema.methods.calculateEffectiveness = function() {
  const factors = [
    this.effectiveness_score,
    this.implementation_results?.effectiveness_achieved || 0,
    this.impact_assessment?.spoilage_prevention || 0,
    this.impact_assessment?.risk_reduction || 0
  ];
  
  return factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
};

// Static method to get advisories by priority
advisorySchema.statics.getByPriority = function(tenantId, priority) {
  return this.find({
    admin_id: tenantId,
    priority: priority,
    status: { $in: ['generated', 'assigned', 'in_progress'] }
  })
  .populate('silo_id', 'name silo_id')
  .populate('prediction_id', 'prediction_id risk_score')
  .sort({ created_at: -1 });
};

// Static method to get overdue advisories
advisorySchema.statics.getOverdue = function(tenantId) {
  const now = new Date();
  return this.find({
    admin_id: tenantId,
    status: { $in: ['generated', 'assigned', 'in_progress'] },
    'recommended_timing.completion_deadline': { $lt: now }
  })
  .populate('silo_id', 'name silo_id')
  .sort({ 'recommended_timing.completion_deadline': 1 });
};

// Static method to get advisory statistics
advisorySchema.statics.getStatistics = function(tenantId, timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { admin_id: tenantId, created_at: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        total_advisories: { $sum: 1 },
        completed_advisories: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        in_progress_advisories: {
          $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
        },
        overdue_advisories: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$status', 'completed'] },
                  { $lt: ['$recommended_timing.completion_deadline', new Date()] }
                ]
              },
              1,
              0
            ]
          }
        },
        avg_effectiveness: { $avg: '$effectiveness_score' },
        high_priority_count: {
          $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
        },
        critical_priority_count: {
          $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Advisory', advisorySchema);
