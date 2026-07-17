/**
 * Training Data Service
 * 
 * Prepares real IoT sensor data for ML model training.
 * Exports sensor readings in the format expected by the SmartBin training pipeline.
 * 
 * Usage:
 * 1. Collect real sensor readings over time
 * 2. Manually label them (safe/at_risk/spoiled) based on actual outcomes
 * 3. Export labeled data using this service
 * 4. Use the exported CSV to retrain the ML model
 */

const SensorReading = require('../models/SensorReading');
const GrainBatch = require('../models/GrainBatch');
const fs = require('fs').promises;
const path = require('path');

class TrainingDataService {
  constructor() {
    this.requiredFields = [
      'Temperature',
      'Humidity',
      'Grain_Moisture',
      'Dew_Point',
      'Storage_Days',
      'Airflow',
      'Ambient_Light',
      'Pest_Presence',
      'Rainfall',
      'VOC_index',
      'VOC_relative',
      'VOC_rate_5min',
      'VOC_rate_30min',
      'Spoilage_Label'
    ];
  }

  /**
   * Prepare training data from sensor readings
   * @param {Object} options - Query options
   * @param {string} options.adminId - Admin ID
   * @param {string} options.siloId - Optional silo ID filter
   * @param {Date} options.startDate - Start date for readings
   * @param {Date} options.endDate - End date for readings
   * @param {boolean} options.onlyLabeled - Only include readings with spoilage labels
   * @returns {Promise<Array>} Training data records
   */
  async prepareTrainingData(options = {}) {
    try {
      const {
        adminId,
        siloId,
        startDate,
        endDate,
        onlyLabeled = false
      } = options;

      // Build query
      const query = {
        admin_id: adminId,
        deleted_at: null
      };

      if (siloId) {
        query.silo_id = siloId;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      // Only get labeled data if requested
      if (onlyLabeled) {
        query['metadata.spoilage_label'] = { $in: ['safe', 'at_risk', 'spoiled'] };
      }

      // Fetch sensor readings
      const readings = await SensorReading.find(query)
        .populate('batch_id', 'grain_type harvest_date created_at')
        .sort({ timestamp: 1 })
        .limit(10000); // Reasonable limit

      console.log(`📊 Preparing training data from ${readings.length} sensor readings...`);

      // Transform to training format
      const trainingData = readings.map(reading => {
        const batch = reading.batch_id;
        const grainType = batch?.grain_type || 'rice';
        
        // Calculate storage days
        const referenceDate = batch?.harvest_date || batch?.created_at || reading.timestamp;
        const storageDays = Math.floor(
          (reading.timestamp - new Date(referenceDate)) / (1000 * 60 * 60 * 24)
        );

        // Get spoilage label (from metadata or derive from risk score)
        let spoilageLabel = reading.metadata?.spoilage_label || 'unknown';
        
        // If not labeled, derive from risk score (for unlabeled data export)
        if (spoilageLabel === 'unknown' && reading.derived_metrics?.ml_risk_score !== undefined) {
          const riskScore = reading.derived_metrics.ml_risk_score;
          if (riskScore >= 80) {
            spoilageLabel = 'spoiled';
          } else if (riskScore >= 60) {
            spoilageLabel = 'at_risk';
          } else {
            spoilageLabel = 'safe';
          }
        }

        // Map to SmartBin training format
        return {
          Temperature: reading.temperature?.value ?? reading.environmental_context?.weather?.temperature ?? 25,
          Humidity: reading.humidity?.value ?? reading.environmental_context?.weather?.humidity ?? 60,
          Grain_Moisture: reading.moisture?.value ?? 12,
          Dew_Point: reading.derived_metrics?.dew_point ?? 15,
          Storage_Days: Math.max(0, storageDays),
          Airflow: reading.derived_metrics?.airflow ?? 0,
          Ambient_Light: reading.ambient?.light?.value ?? reading.light?.value ?? 100,
          Pest_Presence: reading.derived_metrics?.pest_presence_flag ? 1 : 0,
          Rainfall: reading.environmental_context?.weather?.precipitation ?? 0,
          VOC_index: reading.voc?.value ?? 0,
          VOC_relative: reading.derived_metrics?.voc_relative ?? 100,
          VOC_rate_5min: reading.derived_metrics?.voc_rate_5min ?? 0,
          VOC_rate_30min: reading.derived_metrics?.voc_rate_30min ?? 0,
          Spoilage_Label: spoilageLabel,
          // Metadata for reference
          _reading_id: reading._id.toString(),
          _timestamp: reading.timestamp.toISOString(),
          _grain_type: grainType
        };
      });

      // Filter out records with missing critical fields
      const validData = trainingData.filter(record => {
        return record.Temperature !== null && 
               record.Humidity !== null && 
               record.Grain_Moisture !== null &&
               record.Spoilage_Label !== 'unknown';
      });

      console.log(`✅ Prepared ${validData.length} valid training records (${trainingData.length - validData.length} filtered out)`);

      return validData;

    } catch (error) {
      console.error('Error preparing training data:', error);
      throw error;
    }
  }

  /**
   * Export training data to CSV file
   * @param {Array} trainingData - Training data records
   * @param {string} outputPath - Output file path
   * @returns {Promise<string>} Path to exported file
   */
  async exportToCSV(trainingData, outputPath = null) {
    try {
      if (!outputPath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        outputPath = path.join(__dirname, '../ml', `training_data_${timestamp}.csv`);
      }

      // Prepare CSV header
      const headers = this.requiredFields.map(field => ({ id: field, title: field }));

      // Create CSV string
      let csvContent = headers.map(h => h.title).join(',') + '\n';

      trainingData.forEach(record => {
        const row = this.requiredFields.map(field => {
          const value = record[field];
          // Handle null/undefined
          if (value === null || value === undefined) return '';
          // Escape commas and quotes in strings
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        });
        csvContent += row.join(',') + '\n';
      });

      // Write to file
      await fs.writeFile(outputPath, csvContent, 'utf8');

      console.log(`✅ Training data exported to: ${outputPath}`);
      return outputPath;

    } catch (error) {
      console.error('Error exporting training data to CSV:', error);
      throw error;
    }
  }

  /**
   * Get training data statistics
   * @param {Array} trainingData - Training data records
   * @returns {Object} Statistics
   */
  getTrainingDataStats(trainingData) {
    const stats = {
      total_records: trainingData.length,
      by_label: {
        safe: 0,
        at_risk: 0,
        spoiled: 0,
        unknown: 0
      },
      feature_ranges: {}
    };

    trainingData.forEach(record => {
      const label = record.Spoilage_Label || 'unknown';
      if (stats.by_label[label] !== undefined) {
        stats.by_label[label]++;
      } else {
        stats.by_label.unknown++;
      }

      // Track feature ranges
      this.requiredFields.forEach(field => {
        if (field === 'Spoilage_Label') return;
        const value = record[field];
        if (typeof value === 'number' && !isNaN(value)) {
          if (!stats.feature_ranges[field]) {
            stats.feature_ranges[field] = { min: value, max: value, sum: 0, count: 0 };
          }
          stats.feature_ranges[field].min = Math.min(stats.feature_ranges[field].min, value);
          stats.feature_ranges[field].max = Math.max(stats.feature_ranges[field].max, value);
          stats.feature_ranges[field].sum += value;
          stats.feature_ranges[field].count++;
        }
      });
    });

    // Calculate averages
    Object.keys(stats.feature_ranges).forEach(field => {
      const range = stats.feature_ranges[field];
      range.avg = range.count > 0 ? range.sum / range.count : 0;
      delete range.sum; // Clean up
    });

    return stats;
  }

  /**
   * Label a sensor reading with spoilage outcome
   * @param {string} readingId - Sensor reading ID
   * @param {string} label - Label: 'safe', 'at_risk', 'spoiled'
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Updated reading
   */
  async labelReading(readingId, label, notes = '') {
    try {
      const validLabels = ['safe', 'at_risk', 'spoiled', 'unknown'];
      if (!validLabels.includes(label)) {
        throw new Error(`Invalid label. Must be one of: ${validLabels.join(', ')}`);
      }

      const reading = await SensorReading.findById(readingId);
      if (!reading) {
        throw new Error('Sensor reading not found');
      }

      if (!reading.metadata) {
        reading.metadata = {};
      }

      reading.metadata.spoilage_label = label;
      if (notes) {
        reading.metadata.notes = (reading.metadata.notes || '') + `\n[${new Date().toISOString()}] Labeled as ${label}: ${notes}`;
      }

      await reading.save();

      console.log(`✅ Labeled reading ${readingId} as ${label}`);
      return reading;

    } catch (error) {
      console.error('Error labeling reading:', error);
      throw error;
    }
  }

  /**
   * Bulk label readings
   * @param {Array} labels - Array of { readingId, label, notes }
   * @returns {Promise<Object>} Results
   */
  async bulkLabelReadings(labels) {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: []
      };

      for (const { readingId, label, notes } of labels) {
        try {
          await this.labelReading(readingId, label, notes);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({ readingId, error: error.message });
        }
      }

      console.log(`✅ Bulk labeling complete: ${results.success} success, ${results.failed} failed`);
      return results;

    } catch (error) {
      console.error('Error in bulk labeling:', error);
      throw error;
    }
  }
}

module.exports = new TrainingDataService();

