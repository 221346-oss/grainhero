const express = require('express');
const router = express.Router();
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const { auth } = require('../middleware/auth');
const { superAdminOnly } = require('../middleware/permission');

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminAccount:
 *       type: object
 *       required:
 *         - name
 *         - email
 *       properties:
 *         _id:
 *           type: string
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         phone:
 *           type: string
 *         business_type:
 *           type: string
 *         status:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/admin-management/admins:
 *   get:
 *     summary: Get all admin accounts (Super Admin only)
 *     tags: [Admin Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of admins retrieved successfully
 */
router.get('/admins', auth, superAdminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const filter = { role: 'admin' };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const totalAdmins = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalAdmins / limit);

    const admins = await User.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const enhancedAdmins = await Promise.all(admins.map(async (adminUser) => {
      const subscription = await Subscription.findOne({ admin_id: adminUser._id });
      const userCount = await User.countDocuments({ admin_id: adminUser._id });

      return {
        ...adminUser,
        plan: subscription?.plan_name || 'Basic',
        subscription_status: subscription?.status || 'inactive',
        user_count: userCount,
        revenue: subscription?.price_per_month || 0,
        subscription_end: subscription?.end_date
      };
    }));

    res.json({
      success: true,
      data: {
        admins: enhancedAdmins,
        pagination: {
          currentPage: page,
          totalPages,
          totalAdmins,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admins',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin-management/admins/{id}:
 *   get:
 *     summary: Get admin account by ID (Super Admin only)
 *     tags: [Admin Management]
 */
router.get('/admins/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const adminUser = await User.findOne({ _id: req.params.id, role: 'admin' });

    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const userCount = await User.countDocuments({ admin_id: adminUser._id });
    const subscription = await Subscription.findOne({ admin_id: adminUser._id });
    
    const recentSubUsers = await User.find({ admin_id: adminUser._id })
      .sort({ lastLogin: -1 })
      .limit(5)
      .select('name email lastLogin role');

    res.json({
      success: true,
      data: {
        admin: adminUser,
        statistics: {
          user_count: userCount,
          subscription: subscription,
          recent_activity: recentSubUsers
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin details',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin-management/admins:
 *   post:
 *     summary: Create new admin account (Super Admin only)
 *     tags: [Admin Management]
 */
router.post('/admins', auth, superAdminOnly, async (req, res) => {
  try {
    const { name, email, phone, password, business_type, plan_name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    const user = new User({
      name,
      email,
      phone,
      password,
      role: 'admin',
      business_type: business_type || 'farm',
      emailVerified: true
    });

    await user.save();

    if (plan_name) {
      const planPricing = {
        'Basic': { price: 99, users: 5, devices: 10, storage: 1 },
        'Pro': { price: 299, users: 25, devices: 50, storage: 10 },
        'Enterprise': { price: 999, users: 100, devices: 200, storage: 100 }
      };

      const plan = planPricing[plan_name];
      if (plan) {
        const subscription = new Subscription({
          admin_id: user._id,
          plan_name,
          price_per_month: 0,
          billing_cycle: 'monthly',
          start_date: new Date(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'active',
          payment_status: 'paid',
          features: {
            max_users: plan.users,
            max_devices: plan.devices,
            max_storage_gb: plan.storage,
            ai_features: plan_name !== 'Basic'
          }
        });

        await subscription.save();

        const invoice = new Invoice({
          admin_id: user._id,
          subscription_id: subscription._id,
          amount: 0,
          status: 'paid',
          invoice_number: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
        });
        await invoice.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating admin',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin-management/admins/{id}:
 *   put:
 *     summary: Update admin account (Super Admin only)
 *     tags: [Admin Management]
 */
router.put('/admins/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const adminUser = await User.findOne({ _id: req.params.id, role: 'admin' });
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        adminUser[key] = updates[key];
      }
    });

    await adminUser.save();

    res.json({
      success: true,
      message: 'Admin account updated successfully',
      data: { admin: adminUser }
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating admin',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin-management/admins/{id}:
 *   delete:
 *     summary: Delete admin account (Super Admin only)
 *     tags: [Admin Management]
 */
router.delete('/admins/:id', auth, superAdminOnly, async (req, res) => {
  try {
    const adminUser = await User.findOne({ _id: req.params.id, role: 'admin' });
    if (!adminUser) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Soft delete
    adminUser.deleted_at = new Date();
    await adminUser.save();

    // Cancel subscription
    const subscription = await Subscription.findOne({ admin_id: adminUser._id });
    if (subscription) {
      subscription.status = 'cancelled';
      await subscription.save();
    }

    res.json({
      success: true,
      message: 'Admin account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting admin',
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/admin-management/statistics:
 *   get:
 *     summary: Get admin management statistics (Super Admin only)
 *     tags: [Admin Management]
 */
router.get('/statistics', auth, superAdminOnly, async (req, res) => {
  try {
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const activeAdmins = await User.countDocuments({ role: 'admin', status: 'active' });

    const subscriptions = await Subscription.find({ status: 'active' });
    const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.price_per_month || 0), 0);

    res.json({
      success: true,
      data: {
        total_admins: totalAdmins,
        active_admins: activeAdmins,
        total_revenue: totalRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

module.exports = router;
