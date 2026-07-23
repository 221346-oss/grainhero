#include "Adafruit_BME680.h"
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <FS.h>
#include <HTTPClient.h>   // Required for HTTP POST/GET requests
#include <PubSubClient.h> // MQTT ingestor
#include <SD.h>
#include <SPI.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <math.h>
#include <time.h> //RTC - REAL TIME CLOCK

#ifndef ENABLE_FIREBASE
#define ENABLE_FIREBASE false
#endif

float mapFloat(float x, float in_min, float in_max, float out_min,
               float out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

String getDateTimeString() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo))
    return "1970-01-01 00:00:00";

  char buf[20];
  strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buf);
}

#define MQTT_BROKER "192.168.100.229" // Replace with your broker
#define MQTT_PORT 1883
#define MQTT_USERNAME "" // if needed
#define MQTT_PASSWORD "" // if needed

Servo lidServo;

const int SERVO_CLOSED_ANGLE = 100; // resting closed
const int SERVO_OPEN_ANGLE = 170;   // resting open
int servoCurrentAngle = SERVO_CLOSED_ANGLE;
bool servoIsOpen = false;

bool servoInitialized = false;
bool servoEnabled = false;
unsigned long lastServoAction = 0;
const unsigned long SERVO_COOLDOWN = 1000; // 1 second (fast response)

// ================================
// SERVO CONTROL STATE
// ================================

const unsigned long LID_OPEN_DELAY_MS = 1500;
const unsigned long LID_CLOSE_DELAY_MS = 1500;

// Override expires after 10 minutes (you can change)
const unsigned long HUMAN_OVERRIDE_TIMEOUT = 10UL * 60UL * 1000UL;

unsigned long lastHumanCommandTime = 0;

// Track current lid state
bool lidIsOpen = false;

enum LidFanState {
  STATE_IDLE_CLOSED, // Lid closed, fan off
  STATE_OPENING_LID,
  STATE_LID_OPEN,
  STATE_FAN_RUNNING,
  STATE_STOPPING_FAN,
  STATE_CLOSING_LID
};

LidFanState currentState = STATE_IDLE_CLOSED;

// ---------- ACTUATOR TIMESTAMPS ----------
unsigned long lidLastOpenedAt = 0;
unsigned long fanLastStartedAt = 0;
unsigned long lastDecisionChangeAt = 0;
// ---------------------------------------

// ---------- HUMAN OVERRIDE CONFIG ----------
// 0 = no timeout (manual release only)
// set e.g. 30UL * 60UL * 1000UL for 30 min auto-release
// -------

// ---------- HUMAN OVERRIDE STATE ----------
bool humanOverrideActive = false;
bool humanRequestedFan = false;
unsigned long humanOverrideActivatedAt = 0;
// -----------------------------------------

// ================================
// SERVO CONTROL MODE
// ================================
enum ControlMode { AUTO, MANUAL };

ControlMode controlMode = AUTO;

#define SEALEVELPRESSURE_HPA (1013.25)

// Sensor pins
#define DHTPIN1 15    // DHT11 sensor 1
#define DHTPIN2 13    // DHT11 sensor 2
#define DHTTYPE DHT11 // DHT 11

#define LDR_PIN 35 // LDR sensor
// --- Soil Moisture Placeholder & SMA ---
#define SOIL_MOISTURE_PIN 34 // Replace with your actual soil analog pin
#define SOIL_DRY 3000        // Raw reading for dry (placeholder)
#define SOIL_WET 1500        // Raw reading for wet (placeholder)
#define N_READS 5            // Number of readings for moving average

int soilBuffer[N_READS]; // circular buffer for SMA
int soilIndex = 0;       // current index
// Output control pins
#define SERVO_PIN 27 // Servo control pin
#define PWM_PIN 26   // PWM control pin (GPIO 26 - was RELAY_PIN)
#define LED2_PIN 14  // LED 2 - Risky (yellow)
#define LED3_PIN 12  // LED 3 - Good (green)
#define LED4_PIN 25  // LED 4 - Spoiled (red)
#define FAN_PWM_PIN PWM_PIN

// PWM Configuration
ESP32PWM pwm;
int pwmFrequency = 1000;  // Default PWM frequency (1KHz)
float pwmDutyCycle = 0.0; // 0.0 to 1.0 (0% to 100%)
int pwmSpeed = 0;         // 0 to 100 (for Firebase)

// SD Card pins (SPI)
#define SD_CS 5
#define SD_MOSI 23
#define SD_MISO 19
#define SD_SCK 18

// LED Indicator
#define LED_PIN 2

// Servo object
// Servo myServo; // intentionally commented out

// Servo variables
bool lastServoState = false; // Track last servo state

const int LDR_DARK = 4095;
const int LDR_BRIGHT = 100;

// WiFi credentials
const char *WIFI_SSID = "Project1";
const char *WIFI_PASSWORD = "student123";

// Firebase configuration
const char *FIREBASE_HOST = "smart-silo-8ce12-default-rtdb.firebaseio.com";
const char *FIREBASE_AUTH = "9VmddGd8EjIYCfCwoI6Kl6RnSOEaCIDfC62gmDXg";

// Firebase REST API endpoints
const char *SENSOR_DATA_URL = "/sensor_data";
const char *CONTROL_URL = "/control";

unsigned long lastMQTTPublish = 0;
const unsigned long MQTT_PUBLISH_INTERVAL = 2000;
unsigned long lastSerialTelemetry = 0;
const unsigned long SERIAL_TELEMETRY_INTERVAL = 2000;

// ---------- ENVIRONMENT & ML PLACEHOLDERS ----------
bool isRaining = false;       // future weather API
float outsideHumidity = 50.0; // placeholder
const float MAX_SAFE_OUTSIDE_HUMIDITY = 80.0;

bool mlRequestedFan = false; // ML decision placeholder
int targetFanSpeed = 60;     // default fan speed

bool lastFanDecision = false; // debounce memory
// --------------------------------------------------

int lastPwmSent = -1;
bool lastServoSent = false;
// Fixed Device ID
#define FIXED_DEVICE_ID "004B12387760"
// --- GrainHero Patch: Dual-write to backend ---
bool DUAL_WRITE_TO_BACKEND = true; // enable later for demo
const char *BACKEND_BASE_URL = "http://192.168.100.229:5000/api/iot";

// Initialize sensors
Adafruit_BME680 bme;
DHT dht1(DHTPIN1, DHTTYPE);
DHT dht2(DHTPIN2, DHTTYPE);

// TVOC estimation
float baseline_gas = 0;
const int BASELINE_READINGS = 30;

// SD Card
bool sdCardAvailable = false;
File dataFile;
String csvFileName;

// WiFi client
WiFiClientSecure client;
bool wifiConnected = false;

// Firebase variables
unsigned long lastFirebaseUpload = 0;
unsigned long lastControlCheck = 0;
const unsigned long FIREBASE_UPLOAD_INTERVAL = 5000; // 5 seconds
const unsigned long CONTROL_CHECK_INTERVAL = 2000;   // 2 seconds

// Control state variables
bool servoState = false;  // Controls servo (open/close lid)
bool led2State = false;   // Controls LED 2 - Risky (yellow)
bool led3State = false;   // Controls LED 3 - Good (green)
bool led4State = false;   // Controls LED 4 - Spoiled (red)
bool alarmActive = false; // Kept for compatibility but unused

