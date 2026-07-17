// Test the environmental API endpoint
async function testEnvironmentalAPI() {
  try {
    console.log('Testing environmental API endpoint...');
    
    // Use the token we generated earlier
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoiNjhkYmYxM2FhMWFlMmJkMDA0ZDVhODIzIn0sImlhdCI6MTc2MzQ3MTQyNCwiZXhwIjoxNzYzNDc1MDI0fQ.aR6Fmo_6OjDgR4zMfSa8_s3XwDG_97IDD-HYYvfTDVE';
    
    const response = await fetch('http://localhost:5000/api/environmental/my-locations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('API Response Status:', response.status);
    
    const data = await response.json();
    console.log('Success:', data.success);
    console.log('Total Locations:', data.data.total_locations);
    console.log('Total Silos:', data.data.total_silos);
    
    if (data.data.locations && data.data.locations.length > 0) {
      console.log('Locations found:');
      data.data.locations.forEach((location, index) => {
        console.log(`  ${index + 1}. ${location.city} (${location.latitude}, ${location.longitude})`);
        console.log(`     Silos: ${location.silo_count}`);
      });
    } else {
      console.log('No locations found in response');
    }
    
  } catch (error) {
    console.error('API Error:', error.message);
  }
}

testEnvironmentalAPI();