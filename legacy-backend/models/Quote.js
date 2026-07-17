const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const QuoteSchema = new mongoose.Schema({
  quoteId: {
    type: String,
    unique: true,
    required: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productCurrentPrice: {
    type: Number,
    required: true
  },
  buyerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  buyerName: {
    type: String,
    required: true
  },
  buyerEmail: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  buyerPhone: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'approved', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

// Assign a unique quoteId automatically if not set
QuoteSchema.pre('save', function(next) {
  if (!this.quoteId) {
    this.quoteId = uuidv4();
  }
  next();
});

module.exports = mongoose.model('Quote', QuoteSchema); 