#include <Adafruit_Sensor.h>
#include <Adafruit_BME680.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <FS.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <PubSubClient.h>
#include <SD.h>
#include <SPI.h>
#include <Update.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include <Wire.h>
#include <math.h>
#include <time.h>

#include "secrets.h"

// ================================ CONFIGURATION
// ================================
#define MQTT_BROKER "x106c611.ala.asia-southeast1.emqxsl.com"
#define MQTT_PORT 8883
// MQTT_USERNAME and MQTT_PASSWORD now come from secrets.h
#define AUTH_TOKEN "GrainHero_Secret_2026"
#define FIXED_DEVICE_ID "004B12387760"
#define FW_VERSION "1.0.0"
#define OTA_API_URL "http://10.10.60.54:8000/grainhero_updated_ino.ino.bin"
#define BACKEND_BASE_URL "http://192.168.100.229:5000/api/iot"
#define FIREBASE_HOST "smart-silo-8ce12-default-rtdb.firebaseio.com"
// FIREBASE_AUTH now comes from secrets.h

// Pins
#define DHTPIN1 15
#define DHTPIN2 13
#define DHTTYPE DHT11
#define LDR_PIN 35
#define SOIL_MOISTURE_PIN 34
#define SERVO_PIN 27
#define PWM_PIN 26
#define LED2_PIN 14
#define LED3_PIN 12
#define LED4_PIN 25
#define LED_PIN 2
#define SD_CS 5, SD_MOSI 23, SD_MISO 19, SD_SCK 18

// Soil calibration
#define SOIL_DRY 3000
#define SOIL_WET 1500
#define N_READS 5

// Servo angles
#define SERVO_CLOSED 100
#define SERVO_OPEN 170

// Intervals (ms)
#define MQTT_PUB_INTERVAL 2000UL
#define SERIAL_TEL_INTERVAL 2000UL
#define FIREBASE_INTERVAL 5000UL
#define CONTROL_INTERVAL 2000UL
#define OTA_INTERVAL 30000UL
#define SERVO_COOLDOWN 1000UL
#define LID_DELAY_MS 1500UL
#define HUMAN_OVERRIDE_TO 600000UL // 10 min
#define MIN_SAFE_MS 3000UL
#define DEBOUNCE_MS 1000UL

#define SEALEVELPRESSURE_HPA 1013.25
#define MAX_SAFE_OUTSIDE_HUM 80.0

// Root CA for EMQX TLS
const char EMQX_ROOT_CA[] PROGMEM = R"PEM(
-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMWLSn/pvtsrF9+wX3N3KjITOYFnQoQj8kVnNeyIv/iPsGEMNKSuIEyExtv4
NeF22d+mQrvHRAiGfzZ0JFrabA0UWTW98kndth/Jsw1HKj2ZL7tcu7XUIOGZX1NG
Fdtom/DzMNU+MeKNhJ7jitralj41E6Vf8PlwUHBHQRFXGU7Aj64GxJUTFy8bJZ91
8rGOmaFvE7FBcf6IKshPECBV1/MUReXgRPTqh5Uykw7+U0b6LJ3/iyK5S9kJRaTe
pLiaWN0bfVKfjllDiIGknibVb63dDcY3fe0Dkhvld1927jyNxF1WW6LZZm6zNTfl
MrY=
-----END CERTIFICATE-----
)PEM";

// ================================ GLOBALS ================================
struct SensorData {
  float temperature, pressure, humidity, gas_resistance, altitude, tvoc_approx;
  float dht1_temp, dht1_humidity, dht2_temp, dht2_humidity;
  float dew_point;
  int soil_raw, soil_percentage, ldr_raw, light_percentage, pwm;
  bool servo, led2, led3, led4, lastFanDecision = false;
  String air_quality, soil_status, light_status, pest_presence;
  String dateTime, deviceID, grain_type;
  unsigned long timestamp;
} cd; // currentData abbreviated

// State flags
bool wifiConnected, sdCardAvailable, servoInitialized;
bool servoState, lidIsOpen, humanOverrideActive, humanRequestedFan;
bool mlRequestedFan, fumigationLockdown, lastFanDecision;
bool led2State, led3State, led4State;
int servoCurrentAngle = SERVO_CLOSED, pwmSpeed, targetFanSpeed = 60;

// Timing
unsigned long lastMQTTPublish, lastSerialTelemetry, lastFirebaseUpload;
unsigned long lastControlCheck, lastServoAction, lastHumanCommandTime;
unsigned long lastDecisionChangeAt, lidLastOpenedAt, fanLastStartedAt;
unsigned long lastCloudHeartbeat;

