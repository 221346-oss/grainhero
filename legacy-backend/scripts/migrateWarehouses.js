/**
 * Migration script to create warehouses from existing silos
 * This script will:
 * 1. Group silos by admin_id and location to create warehouses
 * 2. Assign warehouse_id to silos
 * 3. Create default warehouses for managers/technicians if needed
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Silo = require('../models/Silo');
const Warehouse = require('../models/Warehouse');
const { USER_ROLES } = require('../configs/enum');

const connectionString = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ycda7xy.mongodb.net/${process.env.DATABASE_NAME}?retryWrites=true&w=majority`;

async function migrateWarehouses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(connectionString);
    console.log('Connected to MongoDB');

    // Step 1: Create warehouses from existing silos grouped by admin and location
    console.log('\n=== Step 1: Creating warehouses from existing silos ===');
    const silos = await Silo.find({ warehouse_id: { $exists: false } });
    console.log(`Found ${silos.length} silos without warehouse assignment`);

    // Group silos by admin_id and location (city or description)
    const siloGroups = {};
    
    for (const silo of silos) {
      const adminId = silo.admin_id.toString();
      const locationKey = silo.location?.city || silo.location?.description || 'default';
      const groupKey = `${adminId}_${locationKey}`;
      
      if (!siloGroups[groupKey]) {
        siloGroups[groupKey] = {
          admin_id: silo.admin_id,
          location: silo.location,
          silos: []
        };
      }
      siloGroups[groupKey].silos.push(silo);
    }

    console.log(`Found ${Object.keys(siloGroups).length} unique warehouse groups`);

    // Create warehouses for each group
    const warehouseMap = {};
    for (const [groupKey, group] of Object.entries(siloGroups)) {
      const admin = await User.findById(group.admin_id);
      if (!admin) {
        console.log(`Skipping group ${groupKey}: Admin not found`);
        continue;
      }

      const warehouseId = `WH-${admin.email.split('@')[0].toUpperCase()}-${Date.now()}`;
      const warehouseName = group.location?.description || 
                           group.location?.city || 
                           `Warehouse ${group.location?.city || 'Default'}`;

      const warehouse = new Warehouse({
        warehouse_id: warehouseId,
        name: warehouseName,
        admin_id: group.admin_id,
        location: group.location,
        total_silos: group.silos.length,
        total_capacity_kg: group.silos.reduce((sum, s) => sum + (s.capacity_kg || 0), 0),
        created_by: group.admin_id,
        statistics: {
          current_occupancy_kg: group.silos.reduce((sum, s) => sum + (s.current_occupancy_kg || 0), 0)
        }
      });

      await warehouse.save();
      warehouseMap[groupKey] = warehouse._id;

      // Update silos with warehouse_id
      for (const silo of group.silos) {
        silo.warehouse_id = warehouse._id;
        await silo.save();
      }

      console.log(`Created warehouse ${warehouseId} with ${group.silos.length} silos`);
    }

    // Step 2: Assign warehouses to managers
    console.log('\n=== Step 2: Assigning warehouses to managers ===');
    const managers = await User.find({ 
      role: USER_ROLES.MANAGER,
      warehouse_id: { $exists: false }
    });
    console.log(`Found ${managers.length} managers without warehouse assignment`);

    for (const manager of managers) {
      // Find a warehouse under their admin
      const warehouse = await Warehouse.findOne({ 
        admin_id: manager.admin_id,
        manager_id: { $exists: false }
      });

      if (warehouse) {
        manager.warehouse_id = warehouse._id;
        await manager.save();
        
        warehouse.manager_id = manager._id;
        await warehouse.save();
        
        console.log(`Assigned manager ${manager.email} to warehouse ${warehouse.warehouse_id}`);
      } else {
        // Create a default warehouse for this manager
        const admin = await User.findById(manager.admin_id);
        const warehouseId = `WH-MGR-${manager.email.split('@')[0].toUpperCase()}-${Date.now()}`;
        
        const newWarehouse = new Warehouse({
          warehouse_id: warehouseId,
          name: `Warehouse for ${manager.name || manager.email}`,
          admin_id: manager.admin_id,
          manager_id: manager._id,
          created_by: manager.admin_id
        });

        await newWarehouse.save();
        manager.warehouse_id = newWarehouse._id;
        await manager.save();
        
        console.log(`Created and assigned warehouse ${warehouseId} to manager ${manager.email}`);
      }
    }

    // Step 3: Assign warehouses to technicians
    console.log('\n=== Step 3: Assigning warehouses to technicians ===');
    const technicians = await User.find({ 
      role: USER_ROLES.TECHNICIAN,
      warehouse_id: { $exists: false }
    });
    console.log(`Found ${technicians.length} technicians without warehouse assignment`);

    for (const technician of technicians) {
      // Find a warehouse under their admin (preferably one with a manager)
      let warehouse = await Warehouse.findOne({ 
        admin_id: technician.admin_id,
        manager_id: { $exists: true }
      });

      // If no warehouse with manager, get any warehouse
      if (!warehouse) {
        warehouse = await Warehouse.findOne({ 
          admin_id: technician.admin_id
        });
      }

      if (warehouse) {
        technician.warehouse_id = warehouse._id;
        await technician.save();
        
        // Add technician to warehouse's technician_ids array
        if (!warehouse.technician_ids.includes(technician._id)) {
          warehouse.technician_ids.push(technician._id);
          await warehouse.save();
        }
        
        console.log(`Assigned technician ${technician.email} to warehouse ${warehouse.warehouse_id}`);
      } else {
        // Create a default warehouse for this technician
        const admin = await User.findById(technician.admin_id);
        const warehouseId = `WH-TECH-${technician.email.split('@')[0].toUpperCase()}-${Date.now()}`;
        
        const newWarehouse = new Warehouse({
          warehouse_id: warehouseId,
          name: `Warehouse for ${technician.name || technician.email}`,
          admin_id: technician.admin_id,
          technician_ids: [technician._id],
          created_by: technician.admin_id
        });

        await newWarehouse.save();
        technician.warehouse_id = newWarehouse._id;
        await technician.save();
        
        console.log(`Created and assigned warehouse ${warehouseId} to technician ${technician.email}`);
      }
    }

    // Step 4: Update warehouse statistics
    console.log('\n=== Step 4: Updating warehouse statistics ===');
    const warehouses = await Warehouse.find();
    for (const warehouse of warehouses) {
      await warehouse.updateStatistics();
      console.log(`Updated statistics for warehouse ${warehouse.warehouse_id}`);
    }

    console.log('\n=== Migration completed successfully ===');
    console.log(`Total warehouses created/updated: ${warehouses.length}`);
    
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run migration
if (require.main === module) {
  migrateWarehouses()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = migrateWarehouses;

