const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const superadmin = require('../middleware/superadmin');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
require('dotenv').config();

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

let streamUpload = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream((error, result) => {
      if (result) {
        resolve(result);
      } else {
        reject(error);
      }
    });
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

async function uploadFile(file) {
  let result = await streamUpload(file.buffer);
  return result;
}

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Marketplace product management
 */

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
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
 *                 example: Organic Goat Milk
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://images.unsplash.com/photo-1519125323398-675f0ddb6308"]
 *               description:
 *                 type: string
 *                 example: Fresh, organic goat milk from grass-fed goats.
 *               price:
 *                 type: number
 *                 example: 12.99
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["milk", "organic", "dairy"]
 *     responses:
 *       201:
 *         description: Product created
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized, missing or invalid JWT
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 */

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product found
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             properties:
 *               name:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Product updated
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized, missing or invalid JWT
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted
 *       401:
 *         description: Unauthorized, missing or invalid JWT
 *       404:
 *         description: Product not found
 */

// Create a new product (protected)
router.post('/', auth, superadmin, upload.array('images'), async (req, res) => {
  try {
    const { name, description, price, tags, location } = req.body;
    let images = [];
    // Handle multipart image upload to Cloudinary
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadFile(file));
      const uploadResults = await Promise.all(uploadPromises);
      images = uploadResults.map(result => result.secure_url);
    } else if (req.body.images) {
      // Support direct image URLs
      images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }
    const product = new Product({ name, images, description, price, tags, location });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a product (protected)
router.put('/:id', auth, superadmin, upload.array('images'), async (req, res) => {
  try {
    const { name, description, price, tags, location } = req.body;
    let images = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => uploadFile(file));
      const uploadResults = await Promise.all(uploadPromises);
      images = uploadResults.map(result => result.secure_url);
    } else if (req.body.images) {
      images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }
    const updateData = { name, description, price, tags, location };
    if (images.length > 0) updateData.images = images;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a product (protected)
router.delete('/:id', auth, superadmin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a rating to a product
router.post('/:id/ratings', auth, async (req, res) => {
  try {
    const { value, comment } = req.body;
    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ error: 'Rating value must be between 1 and 5.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    // Prevent duplicate rating by same user
    if (product.ratings.some(r => r.user.toString() === req.user.id)) {
      return res.status(400).json({ error: 'You have already rated this product.' });
    }
    product.ratings.push({ user: req.user.id, value, comment });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a rating for a product
router.put('/:id/ratings', auth, async (req, res) => {
  try {
    const { value, comment } = req.body;
    if (!value || value < 1 || value > 5) {
      return res.status(400).json({ error: 'Rating value must be between 1 and 5.' });
    }
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const rating = product.ratings.find(r => r.user.toString() === req.user.id);
    if (!rating) {
      return res.status(404).json({ error: 'Rating not found for this user.' });
    }
    rating.value = value;
    rating.comment = comment;
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a rating for a product
router.delete('/:id/ratings', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const initialLength = product.ratings.length;
    product.ratings = product.ratings.filter(r => r.user.toString() !== req.user.id);
    if (product.ratings.length === initialLength) {
      return res.status(404).json({ error: 'Rating not found for this user.' });
    }
    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get average rating for a product
router.get('/:id/ratings', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (!product.ratings || product.ratings.length === 0) {
      return res.json({ average: 0 });
    }
    const sum = product.ratings.reduce((acc, r) => acc + r.value, 0);
    const avg = sum / product.ratings.length;
    res.json({ average: avg });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 