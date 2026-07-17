const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

async function simulateWebhook() {
  const email = 'tester_admin_123@grainhero.com';
  const planId = 'basic';
  const secret = process.env.STRIPE_SECRET_WEBHOOK;

  // This is a simplified simulation. 
  // Since we can't easily generate a valid Stripe signature without the actual event body,
  // we might need to bypass the signature check in the backend for testing OR 
  // just call the internal logic.
  
  // BUT, I want to test the actual endpoint.
  // I'll create a local test that imports the webhook logic if possible, 
  // or I'll just manually run the logic in a script to verify the DB updates correctly.

  console.log('Simulating webhook logic for:', email);
  
  const mongoose = require('mongoose');
  const User = require('../models/User');
  const Subscription = require('../models/Subscription');

  const mongoUri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;
  await mongoose.connect(mongoUri);

  // Mock Stripe Session
  const session = {
    id: 'cs_test_123',
    customer: 'cus_test_123',
    metadata: {
      planId: planId,
      userEmail: email
    },
    line_items: {
      data: [
        {
          price: {
            id: 'price_basic_1499',
            unit_amount: 149900
          }
        },
        {
          price: {
            id: 'price_iot_7000',
            unit_amount: 700000
          }
        }
      ]
    }
  };

  // The actual logic from webhooks.js
  const planDetails = {
    basic: { id: "basic", name: "Starter", price: 1499 },
    intermediate: { id: "intermediate", name: "Professional", price: 3899 },
    pro: { id: "pro", name: "Enterprise", price: 5999 },
  };

  const plan = planDetails[session.metadata.planId];
  console.log('Plan found:', plan);

  if (plan) {
    const userData = {
      email: email,
      name: "Test Admin",
      role: "pending",
      hasAccess: plan.id,
      subscription_plan: 'basic',
      customerId: 'cus_test_123',
      status: "active",
      emailVerified: true,
      createdAt: new Date(),
      updated_at: new Date(),
    };

    let user = await User.findOne({ email: email });
    if (!user) {
      user = new User(userData);
      await user.save();
      console.log('User created in DB.');
    } else {
      user.hasAccess = plan.id;
      user.customerId = 'cus_test_123';
      await user.save();
      console.log('User updated in DB.');
    }
  }

  await mongoose.disconnect();
  console.log('Simulation complete.');
}

simulateWebhook();
