const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  images: [
    {
      type: String,
      required: true,
    },
  ],
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: false, // Will be set by user via map API later
  },
  ratings: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      value: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String },
      _id: false
    }
  ],
  tags: [
    {
      type: String,
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema); 