// ---------- ACTUATOR TIMING SAFETY ----------
const unsigned long MIN_LID_OPEN_TIME_MS = 3UL * 1000UL; // 3 seconds
const unsigned long MIN_FAN_RUN_TIME_MS = 3UL * 1000UL;  // 3 seconds
const unsigned long DECISION_DEBOUNCE_MS = 1UL * 1000UL; // 1 second
// ------------------------------------------

// ===== FUNCTION PROTOTYPES =====

// Core init
void initializePWM();
void initializeWiFi();
void initializeMQTT();
void initializeBME680();
void establishBaseline();
void setFixedDeviceID();
void displayMACAddress();

// Firebase (kept for compatibility)
void initializeFirebaseClient();

// Sensors
void readAllSensors();
void processTVOCData();

// Actuators
void moveServoCommand(bool open);
// Sensor data structure
struct SensorData {
  // BME680 data
  float temperature;
  float pressure;
  float humidity;
  float gas_resistance;
  float altitude;
  float tvoc_approx;
  String air_quality;

  // DHT11 data
  float dht1_temp;
  float dht1_humidity;
  float dht2_temp;
  float dht2_humidity;

  // Soil moisture data
  int soil_raw;
  int soil_percentage;
  String soil_status;

  // LDR data
  int ldr_raw;
  int light_percentage;
  String light_status;

  // Control states
  bool servo; // Servo state
  int pwm;    // PWM speed 0-100% (was relay)
  bool led2;  // LED 2 state
  bool led3;  // LED 3 state
  bool led4;  // LED 4 state (GPIO 25)

  // Timestamp
  unsigned long timestamp;
  String dateTime;
  String deviceID;

  bool lastFanDecision = false;

  // Derived / ML fields
  float dew_point;      // Calculated from temperature & humidity
  String pest_presence; // High / Medium / Low
  String grain_type;    // Already added in previous step
};

SensorData currentData;

WiFiClient espClient;
PubSubClient mqttClient(espClient);

int readSoil() {
  // Simulate analog read if you want: comment out next line if you want real
  // analog
  int raw = analogRead(SOIL_MOISTURE_PIN); // still reads the probe, but
                                           // placeholder raw works too

  // Optional: If you want fully simulated without real probe, you can pick:
  // int raw = SOIL_DRY; // fully dry
  // int raw = SOIL_WET; // fully wet
  // int raw = 2200;     // middle contamination

  // Update circular buffer
  soilBuffer[soilIndex] = raw;
  soilIndex = (soilIndex + 1) % N_READS;

  // Compute moving average
  long sum = 0;
  for (int i = 0; i < N_READS; i++)
    sum += soilBuffer[i];
  int avgRaw = sum / N_READS;

  // Map to percentage
  int soilPercent = map(avgRaw, SOIL_WET, SOIL_DRY, 100, 0); // inverted
  soilPercent = constrain(soilPercent, 0, 100);

  return soilPercent;
}

void setup() {
  Serial.begin(115200);

  // Initialize pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(PWM_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  pinMode(LED4_PIN, OUTPUT);

  // Turn off all outputs initially
  digitalWrite(LED_PIN, LOW);
  digitalWrite(PWM_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
  digitalWrite(LED4_PIN, LOW);

  // Initialize PWM on GPIO 26
  initializePWM();

  // ---------- SERVO SAFE BOOT SEQUENCE ----------
  pinMode(SERVO_PIN, OUTPUT);
  lidServo.attach(SERVO_PIN, 500, 2400); // min/max pulse width

  // Force CLOSED at safe start
  moveServoCommand(false); // force CLOSED through unified control
  delay(2500);             // allow servo to move

  servoInitialized = true;
  Serial.println(F("Servo boot sequence complete - Lid CLOSED"));
  // ------------------------------------------------

  Serial.println(F("================================================"));
  Serial.println(F(" ESP32 Multi-Sensor Station with Servo & PWM"));
  Serial.println(F(" Fixed Device ID: 004B12387760"));
  Serial.println(F("================================================"));
  Serial.println(F("Servo at GPIO 27, PWM at GPIO 26"));
  Serial.println(F("LED2 at GPIO 14, LED3 at GPIO 12"));
  Serial.println(F("LED4 at GPIO 25"));
  Serial.println(F("================================================"));

  // Set fixed Device ID
  setFixedDeviceID();
  // Initialize grain type for this silo/device
  currentData.grain_type = "Rice"; // Or whichever grain type you want
  if (DUAL_WRITE_TO_BACKEND && WiFi.status() == WL_CONNECTED) {
    Serial.println(F("Sending device metadata to backend..."));

    DynamicJsonDocument metaDoc(512);
    metaDoc["deviceID"] = currentData.deviceID;
    metaDoc["mac_address"] = WiFi.macAddress();
    metaDoc["sensors"] = 4; // number of sensors

    String metaPayload;
    serializeJson(metaDoc, metaPayload);

    HTTPClient http;

    String metaURL =
        String(BACKEND_BASE_URL) + "/" + currentData.deviceID + "/metadata";

    http.begin(metaURL);

    // 6D — DEBUG LOG
    Serial.print("[HTTP] POST → ");
    Serial.println(metaURL);

    // 6C — TIMEOUT
    http.setTimeout(5000);

    http.addHeader("Content-Type", "application/json");
    int code = http.POST(metaPayload);

    if (code > 0)
      Serial.println(F("Device metadata POST success"));
    else
      Serial.println(F("Device metadata POST failed"));

    http.end();

  } // end device metadata block

  // Display MAC address for reference
  displayMACAddress();

  // Initialize SD Card
  initializeSDCard(); // SD disabled internally

  // Initialize WiFi
  initializeWiFi();
  // --- NTP Time Setup ---
  const char *ntpServer = "pool.ntp.org";
  const long gmtOffset_sec = 5 * 3600; // Pakistan UTC+5
  const int daylightOffset_sec = 0;    // No DST

  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

  // Wait for time to be set (with 10s timeout - hotspot may have no internet)
  struct tm timeinfo;
  unsigned long ntpStart = millis();
  while (!getLocalTime(&timeinfo)) {
    if (millis() - ntpStart > 10000) {
      Serial.println(F("⚠️ NTP timeout in setup — proceeding without sync"));
      break;
    }
    Serial.println(F("Waiting for NTP time..."));
    delay(500);
  }
  if (getLocalTime(&timeinfo)) {
    Serial.println(F("Time synchronized via NTP!"));
  }

  // Initialize Firebase client
  initializeFirebaseClient();

  // Initialize BME680
  initializeBME680();

  // Initialize DHT sensors
  dht1.begin();
  dht2.begin();

  // Initialize analog pins
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);

  // Create CSV file
  if (sdCardAvailable) {
    createCSVFile();
  } // intentionally commented out

  // Establish baseline
  establishBaseline();
  if (DUAL_WRITE_TO_BACKEND && WiFi.status() == WL_CONNECTED) {
    Serial.println(F("Uploading ML baseline to backend..."));

    DynamicJsonDocument baselineDoc(256);
    baselineDoc["deviceID"] = currentData.deviceID;
    baselineDoc["baseline_gas_kOhms"] = baseline_gas / 1000.0;

    String baselinePayload;
    serializeJson(baselineDoc, baselinePayload);

    HTTPClient http;

    String baselineURL =
        String(BACKEND_BASE_URL) + "/" + currentData.deviceID + "/ml_baseline";

    http.begin(baselineURL);

    // 6D
    Serial.print("[HTTP] POST → ");
    Serial.println(baselineURL);

    // 6C
    http.setTimeout(5000);

    http.addHeader("Content-Type", "application/json");
    int code = http.POST(baselinePayload);

    if (code > 0)
      Serial.println(F("ML baseline POST success"));
    else
      Serial.println(F("ML baseline POST failed"));

    http.end();

  } // end ML baseline block

  Serial.println(F("\n=== SYSTEM INITIALIZATION COMPLETE ==="));
  Serial.print(F("Device ID: "));
  Serial.println(currentData.deviceID);
  Serial.println(F("Ready to connect to Firebase"));
  Serial.println(F("=====================================\n"));
}

