# GrainHero — Complete Project Context & Technical Blueprint

This document serves as a comprehensive, single-file technical context reference for the GrainHero system. It includes the architecture, codebase file maps, data flow sequences, database schemas, API interfaces, firmware logic, AI/ML pipeline design, and outstanding technical challenges.

---

## 1. Project Overview & Features

GrainHero is an IoT-enabled smart grain storage monitoring and spoilage prediction system designed specifically for the agricultural and warehousing landscape in Pakistan. It helps farmers and warehouse managers preserve grains (Rice, Wheat, Maize, Sorghum, Barley) by predicting spoilage before it occurs, using machine learning models integrated with IoT sensors.

### Key System Capabilities:

1. **Multi-Sensor Ingestion:** Collects Temperature, Relative Humidity, CO2, Volatile Organic Compounds (VOCs), and Grain Moisture from physical silos.
2. **Machine Learning Spoilage Prediction:** A Soft Voting Ensemble (XGBoost + Random Forest + LightGBM) predicts risk levels (Safe, Risky, Spoiled), estimating a weighted time-to-spoilage (in hours).
3. **Automated Actuation (Closed-Loop):** Under the `ML_AUTO` control mode, prediction results are translated into MQTT control signals to dynamically adjust exhaust fans (Off / 80% / 100% speed) and status LEDs (Green/Yellow/Red) on the physical ESP32 device.
4. **Microclimate Profiling:** Uses specialized algorithms (e.g., Magnus formula for Dew Point) to evaluate condensation risks.
5. **Transparency & Audit Trail:** Records all user actions, predictions, and manual sensor overrides in dedicated database collections.
6. **Financial & Insurance Subsystem:** Connects grain batches to insurance policies, allowing automated claims triggered by validated spoilage events.

---

## 2. Global Codebase File Map

```
Grainhero/ (Root Workspace)
├── .agent/
├── FINAL_VERIFICATION_REPORT.md
├── FIREBASE_PUSH_NOTIFICATIONS_SETUP.md
├── GrainHero_Business_Plan.docx
├── MERGE_CHECKLIST.md
├── PUSH_NOTIFICATIONS_IMPLEMENTATION.md
├── PUSH_NOTIFICATIONS_QUICKSTART.md
├── PUSH_NOTIFICATIONS_SETUP.md
├── PUSH_NOTIFICATIONS_VERIFICATION.md
├── README_PUSH_NOTIFICATIONS.md
├── update-ip.ps1
│
├── grainhero_main_final/                     # ESP32 Firmware
│   └── grainhero_main_final.ino             # Main C++ source file for ESP32
│
├── SmartBin-RiceSpoilage-main/              # Legacy FastAPI ML Service
│   ├── app.py / main.py                     # FastAPI server wrapping XGBoost
│   ├── preprocessing.py                     # 4-feature scaling and splitting
│   ├── train_model.py                       # Single-model XGBoost training
│   ├── hyperparameter_tuning.py             # Optuna optimizer
│   ├── shap_explain.py                      # SHAP values analyzer
│   ├── smartbin_rice_storage_data_enhanced.csv  # 320-row original training dataset
│   └── smartbin_model.pkl                   # 4-feature legacy model binary
│
├── farmHomeBackend-main/                    # Node.js Express Backend
│   ├── server.js                            # Express & WebSocket startup script
│   ├── package.json                         # Node dependencies
│   ├── configs/                             # System configurations
│   │   ├── enum.js                          # ENUM mappings (Grains, Statuses, Roles)
│   │   └── risk-thresholds.js               # Risk score translation logic
│   ├── models/                              # Mongoose Database Schemas
│   │   ├── SensorReading.js                 # IoT readings (T, H, CO2, VOC, Moisture)
│   │   ├── SpoilagePrediction.js            # Prediction records & validation tracking
│   │   ├── GrainBatch.js                    # Grain details & spoilage events
│   │   └── Silo.js                          # Silo metadata & dimensions
│   ├── routes/                              # Express Route Handlers
│   │   ├── aiSpoilage.js                    # Core prediction & retrain router
│   │   ├── sensors.js                       # Sensor data retrieval & ingestion
│   │   └── iot.js                           # MQTT integration endpoints
│   ├── services/                            # Background logic & services
│   │   ├── aiSpoilageService.js             # Handles prediction queuing & MQTT triggers
│   │   ├── mlDataCollectionService.js       # 5-min Weather & Air Quality collector
│   │   ├── realTimePredictionService.js     # Batch prediction cron monitor
│   │   └── trainingDataService.js           # IoT exporter for retrains
│   │
│   └── ml/                                  # Current Python ML Pipeline
│       ├── ensemble_train.py                # Tuning & training (XGB + RF + LGBM)
│       ├── smartbin_predict.py              # 9-feature prediction runner
│       ├── generate_per_grain.py            # Generates synthetic data via FAO rules
│       ├── train_all_grains.py              # Script to train all 5 grains
│       ├── data_manager.py                  # Combines synthetic and real data
│       ├── model_performance.py             # Training tracker and metrics generator
│       ├── rice_spoilage_10k.csv            # Rice training data (13k rows)
│       ├── wheat_spoilage_10k.csv           # Wheat training data
│       ├── maize_spoilage_10k.csv           # Maize training data
│       ├── sorghum_spoilage_10k.csv         # Sorghum training data
│       ├── barley_spoilage_10k.csv          # Barley training data
│       ├── rice_ensemble_model.pkl          # Trained rice model
│       └── rice_model_metadata.json         # Training logs & parameters
│
└── farmHomeFrontend-main/                   # Next.js 14 Web Application
    ├── package.json
    ├── next.config.js
    └── app/                                 # App router files (pages/layouts)
```

