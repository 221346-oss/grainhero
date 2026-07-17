const mongoose = require('mongoose');

const buyerInvoiceSchema = new mongoose.Schema({
    // Tenant and admin scoping
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // Invoice identification
    invoice_number: {
        type: String,
        required: true,
        unique: true
    },

    // Buyer reference
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Buyer',
        required: true
    },
    buyer_name: String,
    buyer_company: String,
    buyer_contact: {
        email: String,
        phone: String,
        address: String
    },

    // Batch / dispatch reference
    batch_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GrainBatch',
        required: true
    },
    batch_ref: String, // e.g. "WB-001-2026"

    // Line items
    items: [{
        description: String,
        grain_type: String,
        quantity_kg: Number,
        price_per_kg: Number,
        amount: Number
    }],

    // Totals
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    total_amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'PKR'
    },

    // Payment
    payment_status: {
        type: String,
        enum: ['unpaid', 'paid', 'partial', 'overdue'],
        default: 'unpaid'
    },
    amount_paid: {
        type: Number,
        default: 0
    },
    payment_method: {
        type: String,
        enum: ['cash', 'bank_transfer', 'cheque', 'mobile_money', 'other']
    },
    due_date: Date,
    paid_at: Date,

    // PDF
    pdf_url: String,

    // Notes
    notes: String,

    // Email tracking
    emailed: { type: Boolean, default: false },
    emailed_at: Date,

    // Audit
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

buyerInvoiceSchema.index({ admin_id: 1, buyer_id: 1 });
buyerInvoiceSchema.index({ batch_id: 1 });
buyerInvoiceSchema.index({ payment_status: 1 });
module.exports = mongoose.model('BuyerInvoice', buyerInvoiceSchema);