void mqttCallback(char *topic, byte *payload, unsigned int length);

void initializeMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("⚠️ WiFi not connected, cannot start MQTT"));
    return;
  }

  mqttClient.setServer(MQTT_BROKER,
                       MQTT_PORT); // e.g., "broker.hivemq.com", 1883
  mqttClient.setCallback(mqttCallback);

  Serial.print(F("Connecting to MQTT broker: "));
  Serial.println(MQTT_BROKER);

  int attempts = 0;
  // Use currentData.deviceID as client id (c_str())
  const char *clientId = currentData.deviceID.length()
                             ? currentData.deviceID.c_str()
                             : "esp32-client";

  while (!mqttClient.connected() && attempts < 10) { // try 10 times
    Serial.print(F("."));
    if (mqttClient.connect(currentData.deviceID.c_str(), MQTT_USERNAME,
                           MQTT_PASSWORD)) {
      Serial.println(F("\n✅ MQTT connected!"));

      // Subscribe to actuator commands for autonomous control
      String topic =
          String("grainhero/actuators/") + currentData.deviceID + "/control";
      mqttClient.subscribe(topic.c_str());
      Serial.print(F("Subscribed to topic: "));
      Serial.println(topic);

      publishDeviceStatus(); // 🔴 THIS IS THE KEY LINE
    } else {
      Serial.print(F("Failed, rc="));
      Serial.print(mqttClient.state());
      Serial.println(F(" try again in 1s"));
      delay(1000);
      attempts++;
    }
  }

  if (!mqttClient.connected()) {
    Serial.println(F("❌ Could not connect to MQTT broker"));
  }
}

void mqttCallback(char *topic, byte *payload, unsigned int length) {
  Serial.print(F("Message arrived ["));
  Serial.print(topic);
  Serial.print(F("]: "));

  // Build payload string safely
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  // Parse JSON safely
  DynamicJsonDocument doc(512);
  DeserializationError err = deserializeJson(doc, message);
  if (err) {
    Serial.print(F("MQTT JSON parse error: "));
    Serial.println(err.c_str());
    return;
  }

  // --- Handle Servo commands (INTENT ONLY) ---
  if (doc.containsKey("servo")) {
    String servoCmd = doc["servo"];

    controlMode = MANUAL;
    humanOverrideActive = true;
    lastHumanCommandTime = millis();

    if (servoCmd == "OPEN") {
      humanRequestedFan = true; // opening lid implies ventilation intent
    } else if (servoCmd == "CLOSE") {
      humanRequestedFan = false;
    }

    Serial.println("🧑 Human override ENABLED (INTENT ONLY)");
  }

  // --- Handle PWM / Fan control ---
  if (doc.containsKey("action")) {
    String action = doc["action"];
    int value = doc["value"] | 0;

    if (action == "turn_on") {
      controlMode = MANUAL;
      humanOverrideActive = true;
      humanRequestedFan = true;
      targetFanSpeed = value > 0 ? value : 60;
      lastHumanCommandTime = millis();
      Serial.printf("🧑 Human requested FAN ON at %d%%\n", targetFanSpeed);
    }

    else if (action == "turn_off") {
      controlMode = MANUAL;
      humanOverrideActive = true;
      humanRequestedFan = false;
      targetFanSpeed = 0;
      lastHumanCommandTime = millis();
      Serial.println(F("🧑 Human requested FAN OFF"));
    }

    else if (action == "set_value") {
      bool isLedControl = doc.containsKey("led2") || doc.containsKey("led3") ||
                          doc.containsKey("led4");
      if (!isLedControl) {
        controlMode = MANUAL;
        humanOverrideActive = true;
        targetFanSpeed = value;
        humanRequestedFan = value > 0;
        lastHumanCommandTime = millis();
        Serial.printf("🧑 Human set fan speed to %d%%\n", value);
      }
    }

    else if (action == "auto") {
      humanOverrideActive = false;
      controlMode = AUTO;
      Serial.println(F("🔄 Returned to AUTO mode"));
    }

    else {
      Serial.print(F("Unknown MQTT action: "));
      Serial.println(action);
    }
  }

  // --- LED control (handled independently, track state) ---
  if (doc.containsKey("led2")) {
    led2State = doc["led2"] ? true : false;
    digitalWrite(LED2_PIN, led2State ? HIGH : LOW);
    Serial.printf("💡 LED2 %s via MQTT\n", led2State ? "ON" : "OFF");
  }
  if (doc.containsKey("led3")) {
    led3State = doc["led3"] ? true : false;
    digitalWrite(LED3_PIN, led3State ? HIGH : LOW);
    Serial.printf("💡 LED3 %s via MQTT\n", led3State ? "ON" : "OFF");
  }
  if (doc.containsKey("led4")) {
    led4State = doc["led4"] ? true : false;
    digitalWrite(LED4_PIN, led4State ? HIGH : LOW);
    Serial.printf("💡 LED4 %s via MQTT\n", led4State ? "ON" : "OFF");
  }
}

float calculateDewPoint(float temperature, float humidity) {
  // Magnus formula approximation
  const float a = 17.27;
  const float b = 237.7;
  float alpha = ((a * temperature) / (b + temperature)) + log(humidity / 100.0);
  float dewPoint = (b * alpha) / (a - alpha);
  return dewPoint;
}

/**
 * Multi-factor pest/mold risk inference for stored grain.
 * References:
 *   TVOC:  Bosch BSEC IAQ classification (BME680 Datasheet)
 *   RH:    Magan & Aldred (2007), Int. J. Food Microbiology 119(1-2), 131-139
 *   Temp:  ASABE Standard D245.6
 *   MC:    FAO Grain Storage Techniques Ch.4; IRRI Rice Knowledge Bank
 */
float pestRiskScore = 0.0;
String pestRiskLabel = "None";

void computePestMoldRisk(float tvoc, float humidity, float temperature,
                         int soilPercent) {
  float score = 0.0;
  // Factor 1: TVOC (Bosch BSEC IAQ) — weight up to 0.40
  if (tvoc > 1000)
    score += 0.40;
  else if (tvoc > 500)
    score += 0.30;
  else if (tvoc > 250)
    score += 0.20;
  else if (tvoc > 100)
    score += 0.08;
  // Factor 2: Humidity (Magan & Aldred 2007) — weight up to 0.25
  if (humidity > 80)
    score += 0.25;
  else if (humidity > 70)
    score += 0.18;
  else if (humidity > 65)
    score += 0.10;
  // Factor 3: Temperature (ASABE D245.6) — weight up to 0.20
  if (temperature > 35)
    score += 0.18;
  else if (temperature > 30)
    score += 0.20;
  else if (temperature > 25)
    score += 0.12;
  else if (temperature > 20)
    score += 0.05;
  // Factor 4: Grain Moisture (FAO/IRRI) — weight up to 0.15
  float grainMC = 25.0 - (soilPercent / 100.0) * 17.0;
  if (grainMC > 18)
    score += 0.15;
  else if (grainMC > 15)
    score += 0.12;
  else if (grainMC > 14)
    score += 0.08;
  else if (grainMC > 13)
    score += 0.03;
  score = constrain(score, 0.0, 1.0);
  String label;
  if (score >= 0.6)
    label = "High";
  else if (score >= 0.35)
    label = "Medium";
  else if (score >= 0.15)
    label = "Low";
  else
    label = "None";
  pestRiskScore = score;
  pestRiskLabel = label;
}

