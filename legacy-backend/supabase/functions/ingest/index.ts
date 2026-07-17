/**
 * GrainHero – Supabase Edge Function: ingest
 * ===========================================
 * Receives raw ESP32 telemetry, computes derived metrics, and inserts
 * a complete record into the `sensor_readings` table.
 *
 * Deploy:  supabase functions deploy ingest
 * Invoke:  POST /functions/v1/ingest   (Bearer <service_role_key>)
 *
 * Expected JSON body (mirrors the ESP32 MQTT payload):
 * {
 *   "deviceID":       "004B12387760",
 *   "temperature":    28.5,
 *   "humidity":       65.0,
 *   "gas_resistance": 45000,
 *   "tvoc_approx":    320,
 *   "air_quality":    "Moderate",
 *   "pressure":       1012.5,
 *   "altitude":       215.3,
 *   "dht1_temp":      28.1,
 *   "dht1_humidity":  63.4,
 *   "dht2_temp":      28.8,
 *   "dht2_humidity":  66.2,
 *   "soil_percentage":55,
 *   "soil_status":    "Normal",
 *   "light_percentage":30,
 *   "light_status":   "Normal",
 *   "servo":          false,
 *   "pwm":            0,
 *   "timestamp":      1720948800,
 *   "dateTime":       "2025-07-14 09:00:00"
 * }
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Environment ─────────────────────────────────────────────────────────────
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Derived-metric helpers ──────────────────────────────────────────────────

/**
 * Magnus-formula dew point approximation.
 * Reference: Lawrence (2005) BAMS 86(2), pp. 225-233.
 * Accuracy: ±0.35°C for T in [0, 60°C], RH > 50%.
 */
function calcDewPoint(temperatureC: number, relativeHumidity: number): number {
  const a = 17.625;
  const b = 243.04; // °C
  const gamma = Math.log(relativeHumidity / 100.0) + (a * temperatureC) / (b + temperatureC);
  return parseFloat(((b * gamma) / (a - gamma)).toFixed(2));
}

/**
 * Estimate normalised airflow (0–1) from fan PWM duty cycle and lid state.
 * A closed lid means zero effective airflow regardless of PWM.
 */
function calcAirflow(pwmPercent: number, lidOpen: boolean): number {
  if (!lidOpen || pwmPercent <= 0) return 0.0;
  // Map 0-100 PWM → 0.05-1.0 airflow (minimum airflow when fan is on at low speed)
  return parseFloat((0.05 + (pwmPercent / 100) * 0.95).toFixed(3));
}

/**
 * Condensation risk: true when dew point is within 2°C of the ambient
 * temperature (the grain surface will be near or below dew point).
 */
function calcCondensationRisk(temperatureC: number, dewPointC: number): boolean {
  return temperatureC - dewPointC <= 2.0;
}

// ─── Main handler ────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  // ── CORS pre-flight ──────────────────────────────────────────────────────
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Auth check ───────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Validate required fields ─────────────────────────────────────────────
  const deviceID = (raw.deviceID as string) ?? null;
  if (!deviceID) {
    return new Response(JSON.stringify({ error: 'deviceID is required' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Extract raw sensor fields ────────────────────────────────────────────
  const temperatureValue  = Number(raw.temperature  ?? 0);
  const humidityValue     = Number(raw.humidity     ?? 0);
  const gasResistance     = Number(raw.gas_resistance ?? 0);
  const tvocApprox        = Number(raw.tvoc_approx  ?? -999);
  const airQuality        = String(raw.air_quality  ?? 'Unknown');
  const pressureHPa       = Number(raw.pressure     ?? 0);
  const altitudeM         = Number(raw.altitude     ?? 0);
  const dht1Temp          = Number(raw.dht1_temp    ?? 0);
  const dht1Humidity      = Number(raw.dht1_humidity ?? 0);
  const dht2Temp          = Number(raw.dht2_temp    ?? 0);
  const dht2Humidity      = Number(raw.dht2_humidity ?? 0);
  const soilPercentage    = Number(raw.soil_percentage ?? 0);
  const soilStatus        = String(raw.soil_status  ?? '');
  const lightPercentage   = Number(raw.light_percentage ?? 0);
  const lightStatus       = String(raw.light_status ?? '');
  const lidOpen           = Boolean(raw.servo       ?? false);
  const pwmPercent        = Number(raw.pwm          ?? 0);
  const epochTimestamp    = Number(raw.timestamp    ?? Math.floor(Date.now() / 1000));
  const dateTimeStr       = String(raw.dateTime     ?? new Date().toISOString());

  // ── Compute derived metrics ──────────────────────────────────────────────
  const dewPoint           = calcDewPoint(temperatureValue, humidityValue);
  const airflow            = calcAirflow(pwmPercent, lidOpen);
  const condensationRisk   = calcCondensationRisk(temperatureValue, dewPoint);

  // ── Build insert record ──────────────────────────────────────────────────
  const record = {
    device_id:          deviceID,

    // BME680
    temperature_value:  temperatureValue,
    humidity_value:     humidityValue,
    gas_resistance_ohm: gasResistance,
    tvoc_ppb:           tvocApprox >= 0 ? tvocApprox : null, // null when warming up
    air_quality:        airQuality,
    pressure_hpa:       pressureHPa,
    altitude_m:         altitudeM,

    // DHT probes
    dht1_temperature:   dht1Temp,
    dht1_humidity:      dht1Humidity,
    dht2_temperature:   dht2Temp,
    dht2_humidity:      dht2Humidity,

    // Grain moisture proxy
    grain_moisture_pct: soilPercentage,
    soil_status:        soilStatus,

    // Ambient light
    light_percentage:   lightPercentage,
    light_status:       lightStatus,

    // Actuators
    fan_pwm_pct:        pwmPercent,
    lid_open:           lidOpen,

    // Derived metrics (computed server-side)
    dew_point:          dewPoint,
    airflow:            airflow,
    condensation_risk:  condensationRisk,

    // Timestamps
    device_timestamp:   new Date(epochTimestamp * 1000).toISOString(),
    device_datetime_str: dateTimeStr,
    ingested_at:        new Date().toISOString(),
  };

  // ── Insert into Supabase ─────────────────────────────────────────────────
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error } = await supabase
    .from('sensor_readings')
    .insert(record)
    .select('id')
    .single();

  if (error) {
    console.error('[ingest] DB insert error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      success:          true,
      id:               data?.id,
      dew_point:        dewPoint,
      airflow:          airflow,
      condensation_risk: condensationRisk,
    }),
    {
      status: 200,
      headers: {
        'Content-Type':                'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
});
