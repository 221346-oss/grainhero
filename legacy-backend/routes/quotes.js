const express = require('express');
const router = express.Router();
const Quote = require('../models/Quote');
const superadmin = require('../middleware/superadmin');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

/**
 * @swagger
 * tags:
 *   name: Quotes
 *   description: Manage product bulk order quotes
 */

/**
 * @swagger
 * /quotes:
 *   post:
 *     summary: Create a new quote (public)
 *     tags: [Quotes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - productName
 *               - productCurrentPrice
 *               - buyerId
 *               - buyerName
 *               - buyerEmail
 *               - quantity
 *               - buyerPhone
 *             properties:
 *               productId:
 *                 type: string
 *               productName:
 *                 type: string
 *               productCurrentPrice:
 *                 type: number
 *               buyerId:
 *                 type: string
 *               buyerName:
 *                 type: string
 *               buyerEmail:
 *                 type: string
 *               quantity:
 *                 type: number
 *               buyerPhone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quote created
 *       400:
 *         description: Bad request
 */
router.post('/', async (req, res) => {
  try {
    const { productId, productName, productCurrentPrice, buyerId, buyerName, buyerEmail, quantity, buyerPhone } = req.body;
    const quote = new Quote({
      quoteId: uuidv4(),
      productId,
      productName,
      productCurrentPrice,
      buyerId,
      buyerName,
      buyerEmail,
      quantity,
      buyerPhone
    });
    await quote.save();
    res.status(201).json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /quotes:
 *   get:
 *     summary: Get all quotes (SuperAdmin only)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all quotes
 *       403:
 *         description: Access denied
 */
router.get('/', auth, superadmin, async (req, res) => {
  try {
    const quotes = await Quote.find();
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /quotes/{id}/status:
 *   patch:
 *     summary: Update quote status (SuperAdmin only)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Quote ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, reviewed, approved, rejected]
 *     responses:
 *       200:
 *         description: Quote status updated
 *       400:
 *         description: Bad request
 *       403:
 *         description: Access denied
 *       404:
 *         description: Quote not found
 */
router.patch('/:id/status', auth, superadmin, async (req, res) => {
  try {
    const { status } = req.body;
    const quote = await Quote.findOneAndUpdate({ quoteId: req.params.id }, { status }, { new: true });
    if (!quote) return res.status(404).json({ error: 'Quote not found' });
    res.json(quote);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /quotes/buyer/{buyerId}:
 *   get:
 *     summary: Get quotes for a specific buyer (SuperAdmin only)
 *     tags: [Quotes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: buyerId
 *         schema:
 *           type: string
 *         required: true
 *         description: Buyer ID
 *     responses:
 *       200:
 *         description: List of quotes for the buyer
 *       403:
 *         description: Access denied
 */
router.get('/buyer/:buyerId', auth, superadmin, async (req, res) => {
  try {
    const quotes = await Quote.find({ buyerId: req.params.buyerId });
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 