// Soil SMA buffer
int soilBuffer[N_READS], soilIndex;

// SD / CSV
bool sdLoggingEnabled = false;
String csvFileName;
File dataFile;
float baseline_gas;

// Environment placeholders
bool isRaining = false;
float outsideHumidity = 50.0;

// Pest risk
float pestRiskScore;
String pestRiskLabel = "None";

// Control mode / state machine
enum ControlMode { AUTO, MANUAL } controlMode = AUTO;
enum LidFanState {
  STATE_IDLE_CLOSED,
  STATE_OPENING_LID,
  STATE_FAN_RUNNING,
  STATE_STOPPING_FAN
} currentState = STATE_IDLE_CLOSED;

// Objects
Adafruit_BME680 bme;
DHT dht1(DHTPIN1, DHTTYPE), dht2(DHTPIN2, DHTTYPE);
Servo lidServo;
ESP32PWM pwm;
WiFiClientSecure client, espClient;
PubSubClient mqttClient(espClient);

// ================================ HELPERS ================================
float mapFloat(float x, float a, float b, float c, float d) {
  return (x - a) * (d - c) / (b - a) + c;
}

String getDateTimeString() {
  struct tm ti;
  if (!getLocalTime(&ti))
    return "1970-01-01 00:00:00";
  char buf[20];
  strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &ti);
  return String(buf);
}

String getTimestampString() {
  struct tm ti;
  if (!getLocalTime(&ti))
    return "19700101_000000";
  char buf[20];
  strftime(buf, sizeof(buf), "%Y%m%d_%H%M%S", &ti);
  return String(buf);
}

// Simple HTTP POST helper
void httpPost(const String &url, const String &payload) {
  if (WiFi.status() != WL_CONNECTED)
    return;
  HTTPClient http;
  http.begin(url);
  http.setTimeout(5000);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(payload);
  Serial.printf("[HTTP] POST %s → %d\n", url.c_str(), code);
  http.end();
}

// ================================ SENSORS ================================
int readSoil() {
  soilBuffer[soilIndex] = analogRead(SOIL_MOISTURE_PIN);
  soilIndex = (soilIndex + 1) % N_READS;
  long s = 0;
  for (int i = 0; i < N_READS; i++)
    s += soilBuffer[i];
  return constrain((int)map(s / N_READS, SOIL_WET, SOIL_DRY, 100, 0), 0, 100);
}

void readAllSensors() {
  if (bme.beginReading()) {
    delay(50);
    if (bme.endReading()) {
      cd.temperature = bme.temperature;
      cd.pressure = bme.pressure / 100.0;
      cd.humidity = bme.humidity;
      cd.gas_resistance = bme.gas_resistance;
      cd.altitude = bme.readAltitude(SEALEVELPRESSURE_HPA);
    }
  }

  auto readDHT = [](DHT &d, float &t, float &h) {
    t = d.readTemperature();
    h = d.readHumidity();
    if (isnan(t) || isnan(h)) {
      t = h = -999;
    }
  };
  readDHT(dht1, cd.dht1_temp, cd.dht1_humidity);
  readDHT(dht2, cd.dht2_temp, cd.dht2_humidity);

  cd.soil_raw = analogRead(SOIL_MOISTURE_PIN);
  cd.soil_percentage = readSoil();
  cd.soil_status = cd.soil_percentage >= 70   ? "Dry"
                   : cd.soil_percentage >= 40 ? "Normal"
                   : cd.soil_percentage >= 20 ? "Moist"
                                              : "Saturated";

  cd.ldr_raw = analogRead(LDR_PIN);
  cd.light_percentage =
      constrain((int)map(cd.ldr_raw, 4095, 100, 100, 0), 0, 100);
  cd.light_status = cd.light_percentage < 20   ? "Dark"
                    : cd.light_percentage < 60 ? "Normal"
                                               : "Bright";
}

// ================================ TVOC / PEST ================================
void computePestMoldRisk(float tvoc, float hum, float temp, int soil) {
  float s = 0;
  s += tvoc > 1000  ? 0.40
       : tvoc > 500 ? 0.30
       : tvoc > 250 ? 0.20
       : tvoc > 100 ? 0.08
                    : 0;
  s += hum > 80 ? 0.25 : hum > 70 ? 0.18 : hum > 65 ? 0.10 : 0;
  s += temp > 35   ? 0.18
       : temp > 30 ? 0.20
       : temp > 25 ? 0.12
       : temp > 20 ? 0.05
                   : 0;
  float mc = 25.0 - (soil / 100.0) * 17.0;
  s += mc > 18 ? 0.15 : mc > 15 ? 0.12 : mc > 14 ? 0.08 : mc > 13 ? 0.03 : 0;
  pestRiskScore = constrain(s, 0.0, 1.0);
  pestRiskLabel = s >= 0.6    ? "High"
                  : s >= 0.35 ? "Medium"
                  : s >= 0.15 ? "Low"
                              : "None";
}

