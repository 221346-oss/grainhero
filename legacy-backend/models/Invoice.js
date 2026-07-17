const mongoose = require("mongoose");
const { PAYMENT_STATUSES } = require("../configs/enum");

const invoiceSchema = new mongoose.Schema({
    admin_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    subscription_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subscription",
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: "USD"
    },
    status: {
        type: String,
        enum: Object.values(PAYMENT_STATUSES),
        default: PAYMENT_STATUSES.PENDING
    },
    billing_date: {
        type: Date,
        default: Date.now
    },
    due_date: {
        type: Date
    },
    paid_at: {
        type: Date
    },
    invoice_number: {
        type: String,
        unique: true
    },
    stripe_invoice_id: String
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
});

module.exports = mongoose.model("Invoice", invoiceSchema);
