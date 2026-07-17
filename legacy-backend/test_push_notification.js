const mongoose = require('mongoose');
const dotenv = require('dotenv');
const NotificationService = require('./services/notificationService');
const User = require('./models/User');
const UserPushSubscription = require('./models/UserPushSubscription');

dotenv.config();

// Force Google DNS for MongoDB Atlas SRV resolution
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const connectionString = process.env.MONGO_URI || `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;

async function testPush() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(connectionString);
        console.log('Connected to MongoDB');

        const targetEmail = 'atifnazir689@gmail.com';
        const user = await User.findOne({ email: targetEmail });
        
        if (!user) {
            console.log(`User not found: ${targetEmail}`);
            process.exit(1);
        }

        console.log(`Checking push subscriptions for user: ${user.name} (${user._id})`);
        
        // Find all subscriptions (even inactive ones for debugging)
        const allSubs = await UserPushSubscription.find({ user_id: user._id });
        console.log(`Found ${allSubs.length} total subscriptions for this user.`);
        
        allSubs.forEach((s, i) => {
            console.log(`  Sub ${i+1}: ID=${s._id}, Active=${s.is_active}, MarkedInvalid=${s.marked_invalid}, LastUsed=${s.last_used}`);
        });

        const activeSubs = allSubs.filter(s => s.is_active && !s.marked_invalid);
        console.log(`Active subscriptions: ${activeSubs.length}`);

        if (activeSubs.length === 0) {
            console.log('CRITICAL: No active push subscriptions. Please click "Pair Browser" in the Settings page.');
            process.exit(0);
        }

        console.log('Sending test push to all active subscriptions...');
        const results = await NotificationService.sendPushNotification({
            recipient_id: user._id,
            title: 'GrainHero Test Push',
            message: 'This is a test push notification sent via manual script.',
            category: 'system',
            action_url: '/settings'
        });

        console.log('Push results:', JSON.stringify(results, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('Test error:', error.message || error);
        process.exit(1);
    }
}

testPush();