void processTVOCData() {
  if (cd.gas_resistance <= 0) {
    cd.tvoc_approx = -999;
    cd.air_quality = "Invalid";
    return;
  }
  float g = cd.gas_resistance / 1000.0;
  if (g > 100) {
    cd.tvoc_approx = mapFloat(g, 100, 200, 0, 100);
    cd.air_quality = "Excellent";
  } else if (g > 60) {
    cd.tvoc_approx = mapFloat(g, 60, 100, 100, 250);
    cd.air_quality = "Good";
  } else if (g > 40) {
    cd.tvoc_approx = mapFloat(g, 40, 60, 250, 500);
    cd.air_quality = "Moderate";
  } else if (g > 20) {
    cd.tvoc_approx = mapFloat(g, 20, 40, 500, 1000);
    cd.air_quality = "Poor";
  } else {
    cd.tvoc_approx = mapFloat(g, 10, 20, 1000, 2000);
    cd.air_quality = "Unhealthy";
  }

  cd.tvoc_approx *= 1.0 + (cd.humidity - 50.0) * 0.01;
  const float a = 17.27, b = 237.7;
  float al =
      (a * cd.temperature / (b + cd.temperature)) + log(cd.humidity / 100.0);
  cd.dew_point = (b * al) / (a - al);
  computePestMoldRisk(cd.tvoc_approx, cd.humidity, cd.temperature,
                      cd.soil_percentage);
  cd.pest_presence = pestRiskLabel;
}

// ================================ SERVO / FAN ================================
void moveServoCommand(bool open) {
  if (!servoInitialized || millis() - lastServoAction < SERVO_COOLDOWN)
    return;
  int target = open ? SERVO_OPEN : SERVO_CLOSED;
  if (servoCurrentAngle == target)
    return;
  int step = open ? 1 : -1;
  for (int a = servoCurrentAngle; a != target; a += step) {
    lidServo.write(a);
    delay(15);
  }
  servoCurrentAngle = target;
  lastServoAction = millis();
  servoState = lidIsOpen = open;
  Serial.printf("Servo → %s\n", open ? "OPEN" : "CLOSED");
}

void setPWMSpeed(int pct) {
  if (!lidIsOpen) {
    pct = 0;
    Serial.println(F("⚠️ Fan blocked: lid closed"));
  }
  pwmSpeed = constrain(pct, 0, 100);
  pwm.write(pwmSpeed / 100.0);
}

bool fanRequested() {
  bool raw = !isRaining && outsideHumidity <= MAX_SAFE_OUTSIDE_HUM &&
             cd.temperature <= 60.0 && cd.tvoc_approx <= 1000.0 &&
             (humanOverrideActive ? humanRequestedFan : mlRequestedFan);
  unsigned long now = millis();
  if (raw != lastFanDecision) {
    if (now - lastDecisionChangeAt < DEBOUNCE_MS)
      return lastFanDecision;
    lastDecisionChangeAt = now;
    lastFanDecision = raw;
  }
  return lastFanDecision;
}

void processLidFanStateMachine() {
  bool want = fanRequested();
  unsigned long now = millis();
  switch (currentState) {
  case STATE_IDLE_CLOSED:
    if (want) {
      moveServoCommand(true);
      lidLastOpenedAt = now;
      currentState = STATE_OPENING_LID;
    }
    break;
  case STATE_OPENING_LID:
    if (now - lidLastOpenedAt >= LID_DELAY_MS)
      currentState = STATE_FAN_RUNNING;
    break;
  case STATE_FAN_RUNNING:
    setPWMSpeed(targetFanSpeed);
    if (!want) {
      fanLastStartedAt = now;
      setPWMSpeed(0);
      currentState = STATE_STOPPING_FAN;
    }
    break;
  case STATE_STOPPING_FAN:
    if (now - fanLastStartedAt >= LID_DELAY_MS) {
      moveServoCommand(false);
      currentState = STATE_IDLE_CLOSED;
    }
    break;
  }
}

