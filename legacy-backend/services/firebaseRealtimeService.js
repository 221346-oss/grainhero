const admin = require('firebase-admin')
const SensorDevice = require('../models/SensorDevice')
const Silo = require('../models/Silo')
const realTimeDataService = require('./realTimeDataService')

// ─── ML auto-trigger throttle (max once per 60 seconds per device) ───
const lastMLTrigger = {} // { [deviceId]: timestamp }

let initialized = false
let database = null
let subscribed = new Set()
let listeners = []

function init() {
  if (initialized) return
  let url = process.env.FIREBASE_DATABASE_URL
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  const saJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!url) throw new Error('FIREBASE_DATABASE_URL missing')
  if (!url.includes('://')) {
    url = `https://${url}`
  }
  let credential
  if (saJson) {
    credential = admin.credential.cert(JSON.parse(saJson))
  } else if (saPath) {
    credential = admin.credential.cert(require(saPath))
  } else {
    throw new Error('Service account not configured')
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential, databaseURL: url })
  }
  database = admin.database()
  initialized = true
}

async function handleLatest(deviceId, snapshot, io) {
  try {
    const payload = snapshot.val() || {}
    const mongoose = require('mongoose')
    const SensorReading = require('../models/SensorReading')

    // ─── Step 1: Route all readings to device 004B12387760 (only real silo) ───
    const DEVICE_ID = '004B12387760'
    let device = await SensorDevice.findOne({ device_id: DEVICE_ID })
    if (!device) {
      console.log(`[Firebase] Device ${DEVICE_ID} not found — auto-registering...`)

      // Find or create a default silo
      let silo = await Silo.findOne({})
      if (!silo) {
        silo = new Silo({
          name: 'Rice Storage Silo',
          silo_id: DEVICE_ID,
          capacity: 1000,
          status: 'active',
          grain_type: 'Rice',
          location: { description: 'Primary GrainHero silo with live Arduino sensor' },
          current_conditions: {},
        })
        await silo.save({ validateBeforeSave: false })
        console.log(`[Firebase] ✅ Created silo: ${silo._id}`)
      }

      // Create the sensor device
      const adminId = silo.admin_id || new mongoose.Types.ObjectId()
      device = new SensorDevice({
        device_id: DEVICE_ID,
        device_name: `GrainHero-${DEVICE_ID}`,
        device_type: 'sensor',
        category: 'environmental',
        status: 'active',
        communication_protocol: 'firebase',
        admin_id: adminId,
        silo_id: silo._id,
        sensor_types: ['temperature', 'humidity', 'voc'],
        data_transmission_interval: 10,
      })
      await device.save()
      console.log(`[Firebase] ✅ Auto-registered device: ${DEVICE_ID} → silo ${silo._id}`)
    }

    // ─── Step 2: Extract and normalize sensor values ───
    const tempVal = payload.temperature !== undefined ? Number(payload.temperature) : null
    const humVal = payload.humidity !== undefined ? Number(payload.humidity) : null
    const vocVal = payload.tvoc_ppb !== undefined ? Number(payload.tvoc_ppb)
      : (payload.voc !== undefined ? Number(payload.voc) : null)
    const pressureVal = payload.pressure !== undefined ? Number(payload.pressure) : null
    const lightPct = payload.light_pct !== undefined ? Number(payload.light_pct)
      : (payload.light !== undefined ? Number(payload.light) : null)
    const soilMoisturePct = payload.soil_moisture_pct !== undefined ? Number(payload.soil_moisture_pct) : null
    const dewPointVal = payload.dew_point !== undefined ? Number(payload.dew_point) : null
    const dewPointGap = payload.dew_point_gap !== undefined ? Number(payload.dew_point_gap) : null
    const pwmSpeedVal = payload.pwm_speed !== undefined ? Number(payload.pwm_speed) : 0
    const servoVal = payload.servo_state ? 1 : 0
    const alarmVal = payload.alarm_state === 'on' ? 1 : 0

    // Convert soil moisture → grain moisture (soil 100%=dry, 0%=wet → grain 8-25% MC)
    const grainMoisturePct = soilMoisturePct !== null
      ? Math.round((25 - (soilMoisturePct / 100) * 17) * 10) / 10 : null
    const airflowVal = pwmSpeedVal / 100.0

    // ─── Step 3: Calculate pest/mold risk score ───
    let pestScore = 0.0
    if (vocVal !== null) {
      if (vocVal > 1000) pestScore += 0.40
      else if (vocVal > 500) pestScore += 0.30
      else if (vocVal > 250) pestScore += 0.20
      else if (vocVal > 100) pestScore += 0.08
    }
    if (humVal !== null) {
      if (humVal > 80) pestScore += 0.25
      else if (humVal > 70) pestScore += 0.18
      else if (humVal > 65) pestScore += 0.10
    }
    if (tempVal !== null) {
      if (tempVal > 35) pestScore += 0.18
      else if (tempVal > 30) pestScore += 0.20
      else if (tempVal > 25) pestScore += 0.12
      else if (tempVal > 20) pestScore += 0.05
    }
    if (grainMoisturePct !== null) {
      if (grainMoisturePct > 18) pestScore += 0.15
      else if (grainMoisturePct > 15) pestScore += 0.12
      else if (grainMoisturePct > 14) pestScore += 0.08
      else if (grainMoisturePct > 13) pestScore += 0.03
    }
    pestScore = Math.min(1.0, Math.max(0.0, pestScore))

    // ─── Step 3b: LDR Leakage / Tampering Detection ───
    // Only alert when fan is OFF (pwm=0) AND lid is CLOSED (servo=0) AND light detected
    // During fan ventilation or lid open for inspection, light readings are expected — ignore
    const LDR_LEAKAGE_THRESHOLD = 5 // light % above which we consider it anomalous in a sealed silo
    const fanIsOff = pwmSpeedVal === 0
    const lidIsClosed = servoVal === 0
    const lightDetected = lightPct !== null && lightPct > LDR_LEAKAGE_THRESHOLD

    if (fanIsOff && lidIsClosed && lightDetected) {
      try {
        const GrainAlert = require('../models/GrainAlert')
        // Throttle: only create one leakage alert per 30 minutes per device
        const recentAlert = await GrainAlert.findOne({
          device_id: device._id,
          alert_type: 'leakage_detected',
          created_at: { $gte: new Date(Date.now() - 30 * 60 * 1000) }
        })
        if (!recentAlert) {
          await GrainAlert.create({
            device_id: device._id,
            silo_id: device.silo_id,
            admin_id: device.admin_id,
            alert_type: 'leakage_detected',
            severity: lightPct > 30 ? 'critical' : 'warning',
            title: '⚠️ Silo Light Leakage Detected',
            message: `LDR sensor detected ${lightPct.toFixed(1)}% light inside sealed silo (fan OFF, lid CLOSED). Possible structural breach, hole, or unauthorized opening.`,
            sensor_value: lightPct,
            threshold: LDR_LEAKAGE_THRESHOLD,
            status: 'active',
            created_at: new Date(),
          })
          console.log(`[Firebase] 🔦 LEAKAGE ALERT: ${lightPct.toFixed(1)}% light in sealed silo ${device.silo_id} (fan=OFF, lid=CLOSED)`)
        }
      } catch (alertErr) {
        console.warn('[Firebase] Leakage alert creation failed:', alertErr.message)
      }
    }

    // ─── Step 4: Convert timestamp ───
    let ts = payload.timestamp || payload.timestamp_unix
    if (ts && ts < 2000000000) ts = ts * 1000  // seconds → ms
    if (!ts || ts < 1600000000000) ts = Date.now()

    // ─── Step 5: Create and SAVE SensorReading to MongoDB ───
    const sensorReading = new SensorReading({
      device_id: device._id,
      admin_id: device.admin_id,
      admin_id: device.admin_id,
      silo_id: device.silo_id,
      timestamp: new Date(ts),

      temperature: tempVal !== null ? { value: tempVal, unit: 'celsius' } : undefined,
      humidity: humVal !== null ? { value: humVal, unit: 'percent' } : undefined,
      voc: vocVal !== null ? { value: vocVal, unit: 'ppb' } : undefined,
      moisture: grainMoisturePct !== null ? { value: grainMoisturePct, unit: 'percent' } : undefined,
      pressure: pressureVal !== null ? { value: pressureVal, unit: 'hPa' } : undefined,
      light: lightPct !== null ? { value: lightPct, unit: 'lux' } : undefined,

      actuation_state: {
        fan_state: pwmSpeedVal > 0 ? 1 : 0,
        fan_status: pwmSpeedVal > 0 ? 'on' : 'off',
        lid_state: servoVal,
        lid_status: servoVal ? 'open' : 'closed',
        fan_speed_factor: airflowVal,
        fan_duty_cycle: pwmSpeedVal,
        fan_rpm: 0,
      },

      derived_metrics: {
        dew_point: dewPointVal,
        dew_point_gap: dewPointGap,
        condensation_risk: dewPointGap !== null ? dewPointGap < 1 : false,
        airflow: airflowVal,
        pest_presence_score: pestScore,
        pest_presence_flag: pestScore >= 0.35,
        spoilage_risk_factors: {
          high_voc_relative: vocVal !== null ? vocVal > 600 : false,
          high_voc_rate: false,
          high_moisture: grainMoisturePct !== null ? grainMoisturePct > 16 : false,
          condensation_risk: dewPointGap !== null ? dewPointGap < 1 : false,
          pest_presence: pestScore >= 0.35,
        },
        fan_recommendation: ((humVal || 0) > 75 || (vocVal || 0) > 600) ? 'run' : 'hold',
      },

      metadata: {
        grain_type: 'Rice',
        storage_days: null,
      },

      quality_indicators: {
        is_valid: true,
        confidence_score: 0.95,
        anomaly_detected: false,
      },
      device_metrics: {
        battery_level: device.battery_level,
        signal_strength: device.signal_strength,
      },
      raw_payload: payload,
    })

    // Look up storage_days from active GrainBatch
    try {
      const GrainBatch = require('../models/GrainBatch')
      const batch = await GrainBatch.findOne({
        silo_id: device.silo_id,
        status: { $in: ['stored', 'active', 'monitoring'] }
      }).sort({ created_at: -1 }).select('intake_date harvest_date created_at')
      if (batch) {
        const refDate = batch.intake_date || batch.harvest_date || batch.created_at
        sensorReading.metadata.storage_days = Math.max(0, Math.round((Date.now() - new Date(refDate)) / 86400000))
      }
    } catch (e) { /* non-critical */ }

    await sensorReading.save()
    console.log(`[Firebase] 💾 SensorReading saved to MongoDB (id=${sensorReading._id}, temp=${tempVal}, hum=${humVal}, voc=${vocVal})`)

    // ─── Step 5c: Auto-trigger ML prediction + Auto-Actuation (throttled to once per 60s) ───
    try {
      const now = Date.now()
      const ML_THROTTLE_MS = 60_000 // 60 seconds between predictions per device
      const lastTrigger = lastMLTrigger[deviceId] || 0

      if (now - lastTrigger >= ML_THROTTLE_MS) {
        lastMLTrigger[deviceId] = now

        // Find active GrainBatch for this silo (most recently created active/stored/monitoring batch)
        const GrainBatch = require('../models/GrainBatch')
        const activeBatch = await GrainBatch.findOne({
          silo_id: device.silo_id,
          status: { $in: ['active', 'stored', 'monitoring', 'Active', 'Stored'] }
        }).sort({ created_at: -1 })

        if (activeBatch) {
          // Build envData from already-extracted sensor values
          const envData = {
            temperature:          tempVal,
            humidity:             humVal,
            voc:                  vocVal,
            pressure:             pressureVal,
            light:                lightPct,
            moisture:             grainMoisturePct,
            airflow:              airflowVal,
            fan_state:            pwmSpeedVal > 0 ? 1 : 0,
            fan_duty_cycle:       pwmSpeedVal,
            pest_presence_score:  pestScore,
            rainfall:             0, // OpenWeather rainfall injected by environmentalDataService if available
            dew_point:            dewPointVal,
          }

          // Lazy-load to avoid circular dependency
          const aiSpoilageService = require('./aiSpoilageService')
          aiSpoilageService.predictSpoilage(activeBatch._id.toString(), envData, {
            predictionType: 'auto_telemetry',
            horizon: 7,
          }).catch(err => console.warn('[Firebase] ⚠️  ML auto-trigger error:', err.message))

          // ─── AUTO-ACTUATION: Run fast inline ML + control actuators via MQTT ───
          try {
            const { spawn: spawnML } = require('child_process')
            const pathMod = require('path')
            const storageDays = sensorReading.metadata?.storage_days || 0
            const grainMC = grainMoisturePct !== null ? grainMoisturePct : (humVal ? (8 + (100 - humVal) * 0.17) : 14)
            const calcDP = tempVal !== null && humVal !== null
              ? (() => { const a = 17.27, b = 237.7; const al = (a*tempVal)/(b+tempVal) + Math.log((humVal||50)/100+1e-9); return Math.round((b*al)/(a-al)*100)/100 })()
              : 20

            const mlInput = {
              temperature: tempVal || 25,
              humidity: humVal || 60,
              storage_days: storageDays,
              airflow: airflowVal || 0,
              dew_point: dewPointVal || calcDP,
              ambient_light: lightPct || 0,
              pest_presence: pestScore || 0,
              grain_moisture: grainMC,
              rainfall: 0,
              grain_type: activeBatch.grain_type || 'Rice',
            }

            const predictScript = pathMod.join(__dirname, '../ml/smartbin_predict.py')
            const pyProc = spawnML('python', [predictScript, JSON.stringify(mlInput)], {
              stdio: ['pipe', 'pipe', 'pipe'],
              timeout: 15000
            })

            let pyOut = ''
            pyProc.stdout.on('data', d => { pyOut += d.toString() })
            pyProc.on('close', (code) => {
              if (code === 0 && pyOut.trim()) {
                try {
                  const mlResult = JSON.parse(pyOut)
                  const classification = mlResult.prediction || 'Safe'

                  // ─── AUTO-ACTUATE: Set LEDs + Fan via MQTT based on ML classification ───
                  try {
                    const iotModule = require('../routes/iot')
                    const mqttClient = iotModule.getMqttClient ? iotModule.getMqttClient() : null
                    if (mqttClient && mqttClient.connected) {
                      const cls = classification.toLowerCase()
                      const shouldVentilate = cls === 'risky' || cls === 'spoiled'
                      const fanSpeed = cls === 'spoiled' ? 100 : (cls === 'risky' ? 80 : 0)

                      const msg = {
                        led2: cls === 'safe',     // Green LED
                        led3: cls === 'risky',    // Yellow LED
                        led4: cls === 'spoiled',  // Red LED
                        ai_fan: shouldVentilate,
                        ai_fan_speed: fanSpeed,
                      }

                      const topic = `grainhero/actuators/${deviceId}/control`
                      mqttClient.publish(topic, JSON.stringify(msg), { qos: 1 })
                      console.log(`[Firebase] 🤖 AUTO-ACTUATE: ${cls.toUpperCase()} → fan=${fanSpeed}% LEDs=[${msg.led2?'🟢':'⚫'}${msg.led3?'🟡':'⚫'}${msg.led4?'🔴':'⚫'}] (conf=${mlResult.confidence}%)`)
                    }
                  } catch (mqttErr) {
                    console.warn('[Firebase] ⚠️  Auto-actuate MQTT error:', mqttErr.message)
                  }
                } catch (e) {
                  console.warn('[Firebase] ML JSON parse failed:', e.message)
                }
              }
            })
          } catch (actuateErr) {
            console.warn('[Firebase] Auto-actuation ML error:', actuateErr.message)
          }

          console.log(`[Firebase] 🧠 ML prediction queued for batch ${activeBatch.batch_id || activeBatch._id} (silo ${device.silo_id})`)
        } else {
          console.log(`[Firebase] ⚠️  No active GrainBatch found for silo ${device.silo_id} — ML skipped. Register a batch to enable predictions.`)
        }
      }
    } catch (mlErr) {
      console.warn('[Firebase] ML auto-trigger warning:', mlErr.message)
    }

    // ─── Step 5b: Append reading to ML training dataset CSV ───
    try {
      const fs = require('fs')
      const csvPath = require('path').join(__dirname, '../ml/rice_spoilage_10k.csv')
      // Calculate dew point properly
      const calcDewPoint = (t, rh) => {
        if (t === null || rh === null) return null
        const a = 17.27, b = 237.7
        const alpha = (a * t) / (b + t) + Math.log(rh / 100 + 1e-9)
        return Math.round((b * alpha) / (a - alpha) * 100) / 100
      }
      const dpVal = dewPointVal || calcDewPoint(tempVal, humVal)
      const storageDays = sensorReading.metadata?.storage_days || 0
      const rainfallVal = 0 // no rainfall sensor on Arduino; default to 0

      // Classify spoilage using FAO Rice thresholds
      let dangerCount = 0
      if (grainMoisturePct !== null && grainMoisturePct > 18) dangerCount += 2
      else if (grainMoisturePct !== null && grainMoisturePct > 14) dangerCount += 1
      if (tempVal !== null && tempVal > 35) dangerCount += 2
      else if (tempVal !== null && tempVal > 25) dangerCount += 1
      if (humVal !== null && humVal > 80) dangerCount += 2
      else if (humVal !== null && humVal > 65) dangerCount += 1
      if (storageDays > 365) dangerCount += 2
      else if (storageDays > 180) dangerCount += 1
      if (pestScore > 0.5) dangerCount += 1
      const spoilageClass = dangerCount >= 5 ? 2 : (dangerCount >= 2 ? 1 : 0)
      const spoilageLabel = spoilageClass === 2 ? 'Spoiled' : (spoilageClass === 1 ? 'Risky' : 'Safe')

      // Only append if we have valid temperature + humidity
      if (tempVal !== null && humVal !== null) {
        const row = [
          (tempVal || 0).toFixed(2),
          (humVal || 0).toFixed(2),
          storageDays,
          spoilageLabel,
          1,  // Grain_Type = 1 (Rice)
          (airflowVal || 0).toFixed(3),
          (dpVal || 0).toFixed(2),
          (lightPct || 0).toFixed(1),
          pestScore > 0.5 ? 1 : 0,
          (grainMoisturePct || 14).toFixed(2),
          rainfallVal.toFixed(1),
        ].join(',') + '\n'

        fs.appendFileSync(csvPath, row)
        console.log(`[Firebase] 📊 Appended reading to training dataset (label=${spoilageLabel})`)
      }
    } catch (csvErr) {
      console.warn(`[Firebase] CSV append warning:`, csvErr.message)
    }

    // ─── Step 6: Update silo current_conditions ───
    try {
      let silo = await Silo.findById(device.silo_id)
      if (silo) {
        const sensorTypes = ['temperature', 'humidity', 'voc', 'moisture']
        for (const type of sensorTypes) {
          if (sensorReading[type]?.value !== undefined) {
            if (!silo.current_conditions) silo.current_conditions = {}
            silo.current_conditions[type] = {
              value: sensorReading[type].value,
              timestamp: new Date(),
              sensor_id: device._id,
            }
          }
        }
        silo.current_conditions.last_updated = new Date()
        await silo.save({ validateBeforeSave: false })
      }
    } catch (siloErr) {
      console.warn(`[Firebase] Silo update warning:`, siloErr.message)
    }

    // ─── Step 7: Update device heartbeat ───
    try {
      await device.updateHeartbeat()
      await device.incrementReadingCount()
    } catch (e) { /* non-critical */ }

    // ─── Step 8: Broadcast via WebSocket ───
    if (io) {
      const liveData = {
        temperature: tempVal,
        humidity: humVal,
        tvoc: vocVal,
        fanState: pwmSpeedVal > 0 ? 'on' : 'off',
        lidState: servoVal ? 'open' : 'closed',
        alarmState: alarmVal ? 'on' : 'off',
        mlDecision: payload.mlDecision || ((humVal > 75 || (vocVal || 0) > 600) ? 'fan_on' : 'idle'),
        humanOverride: !!payload.humanOverride || !!payload.human_override,
        timestamp: ts,
      }
      io.emit('sensor_reading', { type: 'sensor_reading', data: liveData, timestamp: new Date() })
    }
  } catch (err) {
    console.error('[Firebase] handleLatest error:', err.message)
  }
}

