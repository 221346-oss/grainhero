const mongoose = require("mongoose");
const {
  SUBSCRIPTION_STATUSES,
  BILLING_CYCLES,
  PAYMENT_STATUSES,
} = require("../configs/enum");

const subscriptionSchema = new mongoose.Schema(
  {
    // Admin and Tenant reference
    admin_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    // Plan details
    plan_name: {
      type: String,
      required: [true, "Plan name is required"],
      enum: [
        "Grain Starter",
        "Grain Professional",
        "Grain Enterprise",
        "Grain Enterprise Plus",
        "Custom",
      ],
      default: "Grain Starter",
    },
    plan_description: String,

    // Pricing
    price_per_month: {
      type: Number,
      required: [true, "Monthly price is required"],
      min: [0, "Price cannot be negative"],
    },
    price_per_year: {
      type: Number,
      min: [0, "Price cannot be negative"],
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "PKR", "EUR", "GBP", "INR"],
    },

    // Billing cycle
    billing_cycle: {
      type: String,
      enum: Object.values(BILLING_CYCLES),
      default: BILLING_CYCLES.MONTHLY,
    },

    // Subscription dates
    start_date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    end_date: {
      type: Date,
      required: true,
    },
    trial_end_date: Date,

    // Status
    status: {
      type: String,
      enum: Object.values(SUBSCRIPTION_STATUSES),
      default: SUBSCRIPTION_STATUSES.ACTIVE,
    },

    // Payment information
    payment_status: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.PENDING,
    },
    last_payment_date: Date,
    next_payment_date: Date,
    payment_method: String,

    // Stripe integration
    stripe_subscription_id: String,
    stripe_customer_id: String,
    stripe_price_id: String,

    // Features and limits
    features: {
      max_users: {
        type: Number,
        default: 5,
      },
      max_devices: {
        type: Number,
        default: 10,
      },
      max_storage_gb: {
        type: Number,
        default: 1,
      },
      max_batches: {
        type: Number,
        default: 100,
      },
      ai_features: {
        type: Boolean,
        default: false,
      },
      priority_support: {
        type: Boolean,
        default: false,
      },
      custom_integrations: {
        type: Boolean,
        default: false,
      },
      advanced_analytics: {
        type: Boolean,
        default: false,
      },
    },

    // Usage tracking
    current_usage: {
      users: {
        type: Number,
        default: 0,
      },
      devices: {
        type: Number,
        default: 0,
      },
      storage_gb: {
        type: Number,
        default: 0,
      },
      batches: {
        type: Number,
        default: 0,
      },
    },

    // Auto-renewal
    auto_renew: {
      type: Boolean,
      default: true,
    },

    // Cancellation
    cancellation_date: Date,
    cancellation_reason: String,

    // Discounts and promotions
    discount_percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    discount_amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    promo_code: String,

    // Metadata
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },

    // Audit fields
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

// Indexes
subscriptionSchema.index({ admin_id: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ end_date: 1 });
subscriptionSchema.index({ stripe_subscription_id: 1 });
subscriptionSchema.index({ created_at: -1 });

// Exclude deleted subscriptions by default
subscriptionSchema.pre(/^find/, function () {
  this.where({ deleted_at: null });
});

// Virtual for days until expiry
subscriptionSchema.virtual("days_until_expiry").get(function () {
  if (!this.end_date) return null;
  const now = new Date();
  const diffTime = this.end_date - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is_expired
subscriptionSchema.virtual("is_expired").get(function () {
  return this.end_date && this.end_date < new Date();
});

// Virtual for is_trial
subscriptionSchema.virtual("is_trial").get(function () {
  return this.trial_end_date && this.trial_end_date > new Date();
});

// Method to calculate effective price
subscriptionSchema.methods.getEffectivePrice = function () {
  let price =
    this.billing_cycle === BILLING_CYCLES.YEARLY
      ? this.price_per_year
      : this.price_per_month;

  if (this.discount_percentage > 0) {
    price = price * (1 - this.discount_percentage / 100);
  }

  if (this.discount_amount > 0) {
    price = Math.max(0, price - this.discount_amount);
  }

  return price;
};

// Method to check if feature is available
subscriptionSchema.methods.hasFeature = function (featureName) {
  return this.features[featureName] === true;
};

// Method to check usage limits
subscriptionSchema.methods.isWithinLimit = function (usageType, currentUsage) {
  const limit = this.features[`max_${usageType}`];
  return limit === -1 || currentUsage <= limit; // -1 means unlimited
};

// Method to soft delete
subscriptionSchema.methods.softDelete = function () {
  this.deleted_at = new Date();
  this.status = SUBSCRIPTION_STATUSES.CANCELLED;
  return this.save();
};

// Method to cancel subscription
subscriptionSchema.methods.cancel = function (reason) {
  this.status = SUBSCRIPTION_STATUSES.CANCELLED;
  this.cancellation_date = new Date();
  this.cancellation_reason = reason;
  this.auto_renew = false;
  return this.save();
};

// Method to renew subscription
subscriptionSchema.methods.renew = function (months = 1) {
  const currentEndDate = this.end_date;
  const newEndDate = new Date(currentEndDate);
  newEndDate.setMonth(newEndDate.getMonth() + months);

  this.end_date = newEndDate;
  this.status = SUBSCRIPTION_STATUSES.ACTIVE;
  this.next_payment_date = newEndDate;

  return this.save();
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
