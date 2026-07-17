const mongoose = require('mongoose');

const insuranceClaimSchema = new mongoose.Schema({
  // Basic claim information
  claim_number: {
    type: String,
    required: [true, "Claim number is required"],
    unique: true,
    trim: true
  },

  // Policy and administrative association
  policy_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsurancePolicy',
    required: [true, "Policy ID is required"]
  },
  admin_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, "Admin ID is required"],
    index: true
  },
  // Claim details
  claim_type: {
    type: String,
    enum: ['Fire', 'Theft', 'Spoilage', 'Weather Damage', 'Equipment Failure', 'Other'],
    required: [true, "Claim type is required"]
  },
  description: {
    type: String,
    required: [true, "Description is required"],
    trim: true
  },

  // Financial details
  amount_claimed: {
    type: Number,
    required: [true, "Amount claimed is required"],
    min: [0, "Amount claimed must be positive"]
  },
  amount_approved: {
    type: Number,
    default: 0,
    min: [0, "Amount approved must be positive"]
  },
  deductible_applied: {
    type: Number,
    default: 0,
    min: [0, "Deductible applied must be positive"]
  },

  // Claim status
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'partially_approved', 'closed'],
    default: 'pending'
  },

  // Dates
  incident_date: {
    type: Date,
    required: [true, "Incident date is required"]
  },
  filed_date: {
    type: Date,
    default: Date.now
  },
  reviewed_date: Date,
  approved_date: Date,
  closed_date: Date,

  // Affected grain batch
  batch_affected: {
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GrainBatch',
      required: [true, "Affected batch ID is required"]
    },
    grain_type: {
      type: String,
      required: [true, "Grain type is required"]
    },
    quantity_affected: {
      type: Number,
      required: [true, "Quantity affected is required"],
      min: [0, "Quantity affected must be positive"]
    },
    estimated_value: {
      type: Number,
      required: [true, "Estimated value is required"],
      min: [0, "Estimated value must be positive"]
    }
  },

  // Supporting documents
  documents: [{
    document_type: {
      type: String,
      enum: ['photo', 'report', 'invoice', 'receipt', 'police_report', 'weather_report', 'other']
    },
    document_url: String,
    uploaded_date: {
      type: Date,
      default: Date.now
    },
    description: String
  }],

  // Investigation details
  investigation: {
    investigator_name: String,
    investigation_date: Date,
    findings: String,
    cause_of_loss: String,
    preventability: {
      type: String,
      enum: ['preventable', 'partially_preventable', 'unpreventable']
    }
  },

  // Assessment details
  assessment: {
    assessor_name: String,
    assessment_date: Date,
    damage_assessment: String,
    repair_estimate: Number,
    replacement_cost: Number,
    depreciation: Number,
    final_settlement: Number
  },

  // Payment details
  payment: {
    payment_date: Date,
    payment_method: {
      type: String,
      enum: ['bank_transfer', 'check', 'wire_transfer', 'other']
    },
    payment_reference: String,
    payment_status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    }
  },

  // Communication log
  communications: [{
    date: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['email', 'phone', 'letter', 'meeting', 'system_update']
    },
    from: String,
    to: String,
    subject: String,
    message: String,
    attachments: [String]
  }],

  // Internal notes
  internal_notes: [{
    date: {
      type: Date,
      default: Date.now
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    note: String,
    is_internal: {
      type: Boolean,
      default: true
    }
  }],

  // Configuration
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  auto_assign: {
    type: Boolean,
    default: true
  },

  // Metadata
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
insuranceClaimSchema.index({ admin_id: 1, status: 1 });
insuranceClaimSchema.index({ policy_id: 1 });
insuranceClaimSchema.index({ incident_date: 1 });
insuranceClaimSchema.index({ filed_date: 1 });

// Exclude deleted claims by default
insuranceClaimSchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

// Virtual for claim processing time
insuranceClaimSchema.virtual('processing_days').get(function () {
  if (!this.approved_date && !this.closed_date) return null;

  const endDate = this.closed_date || this.approved_date;
  return Math.ceil((endDate - this.filed_date) / (1000 * 60 * 60 * 24));
});

// Virtual for claim status color
insuranceClaimSchema.virtual('status_color').get(function () {
  const colors = {
    pending: 'yellow',
    under_review: 'blue',
    approved: 'green',
    rejected: 'red',
    partially_approved: 'orange',
    closed: 'gray'
  };
  return colors[this.status] || 'gray';
});

// Method to approve claim
insuranceClaimSchema.methods.approve = function (approvedAmount, reviewerId) {
  this.status = 'approved';
  this.amount_approved = approvedAmount;
  this.approved_date = new Date();
  this.updated_by = reviewerId;

  // Add communication log
  this.communications.push({
    type: 'system_update',
    from: 'System',
    to: 'Claimant',
    subject: 'Claim Approved',
    message: `Your claim has been approved for $${approvedAmount.toLocaleString()}`
  });

  return this.save();
};

// Method to reject claim
insuranceClaimSchema.methods.reject = function (reason, reviewerId) {
  this.status = 'rejected';
  this.updated_by = reviewerId;

  // Add communication log
  this.communications.push({
    type: 'system_update',
    from: 'System',
    to: 'Claimant',
    subject: 'Claim Rejected',
    message: `Your claim has been rejected. Reason: ${reason}`
  });

  // Add internal note
  this.internal_notes.push({
    author: reviewerId,
    note: `Claim rejected. Reason: ${reason}`
  });

  return this.save();
};

// Method to add document
insuranceClaimSchema.methods.addDocument = function (documentType, documentUrl, description) {
  this.documents.push({
    document_type: documentType,
    document_url: documentUrl,
    description: description
  });

  return this.save();
};

// Method to add communication
insuranceClaimSchema.methods.addCommunication = function (type, from, to, subject, message) {
  this.communications.push({
    type: type,
    from: from,
    to: to,
    subject: subject,
    message: message
  });

  return this.save();
};

// Method to add internal note
insuranceClaimSchema.methods.addInternalNote = function (note, authorId) {
  this.internal_notes.push({
    author: authorId,
    note: note
  });

  return this.save();
};

// Method to update status
insuranceClaimSchema.methods.updateStatus = function (newStatus, updatedById) {
  this.status = newStatus;
  this.updated_by = updatedById;

  // Set appropriate date based on status
  switch (newStatus) {
    case 'under_review':
      this.reviewed_date = new Date();
      break;
    case 'approved':
      this.approved_date = new Date();
      break;
    case 'closed':
      this.closed_date = new Date();
      break;
  }

  return this.save();
};

module.exports = mongoose.model('InsuranceClaim', insuranceClaimSchema);
