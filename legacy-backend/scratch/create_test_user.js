const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function run() {
  const cs = process.env.MONGO_URI || 
    'mongodb+srv://' + process.env.MONGO_USER + ':' + process.env.MONGO_PASS + 
    '@cluster0.ycda7xy.mongodb.net/' + process.env.DATABASE_NAME + '?retryWrites=true&w=majority';
  
  await mongoose.connect(cs);
  console.log('Connected to MongoDB');

  const existing = await User.findOne({ email: 'atifnazir105@gmail.com' });
  
  if (existing) {
    console.log('User exists, updating... Current role:', existing.role);
    existing.name = 'Atif Nazir';
    existing.role = 'admin';
    existing.hasAccess = 'basic';
    existing.subscription_plan = 'basic';
    existing.emailVerified = true;
    existing.firstLogin = true;
    existing.password = 'AAtif.123';
    await existing.save();
    console.log('Updated to admin with Starter plan');
  } else {
    const u = new User({
      name: 'Atif Nazir',
      email: 'atifnazir105@gmail.com',
      password: 'AAtif.123',
      role: 'admin',
      hasAccess: 'basic',
      subscription_plan: 'basic',
      emailVerified: true,
      firstLogin: true,
      status: 'active',
      business_type: 'farm'
    });
    await u.save();
    console.log('Created new user:', u._id);
  }

  // Verify
  const v = await User.findOne({ email: 'atifnazir105@gmail.com' }).select('+password');
  const ok = await v.comparePassword('AAtif.123');
  console.log('Password verification:', ok ? 'SUCCESS' : 'FAILED');
  console.log('Final user state:', {
    id: v._id.toString(),
    role: v.role,
    hasAccess: v.hasAccess,
    plan: v.subscription_plan,
    firstLogin: v.firstLogin
  });

  await mongoose.disconnect();
  console.log('Done');
}

run().catch(e => { console.error(e); process.exit(1); });
