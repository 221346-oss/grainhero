const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Mock data generation functions
const generateSensorData = (hours = 24) => {
  const data = [];
  const now = new Date();
  
  for (let i = hours; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp: timestamp.toISOString(),
      temperature: 20 + Math.sin(i * 0.1) * 5 + Math.random() * 2,
      humidity: 50 + Math.sin(i * 0.05) * 10 + Math.random() * 5,
      moisture: 12 + Math.sin(i * 0.08) * 2 + Math.random() * 1,
      airflow: 1.5 + Math.sin(i * 0.12) * 0.5 + Math.random() * 0.3,
      co2: 400 + Math.sin(i * 0.06) * 50 + Math.random() * 20,
      pressure: 1013 + Math.sin(i * 0.04) * 5 + Math.random() * 2
    });
  }
  return data;
};

const generateSiloData = () => [
  {
    id: 'silo-1',
    name: 'Silo A - Rice Storage',
    capacity: 1000,
    currentLevel: 750,
    grainType: 'Basmati Rice',
    storageDays: 45,
    riskLevel: 'LOW',
    temperature: 22.5,
    humidity: 55,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'silo-2',
    name: 'Silo B - Wheat Storage',
    capacity: 1200,
    currentLevel: 900,
    grainType: 'Durum Wheat',
    storageDays: 30,
    riskLevel: 'MEDIUM',
    temperature: 25.2,
    humidity: 65,
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'silo-3',
    name: 'Silo C - Corn Storage',
    capacity: 800,
    currentLevel: 600,
    grainType: 'Yellow Corn',
    storageDays: 60,
    riskLevel: 'HIGH',
    temperature: 28.1,
    humidity: 70,
    lastUpdated: new Date().toISOString()
  }
];

const generateBatchReports = () => [
  {
    batchId: 'BATCH-001',
    grainType: 'Basmati Rice',
    quantity: 750,
    storageDays: 45,
    qualityScore: 92,
    riskFactors: ['High humidity', 'Temperature fluctuation'],
    recommendations: ['Increase ventilation', 'Monitor moisture levels'],
    siloId: 'silo-1',
    startDate: '2024-01-15',
    endDate: '2024-03-01'
  },
  {
    batchId: 'BATCH-002',
    grainType: 'Durum Wheat',
    quantity: 900,
    storageDays: 30,
    qualityScore: 85,
    riskFactors: ['Elevated CO2 levels'],
    recommendations: ['Check ventilation system', 'Reduce storage density'],
    siloId: 'silo-2',
    startDate: '2024-02-01',
    endDate: '2024-03-02'
  },
  {
    batchId: 'BATCH-003',
    grainType: 'Yellow Corn',
    quantity: 600,
    storageDays: 60,
    qualityScore: 78,
    riskFactors: ['High temperature', 'Moisture content above threshold'],
    recommendations: ['Immediate cooling required', 'Quality inspection needed'],
    siloId: 'silo-3',
    startDate: '2024-01-01',
    endDate: '2024-03-01'
  }
];

// Get sensor data with time range filter
router.get('/sensor-data', (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    let hours = 24;
    
    switch (timeRange) {
      case '7d': hours = 168; break;
      case '30d': hours = 720; break;
      default: hours = 24;
    }
    
    const sensorData = generateSensorData(hours);
    
    res.json({
      success: true,
      data: sensorData,
      timeRange,
      totalRecords: sensorData.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sensor data',
      message: error.message
    });
  }
});

// Get silo data
router.get('/silo-data', (req, res) => {
  try {
    const siloData = generateSiloData();
    
    res.json({
      success: true,
      data: siloData,
      totalSilos: siloData.length,
      highRiskSilos: siloData.filter(silo => silo.riskLevel === 'HIGH').length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch silo data',
      message: error.message
    });
  }
});

// Get batch reports
router.get('/batch-reports', (req, res) => {
  try {
    const batchReports = generateBatchReports();
    
    res.json({
      success: true,
      data: batchReports,
      totalBatches: batchReports.length,
      averageQualityScore: Math.round(
        batchReports.reduce((acc, batch) => acc + batch.qualityScore, 0) / batchReports.length
      )
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch reports',
      message: error.message
    });
  }
});

// Get dashboard overview
router.get('/overview', (req, res) => {
  try {
    const siloData = generateSiloData();
    const batchReports = generateBatchReports();
    
    const overview = {
      totalSilos: siloData.length,
      activeBatches: batchReports.length,
      averageQualityScore: Math.round(
        batchReports.reduce((acc, batch) => acc + batch.qualityScore, 0) / batchReports.length
      ),
      highRiskSilos: siloData.filter(silo => silo.riskLevel === 'HIGH').length,
      totalCapacity: siloData.reduce((acc, silo) => acc + silo.capacity, 0),
      currentStorage: siloData.reduce((acc, silo) => acc + silo.currentLevel, 0),
      storageUtilization: Math.round(
        (siloData.reduce((acc, silo) => acc + silo.currentLevel, 0) / 
         siloData.reduce((acc, silo) => acc + silo.capacity, 0)) * 100
      )
    };
    
    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overview data',
      message: error.message
    });
  }
});

// Export batch reports to CSV
router.get('/export/csv', (req, res) => {
  try {
    const batchReports = generateBatchReports();
    
    // Create CSV content
    const csvHeader = 'Batch ID,Grain Type,Quantity (tons),Storage Days,Quality Score,Risk Level,Silo ID,Start Date,End Date,Risk Factors,Recommendations\n';
    const csvRows = batchReports.map(batch => {
      const riskLevel = batch.qualityScore > 85 ? 'LOW' : batch.qualityScore > 70 ? 'MEDIUM' : 'HIGH';
      return [
        batch.batchId,
        batch.grainType,
        batch.quantity,
        batch.storageDays,
        batch.qualityScore,
        riskLevel,
        batch.siloId,
        batch.startDate,
        batch.endDate,
        `"${batch.riskFactors.join('; ')}"`,
        `"${batch.recommendations.join('; ')}"`
      ].join(',');
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="batch-reports-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export CSV',
      message: error.message
    });
  }
});

