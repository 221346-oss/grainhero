const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

class RiceDataService {
    constructor() {
        this.dataset = [];
        this.predictions = [];
        this.advisories = [];
        this.statistics = null;
        this.loadDataset();
    }

    async loadDataset() {
        try {
            const csvPath = path.join(__dirname, '../ml/smartbin_rice_storage_data_enhanced.csv');
            const results = [];
            
            return new Promise((resolve, reject) => {
                fs.createReadStream(csvPath)
                    .pipe(parse({ columns: true, skip_empty_lines: true }))
                    .on('data', (data) => {
                        results.push({
                            temperature: parseFloat(data.Temperature),
                            humidity: parseFloat(data.Humidity),
                            storage_days: parseInt(data.Storage_Days),
                            spoilage_label: data.Spoilage_Label,
                            grain_type: 'Rice',
                            airflow: parseFloat(data.Airflow),
                            dew_point: parseFloat(data.Dew_Point),
                            ambient_light: parseFloat(data.Ambient_Light),
                            pest_presence: parseInt(data.Pest_Presence),
                            grain_moisture: parseFloat(data.Grain_Moisture),
                            rainfall: parseFloat(data.Rainfall)
                        });
                    })
                    .on('end', () => {
                        this.dataset = results;
                        this.generatePredictions();
                        this.generateAdvisories();
                        this.calculateStatistics();
                        console.log(`✅ Loaded ${results.length} rice storage records`);
                        resolve();
                    })
                    .on('error', (error) => {
                        console.error('Error loading dataset:', error);
                        reject(error);
                    });
            });
        } catch (error) {
            console.error('Error loading rice dataset:', error);
            // Fallback to mock data
            this.generateMockData();
        }
    }

    generatePredictions() {
        this.predictions = this.dataset.slice(0, 20).map((record, index) => {
            const riskScore = this.calculateRiskScore(record);
            const riskLevel = this.getRiskLevel(riskScore);
            
            return {
                _id: `pred-${index + 1}`,
                prediction_id: `PRED-${String(index + 1).padStart(3, '0')}`,
                batch_id: { 
                    _id: `batch-${index + 1}`, 
                    batch_id: `RICE${String(index + 1).padStart(3, '0')}`, 
                    grain_type: 'Rice' 
                },
                silo_id: { 
                    _id: `silo-${Math.floor(index / 5) + 1}`, 
                    name: `Rice Silo ${Math.floor(index / 5) + 1}` 
                },
                prediction_type: 'ml_prediction',
                risk_score: riskScore,
                risk_level: riskLevel,
                confidence_score: 0.75 + Math.random() * 0.2,
                prediction_horizon: Math.ceil(168 / (riskScore / 100 + 0.1)),
                predicted_date: new Date(Date.now() + (168 / (riskScore / 100 + 0.1)) * 60 * 60 * 1000),
                environmental_factors: {
                    temperature: { 
                        current: record.temperature, 
                        trend: 'stable', 
                        impact_score: 0.5 
                    },
                    humidity: { 
                        current: record.humidity, 
                        trend: 'stable', 
                        impact_score: 0.5 
                    },
                    co2: { 
                        current: 400 + Math.random() * 200, 
                        trend: 'stable', 
                        impact_score: 0.3 
                    },
                    moisture: { 
                        current: record.grain_moisture, 
                        trend: 'stable', 
                        impact_score: 0.6 
                    }
                },
                grain_factors: {
                    grain_type: 'Rice',
                    storage_duration_days: record.storage_days,
                    initial_quality_score: 85,
                    moisture_content: record.grain_moisture
                },
                validation_status: Math.random() > 0.3 ? 'validated' : 'pending',
                prediction_details: {
                    time_to_spoilage: Math.ceil(168 / (riskScore / 100 + 0.1)),
                    key_risk_factors: this.getKeyRiskFactors(record),
                    secondary_risk_factors: [],
                    severity_indicators: this.getKeyRiskFactors(record),
                    recommended_actions: this.getRecommendedActions(record)
                },
                created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                updated_at: new Date(),
                model_used: 'SmartBin-RiceSpoilage',
                admin_id: 'admin-1'
            };
        });
    }

