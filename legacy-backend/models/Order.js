const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderStatus: { 
    type: String, 
    required: true, 
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  cardNumber: { type: String, required: true },
  expiryDate: { type: String, required: true },
  cvv: { type: String, required: true },
  cardName: { type: String, required: true },
  orderNotes: { type: String },
  products: { type: [productSchema], required: true },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema); 