---

## 3. High-Level System Architecture

GrainHero operates as a distributed system with sensor hardware, an MQTT broker, a centralized Node.js API server, and a Python execution layer:

```
[ ESP32 Hardware ] <---(MQTT)---> [ Mosquitto Broker ] <---(MQTT)---> [ Node.js Backend ]
  (Sensors/Actuators)                                                    |
                                                                         | (spawns child process)
                                                                         v
[ Next.js Web App ] <====(WS/REST)===============================> [ Python Pipeline ]
                                                                     (Runs Ensemble Models)
```

---

## 4. Key Database Schemas (Mongoose)

### 4.1 SensorReading.js

Stores physical measurements gathered from IoT sensors or weather collection services.

```javascript
const sensorReadingSchema = new mongoose.Schema({
  device_id: { type: mongoose.Schema.Types.Mixed, required: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  silo_id: { type: mongoose.Schema.Types.ObjectId, ref: "Silo" },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: "GrainBatch" },
  timestamp: { type: Date, required: true, default: Date.now },

  temperature: {
    value: Number,
    unit: { type: String, default: "celsius", enum: ["celsius", "fahrenheit", "kelvin"] },
  },
  humidity: {
    value: { type: Number, min: 0, max: 100 },
    unit: { type: String, default: "percent" },
  },
  co2: {
    value: { type: Number, min: 0 },
    unit: { type: String, default: "ppm" },
  },
  voc: {
    value: { type: Number, min: 0 },
    unit: { type: String, default: "ppb" },
    baseline_24h: Number,
    relative_5min: Number,
    relative_30min: Number,
    rate_5min: Number,
  },
  grain_moisture: {
    value: Number,
    unit: { type: String, default: "percent" },
  },
  environmental_context: {
    weather: {
      temperature: Number,
      humidity: Number,
      pressure: Number,
      wind_speed: Number,
      cloudiness: Number,
      precipitation: Number,
      weather_condition: String,
    },
    air_quality_index: Number,
    pmd_data: { pm25: Number, pm10: Number, ozone: Number },
  },
  quality_indicators: {
    is_valid: { type: Boolean, default: true },
    confidence_score: { type: Number, min: 0, max: 1 },
    anomaly_detected: { type: Boolean, default: false },
  },
  spoilage_label: { type: String, enum: ["safe", "at_risk", "spoiled"] },
});
```

### 4.2 SpoilagePrediction.js

Records predictions made by the ML pipeline and keeps track of validation audits.