// ================================ MQTT ================================
void publishDeviceStatus();
void mqttCallback(char *topic, byte *payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++)
    msg += (char)payload[i];
  DynamicJsonDocument doc(512);
  if (deserializeJson(doc, msg))
    return;
  if (!doc.containsKey("api_key") || doc["api_key"] != AUTH_TOKEN) {
    Serial.println(F("❌ Invalid API key"));
    return;
  }
  lastCloudHeartbeat = millis();

  // Lockdown
  String action = doc["action"] | "";
  if (action == "lockdown") {
    fumigationLockdown = true;
    controlMode = MANUAL;
    humanOverrideActive = false;
    targetFanSpeed = 0;
    humanRequestedFan = false;
    Serial.println(F("🔒 Fumigation lockdown"));
    return;
  }
  if (action == "release_lockdown") {
    fumigationLockdown = false;
    Serial.println(F("🔓 Lockdown released"));
    return;
  }
  if (fumigationLockdown) {
    Serial.println(F("⚠️ Command ignored: lockdown"));
    return;
  }

  // Servo intent
  if (doc.containsKey("servo")) {
    controlMode = MANUAL;
    humanOverrideActive = true;
    lastHumanCommandTime = millis();
    humanRequestedFan = (doc["servo"].as<String>() == "OPEN");
  }

  // Fan actions
  int val = doc["value"] | 0;
  if (action == "turn_on") {
    controlMode = MANUAL;
    humanOverrideActive = true;
    humanRequestedFan = true;
    targetFanSpeed = val > 0 ? val : 60;
    lastHumanCommandTime = millis();
  }
  if (action == "turn_off") {
    controlMode = MANUAL;
    humanOverrideActive = true;
    humanRequestedFan = false;
    targetFanSpeed = 0;
    lastHumanCommandTime = millis();
  }
  if (action == "set_value" && !doc.containsKey("led2") &&
      !doc.containsKey("led3") && !doc.containsKey("led4")) {
    controlMode = MANUAL;
    humanOverrideActive = true;
    targetFanSpeed = val;
    humanRequestedFan = val > 0;
    lastHumanCommandTime = millis();
  }
  if (action == "auto") {
    humanOverrideActive = false;
    controlMode = AUTO;
    Serial.println(F("🔄 AUTO mode"));
  }

  // LEDs
  auto setLED = [&](const char *key, bool &state, int pin) {
    if (doc.containsKey(key)) {
      state = doc[key];
      digitalWrite(pin, state);
    }
  };
  setLED("led2", led2State, LED2_PIN);
  setLED("led3", led3State, LED3_PIN);
  setLED("led4", led4State, LED4_PIN);
}