function subscribeDevice(deviceId, io) {
  if (subscribed.has(deviceId)) return
  const ref = database.ref(`sensor_data/${deviceId}/latest`)
  const cb = snapshot => handleLatest(deviceId, snapshot, io)
  ref.on('value', cb)
  listeners.push({ ref, cb })
  subscribed.add(deviceId)
}

function discoverDevices(io) {
  const ref = database.ref('sensor_data')
  const onAdded = snap => {
    console.log(`[Firebase] Discovered device: ${snap.key}`);
    subscribeDevice(snap.key, io)
  }
  const onChanged = snap => subscribeDevice(snap.key, io)
  ref.on('child_added', onAdded)
  ref.on('child_changed', onChanged)
  listeners.push({ ref, cb: onAdded })
  listeners.push({ ref, cb: onChanged })
}

function start(io) {
  if (process.env.FIREBASE_ENABLED !== 'true') return
  init()
  discoverDevices(io)
}

function stop() {
  listeners.forEach(({ ref, cb }) => {
    try { ref.off('value', cb) } catch { }
    try { ref.off('child_added', cb) } catch { }
    try { ref.off('child_changed', cb) } catch { }
  })
  listeners = []
  subscribed.clear()
}

async function writeControlState(deviceId, state) {
  if (!initialized) init()
  try {
    const ref = database.ref(`control/${deviceId}`)
    const updates = {
      lastControlUpdate: admin.database.ServerValue.TIMESTAMP
    }
    // Fan-related keys (new style for state machine)
    if (state.human_requested_fan !== undefined) {
      updates.humanRequestedFan = !!state.human_requested_fan
      updates.human_requested_fan = !!state.human_requested_fan // alias for ESP32 compat
    }
    if (state.ml_requested_fan !== undefined) updates.mlRequestedFan = !!state.ml_requested_fan
    if (state.target_fan_speed !== undefined) {
      updates.targetFanSpeed = state.target_fan_speed || 0
      updates.target_fan_speed = state.target_fan_speed || 0 // alias
      updates.pwm = state.target_fan_speed || 0 // backward compat for old firmware
    }
    if (state.ml_decision !== undefined) updates.mlDecision = state.ml_decision || 'idle'
    // LED states (Arduino reads led2/led3/led4 booleans)
    if (state.led2 !== undefined) updates.led2 = !!state.led2
    if (state.led3 !== undefined) updates.led3 = !!state.led3
    if (state.led4 !== undefined) updates.led4 = !!state.led4
    // Alarm state
    if (state.alarm !== undefined) updates.alarm = !!state.alarm
    // Servo (lid) — write both for state machine and direct control compat
    if (state.servo !== undefined) updates.servo = !!state.servo
    if (state.human_requested_fan !== undefined) {
      updates.servo = !!state.human_requested_fan // lid follows fan intent
    }

    await ref.update(updates)
    console.log(`✅ Firebase control state updated for ${deviceId}:`, JSON.stringify(updates))
  } catch (err) {
    console.error(`❌ Firebase write error for ${deviceId}:`, err.message)
  }
}

