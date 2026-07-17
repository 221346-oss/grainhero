const mongoose = require('mongoose');

const dispatchTransactionSchema = new mongoose.Schema({
    // Scoping
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    // References
    batch_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GrainBatch',
        required: true
    },
    batch_ref: String,
    buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Buyer',
        required: true
    },
    invoice_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'BuyerInvoice'
    },

    // Dispatch details
    grain_type: String,
    quantity_kg: {
        type: Number,
        required: true,
        min: 0
    },
    sell_price_per_kg: {
        type: Number,
        required: true,
        min: 0
    },
    total_amount: {
        type: Number,
        required: true
    },

    // Transport
    vehicle_number: String,
    driver_name: String,
    driver_contact: String,
    destination: String,
    transport_cost: Number,

    // Status
    status: {
        type: String,
        enum: ['pending', 'in_transit', 'delivered', 'cancelled'],
        default: 'delivered'
    },

    // Dates
    dispatch_date: {
        type: Date,
        default: Date.now
    },
    delivery_date: Date,

    // Notes
    notes: String,

    // Audit
    dispatched_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    versionKey: false
});

dispatchTransactionSchema.index({ admin_id: 1, dispatch_date: -1 });
dispatchTransactionSchema.index({ batch_id: 1 });
dispatchTransactionSchema.index({ buyer_id: 1 });

module.exports = mongoose.model('DispatchTransaction', dispatchTransactionSchema);
