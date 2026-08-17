# GrainHero — Complete AI, Machine Learning, IoT & Actuator Architecture

**Master Architecture & Data Flow Reference Manual**  
*Designed for complete system understanding, technical presentations, and flowchart diagram generation.*

---

# Table of Contents
1. [Executive Summary & High-Level Philosophy](#1-executive-summary--high-level-philosophy)
2. [Layer 1: Physical Hardware & Sensor Data Acquisition](#2-layer-1-physical-hardware--sensor-data-acquisition)
3. [Layer 2: Telemetry Ingestion & Cloud Database (Supabase)](#3-layer-2-telemetry-ingestion--cloud-database-supabase)
4. [Layer 3: Machine Learning Inference & Automated Retraining Engine](#4-layer-3-machine-learning-inference--automated-retraining-engine)
5. [Layer 4: Custom Industrial RAG Pipeline & Academic Harvester](#5-layer-4-custom-industrial-rag-pipeline--academic-harvester)
6. [Layer 5: Agentic AI Assistant & Multi-Tool Fusion](#6-layer-5-agentic-ai-assistant--multi-tool-fusion)
7. [Layer 6: Actuator Closed-Loop Control System (Fans & Aerators)](#7-layer-6-actuator-closed-loop-control-system-fans--aerators)
8. [End-to-End Step-by-Step Flowchart Guide](#8-end-to-end-step-by-step-flowchart-guide)

---

# 1. Executive Summary & High-Level Philosophy

GrainHero is an **industrial-grade IoT and AI-driven post-harvest grain storage platform**. Its primary objective is to prevent grain spoilage, hotspot formation, pest infestation, and mycotoxin contamination in farm silos, silo-bags, and storage facilities.

The platform combines four distinct technological domains into a unified closed loop:
1. **IoT Hardware Layer:** Wireless ESP32 microcontrollers reading multi-sensor telemetry inside grain bins.
2. **Machine Learning Layer:** Ensemble models predicting spoilage risk, optimal aeration windows, and SHAP explainability.
3. **Agentic RAG Layer:** AI retrieving operational manuals and academic research to provide zero-hallucination guidance.
4. **Actuator Control Layer:** Automated or manual actuation of fans, vents, and aerators via MQTT.

```
+-----------------------------------------------------------------------------------+
|                               PHYSICAL GRAIN SILO                                 |
|  [BME680 / DHT / CO2 / LDR Sensors]  <=====>  [Aeration Fan / PWM Servo Relay]   |
+----------------------------------------|------------------------------------------+
                                         | (MQTT / HTTP)
                                         v
+-----------------------------------------------------------------------------------+
|                             SUPABASE CLOUD PLATFORM                               |
|  - PostgreSQL Database (sensor_readings, live_sensor_readings, actuator_commands) |
|  - pgvector Extension (rag_knowledge_base with VECTOR(768) HNSW Index)            |
|  - Database Triggers (trg_sync_sensor_to_silo, trg_auto_grain_alerts)             |
+--------------------|--------------------------------------|-----------------------+
                     |                                      |
                     v                                      v
+----------------------------------------+ +----------------------------------------+
|      MACHINE LEARNING ENGINE           | |        INDUSTRIAL RAG & AGENT          |
|  - FastAPI Server (ml-deploy/app.py)    | |  - Academic Harvester (Scholar/arXiv) |
|  - Dynamic Windowing (window_utils)    | |  - Hybrid Search (Dense + Lexical)   |
|  - SHAP Feature Risk Breakdown        | |  - RRF Re-ranking (k=60)              |
|  - Hot-Swapping & Fast Retraining      | |  - Multi-LLM Failover Engine         |
+----------------------------------------+ +----------------------------------------+
```

---

# 2. Layer 1: Physical Hardware & Sensor Data Acquisition

### 2.1 Hardware Component Overview
* **Microcontroller:** ESP32 (Wi-Fi + Bluetooth dual-core microcontroller).
* **Firmware:** `docs/firmware/grainhero_main_final.ino`.
* **Primary Sensors:**
  * **BME680:** Ambient Temperature (°C), Relative Humidity (%), Gas Resistance / Air Quality (kΩ), Pressure (hPa).
  * **DHT22 / DHT11:** Temperature (°C) and Grain Microclimate Humidity (%).
  * **CO2 Sensor (NDIR):** Carbon Dioxide concentration in ppm (early indicator of mold respiration).
  * **LDR (Light Dependent Resistor):** Detects light exposure (tampering, unsealed hatches, or silo lid removal).
  * **Vibration Sensor:** Detects mechanical movements or insect feeding activity inside stored grain.
  * **SD Card Module:** Local offline backup logging (`FS.h`, `SD.h`) when Wi-Fi connection drops.

### 2.2 Data Processing & Transmission Loop
1. **Sampling:** ESP32 wakes up every $N$ seconds (e.g., 30s or 60s) and polls all connected I2C/SPI/digital sensors.
2. **Payload Formatting:** Formats telemetry into an JSON payload:
   ```json
   {
     "device_id": "SILO_NODE_01",
     "grain_type": "Wheat",
     "temperature": 34.2,
     "humidity": 72.5,
     "co2": 850,
     "grain_moisture": 14.8,
     "ambient_light": 12,
     "timestamp": "2026-08-05T11:30:00Z"
   }
   ```
3. **Transmission:** Publishes payload over MQTT topic `grainhero/telemetry/SILO_NODE_01` to Mosquitto MQTT Broker or POSTs directly to Supabase Edge Function (`/functions/v1/mqtt-bridge`).
4. **Local Fallback:** If internet is unavailable, writes the JSON line to `SD_CARD/telemetry.csv` for sync upon reconnection.

---

# 3. Layer 2: Telemetry Ingestion & Cloud Database (Supabase)

### 3.1 Database Tables & Structure
* **`sensor_readings`:** Primary historical table storing raw telemetry records.
* **`live_sensor_readings`:** Fast-lookup table containing the latest single reading per grain silo for instant dashboard rendering and fast ML feature assembly.
* **`actuator_commands`:** Queue table holding fan/valve activation commands waiting to be dispatched to hardware.
* **`rag_knowledge_base`:** Vector table containing chunked PDF manuals, metadata, and 768-dimensional embeddings (`VECTOR(768)`).

### 3.2 Automated Database Triggers & Business Logic
* **`trg_sync_sensor_to_silo`:** `AFTER INSERT ON sensor_readings` → Updates parent `silos.current_conditions` JSONB column instantly.
* **`trg_auto_grain_alerts`:** `AFTER INSERT ON sensor_readings` → Evaluates safety thresholds (e.g., Temperature > 35°C OR Moisture > 15%). If violated, automatically creates a high-priority row in `grain_alerts`.
* **`trg_calculate_derived_metrics`:** `BEFORE INSERT ON sensor_readings` → Calculates Dew Point using the Magnus-Tetens formula:
  $$\gamma(T, RH) = \frac{a \cdot T}{b + T} + \ln\left(\frac{RH}{100}\right), \quad T_{dew} = \frac{b \cdot \gamma(T, RH)}{a - \gamma(T, RH)}$$

---

# 4. Layer 3: Machine Learning Inference & Automated Retraining Engine

Located in `ml-deploy/`, the machine learning subsystem provides predictive risk scoring and explainability.

### 4.1 FastAPI Server Endpoint (`ml-deploy/app.py`)
* **Endpoint:** `POST /predict`
* **Input Features:** Temperature, Humidity, Storage_Days, Grain_Moisture, Airflow, Dew_Point, Ambient_Light, Pest_Presence, Rainfall, and `window_size`.
* **Preprocessing:** `window_utils.py` computes multi-step temporal feature aggregations over sliding windows (e.g., 5-step rolling average, standard deviation of temperature change).

### 4.2 Model Ensemble & Risk Classification
* **Algorithms:** Random Forest Classifier + XGBoost Classifier Ensemble.
* **Outputs:**
  1. **Prediction Class:** `0: Low Risk`, `1: Medium Risk (Warning)`, `2: Critical Risk (Active Spoilage / Hotspot)`.
  2. **Risk Score:** Probability percentage (0.0 to 1.0).
  3. **SHAP Explainability (`_compute_shap`):** Calculates TreeSHAP contribution values for each feature (e.g., *"Temperature contributed +42% to Critical Risk, Moisture contributed +31%"*).

### 4.3 Automated Re-training Loop & Hot-Swapping
* **`retrain_watcher.py`:** Standalone background daemon polling `live_sensor_readings`. When new row counts cross `FAST_RETRAIN_THRESHOLD`, triggers retraining.
* **`fast_retrain.py`:** Retrains model on recent grain telemetry, evaluating the optimal `window_size` (1..30 steps).
* **`hot_swap.py`:** Zero-downtime model loader. Re-loads new `.pkl` binary model artifacts into memory inside FastAPI without restarting the HTTP server.
* **`model_registry.py`:** Tracks versioning, F1 scores, accuracy metrics, and optimal window sizes per grain type.

---

# 5. Layer 4: Custom Industrial RAG Pipeline & Academic Harvester

Located in `ml-deploy/rag/`, this custom RAG system provides grounded domain knowledge.

```
  ACADEMIC SOURCES               DATA INGESTION PIPELINE               VECTOR DATABASE
+------------------+           +-------------------------+           +------------------+
| Semantic Scholar |           | 1. Text Parsing (fitz)  |           | Supabase         |
| CORE API         | ========> | 2. 512-Token Chunking   | ========> | pgvector         |
| arXiv API        |           | 3. Gemini Embedding-001 |           | VECTOR(768)      |
+------------------+           +-------------------------+           +------------------+
```

### 5.1 Multi-Source Academic Paper Harvester (`rag_harvester.py`)
* Automatically queries **Semantic Scholar**, **CORE**, and **arXiv** APIs for research papers on grain storage, aeration, mycotoxins, and pest management.
* Deduplicates papers by URL/DOI and downloads open-access PDFs into `ml-deploy/rag/doc/`.

### 5.2 Document Ingestion Engine (`rag_ingest.py`)
1. **Extraction:** Parses raw text from PDFs using `PyMuPDF (fitz)`.
2. **Semantic Chunking:** Splits text into overlapping blocks of **512 tokens** with **64-token overlap** to preserve sentence context across boundaries.
3. **Metadata Enrichemnt:** Tags each chunk with document title, category, page number, and tenant ID.
4. **Vectorization:** Calls Google Gemini `gemini-embedding-001` with `outputDimensionality: 768`.
5. **Storage:** Inserts raw text, metadata, and vectors into Supabase table `rag_knowledge_base`.

### 5.3 Hybrid Search & Re-Ranking Engine (`rag_retrieval.py`)
* Executes two parallel retrieval queries:
  1. **Dense Semantic Search:** Calls Supabase RPC `match_documents` using cosine distance (`<=>`).
  2. **Sparse Lexical Search:** Calls Supabase RPC `keyword_search` using PostgreSQL full-text search (`to_tsvector`/`plainto_tsquery`).
* **Reciprocal Rank Fusion (RRF):** Merges both candidate lists using RRF scoring ($k=60$):
  $$RRF\_Score(d) = \frac{1}{60 + \text{rank}_{dense}(d)} + \frac{1}{60 + \text{rank}_{sparse}(d)}$$
* **Term-Density Re-ranking:** Re-scores top candidates by combining RRF score with keyword match frequency to ensure exact engineering terms rise to the top.

---

# 6. Layer 5: Agentic AI Assistant & Multi-Tool Fusion

Located in `ml-deploy/rag/rag_agent.py`, the AI Agent acts as the central brain.

```
                          +-------------------------------+
                          |     User Query / Question     |
                          +---------------+---------------+
                                          |
                                          v
                          +---------------+---------------+
                          |   Intent Classifier Router    |
                          +-------+---------------+-------+
                                  |               |
              +-------------------+               +-------------------+
              |                                                       |
              v                                                       v
+-------------------------------+                       +-------------------------------+
|  Tool: query_knowledge_base   |                       |    Tool: get_live_telemetry   |
| (Hybrid Search on PDF Manuals)|                       | (Real-time IoT DB Read)       |
+---------------+---------------+                       +---------------+---------------+
                |                                                       |
                +-----------------------+-------------------------------+
                                        |
                                        v
                        +---------------+---------------+
                        |    Context Fusion Pipeline    |
                        +---------------+---------------+
                                        |
                                        v
                        +---------------+---------------+
                        |  Zero-Hallucination Guardrail |
                        |        System Prompt          |
                        +---------------+---------------+
                                        |
                                        v
                        +---------------+---------------+
                        |  Gemini 1.5 Flash (Primary)   |
                        |   [Failover Circuit Breaker]  |
                        +---------------+---------------+
                                        |
                                        v
                        +---------------+---------------+
                        | Grounded Operational Answer   |
                        +-------------------------------+
```

### 6.1 Intent Router (`IntentClassifier`)
Classifies incoming questions to decide which external tools to trigger:
* **`query_knowledge_base`**: Executes hybrid vector retrieval when rules, manuals, or safety thresholds are needed.
* **`get_live_telemetry`**: Queries `live_sensor_readings` when current temperature, humidity, or moisture levels are requested.
* **`get_actuator_status`**: Queries `actuator_commands` when fan or valve states are needed.

### 6.2 Zero-Hallucination Guardrail System Prompt
Fuses retrieved manuals + live telemetry into a deterministic prompt:
> *"You are GrainHero AI. Answer ONLY using the CONTEXT provided below (manuals + live sensor data). If the context does not contain enough information, state 'I do not have sufficient data in the operational manuals or live sensors to answer this reliably.' NEVER invent parameters under any circumstances."*

### 6.3 Multi-LLM Inference with Failover Circuit Breaker
* **Primary:** Gemini Flash via REST API. Includes automatic backoff on HTTP 429 rate limits.
* **Failover:** If primary API times out or fails (500/503), the engine automatically falls back to secondary models (`gemini-2.5-flash` / `gemini-1.5-flash`) within milliseconds so the user never sees an error.

---

# 7. Layer 6: Actuator Closed-Loop Control System (Fans & Aerators)

The ultimate goal of AI/ML diagnosis is physical intervention to save grain.

```
 [1. Sensor Telemetry]  ===>  [2. ML / RAG Diagnosis]  ===>  [3. Insert Command to DB]
         ^                                                               |
         |                                                               v
 [6. Temp Drops / Closed Loop] <=== [5. Relay / Servo ON] <=== [4. MQTT Dispatch]
```

### 7.1 Automated & Manual Trigger Pathways
1. **Automated ML/Rule Trigger:**
   * If ML risk score reaches `Critical` OR RAG Agent detects temperature > threshold:
   * System backend generates an actuation decision: `ACTION: TURN_ON_FAN`, `DURATION: 120min`.
2. **Manual Dashboard Trigger:**
   * Farm Manager clicks **"Activate Aeration Fan"** on the GrainHero web frontend (`src/lib/actuator-bridge.server.ts`).

### 7.2 Command Execution & MQTT Bridge
1. **Database Command Queue:** A new row is inserted into Supabase table `actuator_commands`:
   ```sql
   INSERT INTO actuator_commands (device_id, command, target_state, duration_minutes)
   VALUES ('SILO_NODE_01', 'FAN_ON', 'HIGH_SPEED', 120);
   ```
2. **MQTT Bridge Dispatch:** Supabase Realtime / Node.js backend bridge (`supabase/functions/mqtt-bridge/index.ts`) picks up the insert and publishes an MQTT message to:
   `grainhero/silo/SILO_NODE_01/control`
3. **Hardware Execution (ESP32):**
   * ESP32 firmware (`grainhero_main_final.ino`) listening on the MQTT topic receives the JSON payload.
   * Activates Digital Output Pin connected to the Relay / Transistor driver OR moves Servo Motor (`ESP32Servo.h`) to open ventilation dampers.
   * Turns ON the physical silo aeration fan.

### 7.3 Closed-Loop Verification
* Aeration fan runs, pushing fresh dry air through the grain bulk.
* Subsequent sensor readings reflect a steady decrease in temperature and humidity.
* ML model updates risk score from `Critical` back to `Low Risk`, automatically concluding the actuation cycle.

---

# 8. End-to-End Step-by-Step Flowchart Guide

Use this numbered reference to draw your flowcharts (e.g. in Mermaid, Visio, or Lucidchart):

### Flowchart A: Data Acquisition & Storage
* **Step A1:** ESP32 hardware polls BME680, DHT22, CO2, LDR, and Vibration sensors.
* **Step A2:** Firmware formats readings into JSON payload.
* **Step A3:** Transmits payload via MQTT to Mosquitto / Supabase Edge Function.
* **Step A4:** Supabase inserts row into `sensor_readings` table.
* **Step A5:** Database trigger `trg_calculate_derived_metrics` computes Dew Point.
* **Step A6:** Database trigger `trg_sync_sensor_to_silo` updates `silos.current_conditions`.

### Flowchart B: Machine Learning Risk Assessment
* **Step B1:** `sensor_readings` payload sent to FastAPI ML server (`ml-deploy/app.py`).
* **Step B2:** `window_utils.py` aggregates temporal window features (1..30 steps).
* **Step B3:** Random Forest + XGBoost ensemble computes Spoilage Risk Score.
* **Step B4:** `_compute_shap` calculates feature importance contributions.
* **Step B5:** Returns Risk Level (`Low`, `Medium`, `Critical`) to database & frontend.

### Flowchart C: RAG Ingestion & Hybrid Search
* **Step C1:** `rag_harvester.py` downloads research PDFs from Semantic Scholar, CORE, arXiv.
* **Step C2:** `rag_ingest.py` extracts text, creates 512-token chunks, and embeds via Gemini `gemini-embedding-001` (768 dims).
* **Step C3:** Vectors stored in Supabase `rag_knowledge_base` with HNSW index.
* **Step C4:** User submits query to `rag_retrieval.py`.
* **Step C5:** Executes parallel Dense Search (`match_documents`) + Lexical Search (`keyword_search`).
* **Step C6:** Merges and orders results using Reciprocal Rank Fusion (RRF) + Term Density Re-ranking.

### Flowchart D: Agentic AI & Actuator Control
* **Step D1:** User asks question (e.g., *"Is Silo 1 safe right now?"*).
* **Step D2:** `IntentClassifier` in `rag_agent.py` selects tools (`query_knowledge_base`, `get_live_telemetry`, `get_actuator_status`).
* **Step D3:** Tools execute and fetch manual excerpts + current live sensor readings.
* **Step D4:** Fuses data into Zero-Hallucination System Prompt.
* **Step D5:** Calls Gemini Flash with automatic failover fallback.
* **Step D6:** If action needed, inserts command row to `actuator_commands` table.
* **Step D7:** MQTT bridge publishes `FAN_ON` command to ESP32.
* **Step D8:** ESP32 triggers physical relay/servo, activating aeration fan and lowering silo temperature.
