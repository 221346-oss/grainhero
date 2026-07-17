require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}`;

async function run() {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    let sa = await User.findOne({ role: 'super_admin' }).select('+password name email role status');

    if (sa) {
        console.log('\n✅ Super Admin already exists:');
        console.log('   Name:', sa.name);
        console.log('   Email:', sa.email);
        console.log('   Role:', sa.role);
        console.log('   Status:', sa.status);
    } else {
        console.log('\n⏳ No super_admin found. Creating one...');
        sa = new User({
            name: 'Super Admin',
            email: 'superadmin@grainhero.com',
            phone: '+920000000001',
            role: 'super_admin',
            password: 'SuperAdmin123!',
            status: 'active',
        });
        await sa.save();
        console.log('\n✅ Super Admin created successfully!');
        console.log('   Email: superadmin@grainhero.com');
        console.log('   Password: SuperAdmin123!');
    }

    await mongoose.disconnect();
    console.log('\nDone.');
}

run().catch(e => { console.error(e); process.exit(1); });
