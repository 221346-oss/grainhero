const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { requirePermission, requireAdminAccess } = require('../middleware/permission');
const { spawn } = require('child_process');
const path = require('path');
const riceDataService = require('../services/riceDataService');
const trainingDataService = require('../services/trainingDataService');
const SpoilagePrediction = require('../models/SpoilagePrediction');
const SensorDevice = require('../models/SensorDevice');
const Silo = require('../models/Silo');

const aiSpoilageService = require('../services/aiSpoilageService');

// POST /ai-spoilage/predict - Real ML prediction (direct inference, no DB save)
router.post('/predict', [
    auth,
    requirePermission('ai.predict'),
], async (req, res) => {
    try {
        const inputData = req.body;

        // Build feature dict matching smartbin_predict.py key_map
        const features = {
            temperature:    inputData.temperature    ?? inputData.Temperature    ?? null,
            humidity:       inputData.humidity       ?? inputData.Humidity       ?? null,
            storage_days:   inputData.storage_days   ?? inputData.Storage_Days   ?? 0,
            airflow:        inputData.airflow        ?? inputData.Airflow        ?? 0,
            dew_point:      inputData.dew_point      ?? inputData.Dew_Point      ?? null,
            ambient_light:  inputData.ambient_light  ?? inputData.Ambient_Light  ?? 50,
            pest_presence:  inputData.pest_presence  ?? inputData.Pest_Presence  ?? 0,
            grain_moisture: inputData.grain_moisture ?? inputData.Grain_Moisture ?? null,
            rainfall:       inputData.rainfall       ?? inputData.Rainfall       ?? 0,
            grain_type:     (inputData.grain_type || 'rice').toLowerCase(),
        };

        const batchId = inputData.batch_id || null;
        const mlResult = await aiSpoilageService.callSmartBinModel(features, batchId);

        const riskScore = mlResult.risk_score ?? 0;
        res.json({
            message: 'ML prediction completed',
            prediction:        mlResult.prediction,
            risk_score:        riskScore,
            confidence:        mlResult.confidence,
            risk_level:        riskScore >= 70 ? 'critical' : riskScore >= 50 ? 'high' : riskScore >= 30 ? 'medium' : 'low',
            model_used:        mlResult.model_used,
            ensemble_breakdown: mlResult.ensemble_breakdown || null,
            trustworthy:       mlResult.trustworthy,
            ml_result:         mlResult,
        });

    } catch (error) {
        console.error('ML prediction error:', error);
        res.status(500).json({ error: 'ML prediction failed', details: error.message });
    }
});


// GET /ai-spoilage/predictions - Get all predictions (no auth for testing)
router.get('/predictions', async (req, res) => {
    try {
        const predictions = riceDataService.getPredictions();
        const { risk_level, status, page = 1, limit = 20 } = req.query;

        let filteredPredictions = predictions;

        // Filter by risk level
        if (risk_level) {
            filteredPredictions = filteredPredictions.filter(p => p.risk_level === risk_level);
        }

        // Filter by status
        if (status) {
            filteredPredictions = filteredPredictions.filter(p => p.validation_status === status);
        }

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedPredictions = filteredPredictions.slice(startIndex, endIndex);

        console.log(`📊 Serving ${paginatedPredictions.length} predictions (${filteredPredictions.length} total)`);

        res.json({
            predictions: paginatedPredictions,
            total: filteredPredictions.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filteredPredictions.length / limit)
        });
    } catch (error) {
        console.error('Get predictions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /ai-spoilage/statistics - Get statistics (no auth for testing)
router.get('/statistics', async (req, res) => {
    try {
        const statistics = riceDataService.getStatistics();
        console.log('📈 Serving statistics:', statistics);
        res.json(statistics);
    } catch (error) {
        console.error('Get statistics error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /ai-spoilage/test - Test endpoint (no auth for testing)
router.get('/test', async (req, res) => {
    try {
        const predictions = riceDataService.getPredictions();
        const advisories = riceDataService.getAdvisories();
        const statistics = riceDataService.getStatistics();

        res.json({
            message: 'Rice data service is working!',
            data_loaded: predictions.length > 0,
            predictions_count: predictions.length,
            advisories_count: advisories.length,
            statistics: statistics,
            sample_prediction: predictions[0] || null
        });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({ error: 'Test failed', details: error.message });
    }
});

// GET /ai-spoilage/model-performance - Get model performance data
router.get('/model-performance', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../ml/model_performance.py');
        const python = spawn('python', [scriptPath, 'get_summary']);
        let output = '';
        let error = '';

        const timeout = setTimeout(() => {
            python.kill();
            return res.status(504).json({ error: 'Model performance query timed out' });
        }, 8000);

        python.stdout.on('data', (d) => { output += d.toString(); });
        python.stderr.on('data', (d) => { error += d.toString(); });

        python.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                console.error('model_performance.py stderr:', error);
                return res.status(500).json({ error: 'Failed to get model performance', details: error });
            }
            try {
                const data = JSON.parse(output);
                return res.json({
                    performance_summary: data.summary || {},
                    training_insights: data.insights || {},
                    recommendations: data.recommendations || [],
                    model_info: {
                        name: 'SmartBin-GrainSpoilage',
                        version: '2.0.0',
                        algorithm: 'Ensemble (XGBoost + RandomForest + LightGBM)',
                        features: ['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point', 'Storage_Days', 'Airflow', 'Ambient_Light', 'Pest_Presence', 'Rainfall'],
                        target_classes: ['Safe', 'Risky', 'Spoiled']
                    }
                });
            } catch (e) {
                return res.status(500).json({ error: 'Failed to parse model performance output', details: e.message });
            }
        });
    } catch (error) {
        console.error('Get model performance error:', error);
        res.status(500).json({ error: 'Failed to get model performance' });
    }
});


// GET /ai-spoilage/training-history - Get training history
router.get('/training-history', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const scriptPath = path.join(__dirname, '../ml/model_performance.py');
        const python = spawn('python', [scriptPath, 'get_history']);
        let output = '';
        let error = '';

        const timeout = setTimeout(() => {
            python.kill();
            return res.status(504).json({ error: 'Training history query timed out' });
        }, 8000);

        python.stdout.on('data', (d) => { output += d.toString(); });
        python.stderr.on('data', (d) => { error += d.toString(); });

        python.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                console.error('model_performance.py stderr:', error);
                return res.status(500).json({ error: 'Failed to get training history', details: error });
            }
            try {
                const data = JSON.parse(output);
                return res.json({
                    training_sessions: data.training_sessions || [],
                    total_sessions: (data.training_sessions || []).length,
                    performance_trends: data.performance_trends || {}
                });
            } catch (e) {
                return res.status(500).json({ error: 'Failed to parse training history output', details: e.message });
            }
        });
    } catch (error) {
        console.error('Get training history error:', error);
        res.status(500).json({ error: 'Failed to get training history' });
    }
});


// NOTE: POST /retrain was consolidated — the full implementation with
// performance tracking is below. This duplicate entry was removed to
// prevent Express silently routing all /retrain requests to this dead handler.

// GET /ai-spoilage/data-summary - Get data summary
router.get('/data-summary', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { spawn } = require('child_process');
        const path = require('path');

        const pythonScript = path.join(__dirname, '../ml/data_manager.py');

        const python = spawn('python', ['-c', `
import sys
sys.path.append('${path.join(__dirname, '../ml')}')
from data_manager import data_manager
import json

summary = data_manager.get_data_summary()
print(json.dumps(summary))
        `], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
        });

        python.on('close', (code) => {
            if (code === 0) {
                try {
                    const summary = JSON.parse(output);
                    res.json(summary);
                } catch (parseError) {
                    res.json({
                        base_records: 319,
                        new_records: 0,
                        total_records: 319,
                        last_updated: new Date().toISOString()
                    });
                }
            } else {
                res.json({
                    base_records: 319,
                    new_records: 0,
                    total_records: 319,
                    last_updated: new Date().toISOString()
                });
            }
        });

    } catch (error) {
        console.error('Get data summary error:', error);
        res.status(500).json({ error: 'Failed to get data summary' });
    }
});

