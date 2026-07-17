const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const Alert = require("../models/Alert");
const GrainAlert = require("../models/GrainAlert");
const { auth } = require("../middleware/auth");
const { requirePermission } = require("../middleware/permission");
const moment = require('moment');
const PDFDocument = require('pdfkit');
const jwt = require("jsonwebtoken");

// Get recent admins with their details
router.get("/super-admin/admins", [
  auth,
  requirePermission("tenant.view")
], async (req, res) => {
  try {
    // Only allow super admins to access this
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get recent admins with their subscription details
    const recentAdmins = await User.aggregate([
      { $match: { role: 'admin' } },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "admin_id",
          as: "subscription"
        }
      },
      {
        $lookup: {
          from: "warehouses",
          localField: "_id",
          foreignField: "admin_id",
          as: "warehouses"
        }
      },
      {
        $lookup: {
          from: "warehousefinancials",
          localField: "warehouses._id",
          foreignField: "warehouse_id",
          as: "financials"
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          created_at: 1,
          updated_at: 1,
          plan: { $arrayElemAt: ["$subscription.plan_name", 0] },
          status: { $ifNull: [{ $arrayElemAt: ["$subscription.status", 0] }, "active"] },
          expiration_date: { $arrayElemAt: ["$subscription.end_date", 0] },
          total_revenue: {
            $sum: "$financials.revenue.total_revenue"
          },
          warehouses_count: { $size: "$warehouses" }
        }
      },
      { $sort: { created_at: -1 } },
      { $limit: 10 }
    ]);

    // Count users per admin separately
    for (const admin of recentAdmins) {
      const userCount = await User.countDocuments({
        admin_id: admin._id
      });
      admin.users_count = userCount;
    }

    // Format the response to match frontend expectations
    const formattedAdmins = recentAdmins.map((admin, index) => ({
      id: index + 1,
      db_id: admin._id,
      name: admin.name || "Unknown Admin",
      plan: admin.plan || "Basic",
      status: admin.status || "active",
      revenue: admin.total_revenue || 0,
      users: admin.users_count || 0,
      daysLeft: admin.expiration_date ?
        Math.ceil((new Date(admin.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)) : 0
    }));

    res.json({ data: formattedAdmins });
  } catch (error) {
    console.error("Error fetching admins:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Backward compatible route for frontend
router.get("/super-admin/tenants", [auth, requirePermission("tenant.view")], async (req, res) => {
  req.url = "/super-admin/admins";
  return router.handle(req, res);
});

// Get system alerts
router.get("/super-admin/alerts", [
  auth,
  requirePermission("alert.view")
], async (req, res) => {
  try {
    // Only allow super admins to access this
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get recent system alerts
    const systemAlerts = await GrainAlert.find({})
      .populate('admin_id', 'name')
      .populate('silo_id', 'name')
      .populate('created_by', 'name email')
      .populate('resolved_by', 'name')
      .sort({ triggered_at: -1 })
      .limit(10)
      .lean();

    const formattedAlerts = systemAlerts.map((alert) => ({
      id: alert._id.toString(),
      type: alert.priority || alert.alert_type || "info",
      message: alert.message || "System notification",
      time: moment(alert.triggered_at).fromNow() || "Just now",
      timestamp: alert.triggered_at,
      adminName: alert.admin_id?.name || "Unknown Admin",
      createdBy: alert.created_by?.name || "System",
      resolved: alert.status === 'resolved',
      details: alert.message,
      title: alert.title,
      silo: alert.silo_id?.name || "Unknown Silo",
      status: alert.status
    }));

    res.json({ data: formattedAlerts });
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get subscription revenue data
router.get("/super-admin/subscription-revenue", [
  auth,
  requirePermission("subscription.view")
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const subscriptions = await Subscription.find({}).lean();

    const totalRevenue = subscriptions.reduce((sum, sub) => {
      const amount = sub.amount || sub.price || sub.price_per_month || 0;
      if (sub.status === 'active' || sub.status === 'trialing') {
        return sum + amount;
      }
      return sum;
    }, 0);

    const now = new Date();
    const dailyTrend = [];
    for (let i = 29; i >= 0; i--) {
      const dayDate = new Date(now);
      dayDate.setDate(now.getDate() - i);
      const dayStart = new Date(dayDate.setHours(0, 0, 0, 0));
      const dayEnd = new Date(dayDate.setHours(23, 59, 59, 999));

      const dayRevenue = subscriptions.filter(sub => {
        const subDate = new Date(sub.created_at || sub.createdAt || sub._id.getTimestamp());
        return subDate >= dayStart && subDate <= dayEnd && (sub.status === 'active' || sub.status === 'trialing');
      }).reduce((sum, sub) => sum + (sub.amount || sub.price || sub.price_per_month || 0), 0);

      dailyTrend.push({
        date: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        revenue: dayRevenue
      });
    }

    const monthlyTrend = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const monthlyRevenue = subscriptions.reduce((sum, sub) => {
        const amount = sub.amount || sub.price || sub.price_per_month || 0;
        const subStart = new Date(sub.created_at || sub.createdAt || sub._id.getTimestamp());
        const subEnd = sub.end_date ? new Date(sub.end_date) : new Date(9999, 11, 31);

        if (subStart <= monthEnd && subEnd >= monthStart) {
          if (['active', 'trialing', 'cancelled', 'expired'].includes(sub.status)) {
            if (sub.status === 'cancelled' && sub.cancellation_date && new Date(sub.cancellation_date) < monthStart) {
              return sum;
            }
            return sum + amount;
          }
        }
        return sum;
      }, 0);

      monthlyTrend.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthlyRevenue
      });
    }

    res.json({
      revenue: totalRevenue,
      monthlyTrend: monthlyTrend,
      dailyTrend: dailyTrend
    });
  } catch (error) {
    console.error("Error fetching subscription revenue:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Get expiring subscriptions
router.get("/super-admin/expiring-subscriptions", [
  auth,
  requirePermission("subscription.view")
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

    const expiringSubscriptions = await Subscription.find({
      end_date: {
        $gte: new Date(),
        $lt: oneWeekFromNow
      },
      status: { $ne: "expired" }
    }).lean();

    res.json({
      count: expiringSubscriptions.length,
      data: expiringSubscriptions
    });
  } catch (error) {
    console.error("Error fetching expiring subscriptions:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Impersonate an admin account
router.post('/admins/:id/impersonate', [auth], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied. Only Super Admins can impersonate." });
    }

    const targetUser = await User.findOne({ _id: req.params.id, role: 'admin' });
    if (!targetUser) return res.status(404).json({ error: 'Admin account not found' });

    const token = jwt.sign(
      { id: targetUser._id, role: targetUser.role, admin_id: null, is_impersonating: true },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ token, user: targetUser });
  } catch (error) {
    console.error('Impersonation Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Backward compatible impersonate route
router.post('/tenants/:id/impersonate', [auth], async (req, res) => {
  // Try to find the admin user that owns the legacy tenant or matches the ID
  const adminUser = await User.findOne({ 
    $or: [
      { _id: req.params.id, role: 'admin' },
      { admin_id: req.params.id, role: 'admin' } // If ID was tenant ID and we have it in some metadata, but here we just assume ID is now Admin User ID
    ]
  });
  
  if (adminUser) {
    req.params.id = adminUser._id;
    req.url = `/admins/${adminUser._id}/impersonate`;
    return router.handle(req, res);
  }
  
  res.status(404).json({ error: "Admin not found" });
});

// Generate reports
router.post('/reports/generate', [auth], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Access denied" });

    const { type, format } = req.body;

    if (type === 'full-user-report') {
      const users = await User.find({ role: { $ne: 'super_admin' } })
        .populate('admin_id', 'name')
        .sort({ admin_id: 1, role: 1 });

      const csvRows = [];
      csvRows.push(['User ID', 'Name', 'Email', 'Phone', 'Role', 'Admin/Organization', 'Status', 'Last Login', '2FA Enabled'].join(','));

      for (const user of users) {
        const orgName = user.admin_id?.name || (user.role === 'admin' ? 'Self (Admin)' : 'N/A');
        const lastLogin = user.lastLogin && !isNaN(new Date(user.lastLogin).getTime())
          ? new Date(user.lastLogin).toISOString().split('T')[0]
          : 'Never';

        csvRows.push([
          user._id,
          `"${user.name || 'N/A'}"`,
          user.email || 'N/A',
          user.phone || '',
          user.role || 'user',
          `"${orgName}"`,
          user.status || 'unknown',
          lastLogin,
          user.two_factor_enabled ? 'Yes' : 'No'
        ].join(','));
      }

      if (format === 'pdf') {
        const doc = new PDFDocument({ margin: 30, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=user-report-${new Date().toISOString().split('T')[0]}.pdf`);
        doc.pipe(res);

        doc.fontSize(20).text('Platform User Report', { align: 'center' });
        doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        const tableTop = 150;
        let y = tableTop;

        doc.fontSize(8);
        doc.text('Name', 30, y, { width: 90 });
        doc.text('Email', 120, y, { width: 120 });
        doc.text('Role', 240, y, { width: 60 });
        doc.text('Organization', 300, y, { width: 90 });
        doc.text('Status', 390, y, { width: 60 });
        doc.text('Last Login', 450, y, { width: 70 });

        doc.moveTo(30, y + 15).lineTo(550, y + 15).stroke();
        y += 25;

        for (const user of users) {
          const orgName = user.admin_id?.name || (user.role === 'admin' ? 'Self' : 'N/A');
          const lastLogin = user.lastLogin && !isNaN(new Date(user.lastLogin).getTime())
            ? new Date(user.lastLogin).toISOString().split('T')[0]
            : 'Never';

          if (y > 750) { doc.addPage(); y = 50; }

          doc.text(user.name || 'N/A', 30, y, { width: 90, ellipsis: true });
          doc.text(user.email || 'N/A', 120, y, { width: 120, ellipsis: true });
          doc.text(user.role || 'user', 240, y, { width: 60 });
          doc.text(orgName, 300, y, { width: 90, ellipsis: true });
          doc.text(user.status || 'unknown', 390, y, { width: 60 });
          doc.text(lastLogin, 450, y, { width: 70 });
          y += 20;
        }

        doc.end();
        return;
      }

      const csvString = csvRows.join('\n');
      if (format === 'csv') {
        res.header('Content-Type', 'text/csv');
        res.attachment(`user-report-${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csvString);
      }

      return res.json({ success: true, data: csvString });
    }

    res.json({ success: true, message: `Report ${type} generated.` });
  } catch (error) {
    console.error('Report Generation Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resolve alerts
router.post('/alerts/:id/resolve', [auth], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Access denied" });

    const updatedAlert = await GrainAlert.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolved_at: new Date(), resolved_by: req.user.id },
      { new: true }
    );

    if (!updatedAlert) return res.status(404).json({ error: "Alert not found" });

    res.json({ success: true, message: "Alert resolved successfully", alert: updatedAlert });
  } catch (error) {
    console.error('Alert Resolution Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Super admin dashboard metrics
router.get('/dashboard', [auth], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Access denied" });

    const GrainBatch = require('../models/GrainBatch');
    const Silo = require('../models/Silo');

    const [
      totalAdmins,
      activeUsers,
      activeSubscriptions,
      totalBatches,
      totalSilos,
      criticalAlerts,
      subscriptionRevenue
    ] = await Promise.all([
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ status: 'active' }),
      Subscription.countDocuments({ status: 'active' }),
      GrainBatch.countDocuments({}),
      Silo.countDocuments({}),
      GrainAlert.countDocuments({ priority: 'critical' }),
      Subscription.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, total: { $sum: "$price_per_month" } } }
      ])
    ]);

    const mrr = subscriptionRevenue[0]?.total || 0;

    const subscriptionDistribution = await Subscription.aggregate([
      { $group: { _id: "$plan_name", count: { $sum: 1 } } }
    ]);

    const distributions = { subscriptions: {} };
    subscriptionDistribution.forEach(sub => {
      if (sub._id) distributions.subscriptions[sub._id] = sub.count;
    });

    res.json({
      metrics: {
        total_admins: totalAdmins,
        active_users: activeUsers,
        active_subscriptions: activeSubscriptions,
        mrr: mrr,
        total_batches: totalBatches,
        total_silos: totalSilos,
        critical_alerts: criticalAlerts
      },
      distributions
    });
  } catch (error) {
    console.error('Super Admin Dashboard Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Financial Stats
router.get('/financials/stats', [auth], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Access denied" });

    const Invoice = require('../models/Invoice');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [cancelledRecently, activeStartOfMonth, failedSubscriptions, failedInvoices, pendingInvoices] = await Promise.all([
      Subscription.countDocuments({ status: 'cancelled', updated_at: { $gte: thirtyDaysAgo } }),
      Subscription.countDocuments({ created_at: { $lte: thirtyDaysAgo }, status: { $in: ['active', 'trialing', 'past_due'] } }),
      Subscription.countDocuments({ payment_status: 'failed' }),
      Invoice.countDocuments({ status: 'failed' }),
      Invoice.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: "$amount" } } }])
    ]);

    const churnRate = activeStartOfMonth > 0 ? ((cancelledRecently / activeStartOfMonth) * 100).toFixed(2) : 0;
    const totalFailed = Math.max(failedSubscriptions, failedInvoices);
    const pendingRevenue = pendingInvoices[0]?.total || 0;

    res.json({ churnRate, failedPayments: totalFailed, pendingRevenue, cancelledCount: cancelledRecently });
  } catch (error) {
    console.error('Financial Stats Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Financial Invoices
router.get('/financials/invoices', [auth], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: "Access denied" });

    const Invoice = require('../models/Invoice');
    const count = await Invoice.countDocuments({});

    let invoices = [];
    if (count === 0) {
      const subscriptions = await Subscription.find({}).populate('admin_id', 'name').sort({ created_at: -1 }).limit(50);
      invoices = subscriptions.map(sub => ({
        id: sub._id,
        invoice_number: `INV-${sub._id.toString().substring(18)}`,
        admin_name: sub.admin_id?.name || 'Unknown',
        amount: sub.price_per_month || 0,
        status: sub.payment_status || 'paid',
        date: sub.last_payment_date || sub.created_at,
        cycle: sub.billing_cycle
      }));
    } else {
      const dbInvoices = await Invoice.find({}).populate('admin_id', 'name').sort({ billing_date: -1 }).limit(50);
      invoices = dbInvoices.map(inv => ({
        id: inv._id,
        invoice_number: inv.invoice_number,
        admin_name: inv.admin_id?.name || 'Unknown',
        amount: inv.amount,
        status: inv.status,
        date: inv.billing_date,
        cycle: 'monthly'
      }));
    }

    res.json({ data: invoices });
  } catch (error) {
    console.error('Financial Invoices Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// SUBSCRIPTION MANAGEMENT (Super Admin CRUD)
// ============================================

// GET /api/super-admin/subscriptions — List all subscriptions
router.get("/subscriptions", [
  auth,
  requirePermission("tenant.view")
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const subscriptions = await Subscription.find()
      .populate("admin_id", "name email phone hasAccess subscription_plan")
      .sort({ createdAt: -1 });

    res.json(subscriptions);
  } catch (error) {
    console.error("Subscriptions list error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/super-admin/subscriptions/:id — View single subscription
router.get("/subscriptions/:id", [
  auth,
  requirePermission("tenant.view")
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const subscription = await Subscription.findById(req.params.id)
      .populate("admin_id", "name email phone hasAccess subscription_plan customerId");

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    res.json(subscription);
  } catch (error) {
    console.error("Subscription detail error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/super-admin/subscriptions/:id — Update subscription (change plan, status)
router.patch("/subscriptions/:id", [
  auth,
  requirePermission("tenant.manage")
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const { status, plan_name, price_per_month } = req.body;
    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    if (status) subscription.status = status;
    if (plan_name) subscription.plan_name = plan_name;
    if (price_per_month) subscription.price_per_month = price_per_month;

    await subscription.save();

    // Also update the user's hasAccess if plan changed
    if (plan_name && subscription.admin_id) {
      const planMapping = {
        'Starter': 'basic',
        'Professional': 'intermediate',
        'Enterprise': 'pro',
      };
      const hasAccess = planMapping[plan_name] || subscription.admin_id.hasAccess;
      await User.findByIdAndUpdate(subscription.admin_id, {
        hasAccess: hasAccess,
        subscription_plan: plan_name.toLowerCase(),
      });
    }

    res.json({ message: "Subscription updated", subscription });
  } catch (error) {
    console.error("Subscription update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/super-admin/subscriptions/:id — Cancel subscription
router.delete("/subscriptions/:id", [
  auth,
  requirePermission("tenant.manage")
], async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({ error: "Access denied" });
    }

    const subscription = await Subscription.findById(req.params.id);

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    subscription.status = "cancelled";
    subscription.end_date = new Date();
    await subscription.save();

    // Revoke user access
    if (subscription.admin_id) {
      await User.findByIdAndUpdate(subscription.admin_id, {
        hasAccess: "none",
      });
    }

    res.json({ message: "Subscription cancelled", subscription });
  } catch (error) {
    console.error("Subscription cancel error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;