String detectPestPresence(float tvoc, float humidity, int soilPercent) {
  computePestMoldRisk(tvoc, humidity, currentData.temperature, soilPercent);
  return pestRiskLabel;
}

void requestFanOn(int speed = 60) {
  mlRequestedFan = true;
  targetFanSpeed = speed;
}

void requestFanOff() {
  mlRequestedFan = false;
  targetFanSpeed = 0;
}

void loop() {

  // ================================
  // 1️⃣ HUMAN OVERRIDE TIMEOUT CHECK
  // ================================
  if (humanOverrideActive) {
    if (millis() - lastHumanCommandTime > HUMAN_OVERRIDE_TIMEOUT) {
      humanOverrideActive = false;
      controlMode = AUTO;
      Serial.println("⏱ Human override expired → AUTO mode restored");
    }
  }

  // ================================
  // 2️⃣ READ SENSORS
  // ================================
  readAllSensors();
  processTVOCData(); // process TVOC / air quality data

  // ================================
  // 3️⃣ WAIT FOR VALID NTP TIME (with timeout)
  // ================================
  static unsigned long ntpWaitStart = 0;
  if (time(nullptr) < 1700000000) {
    if (ntpWaitStart == 0)
      ntpWaitStart = millis();
    if (millis() - ntpWaitStart < 10000) {
      Serial.println(F("⏳ Waiting for valid NTP time..."));
      delay(500);
      return;
    }
    Serial.println(F("⚠️ NTP timeout — proceeding with system clock"));
  }

  // ================================
  // 4️⃣ FAILSAFE AUTONOMY (MQTT silent)
  // ================================
  if (!mqttClient.connected()) {
    if (currentData.tvoc_approx > 600) {
      requestFanOn(80); // new safe request function
    } else {
      requestFanOff(); // new safe request function
    }
  }

  // ================================
  // 5️⃣ GENERATE TIMESTAMP
  // ================================
  currentData.dateTime = getDateTimeString();
  currentData.timestamp = (unsigned long)time(nullptr); // seconds since 1970

  // ================================
  // 6️⃣ MQTT LOOP - handle incoming messages
  // ================================
  if (wifiConnected) {
    if (mqttClient.connected()) {
      mqttClient.loop(); // process MQTT callbacks
    } else {
      Serial.println(F("MQTT disconnected, reconnecting..."));
      initializeMQTT();
    }
  }

  // ================================
  // 6.5 CHECK FIREBASE CONTROLS (fallback if MQTT missed)
  // ================================
  checkFirebaseControls();
  updateControlOutputs();

  // ================================
  // ML DECISION INPUT (from backend)
  // ================================
  // Only run ML logic when human is NOT overriding
  if (!humanOverrideActive) {
    if (currentData.tvoc_approx > 600 || currentData.humidity > 75) {
      mlRequestedFan = true;
      targetFanSpeed = 80;
    } else {
      mlRequestedFan = false;
      targetFanSpeed = 0;
    }
  }

  // ================================
  // 7️⃣ UPDATE CONTROL OUTPUTS (lid/fan)
  // ================================
  processLidFanStateMachine(); // centralized state machine

  // ================================
  // 8️⃣ PUBLISH SENSOR DATA
  // ================================
  publishToFirebaseREST(); // push to Firebase

  if (millis() - lastMQTTPublish > MQTT_PUBLISH_INTERVAL) {
    publishToMQTT(); // push to MQTT broker
    lastMQTTPublish = millis();
  }

  if (millis() - lastSerialTelemetry > SERIAL_TELEMETRY_INTERVAL) {
    publishSerialTelemetry();
    lastSerialTelemetry = millis();
  }

  // ================================
  // 9️⃣ DISPLAY READINGS
  // ================================
  displayAllReadings();

  // ================================
  // 🔟 SAVE TO SD CARD
  // ================================
  saveToSDCard();

  // ================================
  // 1️⃣1️⃣ UPDATE STATUS LED
  // ================================
  updateStatusLED();

  Serial.println(F("\n========================================\n"));

  // ================================
  // 1️⃣2️⃣ MAIN LOOP DELAY
  // ================================
  delay(500); // fast loop for responsive actuator control
}

// Function to set fixed Device ID
void setFixedDeviceID() {
  currentData.deviceID = FIXED_DEVICE_ID;
  Serial.print(F("Fixed Device ID set to: "));
  Serial.println(currentData.deviceID);
}