void initializeMQTT() {
  if (WiFi.status() != WL_CONNECTED)
    return;
  espClient.setCACert(EMQX_ROOT_CA);
  mqttClient.setBufferSize(1024);
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  for (int i = 0; i < 10 && !mqttClient.connected(); i++) {
    if (mqttClient.connect(cd.deviceID.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      String t = "grainhero/actuators/" + cd.deviceID + "/control";
      mqttClient.subscribe(t.c_str());
      Serial.println(F("✅ MQTT connected"));
      publishDeviceStatus();
    } else {
      delay(1000);
    }
  }
}

void publishToMQTT() {
  if (!mqttClient.connected())
    return;
  DynamicJsonDocument doc(768);
  JsonObject r = doc.createNestedObject("readings");
  r["temperature"] = cd.temperature;
  r["humidity"] = cd.humidity;
  r["pressure"] = cd.pressure;
  r["tvoc"] = cd.tvoc_approx;
  r["grain_type"] = cd.grain_type;
  doc["device_id"] = cd.deviceID;
  doc["api_key"] = AUTH_TOKEN;
  doc["battery_level"] = 98;
  doc["signal_strength"] = -60;
  doc["timestamp"] = cd.dateTime;
  doc["timestamp_unix"] = cd.timestamp;
  doc["control_authority"] = humanOverrideActive ? "HUMAN" : "ML_AUTO";
  doc["fanState"] = pwmSpeed > 0 ? "on" : "off";
  doc["lidState"] = lidIsOpen ? "open" : "closed";
  doc["pwm_speed"] = pwmSpeed;
  doc["mlDecision"] = mlRequestedFan ? "fan_on" : "idle";
  String pl;
  serializeJson(doc, pl);
  mqttClient.publish(("grainhero/sensors/" + cd.deviceID + "/readings").c_str(),
                     pl.c_str());
}

void publishDeviceStatus() {
  if (!mqttClient.connected())
    return;
  DynamicJsonDocument doc(256);
  doc["device_id"] = cd.deviceID;
  doc["type"] = "actuator";
  doc["online"] = true;
  JsonObject c = doc.createNestedObject("capabilities");
  c["fan"] = c["servo"] = c["pwm"] = c["leds"] = true;
  String pl;
  serializeJson(doc, pl);
  mqttClient.publish(("grainhero/sensors/" + cd.deviceID + "/status").c_str(),
                     pl.c_str(), true);
}

void publishSerialTelemetry() {
  DynamicJsonDocument doc(256);
  doc["temperature"] = cd.temperature;
  doc["humidity"] = cd.humidity;
  doc["tvoc"] = cd.tvoc_approx;
  doc["fanState"] = pwmSpeed > 0 ? "on" : "off";
  doc["lidState"] = lidIsOpen ? "open" : "closed";
  doc["mlDecision"] = mlRequestedFan ? "fan_on" : "idle";
  doc["timestamp"] = cd.timestamp;
  String o;
  serializeJson(doc, o);
  Serial.println(o);
}

// ================================ FIREBASE ================================
void publishToFirebaseREST() {
  if (!wifiConnected ||
      (millis() - lastFirebaseUpload < FIREBASE_INTERVAL && lastFirebaseUpload))
    return;
  lastFirebaseUpload = millis();

  DynamicJsonDocument j(2048);
  j["timestamp"] = j["timestamp_unix"] = cd.timestamp;
  j["datetime"] = cd.dateTime;
  j["device_id"] = cd.deviceID;
  j["grain_type"] = cd.grain_type;
  j["temperature"] = cd.temperature;
  j["pressure"] = cd.pressure;
  j["humidity"] = cd.humidity;
  j["gas_resistance"] = cd.gas_resistance / 1000.0;
  j["tvoc_ppb"] = cd.tvoc_approx;
  j["air_quality"] = cd.air_quality;
  j["altitude"] = cd.altitude;
  j["control_mode"] = controlMode == AUTO ? "AUTO" : "MANUAL";
  j["human_override"] = humanOverrideActive;
  j.createNestedObject("dht1")["temperature"] = cd.dht1_temp;
  j["dht1"]["humidity"] = cd.dht1_humidity;
  j.createNestedObject("dht2")["temperature"] = cd.dht2_temp;
  j["dht2"]["humidity"] = cd.dht2_humidity;
  JsonObject sm = j.createNestedObject("soil_moisture");
  sm["raw"] = cd.soil_raw;
  sm["percentage"] = cd.soil_percentage;
  sm["status"] = cd.soil_status;
  JsonObject ls = j.createNestedObject("light_sensor");
  ls["raw"] = cd.ldr_raw;
  ls["percentage"] = cd.light_percentage;
  ls["status"] = cd.light_status;
  j["servo_state"] = servoState;
  j["pwm_speed"] = pwmSpeed;
  j["led2_state"] = led2State;
  j["led3_state"] = led3State;
  j["led4_state"] = led4State;
  j["servo_angle"] = servoCurrentAngle;
  String body;
  serializeJson(j, body);

  String path = "/sensor_data/" + cd.deviceID +
                "/latest.json?auth=" + String(FIREBASE_AUTH);
  if (!client.connect(FIREBASE_HOST, 443)) {
    Serial.println(F("Firebase connect failed"));
    return;
  }
  client.printf(
      "PUT %s HTTP/1.1\r\nHost: %s\r\nContent-Type: "
      "application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n",
      path.c_str(), FIREBASE_HOST, body.length());
  client.print(body);

  unsigned long t = millis();
  while (!client.available() && millis() - t < 5000)
    ;
  bool ok = false;
  while (client.available()) {
    String l = client.readStringUntil('\r');
    if (l.startsWith("HTTP/1.1") &&
        (l.indexOf("200") > 0 || l.indexOf("204") > 0))
      ok = true;
  }
  client.stop();

  if (ok && WiFi.status() == WL_CONNECTED) {
    // Dual-write to backend
    DynamicJsonDocument id(1024);
    id["device_id"] = cd.deviceID;
    id["timestamp"] = cd.timestamp;
    JsonObject ir = id.createNestedObject("readings");
    ir["temperature"] = cd.temperature;
    ir["humidity"] = cd.humidity;
    ir["tvoc"] = cd.tvoc_approx;
    ir["pressure"] = cd.pressure;
    ir["gas_resistance"] = cd.gas_resistance / 1000.0;
    ir["altitude"] = cd.altitude;
    ir["air_quality"] = cd.air_quality;
    ir["soil_moisture_raw"] = cd.soil_raw;
    ir["soil_moisture_pct"] = cd.soil_percentage;
    ir["light_raw"] = cd.ldr_raw;
    ir["light_pct"] = cd.light_percentage;
    ir["pwm_speed"] = pwmSpeed;
    ir["servo_state"] = servoState;
    ir["alarm_state"] = led4State ? "on" : "off";
    ir["dew_point"] = cd.dew_point;
    ir["dew_point_gap"] = cd.temperature - cd.dew_point;
    String pl;
    serializeJson(id, pl);
    httpPost(String(BACKEND_BASE_URL) + "/mqtt-ingest", pl);
  }
}

void checkFirebaseControls() {
  if (!wifiConnected ||
      (millis() - lastControlCheck < CONTROL_INTERVAL && lastControlCheck))
    return;
  lastControlCheck = millis();

  String path =
      "/control/" + cd.deviceID + ".json?auth=" + String(FIREBASE_AUTH);
  if (!client.connect(FIREBASE_HOST, 443))
    return;
  client.printf("GET %s HTTP/1.1\r\nHost: %s\r\nConnection: close\r\n\r\n",
                path.c_str(), FIREBASE_HOST);

  unsigned long t = millis();
  while (!client.available() && millis() - t < 5000)
    ;
  String resp = "";
  bool inBody = false;
  while (client.available()) {
    String l = client.readStringUntil('\r');
    if (l == "\n" && !inBody)
      inBody = true;
    else if (inBody)
      resp += l;
  }
  client.stop();

  if (!resp.length() || resp == "null")
    return;
  DynamicJsonDocument doc(512);
  if (deserializeJson(doc, resp))
    return;

  servoState = doc["servo"] | false;
  pwmSpeed = doc["pwm"] | 0;
  led2State = doc["led2"] | false;
  led3State = doc["led3"] | false;
  led4State = doc["led4"] | false;

  // Sync to currentData
  cd.servo = servoState;
  cd.pwm = pwmSpeed;
  cd.led2 = led2State;
  cd.led3 = led3State;
  cd.led4 = led4State;

  // Dual-write control state
  DynamicJsonDocument cd2(256);
  cd2["deviceID"] = cd.deviceID;
  cd2["servo"] = servoState;
  cd2["pwm"] = pwmSpeed;
  cd2["led2"] = led2State;
  cd2["led3"] = led3State;
  cd2["led4"] = led4State;
  String cp;
  serializeJson(cd2, cp);
  httpPost(String(BACKEND_BASE_URL) + "/" + cd.deviceID + "/control_state", cp);
}

// ================================ OUTPUT / LED
// ================================
void updateControlOutputs() {
  digitalWrite(LED2_PIN, led2State);
  digitalWrite(LED3_PIN, led3State);
  digitalWrite(LED4_PIN, led4State);

  static unsigned long lastFb = 0;
  if (mqttClient.connected() && millis() - lastFb > 2000) {
    lastFb = millis();
    DynamicJsonDocument fb(256);
    fb["servo"] = servoState;
    fb["pwm"] = pwmSpeed;
    fb["led2"] = led2State;
    fb["led3"] = led3State;
    fb["led4"] = led4State;
    fb["humanOverride"] = humanOverrideActive;
    fb["control_authority"] = humanOverrideActive       ? "HUMAN"
                              : !mqttClient.connected() ? "FAILSAFE"
                                                        : "ML_AUTO";
    String o;
    serializeJson(fb, o);
    mqttClient.publish(
        ("grainhero/actuators/" + cd.deviceID + "/feedback").c_str(),
        o.c_str());
  }
}

void updateStatusLED() {
  static unsigned long last = 0;
  if (millis() - last >= 500) {
    last = millis();
    digitalWrite(LED_PIN, !digitalRead(LED_PIN));
  }
}

// ================================ SD CARD ================================
void initializeSDCard() {
  SPI.begin(18, 19, 23, 5);
  if (SD.cardType() == CARD_NONE) {
    Serial.println(F("No SD card"));
    return;
  }
  sdCardAvailable = true;
  if (!SD.exists("/data"))
    SD.mkdir("/data");
}

void saveToSDCard() {
  if (!sdCardAvailable)
    return;
  dataFile = SD.open(csvFileName.c_str(), FILE_APPEND);
  if (!dataFile)
    return;
  dataFile.printf(
      "%lu,%s,%s,%.2f,%.2f,%.2f,%.2f,%.1f,%s,%.2f,%.2f,%.2f,%.2f,%d,%d,%s,%d,%"
      "d,%s,%s,%d,%s,%s,%s,%s,%d\n",
      cd.timestamp, cd.dateTime.c_str(), cd.deviceID.c_str(), cd.temperature,
      cd.pressure, cd.humidity, cd.gas_resistance / 1000.0, cd.tvoc_approx,
      cd.air_quality.c_str(), cd.dht1_temp, cd.dht1_humidity, cd.dht2_temp,
      cd.dht2_humidity, cd.soil_raw, cd.soil_percentage, cd.soil_status.c_str(),
      cd.ldr_raw, cd.light_percentage, cd.light_status.c_str(),
      servoState ? "ON" : "OFF", pwmSpeed, led2State ? "ON" : "OFF",
      led3State ? "ON" : "OFF", led4State ? "ON" : "OFF", cd.grain_type.c_str(),
      servoCurrentAngle);
  dataFile.close();
}

// ================================ OTA TASK ================================
void otaTask(void *) {
  vTaskDelay(pdMS_TO_TICKS(15000));
  for (;;) {
    if (WiFi.status() == WL_CONNECTED) {
      WiFiClientSecure oc;
      oc.setInsecure();
      HTTPClient http;
      http.begin(oc, String(OTA_API_URL) + "?device_id=" + cd.deviceID +
                         "&current_version=" + FW_VERSION);
      http.setTimeout(10000);
      if (http.GET() == HTTP_CODE_OK) {
        DynamicJsonDocument doc(1024);
        if (!deserializeJson(doc, http.getString())) {
          const char *ver = doc["version"] | "", *url = doc["url"] | "";
          if (strlen(ver) && strcmp(ver, FW_VERSION) && strlen(url)) {
            auto r = httpUpdate.update(oc, url);
            if (r == HTTP_UPDATE_OK)
              ESP.restart();
          }
        }
      }
      http.end();
    }
    vTaskDelay(pdMS_TO_TICKS(OTA_INTERVAL));
  }
}

// ================================ INIT HELPERS
// ================================
void initializePWM() {
  for (int i = 0; i < 4; i++)
    ESP32PWM::allocateTimer(i);
  pwm.attachPin(PWM_PIN, 1000, 10);
  Serial.println(F("PWM initialized"));
}

void initializeBME680() {
  if (!bme.begin()) {
    Serial.println(F("BME680 not found!"));
    while (1)
      ;
  }
  bme.setTemperatureOversampling(BME680_OS_8X);
  bme.setHumidityOversampling(BME680_OS_2X);
  bme.setPressureOversampling(BME680_OS_4X);
  bme.setIIRFilterSize(BME680_FILTER_SIZE_3);
  bme.setGasHeater(320, 150);
}

void establishBaseline() {
  float total = 0;
  int valid = 0;
  Serial.println(F("Establishing baseline..."));
  for (int i = 0; i < 30; i++) {
    if (bme.beginReading()) {
      delay(50);
      if (bme.endReading()) {
        total += bme.gas_resistance;
        valid++;
      }
    }
    delay(2000);
  }
  if (valid) {
    baseline_gas = total / valid;
    Serial.printf("Baseline: %.2f kOhms\n", baseline_gas / 1000.0);
  }
}

void initializeWiFi() {
  WiFiManager wifiManager;
  // Creates a WiFi network called "GrainHero_Silo_Setup".
  // Connect with phone to select the local farm WiFi.
  wifiManager.autoConnect("GrainHero_Silo_Setup");

  wifiConnected = WiFi.status() == WL_CONNECTED;
  if (wifiConnected) {
    Serial.print(F("WiFi: "));
    Serial.println(WiFi.localIP());
    initializeMQTT();
  }
}

// ================================ SETUP ================================
void setup() {
  Serial.begin(115200);
  for (int p : {LED_PIN, PWM_PIN, LED2_PIN, LED3_PIN, LED4_PIN}) {
    pinMode(p, OUTPUT);
    digitalWrite(p, LOW);
  }

  initializePWM();
  pinMode(SERVO_PIN, OUTPUT);
  lidServo.attach(SERVO_PIN, 500, 2400);
  moveServoCommand(false);
  delay(2500);
  servoInitialized = true;

  cd.deviceID = FIXED_DEVICE_ID;
  cd.grain_type = "Rice";

  initializeSDCard();
  initializeWiFi();

  configTime(5 * 3600, 0, "pool.ntp.org");
  struct tm ti;
  unsigned long ns = millis();
  while (!getLocalTime(&ti) && millis() - ns < 10000)
    delay(500);

  client.setInsecure(); // Firebase REST client

  initializeBME680();
  dht1.begin();
  dht2.begin();
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(LDR_PIN, INPUT);

  if (sdCardAvailable) {
    csvFileName = "/data/sensor_data_" + getTimestampString() + ".csv";
    dataFile = SD.open(csvFileName.c_str(), FILE_WRITE);
    if (dataFile) {
      dataFile.println(
          "timestamp,datetime,device_id,temperature_C,pressure_hPa,humidity_"
          "percent,"
          "gas_kOhms,tvoc_ppb,air_quality,dht1_temp,dht1_hum,dht2_temp,dht2_"
          "hum,"
          "soil_raw,soil_pct,soil_status,ldr_raw,light_pct,light_status,"
          "servo,pwm,led2,led3,led4,grain_type,servo_angle");
      dataFile.close();
    }
  }

  establishBaseline();

  // Backend: metadata + baseline
  if (WiFi.status() == WL_CONNECTED) {
    DynamicJsonDocument m(256);
    m["deviceID"] = cd.deviceID;
    m["mac_address"] = WiFi.macAddress();
    m["sensors"] = 4;
    String mp;
    serializeJson(m, mp);
    httpPost(String(BACKEND_BASE_URL) + "/" + cd.deviceID + "/metadata", mp);

    DynamicJsonDocument b(128);
    b["deviceID"] = cd.deviceID;
    b["baseline_gas_kOhms"] = baseline_gas / 1000.0;
    String bp;
    serializeJson(b, bp);
    httpPost(String(BACKEND_BASE_URL) + "/" + cd.deviceID + "/ml_baseline", bp);
  }

  xTaskCreatePinnedToCore(otaTask, "otaTask", 8192, NULL, 1, NULL, 0);
  Serial.println(F("=== INIT COMPLETE ==="));
}

// ================================ LOOP ================================
void loop() {
  // Human override expiry
  if (humanOverrideActive &&
      millis() - lastHumanCommandTime > HUMAN_OVERRIDE_TO) {
    humanOverrideActive = false;
    controlMode = AUTO;
    Serial.println(F("⏱ Override expired → AUTO"));
  }

  readAllSensors();
  processTVOCData();

  // NTP guard
  static unsigned long ntpWait = 0;
  if (time(nullptr) < 1700000000) {
    if (!ntpWait)
      ntpWait = millis();
    if (millis() - ntpWait < 10000) {
      delay(500);
      return;
    }
  }

  // Heat emergency
  if (cd.temperature >= 35.0 && !fumigationLockdown) {
    mlRequestedFan = true;
    targetFanSpeed = 100;
    humanOverrideActive = true;
    humanRequestedFan = true;
  } else if (!mqttClient.connected() &&
             millis() - lastCloudHeartbeat > 1800000UL) {
    mlRequestedFan = cd.tvoc_approx > 600;
    targetFanSpeed = mlRequestedFan ? 80 : 0;
  }

  cd.dateTime = getDateTimeString();
  cd.timestamp = (unsigned long)time(nullptr);

  if (wifiConnected) {
    if (mqttClient.connected())
      mqttClient.loop();
    else
      initializeMQTT();
  }

  checkFirebaseControls();
  updateControlOutputs();

  if (!humanOverrideActive) {
    mlRequestedFan = cd.tvoc_approx > 600 || cd.humidity > 75;
    targetFanSpeed = mlRequestedFan ? 80 : 0;
  }

  processLidFanStateMachine();
  publishToFirebaseREST();

  if (millis() - lastMQTTPublish > MQTT_PUB_INTERVAL) {
    publishToMQTT();
    lastMQTTPublish = millis();
  }
  if (millis() - lastSerialTelemetry > SERIAL_TEL_INTERVAL) {
    publishSerialTelemetry();
    lastSerialTelemetry = millis();
  }

  // Inline display (condensed)
  Serial.printf("[%s] T:%.1f H:%.1f TVOC:%.0f Lid:%s Fan:%d%% Pest:%s\n",
                cd.dateTime.c_str(), cd.temperature, cd.humidity,
                cd.tvoc_approx, lidIsOpen ? "OPEN" : "CLOSED", pwmSpeed,
                cd.pest_presence.c_str());

  saveToSDCard();
  updateStatusLED();
  Serial.println(F("---"));
  delay(500);
}