const mongoose = require("mongoose");
const { BUYER_STATUSES, BUYER_TYPES, GRAIN_TYPES } = require("../configs/enum");

const buyerSchema = new mongoose.Schema(
  {
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: {
      type: String,
      required: [true, "Buyer name is required"],
      trim: true,
    },
    company_name: {
      type: String,
      trim: true,
    },
    buyer_type: {
      type: String,
      enum: Object.values(BUYER_TYPES),
    },
    contact_person: {
      name: {
        type: String,
        required: [true, "Contact name is required"],
      },
      email: {
        type: String,
        trim: true,
      },
      phone: {
        type: String,
        trim: true,
      },
      designation: String,
    },
    location: {
      address: String,
      city: String,
      state: String,
      country: {
        type: String,
        default: "Pakistan",
      },
    },
    status: {
      type: String,
      enum: Object.values(BUYER_STATUSES),
      default: BUYER_STATUSES.ACTIVE,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 4,
    },
    notes: String,
    tags: [String],
    preferred_grain_types: [
      {
        type: String,
        enum: Object.values(GRAIN_TYPES),
      },
    ],
    preferred_payment_terms: String,
    linked_batches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GrainBatch",
      },
    ],
    last_interaction_at: Date,
    last_order_at: Date,
    deleted_at: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    versionKey: false,
  }
);

buyerSchema.index({ admin_id: 1, status: 1 });
buyerSchema.index({ "contact_person.email": 1 });
buyerSchema.index({ "location.city": 1 });

buyerSchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

module.exports = mongoose.model("Buyer", buyerSchema);

