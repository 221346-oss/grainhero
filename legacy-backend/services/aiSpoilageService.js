const EventEmitter = require('events');
const SpoilagePrediction = require('../models/SpoilagePrediction');
const Advisory = require('../models/Advisory');
const SensorReading = require('../models/SensorReading');
const GrainBatch = require('../models/GrainBatch');
const GrainAlert = require('../models/GrainAlert');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { getRiskLevel, getRiskLevelDetails, requiresAction, requiresAlert } = require('../configs/risk-thresholds');

class AISpoilageService extends EventEmitter {
    constructor() {
        super();
        this.modelPath = path.join(__dirname, '../ml/smartbin_model.pkl');
        this.smartbinScript = path.join(__dirname, '../ml/smartbin_predict.py');
        this.pythonScript = path.join(__dirname, '../ml/spoilage_predictor.py');
        this.mqttClient = null;   // injected after server init
        this.controlMode = 'ML_AUTO'; // ML_AUTO | HUMAN | FAILSAFE
    }

    _logGuardrailEvent(eventType, details) {
        console.warn(`[GUARDRAIL EVENT] ${new Date().toISOString()} | type=${eventType}`, details);
    }

    /** Inject MQTT client after server starts */
    setMqttClient(client) {
        this.mqttClient = client;
        console.log('[ML] MQTT client injected into AI Spoilage Service');
    }

    /** Set control mode — only send actuator commands in ML_AUTO */
    setControlMode(mode) {
        const valid = ['ML_AUTO', 'HUMAN', 'FAILSAFE'];
        this.controlMode = valid.includes(mode) ? mode : 'ML_AUTO';
        console.log(`[ML] Control mode set to: ${this.controlMode}`);
    }

    /**
     * Initialize the ML model
     */
    async initializeModel() {
        try {
            // Check if model file exists
            await fs.access(this.modelPath);
            this.isModelLoaded = true;
            console.log('AI Spoilage model loaded successfully');
            this.emit('modelLoaded');
        } catch (error) {
            console.log('No pre-trained model found, using fallback prediction system');
            this.isModelLoaded = false;
            this.emit('modelFallback');
        }
    }

    /**
     * Predict spoilage for a grain batch (Synchronous)
     */
    async predictSpoilageSync(batchId, environmentalData, options = {}) {
        return this.predictSpoilage(batchId, environmentalData, options);
    }

