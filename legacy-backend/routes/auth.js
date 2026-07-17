const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const { auth } = require("../middleware/auth");
const admin = require("../middleware/admin");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const crypto = require("crypto");
require("dotenv").config();
const sendEmail = require("../utils/emailHelper");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  secure: true,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

let streamUpload = (req) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) {
        resolve(result);
      } else {
        reject(error);
      }
    });
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });
};

async function uploadFile(req) {
  let result = await streamUpload(req);
  return result;
}

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new use
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               confirm_password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User Registered Successfully
 *       400:
 *         description: Bad request
 */
// Register Route
router.post("/signup", async (req, res) => {
  const { name, email, phone, password, confirm_password, invitation_token } =
    req.body;
  let invitationData = null;

  console.log("=== SIGNUP DEBUG ===");
  console.log("Request body:", {
    name,
    email,
    phone,
    invitation_token: invitation_token ? "PRESENT" : "NOT_PRESENT",
  });
  console.log("MongoDB connection state:", mongoose.connection.readyState); // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting

  try {
    console.log("Validation check - field values:", {
      name: name ? "PRESENT" : "MISSING",
      email: email ? "PRESENT" : "MISSING",
      password: password ? "PRESENT" : "MISSING",
      confirm_password: confirm_password ? "PRESENT" : "MISSING"
    });

    if (!name || !email || !password || !confirm_password) {
      console.log("Validation failed: Missing required fields");
      return res
        .status(400)
        .json({ error: "Name, email, password, and confirm_password are required" });
    }
    if (password !== confirm_password) {
      console.log("Password validation failed:", {
        passwordLength: password ? password.length : 0,
        confirmPasswordLength: confirm_password ? confirm_password.length : 0,
        passwordsMatch: password === confirm_password
      });
      return res.status(400).json({ error: "Passwords do not match" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailRegex)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    // Check for existing users first (especially for pending paying users)
    // This check happens before role determination to handle paid users who need to complete signup

    // Debug: Check specifically for the email we're looking for
    console.log("Looking for user with email:", email);
    const emailUser = await User.findOne({ email });
    console.log("User found with exact email:", emailUser ? {
      id: emailUser._id.toString(),
      email: emailUser.email,
      role: emailUser.role,
      customerId: emailUser.customerId,
      hasAccess: emailUser.hasAccess
    } : "NOT_FOUND");

    // Check for phone if provided
    let phoneUser = null;
    if (phone) {
      phoneUser = await User.findOne({ phone });
      console.log("User found with phone:", phoneUser ? {
        id: phoneUser._id.toString(),
        email: phoneUser.email,
        role: phoneUser.role,
        customerId: phoneUser.customerId,
        hasAccess: phoneUser.hasAccess
      } : "NOT_FOUND");
    }

    // Query for existing user considering email and phone (if provided)
    let existingUser = null;

    // Check for invitation token first
    if (invitation_token) {
      console.log("Looking for invitation with token:", invitation_token);

      // Look for user with invitation token that hasn't expired
      invitationData = await User.findOne({
        invitationToken: invitation_token,
        invitationExpires: { $gt: Date.now() },
      }).select("+invitationToken +invitationRole");

      console.log("Valid invitation found:", invitationData ? "YES" : "NO");
      if (invitationData) {
        console.log("Valid invitation details:", {
          email: invitationData.email,
          role: invitationData.role,
          invitationRole: invitationData.invitationRole,
          expires: invitationData.invitationExpires,
        });

        // Use the invitation user as the existing user
        existingUser = invitationData;
      }
    }

    // If no invitation was found, check for existing users with email/phone
    if (!invitationData) {
      if (phone) {
        existingUser = await User.findOne({ $or: [{ email }, { phone }] });
      } else {
        // If phone is not provided, only check for email
        existingUser = await User.findOne({ email });
      }
    }

    if (existingUser && !invitationData) {
      console.log("Existing user found with details:", {
        id: existingUser._id,
        role: existingUser.role,
        customerId: existingUser.customerId,
        hasAccess: existingUser.hasAccess,
        email: existingUser.email
      });

      // Check if this is a pending user who has already paid (from webhook)
      if (
        existingUser.role === "admin" &&
        existingUser.customerId &&
        existingUser.hasAccess &&
        existingUser.emailVerified
      ) {
        console.log(
          "User already exists as admin with payment:",
          email
        );
        // User already completed signup, return success
        return res.status(200).json({
          message: "Account already exists! You can login with your credentials.",
          user: {
            id: existingUser._id,
            name: existingUser.name,
            email: existingUser.email,
            role: existingUser.role,
            hasAccess: existingUser.hasAccess,
          },
          hasAccess: existingUser.hasAccess,
        });
      } else if (
        existingUser.role === "pending" &&
        existingUser.customerId &&
        existingUser.hasAccess
      ) {
        console.log(
          "Found pending user with payment, updating to admin:",
          email
        );

        // Import plan mapping to set subscription_plan correctly
        const {
          checkoutPlanIdToPlanKey,
        } = require("../configs/plan-mapping");

        // Update the existing user with password and role
        existingUser.name = name;
        existingUser.phone = phone || existingUser.phone;
        existingUser.password = password;
        existingUser.role = "admin"; // Set as admin since they paid
        existingUser.emailVerified = true;

        // Ensure subscription_plan is set from hasAccess
        if (
          existingUser.hasAccess &&
          existingUser.hasAccess !== "none" &&
          !existingUser.subscription_plan
        ) {
          existingUser.subscription_plan = checkoutPlanIdToPlanKey(
            existingUser.hasAccess
          );
        }

        try {
          await existingUser.save();
          console.log("Successfully updated pending user to admin");

          // Generate JWT token
          const token = jwt.sign(
            {
              userId: existingUser._id,
              email: existingUser.email,
              role: existingUser.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
          );

          return res.status(201).json({
            message: "Account activated successfully! You can now login.",
            user: {
              id: existingUser._id,
              name: existingUser.name,
              email: existingUser.email,
              role: existingUser.role,
              hasAccess: existingUser.hasAccess,
            },
            token,
            hasAccess: existingUser.hasAccess,
          });
        } catch (error) {
          console.error("Error updating pending user:", error);
          return res
            .status(500)
            .json({ error: "Failed to activate account. Please try again." });
        }
      } else {
        console.log("User already exists with email/phone:", {
          email,
          phone,
        });
        // Check which field is causing the conflict
        const emailExists = await User.findOne({ email });
        const phoneExists = await User.findOne({ phone: { $exists: true, $ne: null, $ne: "" } });

        if (emailExists && phoneExists) {
          return res.status(400).json({
            error:
              "Both email and phone number are already in use. Please use different credentials or try logging in.",
          });
        } else if (emailExists) {
          return res.status(400).json({
            error:
              "An account with this email already exists. Please use a different email or try logging in.",
          });
        } else {
          return res.status(400).json({
            error:
              "An account with this phone number already exists. Please use a different phone number.",
          });
        }
      }
    }

    // If we reach here, no existing user was found, continue with normal signup flow
    // Skip the duplicate check that was here before (lines 383-479) since we already handled it above

    // If invitation was found, use that user data
    if (invitationData) {
      existingUser = invitationData;
    }

    // Determine role based on signup context
    const userCount = await User.countDocuments();
    const isFirstUser = userCount === 0;

    // Role hierarchy: admin -> manager -> technician
    // First user = admin (tenant owner), invited users get assigned roles
    let userRole;
    if (isFirstUser) {
      userRole = "admin"; // First user becomes admin (tenant owner)
    } else {
      // Check if this is an invited user with a specific role
      const invitationToken = req.body.invitation_token;
      if (invitationToken) {
        // Handle invited user signup (will be implemented below)
        const invitation = await User.findOne({
          invitationToken: invitationToken,
          invitationExpires: { $gt: Date.now() },
        }).select("+invitationToken +invitationRole");

        if (invitation) {
          userRole = invitation.invitationRole || "technician";
        } else {
          return res
            .status(400)
            .json({ error: "Invalid or expired invitation token" });
        }
      } else {
        // Check if this user is completing signup after payment (via webhook)
        // This applies to users who paid for subscription and are now completing registration
        if (req.body.email && req.body.password) {
          // Check if this user exists as a pending user with payment info (from webhook)
          const pendingUser = await User.findOne({
            email: req.body.email,
            role: "pending",
            customerId: { $exists: true },
            hasAccess: { $exists: true }
          });
          
          if (pendingUser && pendingUser.hasAccess !== "none") {
            // This is a user who has paid and is completing signup
            // Set their role to admin since they paid for a subscription
            userRole = "admin";
          } else {
            // Regular signup without invitation - only admin can be created this way, 
            // managers and technicians must be invited
            return res
              .status(400)
              .json({ error: "Managers and technicians must be invited by an admin" });
          }
        } else {
          // Regular signup without invitation - only admin can be created this way, 
          // managers and technicians must be invited
          return res
            .status(400)
            .json({ error: "Managers and technicians must be invited by an admin" });
        }
      }
    }

    let userData = {
      name,
      email,
      phone,
      password, // Will be hashed automatically by the model's pre-save hook
      role: userRole,
      address: {
        city: "Islamabad",
      },
    };

    // Handle invitation token if present
    if (invitation_token) {
      console.log("Looking for invitation with token:", invitation_token);
      console.log("Current time:", Date.now());

      // First, let's check if any user with this token exists
      const tokenExists = await User.findOne({
        invitationToken: invitation_token,
      }).select("+invitationToken +invitationRole");

      console.log("User with token exists:", tokenExists ? "YES" : "NO");
      if (tokenExists) {
        console.log("Token user details:", {
          email: tokenExists.email,
          role: tokenExists.role,
          invitationRole: tokenExists.invitationRole,
          invitationExpires: tokenExists.invitationExpires,
          isExpired: tokenExists.invitationExpires < Date.now(),
        });
      }

      // Now check with expiration
      invitationData = await User.findOne({
        invitationToken: invitation_token,
        invitationExpires: { $gt: Date.now() },
      }).select("+invitationToken +invitationRole");

      console.log("Valid invitation found:", invitationData ? "YES" : "NO");
      if (invitationData) {
        console.log("Valid invitation details:", {
          email: invitationData.email,
          role: invitationData.role,
          invitationRole: invitationData.invitationRole,
          expires: invitationData.invitationExpires,
        });
      }

      if (!invitationData) {
        console.log("Invalid or expired invitation token");
        return res
          .status(400)
          .json({ error: "Invalid or expired invitation token" });
      }
    }

    // The duplicate user check has been moved above to avoid conflicts
    // This section was causing the signup flow to fail for users who paid via Stripe

    // Handle tenant association based on role
    if (userRole === "super_admin") {
      // Super admin doesn't need a tenant, they manage the entire system
      userData.admin_id = null; // Super admin doesn't belong to a specific admin
    } else if (userRole === "admin") {
      // Admin is the top-level owner
    }

    // Handle admin context
    if (userRole === "admin") {
      // Admins are independent owners
    } else if (userRole === "manager" || userRole === "technician") {
      // Manager and Technician are assigned an admin_id via invitation
    }

    // If this is an invited user, update the invitation record instead of creating new
    if (invitationData) {
      console.log("Updating invitation record for user:", email);
      // Update the existing invitation record with the new user data
      invitationData.name = name;
      invitationData.phone = phone || invitationData.phone; // Keep existing phone if not provided
      invitationData.password = password;
      // Update role from pending to the invited role
      invitationData.role = invitationData.invitationRole || "technician";
      invitationData.invitationToken = undefined;
      invitationData.invitationExpires = undefined;
      invitationData.emailVerified = true;

      // Ensure warehouse_id is set for invited users
      if (userRole === "manager" || userRole === "technician") {

        // Assign warehouse for managers and technicians
        if (userRole === "manager") {
          const Warehouse = require("../models/Warehouse");

          // For basic plan, there's only one warehouse per admin
          // Find the admin's warehouse (create one if it doesn't exist)
          let warehouse = await Warehouse.findOne({
            admin_id: invitationData.admin_id
          });

          if (!warehouse) {
            // Create the first (and only) warehouse for this admin
            const admin = await User.findById(invitationData.admin_id);
            const warehouseId = `WH-${admin.email.split('@')[0].toUpperCase()}-${Date.now()}`;

            warehouse = new Warehouse({
              warehouse_id: warehouseId,
              name: `Warehouse for ${admin.name || admin.email}`,
              admin_id: invitationData.admin_id,
              manager_id: invitationData._id,
              created_by: invitationData.admin_id
            });

            await warehouse.save();
            console.log(`Created and assigned warehouse ${warehouseId} to manager ${invitationData.email}`);
          } else {
            // Assign this manager to the existing warehouse
            warehouse.manager_id = invitationData._id;
            await warehouse.save();
            console.log(`Assigned manager ${invitationData.email} to existing warehouse ${warehouse.warehouse_id}`);
          }

          invitationData.warehouse_id = warehouse._id;
          console.log("Set warehouse_id for manager:", warehouse._id);
        } else if (userRole === "technician") {
          const Warehouse = require("../models/Warehouse");

          // For technicians, find the admin's warehouse
          let warehouse = await Warehouse.findOne({
            admin_id: invitationData.admin_id
          });

          if (warehouse) {
            // Assign technician to the warehouse and add to technician_ids array
            invitationData.warehouse_id = warehouse._id;

            // Add technician to warehouse's technician_ids array if not already there
            if (!warehouse.technician_ids.includes(invitationData._id)) {
              warehouse.technician_ids.push(invitationData._id);
              await warehouse.save();
            }

            console.log(`Assigned technician ${invitationData.email} to warehouse ${warehouse.warehouse_id}`);
          } else {
            // If no warehouse exists, create one for this admin
            const admin = await User.findById(invitationData.admin_id);
            const warehouseId = `WH-${admin.email.split('@')[0].toUpperCase()}-${Date.now()}`;

            warehouse = new Warehouse({
              warehouse_id: warehouseId,
              name: `Warehouse for ${admin.name || admin.email}`,
              admin_id: invitationData.admin_id,
              technician_ids: [invitationData._id],
              created_by: invitationData.admin_id
            });

            await warehouse.save();
            invitationData.warehouse_id = warehouse._id;

            console.log(`Created and assigned warehouse ${warehouseId} to technician ${invitationData.email}`);
          }
        }
      }

      console.log("Saving updated user record...");
      try {
        await invitationData.save();
        console.log("User record saved successfully");
        console.log("Final user data:", {
          id: invitationData._id,
          name: invitationData.name,
          role: invitationData.role,
          emailVerified: invitationData.emailVerified,
        });
        res.status(200).json({ msg: "User Registered Successfully" });
      } catch (saveError) {
        console.error("Error saving user record:", saveError);
        res
          .status(500)
          .json({ error: "Failed to save user data: " + saveError.message });
      }
    } else {
      // Create new user
      let user = new User(userData);

      await user.save();

      res.status(200).json({ msg: "User Registered Successfully" });
    }
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "hammad@gmail.com"
 *               password:
 *                 type: string
 *                 example: "1234"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid credentials
 */
// Login Route
router.post("/login", async (req, res) => {
  const token = req.header("Authorization");
  if (token) {
    return res.status(401).json({ error: "Already Logged In" });
  }
  const { email, password } = req.body;

  try {
    // Include password in the query since it's select: false by default
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      console.log("User not found:", email);
      return res.status(400).json({ error: "Invalid Credentials" });
    }

    if (user.blocked) {
      console.log("User blocked:", user.email);
      return res.status(400).json({ error: "Account Blocked" });
    }

    // Use the model's comparePassword method
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log("Password mismatch for user:", user.email);
      return res.status(400).json({ error: "Invalid Credentials" });
    }

    // Check if user requires 2FA
    if (user.requiresTwoFactor()) {
      // Generate 2FA code and send via email
      const twoFactorCode = user.generateTwoFactorCode();
      await user.save();

      // Create temporary token for 2FA verification
      const tempPayload = {
        userId: user.id,
        email: user.email,
        requires2FA: true
      };
      const tempToken = jwt.sign(tempPayload, process.env.JWT_SECRET, { expiresIn: '10m' });

      // Send 2FA code via email
      const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
                <h2 style="color: #2d3748;">Two-Factor Authentication</h2>
                <p style="color: #4a5568;">Hello <b>${user.name || user.email}</b>,</p>
                <p style="color: #4a5568;">Your verification code is:</p>
                <div style="margin: 24px 0; padding: 16px; background: #edf2f7; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 4px;">
                  ${twoFactorCode}
                </div>
                <p style="color: #718096; font-size: 13px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} GrainHero. All rights reserved.</p>
            </div>
          `;

      await sendEmail(
        user.email,
        "Two-Factor Authentication Code",
        `Your 2FA verification code is: ${twoFactorCode}`,
        html
      );

      return res.status(200).json({
        requires2FA: true,
        message: "Two-factor authentication required. Please check your email for the verification code.",
        tempToken: tempToken,
        userId: user.id
      });
    }

    // If no 2FA required, proceed with normal login
    // Track first login for welcome experience
    const isFirstLogin = user.firstLogin === true;
    if (isFirstLogin) {
      user.firstLogin = false;
      await user.save();
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        name: user.fullName || user.name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        hasAccess: user.hasAccess,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          id: user.id,
          role: user.role,
          avatar: user.avatar,
          name: user.fullName || user.name,
          email: user.email,
          phone: user.phone,
          hasAccess: user.hasAccess,
          firstLogin: isFirstLogin,
          subscriptionPlan: user.subscription_plan,
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

// Verify 2FA Route
router.post("/verify-2fa", async (req, res) => {
  try {
    const { code, tempToken } = req.body;

    if (!code || !tempToken) {
      return res.status(400).json({ error: "Verification code and temporary token are required" });
    }

    // Verify the temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ error: "Invalid or expired temporary token" });
    }

    // Find the user
    const user = await User.findById(decoded.userId).select("+two_factor_code +two_factor_code_expires");
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    // Verify the 2FA code
    if (!user.verifyTwoFactorCode(code)) {
      // Clear the code to prevent replay attacks
      await user.clearTwoFactorCode();
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    // Clear the code after successful verification
    await user.clearTwoFactorCode();

    // Generate final JWT token
    const payload = {
      user: {
        id: user.id,
        role: user.role,
        name: user.fullName || user.name,
        email: user.email,
        avatar: user.avatar,
        phone: user.phone,
        hasAccess: user.hasAccess,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          id: user.id,
          role: user.role,
          avatar: user.avatar,
          name: user.fullName || user.name,
          email: user.email,
          phone: user.phone,
          hasAccess: user.hasAccess,
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

// Toggle 2FA Route
router.patch("/toggle-2fa", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Only allow 2FA toggle for specific roles
    const allowedRoles = ["superadmin", "admin", "manager"];
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "2FA can only be toggled for superadmin, admin, and manager roles" });
    }

    // Toggle 2FA setting
    user.two_factor_enabled = !user.two_factor_enabled;
    await user.save();

    res.json({
      message: `Two-factor authentication ${user.two_factor_enabled ? 'enabled' : 'disabled'} successfully`,
      twoFactorEnabled: user.two_factor_enabled
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server Error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/upload-image:
 *   post:
 *     summary: Upload an image
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded
 *       401:
 *         description: Unauthorized
 */
// Upload Image Route
router.post("/upload-image", auth, upload.single("image"), async (req, res) => {
  try {
    const result = await uploadFile(req);
    res.status(200).json({ image_url: result.secure_url });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ error: "An error occurred while uploading the image" });
  }
});

/**
 * @swagger
 * /auth/upload-profilePic:
 *   post:
 *     summary: Upload a profile picture
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded
 *       401:
 *         description: Unauthorized
 */
// Upload Profile Picture Route
router.post(
  "/upload-profilePic",
  auth,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const result = await uploadFile(req);
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      user.avatar = result.secure_url;
      await user.save();
      res.status(200).json({ avatar: result.secure_url });
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json({ error: "An error occurred while uploading the avatar" });
    }
  }
);

/**
 * @swagger
 * /auth/auth/change-password:
 *   patch:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
// Route to change password
router.patch("/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate request body
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Both current password and new password are required",
      });
    }

    // Password validation
    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "New password must be at least 6 characters long",
      });
    }

    // Get user from database with password field
    const user = await User.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password using model method
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    // Set new password (will be hashed automatically by the model's pre-save hook)
    user.password = newPassword;

    // Save updated user
    await user.save();

    res.json({
      message: "Password updated successfully",
      timestamp: new Date(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      error: "Server error",
      details: error.message,
    });
  }
});

/**
 * @swagger
 * /auth/forget-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
// Route to send password reset email
router.post("/forget-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour expiry
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    console.log("Password reset token generated:", resetToken);
    console.log("Token expiry:", new Date(resetTokenExpiry));
    // Construct reset link
    const resetLink = `${process.env.FRONT_END_URL}/auth/reset-password?token=${resetToken}`;
    // Create HTML email content
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
                <h2 style="color: #2d3748;">Password Reset Request</h2>
                <p style="color: #4a5568;">Hello <b>${user.name || user.email
      }</b>,</p>
                <p style="color: #4a5568;">We received a request to reset your password. Click the button below to set a new password. This link will expire in 1 hour.</p>
                <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #3182ce; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
                <p style="color: #718096; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} GrainHero. All rights reserved.</p>
            </div>
        `;
    // Send email with HTML content
    await sendEmail(
      user.email,
      "Password Reset Request",
      `Click the link to reset your password: ${resetLink}`,
      html
    );
    res
      .status(200)
      .json({ message: "Password reset email sent", resetLink: resetLink });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset user password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Bad request
 *       404:
 *         description: Invalid or expired token
 */
router.post("/reset-password", async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;
  if (!token || !newPassword || !confirmPassword) {
    return res
      .status(400)
      .json({ error: "Token, newPassword, and confirmPassword are required" });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match" });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }
  try {
    // Explicitly select the reset password fields to ensure they're included
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      console.log(
        "No user found with token:",
        token,
        "Current time:",
        Date.now()
      );
      return res.status(404).json({ error: "Invalid or expired token" });
    }
    // Set new password (will be hashed automatically by the model's pre-save hook)
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Debug route to check if a reset token exists (remove in production)
router.get("/debug-token/:token", async (req, res) => {
  try {
    const token = req.params.token;
    const user = await User.findOne({ resetPasswordToken: token });

    if (!user) {
      return res.json({
        found: false,
        message: "No user found with this token",
      });
    }

    const isExpired = user.resetPasswordExpires < Date.now();

    res.json({
      found: true,
      expired: isExpired,
      tokenExpires: new Date(user.resetPasswordExpires),
      currentTime: new Date(),
      userEmail: user.email,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/check-token:
 *   post:
 *     summary: Check if a JWT token is valid
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token is valid
 *       401:
 *         description: Invalid or expired token
 */
// Route to check if JWT token is valid
router.post("/check-token", async (req, res) => {
  // Try to get token from Authorization header or body

  console.log(req.body);

  let token = req.header("Authorization");
  if (!token && req.body.token) {
    token = req.body.token;
  }
  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }
  // Remove 'Bearer ' prefix if present
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.status(200).json({ valid: true, payload: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
});

/**
 * @swagger
 * /auth/user/{userId}:
 *   get:
 *     summary: Get user details by user ID
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *       400:
 *         description: Invalid userId format
 *       404:
 *         description: User not found
 */
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  // Validate userId format (MongoDB ObjectId)
  if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
    return res
      .status(400)
      .json({ error: "Invalid userId format. Must be a MongoDB ObjectId." });
  }
  try {
    const user = await User.findById(userId).select(
      "-password -resetPasswordToken -resetPasswordExpires -__v"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get all users
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
// delete in production
/**
 * @swagger
 * /auth/users:
 *   get:
 *     summary: Get team members (filtered by role)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of team members
 *       401:
 *         description: Unauthorized
 */
router.get("/users", auth, async (req, res) => {
  try {
    const user = req.user;
    const { USER_ROLES } = require("../configs/enum");
    let query = {};

    // Super Admin: See ALL users globally (all admins who purchased plans + their managers and technicians)
    if (user.role === USER_ROLES.SUPER_ADMIN) {
      query = {}; // No filter - see everything
    }
    // Admin: See only managers and technicians added by him (under him), NOT other admins
    else if (user.role === USER_ROLES.ADMIN) {
      query = {
        $or: [
          { admin_id: user._id }, // Their team members (managers and technicians)
          { _id: user._id }        // Include themselves
        ]
      };
    }
    // Manager: Can see admin, other managers, but CRUD only on technicians
    else if (user.role === USER_ROLES.MANAGER) {
      // Manager can see:
      // 1. Their admin
      // 2. Other managers under the same admin
      // 3. Technicians in their warehouse
      const admin = await User.findById(user.admin_id);
      query = {
        $or: [
          { _id: user.admin_id },                    // Their admin
          { admin_id: user.admin_id, role: USER_ROLES.MANAGER }, // Other managers under same admin
          { warehouse_id: user.warehouse_id, role: USER_ROLES.TECHNICIAN } // Technicians in their warehouse
        ]
      };
    }
    // Technician: Just see (read-only, no CRUD)
    else if (user.role === USER_ROLES.TECHNICIAN) {
      // Technician can see:
      // 1. Their admin
      // 2. Their manager
      // 3. Other technicians in their warehouse
      const Warehouse = require("../models/Warehouse");
      const warehouse = await Warehouse.findById(user.warehouse_id);
      query = {
        $or: [
          { _id: user.admin_id },                    // Their admin
          { _id: warehouse?.manager_id },            // Their manager
          { warehouse_id: user.warehouse_id, role: USER_ROLES.TECHNICIAN } // Other technicians in warehouse
        ]
      };
    }
    else {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    const users = await User.find(query)
      .select("-password -resetPasswordToken -resetPasswordExpires -__v")
      .populate("admin_id", "name email")
      .populate("warehouse_id", "name warehouse_id")
      .sort({ created_at: -1 });

    res.status(200).json(users);
  } catch (err) {
    console.error("Error fetching team members:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/create-manager:
 *   post:
 *     summary: Create a new manager (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Manager created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/create-manager", auth, admin, async (req, res) => {
  const { name, email, phone, password, location } = req.body;
  try {
    if (!name || !email || !phone || !password || !location) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailRegex)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    let existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email or phone is already in use" });
    }
    let user = new User({
      name,
      email,
      phone,
      password,
      role: "manager",
      location,
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    res
      .status(201)
      .json({ message: "Manager created successfully", user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /auth/create-technician:
 *   post:
 *     summary: Create a new technician (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - password
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: Technician created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/create-technician", auth, admin, async (req, res) => {
  const { name, email, phone, password, location } = req.body;
  try {
    if (!name || !email || !phone || !password || !location) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailRegex)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    let existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email or phone is already in use" });
    }
    let user = new User({
      name,
      email,
      phone,
      password,
      role: "technician",
      location,
    });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();
    const userObj = user.toObject();
    delete userObj.password;
    res
      .status(201)
      .json({ message: "Technician created successfully", user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* /auth/profile:
*   get:
*     summary: Get current user profile
*     tags: [Auth]
*     security:
*       - bearerAuth: []
*     responses:
*       200:
*         description: User profile
*         content:
*           application/json:
*             schema:
*               type: object
*               properties:
*                 id:
*                   type: string
*                 name:
*                   type: string
*                 email:
*                   type: string
*                 phone:
*                   type: string
*                 avatar:
*                   type: string
*                 role:
*                   type: string
*       401:
*         description: Unauthorized
*   patch:
*     summary: Update user profile (name, phone)
*     tags: [Auth]
*     security:
*       - bearerAuth: []
*     requestBody:
*       required: true
*       content:
*         application/json:
*           schema:
*             type: object
*             properties:
*               name:
*                 type: string
*               phone:
*                 type: string
*     responses:
*       200:
*         description: Profile updated
*       400:
*         description: Bad request
*       401:
*         description: Unauthorized
*/
// Get current user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update user profile (name, phone)
router.patch("/profile", auth, async (req, res) => {
  try {
    const { name, phone, address, preferences, department, avatar } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get current authenticated user info
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -resetPasswordToken -resetPasswordExpires -__v"
    );
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      language: user.language || "en",
      phone: user.phone,
      avatar: user.avatar,
      hasAccess: user.hasAccess || "none",
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     summary: Update current user profile or password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *               preferences:
 *                 type: object
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *               avatar:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.patch("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ error: "User not found" });

    // CASE 1: Password Change
    if (req.body.currentPassword) {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ error: "New password and confirm password are required" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password" });
      }

      user.password = newPassword;
      await user.save();

      return res.json({ message: "Password updated successfully" });
    }

    // CASE 2: Profile Update
    const { name, phone, address, preferences, department, avatar } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    // Return updated user object
    const updatedUser = await User.findById(user._id).select("-password");
    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      }
    });

  } catch (err) {
    console.error("Error updating /auth/me:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     summary: Update current user profile or password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *               preferences:
 *                 type: object
 *               avatar:
 *                 type: string
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.patch("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ error: "User not found" });

    // CASE 1: Password Change
    if (req.body.currentPassword) {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ error: "New password and confirm password are required" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password" });
      }

      user.password = newPassword;
      await user.save();

      return res.json({ message: "Password updated successfully" });
    }

    // CASE 2: Profile Update
    const { name, phone, address, preferences, department, avatar } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar; // Allow updating avatar URL directly

    await user.save();

    // Return updated user object
    const updatedUser = await User.findById(user._id).select("-password");
    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      }
    });

  } catch (err) {
    console.error("Error updating /auth/me:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/me:
 *   patch:
 *     summary: Update current user profile or password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               address:
 *                 type: object
 *               preferences:
 *                 type: object
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.patch("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("+password");
    if (!user) return res.status(404).json({ error: "User not found" });

    // CASE 1: Password Change
    if (req.body.currentPassword) {
      const { currentPassword, newPassword, confirmPassword } = req.body;

      if (!newPassword || !confirmPassword) {
        return res.status(400).json({ error: "New password and confirm password are required" });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({ error: "Incorrect current password" });
      }

      user.password = newPassword;
      await user.save();

      return res.json({ message: "Password updated successfully" });
    }

    // CASE 2: Profile Update
    const { name, phone, address, preferences, department } = req.body;

    if (name) user.name = name;
    if (phone) user.phone = phone;

    await user.save();

    // Return updated user object
    const updatedUser = await User.findById(user._id).select("-password");
    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      }
    });

  } catch (err) {
    console.error("Error updating /auth/me:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/invite-team-member:
 *   post:
 *     summary: Invite a team member (admin only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [manager, technician]
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Invitation sent successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post("/invite-team-member", auth, async (req, res) => {
  try {
    console.log("=== INVITE TEAM MEMBER DEBUG ===");
    console.log("Request body:", req.body);
    console.log("User from auth:", req.user);

    const { email, role, name } = req.body;

    const { USER_ROLES } = require("../configs/enum");

    // Super Admin, Admin, and Manager can invite team members
    if (req.user.role !== USER_ROLES.SUPER_ADMIN &&
      req.user.role !== USER_ROLES.ADMIN &&
      req.user.role !== USER_ROLES.MANAGER) {
      console.log("Access denied: User role is", req.user.role);
      return res
        .status(403)
        .json({ error: "Insufficient permissions to invite team members" });
    }

    if (!email || !role) {
      console.log("Validation failed: Missing email or role");
      return res.status(400).json({ error: "Email and role are required" });
    }

    // Manager can only invite technicians
    if (req.user.role === USER_ROLES.MANAGER && role !== USER_ROLES.TECHNICIAN) {
      return res.status(403).json({ error: "Managers can only invite technicians" });
    }

    // Super Admin can invite any role
    // Admin can invite managers and technicians
    const allowedRoles = req.user.role === USER_ROLES.SUPER_ADMIN
      ? [USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN]
      : [USER_ROLES.MANAGER, USER_ROLES.TECHNICIAN];

    if (!allowedRoles.includes(role)) {
      console.log("Validation failed: Invalid role for user", req.user.role);
      return res
        .status(400)
        .json({ error: `Role must be one of: ${allowedRoles.join(", ")}` });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log("User already exists:", existingUser.email);
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    }

    // Check plan user limits before inviting
    try {
      const { checkLimit } = require("../middleware/subscription");
      const { calculateUsageStats } = require("../routes/planManagement");

      // Get current team member count
      const teamMembers = await User.find({ admin_id: req.user.id });
      const currentCount = teamMembers.length;

      // Check if adding one more user would exceed limit
      const limitCheck = await checkLimit(req.user, "users", currentCount + 1);

      if (!limitCheck.withinLimit) {
        const limit =
          limitCheck.limit === "unlimited" ? "unlimited" : limitCheck.limit;
        return res.status(403).json({
          error: `You've reached your user limit (${limit}). Please upgrade your plan to invite more team members.`,
          code: "USER_LIMIT_REACHED",
          currentCount,
          limit,
        });
      }
    } catch (limitError) {
      console.error("Error checking user limits:", limitError);
      // Don't block invitation if limit check fails, but log the error
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString("hex");
    const invitationExpires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    console.log("Creating invitation with token:", invitationToken);

    // Set admin_id for team members (managers and technicians)
    let admin_id = req.user._id;
    if (req.user.role === USER_ROLES.MANAGER) {
      // Manager's invitations belong to their admin
      admin_id = req.user.admin_id;
    }

    // Create invitation record
    const invitation = new User({
      email,
      name: name || email.split("@")[0],
      role: "pending", // Temporary role until they accept invitation
      invitationToken,
      invitationExpires,
      invitationRole: role,
      invitedBy: req.user.id,
      admin_id: req.user.id, // Set admin_id for manager/technician roles
      emailVerified: false,
      // Set admin_id for managers and technicians
      admin_id: role === USER_ROLES.MANAGER || role === USER_ROLES.TECHNICIAN ? admin_id : undefined,
    });

    console.log("Saving invitation to database...");
    await invitation.save();
    console.log("Invitation saved successfully");

    // Create invitation link
    const invitationLink = `${process.env.FRONT_END_URL}/auth/signup?token=${invitationToken}`;
    console.log("Invitation link:", invitationLink);

    // Send invitation email
    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
                <h2 style="color: #2d3748;">Team Invitation</h2>
                <p style="color: #4a5568;">Hello <b>${name || email.split("@")[0]
      }</b>,</p>
                <p style="color: #4a5568;">You have been invited to join <b>GrainHero</b> as a <b>${role}</b>.</p>
                <p style="color: #4a5568;">Click the button below to accept the invitation and create your account:</p>
                <a href="${invitationLink}" style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #3182ce; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Accept Invitation</a>
                <p style="color: #718096; font-size: 13px;">This invitation will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} GrainHero. All rights reserved.</p>
            </div>
        `;

    console.log("Sending email to:", email);
    await sendEmail(
      email,
      "Team Invitation - GrainHero",
      `You have been invited to join GrainHero. Click here to accept: ${invitationLink}`,
      html
    );
    console.log("Email sent successfully");

    res.status(200).json({
      message: "Invitation sent successfully",
      invitationLink: invitationLink, // For testing purposes
    });
  } catch (err) {
    console.error("Invite team member error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * @swagger
 * /auth/verify-invitation:
 *   get:
 *     summary: Verify invitation token
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Invitation is valid
 *       400:
 *         description: Invalid or expired token
 */
router.get("/verify-invitation", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const invitation = await User.findOne({
      invitationToken: token,
      invitationExpires: { $gt: Date.now() },
    }).select("+invitationToken +invitationRole");

    if (!invitation) {
      return res
        .status(400)
        .json({ error: "Invalid or expired invitation token" });
    }

    res.status(200).json({
      valid: true,
      email: invitation.email,
      role: invitation.invitationRole,
      name: invitation.name,
    });
  } catch (err) {
    console.error("Verify invitation error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Test email endpoint (remove in production)
router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
                <h2 style="color: #2d3748;">GrainHero Email Test</h2>
                <p style="color: #4a5568;">Hello!</p>
                <p style="color: #4a5568;">This is a test email from GrainHero to verify that email sending is working correctly.</p>
                <p style="color: #718096; font-size: 13px;">If you received this email, the email system is configured properly!</p>
                <hr style="margin: 24px 0; border: none; border-top: 1px solid #e2e8f0;">
                <p style="color: #a0aec0; font-size: 12px;">&copy; ${new Date().getFullYear()} GrainHero. All rights reserved.</p>
            </div>
        `;

    await sendEmail(
      email,
      "GrainHero Email Test",
      "This is a test email from GrainHero",
      html
    );

    res.status(200).json({
      success: true,
      message: "Test email sent successfully!",
    });
  } catch (err) {
    console.error("Test email error:", err);
    res.status(500).json({
      error: "Failed to send test email: " + err.message,
    });
  }
});

module.exports = router;
