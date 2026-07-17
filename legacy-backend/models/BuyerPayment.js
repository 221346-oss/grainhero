const mongoose = require('mongoose');

const buyerPaymentSchema = new mongoose.Schema({
    // Scoping
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // References
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Buyer',
        required: true
    },
    invoice_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BuyerInvoice'
    },
    batch_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GrainBatch'
    },

    // Payment details
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'PKR'
    },
    payment_method: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'mobile_money', 'other'],
        required: true
    },
    payment_reference: String, // cheque number, bank ref, etc.
    payment_date: {
        type: Date,
        default: Date.now
    },
    notes: String,

    // Status
    status: {
        type: String,
        enum: ['completed', 'pending', 'cancelled'],
        default: 'completed'
    },

    // Audit
    recorded_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

buyerPaymentSchema.index({ admin_id: 1, buyer_id: 1 });
buyerPaymentSchema.index({ invoice_id: 1 });
buyerPaymentSchema.index({ batch_id: 1 });
buyerPaymentSchema.index({ payment_date: -1 });

module.exports = mongoose.model('BuyerPayment', buyerPaymentSchema);
