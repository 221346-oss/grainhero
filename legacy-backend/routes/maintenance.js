const express = require('express');
const router = express.Router();
const Maintenance = require('../models/Maintenance');
const { auth } = require('../middleware/auth');
const csvHelper = require('../utils/csvHelper');

/**
 * @swagger
 * /maintenance:
 *   post:
 *     summary: Create a new maintenance record
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - maintenanceType
 *               - equipmentId
 *               - maintenanceDate
 *               - performedBy
 *               - description
 *               - partsUsed
 *               - laborHours
 *               - totalCost
 *               - nextMaintenanceDate
 *               - status
 *               - priority
 *               - notes
 *             properties:
 *               maintenanceType:
 *                 type: string
 *                 example: Equipment Maintenance
 *               equipmentId:
 *                 type: string
 *                 example: FEEDER-001
 *               maintenanceDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *               performedBy:
 *                 type: string
 *                 example: John Smith
 *               description:
 *                 type: string
 *                 example: Routine cleaning and lubrication
 *               partsUsed:
 *                 type: string
 *                 example: Lubricant, cleaning supplies
 *               laborHours:
 *                 type: number
 *                 example: 2.5
 *               totalCost:
 *                 type: number
 *                 example: 45.0
 *               nextMaintenanceDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-04-15
 *               status:
 *                 type: string
 *                 example: Completed
 *               priority:
 *                 type: string
 *                 example: Routine
 *               notes:
 *                 type: string
 *                 example: All components functioning properly
 *     responses:
 *       201:
 *         description: Maintenance record created
 *       400:
 *         description: Bad request
 */
router.post('/', auth, async (req, res) => {
  const {
    maintenanceType,
    equipmentId,
    maintenanceDate,
    performedBy,
    description,
    partsUsed,
    laborHours,
    totalCost,
    nextMaintenanceDate,
    status,
    priority,
    notes
  } = req.body;
  if (!maintenanceType || !equipmentId || !maintenanceDate || !performedBy || !description || !partsUsed || laborHours === undefined || totalCost === undefined || !nextMaintenanceDate || !status || !priority || !notes) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (isNaN(laborHours) || laborHours < 0) {
    return res.status(400).json({ error: 'Invalid laborHours' });
  }
  if (isNaN(totalCost) || totalCost < 0) {
    return res.status(400).json({ error: 'Invalid totalCost' });
  }
  try {
    const maintenance = new Maintenance({
      maintenanceType,
      equipmentId,
      maintenanceDate,
      performedBy,
      description,
      partsUsed,
      laborHours,
      totalCost,
      nextMaintenanceDate,
      status,
      priority,
      notes
    });
    await maintenance.save();
    res.status(201).json({ message: 'Maintenance record created successfully', maintenance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /maintenance:
 *   get:
 *     summary: Get paginated list of maintenance records
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of maintenance records
 */
router.get('/', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const maintenance = await Maintenance.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await Maintenance.countDocuments();
    res.json({
      maintenance,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /maintenance/import-csv:
 *   post:
 *     summary: Import maintenance records from CSV
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Maintenance records imported successfully
 *       400:
 *         description: Bad request
 */
router.post('/import-csv', auth, csvHelper.upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }
  const requiredFields = [
    'maintenanceType', 'equipmentId', 'maintenanceDate', 'performedBy', 'description', 'partsUsed', 'laborHours', 'totalCost', 'nextMaintenanceDate', 'status', 'priority', 'notes'
  ];
  try {
    const { valid, invalid } = await csvHelper.importCSV(req.file.buffer, requiredFields);
    if (valid.length === 0) {
      return res.status(400).json({ error: 'No valid rows found in CSV', invalid });
    }
    const inserted = await Maintenance.insertMany(valid);
    res.status(200).json({ message: 'Maintenance records imported successfully', insertedCount: inserted.length, invalid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /maintenance/export-csv:
 *   get:
 *     summary: Export all maintenance records as CSV
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *               example: |
 *                 maintenanceType,equipmentId,maintenanceDate,performedBy,description,partsUsed,laborHours,totalCost,nextMaintenanceDate,status,priority,notes
 *                 Equipment Maintenance,FEEDER-001,2024-01-15,John Smith,Routine cleaning and lubrication,Lubricant, cleaning supplies,2.5,45.0,2024-04-15,Completed,Routine,All components functioning properly
 */
router.get('/export-csv', auth, async (req, res) => {
  const fields = [
    'maintenanceType', 'equipmentId', 'maintenanceDate', 'performedBy', 'description', 'partsUsed', 'laborHours', 'totalCost', 'nextMaintenanceDate', 'status', 'priority', 'notes'
  ];
  try {
    const maintenance = await Maintenance.find().lean();
    const csv = csvHelper.exportCSV(maintenance, fields);
    res.header('Content-Type', 'text/csv');
    res.attachment('maintenance.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /maintenance/{id}:
 *   patch:
 *     summary: Update a maintenance record
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Maintenance record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *               - totalCost
 *               - nextMaintenanceDate
 *               - priority
 *               - notes
 *             properties:
 *               status:
 *                 type: string
 *                 example: Completed
 *               totalCost:
 *                 type: number
 *                 example: 45.0
 *               nextMaintenanceDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-04-15
 *               priority:
 *                 type: string
 *                 example: Routine
 *               notes:
 *                 type: string
 *                 example: All components functioning properly
 *     responses:
 *       200:
 *         description: Maintenance record updated
 *       400:
 *         description: Bad request
 *       404:
 *         description: Maintenance record not found
 */
router.patch('/:id', auth, async (req, res) => {
  const { status, totalCost, nextMaintenanceDate, priority, notes } = req.body;
  if (status === undefined || totalCost === undefined || nextMaintenanceDate === undefined || priority === undefined || notes === undefined) {
    return res.status(400).json({ error: 'status, totalCost, nextMaintenanceDate, priority, and notes are required' });
  }
  if (isNaN(totalCost) || totalCost < 0) {
    return res.status(400).json({ error: 'Invalid totalCost' });
  }
  try {
    const maintenance = await Maintenance.findByIdAndUpdate(
      req.params.id,
      { status, totalCost, nextMaintenanceDate, priority, notes },
      { new: true }
    );
    if (!maintenance) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json({ message: 'Maintenance record updated successfully', maintenance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /maintenance/{id}:
 *   delete:
 *     summary: Delete a maintenance record by ID
 *     tags: [Maintenance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Maintenance MongoDB _id
 *     responses:
 *       200:
 *         description: Maintenance record deleted successfully
 *       404:
 *         description: Maintenance record not found
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const maintenance = await Maintenance.findByIdAndDelete(req.params.id);
    if (!maintenance) return res.status(404).json({ error: 'Maintenance record not found' });
    res.json({ message: 'Maintenance record deleted successfully', maintenance });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 