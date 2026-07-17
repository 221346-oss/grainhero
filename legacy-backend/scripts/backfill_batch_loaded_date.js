/**
 * Backfill batch_loaded_date for existing silos.
 * 
 * This sets batch_loaded_date to the silo's created_at date for any silo
 * that doesn't have one yet, so that ML predictions get accurate Storage_Days
 * instead of defaulting to 0 or 30.
 *
 * Usage:  node scripts/backfill_batch_loaded_date.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Silo = require('../models/Silo');

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI / MONGO_URI not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('✅ Connected to MongoDB');

  // Find all silos without batch_loaded_date
  const silos = await Silo.find({ batch_loaded_date: null }).select('_id silo_id created_at');
  console.log(`Found ${silos.length} silos without batch_loaded_date`);

  let updated = 0;
  for (const silo of silos) {
    const refDate = silo.created_at || new Date();
    await Silo.updateOne(
      { _id: silo._id },
      { $set: { batch_loaded_date: refDate } }
    );
    const daysSince = Math.floor((Date.now() - new Date(refDate)) / (1000 * 60 * 60 * 24));
    console.log(`  ✅ ${silo.silo_id}: batch_loaded_date = ${refDate.toISOString()} (${daysSince} days ago)`);
    updated++;
  }

  console.log(`\n✅ Done. Updated ${updated} silos.`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