// Export batch reports to PDF
router.get('/export/pdf', (req, res) => {
  try {
    const batchReports = generateBatchReports();
    const siloData = generateSiloData();
    
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>GrainHero Batch Reports</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header h1 { color: #2563eb; margin: 0; }
          .header p { color: #6b7280; margin: 5px 0; }
          .summary { background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .summary h3 { margin: 0 0 10px 0; color: #374151; }
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-item .value { font-size: 24px; font-weight: bold; color: #2563eb; }
          .summary-item .label { font-size: 12px; color: #6b7280; }
          .batch-report { border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
          .batch-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
          .batch-id { font-size: 18px; font-weight: bold; color: #374151; }
          .quality-score { background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .risk-factors, .recommendations { margin-top: 10px; }
          .risk-factors h4, .recommendations h4 { margin: 0 0 5px 0; font-size: 14px; color: #374151; }
          .risk-factors ul, .recommendations ul { margin: 0; padding-left: 20px; }
          .risk-factors li { color: #dc2626; }
          .recommendations li { color: #059669; }
          .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>GrainHero Storage Reports</h1>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>
        
        <div class="summary">
          <h3>Summary Overview</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="value">${batchReports.length}</div>
              <div class="label">Total Batches</div>
            </div>
            <div class="summary-item">
              <div class="value">${Math.round(batchReports.reduce((acc, batch) => acc + batch.qualityScore, 0) / batchReports.length)}%</div>
              <div class="label">Avg Quality Score</div>
            </div>
            <div class="summary-item">
              <div class="value">${siloData.length}</div>
              <div class="label">Active Silos</div>
            </div>
          </div>
        </div>
        
        ${batchReports.map(batch => `
          <div class="batch-report">
            <div class="batch-header">
              <div class="batch-id">${batch.batchId}</div>
              <div class="quality-score">Quality: ${batch.qualityScore}%</div>
            </div>
            <p><strong>Grain Type:</strong> ${batch.grainType} | <strong>Quantity:</strong> ${batch.quantity} tons | <strong>Storage Days:</strong> ${batch.storageDays}</p>
            <p><strong>Storage Period:</strong> ${new Date(batch.startDate).toLocaleDateString()} - ${new Date(batch.endDate).toLocaleDateString()}</p>
            
            <div class="risk-factors">
              <h4>Risk Factors:</h4>
              <ul>
                ${batch.riskFactors.map(factor => `<li>${factor}</li>`).join('')}
              </ul>
            </div>
            
            <div class="recommendations">
              <h4>Recommendations:</h4>
              <ul>
                ${batch.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          </div>
        `).join('')}
        
        <div class="footer">
          <p>This report was generated by GrainHero Data Visualization System</p>
        </div>
      </body>
      </html>
    `;
    
    // For now, return HTML content (in production, you'd use a PDF library like puppeteer)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="batch-reports-${new Date().toISOString().split('T')[0]}.html"`);
    res.send(htmlContent);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to export PDF',
      message: error.message
    });
  }
});

const noCache = require('../middleware/noCache');

// Get real-time sensor data (for live updates) - NEVER CACHE
router.get('/sensor-data/live', noCache, (req, res) => {
  try {
    const currentData = generateSensorData(1)[0]; // Get latest data point
    
    res.json({
      success: true,
      data: currentData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live sensor data',
      message: error.message
    });
  }
});

// Get historical trends analysis
router.get('/trends/analysis', (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;
    let hours = 168;
    
    switch (timeRange) {
      case '24h': hours = 24; break;
      case '30d': hours = 720; break;
      default: hours = 168;
    }
    
    const sensorData = generateSensorData(hours);
    
    // Calculate trends
    const trends = {
      temperature: {
        current: sensorData[sensorData.length - 1].temperature,
        average: sensorData.reduce((acc, d) => acc + d.temperature, 0) / sensorData.length,
        trend: sensorData[sensorData.length - 1].temperature > sensorData[0].temperature ? 'increasing' : 'decreasing',
        change: ((sensorData[sensorData.length - 1].temperature - sensorData[0].temperature) / sensorData[0].temperature * 100).toFixed(1)
      },
      humidity: {
        current: sensorData[sensorData.length - 1].humidity,
        average: sensorData.reduce((acc, d) => acc + d.humidity, 0) / sensorData.length,
        trend: sensorData[sensorData.length - 1].humidity > sensorData[0].humidity ? 'increasing' : 'decreasing',
        change: ((sensorData[sensorData.length - 1].humidity - sensorData[0].humidity) / sensorData[0].humidity * 100).toFixed(1)
      },
      airflow: {
        current: sensorData[sensorData.length - 1].airflow,
        average: sensorData.reduce((acc, d) => acc + d.airflow, 0) / sensorData.length,
        trend: sensorData[sensorData.length - 1].airflow > sensorData[0].airflow ? 'increasing' : 'decreasing',
        change: ((sensorData[sensorData.length - 1].airflow - sensorData[0].airflow) / sensorData[0].airflow * 100).toFixed(1)
      }
    };
    
    res.json({
      success: true,
      data: trends,
      timeRange,
      analysisPeriod: `${hours} hours`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to analyze trends',
      message: error.message
    });
  }
});

module.exports = router;
