const mongoose = require('mongoose');
const Silo = require('./models/Silo');
const User = require('./models/User');

// MongoDB connection
const mongoURI = 'mongodb+srv://atifnazir005_db_user:WMRBevZuQuneOjXZ@cluster0.ycda7xy.mongodb.net/grainhero?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
.then(() => {
  console.log('Connected to MongoDB');
  return addSampleSilos();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function addSampleSilos() {
  try {
    // First, let's check if we have any users
    const users = await User.find({});
    if (users.length === 0) {
      console.log('No users found in database. Please create a user first.');
      process.exit(1);
    }
    
    const adminUser = users[0]; // Use the first user as admin
    console.log(`Using user ${adminUser._id} as admin`);
    
    // Sample silos with location data for Rawalpindi and Islamabad
    const sampleSilos = [
      {
        silo_id: 'SILO-RWP-001',
        name: 'Rawalpindi Storage Unit 1',
        admin_id: adminUser._id,
        capacity_kg: 5000,
        location: {
          description: 'Main storage facility',
          coordinates: {
            latitude: 33.5651,
            longitude: 73.0169
          },
          address: 'Main Storage Road, Rawalpindi',
          city: 'Rawalpindi',
          country: 'Pakistan',
          postal_code: '46000'
        }
      },
      {
        silo_id: 'SILO-ISL-001',
        name: 'Islamabad Storage Unit 1',
        admin_id: adminUser._id,
        capacity_kg: 7500,
        location: {
          description: 'Main storage facility',
          coordinates: {
            latitude: 33.6844,
            longitude: 73.0479
          },
          address: 'Storage Area, Islamabad',
          city: 'Islamabad',
          country: 'Pakistan',
          postal_code: '44000'
        }
      }
    ];
    
    // Insert sample silos
    for (const siloData of sampleSilos) {
      // Check if silo already exists
      const existingSilo = await Silo.findOne({ silo_id: siloData.silo_id });
      if (existingSilo) {
        console.log(`Silo ${siloData.silo_id} already exists`);
        continue;
      }
      
      // Create new silo
      const silo = new Silo({
        ...siloData,
        created_by: adminUs er._id,
        updated_by: adminUser._id
      });
      
      await silo.save();
      console.log(`Added silo: ${silo.silo_id} - ${silo.name}`);
    }
    
    console.log('Sample silos added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error adding sample silos:', error);
    process.exit(1);
  }
}