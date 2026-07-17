const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  requireAdmin,
  requireSuperAdmin,
  requirePermission,
  requireUserManagement,
  requireUserCreationPermission,
  requireAdminAccess,
} = require("../middleware/roleAuth");
const User = require("../models/User");
const { USER_ROLES } = require("../configs/enum");
const { canManageUser } = require("../configs/role-permissions");
const LoggingService = require("../services/loggingService");

/**
 * @swagger
 * /user-management/users:
 *   get:
 *     summary: Get all users (filtered by role and tenant)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [super_admin, admin, manager, technician]
 *       - in: query
 *         name: admin_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: List of users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/users", auth, async (req, res) => {
  try {
    const { role, admin_id, limit = 50, page = 1 } = req.query;
    const userRole = req.user.role;

    // Build query based on user role
    let query = {};

    if (userRole === USER_ROLES.SUPER_ADMIN) {
      // Super admin can see all users
      if (role) query.role = role;
      if (admin_id) query.admin_id = admin_id;
    } else if (userRole === USER_ROLES.ADMIN) {
      // Admin can only see their team members (managers and technicians)
      query.$or = [
        { admin_id: req.user.id }, // Their team members
        { _id: req.user.id }, // Include themselves
      ];
      if (role && canManageUser(userRole, role)) {
        query.role = role;
      }
    } else {
      // Other roles cannot list users
      return res.status(403).json({
        error: "Insufficient permissions to list users",
        code: "INSUFFICIENT_PERMISSIONS",
      });
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select("-password -resetPasswordToken -resetPasswordExpires -__v")
      .populate("admin_id", "name email")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * @swagger
 * /user-management/users:
 *   post:
 *     summary: Create a new user
 *     tags: [User Management]
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
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, manager, technician]
 *               location:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/users", auth, requireUserCreationPermission, async (req, res) => {
  try {
    const { name, email, phone, password, role, location } = req.body;
    const creatorRole = req.user.role;

    // Validation
    if (!name || !email || !phone || !password || !role) {
      return res
        .status(400)
        .json({ error: "All required fields must be provided" });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.match(emailRegex)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Email or phone is already in use" });
    }

    // Build user data
    const userData = {
      name,
      email,
      phone,
      password,
      role,
      location,
      created_by: req.user.id,
    };

    // Handle team association based on creator role
    if (creatorRole === USER_ROLES.SUPER_ADMIN) {
      // Super admin can create any user type
      if (role === USER_ROLES.ADMIN) {
        // Admin users get their own plan (will be set separately)
        userData.subscription_plan = req.body.subscription_plan || "basic";
      } else if (
        role === USER_ROLES.MANAGER ||
        role === USER_ROLES.TECHNICIAN
      ) {
        // Team members belong to an admin
        userData.admin_id = req.body.admin_id;
      }
    } else if (creatorRole === USER_ROLES.ADMIN) {
      // Admin can only create managers and technicians in their team
      if (role === USER_ROLES.ADMIN) {
        return res.status(403).json({
          error: "Cannot create admin users. Contact super admin.",
          code: "CANNOT_CREATE_ADMIN",
        });
      }
      // Team members belong to this admin
      userData.admin_id = req.user.id;
    }

    const user = new User(userData);
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.status(201).json({
      message: "User created successfully",
      user: userResponse,
    });

    // Log user creation
    try {
      await LoggingService.logUserManagement(req.user, 'user_created', user, req.ip);
    } catch (logErr) { console.error('Logging error:', logErr.message); }
  } catch (err) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

/**
 * @swagger
 * /user-management/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
router.get(
  "/users/:userId",
  auth,
  requirePermission("user.read"),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const userRole = req.user.role;

      // Validate userId format
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        return res.status(400).json({ error: "Invalid userId format" });
      }

      const user = await User.findById(userId)
        .select("-password -resetPasswordToken -resetPasswordExpires -__v")
        .populate("admin_id", "name email");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check access permissions
      if (userRole === USER_ROLES.SUPER_ADMIN) {
        // Super admin can see any user
      } else if (userRole === USER_ROLES.ADMIN) {
        if (user.admin_id?.toString() !== req.user.id && user._id.toString() !== req.user.id) {
          return res.status(403).json({
            error: "Access denied. Cannot view this user",
            code: "USER_ACCESS_DENIED",
          });
        }
      } else {
        // Other roles cannot view user details
        return res.status(403).json({
          error: "Insufficient permissions to view user details",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      res.json(user);
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  }
);

/**
 * @swagger
 * /user-management/users/{userId}:
 *   put:
 *     summary: Update user
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
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
 *               role:
 *                 type: string
 *               location:
 *                 type: string
 *               blocked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
router.put(
  "/users/:userId",
  auth,
  requirePermission("user.update"),
  requireUserManagement,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { name, phone, role, location, blocked } = req.body;
      const updaterRole = req.user.role;

      // Validate userId format
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        return res.status(400).json({ error: "Invalid userId format" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check access permissions
      if (updaterRole === USER_ROLES.SUPER_ADMIN) {
        // Super admin can update any user
      } else if (updaterRole === USER_ROLES.ADMIN) {
        if (user.admin_id?.toString() !== req.user.id && user._id.toString() !== req.user.id) {
          return res.status(403).json({
            error: "Access denied. Cannot update this user",
            code: "USER_ACCESS_DENIED",
          });
        }
      } else if (userId === req.user.id) {
        // User updating their own profile - allow
        // But restrict finding their own tenant issue if they are technician
      } else {
        return res.status(403).json({
          error: "Insufficient permissions to update user",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      // Validate role change if provided
      if (role && !canManageUser(updaterRole, role)) {
        return res.status(403).json({
          error: `Cannot assign role: ${role}`,
          code: "INSUFFICIENT_ROLE_HIERARCHY",
        });
      }

      // Update fields
      const updateData = {};
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      if (role) updateData.role = role;
      if (location) updateData.location = location;
      // Allow updating address and preferences
      if (req.body.address) updateData.address = req.body.address;
      if (req.body.preferences) updateData.preferences = req.body.preferences;

      if (typeof blocked === "boolean") updateData.blocked = blocked;
      updateData.updated_by = req.user.id;

      const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
      }).select("-password -resetPasswordToken -resetPasswordExpires -__v");

      res.json({
        message: "User updated successfully",
        user: updatedUser,
      });

      // Log user update
      try {
        await LoggingService.logUserManagement(req.user, 'user_updated', updatedUser, req.ip);
      } catch (logErr) { console.error('Logging error:', logErr.message); }
    } catch (err) {
      console.error("Error updating user:", err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  }
);

/**
 * @swagger
 * /user-management/users/{userId}:
 *   delete:
 *     summary: Delete user (soft delete)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
router.delete(
  "/users/:userId",
  auth,
  requirePermission("user.delete"),
  requireUserManagement,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const deleterRole = req.user.role;

      // Validate userId format
      if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
        return res.status(400).json({ error: "Invalid userId format" });
      }

      // Prevent self-deletion
      if (userId === req.user.id) {
        return res.status(400).json({
          error: "Cannot delete your own account",
          code: "CANNOT_DELETE_SELF",
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check access permissions
      if (deleterRole === USER_ROLES.SUPER_ADMIN) {
        // Super admin can delete any user
      } else if (deleterRole === USER_ROLES.ADMIN) {
        if (user.admin_id?.toString() !== req.user.id) {
          return res.status(403).json({
            error: "Access denied. Cannot delete this user",
            code: "USER_ACCESS_DENIED",
          });
        }
      } else {
        return res.status(403).json({
          error: "Insufficient permissions to delete user",
          code: "INSUFFICIENT_PERMISSIONS",
        });
      }

      // Perform soft delete
      await user.softDelete();

      // Log user deletion
      try {
        await LoggingService.logUserManagement(req.user, 'user_deleted', user, req.ip);
      } catch (logErr) { console.error('Logging error:', logErr.message); }

      res.json({ message: "User deleted successfully" });
    } catch (err) {
      console.error("Error deleting user:", err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  }
);

/**
 * @swagger
 * /user-management/users/{userId}/block:
 *   patch:
 *     summary: Block or unblock user
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - blocked
 *             properties:
 *               blocked:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User blocked/unblocked successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */
router.patch(
  "/users/:userId/block",
  auth,
  requirePermission("user.update"),
  requireUserManagement,
  async (req, res) => {
    try {
      const { userId } = req.params;
      const { blocked } = req.body;

      if (typeof blocked !== "boolean") {
        return res
          .status(400)
          .json({ error: "Blocked status must be a boolean" });
      }

      // Prevent self-blocking
      if (userId === req.user.id) {
        return res.status(400).json({
          error: "Cannot block your own account",
          code: "CANNOT_BLOCK_SELF",
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { blocked, updated_by: req.user.id },
        { new: true }
      ).select("-password -resetPasswordToken -resetPasswordExpires -__v");

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        message: `User ${blocked ? "blocked" : "unblocked"} successfully`,
        user,
      });

      // Log user block status change
      try {
        await LoggingService.logUserManagement(req.user, blocked ? 'user_blocked' : 'user_unblocked', user, req.ip);
      } catch (logErr) { console.error('Logging error:', logErr.message); }
    } catch (err) {
      console.error("Error updating user block status:", err);
      res.status(500).json({ error: "Server error: " + err.message });
    }
  }
);

module.exports = router;