// POST /ai-spoilage/add-data - Add new training data
router.post('/add-data', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { records } = req.body;

        if (!records || !Array.isArray(records)) {
            return res.status(400).json({ error: 'Records array is required' });
        }

        // Validate record structure
        const requiredFields = ['Temperature', 'Humidity', 'Grain_Moisture', 'Dew_Point',
            'Storage_Days', 'Airflow', 'Ambient_Light', 'Pest_Presence',
            'Rainfall', 'Spoilage_Label'];

        for (const record of records) {
            const missingFields = requiredFields.filter(field => !(field in record));
            if (missingFields.length > 0) {
                return res.status(400).json({
                    error: `Missing required fields: ${missingFields.join(', ')}`
                });
            }
        }

        const { spawn } = require('child_process');
        const path = require('path');

        // Save records to temporary file (async to avoid blocking the event loop)
        const fs = require('fs');
        const tempFile = path.join(__dirname, '../ml/temp_data.json');
        await fs.promises.writeFile(tempFile, JSON.stringify(records));

        const pythonScript = path.join(__dirname, '../ml/data_manager.py');

        const python = spawn('python', ['-c', `
import sys
import json
sys.path.append('${path.join(__dirname, '../ml')}')
from data_manager import data_manager

# Load records from temp file
with open('${tempFile}', 'r') as f:
    records = json.load(f)

# Add records
success = data_manager.add_new_data(records)
print(json.dumps({'success': success, 'count': len(records)}))
        `], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
        });

        python.on('close', (code) => {
            // Clean up temp file
            try {
                fs.unlinkSync(tempFile);
            } catch (e) { }

            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    res.json({
                        message: 'Data added successfully',
                        records_added: result.count,
                        success: result.success
                    });
                } catch (parseError) {
                    res.json({
                        message: 'Data added successfully',
                        records_added: records.length,
                        success: true
                    });
                }
            } else {
                res.status(500).json({
                    error: 'Failed to add data',
                    details: error
                });
            }
        });

    } catch (error) {
        console.error('Add data error:', error);
        res.status(500).json({ error: 'Failed to add data' });
    }
});

// POST /ai-spoilage/generate-sample-data - Generate sample data for testing
router.post('/generate-sample-data', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { count = 10 } = req.body;

        const { spawn } = require('child_process');
        const path = require('path');

        const pythonScript = path.join(__dirname, '../ml/data_manager.py');

        const python = spawn('python', ['-c', `
import sys
import json
sys.path.append('${path.join(__dirname, '../ml')}')
from data_manager import data_manager

# Generate sample data
sample_data = data_manager.generate_sample_data(${count})
print(json.dumps(sample_data))
        `], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
        });

        python.on('close', (code) => {
            if (code === 0) {
                try {
                    const sampleData = JSON.parse(output);
                    res.json({
                        message: 'Sample data generated',
                        sample_data: sampleData,
                        count: sampleData.length
                    });
                } catch (parseError) {
                    res.status(500).json({ error: 'Failed to parse sample data' });
                }
            } else {
                res.status(500).json({
                    error: 'Failed to generate sample data',
                    details: error
                });
            }
        });

    } catch (error) {
        console.error('Generate sample data error:', error);
        res.status(500).json({ error: 'Failed to generate sample data' });
    }
});

