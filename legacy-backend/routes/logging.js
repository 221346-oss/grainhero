const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { body, param, validationResult } = require('express-validator');
const GrainBatch = require('../models/GrainBatch');
const BuyerInvoice = require('../models/BuyerInvoice');
const BuyerPayment = require('../models/BuyerPayment');
const DispatchTransaction = require('../models/DispatchTransaction');
const Buyer = require('../models/Buyer');
const ActivityLog = require('../models/ActivityLog');
const LoggingService = require('../services/loggingService');
const NotificationService = require('../services/notificationService');
const PDFService = require('../services/pdfService');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const streamifier = require('streamifier');

// Cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET
});

// Multer memory storage for cloudinary uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// =============================================
// SPOILAGE EVENT ENDPOINTS
// =============================================

/**
 * POST /api/logging/batches/:id/spoilage-events
 * Add a spoilage event to a batch
 */
router.post('/batches/:id/spoilage-events',
    auth,
    param('id').isMongoId(),
    [
        body('event_type').isIn(['mold', 'pests', 'moisture', 'heat', 'smell', 'contamination', 'other']),
        body('severity').isIn(['low', 'medium', 'high', 'critical']),
        body('description').optional().isString(),
        body('estimated_loss_kg').optional().isFloat({ min: 0 }),
        body('estimated_value_loss').optional().isFloat({ min: 0 })
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const batch = await GrainBatch.findOne({
                _id: req.params.id,
                admin_id: req.user.admin_id || req.user._id
            });

            if (!batch) {
                return res.status(404).json({ error: 'Batch not found' });
            }

            const spoilageEvent = {
                event_id: `SP-${Date.now()}`,
                event_type: req.body.event_type,
                severity: req.body.severity,
                description: req.body.description,
                estimated_loss_kg: req.body.estimated_loss_kg,
                estimated_value_loss: req.body.estimated_value_loss,
                detected_date: new Date(),
                reported_by: req.user._id,
                photos: [],
                environmental_conditions: req.body.environmental_conditions || {}
            };

            batch.spoilage_events.push(spoilageEvent);
            batch.updated_by = req.user._id;
            await batch.save();

            // Log the event
            await LoggingService.logSpoilageEvent(req.user, batch, spoilageEvent, req.ip);

            // Send notifications (email to admin/manager)
            const adminId = req.user.admin_id || req.user._id;
            await NotificationService.notifySpoilageEvent(adminId, batch, spoilageEvent);

            res.status(201).json({
                message: 'Spoilage event logged successfully',
                event: spoilageEvent,
                batch_id: batch.batch_id
            });
        } catch (error) {
            console.error('Log spoilage event error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * POST /api/logging/batches/:id/spoilage-events/:eventId/photos
 * Upload photos for a spoilage event (Cloudinary)
 */
router.post('/batches/:id/spoilage-events/:eventId/photos',
    auth,
    upload.array('photos', 5),
    async (req, res) => {
        try {
            const batch = await GrainBatch.findOne({
                _id: req.params.id,
                admin_id: req.user.admin_id || req.user._id
            });

            if (!batch) {
                return res.status(404).json({ error: 'Batch not found' });
            }

            const event = batch.spoilage_events.find(e => e.event_id === req.params.eventId);
            if (!event) {
                return res.status(404).json({ error: 'Spoilage event not found' });
            }

            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const uploadedPhotos = [];

            for (const file of req.files) {
                // Upload to Cloudinary
                const result = await new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: `grainhero/spoilage/${batch.batch_id}`,
                            resource_type: 'image',
                            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    streamifier.createReadStream(file.buffer).pipe(uploadStream);
                });

                uploadedPhotos.push({
                    filename: result.public_id,
                    original_name: file.originalname,
                    path: result.secure_url,
                    size: file.size,
                    upload_date: new Date()
                });
            }

            event.photos.push(...uploadedPhotos);
            await batch.save();

            // Log photo upload
            await LoggingService.log({
                action: 'spoilage_photo_uploaded',
                category: 'spoilage',
                description: `${uploadedPhotos.length} photo(s) uploaded for spoilage event on batch ${batch.batch_id}`,
                user: req.user,
                entity_type: 'GrainBatch',
                entity_id: batch._id,
                entity_ref: batch.batch_id,
                ip_address: req.ip
            });

            res.json({
                message: `${uploadedPhotos.length} photo(s) uploaded successfully`,
                photos: uploadedPhotos
            });
        } catch (error) {
            console.error('Upload spoilage photos error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// =============================================
// BUYER INVOICE ENDPOINTS
// =============================================

/**
 * POST /api/logging/invoices
 * Generate an invoice for a dispatched batch
 */
router.post('/invoices',
    auth,
    [
        body('batch_id').isMongoId().withMessage('Valid batch ID is required'),
        body('buyer_id').isMongoId().withMessage('Valid buyer ID is required'),
        body('items').isArray({ min: 1 }).withMessage('At least one line item is required')
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const batch = await GrainBatch.findById(req.body.batch_id);
            if (!batch) return res.status(404).json({ error: 'Batch not found' });

            const buyer = await Buyer.findById(req.body.buyer_id);
            if (!buyer) return res.status(404).json({ error: 'Buyer not found' });

            // Generate invoice number
            const count = await BuyerInvoice.countDocuments();
            const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

            // Calculate totals
            const items = req.body.items.map(item => ({
                description: item.description || `${batch.grain_type} Dispatch`,
                grain_type: item.grain_type || batch.grain_type,
                quantity_kg: item.quantity_kg,
                price_per_kg: item.price_per_kg,
                amount: item.quantity_kg * item.price_per_kg
            }));

            const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

            const invoice = new BuyerInvoice({
                admin_id: req.user.admin_id || req.user._id,
                invoice_number: invoiceNumber,
                buyer_id: buyer._id,
                buyer_name: buyer.name,
                buyer_company: buyer.company_name,
                buyer_contact: {
                    email: buyer.contact_person?.email,
                    phone: buyer.contact_person?.phone,
                    address: buyer.location?.address ? `${buyer.location.address}, ${buyer.location.city || ''}` : ''
                },
                batch_id: batch._id,
                batch_ref: batch.batch_id,
                items,
                subtotal,
                total_amount: subtotal,
                currency: req.body.currency || 'PKR',
                due_date: req.body.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                notes: req.body.notes,
                created_by: req.user._id
            });

            await invoice.save();

            // Log it
            await LoggingService.logInvoiceGenerated(req.user, invoice, req.ip);

            // Notify
            const adminId = req.user.admin_id || req.user._id;
            await NotificationService.notifyInvoiceGenerated(adminId, invoiceNumber, buyer.name);

            res.status(201).json({
                message: 'Invoice generated successfully',
                invoice
            });
        } catch (error) {
            console.error('Generate invoice error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * GET /api/logging/invoices
 * List invoices
 */
router.get('/invoices', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let filter = {};
        if (req.user.role !== 'super_admin') {
            filter.admin_id = req.user.admin_id || req.user._id;
        }
        if (req.query.buyer_id) filter.buyer_id = req.query.buyer_id;
        if (req.query.payment_status) filter.payment_status = req.query.payment_status;

        const [invoices, total] = await Promise.all([
            BuyerInvoice.find(filter)
                .populate('buyer_id', 'name company_name')
                .populate('batch_id', 'batch_id grain_type')
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BuyerInvoice.countDocuments(filter)
        ]);

        res.json({
            invoices,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        });
    } catch (error) {
        console.error('Get invoices error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/logging/invoices/:id/pdf
 * Download invoice PDF
 */
router.get('/invoices/:id/pdf', auth, async (req, res) => {
    try {
        const invoice = await BuyerInvoice.findById(req.params.id)
            .populate('buyer_id')
            .populate('batch_id');

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const pdfBuffer = await PDFService.generateInvoicePDF(invoice);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Generate invoice PDF error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/logging/invoices/:id/email
 * Email invoice to buyer
 */
router.post('/invoices/:id/email', auth, async (req, res) => {
    try {
        const invoice = await BuyerInvoice.findById(req.params.id)
            .populate('buyer_id');

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        const buyerEmail = invoice.buyer_contact?.email || invoice.buyer_id?.contact_person?.email;
        if (!buyerEmail) {
            return res.status(400).json({ error: 'Buyer email not available' });
        }

        const pdfBuffer = await PDFService.generateInvoicePDF(invoice);

        // Send email with invoice details
        const html = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1a7a3a 0%, #2d9a4f 100%); padding: 24px; border-radius: 12px 12px 0 0;">
          <h2 style="color: #fff; margin: 0;">🌾 GrainHero Invoice</h2>
        </div>
        <div style="padding: 24px; background: #f8faf8; border: 1px solid #e0e8e0; border-top: none; border-radius: 0 0 12px 12px;">
          <p>Dear ${invoice.buyer_name},</p>
          <p>Please find your invoice details below:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Invoice #</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.invoice_number}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Batch</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.batch_ref}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Amount</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.currency} ${invoice.total_amount?.toLocaleString()}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Due Date</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}</td></tr>
          </table>
          <p style="color: #666;">The PDF invoice is attached to this email for your records.</p>
          <p>Thank you for your business!</p>
        </div>
      </div>
    `;

        // Send via the notification service
        await NotificationService.sendExternalEmail(
            buyerEmail,
            `Invoice #${invoice.invoice_number} from GrainHero`,
            `Invoice #${invoice.invoice_number} - Amount: ${invoice.currency} ${invoice.total_amount}`,
            html
        );

        invoice.emailed = true;
        invoice.emailed_at = new Date();
        await invoice.save();

        await LoggingService.logInvoiceEmailed(req.user, invoice, buyerEmail, req.ip);

        res.json({ message: `Invoice emailed to ${buyerEmail}` });
    } catch (error) {
        console.error('Email invoice error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/logging/batches/:id/invoice
 * Generate and download invoice PDF for a dispatched batch (auto-creates invoice if needed)
 */
router.get('/batches/:id/invoice', auth, async (req, res) => {
    try {
        const batch = await GrainBatch.findOne({
            _id: req.params.id,
            admin_id: req.user.admin_id || req.user._id
        }).populate('buyer_id');

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        // Check if invoice already exists for this batch
        let invoice = await BuyerInvoice.findOne({ batch_id: batch._id });

        if (!invoice) {
            // Auto-generate invoice from batch data
            const buyer = batch.buyer_id ? await Buyer.findById(batch.buyer_id._id || batch.buyer_id) : null;
            const buyerName = buyer?.name || batch.dispatch_details?.buyer_name || 'Unknown Buyer';

            const count = await BuyerInvoice.countDocuments();
            const invoiceNumber = `INV-${String(count + 1).padStart(5, '0')}`;

            const qty = batch.dispatched_quantity_kg || batch.dispatch_details?.quantity || batch.quantity_kg || 0;
            const pricePerKg = batch.sell_price_per_kg || batch.purchase_price_per_kg || 0;
            const amount = qty * pricePerKg;

            invoice = new BuyerInvoice({
                admin_id: req.user.admin_id || req.user._id,
                invoice_number: invoiceNumber,
                buyer_id: buyer?._id || null,
                buyer_name: buyerName,
                buyer_company: buyer?.company_name || '',
                buyer_contact: {
                    email: buyer?.contact_person?.email || '',
                    phone: buyer?.contact_person?.phone || '',
                    address: buyer?.location?.address ? `${buyer.location.address}, ${buyer.location.city || ''}` : ''
                },
                batch_id: batch._id,
                batch_ref: batch.batch_id,
                items: [{
                    description: `${batch.grain_type} - Dispatched`,
                    grain_type: batch.grain_type,
                    quantity_kg: qty,
                    price_per_kg: pricePerKg,
                    amount: amount
                }],
                subtotal: amount,
                total_amount: amount,
                currency: 'PKR',
                due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                created_by: req.user._id
            });

            await invoice.save();

            // Log the invoice generation
            await LoggingService.logInvoiceGenerated(req.user, invoice, req.ip);
        }

        // Generate PDF
        const pdfBuffer = await PDFService.generateInvoicePDF(invoice);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_number || batch.batch_id}.pdf`);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Generate batch invoice error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =============================================
// BUYER PAYMENT ENDPOINTS
// =============================================

/**
 * POST /api/logging/payments
 * Record a buyer payment
 */
router.post('/payments',
    auth,
    [
        body('buyer_id').isMongoId(),
        body('amount').isFloat({ min: 0.01 }),
        body('payment_method').isIn(['cash', 'bank_transfer', 'cheque', 'mobile_money', 'jazzcash', 'easypaisa', 'raast', 'sadapay', 'nayapay', 'other'])
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const buyer = await Buyer.findById(req.body.buyer_id);
            if (!buyer) return res.status(404).json({ error: 'Buyer not found' });

            const payment = new BuyerPayment({
                admin_id: req.user.admin_id || req.user._id,
                buyer_id: req.body.buyer_id,
                invoice_id: req.body.invoice_id || null,
                batch_id: req.body.batch_id || null,
                amount: req.body.amount,
                currency: req.body.currency || 'PKR',
                payment_method: req.body.payment_method,
                payment_reference: req.body.payment_reference,
                payment_date: req.body.payment_date || new Date(),
                notes: req.body.notes,
                recorded_by: req.user._id
            });

            await payment.save();

            // If linked to invoice, update invoice payment status
            if (req.body.invoice_id) {
                const invoice = await BuyerInvoice.findById(req.body.invoice_id);
                if (invoice) {
                    invoice.amount_paid = (invoice.amount_paid || 0) + req.body.amount;
                    invoice.payment_method = req.body.payment_method;
                    if (invoice.amount_paid >= invoice.total_amount) {
                        invoice.payment_status = 'paid';
                        invoice.paid_at = new Date();
                    } else {
                        invoice.payment_status = 'partial';
                    }
                    await invoice.save();
                }
            }

            // Log it
            await LoggingService.logBuyerPayment(req.user, payment, buyer.name, req.ip);

            // Notify
            const adminId = req.user.admin_id || req.user._id;
            await NotificationService.notifyPaymentReceived(adminId, buyer.name, req.body.amount, req.body.currency || 'PKR');

            res.status(201).json({
                message: 'Payment recorded successfully',
                payment
            });
        } catch (error) {
            console.error('Record payment error:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

/**
 * GET /api/logging/payments
 * List buyer payments
 */
router.get('/payments', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let filter = {};
        if (req.user.role !== 'super_admin') {
            filter.admin_id = req.user.admin_id || req.user._id;
        }
        if (req.query.buyer_id) filter.buyer_id = req.query.buyer_id;

        const [payments, total] = await Promise.all([
            BuyerPayment.find(filter)
                .populate('buyer_id', 'name company_name')
                .populate('invoice_id', 'invoice_number total_amount')
                .populate('batch_id', 'batch_id grain_type')
                .sort({ payment_date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            BuyerPayment.countDocuments(filter)
        ]);

        res.json({
            payments,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        });
    } catch (error) {
        console.error('Get payments error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =============================================
// BATCH PDF REPORT
// =============================================

/**
 * GET /api/logging/batches/:id/report
 * Generate and download batch PDF report
 */
router.get('/batches/:id/report', auth, async (req, res) => {
    try {
        const batch = await GrainBatch.findById(req.params.id)
            .populate('silo_id', 'name silo_id')
            .populate('buyer_id', 'name company_name contact_person')
            .populate('created_by', 'name email');

        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        // Get activity logs for timeline
        const activityLogs = await ActivityLog.find({
            entity_id: batch._id,
            entity_type: 'GrainBatch'
        }).sort({ created_at: 1 }).lean();

        const pdfBuffer = await PDFService.generateBatchReport(batch, activityLogs);

        // Log report generation
        await LoggingService.logReportGenerated(req.user, 'Batch Traceability', batch.batch_id, req.ip);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=batch-report-${batch.batch_id}.pdf`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Generate batch report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// =============================================
// DISPATCH TRANSACTIONS
// =============================================

/**
 * GET /api/logging/dispatches
 * List dispatch transactions
 */
router.get('/dispatches', auth, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        let filter = {};
        if (req.user.role !== 'super_admin') {
            filter.admin_id = req.user.admin_id || req.user._id;
        }
        if (req.query.buyer_id) filter.buyer_id = req.query.buyer_id;
        if (req.query.batch_id) filter.batch_id = req.query.batch_id;

        const [dispatches, total] = await Promise.all([
            DispatchTransaction.find(filter)
                .populate('batch_id', 'batch_id grain_type')
                .populate('buyer_id', 'name company_name')
                .sort({ dispatch_date: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            DispatchTransaction.countDocuments(filter)
        ]);

        res.json({
            dispatches,
            pagination: {
                current_page: page,
                total_pages: Math.ceil(total / limit),
                total_items: total,
                items_per_page: limit
            }
        });
    } catch (error) {
        console.error('Get dispatches error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