    generateAdvisories() {
        this.advisories = this.predictions
            .filter(p => p.risk_score > 60)
            .slice(0, 8)
            .map((prediction, index) => ({
                _id: `adv-${index + 1}`,
                advisory_id: `ADV-${String(index + 1).padStart(3, '0')}`,
                prediction_id: prediction._id,
                batch_id: prediction.batch_id,
                title: this.getAdvisoryTitle(prediction),
                description: this.getAdvisoryDescription(prediction),
                advisory_type: 'preventive',
                priority: prediction.risk_score > 80 ? 'high' : 'medium',
                severity: prediction.risk_score > 80 ? 'high' : 'medium',
                action_type: this.getActionType(prediction),
                status: ['pending', 'assigned', 'in_progress', 'completed'][Math.floor(Math.random() * 4)],
                assigned_to: Math.random() > 0.5 ? 'user-001' : null,
                implementation_steps: this.getImplementationSteps(prediction),
                action_score: Math.floor(60 + Math.random() * 40),
                resource_requirements: this.getResourceRequirements(prediction),
                created_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000)
            }));
    }

    calculateStatistics() {
        const totalPredictions = this.predictions.length;
        const highRiskPredictions = this.predictions.filter(p => p.risk_score > 60).length;
        const criticalPredictions = this.predictions.filter(p => p.risk_score > 80).length;
        const validatedPredictions = this.predictions.filter(p => p.validation_status === 'validated').length;
        const totalAdvisories = this.advisories.length;
        const completedAdvisories = this.advisories.filter(a => a.status === 'completed').length;
        const inProgressAdvisories = this.advisories.filter(a => a.status === 'in_progress').length;

        this.statistics = {
            total_predictions: totalPredictions,
            total_advisories: totalAdvisories,
            avg_risk_score: this.predictions.reduce((sum, p) => sum + p.risk_score, 0) / totalPredictions,
            model_accuracy: 0.88,
            high_risk_predictions: highRiskPredictions,
            critical_predictions: criticalPredictions,
            validated_predictions: validatedPredictions,
            false_positives: Math.floor(totalPredictions * 0.05),
            false_negatives: Math.floor(totalPredictions * 0.03),
            completed_advisories: completedAdvisories,
            in_progress_advisories: inProgressAdvisories,
            avg_effectiveness: 0.85,
            overdue_advisories: Math.floor(totalAdvisories * 0.1),
            risk_distribution: [
                { _id: 'low', count: this.predictions.filter(p => p.risk_score < 40).length, avg_risk_score: 25 },
                { _id: 'medium', count: this.predictions.filter(p => p.risk_score >= 40 && p.risk_score < 70).length, avg_risk_score: 55 },
                { _id: 'high', count: this.predictions.filter(p => p.risk_score >= 70 && p.risk_score < 90).length, avg_risk_score: 80 },
                { _id: 'critical', count: this.predictions.filter(p => p.risk_score >= 90).length, avg_risk_score: 95 }
            ]
        };
    }

    calculateRiskScore(record) {
        let score = 0;
        
        // Temperature risk
        if (record.temperature > 30) score += (record.temperature - 30) * 3;
        if (record.temperature < 10) score += (10 - record.temperature) * 2;
        
        // Humidity risk
        if (record.humidity > 70) score += (record.humidity - 70) * 2;
        
        // Moisture risk
        if (record.grain_moisture > 16) score += (record.grain_moisture - 16) * 5;
        
        // Storage duration
        if (record.storage_days > 60) score += (record.storage_days - 60) * 0.5;
        
        // Pest presence
        if (record.pest_presence > 0) score += 20;
        
        return Math.min(100, Math.max(0, score));
    }

    getRiskLevel(riskScore) {
        if (riskScore >= 90) return 'critical';
        if (riskScore >= 70) return 'high';
        if (riskScore >= 40) return 'medium';
        return 'low';
    }

    getKeyRiskFactors(record) {
        const factors = [];
        if (record.temperature > 30) factors.push('high_temperature');
        if (record.humidity > 75) factors.push('high_humidity');
        if (record.grain_moisture > 16) factors.push('high_moisture');
        if (record.pest_presence > 0) factors.push('pest_presence');
        return factors;
    }

    getRecommendedActions(record) {
        const actions = [];
        if (record.temperature > 30) actions.push('Increase ventilation');
        if (record.humidity > 75) actions.push('Reduce humidity');
        if (record.grain_moisture > 16) actions.push('Check moisture content');
        if (record.pest_presence > 0) actions.push('Pest control required');
        return actions;
    }

    getAdvisoryTitle(prediction) {
        if (prediction.risk_score > 80) return 'Critical: Immediate Action Required';
        if (prediction.risk_score > 60) return 'High Risk: Preventive Measures Needed';
        return 'Monitor Storage Conditions';
    }

    getAdvisoryDescription(prediction) {
        const factors = prediction.prediction_details.key_risk_factors;
        if (factors.includes('high_temperature')) return 'Temperature is too high. Increase ventilation and cooling.';
        if (factors.includes('high_humidity')) return 'Humidity levels are excessive. Implement dehumidification measures.';
        if (factors.includes('pest_presence')) return 'Pest activity detected. Immediate pest control required.';
        return 'Storage conditions need monitoring and adjustment.';
    }

    getActionType(prediction) {
        const factors = prediction.prediction_details.key_risk_factors;
        if (factors.includes('high_temperature')) return 'ventilation';
        if (factors.includes('high_humidity')) return 'dehumidification';
        if (factors.includes('pest_presence')) return 'pest_control';
        return 'monitoring';
    }

    getImplementationSteps(prediction) {
        const factors = prediction.prediction_details.key_risk_factors;
        if (factors.includes('high_temperature')) {
            return ['Check ventilation system', 'Open air vents', 'Monitor temperature for 24 hours'];
        }
        if (factors.includes('high_humidity')) {
            return ['Activate dehumidifiers', 'Check for leaks', 'Monitor humidity levels'];
        }
        if (factors.includes('pest_presence')) {
            return ['Inspect storage area', 'Apply pest control measures', 'Seal entry points'];
        }
        return ['Check storage conditions', 'Review monitoring data', 'Update risk assessment'];
    }

    getResourceRequirements(prediction) {
        const factors = prediction.prediction_details.key_risk_factors;
        if (factors.includes('high_temperature')) return ['Ventilation equipment', 'Technician'];
        if (factors.includes('high_humidity')) return ['Dehumidifiers', 'Technician'];
        if (factors.includes('pest_presence')) return ['Pest control supplies', 'Specialist'];
        return ['Monitoring equipment'];
    }

    generateMockData() {
        // Fallback mock data if CSV loading fails
        this.predictions = [];
        this.advisories = [];
        this.statistics = {
            total_predictions: 0,
            total_advisories: 0,
            avg_risk_score: 0,
            model_accuracy: 0.88,
            high_risk_predictions: 0,
            critical_predictions: 0,
            validated_predictions: 0,
            false_positives: 0,
            false_negatives: 0,
            completed_advisories: 0,
            in_progress_advisories: 0,
            avg_effectiveness: 0.85,
            overdue_advisories: 0,
            risk_distribution: []
        };
    }

    // Getter methods
    getPredictions() { return this.predictions; }
    getAdvisories() { return this.advisories; }
    getStatistics() { return this.statistics; }
    
    // Add new prediction
    addPrediction(prediction) {
        this.predictions.unshift(prediction);
        this.calculateStatistics();
    }
    
    // Update prediction
    updatePrediction(id, updates) {
        const index = this.predictions.findIndex(p => p._id === id);
        if (index !== -1) {
            this.predictions[index] = { ...this.predictions[index], ...updates };
            this.calculateStatistics();
        }
    }
    
    // Delete prediction
    deletePrediction(id) {
        this.predictions = this.predictions.filter(p => p._id !== id);
        this.calculateStatistics();
    }
    
    // Add new advisory
    addAdvisory(advisory) {
        this.advisories.unshift(advisory);
        this.calculateStatistics();
    }
    
    // Update advisory
    updateAdvisory(id, updates) {
        const index = this.advisories.findIndex(a => a._id === id);
        if (index !== -1) {
            this.advisories[index] = { ...this.advisories[index], ...updates };
            this.calculateStatistics();
        }
    }
    
    // Delete advisory
    deleteAdvisory(id) {
        this.advisories = this.advisories.filter(a => a._id !== id);
        this.calculateStatistics();
    }
}

const riceDataService = new RiceDataService();

// Initialize the service
riceDataService.loadDataset().then(() => {
    console.log('✅ Rice data service initialized successfully');
}).catch((error) => {
    console.error('❌ Failed to initialize rice data service:', error);
});

module.exports = riceDataService;