// GET /ai-spoilage/advisories - Get all advisories (no auth for testing)
router.get('/advisories', async (req, res) => {
    try {
        const advisories = riceDataService.getAdvisories();
        const { status, priority, page = 1, limit = 20 } = req.query;

        let filteredAdvisories = advisories;

        // Filter by status
        if (status) {
            filteredAdvisories = filteredAdvisories.filter(a => a.status === status);
        }

        // Filter by priority
        if (priority) {
            filteredAdvisories = filteredAdvisories.filter(a => a.priority === priority);
        }

        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedAdvisories = filteredAdvisories.slice(startIndex, endIndex);

        console.log(`📋 Serving ${paginatedAdvisories.length} advisories (${filteredAdvisories.length} total)`);

        res.json({
            advisories: paginatedAdvisories,
            total: filteredAdvisories.length,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(filteredAdvisories.length / limit)
        });
    } catch (error) {
        console.error('Get advisories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /ai-spoilage/retrain - Retrain model with detailed progress
router.post('/retrain', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { force_retrain = false, hyperparameter_tuning = true } = req.body;

        console.log('🚀 Starting model retraining...');

        // Import the enhanced trainer
        const { spawn } = require('child_process');
        const path = require('path');

        const pythonScript = path.join(__dirname, '../ml/enhanced_train.py');

        // Start the training process
        const python = spawn('python', [pythonScript], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let error = '';

        python.stdout.on('data', (data) => {
            output += data.toString();
            console.log('Training output:', data.toString());
        });

        python.stderr.on('data', (data) => {
            error += data.toString();
            console.error('Training error:', data.toString());
        });

        python.on('close', async (code) => {
            if (code === 0) {
                try {
                    // Load the performance tracker
                    const performanceTracker = require('../ml/model_performance');

                    // Parse training results from output
                    const metrics = parseTrainingOutput(output);

                    // Record the training session
                    const session = performanceTracker.record_training_session(
                        metrics,
                        metrics.training_samples || 319,
                        metrics.best_params || {},
                        metrics.improvement || {}
                    );

                    // Get performance summary
                    const summary = performanceTracker.get_performance_summary();
                    const insights = performanceTracker.get_training_insights();
                    const recommendations = performanceTracker.get_recommendations();

                    console.log('✅ Model retraining completed successfully');

                    res.json({
                        message: 'SmartBin-RiceSpoilage model retraining completed successfully',
                        model_type: 'SmartBin-RiceSpoilage',
                        status: 'completed',
                        completion_time: new Date().toISOString(),
                        performance_metrics: metrics,
                        improvement_summary: summary.overall_improvement || {},
                        training_insights: insights.insights || [],
                        recommendations: recommendations,
                        total_training_sessions: summary.total_training_sessions || 1,
                        best_performance: summary.best_performance || {}
                    });

                } catch (parseError) {
                    console.error('Error parsing training results:', parseError);
                    res.json({
                        message: 'Model retraining completed but results parsing failed',
                        status: 'completed_with_warnings',
                        raw_output: output
                    });
                }
            } else {
                console.error('Training failed with code:', code);
                res.status(500).json({
                    error: 'Model retraining failed',
                    details: error,
                    exit_code: code
                });
            }
        });

        // Handle timeout — guard against sending response after close event already fired
        setTimeout(() => {
            if (!res.headersSent) {
                python.kill();
                res.status(408).json({ error: 'Training timeout - process terminated after 5 minutes' });
            } else {
                python.kill(); // still clean up the process
            }
        }, 300000); // 5 minutes timeout

    } catch (error) {
        console.error('Retrain model error:', error);
        res.status(500).json({ error: 'Model retraining failed', details: error.message });
    }
});

// Helper function to parse training output
function parseTrainingOutput(output) {
    try {
        // Try to extract the JSON metrics block from ensemble_train.py output
        const jsonMatch = output.match(/__METRICS_JSON__\s*([\s\S]*?)\s*__END_METRICS__/);
        if (jsonMatch) {
            const metricsObj = JSON.parse(jsonMatch[1]);
            // metricsObj has keys: XGBoost, RandomForest, LightGBM, Ensemble
            const ens = metricsObj.Ensemble || {};
            return {
                accuracy: ens.accuracy || 0,
                f1_score: ens.f1_score || 0,
                precision: ens.precision || 0,
                recall: ens.recall || 0,
                cv_mean: ens.cv_mean || 0,
                cv_std: ens.cv_std || 0,
                model_type: 'ensemble',
                per_model: {
                    XGBoost: metricsObj.XGBoost || {},
                    RandomForest: metricsObj.RandomForest || {},
                    LightGBM: metricsObj.LightGBM || {},
                },
                timestamp: new Date().toISOString()
            };
        }
        // Fallback: try old format
        const accuracyMatch = output.match(/Accuracy: ([\d.]+)/);
        const f1Match = output.match(/F1-Score: ([\d.]+)/);
        return {
            accuracy: accuracyMatch ? parseFloat(accuracyMatch[1]) : 0,
            f1_score: f1Match ? parseFloat(f1Match[1]) : 0,
            model_type: 'legacy',
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error('Error parsing training output:', error);
        return { accuracy: 0, f1_score: 0, error: error.message, timestamp: new Date().toISOString() };
    }
}

// POST /ai-spoilage/predictions - Create new prediction
router.post('/predictions', [
    auth,
    requirePermission('ai.predict'),
], async (req, res) => {
    try {
        const inputData = req.body;

        // Call the SmartBin-RiceSpoilage ML model
        const prediction = await callSmartBinModel(inputData);

        // Create prediction record
        const predictionRecord = {
            _id: `pred-${Date.now()}`,
            prediction_id: `PRED-${Date.now()}`,
            batch_id: {
                _id: inputData.batch_id || `batch-${Date.now()}`,
                batch_id: inputData.batch_id || `BATCH${Date.now()}`,
                grain_type: 'Rice'
            },
            silo_id: {
                _id: inputData.silo_id || `silo-${Date.now()}`,
                name: inputData.silo_name || 'Rice Storage Silo'
            },
            prediction_type: 'ml_prediction',
            risk_score: prediction.risk_score,
            risk_level: prediction.risk_score > 80 ? 'critical' :
                prediction.risk_score > 60 ? 'high' :
                    prediction.risk_score > 40 ? 'medium' : 'low',
            confidence_score: prediction.confidence,
            prediction_horizon: Math.ceil(prediction.time_to_spoilage_hours / 24),
            predicted_date: new Date(Date.now() + prediction.time_to_spoilage_hours * 60 * 60 * 1000),
            environmental_factors: {
                temperature: {
                    current: inputData.temperature || 25,
                    trend: 'stable',
                    impact_score: 0.5
                },
                humidity: {
                    current: inputData.humidity || 60,
                    trend: 'stable',
                    impact_score: 0.5
                },
                co2: {
                    current: inputData.co2 || 500,
                    trend: 'stable',
                    impact_score: 0.3
                },
                moisture: {
                    current: inputData.grain_moisture || 15,
                    trend: 'stable',
                    impact_score: 0.6
                }
            },
            grain_factors: {
                grain_type: 'Rice',
                storage_duration_days: inputData.storage_days || 1,
                initial_quality_score: 85,
                moisture_content: inputData.grain_moisture || 15
            },
            validation_status: 'pending',
            prediction_details: {
                time_to_spoilage: prediction.time_to_spoilage_hours,
                key_risk_factors: prediction.key_risk_factors,
                secondary_risk_factors: [],
                severity_indicators: prediction.key_risk_factors,
                recommended_actions: ['Monitor conditions', 'Check storage environment'],
                shap_explanation: prediction.shap_explanation
            },
            created_at: new Date(),
            updated_at: new Date(),
            model_used: 'SmartBin-RiceSpoilage',
            admin_id: req.user.admin_id || req.user._id
        };

        // Add to data service
        riceDataService.addPrediction(predictionRecord);

        res.json({
            message: 'Prediction created successfully',
            prediction: predictionRecord
        });

    } catch (error) {
        console.error('Create prediction error:', error);
        res.status(500).json({ error: 'Failed to create prediction' });
    }
});

// GET /ai-spoilage/predictions/:id/shap - Get SHAP explainability
router.get('/predictions/:id/shap', [
    auth,
    requirePermission('ai.predict'),
], async (req, res) => {
    try {
        const { id } = req.params;
        const predictions = riceDataService.getPredictions();
        const prediction = predictions.find(p => p._id === id || p.prediction_id === id);

        if (!prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }

        const shap = prediction.prediction_details?.shap_explanation;
        if (!shap) {
            return res.status(404).json({ error: 'SHAP explanation not available for this prediction' });
        }

        res.json({
            prediction_id: prediction.prediction_id,
            shap_explanation: shap
        });
    } catch (error) {
        console.error('Get SHAP explanation error:', error);
        res.status(500).json({ error: 'Failed to retrieve SHAP explanation' });
    }
});

// PUT /ai-spoilage/predictions/:id - Update prediction
router.put('/predictions/:id', [
    auth,
    requirePermission('ai.predict'),
], async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        riceDataService.updatePrediction(id, updates);

        res.json({
            message: 'Prediction updated successfully'
        });
    } catch (error) {
        console.error('Update prediction error:', error);
        res.status(500).json({ error: 'Failed to update prediction' });
    }
});

// DELETE /ai-spoilage/predictions/:id - Delete prediction
router.delete('/predictions/:id', [
    auth,
    requirePermission('ai.predict'),
], async (req, res) => {
    try {
        const { id } = req.params;

        riceDataService.deletePrediction(id);

        res.json({
            message: 'Prediction deleted successfully'
        });
    } catch (error) {
        console.error('Delete prediction error:', error);
        res.status(500).json({ error: 'Failed to delete prediction' });
    }
});

// DELETE /ai-spoilage/advisories/:id - Delete advisory
router.delete('/advisories/:id', [
    auth,
    requirePermission('ai.predict'),
], async (req, res) => {
    try {
        const { id } = req.params;

        riceDataService.deleteAdvisory(id);

        res.json({
            message: 'Advisory deleted successfully'
        });
    } catch (error) {
        console.error('Delete advisory error:', error);
        res.status(500).json({ error: 'Failed to delete advisory' });
    }
});


// GET /ai-spoilage/training-data/export - Export training data for model retraining
router.get('/training-data/export', [
    auth,
    requirePermission('ai.manage'),
], async (req, res) => {
    try {
        const {
            siloId,
            startDate,
            endDate,
            onlyLabeled = 'true'
        } = req.query;

        const adminId = req.user.admin_id || req.user._id;
        const trainingData = await trainingDataService.prepareTrainingData({
            adminId: adminId,
            siloId,
            startDate,
            endDate,
            onlyLabeled: onlyLabeled === 'true'
        });

        const stats = trainingDataService.getTrainingDataStats(trainingData);

        // Export to CSV
        const csvPath = await trainingDataService.exportToCSV(trainingData);

        res.json({
            message: 'Training data exported successfully',
            stats: stats,
            csv_path: csvPath,
            record_count: trainingData.length,
            download_url: `/api/ai-spoilage/training-data/download?path=${encodeURIComponent(csvPath)}`
        });

    } catch (error) {
        console.error('Export training data error:', error);
        res.status(500).json({ error: 'Failed to export training data', details: error.message });
    }
});

// GET /ai-spoilage/training-data/download - Download exported CSV
router.get('/training-data/download', [
    auth,
    requirePermission('ai.manage'),
], async (req, res) => {
    try {
        const { path: filePath } = req.query;
        if (!filePath) {
            return res.status(400).json({ error: 'File path required' });
        }

        // Security: restrict downloads to the ml/ directory to prevent path traversal attacks
        const mlDir = path.resolve(__dirname, '../ml');
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(mlDir + require('path').sep) && resolvedPath !== mlDir) {
            return res.status(403).json({ error: 'Access denied: file must be within the ml directory' });
        }

        const fs = require('fs');
        if (!fs.existsSync(resolvedPath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        res.download(resolvedPath, 'training_data.csv', (err) => {
            if (err && !res.headersSent) {
                console.error('Download error:', err);
                res.status(500).json({ error: 'Failed to download file' });
            }
        });

    } catch (error) {
        console.error('Download training data error:', error);
        res.status(500).json({ error: 'Failed to download training data' });
    }
});

// POST /ai-spoilage/training-data/label - Label a sensor reading
router.post('/training-data/label', [
    auth,
    requirePermission('ai.manage'),
], async (req, res) => {
    try {
        const { readingId, label, notes } = req.body;

        if (!readingId || !label) {
            return res.status(400).json({ error: 'readingId and label are required' });
        }

        const reading = await trainingDataService.labelReading(readingId, label, notes);

        res.json({
            message: 'Reading labeled successfully',
            reading: {
                id: reading._id,
                label: reading.metadata.spoilage_label,
                timestamp: reading.timestamp
            }
        });

    } catch (error) {
        console.error('Label reading error:', error);
        res.status(500).json({ error: 'Failed to label reading', details: error.message });
    }
});

// POST /ai-spoilage/training-data/bulk-label - Bulk label readings
router.post('/training-data/bulk-label', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { labels } = req.body;

        if (!Array.isArray(labels) || labels.length === 0) {
            return res.status(400).json({ error: 'labels array is required' });
        }

        const results = await trainingDataService.bulkLabelReadings(labels);

        res.json({
            message: 'Bulk labeling completed',
            results: results
        });

    } catch (error) {
        console.error('Bulk label error:', error);
        res.status(500).json({ error: 'Failed to bulk label readings', details: error.message });
    }
});

// GET /ai-spoilage/training-data/stats - Get training data statistics
router.get('/training-data/stats', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const adminId = req.user.admin_id || req.user._id;
        const { siloId, startDate, endDate } = req.query;

        const trainingData = await trainingDataService.prepareTrainingData({
            adminId: adminId,
            siloId,
            startDate,
            endDate,
            onlyLabeled: false
        });

        const stats = trainingDataService.getTrainingDataStats(trainingData);

        res.json({
            stats: stats,
            total_records: trainingData.length
        });

    } catch (error) {
        console.error('Get training data stats error:', error);
        res.status(500).json({ error: 'Failed to get training data stats', details: error.message });
    }
});