async function getLatestReadings() {
  if (!initialized) {
    if (process.env.FIREBASE_ENABLED !== 'true') return {}
    init()
  }
  try {
    const snapshot = await database.ref('sensor_data').once('value')
    const val = snapshot.val()
    if (!val || typeof val !== 'object') return {}

    const result = {}
    for (const deviceId of Object.keys(val)) {
      const latest = val[deviceId]?.latest || val[deviceId]
      if (latest && typeof latest === 'object') {
        result[deviceId] = {
          temperature: latest.temperature ?? null,
          humidity: latest.humidity ?? null,
          tvoc_ppb: latest.tvoc_ppb ?? latest.voc ?? null,
          timestamp: latest.timestamp || null,
        }
      }
    }
    return result
  } catch (err) {
    console.error('Firebase getLatestReadings error:', err.message)
    return {}
  }
}

module.exports = { start, stop, writeControlState, getLatestReadings }
async function readTelemetry(deviceId) {
  if (!initialized) init()
  try {
    const ref = database.ref(`sensor_data/${deviceId}/latest`)
    const snapshot = await ref.once('value')
    return snapshot.val() || null
  } catch (err) {
    console.error(`Firebase readTelemetry error for ${deviceId}:`, err.message)
    return null
  }
}

module.exports = { start, stop, writeControlState, readTelemetry }
