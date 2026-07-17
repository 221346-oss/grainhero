const mongoose = require('mongoose');
require('dotenv').config();

// Import all models that need migration
const models = {
  Silo: require('../models/Silo'),
  GrainBatch: require('../models/GrainBatch'),
  SensorDevice: require('../models/SensorDevice'),
  SensorReading: require('../models/SensorReading'),
  GrainAlert: require('../models/GrainAlert'),
  InsurancePolicy: require('../models/InsurancePolicy'),
  InsuranceClaim: require('../models/InsuranceClaim'),
  Subscription: require('../models/Subscription'),
  ActivityLog: require('../models/ActivityLog'),
  Advisory: require('../models/Advisory'),
  SpoilagePrediction: require('../models/SpoilagePrediction'),
  Notification: require('../models/Notification'),
  Actuator: require('../models/Actuator'),
  Warehouse: require('../models/Warehouse'),
  SiloFinancials: require('../models/SiloFinancials'),
  WarehouseFinancials: require('../models/WarehouseFinancials'),
  Buyer: require('../models/Buyer'),
  BuyerInvoice: require('../models/BuyerInvoice'),
  BuyerPayment: require('../models/BuyerPayment'),
  DispatchTransaction: require('../models/DispatchTransaction')
};

async function migrateTenantToAdmin() {
  try {
    // Connect to MongoDB Atlas
    const mongoUri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}`;
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    console.log('🔄 Starting system-wide migration from tenant_id to admin_id...');

    for (const [name, model] of Object.entries(models)) {
      console.log(`\n📦 Migrating ${name}...`);
      
      // Update records that have tenant_id but no admin_id, or simply copy tenant_id to admin_id and unset tenant_id
      const result = await model.updateMany(
        { tenant_id: { $exists: true } },
        [
          { 
            $set: { 
              admin_id: { $ifNull: ['$admin_id', '$tenant_id'] } 
            } 
          }, 
          { $unset: 'tenant_id' }
        ]
      );
      
      console.log(`✅ Updated ${result.modifiedCount} ${name} records`);
    }

    // Special case for User model: owned_tenant_id -> owned_admin_id (or similar)
    // But in User model we mostly just needed to clean up tenant_id
    console.log('\n👤 Cleaning up User model...');
    const userResult = await mongoose.model('User').updateMany(
      { tenant_id: { $exists: true } },
      { $unset: { tenant_id: 1, owned_tenant_id: 1 } }
    );
    console.log(`✅ Cleaned up ${userResult.modifiedCount} user records`);

    console.log('\n🎉 System-wide migration completed successfully!');
    console.log('All records now use admin_id instead of tenant_id.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📡 Database connection closed');
  }
}

migrateTenantToAdmin();