// POST /ai-spoilage/predictions/:id/validate - Validate a prediction outcome
router.post('/predictions/:id/validate', [
    auth,
    requirePermission('ai.predict'),
], async (req, res) => {
    try {
        const { id } = req.params;
        const {
            spoilage_occurred,
            spoilage_type,
            spoilage_date,
            severity_level,
            validation_notes
        } = req.body;

        const adminId = req.user.admin_id || req.user._id;
        const prediction = await SpoilagePrediction.findOne({
            prediction_id: id,
            admin_id: adminId
        });

        if (!prediction) {
            return res.status(404).json({ error: 'Prediction not found' });
        }

        // Update validation using model method
        await prediction.updateValidation({
            spoilage_occurred: spoilage_occurred || false,
            spoilage_type: spoilage_type || null,
            spoilage_date: spoilage_date ? new Date(spoilage_date) : null,
            severity_level: severity_level || null,
            validation_notes: validation_notes || '',
            validated_by: req.user._id,
            validated_at: new Date()
        });

        res.json({
            message: 'Prediction validated successfully',
            prediction: {
                id: prediction.prediction_id,
                validation_status: prediction.validation_status,
                risk_score: prediction.risk_score,
                actual_outcome: prediction.actual_outcome
            }
        });

    } catch (error) {
        console.error('Validate prediction error:', error);
        res.status(500).json({ error: 'Failed to validate prediction', details: error.message });
    }
});

// GET /ai-spoilage/model-performance/validation - Get model validation performance metrics
router.get('/model-performance/validation', [
    auth,
    requirePermission('ai.manage'),
    requireAdminAccess
], async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

        const adminId = req.user.admin_id || req.user._id;
        // Get all validated predictions
        const validatedPredictions = await SpoilagePrediction.find({
            admin_id: adminId,
            validation_status: { $in: ['validated', 'false_positive', 'false_negative'] },
            'actual_outcome.validated_at': { $gte: startDate }
        }).select('risk_score risk_level validation_status actual_outcome model_info');

        const total = validatedPredictions.length;
        if (total === 0) {
            return res.json({
                message: 'No validated predictions found',
                metrics: {
                    total_validated: 0,
                    accuracy: null,
                    precision: null,
                    recall: null,
                    f1_score: null,
                    false_positive_rate: null,
                    false_negative_rate: null
                }
            });
        }

        // Calculate metrics
        let truePositives = 0; // Predicted high risk, actually spoiled
        let trueNegatives = 0; // Predicted low risk, actually safe
        let falsePositives = 0; // Predicted high risk, actually safe
        let falseNegatives = 0; // Predicted low risk, actually spoiled

        validatedPredictions.forEach(pred => {
            const predictedHighRisk = pred.risk_score >= 60; // High or critical
            const actualSpoilage = pred.actual_outcome?.spoilage_occurred || false;

            if (predictedHighRisk && actualSpoilage) {
                truePositives++;
            } else if (!predictedHighRisk && !actualSpoilage) {
                trueNegatives++;
            } else if (predictedHighRisk && !actualSpoilage) {
                falsePositives++;
            } else if (!predictedHighRisk && actualSpoilage) {
                falseNegatives++;
            }
        });

        // Calculate performance metrics
        const accuracy = (truePositives + trueNegatives) / total;
        const precision = (truePositives + falsePositives) > 0
            ? truePositives / (truePositives + falsePositives)
            : 0;
        const recall = (truePositives + falseNegatives) > 0
            ? truePositives / (truePositives + falseNegatives)
            : 0;
        const f1Score = (precision + recall) > 0
            ? 2 * (precision * recall) / (precision + recall)
            : 0;
        const falsePositiveRate = (falsePositives + trueNegatives) > 0
            ? falsePositives / (falsePositives + trueNegatives)
            : 0;
        const falseNegativeRate = (falseNegatives + truePositives) > 0
            ? falseNegatives / (falseNegatives + truePositives)
            : 0;

        // Risk level distribution
        const byRiskLevel = {
            low: { total: 0, correct: 0 },
            medium: { total: 0, correct: 0 },
            high: { total: 0, correct: 0 },
            critical: { total: 0, correct: 0 }
        };

        validatedPredictions.forEach(pred => {
            const level = pred.risk_level;
            if (byRiskLevel[level]) {
                byRiskLevel[level].total++;
                // Correct if prediction matches outcome
                const predictedSpoilage = pred.risk_score >= 60;
                const actualSpoilage = pred.actual_outcome?.spoilage_occurred || false;
                if (predictedSpoilage === actualSpoilage) {
                    byRiskLevel[level].correct++;
                }
            }
        });

        res.json({
            metrics: {
                total_validated: total,
                accuracy: Number(accuracy.toFixed(3)),
                precision: Number(precision.toFixed(3)),
                recall: Number(recall.toFixed(3)),
                f1_score: Number(f1Score.toFixed(3)),
                false_positive_rate: Number(falsePositiveRate.toFixed(3)),
                false_negative_rate: Number(falseNegativeRate.toFixed(3)),
                confusion_matrix: {
                    true_positives: truePositives,
                    true_negatives: trueNegatives,
                    false_positives: falsePositives,
                    false_negatives: falseNegatives
                },
                by_risk_level: byRiskLevel,
                time_period_days: parseInt(days)
            },
            recommendations: generatePerformanceRecommendations({
                accuracy,
                precision,
                recall,
                falsePositiveRate,
                falseNegativeRate
            })
        });

    } catch (error) {
        console.error('Get model validation performance error:', error);
        res.status(500).json({ error: 'Failed to get model performance', details: error.message });
    }
});

// Helper function to generate performance recommendations
function generatePerformanceRecommendations(metrics) {
    const recommendations = [];

    if (metrics.accuracy < 0.7) {
        recommendations.push({
            priority: 'high',
            issue: 'Low overall accuracy',
            suggestion: 'Consider retraining the model with more labeled data or adjusting feature engineering'
        });
    }

    if (metrics.precision < 0.7) {
        recommendations.push({
            priority: 'medium',
            issue: 'High false positive rate',
            suggestion: 'Model may be too sensitive. Consider raising risk score thresholds or improving feature selection'
        });
    }

    if (metrics.recall < 0.7) {
        recommendations.push({
            priority: 'high',
            issue: 'High false negative rate',
            suggestion: 'Model may be missing actual spoilage cases. Consider lowering risk thresholds or adding more sensitive features'
        });
    }

    if (metrics.falseNegativeRate > 0.2) {
        recommendations.push({
            priority: 'critical',
            issue: 'High false negative rate - missing actual spoilage',
            suggestion: 'URGENT: Model is failing to detect real spoilage. Immediate retraining required with focus on positive cases'
        });
    }

    if (recommendations.length === 0) {
        recommendations.push({
            priority: 'low',
            issue: 'Model performance is good',
            suggestion: 'Continue monitoring and collect more validation data for ongoing improvement'
        });
    }

    return recommendations;
}

// ═══════════════════ PUBLIC ML ENDPOINTS (no auth) ═══════════════════

