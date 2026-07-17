const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireAdminAccess } = require('../middleware/permission');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceClaim = require('../models/InsuranceClaim');
const GrainBatch = require('../models/GrainBatch');
const LoggingService = require('../services/loggingService');
const AlertEngine = require('../services/alertEngine');
const NotificationService = require('../services/notificationService');
const { body, validationResult, param, query } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * tags:
 *   name: Insurance
 *   description: Insurance policy and claims management
 */

/**
 * @swagger
 * /insurance/policies:
 *   get:
 *     summary: Get all insurance policies for admin
 *     tags: [Insurance]
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
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: provider
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of policies
 */
router.get('/policies', [
  auth,
  requirePermission('insurance.view'),
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const adminId = req.user.admin_id || req.user._id;

    // Super admin can optionally scope via ?admin_id
    const filter = req.user.role === 'super_admin'
      ? (req.query.admin_id ? { admin_id: req.query.admin_id } : {})
      : { admin_id: adminId };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.provider) filter.provider_name = { $regex: req.query.provider, $options: 'i' };

    const [policies, total] = await Promise.all([
      InsurancePolicy.find(filter)
        .populate('covered_batches.batch_id', 'batch_id grain_type quantity_kg')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InsurancePolicy.countDocuments(filter)
    ]);

    res.json({
      policies,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });

  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/policies:
 *   post:
 *     summary: Create new insurance policy
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.post('/policies', [
  auth,
  requirePermission('insurance.manage'),
  requireAdminAccess,
  [
    body('policy_number').notEmpty().withMessage('Policy number is required'),
    body('provider_name').notEmpty().withMessage('Provider name is required'),
    body('coverage_type').isIn(['Comprehensive', 'Fire & Theft', 'Spoilage Only', 'Weather Damage', 'Custom']).withMessage('Invalid coverage type'),
    body('coverage_amount').isFloat({ min: 0 }).withMessage('Coverage amount must be positive'),
    body('premium_amount').isFloat({ min: 0 }).withMessage('Premium amount must be positive'),
    body('start_date').isISO8601().withMessage('Valid start date is required'),
    body('end_date').isISO8601().withMessage('Valid end date is required')
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminId = req.user.admin_id || req.user._id;

    const policy = new InsurancePolicy({
      ...req.body,
      admin_id: adminId,
      created_by: req.user._id
    });

    await policy.save();

    // Log & notify
    try {
      await LoggingService.logInsurancePolicyCreated(req.user, policy, req.ip);
      await NotificationService.notifyAdminsAndManagers({
        admin_id: adminId,
        title: `🛡️ New Insurance Policy Created`,
        message: `Policy ${policy.policy_number} (${policy.provider_name}) created with PKR ${policy.coverage_amount?.toLocaleString()} coverage.`,
        type: 'info',
        category: 'insurance',
        entity_type: 'InsurancePolicy',
        entity_id: policy._id,
        action_url: '/insurance'
      });
    } catch (logErr) { console.error('Logging error:', logErr.message); }

    res.status(201).json({
      message: 'Policy created successfully',
      policy
    });

  } catch (error) {
    console.error('Create policy error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Policy number already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/policies/{id}:
 *   get:
 *     summary: Get policy by ID
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get('/policies/:id', [
  auth,
  requirePermission('insurance.view'),
  param('id').isMongoId().withMessage('Valid policy ID is required')
], async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user._id;

    const filter = req.user.role === 'super_admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, admin_id: adminId };

    const policy = await InsurancePolicy.findOne(filter)
      .populate('covered_batches.batch_id')
      .populate('created_by', 'name email');

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    res.json(policy);

  } catch (error) {
    console.error('Get policy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/policies/{id}:
 *   put:
 *     summary: Update policy
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.put('/policies/:id', [
  auth,
  requirePermission('insurance.manage'),
  requireAdminAccess,
  param('id').isMongoId().withMessage('Valid policy ID is required')
], async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user._id;

    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      admin_id: adminId
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Update allowed fields
    const allowedUpdates = [
      'provider_name', 'provider_contact', 'coverage_type', 'coverage_amount',
      'premium_amount', 'deductible', 'start_date', 'end_date', 'renewal_date',
      'status', 'risk_factors', 'terms_conditions', 'premium_factors',
      'auto_renewal', 'notifications_enabled', 'notes', 'tags'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        policy[field] = req.body[field];
      }
    });

    policy.updated_by = req.user._id;
    await policy.save();

    res.json({
      message: 'Policy updated successfully',
      policy
    });

  } catch (error) {
    console.error('Update policy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/policies/{id}/batches:
 *   post:
 *     summary: Add batch to policy coverage
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.post('/policies/:id/batches', [
  auth,
  requirePermission('insurance.manage'),
  requireAdminAccess,
  param('id').isMongoId().withMessage('Valid policy ID is required'),
  [
    body('batch_id').isMongoId().withMessage('Valid batch ID is required'),
    body('coverage_value').isFloat({ min: 0 }).withMessage('Coverage value must be positive')
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminId = req.user.admin_id || req.user._id;

    const policy = await InsurancePolicy.findOne({
      _id: req.params.id,
      admin_id: adminId
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Verify batch exists and belongs to admin
    const batch = await GrainBatch.findOne({
      _id: req.body.batch_id,
      admin_id: adminId
    });

    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    await policy.addBatch(
      req.body.batch_id,
      batch.grain_type,
      batch.quantity_kg,
      req.body.coverage_value
    );

    res.json({
      message: 'Batch added to policy coverage successfully',
      policy
    });

  } catch (error) {
    console.error('Add batch to policy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/claims:
 *   get:
 *     summary: Get all claims for admin
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get('/claims', [
  auth,
  requirePermission('insurance.view'),
  requireAdminAccess
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const adminId = req.user.admin_id || req.user._id;

    const filter = { admin_id: adminId };

    if (req.query.status) filter.status = req.query.status;
    if (req.query.claim_type) filter.claim_type = req.query.claim_type;

    const [claims, total] = await Promise.all([
      InsuranceClaim.find(filter)
        .populate('policy_id', 'policy_number provider_name')
        .populate('batch_affected.batch_id', 'batch_id grain_type')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InsuranceClaim.countDocuments(filter)
    ]);

    res.json({
      claims,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total / limit),
        total_items: total,
        items_per_page: limit
      }
    });

  } catch (error) {
    console.error('Get claims error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/claims:
 *   post:
 *     summary: Create new insurance claim
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.post('/claims', [
  auth,
  requirePermission('insurance.manage'),
  requireAdminAccess,
  [
    body('policy_id').isMongoId().withMessage('Valid policy ID is required'),
    body('claim_type').isIn(['Fire', 'Theft', 'Spoilage', 'Weather Damage', 'Equipment Failure', 'Other']).withMessage('Invalid claim type'),
    body('description').notEmpty().withMessage('Description is required'),
    body('amount_claimed').isFloat({ min: 0 }).withMessage('Amount claimed must be positive'),
    body('incident_date').isISO8601().withMessage('Valid incident date is required'),
    body('batch_affected.batch_id').isMongoId().withMessage('Valid batch ID is required'),
    body('batch_affected.quantity_affected').isFloat({ min: 0 }).withMessage('Quantity affected must be positive')
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const adminId = req.user.admin_id || req.user._id;

    // Verify policy exists and belongs to admin
    const policy = await InsurancePolicy.findOne({
      _id: req.body.policy_id,
      admin_id: adminId
    });

    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }

    // Generate claim number
    const claimCount = await InsuranceClaim.countDocuments({ admin_id: adminId });
    const claimNumber = `CLM-${new Date().getFullYear()}-${String(claimCount + 1).padStart(3, '0')}`;

    const claim = new InsuranceClaim({
      ...req.body,
      claim_number: claimNumber,
      admin_id: adminId,
      created_by: req.user._id
    });

    await claim.save();

    // Update policy claims count
    policy.claims_count += 1;
    await policy.save();

    // Log & alert
    try {
      await LoggingService.logInsuranceClaimFiled(req.user, claim, req.ip);
      await AlertEngine.processLogEntry({
        action: 'insurance_claim_filed',
        admin_id: adminId,
        user_id: req.user._id,
        user_name: req.user.name,
        entity_ref: claimNumber,
        description: `New insurance claim ${claimNumber} filed for ${req.body.claim_type} - PKR ${req.body.amount_claimed?.toLocaleString()}`,
        category: 'insurance'
      });
    } catch (logErr) { console.error('Logging error:', logErr.message); }

    res.status(201).json({
      message: 'Claim created successfully',
      claim
    });

  } catch (error) {
    console.error('Create claim error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /insurance/statistics:
 *   get:
 *     summary: Get insurance statistics for admin
 *     tags: [Insurance]
 *     security:
 *       - bearerAuth: []
 */
router.get('/statistics', [
  auth,
  requirePermission('insurance.view'),
  requireAdminAccess
], async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user._id;

    const filter = req.user.role === 'super_admin'
      ? (req.query.admin_id ? { admin_id: req.query.admin_id } : {})
      : { admin_id: adminId };

    const policies = await InsurancePolicy.find(filter);
    const claims = await InsuranceClaim.find(filter);

    const stats = {
      total_policies: policies.length,
      active_policies: policies.filter(p => p.status === 'active').length,
      total_coverage: policies.reduce((sum, p) => sum + p.coverage_amount, 0),
      total_premium: policies.reduce((sum, p) => sum + p.premium_amount, 0),
      total_claims: claims.length,
      approved_claims: claims.filter(c => c.status === 'approved').length,
      total_claims_amount: claims.reduce((sum, c) => sum + c.amount_approved, 0),
      average_risk_score: policies.length > 0 ?
        Math.round(policies.reduce((sum, p) => sum + p.overall_risk_score, 0) / policies.length) : 0
    };

    res.json(stats);

  } catch (error) {
    console.error('Get insurance statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /insurance/request-coverage - Admin requests insurance from super admin
router.post('/request-coverage',
  auth,
  [
    body('preferred_provider').isString().withMessage('Provider is required'),
    body('coverage_type').isString().withMessage('Coverage type is required'),
    body('message').isString().notEmpty().withMessage('Message is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const User = require('../models/User');
      const sendEmail = require('../utils/emailHelper');

      // Find all super admins
      const superAdmins = await User.find({ role: 'super_admin' }).select('email name');
      if (!superAdmins.length) {
        return res.status(404).json({ error: 'No system administrators found' });
      }

      const { preferred_provider, coverage_type, message } = req.body;
      const requesterName = req.user.name || req.user.email;
      const requesterEmail = req.user.email;

      const subject = `Insurance Coverage Request from ${requesterName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0;">🛡️ Insurance Coverage Request</h2>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <p style="color: #374151;"><strong>${requesterName}</strong> (${requesterEmail}) has requested insurance coverage.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 12px; background: #fef3c7; border-radius: 4px; font-weight: 600;">Preferred Provider</td>
                <td style="padding: 8px 12px;">${preferred_provider}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; background: #fef3c7; border-radius: 4px; font-weight: 600;">Coverage Type</td>
                <td style="padding: 8px 12px;">${coverage_type}</td>
              </tr>
            </table>
            <div style="background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0 0 4px; font-weight: 600; color: #374151;">Message:</p>
              <p style="margin: 0; color: #6b7280;">${message}</p>
            </div>
            <p style="mragin-top: 20px; color: #9ca3af; font-size: 12px;">This request was sent from GrainHero Insurance module.</p>
          </div>
        </div>
      `;

      // Send email to all super admins
      for (const admin of superAdmins) {
        try {
          await sendEmail(admin.email, subject, message, html);
        } catch (emailErr) {
          console.error(`Failed to send email to ${admin.email}:`, emailErr.message);
        }
      }

      // Log the coverage request
      try {
        await LoggingService.logInsuranceCoverageRequested(req.user, req.body, req.ip);
      } catch (logErr) { console.error('Logging error:', logErr.message); }

      res.json({ success: true, message: 'Request sent to system administrator(s)' });

    } catch (error) {
      console.error('Request coverage error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ══════════════════════════════════════════════════════════════════
// NEW CLAIM LIFECYCLE ENDPOINTS
// ══════════════════════════════════════════════════════════════════

/**
 * GET /insurance/claims/:id — Get claim details
 */
router.get('/claims/:id', [
  auth,
  requirePermission('insurance.view'),
  requireAdminAccess,
  param('id').isMongoId().withMessage('Valid claim ID is required')
], async (req, res) => {
  try {
    const adminId = req.user.admin_id || req.user._id;

    const filter = req.user.role === 'super_admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, admin_id: adminId };

    const claim = await InsuranceClaim.findOne(filter)
      .populate('policy_id', 'policy_number provider_name coverage_type')
      .populate('batch_affected.batch_id', 'batch_id grain_type quantity_kg')
      .populate('created_by', 'name email role')
      .populate('reviewed_by', 'name email role')
      .populate('investigation.assigned_to', 'name email')
      .populate('communications.from_user', 'name email role');

    if (!claim) {
      return res.status(404).json({ error: 'Claim not found' });
    }

    res.json(claim);
  } catch (error) {
    console.error('Get claim detail error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /insurance/claims/:id/review — Super admin starts review/investigation
 */
router.post('/claims/:id/review', [
  auth,
  requirePermission('insurance.manage'),
  param('id').isMongoId().withMessage('Valid claim ID is required')
], async (req, res) => {
  try {
    const claim = await InsuranceClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    claim.status = 'under_review';
    claim.reviewed_by = req.user._id;
    claim.review_date = new Date();

    // Set investigation details if provided
    if (req.body.investigation) {
      claim.investigation = {
        ...claim.investigation,
        ...req.body.investigation,
        assigned_to: req.body.investigation.assigned_to || req.user._id,
        started_at: new Date()
      };
    }

    await claim.save();

    // Log & notify
    try {
      await LoggingService.logInsuranceClaimReviewed(req.user, claim, req.ip);
      await NotificationService.notify({
        admin_id: claim.admin_id,
        recipient_ids: [claim.created_by],
        title: `🔍 Claim Under Review: ${claim.claim_number}`,
        message: `Your claim ${claim.claim_number} is now under review.`,
        type: 'info',
        category: 'insurance',
        entity_type: 'InsuranceClaim',
        entity_id: claim._id,
        action_url: '/insurance'
      });
    } catch (logErr) { console.error('Logging error:', logErr.message); }

    res.json({ message: 'Claim moved to review', claim });
  } catch (error) {
    console.error('Review claim error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /insurance/claims/:id/status — Update claim status (approve/reject/close)
 */
router.put('/claims/:id/status', [
  auth,
  requirePermission('insurance.manage'),
  param('id').isMongoId().withMessage('Valid claim ID is required'),
  body('status').isIn(['approved', 'rejected', 'processing', 'under_review', 'pending']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const claim = await InsuranceClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    const oldStatus = claim.status;
    claim.status = req.body.status;

    if (req.body.status === 'approved') {
      claim.amount_approved = req.body.amount_approved || claim.amount_claimed;
      claim.approved_date = new Date();
      claim.reviewed_by = req.user._id;

      // Log approval
      try {
        await LoggingService.logInsuranceClaimApproved(req.user, claim, claim.amount_approved, req.ip);
        await AlertEngine.processLogEntry({
          action: 'insurance_claim_approved',
          admin_id: claim.admin_id,
          user_id: req.user._id,
          user_name: req.user.name,
          entity_ref: claim.claim_number,
          description: `Claim ${claim.claim_number} approved for PKR ${claim.amount_approved?.toLocaleString()}`,
          category: 'insurance'
        });
      } catch (logErr) { console.error('Logging error:', logErr.message); }

    } else if (req.body.status === 'rejected') {
      claim.rejection_reason = req.body.reason || 'Claim rejected by reviewer';
      claim.reviewed_by = req.user._id;

      // Log rejection
      try {
        await LoggingService.logInsuranceClaimRejected(req.user, claim, claim.rejection_reason, req.ip);
        await AlertEngine.processLogEntry({
          action: 'insurance_claim_rejected',
          admin_id: claim.admin_id,
          user_id: req.user._id,
          user_name: req.user.name,
          entity_ref: claim.claim_number,
          description: `Claim ${claim.claim_number} rejected: ${claim.rejection_reason}`,
          category: 'insurance'
        });
      } catch (logErr) { console.error('Logging error:', logErr.message); }
    }

    // Add to communications log
    if (req.body.notes) {
      claim.communications = claim.communications || [];
      claim.communications.push({
        from_user: req.user._id,
        message: `Status changed from ${oldStatus} to ${req.body.status}. ${req.body.notes || ''}`,
        sent_at: new Date()
      });
    }

    await claim.save();

    // Notify claim creator
    try {
      await NotificationService.notify({
        admin_id: claim.admin_id,
        recipient_ids: [claim.created_by],
        title: `🛡️ Claim ${req.body.status === 'approved' ? 'Approved ✅' : req.body.status === 'rejected' ? 'Rejected ❌' : 'Updated'}`,
        message: `Your claim ${claim.claim_number} has been ${req.body.status}. ${req.body.notes || ''}`,
        type: req.body.status === 'approved' ? 'success' : req.body.status === 'rejected' ? 'warning' : 'info',
        category: 'insurance',
        entity_type: 'InsuranceClaim',
        entity_id: claim._id,
        action_url: '/insurance',
        channels: { in_app: true, email: true, sms: false }
      });
    } catch (logErr) { console.error('Notification error:', logErr.message); }

    res.json({ message: `Claim ${req.body.status} successfully`, claim });
  } catch (error) {
    console.error('Update claim status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /insurance/claims/:id/investigation — Update investigation findings
 */
router.put('/claims/:id/investigation', [
  auth,
  requirePermission('insurance.manage'),
  param('id').isMongoId().withMessage('Valid claim ID is required')
], async (req, res) => {
  try {
    const claim = await InsuranceClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    claim.investigation = {
      ...claim.investigation,
      ...req.body,
      updated_at: new Date()
    };

    await claim.save();

    try {
      await LoggingService.log({
        action: 'insurance_claim_updated',
        category: 'insurance',
        description: `Investigation updated for claim ${claim.claim_number}`,
        user: req.user,
        entity_type: 'InsuranceClaim',
        entity_id: claim._id,
        entity_ref: claim.claim_number,
        metadata: { update_type: 'investigation' },
        ip_address: req.ip
      });
    } catch (logErr) { console.error('Logging error:', logErr.message); }

    res.json({ message: 'Investigation updated', claim });
  } catch (error) {
    console.error('Update investigation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /insurance/claims/:id/assessment — Update damage assessment & settlement
 */
router.put('/claims/:id/assessment', [
  auth,
  requirePermission('insurance.manage'),
  param('id').isMongoId().withMessage('Valid claim ID is required')
], async (req, res) => {
  try {
    const claim = await InsuranceClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    claim.assessment = {
      ...claim.assessment,
      ...req.body,
      assessed_by: req.user._id,
      assessed_at: new Date()
    };

    await claim.save();

    try {
      await LoggingService.log({
        action: 'insurance_claim_updated',
        category: 'insurance',
        description: `Assessment updated for claim ${claim.claim_number}`,
        user: req.user,
        entity_type: 'InsuranceClaim',
        entity_id: claim._id,
        entity_ref: claim.claim_number,
        metadata: { update_type: 'assessment' },
        ip_address: req.ip
      });
    } catch (logErr) { console.error('Logging error:', logErr.message); }

    res.json({ message: 'Assessment updated', claim });
  } catch (error) {
    console.error('Update assessment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /insurance/claims/:id/payment — Record claim settlement payment
 */
router.post('/claims/:id/payment', [
  auth,
  requirePermission('insurance.manage'),
  param('id').isMongoId().withMessage('Valid claim ID is required'),
  [
    body('amount').isFloat({ min: 0 }).withMessage('Payment amount must be positive'),
    body('payment_method').notEmpty().withMessage('Payment method is required')
  ]
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const claim = await InsuranceClaim.findById(req.params.id);
    if (!claim) return res.status(404).json({ error: 'Claim not found' });

    claim.settlement = {
      ...claim.settlement,
      ...req.body,
      payment_date: new Date(),
      status: 'paid'
    };

    claim.status = 'processing'; // Mark as processing for final closure

    await claim.save();

    try {
      await LoggingService.logInsuranceClaimPaymentProcessed(req.user, claim, req.body, req.ip);
    } catch (logErr) { console.error('Logging error:', logErr.message); }

    res.json({ message: 'Payment recorded', claim });
  } catch (error) {
    console.error('Record claim payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
