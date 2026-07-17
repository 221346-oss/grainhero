const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkRecentUsers() {
  try {
    const mongoUri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    const recentUsers = await User.find({}).sort({ createdAt: -1 }).limit(10);
    console.log('Recent Users:');
    recentUsers.forEach(u => {
      console.log(`Email: ${u.email}, Role: ${u.role}, hasAccess: ${u.hasAccess}, customerId: ${u.customerId}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkRecentUsers();