// POST /ai-spoilage/predict-live - Run ML prediction using live Firebase sensor data
router.post('/predict-live', async (req, res) => {
    try {
        const {
            device_id = '004B12387760',
            grain_type = 'Rice',
            storage_days: storageDaysOverride,
            grain_moisture: grainMoistureOverride,
            // Optional overrides for any sensor value
            temperature: tempOverride,
            humidity: humOverride,
        } = req.body;

        // ═══ 1. Read live telemetry from Firebase ═══
        let liveData = {};
        try {
            const firebaseService = require('../services/firebaseRealtimeService');
            const fbData = await firebaseService.readTelemetry(device_id);
            if (fbData) liveData = fbData;
        } catch (e) {
            console.log('Firebase read failed, using request body values:', e.message);
        }

        // ═══ 2. Derive REAL values from live telemetry ═══
        const temp = tempOverride ?? liveData.temperature ?? liveData.temp ?? 25;
        const hum = humOverride ?? liveData.humidity ?? 60;
        const dewPt = liveData.dew_point ?? liveData.dewPoint ?? liveData.dew ?? (() => {
            // Magnus formula fallback
            const a = 17.27, b = 237.7;
            const alpha = (a * temp) / (b + temp) + Math.log(hum / 100);
            return (b * alpha) / (a - alpha);
        })();
        const pressure = liveData.pressure ?? 1013;
        const tvoc = liveData.tvoc_ppb ?? liveData.tvoc ?? liveData.voc ?? 0;

        // ─── 4. STORAGE DAYS: Compute from active GrainBatch or Silo batch_loaded_date ───
        // activeBatch is captured here so callSmartBinModel can use its _id for stale-lookup
        let activeBatch = null;
        let storageDays = storageDaysOverride ?? null;
        if (storageDays === null) {
            try {
                const SensorDevice = require('../models/SensorDevice');
                const GrainBatch = require('../models/GrainBatch');
                const Silo = require('../models/Silo');
                // Find the device to get its silo reference
                const device = await SensorDevice.findOne({ device_id: device_id }).select('silo_id');
                if (device && device.silo_id) {
                    // First try: active GrainBatch
                    const batch = await GrainBatch.findOne({
                        silo_id: device.silo_id,
                        status: { $in: ['stored', 'active', 'monitoring'] }
                    }).sort({ created_at: -1 }).select('intake_date harvest_date created_at actual_dispatch_date status');

                    if (batch) {
                        activeBatch = batch; // capture for use at callSmartBinModel below
                        const refDate = batch.intake_date || batch.harvest_date || batch.created_at;
                        // If dispatched, stop counting at dispatch date
                        const endDate = (batch.status === 'dispatched' && batch.actual_dispatch_date)
                            ? new Date(batch.actual_dispatch_date) : Date.now();
                        storageDays = Math.max(0, Math.round((endDate - new Date(refDate)) / (1000 * 60 * 60 * 24)));
                        console.log(`📦 Storage days computed from batch: ${storageDays} days (ref: ${refDate})`);
                    } else {
                        // Second try: silo batch_loaded_date
                        const silo = await Silo.findById(device.silo_id).select('batch_loaded_date batch_dispatched_date');
                        if (silo && silo.batch_loaded_date) {
                            const endDate = silo.batch_dispatched_date ? new Date(silo.batch_dispatched_date) : Date.now();
                            storageDays = Math.max(0, Math.round((endDate - new Date(silo.batch_loaded_date)) / (1000 * 60 * 60 * 24)));
                            console.log(`📦 Storage days computed from silo batch_loaded_date: ${storageDays} days`);
                        }
                    }
                }
            } catch (e) {
                console.log('Could not compute storage_days from batch:', e.message);
            }
            // Final fallback: if no batch/silo date found, use 0 (fresh/unknown)
            if (storageDays === null) storageDays = 0;
        }

        // ─── 5. GRAIN MOISTURE: From capacitive moisture probe (soil_moisture) ───
        // The hardware reads a capacitive probe placed inside the grain and publishes
        // as soil_moisture.percentage (0-100 inverted: 100=dry, 0=saturated)
        let grainMoisture = grainMoistureOverride ?? null;
        if (grainMoisture === null) {
            const soilMoisture = liveData.soil_moisture;
            const moistureRaw = liveData.moisture;

            if (soilMoisture && soilMoisture.percentage !== undefined) {
                // Convert soil moisture percentage to grain moisture %
                // Soil sensor: 100% = dry (low moisture), 0% = saturated (high moisture)
                // Grain moisture scale: ~8-25% MC (moisture content)
                // Mapping: soil 100% → ~8% MC, soil 0% → ~25% MC
                grainMoisture = 25 - (soilMoisture.percentage / 100) * 17;
                grainMoisture = Math.round(grainMoisture * 10) / 10; // 1 decimal
                console.log(`🌾 Grain moisture from probe: ${grainMoisture}% (soil sensor: ${soilMoisture.percentage}%)`);
            } else if (moistureRaw !== undefined) {
                // Direct moisture reading from Firebase
                grainMoisture = Number(moistureRaw);
                console.log(`🌾 Grain moisture (direct): ${grainMoisture}%`);
            } else {
                // Estimate from ambient humidity as last resort
                grainMoisture = hum > 80 ? 18 : hum > 70 ? 16 : hum > 60 ? 14 : 12;
                console.log(`🌾 Grain moisture estimated from humidity: ${grainMoisture}%`);
            }
        }

        // ─── 6. AIRFLOW: Derive from fan PWM speed telemetry ───
        let airflow;
        const pwmSpeed = liveData.pwm_speed ?? liveData.pwm ?? null;
        const fanState = liveData.fanState ?? liveData.fan_state ?? null;

        if (pwmSpeed !== null && pwmSpeed !== undefined) {
            // pwm_speed is 0-100 (percentage), convert to 0.0-1.0 for ML model
            airflow = Number(pwmSpeed) / 100.0;
            console.log(`🌀 Airflow from fan PWM: ${airflow.toFixed(2)} (pwm_speed: ${pwmSpeed}%)`);
        } else if (fanState !== null && fanState !== undefined) {
            // Binary fallback: fan on = 0.6, fan off = 0.0
            airflow = (fanState === true || fanState === 'on' || fanState === 1) ? 0.6 : 0.0;
            console.log(`🌀 Airflow from fan state: ${airflow} (${fanState})`);
        } else {
            airflow = 0.0; // No fan data = no airflow
            console.log(`🌀 Airflow: 0.0 (no fan data available)`);
        }

        // ─── 7. AMBIENT LIGHT: From LDR sensor on hardware ───
        let ambientLight;
        const lightSensor = liveData.light_sensor;
        const lightDirect = liveData.light;

        if (lightSensor && lightSensor.percentage !== undefined) {
            // LDR percentage (0-100, 100=bright)
            ambientLight = Number(lightSensor.percentage);
            console.log(`💡 Ambient light from LDR: ${ambientLight}% (raw: ${lightSensor.raw})`);
        } else if (lightSensor && lightSensor.raw !== undefined) {
            // Map raw LDR (4095=dark, 100=bright) to percentage
            ambientLight = Math.max(0, Math.min(100, Math.round(((4095 - Number(lightSensor.raw)) / 3995) * 100)));
            console.log(`💡 Ambient light from LDR raw: ${ambientLight}%`);
        } else if (lightDirect !== undefined) {
            ambientLight = Number(lightDirect);
            console.log(`💡 Ambient light (direct): ${ambientLight}`);
        } else {
            ambientLight = 50; // Neutral default
            console.log(`💡 Ambient light: 50 (no sensor data)`);
        }

        // ─── 8. PEST/MOLD RISK: Multi-factor inference ───
        // Same algorithm as Arduino computePestMoldRisk() and iot.js mqtt-ingest.
        //
        // References:
        //   TVOC:  Bosch BSEC IAQ classification (BME680 Datasheet)
        //   RH:    Magan & Aldred (2007), Int. J. Food Microbiology 119(1-2), pp.131-139
        //   Temp:  ASABE Standard D245.6
        //   MC:    FAO Grain Storage Techniques Ch.4; IRRI Rice Knowledge Bank
        let pestScore = 0.0;
        let pestPresence = 0.0;
        try {
            const SensorReading = require('../models/SensorReading');
            const latestReading = await SensorReading.findOne({ device_id }).sort({ timestamp: -1 });
            if (latestReading && latestReading.voc && latestReading.voc.baseline_24h && tvoc > 0) {
                const baseline = latestReading.voc.baseline_24h;
                const vocRelative = Math.max(0, (tvoc - baseline) / baseline);
                pestScore = Math.min(1.0, vocRelative * 0.5);
                console.log(`🐛 Pest risk from VOC proxy: score=${pestScore.toFixed(2)} (TVOC=${tvoc}, baseline=${baseline})`);
            }
        } catch (e) {
            console.log(`🐛 Failed to compute VOC baseline pest proxy: ${e.message}`);
        }

        if (pestScore === 0.0) {
            // Factor 1: TVOC (Bosch BSEC IAQ tiers) — weight up to 0.40
            if (tvoc > 1000) pestScore += 0.40;
            else if (tvoc > 500) pestScore += 0.30;
            else if (tvoc > 250) pestScore += 0.20;
            else if (tvoc > 100) pestScore += 0.08;

            // Factor 2: Humidity (Magan & Aldred 2007: aw ≥ 0.65-0.70) — weight up to 0.25
            if (hum > 80) pestScore += 0.25;
            else if (hum > 70) pestScore += 0.18;
            else if (hum > 65) pestScore += 0.10;

            // Factor 3: Temperature (ASABE: optimal 25-35°C for storage fungi) — weight up to 0.20
            if (temp > 35) pestScore += 0.18;
            else if (temp > 30) pestScore += 0.20;
            else if (temp > 25) pestScore += 0.12;
            else if (temp > 20) pestScore += 0.05;

            // Factor 4: Grain Moisture (FAO/IRRI: safe ≤13%, risk 13-14%, critical ≥15%) — up to 0.15
            if (grainMoisture > 18) pestScore += 0.15;
            else if (grainMoisture > 15) pestScore += 0.12;
            else if (grainMoisture > 14) pestScore += 0.08;
            else if (grainMoisture > 13) pestScore += 0.03;
        }

        pestScore = Math.min(1.0, Math.max(0.0, pestScore));
        const pestLabel = pestScore >= 0.6 ? 'High' : pestScore >= 0.35 ? 'Medium' : pestScore >= 0.15 ? 'Low' : 'None';
        // For the ML model: pass the composite score (0.0-1.0) as a continuous feature
        pestPresence = Math.round(pestScore * 10) / 10;
        console.log(`🐛 Pest/mold risk: ${pestLabel} (score=${pestScore.toFixed(2)}, ML input=${pestPresence}) — TVOC=${tvoc}, RH=${hum}%, T=${temp}°C, MC=${grainMoisture}%`);

        // ─── 9. RAINFALL: Live reading from OpenWeather API ───
        let rainfall = 0;
        try {
            // Default coordinates: Lahore, Pakistan (configurable via env)
            const lat = parseFloat(process.env.SILO_LATITUDE || '31.5204');
            const lon = parseFloat(process.env.SILO_LONGITUDE || '74.3587');

            const weatherResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=precipitation&forecast_days=1`);
            if (weatherResp.ok) {
                const weatherData = await weatherResp.json();
                rainfall = weatherData?.hourly?.precipitation?.[0] ?? 0;
                console.log(`🌧️ Rainfall from Open-Meteo: ${rainfall} mm`);
            } else {
                console.log(`🌧️ Rainfall fetch failed with status: ${weatherResp.status}`);
            }
        } catch (e) {
            console.log(`🌧️ Rainfall fetch failed: ${e.message}, defaulting to 0`);
        }

        // ═══ 3. Build ML input matching smartbin_predict.py feature order ═══
        const mlInput = {
            temperature: temp,
            humidity: hum,
            storage_days: storageDays,
            airflow: airflow,
            dew_point: dewPt,
            ambient_light: ambientLight,
            pest_presence: pestPresence,
            grain_moisture: grainMoisture,
            rainfall: rainfall,
        };

        // Log data sources for transparency
        console.log(`🧠 ML Input Features:`, JSON.stringify(mlInput, null, 2));

        // ═══ 4. Call ML model via aiSpoilageService (pure inference, no DB save) ═══
        // activeBatch captured during storage-days lookup above — used for stale-result cascade
        const mlResult = await aiSpoilageService.callSmartBinModel(mlInput, activeBatch ? activeBatch._id : null);
        if (mlResult.model_used === 'human_guardrail_required') {
            throw new Error('Prediction refused (human guardrail required)');
        }

        // ═══ 5. Generate recommendations based on prediction + real data ═══
        const recommendations = [];
        if (temp > 30) recommendations.push('Activate ventilation fans to reduce temperature');
        if (temp > 25 && temp <= 30) recommendations.push('Monitor temperature closely — approaching risk zone');
        if (hum > 80) recommendations.push('URGENT: Humidity critical — activate dehumidification immediately');
        if (hum > 70 && hum <= 80) recommendations.push('Increase airflow to reduce humidity levels');
        if (grainMoisture > 18) recommendations.push('Grain moisture too high — initiate drying cycle');
        else if (grainMoisture > 16) recommendations.push('Grain moisture elevated — monitor closely');
        if (tvoc > 600) recommendations.push('URGENT: High VOC levels — inspect for mold/decay/pest activity');
        else if (tvoc > 400) recommendations.push('Elevated VOC levels detected — schedule inspection');
        if (airflow < 0.2 && hum > 65) recommendations.push('Low airflow with high humidity — activate ventilation');
        if (rainfall > 5) recommendations.push('Heavy rainfall detected — check for water ingress and seal storage');
        else if (rainfall > 0) recommendations.push('Rainfall detected — monitor storage integrity');
        if (storageDays > 60) recommendations.push(`Grain stored ${storageDays} days — schedule quality check`);
        if (mlResult.risk_score >= 80) recommendations.push('CRITICAL: Immediate intervention required — high spoilage probability');
        if (mlResult.risk_score >= 60 && mlResult.risk_score < 80) recommendations.push('Schedule grain quality inspection within 24 hours');
        if (recommendations.length === 0) recommendations.push('All parameters within safe range — continue routine monitoring');

        // ═══ 6. Build response ═══
        const response = {
            prediction_id: `LIVE-${Date.now()}`,
            device_id,
            timestamp: new Date().toISOString(),
            // ML results
            classification: mlResult.prediction,       // 'Safe' | 'Risky' | 'Spoiled'
            risk_score: mlResult.risk_score,
            confidence: mlResult.confidence,
            risk_level: mlResult.risk_score > 80 ? 'critical' :
                mlResult.risk_score > 60 ? 'high' :
                    mlResult.risk_score > 40 ? 'medium' : 'low',
            // time_to_spoilage fields removed — not predictable at this stage
            class_probabilities: mlResult.class_probabilities || {},
            severity_factor: mlResult.severity_factor,
            key_risk_factors: mlResult.key_risk_factors,
            model_used: mlResult.model_used,
            // Input features used
            input_features: mlInput,
            // Data source transparency
            data_sources: {
                temperature: tempOverride ? 'manual_override' : (liveData.temperature !== undefined ? 'firebase_bme680' : 'default'),
                humidity: humOverride ? 'manual_override' : (liveData.humidity !== undefined ? 'firebase_bme680' : 'default'),
                storage_days: storageDaysOverride ? 'manual_override' : (storageDays > 0 ? 'grain_batch_db' : 'default_0d_fresh'),
                grain_moisture: grainMoistureOverride ? 'manual_override' : ((liveData.soil_moisture || liveData.moisture !== undefined) ? 'capacitive_probe' : 'humidity_estimate'),
                airflow: pwmSpeed !== null ? 'fan_pwm_telemetry' : (fanState !== null ? 'fan_state_binary' : 'default_off'),
                ambient_light: (lightSensor || lightDirect !== undefined) ? 'ldr_sensor' : 'default',
                pest_presence: (tvoc > 0 || hum > 65 || temp > 25 || grainMoisture > 13) ? 'multi_factor_inference' : 'default_none',
                rainfall: rainfall > 0 ? 'openweather_api' : 'openweather_api_zero',
                dew_point: (liveData.dew_point || liveData.dewPoint) ? 'firebase_sensor' : 'magnus_formula',
            },
            // Live sensor readings used
            live_sensor_data: {
                temperature: temp,
                humidity: hum,
                dew_point: dewPt,
                tvoc,
                pressure,
                light: ambientLight,
                pwm_speed: pwmSpeed,
                soil_moisture_pct: liveData.soil_moisture?.percentage,
                rainfall,
            },
            // Actionable output
            recommendations,
            grain_type,
            storage_days: storageDays,
        };

        // ─── AI Decision via MQTT: LEDs + Fan control based on prediction ───
        // Trigger health LEDs update and AI fan control via aiSpoilageService
        const riskLevel = mlResult.risk_score > 80 ? 'critical' : mlResult.risk_score > 60 ? 'high' : mlResult.risk_score > 40 ? 'medium' : 'low';
        await aiSpoilageService.sendMLActuatorCommand(device_id, mlResult.risk_score, riskLevel, mlInput);

        console.log(`🧠 Live ML prediction: ${mlResult.prediction} (risk=${mlResult.risk_score}%, conf=${(mlResult.confidence * 100).toFixed(1)}%) for device ${device_id}`);
        res.json(response);

    } catch (error) {
        console.error('Live ML prediction error:', error);
        res.status(500).json({ error: 'Live prediction failed', details: error.message });
    }
});

// GET /ai-spoilage/predictions-public - Get predictions (no auth) + optional live prediction
router.get('/predictions-public', async (req, res) => {
    try {
        const { device_id = '004B12387760', include_live = 'true' } = req.query;

        // 1. Return stored predictions
        let predictions = [];
        try {
            predictions = riceDataService.getPredictions();
        } catch { /* ignore */ }

        // 2. Optionally include a fresh live prediction
        let livePrediction = null;
        if (include_live === 'true') {
            try {
                // Read live telemetry from Firebase
                let liveData = {};
                try {
                    const firebaseService = require('../services/firebaseRealtimeService');
                    const fbData = await firebaseService.readTelemetry(device_id);
                    if (fbData) liveData = fbData;
                } catch { /* fallback below */ }

                const temp = liveData.temperature ?? liveData.temp ?? 25;
                const hum = liveData.humidity ?? 60;
                const dewPt = liveData.dew_point ?? liveData.dewPoint ?? (() => {
                    const a = 17.27, b = 237.7;
                    const alpha = (a * temp) / (b + temp) + Math.log(hum / 100);
                    return (b * alpha) / (a - alpha);
                })();
                const tvoc = liveData.tvoc_ppb ?? liveData.tvoc ?? liveData.voc ?? 0;

                // Grain moisture from capacitive probe
                let gm = 14;
                const sm = liveData.soil_moisture;
                if (sm && sm.percentage !== undefined) {
                    gm = Math.round((25 - (sm.percentage / 100) * 17) * 10) / 10;
                } else if (liveData.moisture !== undefined) {
                    gm = Number(liveData.moisture);
                } else {
                    gm = hum > 80 ? 18 : hum > 70 ? 16 : hum > 60 ? 14 : 12;
                }

                // Airflow from fan PWM
                const pwm = liveData.pwm_speed ?? liveData.pwm ?? null;
                const af = pwm !== null ? Number(pwm) / 100.0 :
                    ((liveData.fanState === true || liveData.fanState === 'on') ? 0.6 : 0.0);

                // Ambient light from LDR
                const ls = liveData.light_sensor;
                const al = ls?.percentage !== undefined ? Number(ls.percentage) :
                    (liveData.light !== undefined ? Number(liveData.light) : 50);

                // Pest/mold risk: multi-factor inference (same as predict-live)
                let ppScore = 0.0;
                if (tvoc > 1000) ppScore += 0.40;
                else if (tvoc > 500) ppScore += 0.30;
                else if (tvoc > 250) ppScore += 0.20;
                else if (tvoc > 100) ppScore += 0.08;
                if (hum > 80) ppScore += 0.25;
                else if (hum > 70) ppScore += 0.18;
                else if (hum > 65) ppScore += 0.10;
                if (temp > 35) ppScore += 0.18;
                else if (temp > 30) ppScore += 0.20;
                else if (temp > 25) ppScore += 0.12;
                else if (temp > 20) ppScore += 0.05;
                if (gm > 18) ppScore += 0.15;
                else if (gm > 15) ppScore += 0.12;
                else if (gm > 14) ppScore += 0.08;
                else if (gm > 13) ppScore += 0.03;
                ppScore = Math.min(1.0, Math.max(0.0, ppScore));
                const pp = Math.round(ppScore * 10) / 10;

                // Compute real storage_days from batch/silo (same logic as predict-live)
                let pubStorageDays = 0;
                try {
                    const SensorDevice = require('../models/SensorDevice');
                    const GrainBatch = require('../models/GrainBatch');
                    const Silo = require('../models/Silo');
                    const pubDevice = await SensorDevice.findOne({ device_id }).select('silo_id');
                    if (pubDevice && pubDevice.silo_id) {
                        // First try: active GrainBatch intake_date
                        const pubBatch = await GrainBatch.findOne({
                            silo_id: pubDevice.silo_id,
                            status: { $in: ['stored', 'active', 'monitoring'] }
                        }).sort({ created_at: -1 }).select('intake_date harvest_date created_at actual_dispatch_date status');
                        if (pubBatch) {
                            const refDate = pubBatch.intake_date || pubBatch.harvest_date || pubBatch.created_at;
                            // If dispatched, count only until dispatch date; otherwise count until now
                            const endDate = (pubBatch.status === 'dispatched' && pubBatch.actual_dispatch_date)
                                ? new Date(pubBatch.actual_dispatch_date) : Date.now();
                            pubStorageDays = Math.max(0, Math.round((endDate - new Date(refDate)) / (1000 * 60 * 60 * 24)));
                        } else {
                            // Fallback: silo batch_loaded_date
                            const pubSilo = await Silo.findById(pubDevice.silo_id).select('batch_loaded_date batch_dispatched_date');
                            if (pubSilo && pubSilo.batch_loaded_date) {
                                const endDate = pubSilo.batch_dispatched_date ? new Date(pubSilo.batch_dispatched_date) : Date.now();
                                pubStorageDays = Math.max(0, Math.round((endDate - new Date(pubSilo.batch_loaded_date)) / (1000 * 60 * 60 * 24)));
                            }
                        }
                    }
                } catch (e) {
                    console.log('Could not compute storage_days for predictions-public:', e.message);
                }

                const mlInput = {
                    temperature: temp,
                    humidity: hum,
                    storage_days: pubStorageDays,
                    airflow: af,
                    dew_point: dewPt,
                    ambient_light: al,
                    pest_presence: pp,
                    grain_moisture: gm,
                    rainfall: liveData.rainfall ?? 0,
                };

                const mlResult = await aiSpoilageService.callSmartBinModel(mlInput, pubBatch ? pubBatch._id : null);
                if (mlResult.model_used === 'human_guardrail_required') {
                    throw new Error('Prediction refused (human guardrail required)');
                }

                livePrediction = {
                    prediction_id: `LIVE-${Date.now()}`,
                    device_id,
                    classification: mlResult.prediction,
                    risk_score: mlResult.risk_score,
                    confidence: mlResult.confidence,
                    risk_level: mlResult.risk_score > 80 ? 'critical' :
                        mlResult.risk_score > 60 ? 'high' :
                            mlResult.risk_score > 40 ? 'medium' : 'low',
                    // time_to_spoilage fields removed — not predictable at this stage
                    class_probabilities: mlResult.class_probabilities || {},
                    key_risk_factors: mlResult.key_risk_factors,
                    model_used: mlResult.model_used,
                    input_features: mlInput,
                    live_sensor_data: { temperature: temp, humidity: hum, dew_point: dewPt, tvoc, pwm_speed: pwm, light: al },
                    grain_type: 'Rice',
                    timestamp: new Date().toISOString(),
                    is_live: true,
                };

                // Update LEDs based on prediction classification
                const riskLevel = mlResult.risk_score > 80 ? 'critical' : mlResult.risk_score > 60 ? 'high' : mlResult.risk_score > 40 ? 'medium' : 'low';
                await aiSpoilageService.sendMLActuatorCommand(device_id, mlResult.risk_score, riskLevel, mlInput);
            } catch (e) {
                console.error('Live prediction generation failed:', e.message);
            }
        }

        // 3. Get statistics
        let statistics = {};
        try { statistics = riceDataService.getStatistics(); } catch { /* ignore */ }

        res.json({
            predictions,
            live_prediction: livePrediction,
            statistics,
            total: predictions.length,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Public predictions error:', error);
        res.status(500).json({ error: 'Failed to get predictions', details: error.message });
    }
});

// POST /ai-spoilage/retrain-public - Retrain ensemble model (no auth for testing)
router.post('/retrain-public', async (req, res) => {
    try {
        const grainType = (req.body.grain_type || req.query.grain || 'rice').toLowerCase();
        const validGrains = ['rice', 'wheat', 'maize', 'sorghum', 'barley'];
        if (!validGrains.includes(grainType)) {
            return res.status(400).json({ error: `Invalid grain type: ${grainType}. Valid: ${validGrains.join(', ')}` });
        }

        console.log(`Starting ensemble retraining for ${grainType.toUpperCase()}...`);
        const pythonScript = path.join(__dirname, '../ml/ensemble_train.py');
        const python = spawn('python', [pythonScript, grainType], { stdio: ['pipe', 'pipe', 'pipe'] });
        let output = '';
        let error = '';
        python.stdout.on('data', (d) => { output += d.toString(); console.log('[Ensemble] ' + d.toString().trim()); });
        python.stderr.on('data', (d) => { error += d.toString(); });
        python.on('close', (code) => {
            if (code === 0) {
                const metrics = parseTrainingOutput(output);
                console.log(`Ensemble retrain completed for ${grainType}:`, JSON.stringify({
                    ensemble_accuracy: metrics.accuracy,
                    ensemble_f1: metrics.f1_score,
                }));
                res.json({
                    message: `Ensemble model retrained for ${grainType} (XGBoost + RandomForest + LightGBM)`,
                    status: 'completed',
                    model_type: 'ensemble',
                    grain_type: grainType,
                    performance_metrics: metrics,
                    completion_time: new Date().toISOString(),
                });
            } else {
                console.error(`Ensemble retrain failed for ${grainType}:`, error || output);
                res.status(500).json({ error: 'Ensemble retrain failed', grain_type: grainType, details: error || output });
            }
        });
        setTimeout(() => {
            if (!res.headersSent) {
                python.kill();
                res.status(408).json({ error: 'Training timeout - process terminated after 10 minutes' });
            } else {
                python.kill(); // still clean up the process
            }
        }, 600000); // 10 min timeout
    } catch (error) {
        console.error('Public retrain error:', error);
        res.status(500).json({ error: 'Retrain failed', details: error.message });
    }
});

// GET /ai-spoilage/model-info-public - Get current model info and metrics
router.get('/model-info-public', async (req, res) => {
    try {
        const grainType = (req.query.grain || 'rice').toLowerCase();
        const fs = require('fs');

        // Try grain-specific metadata first, fall back to default
        let metadataPath = path.join(__dirname, `../ml/${grainType}_model_metadata.json`);
        if (!fs.existsSync(metadataPath)) {
            metadataPath = path.join(__dirname, '../ml/model_metadata.json');
        }

        const datasetPath = path.join(__dirname, `../ml/${grainType}_spoilage_10k.csv`);

        let metadata = null;
        if (fs.existsSync(metadataPath)) {
            metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        }

        // Count dataset rows
        let datasetRows = 0;
        if (fs.existsSync(datasetPath)) {
            const content = fs.readFileSync(datasetPath, 'utf8');
            datasetRows = content.split('\n').filter(l => l.trim()).length - 1;
        }

        // List all trained grains
        const trainedGrains = ['rice', 'wheat', 'maize', 'sorghum', 'barley'].filter(g =>
            fs.existsSync(path.join(__dirname, `../ml/${g}_model_metadata.json`))
        );

        if (metadata) {
            res.json({
                model_type: metadata.model_type || 'unknown',
                version: metadata.version || '1.0',
                grain_type: metadata.grain_type || grainType,
                metrics: metadata.metrics || {},
                feature_importance: metadata.feature_importance || [],
                label_classes: metadata.label_classes || ['Safe', 'Risky', 'Spoiled'],
                training_date: metadata.training_date || null,
                dataset_rows: metadata.dataset_rows || datasetRows,
                weka_comparison: metadata.weka_comparison || {},
                trained_grains: trainedGrains,
                available_grains: ['rice', 'wheat', 'maize', 'sorghum', 'barley'],
            });
        } else {
            res.json({
                model_type: 'not_trained',
                version: '0',
                grain_type: grainType,
                metrics: {},
                dataset_rows: datasetRows,
                trained_grains: trainedGrains,
                available_grains: ['rice', 'wheat', 'maize', 'sorghum', 'barley'],
                message: `No model metadata found for ${grainType}. Please retrain the model.`,
            });
        }
    } catch (error) {
        console.error('Model info error:', error);
        res.status(500).json({ error: 'Failed to get model info', details: error.message });
    }
});

// GET /ai-spoilage/aeration-window
router.get('/aeration-window', async (req, res) => {
    try {
        const { temp, hum } = req.query;
        if (!temp || !hum) {
            return res.status(400).json({ error: 'temp and hum query parameters are required' });
        }
        const t = parseFloat(temp);
        const h = parseFloat(hum);
        // Dew point (Magnus formula)
        const a = 17.27, b = 237.7;
        const alpha = (a * t) / (b + t) + Math.log(h / 100);
        const dewPt = (b * alpha) / (a - alpha);
        
        res.json({
            dew_point: dewPt,
            aeration_safe: h < 65,
            recommendation: h < 65 ? "Favorable for aeration" : "High humidity, aeration may increase moisture"
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to calculate aeration window' });
    }
});

// GET /ai-spoilage/weather
router.get('/weather', async (req, res) => {
    try {
        const lat = parseFloat(process.env.SILO_LATITUDE || '31.5204');
        const lon = parseFloat(process.env.SILO_LONGITUDE || '74.3587');
        const weatherResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation&hourly=precipitation`);
        if (weatherResp.ok) {
            const weatherData = await weatherResp.json();
            res.json(weatherData);
        } else {
            res.status(weatherResp.status).json({ error: 'Weather API error' });
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch weather' });
    }
});

// PUT /ai-spoilage/predictions/:id/validate
router.put('/predictions/:id/validate', [
    auth,
    requirePermission('ai.predict')
], async (req, res) => {
    try {
        const { id } = req.params;
        const { is_correct, actual_label, notes } = req.body;
        const predictions = riceDataService.getPredictions();
        const idx = predictions.findIndex(p => p._id === id || p.prediction_id === id);
        if (idx === -1) return res.status(404).json({ error: 'Prediction not found' });
        
        predictions[idx].validation_status = 'validated';
        predictions[idx].is_correct = is_correct;
        predictions[idx].actual_label = actual_label;
        predictions[idx].validation_notes = notes;
        
        riceDataService.updatePrediction(id, predictions[idx]);
        res.json({ message: 'Prediction validated successfully', prediction: predictions[idx] });
    } catch (e) {
        res.status(500).json({ error: 'Validation failed' });
    }
});

// GET /ai-spoilage/feature-importance
router.get('/feature-importance', async (req, res) => {
    try {
        const grainType = (req.query.grain || 'rice').toLowerCase();
        const fs = require('fs');
        let metadataPath = path.join(__dirname, `../ml/${grainType}_model_metadata.json`);
        if (!fs.existsSync(metadataPath)) {
            metadataPath = path.join(__dirname, '../ml/model_metadata.json');
        }
        if (fs.existsSync(metadataPath)) {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            res.json(metadata.feature_importance || []);
        } else {
            res.json([]);
        }
    } catch (e) {
        res.status(500).json({ error: 'Failed to get feature importance' });
    }
});

// GET /ai-spoilage/grain-thresholds/:grain_type
router.get('/grain-thresholds/:grain_type', async (req, res) => {
    try {
        const grain = req.params.grain_type.toLowerCase();
        const thresholds = {
            rice: { moisture_max: 14, temp_max: 30, hum_max: 65 },
            wheat: { moisture_max: 13, temp_max: 25, hum_max: 60 },
            maize: { moisture_max: 15, temp_max: 28, hum_max: 65 },
            sorghum: { moisture_max: 13, temp_max: 30, hum_max: 60 },
            barley: { moisture_max: 12, temp_max: 25, hum_max: 60 }
        };
        const defaultThresholds = { moisture_max: 14, temp_max: 30, hum_max: 65 };
        res.json(thresholds[grain] || defaultThresholds);
    } catch (e) {
        res.status(500).json({ error: 'Failed to get thresholds' });
    }
});

module.exports = router;
