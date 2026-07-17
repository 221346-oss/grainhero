const mongoose = require('mongoose');
const Silo = require('./models/Silo');

// MongoDB connection
const mongoURI = 'mongodb+srv://atifnazir005_db_user:WMRBevZuQuneOjXZ@cluster0.ycda7xy.mongodb.net/grainhero?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
.then(() => {
  console.log('Connected to MongoDB');
  return checkSilos();
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

async function checkSilos() {
  try {
    const silos = await Silo.find({});
    console.log(`Found ${silos.length} silos:`);
    
    silos.forEach(silo => {
      console.log(`- Silo ID: ${silo.silo_id}`);
      console.log(`  Name: ${silo.name}`);
      console.log(`  Admin ID: ${silo.admin_id}`);
      console.log(`  Has location: ${!!(silo.location?.coordinates?.latitude && silo.location?.coordinates?.longitude)}`);
      if (silo.location?.coordinates?.latitude && silo.location?.coordinates?.longitude) {
        console.log(`  Location: ${silo.location.coordinates.latitude}, ${silo.location.coordinates.longitude}`);
      }
      console.log('---');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking silos:', error);
    process.exit(1);
  }
}