// Function to display MAC address for reference
void displayMACAddress() {
  uint8_t mac[6];
  WiFi.macAddress(mac);
  char macStr[18];
  snprintf(macStr, sizeof(macStr), "%02X:%02X:%02X:%02X:%02X:%02X", mac[0],
           mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.print(F("Device MAC Address: "));
  Serial.println(macStr);
}

// Function to initialize PWM on GPIO 26
void initializePWM() {
  // Allow allocation of all timers
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  // Attach PWM to GPIO 26 with 1KHz frequency and 10-bit resolution
  pwm.attachPin(PWM_PIN, pwmFrequency, 10); // 1KHz, 10 bits resolution

  Serial.println(F("PWM initialized on GPIO 26"));
  Serial.print(F("Frequency: "));
  Serial.print(pwmFrequency);
  Serial.println(F(" Hz"));
  Serial.print(F("Initial Duty Cycle: "));
  Serial.print(pwmDutyCycle * 100);
  Serial.println(F("%"));
}

// Function to set PWM speed (0-100%)
void setPWMSpeed(int speedPercent) {
  // ---------- FAN–LID SAFETY INTERLOCK ----------
  if (!lidIsOpen) {
    pwmSpeed = 0;
    pwmDutyCycle = 0.0;
    pwm.write(pwmDutyCycle);
    Serial.println(F("⚠️ FAN BLOCKED: Lid is CLOSED → PWM forced to 0%"));
    return;
  }
  // ---------------------------------------------

  // Clamp input
  speedPercent = constrain(speedPercent, 0, 100);

  pwmSpeed = speedPercent;
  pwmDutyCycle = speedPercent / 100.0;
  pwm.write(pwmDutyCycle);

  Serial.print(F("PWM Speed set to: "));
  Serial.print(speedPercent);
  Serial.println(F("%"));
}

void moveServoCommand(bool open) {
  if (!servoInitialized)
    return;
  if (millis() - lastServoAction < SERVO_COOLDOWN)
    return;

  int targetAngle = open ? SERVO_OPEN_ANGLE : SERVO_CLOSED_ANGLE;

  if (servoCurrentAngle != targetAngle) {
    // Sweep slowly
    int step = open ? 1 : -1;
    for (int angle = servoCurrentAngle; angle != targetAngle; angle += step) {
      lidServo.write(angle);
      delay(15);
    }

    servoCurrentAngle = targetAngle;
    lastServoAction = millis();

    Serial.print(F("Servo moved to "));
    Serial.println(open ? "OPEN" : "CLOSED");
    servoState = open;
    lidIsOpen = open; // 🔴 REQUIRED SYNC

    lastServoState = open;
  }
}

bool environmentAllowsVentilation() {
  if (isRaining)
    return false;
  if (outsideHumidity > MAX_SAFE_OUTSIDE_HUMIDITY)
    return false;
  if (currentData.temperature > 60.0)
    return false;
  if (currentData.tvoc_approx > 1000.0)
    return false;
  return true;
}

bool fanRequested() {

  bool rawDecision;

  if (!environmentAllowsVentilation()) {
    rawDecision = false;
  } else if (humanOverrideActive) {
    rawDecision = humanRequestedFan;
  } else {
    rawDecision = mlRequestedFan;
  }

  unsigned long now = millis();

  // debounce decision changes
  if (rawDecision != lastFanDecision) {
    if (now - lastDecisionChangeAt < DECISION_DEBOUNCE_MS) {
      return lastFanDecision;
    }
    lastDecisionChangeAt = now;
    lastFanDecision = rawDecision;
  }

  return lastFanDecision;
}

void processLidFanStateMachine() {

  bool wantFan = fanRequested();
  unsigned long now = millis();

  switch (currentState) {

  case STATE_IDLE_CLOSED:
    if (wantFan) {
      moveServoCommand(true);
      lidLastOpenedAt = now;
      currentState = STATE_OPENING_LID;
    }
    break;

  case STATE_OPENING_LID:
    if (now - lidLastOpenedAt >= LID_OPEN_DELAY_MS) {
      currentState = STATE_FAN_RUNNING;
    }
    break;

  case STATE_FAN_RUNNING:
    setPWMSpeed(targetFanSpeed);
    if (!wantFan) {
      fanLastStartedAt = now;
      setPWMSpeed(0);
      currentState = STATE_STOPPING_FAN;
    }
    break;

  case STATE_STOPPING_FAN:
    if (now - fanLastStartedAt >= LID_CLOSE_DELAY_MS) {
      moveServoCommand(false);
      currentState = STATE_IDLE_CLOSED;
    }
    break;
  }
}

void initializeSDCard() {
  Serial.println(F("Initializing SD card..."));

  SPI.begin(SD_SCK, SD_MISO, SD_MOSI, SD_CS);

  // SD logging disabled for demo stability
  sdCardAvailable = false;
  Serial.println("ℹ️ SD logging disabled (demo mode)");

  uint8_t cardType = SD.cardType();
  if (cardType == CARD_NONE) {
    Serial.println(F("No SD card attached"));
    sdCardAvailable = false;
    return;
  }

  sdCardAvailable = true;

  if (!SD.exists("/data")) {
    SD.mkdir("/data");
  }
}

void createCSVFile() {
  csvFileName = "/data/sensor_data_" + getTimestampString() + ".csv";

  dataFile = SD.open(csvFileName.c_str(), FILE_WRITE);
  if (!dataFile) {
    Serial.println(F("Failed to create CSV file!"));
    return;
  }

  // Updated CSV header with pwm_speed instead of relay_state
  dataFile.println(
      "timestamp,datetime,device_id,temperature_C,pressure_hPa,humidity_"
      "percent,gas_resistance_KOhms,tvoc_ppb,air_quality,dht1_temp_C,dht1_"
      "humidity_percent,dht2_temp_C,dht2_humidity_percent,soil_raw,soil_"
      "percent,soil_status,ldr_raw,light_percent,light_status,servo_state,pwm_"
      "speed,led2_state,led3_state,led4_state,servo_angle");
  dataFile.close();

  Serial.print(F("CSV file created: "));
  Serial.println(csvFileName);
}

void initializeWiFi() {
  Serial.print(F("Connecting to WiFi: "));
  Serial.println(WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(F("."));
    attempts++;
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Blink LED while connecting
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println(F("\nWiFi connected!"));
    Serial.print(F("IP address: "));
    Serial.println(WiFi.localIP());
    digitalWrite(LED_PIN, HIGH);

    // ---------- MQTT initialization ----------
    initializeMQTT(); // Call MQTT init here after Wi-Fi connects

  } else {
    wifiConnected = false;
    Serial.println(F("\nWiFi connection failed!"));
    digitalWrite(LED_PIN, LOW);
  }
}

void initializeFirebaseClient() {

#if ENABLE_FIREBASE == true
  Serial.println("🔥 Firebase enabled (MODE 2)");
  return;
#endif
  client.setInsecure(); // Use for testing, or set proper certificates

  Serial.println(F("Firebase REST client initialized"));
  Serial.print(F("Host: "));
  Serial.println(FIREBASE_HOST);
  Serial.print(F("Device Path: /sensor_data/"));
  Serial.print(currentData.deviceID);
  Serial.println(F("/latest.json"));
  Serial.print(F("Control Path: /control/"));
  Serial.print(currentData.deviceID);
  Serial.println(F(".json"));
}

void initializeBME680() {
  Serial.println(F("Initializing BME680..."));
  if (!bme.begin()) {
    Serial.println(F("Could not find a valid BME680 sensor, check wiring!"));
    while (1)
      ;
  }

  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150);
}

void readAllSensors() {
  // Read BME680
  unsigned long endTime = bme.beginReading();
  if (endTime != 0) {
    delay(50);
    if (bme.endReading()) {
      currentData.temperature = bme.temperature;
      currentData.pressure = bme.pressure / 100.0;
      currentData.humidity = bme.humidity;
      currentData.gas_resistance = bme.gas_resistance;
      currentData.altitude = bme.readAltitude(SEALEVELPRESSURE_HPA);
    }
  }

  // Read DHT11 sensors
  currentData.dht1_temp = dht1.readTemperature();
  currentData.dht1_humidity = dht1.readHumidity();
  if (isnan(currentData.dht1_temp) || isnan(currentData.dht1_humidity)) {
    currentData.dht1_temp = -999;
    currentData.dht1_humidity = -999;
  }

  currentData.dht2_temp = dht2.readTemperature();
  currentData.dht2_humidity = dht2.readHumidity();
  if (isnan(currentData.dht2_temp) || isnan(currentData.dht2_humidity)) {
    currentData.dht2_temp = -999;
    currentData.dht2_humidity = -999;
  }

  // Read soil moisture using SMA
  currentData.soil_raw = analogRead(SOIL_MOISTURE_PIN);
  currentData.soil_percentage = readSoil();

  // Interpret status (grain logic, not plant logic)
  if (currentData.soil_percentage >= 70) {
    currentData.soil_status = "Dry";
  } else if (currentData.soil_percentage >= 40) {
    currentData.soil_status = "Normal";
  } else if (currentData.soil_percentage >= 20) {
    currentData.soil_status = "Moist";
  } else {
    currentData.soil_status = "Saturated";
  }

  // Read LDR
  currentData.ldr_raw = analogRead(LDR_PIN);
  currentData.light_percentage =
      map(currentData.ldr_raw, LDR_DARK, LDR_BRIGHT, 100, 0);
  currentData.light_percentage =
      constrain(currentData.light_percentage, 0, 100);

  if (currentData.light_percentage < 20) {
    currentData.light_status = "Dark";
  } else if (currentData.light_percentage < 60) {
    currentData.light_status = "Normal";
  } else {
    currentData.light_status = "Bright";
  }
}

