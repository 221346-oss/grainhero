const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User");
const crypto = require("crypto");
const sendEmail = require("../utils/emailHelper");

/**
 * @swagger
 * /api/create-checkout-session:
 *   post:
 *     summary: Create Stripe checkout session for subscription
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userEmail
 *               - planId
 *               - userName
 *               - userPassword
 *             properties:
 *               userEmail:
 *                 type: string
 *               planId:
 *                 type: string
 *               userName:
 *                 type: string
 *               userPassword:
 *                 type: string
 *               userPhone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Server error
 */

// Actual Stripe Price IDs from the dashboard (test mode)
const STRIPE_PRICE_IDS = {
  basic: process.env.STRIPE_PRICE_STARTER || "price_1TTqrWBMWljkQncg0iJJVodB",
  intermediate: process.env.STRIPE_PRICE_PROFESSIONAL || "price_1TTqstBMWljkQncg8O9FTIPT",
  pro: process.env.STRIPE_PRICE_ENTERPRISE || "price_1TTquLBMWljkQncgn9D967RC",
};

const IOT_PRICE_ID = process.env.STRIPE_PRICE_IOT || "price_1TTrDNBMWljkQncg27bD8rMq";

// Plan silo counts for IoT fee calculation
const PLAN_SILO_COUNTS = {
  basic: 3,
  intermediate: 6,
  pro: 15,
};

const PLAN_DETAILS = {
  basic: { name: "Starter", price: 1499 },
  intermediate: { name: "Professional", price: 3899 },
  pro: { name: "Enterprise", price: 5999 },
};

router.post("/", async (req, res) => {
  try {
    const { userEmail, planId, userName, userPassword, userPhone, iotQuantity } = req.body;

    if (!userEmail || !planId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userEmail, planId",
      });
    }

    const plan = PLAN_DETAILS[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: "Invalid plan ID. Choose: basic, intermediate, or pro",
      });
    }

    const priceId = STRIPE_PRICE_IDS[planId];
    if (!priceId) {
      return res.status(400).json({
        success: false,
        message: "Stripe price not configured for this plan",
      });
    }

    // Check if user already has this exact plan active
    let existingUser = null;
    try {
      existingUser = await User.findOne({ email: userEmail.toLowerCase() });
      if (
        existingUser &&
        existingUser.customerId &&
        existingUser.hasAccess &&
        existingUser.hasAccess === planId &&
        existingUser.role === "admin"
      ) {
        return res.status(400).json({
          success: false,
          message: "You already have this subscription active.",
        });
      }
    } catch (err) {
      console.log("User check skipped:", err.message);
    }

    // Generate a recovery token in case account creation fails after payment
    const recoveryToken = crypto.randomBytes(32).toString("hex");

    // IoT quantity: user selects 1 to max (based on plan), defaults to 1
    const maxSilos = PLAN_SILO_COUNTS[planId] || 3;
    const siloCount = Math.min(Math.max(1, parseInt(iotQuantity) || 1), maxSilos);
    // Line items: subscription + one-time IoT fee
    const line_items = [
      {
        price: priceId,
        quantity: 1,
      },
    ];

    if (siloCount > 0 && IOT_PRICE_ID) {
      line_items.push({
        price: IOT_PRICE_ID,
        quantity: siloCount,
      });
    }

    // Build the frontend URL
    const frontendUrl = process.env.FRONT_END_URL || "http://localhost:3000";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: line_items,
      mode: "subscription",
      customer_email: userEmail.toLowerCase(),
      success_url: `${frontendUrl}/auth/login?payment=success&session_id={CHECKOUT_SESSION_ID}&email=${encodeURIComponent(userEmail)}&status=activated`,
      cancel_url: `${frontendUrl}/checkout?cancelled=true`,
      metadata: {
        planId: planId,
        userEmail: userEmail.toLowerCase(),
        userName: userName || "",
        userPhone: userPhone || "",
        recoveryToken: recoveryToken,
        siloCount: String(siloCount),
        iotPriceId: IOT_PRICE_ID,
        iotBilledInCheckout: siloCount > 0 ? "true" : "false",
        hasSignupData: userName && userPassword ? "true" : "false",
      },
      subscription_data: {
        metadata: {
          planId: planId,
          userEmail: userEmail.toLowerCase(),
        },
      },
    });

    // If signup data was provided, pre-create the user as "pending"
    if (userName && userPassword) {
      try {
        if (!existingUser) {
          existingUser = new User({
            email: userEmail.toLowerCase(),
            name: userName,
            phone: userPhone || undefined,
            password: userPassword,
            role: "pending",
            hasAccess: "none",
            status: "active",
            emailVerified: false,
            recoveryToken: recoveryToken,
            recoveryTokenExpires: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
          });
          await existingUser.save();
          console.log("Pre-created pending user (plain password for model hook):", userEmail);
        } else {
          // Update existing user (pending or admin)
          existingUser.name = userName;
          if (userPhone) existingUser.phone = userPhone;
          existingUser.recoveryToken = recoveryToken;
          existingUser.recoveryTokenExpires = new Date(Date.now() + 72 * 60 * 60 * 1000);
          
          // Always update password if explicitly provided in this step
          // The User model has a pre-save hook that hashes the password automatically.
          // Setting it here in plain text ensures it gets hashed ONCE by the hook.
          existingUser.password = userPassword;
          
          await existingUser.save();
          console.log("Updated user password during checkout (plain password for model hook):", userEmail);
        }
      } catch (userErr) {
        console.error("Error pre-creating user:", userErr.message);
        // Don't fail the checkout - the webhook will handle user creation
      }
    }

    res.status(200).json({
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create checkout session",
      error: error.message,
    });
  }
});

module.exports = router;
