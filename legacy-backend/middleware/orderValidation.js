module.exports = function validateOrder(req, res, next) {
  const requiredFields = [
    'userId', 'firstName', 'lastName', 'email', 'address', 'city', 'state', 'zipCode', 'country',
    'cardNumber', 'expiryDate', 'cvv', 'cardName', 'products'
  ];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }
  
  // Validate userId format (MongoDB ObjectId)
  if (!/^[0-9a-fA-F]{24}$/.test(req.body.userId)) {
    return res.status(400).json({ error: 'Invalid userId format' });
  }
  
  // Validate orderStatus if provided
  if (req.body.orderStatus) {
    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(req.body.orderStatus)) {
      return res.status(400).json({ error: 'Invalid orderStatus value' });
    }
  }
  
  if (!Array.isArray(req.body.products) || req.body.products.length === 0) {
    return res.status(400).json({ error: 'Products must be a non-empty array' });
  }
  for (const p of req.body.products) {
    if (!p.id || typeof p.id !== 'string') {
      return res.status(400).json({ error: 'Each product must have a string id' });
    }
    if (!Number.isInteger(p.quantity) || p.quantity < 1) {
      return res.status(400).json({ error: 'Each product must have a quantity >= 1' });
    }
  }
  // Basic email format check
  if (!/^\S+@\S+\.\S+$/.test(req.body.email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  next();
} 