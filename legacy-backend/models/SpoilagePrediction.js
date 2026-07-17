const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const spoilagePredictionSchema = new mongoose.Schema({
  // Basic identification
  prediction_id: {
    type: String,
    required: [true, "Prediction ID is required"],
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
  batch_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GrainBatch'
  },
  
  // Prediction details
  prediction_type: {
    type: String,
    enum: ['mold', 'aflatoxin', 'insect', 'general_spoilage', 'quality_degradation'],
    required: [true, "Prediction type is required"]
  },
  
  // Risk assessment
  risk_score: {
    type: Number,
    min: 0,
    max: 100,
    required: [true, "Risk score is required"]
  },
  risk_level: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: [true, "Risk level is required"]
  },
  
  // Prediction confidence
  confidence_score: {
    type: Number,
    min: 0,
    max: 1,
    required: [true, "Confidence score is required"]
  },
  
  // Time-based predictions
  prediction_horizon: {
    type: Number,
    required: [true, "Prediction horizon is required"],
    min: 1,
    max: 30 // days
  },
  predicted_date: {
    type: Date,
    required: [true, "Predicted date is required"]
  },
  
  // Environmental factors
  environmental_factors: {
    temperature: {
      current: Number,
      trend: String, // 'increasing', 'decreasing', 'stable'
      impact_score: Number
    },
    humidity: {
      current: Number,
      trend: String,
      impact_score: Number
    },
    co2: {
      current: Number,
      trend: String,
      impact_score: Number
    },
    moisture: {
      current: Number,
      trend: String,
      impact_score: Number
    },
    air_quality: {
      current: Number,
      trend: String,
      impact_score: Number
    }
  },
  
  // Grain-specific factors
  grain_factors: {
    grain_type: String,
    storage_duration_days: Number,
    initial_quality_score: Number,
    moisture_content: Number,
    temperature_history: [Number],
    humidity_history: [Number]
  },
  
  // Model information
  model_info: {
    model_version: String,
    model_type: String, // 'xgboost', 'neural_network', 'ensemble'
    training_data_size: Number,
    last_trained: Date,
    accuracy_score: Number
  },
  
  // Feature importance
  feature_importance: {
    temperature: Number,
    humidity: Number,
    co2: Number,
    moisture: Number,
    storage_duration: Number,
    air_quality: Number,
    grain_type: Number,
    seasonal_factors: Number
  },
  
  // Prediction details
  prediction_details: {
    primary_risk_factors: [String],
    secondary_risk_factors: [String],
    mitigation_effectiveness: Number,
    time_to_spoilage: Number, // hours
    severity_indicators: [String]
  },
  
  // Validation tracking
  validation_status: {
    type: String,
    enum: ['pending', 'validated', 'false_positive', 'false_negative', 'expired'],
    default: 'pending'
  },
  actual_outcome: {
    spoilage_occurred: Boolean,
    spoilage_type: String,
    spoilage_date: Date,
    severity_level: String,
    validation_notes: String
  },
  
  // Advisory generation
  advisories_generated: [{
    advisory_id: String,
    priority: String,
    action_type: String,
    description: String,
    effectiveness_score: Number,
    implementation_time: Number, // minutes
    cost_estimate: Number
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
spoilagePredictionSchema.index({ admin_id: 1, prediction_type: 1 });
spoilagePredictionSchema.index({ silo_id: 1, risk_level: 1 });
spoilagePredictionSchema.index({ predicted_date: 1, risk_score: -1 });
spoilagePredictionSchema.index({ validation_status: 1, created_at: -1 });

// Exclude deleted predictions by default
spoilagePredictionSchema.pre(/^find/, function() {
  this.where({ deleted_at: null });
});

// Virtual for prediction accuracy
spoilagePredictionSchema.virtual('prediction_accuracy').get(function() {
  if (this.validation_status === 'validated') {
    return this.actual_outcome?.spoilage_occurred === (this.risk_score > 70);
  }
  return null;
});

// Method to update validation status
spoilagePredictionSchema.methods.updateValidation = function(actualOutcome) {
  // Store validation data
  this.actual_outcome = {
    spoilage_occurred: actualOutcome.spoilage_occurred || false,
    spoilage_type: actualOutcome.spoilage_type || null,
    spoilage_date: actualOutcome.spoilage_date ? new Date(actualOutcome.spoilage_date) : null,
    severity_level: actualOutcome.severity_level || null,
    validation_notes: actualOutcome.validation_notes || '',
    validated_by: actualOutcome.validated_by || null,
    validated_at: actualOutcome.validated_at || new Date()
  };
  
  // Determine validation status based on prediction vs actual outcome
  // High risk threshold: 60 (medium/high/critical)
  const predictedHighRisk = this.risk_score >= 60;
  const actualSpoilage = actualOutcome.spoilage_occurred || false;
  
  if (predictedHighRisk === actualSpoilage) {
    // Prediction matches reality
    this.validation_status = 'validated';
  } else if (predictedHighRisk && !actualSpoilage) {
    // Predicted risk but no spoilage occurred (false alarm)
    this.validation_status = 'false_positive';
  } else if (!predictedHighRisk && actualSpoilage) {
    // Did not predict risk but spoilage occurred (missed case)
    this.validation_status = 'false_negative';
  } else {
    // Default to validated if unclear
    this.validation_status = 'validated';
  }
  
  // Update timestamp
  this.updated_at = new Date();
  
  return this.save();
};

// Method to generate advisories
spoilagePredictionSchema.methods.generateAdvisories = function() {
  const advisories = [];
  const riskFactors = this.prediction_details.primary_risk_factors;
  
  // Temperature-related advisories
  if (riskFactors.includes('temperature')) {
    advisories.push({
      advisory_id: uuidv4(),
      priority: this.risk_level === 'critical' ? 'high' : 'medium',
      action_type: 'temperature_control',
      description: 'Adjust temperature control systems to maintain optimal range',
      effectiveness_score: 0.8,
      implementation_time: 30,
      cost_estimate: 50
    });
  }
  
  // Humidity-related advisories
  if (riskFactors.includes('humidity')) {
    advisories.push({
      advisory_id: uuidv4(),
      priority: this.risk_level === 'critical' ? 'high' : 'medium',
      action_type: 'humidity_control',
      description: 'Increase ventilation or activate dehumidification systems',
      effectiveness_score: 0.75,
      implementation_time: 45,
      cost_estimate: 100
    });
  }
  
  // Air quality advisories
  if (riskFactors.includes('air_quality')) {
    advisories.push({
      advisory_id: uuidv4(),
      priority: 'medium',
      action_type: 'air_quality_improvement',
      description: 'Improve air circulation and filtration systems',
      effectiveness_score: 0.7,
      implementation_time: 60,
      cost_estimate: 150
    });
  }
  
  // Inspection advisories
  if (this.risk_level === 'high' || this.risk_level === 'critical') {
    advisories.push({
      advisory_id: uuidv4(),
      priority: 'high',
      action_type: 'inspection',
      description: 'Conduct immediate visual inspection of storage area',
      effectiveness_score: 0.9,
      implementation_time: 15,
      cost_estimate: 25
    });
  }
  
  // Emergency actions for critical risk
  if (this.risk_level === 'critical') {
    advisories.push({
      advisory_id: uuidv4(),
      priority: 'critical',
      action_type: 'emergency_response',
      description: 'Implement emergency spoilage prevention measures',
      effectiveness_score: 0.95,
      implementation_time: 120,
      cost_estimate: 500
    });
  }
  
  this.advisories_generated = advisories;
  return advisories;
};

// Static method to get prediction statistics
spoilagePredictionSchema.statics.getPredictionStats = function(tenantId, timeRange = 30) {
  const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    { $match: { admin_id: tenantId, created_at: { $gte: startDate } } },
    {
      $group: {
        _id: null,
        total_predictions: { $sum: 1 },
        avg_risk_score: { $avg: '$risk_score' },
        avg_confidence: { $avg: '$confidence_score' },
        high_risk_predictions: {
          $sum: { $cond: [{ $gte: ['$risk_score', 70] }, 1, 0] }
        },
        critical_predictions: {
          $sum: { $cond: [{ $gte: ['$risk_score', 90] }, 1, 0] }
        },
        validated_predictions: {
          $sum: { $cond: [{ $eq: ['$validation_status', 'validated'] }, 1, 0] }
        },
        false_positives: {
          $sum: { $cond: [{ $eq: ['$validation_status', 'false_positive'] }, 1, 0] }
        },
        false_negatives: {
          $sum: { $cond: [{ $eq: ['$validation_status', 'false_negative'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to get predictions by risk level
spoilagePredictionSchema.statics.getPredictionsByRisk = function(tenantId, riskLevel) {
  return this.find({
    admin_id: tenantId,
    risk_level: riskLevel,
    predicted_date: { $gte: new Date() }
  })
  .populate('silo_id', 'name silo_id')
  .populate('batch_id', 'batch_id grain_type')
  .sort({ risk_score: -1, predicted_date: 1 });
};

module.exports = mongoose.model('SpoilagePrediction', spoilagePredictionSchema);