void processTVOCData() {
  if (currentData.gas_resistance <= 0) {
    currentData.tvoc_approx = -999;
    currentData.air_quality = "Invalid";
    return;
  }

  float gas_kOhms = currentData.gas_resistance / 1000.0;

  if (gas_kOhms > 100) {
    currentData.tvoc_approx = mapFloat(gas_kOhms, 100, 200, 0, 100);
    currentData.air_quality = "Excellent";
  } else if (gas_kOhms > 60) {
    currentData.tvoc_approx = mapFloat(gas_kOhms, 60, 100, 100, 250);
    currentData.air_quality = "Good";
  } else if (gas_kOhms > 40) {
    currentData.tvoc_approx = mapFloat(gas_kOhms, 40, 60, 250, 500);
    currentData.air_quality = "Moderate";
  } else if (gas_kOhms > 20) {
    currentData.tvoc_approx = mapFloat(gas_kOhms, 20, 40, 500, 1000);
    currentData.air_quality = "Poor";
  } else {
    currentData.tvoc_approx = mapFloat(gas_kOhms, 10, 20, 1000, 2000);
    currentData.air_quality = "Unhealthy";
  }

  float humidity_compensation = 1.0 + (currentData.humidity - 50.0) * 0.01;
  currentData.tvoc_approx = currentData.tvoc_approx * humidity_compensation;

  // Derived fields
  currentData.dew_point =
      calculateDewPoint(currentData.temperature, currentData.humidity);
  currentData.pest_presence =
      detectPestPresence(currentData.tvoc_approx, currentData.humidity,
                         currentData.soil_percentage);

  Serial.print("Dew Point: ");
  Serial.println(currentData.dew_point);

  Serial.print("Pest Presence: ");
  Serial.println(currentData.pest_presence);
}
void publishToMQTT() {
  if (!mqttClient.connected())
    return;

  DynamicJsonDocument doc(768);

  // REQUIRED STRUCTURE FOR BACKEND
  JsonObject readings = doc.createNestedObject("readings");
  readings["temperature"] = currentData.temperature;
  readings["humidity"] = currentData.humidity;
  readings["pressure"] = currentData.pressure;
  readings["tvoc"] = currentData.tvoc_approx;
  readings["grain_type"] = currentData.grain_type;

  // Metadata
  doc["device_id"] = currentData.deviceID;
  doc["battery_level"] = 98;
  doc["signal_strength"] = -60;
  doc["timestamp"] = currentData.dateTime;
  doc["timestamp_unix"] = currentData.timestamp;

  // Control authority — WHO is driving actuators
  if (humanOverrideActive) {
    doc["control_authority"] = "HUMAN";
  } else {
    doc["control_authority"] = "ML_AUTO";
  }

  // Actuator state (so dashboard can show real state via MQTT)
  doc["fanState"] = pwmSpeed > 0 ? "on" : "off";
  doc["lidState"] = lidIsOpen ? "open" : "closed";
  doc["pwm_speed"] = pwmSpeed;
  doc["mlDecision"] = mlRequestedFan ? "fan_on" : "idle";

  String payload;
  serializeJson(doc, payload);

  String topic = "grainhero/sensors/" + currentData.deviceID + "/readings";

  mqttClient.publish(topic.c_str(), payload.c_str());

  Serial.print(F("📡 MQTT published to "));
  Serial.println(topic);
}

void publishSerialTelemetry() {
  DynamicJsonDocument doc(256);
  doc["temperature"] = currentData.temperature;
  doc["humidity"] = currentData.humidity;
  doc["tvoc"] = currentData.tvoc_approx;
  doc["fanState"] = pwmSpeed > 0 ? "on" : "off";
  doc["lidState"] = lidIsOpen ? "open" : "closed";
  doc["mlDecision"] = mlRequestedFan ? "fan_on" : "idle";
  doc["timestamp"] = currentData.timestamp;
  String out;
  serializeJson(doc, out);
  Serial.println(out);
}

void saveToSDCard() {
  if (!sdCardAvailable)
    return;

  dataFile = SD.open(csvFileName.c_str(), FILE_APPEND);
  if (!dataFile) {
    Serial.println(F("Failed to open CSV file for writing!"));
    return;
  }

  dataFile.print(currentData.timestamp);
  dataFile.print(",");
  dataFile.print(currentData.dateTime);
  dataFile.print(",");
  dataFile.print(currentData.deviceID);
  dataFile.print(",");
  dataFile.print(currentData.temperature);
  dataFile.print(",");
  dataFile.print(currentData.pressure);
  dataFile.print(",");
  dataFile.print(currentData.humidity);
  dataFile.print(",");
  dataFile.print(currentData.gas_resistance / 1000.0);
  dataFile.print(",");
  dataFile.print(currentData.tvoc_approx);
  dataFile.print(",");
  dataFile.print(currentData.air_quality);
  dataFile.print(",");
  dataFile.print(currentData.dht1_temp);
  dataFile.print(",");
  dataFile.print(currentData.dht1_humidity);
  dataFile.print(",");
  dataFile.print(currentData.dht2_temp);
  dataFile.print(",");
  dataFile.print(currentData.dht2_humidity);
  dataFile.print(",");
  dataFile.print(currentData.soil_raw);
  dataFile.print(",");
  dataFile.print(currentData.soil_percentage);
  dataFile.print(",");
  dataFile.print(currentData.soil_status);
  dataFile.print(",");
  dataFile.print(currentData.ldr_raw);
  dataFile.print(",");
  dataFile.print(currentData.light_percentage);
  dataFile.print(",");
  dataFile.print(currentData.light_status);
  dataFile.print(",");
  dataFile.print(servoState ? "ON" : "OFF");
  dataFile.print(",");
  dataFile.print(pwmSpeed);
  dataFile.print(","); // PWM speed 0-100
  dataFile.print(led2State ? "ON" : "OFF");
  dataFile.print(",");
  dataFile.print(led3State ? "ON" : "OFF");
  dataFile.print(",");
  dataFile.print(led4State ? "ON" : "OFF");
  dataFile.print(",");
  dataFile.print(currentData.grain_type);
  dataFile.print(",");

  dataFile.println(servoCurrentAngle);

  dataFile.close();

  static unsigned long lastPrint = 0;
  if (millis() - lastPrint > 10000) {
    Serial.println(F("Data saved to SD card"));
    lastPrint = millis();
  }
}

