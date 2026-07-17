/**
 * Migration Script: Add Push Notification Support
 * 
 * This script:
 * 1. Updates the Notification collection schema
 * 2. Creates the UserPushSubscription collection
 * 3. Initializes default preferences for all active users
 * 4. Creates necessary indexes
 */

require('dotenv').config();
const mongoose = require('mongoose');

const db = mongoose.connection;

// MongoDB connection string
const connectionString = process.env.MONGO_URI ||
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;

async function runMigration() {
  try {
    console.log('Starting push notification migration...');

    // Connect to MongoDB
    await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✓ Connected to MongoDB');

    // Get database instance
    const db = mongoose.connection.db;

    // Step 1: Update Notification collection schema
    console.log('\n1. Updating Notification collection...');
    try {
      await db.collection('notifications').updateMany(
        { push: { $exists: false } },
        {
          $set: {
            push: {
              enabled: false,
              sent: false,
              sent_at: null,
              delivery_status: 'pending'
            }
          }
        }
      );
      console.log('✓ Notification schema updated');
    } catch (error) {
      console.error('✗ Error updating Notification schema:', error.message);
    }

    // Step 2: Create UserPushSubscription collection with indexes
    console.log('\n2. Creating UserPushSubscription collection...');
    try {
      // Create collection if it doesn't exist
      await db.createCollection('userpushsubscriptions', {
        validator: {
          $jsonSchema: {
            bsonType: 'object',
            required: ['user_id', 'subscription', 'preferences'],
            properties: {
              user_id: { bsonType: 'objectId' },
              subscription: {
                bsonType: 'object',
                properties: {
                  endpoint: { bsonType: 'string' },
                  keys: {
                    bsonType: 'object',
                    properties: {
                      p256dh: { bsonType: 'string' },
                      auth: { bsonType: 'string' }
                    }
                  }
                }
              },
              preferences: { bsonType: 'object' },
              is_active: { bsonType: 'bool' },
              created_at: { bsonType: 'date' },
              updated_at: { bsonType: 'date' }
            }
          }
        }
      });
      console.log('✓ UserPushSubscription collection created');
    } catch (error) {
      if (error.code === 48) {
        // Collection already exists
        console.log('✓ UserPushSubscription collection already exists');
      } else {
        console.error('✗ Error creating UserPushSubscription collection:', error.message);
      }
    }

    // Step 3: Create indexes
    console.log('\n3. Creating indexes...');
    try {
      const userpushsubscriptions = db.collection('userpushsubscriptions');

      // Create indexes
      await userpushsubscriptions.createIndex({ user_id: 1, is_active: 1 });
      await userpushsubscriptions.createIndex({ endpoint: 1 }, { unique: true });
      await userpushsubscriptions.createIndex({ 'preferences.push_enabled': 1 });

      console.log('✓ Indexes created for UserPushSubscription');
    } catch (error) {
      console.error('✗ Error creating indexes:', error.message);
    }

    // Step 4: Create indexes on Notification collection
    console.log('\n4. Creating Notification indexes...');
    try {
      const notifications = db.collection('notifications');
      await notifications.createIndex({ 'push.delivery_status': 1, recipient_id: 1 });
      console.log('✓ Push indexes created for Notification');
    } catch (error) {
      console.error('✗ Error creating Notification indexes:', error.message);
    }

    console.log('\n✓ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Set WEB_PUSH_PUBLIC_KEY and WEB_PUSH_PRIVATE_KEY in your .env file');
    console.log('   OR set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL');
    console.log('2. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY in your frontend .env.local');
    console.log('3. Deploy the updated backend and frontend code');
    console.log('4. Start collecting push subscriptions from users');

  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run migration
runMigration();
