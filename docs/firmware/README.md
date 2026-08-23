# Firmware — ESP32 Arduino

Contains all Arduino firmware for the GrainHero IoT sensor pod.

> **Full hardware documentation**: [\_ANALYSIS/iot-hardware/06_IOT_WIRELESS_ARCHITECTURE.md](../_ANALYSIS/iot-hardware/06_IOT_WIRELESS_ARCHITECTURE.md)

---

## Files

| File                       | Description                                                         |
| -------------------------- | ------------------------------------------------------------------- |
| `grainhero_main_final.ino` | **Primary firmware** — 1,871 lines, complete working implementation |

---

## Hardware Pin Map

| Pin                   | Component             | Role                                 |
| --------------------- | --------------------- | ------------------------------------ |
| I2C (GPIO 21/22)      | Bosch BME680          | Temperature, humidity, pressure, VOC |
| GPIO 15               | DHT11 #1              | Backup temp/humidity                 |
| GPIO 13               | DHT11 #2              | Backup temp/humidity                 |
| GPIO 35 (analog)      | LDR                   | Ambient light (0–100%)               |
| GPIO 34 (analog)      | Capacitive soil probe | Grain moisture proxy (8–25%)         |
| GPIO 27 (PWM)         | Servo motor           | Lid: 100°=closed, 170°=open          |
| GPIO 26 (PWM)         | MOSFET + fan          | Fan speed 0–255 duty cycle           |
| GPIO 12               | Green LED             | Safe status                          |
| GPIO 14               | Yellow LED            | Risky status                         |
| GPIO 25               | Red LED               | Spoiled status                       |
| SPI (GPIO 5/18/19/23) | MicroSD card          | Offline CSV logging                  |

---

## MQTT Topics

| Direction      | Topic                              | Payload               | Rate             |
| -------------- | ---------------------------------- | --------------------- | ---------------- |
| ESP32 → Broker | `grainhero/devices/{id}/telemetry` | Full JSON (12 fields) | Every 5 seconds  |
| ESP32 → Broker | `grainhero/devices/{id}/heartbeat` | `{status, uptime}`    | Every 60 seconds |
| Broker → ESP32 | `grainhero/actuators/{id}/control` | `{fan_speed, led}`    | On ML prediction |

---

## Key Configuration (change before flashing)

```cpp
// Line 36: MQTT broker IP — update to your machine's local IP
const char* mqtt_server = "192.168.100.229";

// Line 25-27: WiFi credentials — move to SPIFFS config.json before production
const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASSWORD";
```

---

## Hardware v2 Roadmap

The current firmware uses WiFi. The target is LoRaWAN. See:  
[\_ANALYSIS/iot-hardware/06_IOT_WIRELESS_ARCHITECTURE.md](../_ANALYSIS/iot-hardware/06_IOT_WIRELESS_ARCHITECTURE.md)
