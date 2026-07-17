const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User');

// MongoDB connection
const mongoURI = 'mongodb+srv://atifnazir005_db_user:WMRBevZuQuneOjXZ@cluster0.ycda7xy.mongodb.net/grainhero?retryWrites=true&w=majority';

mongoose.connect(mongoURI)
.then(async () => {
  console.log('Connected to MongoDB');
  
  // Find an admin user to test with
  const user = await User.findOne({ role: 'admin' });
  if (user) {
    console.log('Found admin user:', user.name);
    
    // Generate a JWT token for this user
    const payload = {
      user: {
        id: user.id
      }
    };
    
    const token = jwt.sign(payload, '5h8ek389e784+eje&', { expiresIn: '1h' });
    console.log('Generated JWT token:', token);
    
    console.log('\nTo test the environmental API, use this curl command:');
    console.log(`curl -X GET "http://localhost:5000/api/environmental/my-locations" -H "Authorization: Bearer ${token}"`);
  } else {
    console.log('No admin user found');
  }
  
  process.exit(0);
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});