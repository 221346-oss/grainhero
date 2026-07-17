const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const validateOrder = require('../middleware/orderValidation');
const { auth } = require('../middleware/auth');
const superadmin = require('../middleware/superadmin');

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - firstName
 *               - lastName
 *               - email
 *               - address
 *               - city
 *               - state
 *               - zipCode
 *               - country
 *               - cardNumber
 *               - expiryDate
 *               - cvv
 *               - cardName
 *               - products
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID (MongoDB ObjectId)
 *               orderStatus:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *                 default: pending
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               address:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               country:
 *                 type: string
 *               cardNumber:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *               cvv:
 *                 type: string
 *               cardName:
 *                 type: string
 *               orderNotes:
 *                 type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - id
 *                     - quantity
 *                   properties:
 *                     id:
 *                       type: string
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Bad request
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders
 *     tags: [Orders]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *         description: Filter orders by status
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter orders by user ID
 *     responses:
 *       200:
 *         description: List of orders
 */

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get an order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order found
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status (Super Admin only)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderStatus
 *             properties:
 *               orderStatus:
 *                 type: string
 *                 enum: [pending, confirmed, processing, shipped, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 *       404:
 *         description: Order not found
 *       400:
 *         description: Invalid status
 *       403:
 *         description: Access denied. Super admin only.
 */

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete an order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted
 *       404:
 *         description: Order not found
 */

/**
 * @swagger
 * /orders/user/{userId}:
 *   get:
 *     summary: Get all orders for a specific user
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of orders for the user
 *       404:
 *         description: No orders found for this user
 */

// Create a new order
router.post('/', validateOrder, async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all orders with optional filtering
router.get('/', async (req, res) => {
  try {
    const { status, userId } = req.query;
    const filter = {};
    
    if (status) {
      filter.orderStatus = status;
    }
    
    if (userId) {
      filter.userId = userId;
    }
    
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update order status
router.patch('/:id/status', auth, superadmin, async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    if (!orderStatus || !validStatuses.includes(orderStatus)) {
      return res.status(400).json({ error: 'Invalid orderStatus value' });
    }
    
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    );
    
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /orders/user/{userId}:
 *   get:
 *     summary: Get all orders for a specific user
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of orders for the user
 *       404:
 *         description: No orders found for this user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Validate userId format (MongoDB ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return res.status(400).json({ error: 'Invalid userId format. Must be a MongoDB ObjectId.' });
    }
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'No orders found for this user' });
    }
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /orders/{orderId}/product/{productId}/rate:
 *   patch:
 *     summary: Add a rating to a product from an order (only if order is delivered)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product rated successfully
 *       400:
 *         description: Bad request or already rated
 *       404:
 *         description: Order or product not found
 *
 *   put:
 *     summary: Update a rating for a product from an order (only if order is delivered)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - value
 *             properties:
 *               value:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product rating updated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Order, product, or rating not found
 *
 *   delete:
 *     summary: Delete a rating for a product from an order (only if order is delivered)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product rating deleted successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Order, product, or rating not found
 */
// Rate a product from an order (only if order is delivered)
router.patch('/:orderId/product/:productId/rate', auth, async (req, res) => {
  const { orderId, productId } = req.params;
  const { value, comment } = req.body;

  if (!value || typeof value !== 'number' || value < 1 || value > 5) {
    return res.status(400).json({ error: 'Rating value must be between 1 and 5.' });
  }

  try {
    // Find the order
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Check if product exists in order
    const productInOrder = order.products.find(p => p.id === productId);
    if (!productInOrder) {
      return res.status(404).json({ error: 'Product not found in this order.' });
    }

    // Check if order is delivered
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ error: 'Cannot rate product unless order is delivered.' });
    }

    // Add rating to the product (in Product model)
    const Product = require('../models/Product');
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });

    // Prevent duplicate rating by same user
    if (product.ratings.some(r => r.user.toString() === req.user.id)) {
      return res.status(400).json({ error: 'You have already rated this product.' });
    }

    product.ratings.push({ user: req.user.id, value, comment });
    await product.save();

    res.status(201).json({ message: 'Product rated successfully.', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a rating for a product from an order (only if order is delivered)
router.put('/:orderId/product/:productId/rate', auth, async (req, res) => {
  const { orderId, productId } = req.params;
  const { value, comment } = req.body;

  if (!value || typeof value !== 'number' || value < 1 || value > 5) {
    return res.status(400).json({ error: 'Rating value must be between 1 and 5.' });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const productInOrder = order.products.find(p => p.id === productId);
    if (!productInOrder) {
      return res.status(404).json({ error: 'Product not found in this order.' });
    }
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ error: 'Cannot update rating unless order is delivered.' });
    }
    const Product = require('../models/Product');
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const rating = product.ratings.find(r => r.user.toString() === req.user.id);
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found for this user.' });
    }
    rating.value = value;
    rating.comment = comment;
    await product.save();
    res.json({ message: 'Product rating updated successfully.', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a rating for a product from an order (only if order is delivered)
router.delete('/:orderId/product/:productId/rate', auth, async (req, res) => {
  const { orderId, productId } = req.params;
  try {
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const productInOrder = order.products.find(p => p.id === productId);
    if (!productInOrder) {
      return res.status(404).json({ error: 'Product not found in this order.' });
    }
    if (order.orderStatus !== 'delivered') {
      return res.status(400).json({ error: 'Cannot delete rating unless order is delivered.' });
    }
    const Product = require('../models/Product');
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    const initialLength = product.ratings.length;
    product.ratings = product.ratings.filter(r => r.user.toString() !== req.user.id);
    if (product.ratings.length === initialLength) {
      return res.status(404).json({ error: 'Rating not found for this user.' });
    }
    await product.save();
    res.json({ message: 'Product rating deleted successfully.', product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an order by ID
router.delete('/:id', auth, superadmin, async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json({ message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 