    async predictSpoilage(batchId, environmentalData, options = {}) {
        try {
            const predictionId = uuidv4();
            
            // Process immediately instead of queuing
            const result = await this.processPrediction({
                predictionId,
                batchId,
                environmentalData,
                options,
                timestamp: new Date()
            });

            return result;
        } catch (error) {
            console.error('Predict spoilage error:', error);
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Process individual prediction
     */
    async processPrediction(prediction) {
        try {
            const { predictionId, batchId, environmentalData, options } = prediction;

            // Get batch information
            const batch = await GrainBatch.findById(batchId);
            if (!batch) {
                throw new Error(`Batch ${batchId} not found`);
            }

            // Prepare features for ML model
            const features = this.prepareFeatures(environmentalData, batch);
            console.log("ML FEATURES SENT:", features);

            // Get prediction from unified ML cascade
            const predictionResult = await this.callSmartBinModel(features, batchId);

            // Normalize prediction type to valid schema enum
            const VALID_PREDICTION_TYPES = ['mold', 'aflatoxin', 'insect', 'general_spoilage', 'quality_degradation'];
            const rawType = options.predictionType || 'general_spoilage';
            const predictionType = VALID_PREDICTION_TYPES.includes(rawType) ? rawType : 'general_spoilage';

            // Normalize risk_score (must be a number)
            const rawRisk = predictionResult.risk_score;
            const riskScore = typeof rawRisk === 'number' && !isNaN(rawRisk) ? rawRisk : 0;

            // Normalize confidence_score from % (0-100) to fraction (0-1)
            const rawConf = predictionResult.confidence;
            const confidenceScore = typeof rawConf === 'number'
              ? (rawConf > 1 ? rawConf / 100 : rawConf)
              : 0.5;

            // Normalize risk_level to valid schema enum
            const VALID_RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
            const rawLevel = this.calculateRiskLevel(riskScore);
            const riskLevel = VALID_RISK_LEVELS.includes(rawLevel) ? rawLevel : 'low';

            // Create spoilage prediction record
            const spoilagePrediction = new SpoilagePrediction({
                prediction_id: predictionId,
                admin_id: batch.admin_id,
                silo_id: batch.silo_id,
                batch_id: batchId,
                prediction_type: predictionType,
                risk_score: riskScore,
                risk_level: riskLevel,
                confidence_score: Math.min(1, Math.max(0, confidenceScore)),
                prediction_horizon: options.horizon || 7,
                predicted_date: new Date(Date.now() + (options.horizon || 7) * 24 * 60 * 60 * 1000),
                environmental_factors: this.analyzeEnvironmentalFactors(environmentalData),
                grain_factors: this.analyzeGrainFactors(batch, environmentalData),
                model_info: {
                    model_version: '1.0.0',
                    model_type: predictionResult.model_used || 'unknown',
                    training_data_size: 10000,
                    last_trained: new Date(),
                    accuracy_score: predictionResult.accuracy || 0.85
                },
                feature_importance: predictionResult.feature_importance,
                prediction_details: {
                    primary_risk_factors: predictionResult.primary_risk_factors,
                    secondary_risk_factors: predictionResult.secondary_risk_factors,
                    mitigation_effectiveness: predictionResult.mitigation_effectiveness,
                    time_to_spoilage: predictionResult.time_to_spoilage,
                    severity_indicators: predictionResult.severity_indicators
                },
                created_by: options.userId || batch.created_by
            });

            await spoilagePrediction.save();
            console.log(`[ML] ✅ Prediction saved: risk=${riskScore}% level=${riskLevel} conf=${(confidenceScore*100).toFixed(1)}%`);

            // Generate advisories if risk requires action (high or critical)
            if (requiresAction(spoilagePrediction.risk_score)) {
                await this.generateAdvisories(spoilagePrediction);
            }

            // Create alert if risk is critical
            if (requiresAlert(spoilagePrediction.risk_score)) {
                await this.createSpoilageAlert(spoilagePrediction);
            }

            this.emit('predictionCompleted', {
                predictionId,
                riskScore: spoilagePrediction.risk_score,
                riskLevel: spoilagePrediction.risk_level
            });

            // === SEND ML ACTUATOR COMMANDS TO ESP32 ===
            if (options.deviceId) {
                await this.sendMLActuatorCommand(options.deviceId, riskScore, riskLevel, environmentalData);
            }

            return spoilagePrediction;

        } catch (error) {
            console.error('Process prediction error:', error);
            throw error;
        }
    }

    /**
     * Send ML-driven actuator commands to ESP32 via MQTT
     * Only fires when controlMode === 'ML_AUTO'
     */
    async sendMLActuatorCommand(deviceId, riskScore, riskLevel, envData) {
        if (this.controlMode !== 'ML_AUTO') {
            console.log(`[ML] Actuator command skipped — mode is ${this.controlMode}`);
            return;
        }
        if (!this.mqttClient || !this.mqttClient.connected) {
            console.warn('[ML] MQTT not connected — actuator command not sent');
            return;
        }

        // Fumigation Interlock
        const SensorDevice = require('../models/SensorDevice');
        const Silo = require('../models/Silo');
        
        let fumigationActive = false;
        try {
            const device = await SensorDevice.findOne({ device_id: deviceId }).select('silo_id').lean();
            if (device && device.silo_id) {
                const silo = await Silo.findById(device.silo_id).select('fumigation_active').lean();
                if (silo && silo.fumigation_active) {
                    fumigationActive = true;
                }
            }
        } catch (dbErr) {
            console.warn('Error checking fumigation status:', dbErr.message);
        }

        // Determine fan speed and LED based on risk level
        let fanOn = false, pwm = 0, led2 = false, led3 = false, led4 = false;
        const tvoc = envData?.tvoc || 0;
        const humidity = envData?.humidity || 0;

        if (riskLevel === 'critical' || riskScore >= 70) {
            fanOn = true; pwm = 100;
            led2 = false; led3 = false; led4 = true;   // Red LED
        } else if (riskLevel === 'high' || riskScore >= 50) {
            fanOn = true; pwm = 80;
            led2 = false; led3 = true; led4 = false;   // Yellow LED
        } else if (riskLevel === 'medium' || riskScore >= 30 || tvoc > 400 || humidity > 70) {
            fanOn = true; pwm = 60;
            led2 = false; led3 = true; led4 = false;   // Yellow LED
        } else {
            fanOn = false; pwm = 0;
            led2 = true; led3 = false; led4 = false;   // Green LED
        }

        if (fumigationActive) {
            console.log(`⚠️ Fumigation active for device ${deviceId} – overriding AI fan ON command`);
            fanOn = false; 
            pwm = 0;
        }

        const topic = `grainhero/actuators/${deviceId}/control`;
        const command = {
            action: fanOn ? 'turn_on' : 'turn_off',
            value: pwm,
            pwm: Math.round(pwm / 100 * 255),
            pwm_speed: pwm,
            led2: led2 ? 1 : 0,
            led3: led3 ? 1 : 0,
            led4: led4 ? 1 : 0,
            ml_decision: riskLevel,
            risk_score: riskScore,
            source: 'ML_AUTO',
            timestamp: new Date().toISOString()
        };

        this.mqttClient.publish(topic, JSON.stringify(command), { qos: 1 });
        console.log(`[ML] 💡 MQTT command sent → ${topic}: fan=${fanOn} pwm=${pwm} LED2(G)=${led2} LED3(Y)=${led3} LED4(R)=${led4} risk=${riskScore}%`);
    }

    /**
     * Unified ML prediction cascade (Box 1 -> Box 3)
     */
    async callSmartBinModel(features, batchId) {
        // Box 1: Python ML Ensemble with Retries
        let result = null;
        for (let i = 0; i < 2; i++) {
            try {
                result = await this._executePythonModel(features);
                if (result && result.error === 'sensor_fault') {
                    this._logGuardrailEvent('sensor_fault', result.faults);
                    result = null; // Break out of retry, go to Box 3
                    break;
                }
                if (result) {
                    // Box 2: Guardrail check is handled by Python
                    if (!result.trustworthy) {
                        this._logGuardrailEvent('low_confidence', result);
                    }
                    return result;
                }
            } catch (err) {
                console.warn(`[ML] Python execution failed (attempt ${i + 1}/2): ${err.message}`);
                if (i === 1) this._logGuardrailEvent('ml_execution_error', err.message);
            }
        }

        // Box 3: Emergency Cascade
        // Box 3a: Stale Result Lookup
        try {
            const stale = await SpoilagePrediction.findOne({
                batch_id: batchId,
                created_at: { $gte: new Date(Date.now() - 30 * 60000) }
            }).sort({ created_at: -1 });

            if (stale && stale.model_info && stale.model_info.model_type && stale.model_info.model_type.startsWith('ensemble')) {
                this._logGuardrailEvent('stale_prediction_used', stale._id);
                return {
                    prediction: stale.prediction_details?.primary_risk_factors?.length ? 'Risky' : 'Unknown',
                    confidence: stale.confidence_score,
                    risk_score: stale.risk_score,
                    model_used: 'ensemble_stale',
                    trustworthy: false
                };
            }
        } catch (e) {
            this._logGuardrailEvent('stale_check_failed', e.message);
        }

        // Box 3b: Human Guardrail (Honest Refusal)
        this._logGuardrailEvent('human_guardrail_required', { batchId });
        return {
            prediction: 'Unknown',
            confidence: 0,
            risk_score: 0,
            model_used: 'human_guardrail_required',
            trustworthy: false
        };
    }

    async _executePythonModel(features) {
        try {
            const mlUrl = process.env.GRAINHERO_ML_API_URL;
            if (!mlUrl) {
                console.warn("[ML] GRAINHERO_ML_API_URL not defined, using fallback/simulation mode if enabled.");
                // For local dev if URL is not set, we can either throw or simulate. We throw to trigger fallback.
                throw new Error("GRAINHERO_ML_API_URL not defined in .env");
            }
            
            // Format for HuggingFace API
            const payload = {
                grain_type: (features.grain_type || 'rice').toLowerCase(),
                temperature: features.Temperature ?? 25.0,
                humidity: features.Humidity ?? 60.0,
                storage_days: features.Storage_Days ?? 0,
                grain_moisture: features.Grain_Moisture ?? 13.0,
                airflow: features.Airflow ?? 0.0,
                dew_point: features.Dew_Point ?? 15.0,
                ambient_light: features.Ambient_Light ?? 0.0,
                pest_presence: features.Pest_Presence ?? 0.0,
                rainfall: features.Rainfall ?? 0.0,
                temperature_history: features.temperature_history || [],
                humidity_history: features.humidity_history || [],
                moisture_history: features.moisture_history || []
            };

            const response = await fetch(`${mlUrl}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(10000)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`ML API error: ${response.status} ${errorText}`);
            }
            
            return await response.json();
        } catch (error) {
            throw new Error(`API fetch error: ${error.message}`);
        }
    }

    /**
     * Prepare features for SmartBin ML model
     */
    prepareFeatures(environmentalData, batch) {
        // IoT Spec: SmartBin model expects these exact features (VOC-first)
        // Inputs: T_core, RH_core, Dew_Point, VOC_index, VOC_relative, VOC_rate,
        // Grain_Moisture, Airflow/fan telemetry, Rainfall, derived trends/deltas

        // --- Scenario 15: Compute EMA-based delta_temp and delta_rh ---
        // Use last 5 readings to compute EMA (alpha=0.4) and calculate delta
        const _computeEMADelta = (history) => {
            if (!history || history.length < 2) return null;
            const recent = history.slice(-5);
            const alpha = 0.4;
            let ema = recent[0];
            for (let i = 1; i < recent.length; i++) {
                ema = alpha * recent[i] + (1 - alpha) * ema;
            }
            return Number((ema - recent[0]).toFixed(3));
        };

        const computedDeltaTemp = environmentalData.delta_temp ??
            _computeEMADelta(environmentalData.temperature_history);
        const computedDeltaRh = environmentalData.delta_rh ??
            _computeEMADelta(environmentalData.humidity_history);

        return {
            Temperature: environmentalData.temperature ?? null, // T_core
            Humidity: environmentalData.humidity ?? null, // RH_core
            Storage_Days: this.calculateStorageDuration(batch) ?? null,
            Grain_Type: this.encodeGrainType(batch.grain_type), // Rice=1, Wheat=2
            // FIX #2: Send lowercase grain_type string so Python selects the correct grain model
            grain_type: (batch.grain_type || 'rice').toLowerCase(),
            Airflow: environmentalData.airflow ?? null, // Fan_Speed_Factor × Fan_Duty_Cycle (0.0-1.0)
            Dew_Point: this.calculateDewPoint(environmentalData.temperature, environmentalData.humidity) ?? null,
            Ambient_Light: environmentalData.light ?? null, // Optional BH1750
            Pest_Presence: environmentalData.pest_presence ?? environmentalData.pest_presence_score ?? null, // Derived from VOC patterns
            Grain_Moisture: batch.moisture_content ?? environmentalData.moisture ?? null, // Capacitive probe (0-10%=dry, 13-14%=risk, >=15%=spoilage)
            Rainfall: environmentalData.rainfall ?? environmentalData.precipitation ?? null, // OpenWeather API
            // VOC-first features (IoT spec)
            VOC_index: environmentalData.voc ?? environmentalData.voc_index ?? null,
            VOC_relative: environmentalData.voc_relative ?? environmentalData.voc_relative_5min ?? null,
            VOC_rate_5min: environmentalData.voc_rate_5min ?? null,
            VOC_rate_30min: environmentalData.voc_rate_30min ?? null,
            
            // Additional features for fallback/context
            co2: environmentalData.co2 ?? null, // Optional CCS811
            pressure: environmentalData.pressure ?? null, // BME680
            ph: environmentalData.ph ?? null,
            
            // Grain-specific features
            initial_quality: batch.quality_score ?? 85,
            
            // Temporal features (IoT spec: rolling windows)
            hour_of_day: new Date().getHours(),
            day_of_year: Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)),
            season: this.getSeason(),
            
            // Historical features (IoT spec: rolling 5m/30m/6h + deltas)
            // Scenario 15: EMA-computed delta instead of raw delta which may be null
            temperature_trend: this.calculateTrend(environmentalData.temperature_history),
            humidity_trend: this.calculateTrend(environmentalData.humidity_history),
            delta_temp: computedDeltaTemp, // ΔT_core (EMA-based)
            delta_rh: computedDeltaRh, // ΔRH_core (EMA-based)
            moisture_trend_6h: environmentalData.moisture_trend_6h ?? null,
            
            // Data quality
            data_quality: this.assessDataQuality(environmentalData),
            
            // Seasonal risk
            seasonal_risk: this.calculateSeasonalRisk(),
            
            // Fan telemetry (IoT spec)
            fan_state: environmentalData.fan_state ?? null, // 0=OFF, 1=ON
            fan_duty: environmentalData.fan_duty_cycle ?? null, // 0-100%
            fan_rpm: environmentalData.fan_rpm ?? null
        };
    }


    /**
     * Generate advisories for spoilage prediction
     */
    async generateAdvisories(spoilagePrediction) {
        try {
            const advisories = spoilagePrediction.generateAdvisories();
            
            for (const advisoryData of advisories) {
                const advisory = new Advisory({
                    advisory_id: advisoryData.advisory_id,
                    admin_id: spoilagePrediction.admin_id,
                    silo_id: spoilagePrediction.silo_id,
                    prediction_id: spoilagePrediction._id,
                    title: this.generateAdvisoryTitle(advisoryData),
                    description: advisoryData.description,
                    advisory_type: this.mapActionToAdvisoryType(advisoryData.action_type),
                    priority: advisoryData.priority,
                    severity: this.mapPriorityToSeverity(advisoryData.priority),
                    action_type: advisoryData.action_type,
                    implementation_details: this.generateImplementationDetails(advisoryData),
                    effectiveness_score: advisoryData.effectiveness_score,
                    impact_assessment: this.calculateImpactAssessment(advisoryData),
                    urgency_level: this.calculateUrgencyLevel(advisoryData),
                    recommended_timing: this.calculateRecommendedTiming(advisoryData),
                    ai_context: {
                        model_version: spoilagePrediction.model_info.model_version,
                        confidence_score: spoilagePrediction.confidence_score,
                        feature_importance: spoilagePrediction.feature_importance,
                        prediction_accuracy: spoilagePrediction.model_info.accuracy_score
                    },
                    environmental_context: {
                        temperature: spoilagePrediction.environmental_factors.temperature.current,
                        humidity: spoilagePrediction.environmental_factors.humidity.current,
                        air_quality: spoilagePrediction.environmental_factors.co2.current
                    },
                    created_by: spoilagePrediction.created_by
                });

                await advisory.save();
            }

            this.emit('advisoriesGenerated', {
                predictionId: spoilagePrediction.prediction_id,
                advisoryCount: advisories.length
            });

        } catch (error) {
            console.error('Generate advisories error:', error);
            throw error;
        }
    }

    /**
     * Create spoilage alert
     */
    async createSpoilageAlert(spoilagePrediction) {
        try {
            const alert = new GrainAlert({
                alert_id: uuidv4(),
                admin_id: spoilagePrediction.admin_id,
                silo_id: spoilagePrediction.silo_id,
                batch_id: spoilagePrediction.batch_id,
                title: `CRITICAL SPOILAGE RISK: ${spoilagePrediction.prediction_type.toUpperCase()}`,
                message: `High risk of ${spoilagePrediction.prediction_type} spoilage detected. Risk score: ${spoilagePrediction.risk_score}%. Immediate action required.`,
                alert_type: 'in-app',
                priority: 'critical',
                source: 'ai',
                sensor_type: 'spoilage_prediction',
                trigger_conditions: {
                    prediction_id: spoilagePrediction.prediction_id,
                    risk_score: spoilagePrediction.risk_score,
                    risk_level: spoilagePrediction.risk_level,
                    predicted_date: spoilagePrediction.predicted_date
                }
            });

            await alert.save();
            this.emit('spoilageAlertCreated', alert);

        } catch (error) {
            console.error('Create spoilage alert error:', error);
        }
    }

    // Helper methods
    calculateRiskLevel(riskScore, options = {}) {
        // Use centralized risk threshold configuration
        return getRiskLevel(riskScore, options);
    }

    analyzeEnvironmentalFactors(environmentalData) {
        return {
            temperature: {
                current: environmentalData.temperature,
                trend: this.calculateTrend(environmentalData.temperature_history),
                impact_score: this.calculateTemperatureImpact(environmentalData.temperature)
            },
            humidity: {
                current: environmentalData.humidity,
                trend: this.calculateTrend(environmentalData.humidity_history),
                impact_score: this.calculateHumidityImpact(environmentalData.humidity)
            },
            co2: {
                current: environmentalData.co2,
                trend: this.calculateTrend(environmentalData.co2_history),
                impact_score: this.calculateCO2Impact(environmentalData.co2)
            },
            moisture: {
                current: environmentalData.moisture,
                trend: this.calculateTrend(environmentalData.moisture_history),
                impact_score: this.calculateMoistureImpact(environmentalData.moisture)
            },
            air_quality: {
                current: this.calculateAirQualityIndex(environmentalData),
                trend: 'stable',
                impact_score: this.calculateAirQualityImpact(environmentalData)
            }
        };
    }

    analyzeGrainFactors(batch, environmentalData) {
        return {
            grain_type: batch.grain_type,
            storage_duration_days: this.calculateStorageDuration(batch),
            initial_quality_score: batch.quality_score || 85,
            moisture_content: batch.moisture_content || 12,
            temperature_history: environmentalData.temperature_history || [],
            humidity_history: environmentalData.humidity_history || []
        };
    }

    calculateTimeToSpoilage(riskScore) {
        if (riskScore >= 90) return 24; // hours
        if (riskScore >= 70) return 72; // hours
        if (riskScore >= 40) return 168; // hours (1 week)
        return 720; // hours (1 month)
    }

    getSeverityIndicators(riskScore) {
        const indicators = [];
        if (riskScore >= 90) indicators.push('immediate_action_required');
        if (riskScore >= 70) indicators.push('high_risk_conditions');
        if (riskScore >= 40) indicators.push('monitoring_required');
        return indicators;
    }

    encodeGrainType(grainType) {
        const encoding = {
            'wheat': 1,
            'rice': 2,
            'corn': 3,
            'barley': 4,
            'oats': 5,
            'sorghum': 6
        };
        return encoding[grainType?.toLowerCase()] || 0;
    }

    calculateStorageDuration(batch) {
        const refDate = new Date(batch.intake_date || batch.created_at);
        // If batch is dispatched, stop counting at dispatch date
        const endDate = (batch.status === 'dispatched' && batch.actual_dispatch_date)
            ? new Date(batch.actual_dispatch_date)
            : new Date();
        return Math.max(0, Math.floor((endDate - refDate) / (1000 * 60 * 60 * 24)));
    }

    getSeason() {
        const month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'autumn';
        return 'winter';
    }

    calculateTrend(history) {
        if (!history || history.length < 2) return 'stable';
        const recent = history.slice(-5);
        const older = history.slice(-10, -5);
        const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
        const change = (recentAvg - olderAvg) / olderAvg;
        if (change > 0.1) return 'increasing';
        if (change < -0.1) return 'decreasing';
        return 'stable';
    }

    assessDataQuality(environmentalData) {
        let quality = 1.0;
        const requiredFields = ['temperature', 'humidity', 'co2', 'moisture'];
        const missingFields = requiredFields.filter(field => !environmentalData[field]);
        quality -= missingFields.length * 0.2;
        return Math.max(0, quality);
    }

    calculateSeasonalRisk() {
        const season = this.getSeason();
        const seasonalRisks = {
            'summer': 0.8,
            'autumn': 0.6,
            'spring': 0.4,
            'winter': 0.2
        };
        return seasonalRisks[season] || 0.5;
    }

    /**
     * Calculate dew point from temperature and humidity
     */
    calculateDewPoint(temperature, humidity) {
        if (!temperature || !humidity) return 15;
        
        // Magnus formula for dew point calculation
        const a = 17.27;
        const b = 237.7;
        const alpha = ((a * temperature) / (b + temperature)) + Math.log(humidity / 100);
        const dewPoint = (b * alpha) / (a - alpha);
        
        return Math.round(dewPoint * 100) / 100;
    }

    generateAdvisoryTitle(advisoryData) {
        const titles = {
            'temperature_control': 'Temperature Control Required',
            'humidity_control': 'Humidity Management Needed',
            'air_quality_improvement': 'Air Quality Enhancement',
            'inspection': 'Storage Area Inspection',
            'emergency_response': 'Emergency Spoilage Prevention'
        };
        return titles[advisoryData.action_type] || 'Storage Management Advisory';
    }

    mapActionToAdvisoryType(actionType) {
        const mapping = {
            'temperature_control': 'preventive',
            'humidity_control': 'preventive',
            'air_quality_improvement': 'preventive',
            'inspection': 'monitoring',
            'emergency_response': 'emergency'
        };
        return mapping[actionType] || 'preventive';
    }

    mapPriorityToSeverity(priority) {
        const mapping = {
            'low': 'low',
            'medium': 'medium',
            'high': 'high',
            'critical': 'critical'
        };
        return mapping[priority] || 'medium';
    }

    generateImplementationDetails(advisoryData) {
        const details = {
            steps: [
                {
                    step_number: 1,
                    description: `Implement ${advisoryData.action_type.replace('_', ' ')} measures`,
                    estimated_time: advisoryData.implementation_time,
                    required_resources: ['staff', 'equipment'],
                    safety_considerations: ['follow_safety_protocols']
                }
            ],
            estimated_duration: advisoryData.implementation_time,
            required_skills: ['storage_management'],
            required_equipment: ['monitoring_equipment'],
            safety_requirements: ['safety_gear']
        };
        return details;
    }

    calculateImpactAssessment(advisoryData) {
        return {
            spoilage_prevention: advisoryData.effectiveness_score,
            cost_savings: advisoryData.cost_estimate * 10,
            risk_reduction: advisoryData.effectiveness_score * 0.8,
            implementation_cost: advisoryData.cost_estimate,
            maintenance_cost: advisoryData.cost_estimate * 0.1
        };
    }

    calculateUrgencyLevel(advisoryData) {
        if (advisoryData.priority === 'critical') return 'immediate';
        if (advisoryData.priority === 'high') return 'urgent';
        if (advisoryData.priority === 'medium') return 'soon';
        return 'scheduled';
    }

    calculateRecommendedTiming(advisoryData) {
        const now = new Date();
        const urgency = this.calculateUrgencyLevel(advisoryData);
        let startTime, completionDeadline;

        switch (urgency) {
            case 'immediate':
                startTime = now;
                completionDeadline = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
                break;
            case 'urgent':
                startTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
                completionDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours
                break;
            case 'soon':
                startTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
                completionDeadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
                break;
            default:
                startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
                completionDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
        }

        return {
            start_time: startTime,
            completion_deadline: completionDeadline,
            optimal_conditions: ['normal_operating_hours']
        };
    }

    // Impact calculation methods
    calculateTemperatureImpact(temperature) {
        if (temperature > 35) return 0.9;
        if (temperature > 30) return 0.7;
        if (temperature > 25) return 0.4;
        if (temperature < 5) return 0.8;
        if (temperature < 10) return 0.5;
        return 0.1;
    }

    calculateHumidityImpact(humidity) {
        if (humidity > 85) return 0.9;
        if (humidity > 75) return 0.7;
        if (humidity > 65) return 0.4;
        if (humidity < 30) return 0.6;
        return 0.1;
    }

    calculateCO2Impact(co2) {
        if (co2 > 1500) return 0.8;
        if (co2 > 1000) return 0.6;
        if (co2 > 800) return 0.4;
        return 0.1;
    }

    calculateMoistureImpact(moisture) {
        if (moisture > 18) return 0.9;
        if (moisture > 15) return 0.7;
        if (moisture > 12) return 0.4;
        return 0.1;
    }

    calculateAirQualityIndex(environmentalData) {
        const co2 = environmentalData.co2 || 400;
        const voc = environmentalData.voc || 100;
        const aqi = (co2 / 1000) * 50 + (voc / 500) * 50;
        return Math.min(500, aqi);
    }

    calculateAirQualityImpact(environmentalData) {
        const aqi = this.calculateAirQualityIndex(environmentalData);
        if (aqi > 200) return 0.8;
        if (aqi > 150) return 0.6;
        if (aqi > 100) return 0.4;
        return 0.1;
    }

    /**
     * Start prediction processor
     * NOTE: Queue-based processing was replaced with direct async calls.
     * This method is kept as a no-op stub for backward compatibility.
     */
    startPredictionProcessor() {
        // No-op: predictions are now processed synchronously via processPrediction().
        // The queue (predictionQueue) was removed — do not reference it.
        console.log('[ML] Prediction processor: direct mode (no queue)');
    }

    /**
     * Retrain model with new data
     */
    async retrainModel(options) {
        try {
            const { trainingData, modelVersion, userId } = options;
            
            console.log(`Starting model retraining with ${trainingData.length} samples...`);
            
            // Prepare training data for Python script
            const trainingDataPath = path.join(__dirname, '../ml/training_data.json');
            await fs.writeFile(trainingDataPath, JSON.stringify(trainingData, null, 2));
            
            // Run ensemble training script (ensemble_train.py is the active trainer)
            const grainType = options.grainType || 'rice';
            const python = spawn('python', [
                path.join(__dirname, '../ml/ensemble_train.py'),
                grainType
            ]);
            
            let output = '';
            let error = '';
            
            python.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            python.stderr.on('data', (data) => {
                error += data.toString();
            });
            
            return new Promise((resolve, reject) => {
                python.on('close', (code) => {
                    if (code !== 0) {
                        console.error('Python training error:', error);
                        reject(new Error(`Training failed: ${error}`));
                    } else {
                        console.log('Model retraining completed successfully');
                        this.isModelLoaded = true;
                        this.emit('modelRetrained', {
                            version: modelVersion,
                            samples: trainingData.length,
                            accuracy: this.extractAccuracy(output)
                        });
                        resolve({
                            success: true,
                            version: modelVersion,
                            samples: trainingData.length,
                            accuracy: this.extractAccuracy(output),
                            output: output
                        });
                    }
                });
            });
            
        } catch (error) {
            console.error('Retrain model error:', error);
            this.emit('retrainError', error);
            throw error;
        }
    }
    
    /**
     * Upload model file
     */
    async uploadModel(options) {
        try {
            const { modelPath, modelVersion, userId } = options;
            
            // Copy uploaded model to our model path
            if (modelPath && modelPath !== this.modelPath) {
                await fs.copyFile(modelPath, this.modelPath);
            }
            
            // Reload model
            await this.initializeModel();
            
            this.emit('modelUploaded', {
                version: modelVersion,
                path: this.modelPath
            });
            
            return {
                success: true,
                version: modelVersion,
                path: this.modelPath,
                loaded: this.isModelLoaded
            };
            
        } catch (error) {
            console.error('Upload model error:', error);
            throw error;
        }
    }
    
    /**
     * Extract accuracy from training output
     */
    extractAccuracy(output) {
        const accuracyMatch = output.match(/accuracy[:\s]+([\d.]+)/i);
        return accuracyMatch ? parseFloat(accuracyMatch[1]) : 0.85;
    }
    
    /**
     * Get service statistics
     */
    getStats() {
        return {
            isModelLoaded: this.isModelLoaded,
            // Queue was removed — direct async processing is used instead
            queueLength: 0,
            isProcessing: false,
            controlMode: this.controlMode,
            modelPath: this.modelPath,
            lastRetrained: this.lastRetrained || null
        };
    }
}

module.exports = new AISpoilageService();