```javascript
const spoilagePredictionSchema = new mongoose.Schema({
  prediction_id: { type: String, required: true, unique: true, default: () => uuidv4() },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  silo_id: { type: mongoose.Schema.Types.ObjectId, ref: "Silo", required: true },
  batch_id: { type: mongoose.Schema.Types.ObjectId, ref: "GrainBatch" },

  prediction_type: {
    type: String,
    enum: ["mold", "aflatoxin", "insect", "general_spoilage", "quality_degradation"],
    required: true,
  },
  risk_score: { type: Number, min: 0, max: 100, required: true },
  risk_level: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
  confidence_score: { type: Number, min: 0, max: 1, required: true },
  prediction_horizon: { type: Number, required: true, min: 1, max: 30 }, // in days
  predicted_date: { type: Date, required: true },

  environmental_factors: {
    temperature: { current: Number, trend: String, impact_score: Number },
    humidity: { current: Number, trend: String, impact_score: Number },
    co2: { current: Number, trend: String, impact_score: Number },
    moisture: { current: Number, trend: String, impact_score: Number },
    air_quality: { current: Number, trend: String, impact_score: Number },
  },
  grain_factors: {
    grain_type: String,
    storage_duration_days: Number,
    initial_quality_score: Number,
    moisture_content: Number,
    temperature_history: [Number],
    humidity_history: [Number],
  },
  model_info: {
    model_version: String,
    model_type: String,
    training_data_size: Number,
    last_trained: Date,
    accuracy_score: Number,
  },
  validation_status: {
    type: String,
    enum: ["pending", "validated", "false_positive", "false_negative", "expired"],
    default: "pending",
  },
  actual_outcome: {
    spoilage_occurred: Boolean,
    spoilage_type: String,
    spoilage_date: Date,
    severity_level: String,
    validation_notes: String,
  },
});
```

### 4.3 GrainBatch.js

Maintains grain information stored within individual silos, capturing ground-truth spoilage events.

```javascript
const grainBatchSchema = new mongoose.Schema({
  batch_id: { type: String, required: true, unique: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  silo_id: { type: mongoose.Schema.Types.ObjectId, ref: "Silo", required: true },
  grain_type: {
    type: String,
    enum: ["Wheat", "Rice", "Maize", "Corn", "Barley", "Sorghum"],
    required: true,
  },
  variety: String,
  grade: { type: String, enum: ["A", "B", "C", "Premium", "Standard"], default: "Standard" },
  quantity_kg: { type: Number, required: true },
  moisture_content: Number,
  status: {
    type: String,
    enum: ["stored", "dispatched", "sold", "damaged", "expired", "on_hold", "processing"],
    default: "stored",
  },
  spoilage_label: { type: String, enum: ["Safe", "Spoiled", "Risky"], default: "Safe" },
  risk_score: { type: Number, default: 0 },
  ai_prediction_confidence: Number,
  last_risk_assessment: Date,
  spoilage_events: [
    {
      event_id: String,
      event_type: {
        type: String,
        enum: ["mold", "pests", "moisture", "heat", "smell", "contamination", "other"],
      },
      severity: { type: String, enum: ["low", "medium", "high", "critical"] },
      description: String,
      estimated_loss_kg: Number,
      estimated_value_loss: Number,
      detected_date: { type: Date, default: Date.now },
      photos: [{ filename: String, original_name: String, path: String }],
    },
  ],
});
```

---

## 5. IoT & MQTT Communication Specifications

MQTT acts as the real-time bridge between physical devices and the Node.js server. The Mosquitto broker coordinates this telemetry.

### 5.1 Telemetry Ingestion (Device → Backend)

- **Topic:** `grainhero/sensors/{deviceId}/data`
- **JSON Payload Format:**

```json
{
  "device_id": "GH-ESP32-01",
  "temperature": 28.5,
  "humidity": 62.1,
  "co2": 520,
  "voc": 110,
  "gas_resistance": 125000,
  "grain_moisture": 13.8,
  "pressure": 1011.5,
  "pest_presence": 0,
  "timestamp": "2026-07-08T16:39:00Z"
}
```

### 5.2 Actuator Control Loop (Backend → Device)

Commands are published under `ML_AUTO` mode to steer ESP32 outputs.

- **Topic:** `grainhero/actuators/{deviceId}/control`
- **JSON Payload Format:**

```json
{
  "led2": true, // Green LED  (Safe)
  "led3": false, // Yellow LED (Risky)
  "led4": false, // Red LED    (Spoiled)
  "ai_fan": true, // Set ventilation state
  "ai_fan_speed": 80 // Fan power pct (0 / 80 / 100)
}
```

---

## 6. AI/ML Pipeline & Model Architecture

GrainHero uses a hybrid ML stack. High-accuracy predictions are handled via vertical ensemble algorithms, backed by deterministic rule-based algorithms.

### 6.1 Feature Vectors (9-Feature Ensemble Model)

The ensemble models (saved as `{grain}_ensemble_model.pkl`) expect a 9-feature array in this exact sequence:

