const express = require("express");
const router = express.Router();
const User = require("../models/User");

/**
 * @swagger
 * /api/payment-verification:
 *   post:
 *     summary: Verify if user has completed payment
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Payment verification result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasPayment:
 *                   type: boolean
 *                 user:
 *                   type: object
 *       404:
 *         description: User not found
 */
router.post("/", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find user by email (case insensitive)
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${email.toLowerCase()}$`, "i") },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Please complete payment first.",
      });
    }

    // Check if user has completed payment (has customerId and hasAccess)
    const hasPayment =
      user.customerId && user.hasAccess && user.hasAccess !== "none";

    console.log("Payment verification for:", email);
    console.log("User found:", !!user);
    console.log("User role:", user.role);
    console.log("Has customerId:", !!user.customerId);
    console.log("Has access:", user.hasAccess);
    console.log("Has payment:", hasPayment);
    console.log("Full user object:", JSON.stringify(user, null, 2));

    res.status(200).json({
      success: true,
      hasPayment,
      user: hasPayment
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            hasAccess: user.hasAccess,
          }
        : null,
    });
  } catch (error) {
    console.error("Payment verification error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during payment verification",
    });
  }
});

module.exports = router;