void publishToFirebaseREST() {
  if (!wifiConnected)
    return;

  // Upload every 10 seconds
  if (millis() - lastFirebaseUpload < FIREBASE_UPLOAD_INTERVAL &&
      lastFirebaseUpload != 0) {
    return;
  }

  lastFirebaseUpload = millis();

  // Create JSON payload
  DynamicJsonDocument jsonDoc(2048);

  // Basic info
  jsonDoc["timestamp"] = currentData.timestamp;
  jsonDoc["timestamp_unix"] = currentData.timestamp;
  jsonDoc["datetime"] = currentData.dateTime;
  jsonDoc["device_id"] = currentData.deviceID;
  jsonDoc["grain_type"] = currentData.grain_type;

  // BME680 data
  jsonDoc["temperature"] = currentData.temperature;
  jsonDoc["pressure"] = currentData.pressure;
  jsonDoc["humidity"] = currentData.humidity;
  jsonDoc["gas_resistance"] = currentData.gas_resistance / 1000.0;
  jsonDoc["tvoc_ppb"] = currentData.tvoc_approx;
  jsonDoc["air_quality"] = currentData.air_quality;
  jsonDoc["altitude"] = currentData.altitude;

  jsonDoc["control_mode"] = (controlMode == AUTO) ? "AUTO" : "MANUAL";
  jsonDoc["human_override"] = humanOverrideActive;

  // DHT11 data
  JsonObject dht1 = jsonDoc.createNestedObject("dht1");
  dht1["temperature"] = currentData.dht1_temp;
  dht1["humidity"] = currentData.dht1_humidity;

  JsonObject dht2 = jsonDoc.createNestedObject("dht2");
  dht2["temperature"] = currentData.dht2_temp;
  dht2["humidity"] = currentData.dht2_humidity;

  // Soil moisture data
  JsonObject soil = jsonDoc.createNestedObject("soil_moisture");
  soil["raw"] = currentData.soil_raw;
  soil["percentage"] = currentData.soil_percentage;
  soil["status"] = currentData.soil_status;

  // LDR data
  JsonObject ldr = jsonDoc.createNestedObject("light_sensor");
  ldr["raw"] = currentData.ldr_raw;
  ldr["percentage"] = currentData.light_percentage;
  ldr["status"] = currentData.light_status;

  // Control states - pwm_speed instead of relay_state
  jsonDoc["servo_state"] = servoState;
  jsonDoc["pwm_speed"] = pwmSpeed; // 0-100% instead of relay_state
  jsonDoc["led2_state"] = led2State;
  jsonDoc["led3_state"] = led3State;
  jsonDoc["led4_state"] = led4State;
  jsonDoc["servo_angle"] = servoCurrentAngle;

  // Convert to string
  String jsonStr;
  serializeJson(jsonDoc, jsonStr);

  // Generate path with Device ID 004B12387760
  String path =
      String(SENSOR_DATA_URL) + "/" + currentData.deviceID + "/latest.json";
  String fullURL = "https://" + String(FIREBASE_HOST) + path +
                   "?auth=" + String(FIREBASE_AUTH);

  Serial.print(F("Publishing to Firebase: "));
  Serial.println(fullURL);

  // Make HTTP PUT request (overwrites data at this path)
  if (client.connect(FIREBASE_HOST, 443)) {
    String request =
        "PUT " + path + "?auth=" + String(FIREBASE_AUTH) + " HTTP/1.1\r\n";
    request += "Host: " + String(FIREBASE_HOST) + "\r\n";
    request += "Content-Type: application/json\r\n";
    request += "Content-Length: " + String(jsonStr.length()) + "\r\n";
    request += "Connection: close\r\n\r\n";
    request += jsonStr;

    client.print(request);

    // Wait for response
    unsigned long timeout = millis();
    while (client.available() == 0) {
      if (millis() - timeout > 5000) {
        Serial.println(F("Client Timeout!"));
        client.stop();
        return;
      }
    }

    // Read response
    bool success = false;
    while (client.available()) {
      String line = client.readStringUntil('\r');
      if (line.startsWith("HTTP/1.1")) {
        if (line.indexOf("200") > 0 || line.indexOf("204") > 0) {
          success = true;
        }
      }
    }

    if (success) {
      Serial.println(F("Firebase publish successful"));
      if (DUAL_WRITE_TO_BACKEND) {
        Serial.println(F("Sending data to backend for MongoDB storage..."));
        if (WiFi.status() == WL_CONNECTED) {
          HTTPClient http;

          String backendURL = String(BACKEND_BASE_URL) + "/mqtt-ingest";

          http.begin(backendURL);

          // 6D
          Serial.print("[HTTP] POST → ");
          Serial.println(backendURL);

          // 6C
          http.setTimeout(5000);

          http.addHeader("Content-Type", "application/json");
          DynamicJsonDocument ingestDoc(1024);
          ingestDoc["device_id"] = currentData.deviceID;
          ingestDoc["timestamp"] = currentData.timestamp;
          JsonObject ingestReadings = ingestDoc.createNestedObject("readings");
          ingestReadings["temperature"] = currentData.temperature;
          ingestReadings["humidity"] = currentData.humidity;
          ingestReadings["tvoc"] = currentData.tvoc_approx;
          ingestReadings["pressure"] = currentData.pressure;
          ingestReadings["gas_resistance"] =
              currentData.gas_resistance / 1000.0;
          ingestReadings["altitude"] = currentData.altitude;
          ingestReadings["air_quality"] = currentData.air_quality;
          ingestReadings["soil_moisture_raw"] = currentData.soil_raw;
          ingestReadings["soil_moisture_pct"] = currentData.soil_percentage;
          ingestReadings["light_raw"] = currentData.ldr_raw;
          ingestReadings["light_pct"] = currentData.light_percentage;
          ingestReadings["pwm_speed"] = pwmSpeed;
          ingestReadings["servo_state"] = servoState;
          ingestReadings["alarm_state"] = led4State ? "on" : "off";
          ingestReadings["dew_point"] = currentData.dew_point;
          ingestReadings["dew_point_gap"] =
              currentData.temperature - currentData.dew_point;
          String payload;
          serializeJson(ingestDoc, payload);
          int httpResponseCode = http.POST(payload);

          if (httpResponseCode > 0) {
            Serial.print(F("Backend POST success, code: "));
            Serial.println(httpResponseCode);
          } else {
            Serial.print(F("Backend POST failed, error: "));
            Serial.println(http.errorToString(httpResponseCode));
          }

          http.end();
        }
      }

    } else {
      Serial.println(F("Firebase publish failed"));
    }

    client.stop();

  } else {
    Serial.println(F("Failed to connect to Firebase"));
  }
}

void checkFirebaseControls() {
  if (!wifiConnected)
    return;

  // Check every 2 seconds
  if (millis() - lastControlCheck < CONTROL_CHECK_INTERVAL &&
      lastControlCheck != 0) {
    return;
  }

  lastControlCheck = millis();

  // Get control data from Firebase for Device ID 004B12387760
  String path = String(CONTROL_URL) + "/" + currentData.deviceID + ".json";
  String fullURL = "https://" + String(FIREBASE_HOST) + path +
                   "?auth=" + String(FIREBASE_AUTH);

  Serial.print(F("Checking controls for device: "));
  Serial.println(currentData.deviceID);

  if (client.connect(FIREBASE_HOST, 443)) {
    String request =
        "GET " + path + "?auth=" + String(FIREBASE_AUTH) + " HTTP/1.1\r\n";
    request += "Host: " + String(FIREBASE_HOST) + "\r\n";
    request += "Connection: close\r\n\r\n";

    client.print(request);

    // Wait for response
    unsigned long timeout = millis();
    while (client.available() == 0) {
      if (millis() - timeout > 5000) {
        Serial.println(F("Control check timeout!"));
        client.stop();
        return;
      }
    }

    // Read response
    String response = "";
    bool inBody = false;
    while (client.available()) {
      String line = client.readStringUntil('\r');
      if (line == "\n" && !inBody) {
        inBody = true;
      } else if (inBody) {
        response += line;
      }
    }

    client.stop();

    // Parse JSON response
    if (response.length() > 0 && response != "null") {
      DynamicJsonDocument doc(512);
      DeserializationError error = deserializeJson(doc, response);

      if (!error) {
        bool newServoState = doc["servo"] | false;
        int newPwmSpeed = doc["pwm"] | 0; // Read PWM speed (0-100)
        bool newLed2State = doc["led2"] | false;
        bool newLed3State = doc["led3"] | false;
        bool newLed4State = doc["led4"] | false;

        // Update states if changed
        if (newServoState != servoState) {
          servoState = newServoState;
          Serial.print(F("Servo state changed to: "));
          Serial.println(servoState ? "ON" : "OFF");
        }

        if (newPwmSpeed != pwmSpeed) {
          pwmSpeed = newPwmSpeed;
          Serial.print(F("PWM speed changed to: "));
          Serial.print(pwmSpeed);
          Serial.println(F("%"));
        }

        if (newLed2State != led2State) {
          led2State = newLed2State;
          Serial.print(F("LED2 state changed to: "));
          Serial.println(led2State ? "ON" : "OFF");
        }

        if (newLed3State != led3State) {
          led3State = newLed3State;
          Serial.print(F("LED3 state changed to: "));
          Serial.println(led3State ? "ON" : "OFF");
        }

        if (newLed4State != led4State) {
          led4State = newLed4State;
          Serial.print(F("LED4 (GPIO 25) state changed to: "));
          Serial.println(led4State ? "ON" : "OFF");
        }

        // Update currentData with control states
        currentData.servo = servoState;
        currentData.pwm = pwmSpeed;
        currentData.led2 = led2State;
        currentData.led3 = led3State;
        currentData.led4 = led4State;

        // === Dual-write: send updated actuator states to backend ===
        if (DUAL_WRITE_TO_BACKEND) {
          Serial.println(F("Sending actuator states to backend..."));
          DynamicJsonDocument ctrlDoc(256);
          ctrlDoc["deviceID"] = currentData.deviceID;
          ctrlDoc["servo"] = servoState;
          ctrlDoc["pwm"] = pwmSpeed;
          ctrlDoc["led2"] = led2State;
          ctrlDoc["led3"] = led3State;
          ctrlDoc["led4"] = led4State;

          String ctrlPayload;
          serializeJson(ctrlDoc, ctrlPayload);

          HTTPClient http;

          String controlURL = String(BACKEND_BASE_URL) + "/" +
                              currentData.deviceID + "/control_state";

          http.begin(controlURL);

          // 6D
          Serial.print("[HTTP] POST → ");
          Serial.println(controlURL);

          // 6C
          http.setTimeout(5000);

          http.addHeader("Content-Type", "application/json");
          int code = http.POST(ctrlPayload);

          if (code > 0)
            Serial.println(F("Control POST success"));
          else
            Serial.println(F("Control POST failed"));

          http.end();
        }

      } else {
        // JSON parse failed
        Serial.print(F("Failed to parse control JSON: "));
        Serial.println(error.c_str());
        Serial.print(F("Response was: "));
        Serial.println(response);
      }

    } else {
      Serial.println(F("No control data found in Firebase for this device."));
      Serial.println(
          F("Please set up Firebase with control/004B12387760 path"));
    }

  } else {
    Serial.println(F("Failed to connect for control check"));
  }
}

