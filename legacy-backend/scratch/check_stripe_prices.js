// Quick test: verify Stripe prices exist and are valid
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function checkPrices() {
  console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY ? 'SET (starts with ' + process.env.STRIPE_SECRET_KEY.substring(0, 12) + '...)' : 'NOT SET');
  
  const priceIds = {
    starter: process.env.STRIPE_PRICE_STARTER || 'price_1TTqrWBMWljkQncg0iJJVodB',
    professional: process.env.STRIPE_PRICE_PROFESSIONAL || 'price_1TTqstBMWljkQncg8O9FTIPT',
    enterprise: process.env.STRIPE_PRICE_ENTERPRISE || 'price_1TTquLBMWljkQncgn9D967RC',
    iot: process.env.STRIPE_PRICE_IOT || 'price_1TTrDNBMWljkQncg27bD8rMq',
  };

  for (const [name, id] of Object.entries(priceIds)) {
    try {
      const price = await stripe.prices.retrieve(id);
      console.log(`✅ ${name}: ${id} -> ${price.unit_amount/100} ${price.currency} (${price.type}, ${price.recurring ? price.recurring.interval : 'one-time'})`);
    } catch (err) {
      console.log(`❌ ${name}: ${id} -> ERROR: ${err.message}`);
    }
  }
}

checkPrices().catch(console.error);
