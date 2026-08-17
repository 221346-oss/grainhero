# IOT-INTERNEE Tasks

### ✅ Task 0.1 — Remove Hardcoded WiFi Secrets [IOT-INTERNEE] [DONE]

**Status: COMPLETED.** `grainhero_updated_ino.ino` has already been updated.

**What was done:**
- Added `#include <WiFiManager.h>` to the firmware includes.
- Replaced `WiFi.begin("Wokwi-GUEST", "")` with:

```cpp
WiFiManager wifiManager;
// Creates a hotspot called "GrainHero_Silo_Setup".
// Connect any phone to it to pick the local farm WiFi.
wifiManager.autoConnect("GrainHero_Silo_Setup");
```

**What this means in practice:**
When the ESP32 boots without a known WiFi network, it broadcasts a hotspot called
`GrainHero_Silo_Setup`. A phone connects to it, a browser auto-opens, the operator
selects the farm WiFi + enters the password. Credentials save permanently in ESP32 flash.

**Library to install (if not already):**
1. Arduino IDE 2.x → Left sidebar **Library Manager** icon (book).
2. Search: `WiFiManager`
3. Install: **WiFiManager by tzapu** (version 2.0.17 or latest).


</details>



### ✅ Task 0.2 — Verify Pest Sensor is Live [IOT-INTERNEE]

**Why this matters:** `Pest_Presence` has the highest SHAP impact in the ML model.
Previously hardcoded to `0.0` — making the AI completely blind to pests.

**Good news:** The updated firmware already has this fixed via `computePestMoldRisk()`.
This function reads the BME680 gas resistance, maps it to a TVOC estimate, then
combines it with humidity, temperature, and soil moisture to produce a 0.0–1.0 pest score.

**Steps to verify it is working:**

1. Open `docs/firmware/grainhero_updated_ino.ino`.
2. Find `void processTVOCData()` (around line 236).
3. Confirm this line exists: `cd.pest_presence = pestRiskLabel;`
4. Find `computePestMoldRisk()` (around line 225). Confirm the scoring logic is present.
5. Find the JSON payload builder and confirm `pest_presence` is in the MQTT/Firebase payload.
6. Flash the board. Open **Tools → Serial Monitor** at **115200 baud**.
7. You should see:
   ```
   Pest Risk: 0.12 (Low)
   ```
   If you see this output, Task 0.2 is complete.


</details>



### 🟢 Task 6.0 — Prototype Sensor Documentation [IOT-INTERNEE]
**What this does:** Document the new sensors added to the custom PCB (e.g., CO2, internal grain temp vs ambient temp), their assigned GPIO pins, and the exact new JSON keys to add to the MQTT payload.



### 🟢 Task 6.2 — Multi-Grain Protocol Testing [IOT-INTERNEE]
**What this does:** Proves the ML pipeline handles different grains correctly.
- Configure Silo A with `grain_type: "wheat"`
- Configure Silo B with `grain_type: "rice"`
- Run both simultaneously. Verify the dashboard routes data correctly and the ML service returns different risk scores.



### 🟢 Task 6.3 — New Prototype Integration Test [IOT-INTERNEE]
**What this does:** Run the old DOIT ESP32 prototype side-by-side with the new custom PCB for 2 weeks in the same silo. Compare MQTT outputs to ensure sensor calibration matches before decommissioning the old hardware.