void updateControlOutputs() {
  // Servo/fan handled by processLidFanStateMachine() — do NOT override here

  // Update LED outputs — always follow state directly
  digitalWrite(LED2_PIN, led2State ? HIGH : LOW);
  digitalWrite(LED3_PIN, led3State ? HIGH : LOW);
  digitalWrite(LED4_PIN, led4State ? HIGH : LOW);

  // Publish feedback to MQTT so backend knows actual state
  static unsigned long lastFeedback = 0;
  if (mqttClient.connected() && millis() - lastFeedback > 2000) {
    lastFeedback = millis();
    DynamicJsonDocument fb(384);
    fb["servo"] = servoState;
    fb["pwm"] = pwmSpeed;
    fb["led2"] = led2State;
    fb["led3"] = led3State;
    fb["led4"] = led4State;
    fb["humanOverride"] = humanOverrideActive;

    // Control authority — WHO is driving the actuators right now
    if (humanOverrideActive) {
      fb["control_authority"] = "HUMAN";
    } else if (!mqttClient.connected()) {
      fb["control_authority"] = "FAILSAFE";
    } else {
      fb["control_authority"] = "ML_AUTO";
    }

    String out;
    serializeJson(fb, out);

    String topic = "grainhero/actuators/" + currentData.deviceID + "/feedback";
    mqttClient.publish(topic.c_str(), out.c_str());

    lastPwmSent = pwmSpeed;
    lastServoSent = servoState;
  }
}

void publishDeviceStatus() {
  if (!mqttClient.connected())
    return;

  DynamicJsonDocument doc(256);

  doc["device_id"] = currentData.deviceID;
  doc["type"] = "actuator";

  JsonObject caps = doc.createNestedObject("capabilities");
  caps["fan"] = true;
  caps["servo"] = true;
  caps["pwm"] = true;
  caps["leds"] = true;

  doc["online"] = true;

  String payload;
  serializeJson(doc, payload);

  String topic = "grainhero/sensors/" + currentData.deviceID + "/status";

  mqttClient.publish(topic.c_str(), payload.c_str(), true); // retained

  Serial.println(F("📡 Device status published"));
}

void updateStatusLED() {
  static unsigned long lastBlink = 0;
  const unsigned long interval = 500; // 500 ms blink
  unsigned long currentMillis = millis();

  if (currentMillis - lastBlink >= interval) {
    lastBlink = currentMillis;
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }
}

String getTimestampString() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "19700101_000000";
  }

  char buffer[20];
  strftime(buffer, sizeof(buffer), "%Y%m%d_%H%M%S", &timeinfo);
  return String(buffer);
}

void displayAllReadings() {
  Serial.println(F("=== SENSOR READINGS ==="));
  Serial.print(F("Time: "));
  Serial.println(currentData.dateTime);
  Serial.print(F("Device ID: "));
  Serial.println(currentData.deviceID);

  Serial.println(F("\n--- Environment ---"));
  Serial.printf("Temperature: %.2f °C\n", currentData.temperature);
  Serial.printf("Humidity: %.2f %%\n", currentData.humidity);
  Serial.printf("Pressure: %.2f hPa\n", currentData.pressure);
  Serial.printf("TVOC: %.0f ppb (%s)\n", currentData.tvoc_approx,
                currentData.air_quality.c_str());

  Serial.println(F("\n--- Additional Sensors ---"));
  Serial.printf("Soil Moisture: %d %% (%s)\n", currentData.soil_percentage,
                currentData.soil_status.c_str());
  Serial.printf("Light Level: %d %% (%s)\n", currentData.light_percentage,
                currentData.light_status.c_str());

  Serial.println(F("\n--- Control Outputs ---"));
  Serial.printf("Servo (Lid): %s (Angle: %d°)\n",
                servoState ? "OPEN" : "CLOSED", servoCurrentAngle);
  Serial.printf("PWM (GPIO 26): %d%%\n", pwmSpeed);
  Serial.printf("LED2: %s\n", led2State ? "ON" : "OFF");
  Serial.printf("LED3: %s\n", led3State ? "ON" : "OFF");
  Serial.printf("LED4 (GPIO 25): %s\n", led4State ? "ON" : "OFF");

  Serial.println(F("\n--- System Status ---"));
  Serial.print(F("WiFi: "));
  Serial.println(wifiConnected ? "Connected" : "Disconnected");
  Serial.print(F("SD Card: "));
  Serial.println(sdCardAvailable ? "Available" : "Not Available");
  Serial.print(F("Last Firebase: "));
  Serial.print(millis() - lastFirebaseUpload);
  Serial.println(F(" ms ago"));
}

void establishBaseline() {
  Serial.println(F("Establishing baseline for BME680..."));

  float total_gas = 0;
  int valid_readings = 0;

  for (int i = 0; i < BASELINE_READINGS; i++) {
    unsigned long endTime = bme.beginReading();
    if (endTime != 0) {
      delay(50);
      if (bme.endReading()) {
        total_gas += bme.gas_resistance;
        valid_readings++;

        Serial.print(F("Baseline "));
        Serial.print(i + 1);
        Serial.print(F("/"));
        Serial.print(BASELINE_READINGS);
        Serial.print(F(": "));
        Serial.print(bme.gas_resistance / 1000.0);
        Serial.println(F(" KOhms"));
      }
    }
    delay(2000);
  }

  if (valid_readings > 0) {
    baseline_gas = total_gas / valid_readings;
    Serial.print(F("\nBaseline established: "));
    Serial.print(baseline_gas / 1000.0);
    Serial.println(F(" KOhms\n"));
  }
}
