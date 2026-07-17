const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const { auth } = require('../middleware/auth');
const csvHelper = require('../utils/csvHelper');

/**
 * @swagger
 * /incidents:
 *   post:
 *     summary: Create a new incident record
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - incidentType
 *               - incidentDate
 *               - reportedBy
 *               - affectedAnimals
 *               - incidentDescription
 *               - actionsTaken
 *               - preventiveMeasures
 *               - incidentStatus
 *               - severity
 *               - cost
 *               - followUpDate
 *               - notes
 *             properties:
 *               incidentType:
 *                 type: string
 *                 example: Injury
 *               incidentDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-15
 *               reportedBy:
 *                 type: string
 *                 example: Farm Manager
 *               affectedAnimals:
 *                 type: string
 *                 example: G001, G002
 *               incidentDescription:
 *                 type: string
 *                 example: Two goats injured during feeding
 *               actionsTaken:
 *                 type: string
 *                 example: Separated animals, treated cuts
 *               preventiveMeasures:
 *                 type: string
 *                 example: Implemented feeding schedule changes
 *               incidentStatus:
 *                 type: string
 *                 example: Resolved
 *               severity:
 *                 type: string
 *                 example: Minor
 *               cost:
 *                 type: number
 *                 example: 35.0
 *               followUpDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-22
 *               notes:
 *                 type: string
 *                 example: No further incidents reported
 *     responses:
 *       201:
 *         description: Incident record created
 *       400:
 *         description: Bad request
 */
router.post('/', auth, async (req, res) => {
  const {
    incidentType,
    incidentDate,
    reportedBy,
    affectedAnimals,
    incidentDescription,
    actionsTaken,
    preventiveMeasures,
    incidentStatus,
    severity,
    cost,
    followUpDate,
    notes
  } = req.body;
  if (!incidentType || !incidentDate || !reportedBy || !affectedAnimals || !incidentDescription || !actionsTaken || !preventiveMeasures || !incidentStatus || !severity || cost === undefined || !followUpDate || !notes) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (isNaN(cost) || cost < 0) {
    return res.status(400).json({ error: 'Invalid cost' });
  }
  try {
    const incident = new Incident({
      incidentType,
      incidentDate,
      reportedBy,
      affectedAnimals,
      incidentDescription,
      actionsTaken,
      preventiveMeasures,
      incidentStatus,
      severity,
      cost,
      followUpDate,
      notes
    });
    await incident.save();
    res.status(201).json({ message: 'Incident record created successfully', incident });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /incidents:
 *   get:
 *     summary: Get paginated list of incident records
 *     tags: [Incidents]
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
 *         description: List of incident records
 */
router.get('/', auth, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  try {
    const incidents = await Incident.find()
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });
    const total = await Incident.countDocuments();
    res.json({
      incidents,
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
 * /incidents/import-csv:
 *   post:
 *     summary: Import incidents from CSV
 *     tags: [Incidents]
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
 *         description: Incidents imported successfully
 *       400:
 *         description: Bad request
 */
router.post('/import-csv', auth, csvHelper.upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'CSV file is required' });
  }
  const requiredFields = [
    'incidentType', 'incidentDate', 'reportedBy', 'affectedAnimals', 'incidentDescription', 'actionsTaken', 'preventiveMeasures', 'incidentStatus', 'severity', 'cost', 'followUpDate', 'notes'
  ];
  try {
    const { valid, invalid } = await csvHelper.importCSV(req.file.buffer, requiredFields);
    if (valid.length === 0) {
      return res.status(400).json({ error: 'No valid rows found in CSV', invalid });
    }
    const inserted = await Incident.insertMany(valid);
    res.status(200).json({ message: 'Incidents imported successfully', insertedCount: inserted.length, invalid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /incidents/export-csv:
 *   get:
 *     summary: Export all incidents as CSV
 *     tags: [Incidents]
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
 *                 incidentType,incidentDate,reportedBy,affectedAnimals,incidentDescription,actionsTaken,preventiveMeasures,incidentStatus,severity,cost,followUpDate,notes
 *                 Injury,2024-01-15,Farm Manager,"G001, G002",Two goats injured during feeding,Separated animals, treated cuts,Implemented feeding schedule changes,Resolved,Minor,35.0,2024-01-22,No further incidents reported
 */
router.get('/export-csv', auth, async (req, res) => {
  const fields = [
    'incidentType', 'incidentDate', 'reportedBy', 'affectedAnimals', 'incidentDescription', 'actionsTaken', 'preventiveMeasures', 'incidentStatus', 'severity', 'cost', 'followUpDate', 'notes'
  ];
  try {
    const incidents = await Incident.find().lean();
    const csv = csvHelper.exportCSV(incidents, fields);
    res.header('Content-Type', 'text/csv');
    res.attachment('incidents.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /incidents/{id}:
 *   patch:
 *     summary: Update an incident record
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - incidentStatus
 *               - cost
 *               - followUpDate
 *               - severity
 *               - notes
 *             properties:
 *               incidentStatus:
 *                 type: string
 *                 example: Resolved
 *               cost:
 *                 type: number
 *                 example: 35.0
 *               followUpDate:
 *                 type: string
 *                 format: date
 *                 example: 2024-01-22
 *               severity:
 *                 type: string
 *                 example: Minor
 *               notes:
 *                 type: string
 *                 example: No further incidents reported
 *     responses:
 *       200:
 *         description: Incident record updated
 *       400:
 *         description: Bad request
 *       404:
 *         description: Incident record not found
 */
router.patch('/:id', auth, async (req, res) => {
  const { incidentStatus, cost, followUpDate, severity, notes } = req.body;
  if (incidentStatus === undefined || cost === undefined || followUpDate === undefined || severity === undefined || notes === undefined) {
    return res.status(400).json({ error: 'incidentStatus, cost, followUpDate, severity, and notes are required' });
  }
  if (isNaN(cost) || cost < 0) {
    return res.status(400).json({ error: 'Invalid cost' });
  }
  try {
    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      { incidentStatus, cost, followUpDate, severity, notes },
      { new: true }
    );
    if (!incident) return res.status(404).json({ error: 'Incident record not found' });
    res.json({ message: 'Incident record updated successfully', incident });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * @swagger
 * /incidents/{id}:
 *   delete:
 *     summary: Delete an incident by ID
 *     tags: [Incidents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Incident MongoDB _id
 *     responses:
 *       200:
 *         description: Incident deleted successfully
 *       404:
 *         description: Incident not found
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });
    res.json({ message: 'Incident deleted successfully', incident });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router; 