1. `Temperature` (°C)
2. `Humidity` (%)
3. `Storage_Days` (integer count)
4. `Airflow` (m/s proxy derived from wind speed)
5. `Dew_Point` (°C calculated from T/H via Magnus formula)
6. `Ambient_Light` (lux proxy)
7. `Pest_Presence` (binary: 0 or 1)
8. `Grain_Moisture` (%)
9. `Rainfall` (mm)

### 6.2 Ensemble Architecture

The system builds a **Soft Voting Classifier** combining three independent models tuned via Optuna:

- **XGBoost Classifier:** Fast, robust to outliers, optimizes gradient boosting trees.
- **Random Forest Classifier:** High generalization capacity, reduces variance.
- **LightGBM Classifier:** Extremely fast training speed, handles leaf-wise growth.
- **Soft Voting Mechanism:** The final class is computed as:
  $$P(\text{Class}) = \frac{P_{\text{XGB}}(\text{Class}) + P_{\text{RF}}(\text{Class}) + P_{\text{LGBM}}(\text{Class})}{3}$$
  The prediction score is then mapped to a 0–100 risk score:
  $$\text{Risk Score} = P(\text{Risky}) \times 50 + P(\text{Spoiled}) \times 100$$

### 6.3 Rule-Based Failsafe Fallback

In [aiSpoilage.js](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/routes/aiSpoilage.js), if the Python process fails or a model binary is missing, `calculateSpoilageFromEnvironment(inputData)` operates as a fallback:

- **Temperature contribution:** Temp $> 35 \implies +25$ pts, $>30 \implies +18$ pts, $>28 \implies +12$ pts, $>25 \implies +6$ pts.
- **Humidity contribution:** Humidity $> 85 \implies +25$ pts, $>80 \implies +20$ pts, $>70 \implies +14$ pts, $>65 \implies +8$ pts.
- **Grain Moisture contribution:** Moisture $> 20 \implies +25$ pts, $>18 \implies +20$ pts, $>16 \implies +14$ pts, $>14 \implies +8$ pts.
- **Other weights:** Pest presence ($+10$), low airflow ($+8$), long storage ($+7$).
- **Threshold mapping:** Score $\ge 70 \implies$ Spoiled, $\ge 40 \implies$ Risky, else Safe.

---

## 7. ESP32 Firmware State Machine

The firmware ([grainhero_main_final.ino](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/grainhero_main_final/grainhero_main_final.ino)) runs a state machine to prevent motor stress and respond to human manual overrides.

### States:

- `STATE_IDLE_CLOSED`: Lid closed, ventilation fan turned off.
- `STATE_OPENING_LID`: Servo transitions from closed ($100^\circ$) to open ($170^\circ$).
- `STATE_LID_OPEN`: Lid fully open, waiting before fan activation.
- `STATE_FAN_RUNNING`: Ventilation fan activated (PWM speed based on risk level).
- `STATE_STOPPING_FAN`: Fan ramps down, waiting before lid closure.
- `STATE_CLOSING_LID`: Servo swings back to $100^\circ$.

### Override Logic:

If a physical button is pressed or a manual WebSocket command is received, the system enters `MANUAL` override mode. A `HUMAN_OVERRIDE_TIMEOUT` constant (defaulting to 10 minutes) automatically returns the system to `AUTO` mode, protecting the silo from human forgetfulness.

---

## 8. Outstanding Gaps & Issues (Onboarding Brief)

If you are debugging or extending this codebase, keep these unresolved problems in mind:

1. **Synthetic Bias:** All training files (e.g., `rice_spoilage_10k.csv`) were constructed synthetically using rules derived from the FAO literature in [generate_per_grain.py](file:///c:/Users/Nexgen/Downloads/FYP/Grainhero/farmHomeBackend-main/ml/generate_per_grain.py). Because the label is assigned by rules, the ensemble model achieves 98%+ test accuracy by simply reverse-engineering the script's math. The model needs to be exposed to real-world validation data to become robust.
2. **FastAPI Vector Mismatch:** The legacy FastAPI service (`SmartBin-RiceSpoilage-main`) expects only 4 features to run its prediction model, whereas the newer backend Python script (`smartbin_predict.py`) expects 9 features. They are out of sync.
3. **Static weather defaults:** During background 5-minute cron weather collection, critical features such as `Grain_Moisture` and `Pest_Presence` are hardcoded to `12.0` and `0` respectively, which limits training dataset quality.
4. **Validation Pipeline remains unused:** Predictions are permanently stored with `validation_status: "pending"`. A closed-loop routine needs to be implemented to update these statuses based on real `spoilage_events` reported by silo managers.
