/**
 * GrainHero MQTT → Supabase Bridge
 * ==================================
 * Subscribes to all ESP32 telemetry topics and POSTs each reading to the
 * Supabase `ingest` Edge Function.  Runs as a standalone Node.js process
 * alongside the main Express backend.
 *
 * Usage:
 *   node mqtt_bridge.js
 *
 * Required env vars (set in .env or system environment):
 *   MQTT_BROKER_URL        e.g. mqtt://192.168.100.229:1883
 *   SUPABASE_INGEST_URL    e.g. https://<project>.supabase.co/functions/v1/ingest
 *   SUPABASE_SERVICE_KEY   Supabase service-role key (for Authorization header)
 */

"use strict";

const mqtt = require("mqtt");
const path = require("path");

// ─── Load .env if available ──────────────────────────────────────────────────
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch (_) {
  /* dotenv is optional */
}

// ─── Config ──────────────────────────────────────────────────────────────────
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || "mqtt://192.168.100.229:1883";
const SUPABASE_INGEST_URL =
  process.env.SUPABASE_INGEST_URL ||
  (process.env.SUPABASE_URL ? `${process.env.SUPABASE_URL}/functions/v1/ingest` : "");
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Telemetry topic pattern – matches any device telemetry message
const TELEMETRY_TOPIC = "grainhero/telemetry/#";

// Retry config for failed HTTP pushes
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ─── Validate config ─────────────────────────────────────────────────────────
if (!SUPABASE_INGEST_URL) {
  console.error("[bridge] ❌  SUPABASE_INGEST_URL is not set. Exiting.");
  process.exit(1);
}
if (!SUPABASE_SERVICE_KEY) {
  console.warn("[bridge] ⚠️  SUPABASE_SERVICE_KEY is not set – requests will be unauthenticated.");
}

// ─── HTTP helper with exponential-backoff retry ──────────────────────────────
async function postToSupabase(payload, attempt = 1) {
  // Use built-in fetch (Node 18+) or fall back to node-fetch
  const fetchFn = typeof fetch !== "undefined" ? fetch : (await import("node-fetch")).default;

  try {
    const res = await fetchFn(SUPABASE_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }

    console.log(`[bridge] ✅  Telemetry forwarded (device=${payload.deviceID})`);
  } catch (err) {
    if (attempt <= MAX_RETRIES) {
      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `[bridge] ⚠️  POST failed (attempt ${attempt}/${MAX_RETRIES}): ${err.message}. Retrying in ${delay}ms…`,
      );
      await new Promise((r) => setTimeout(r, delay));
      return postToSupabase(payload, attempt + 1);
    }
    console.error(`[bridge] ❌  Giving up after ${MAX_RETRIES} retries: ${err.message}`);
  }
}

// ─── MQTT client ─────────────────────────────────────────────────────────────
const client = mqtt.connect(MQTT_BROKER_URL, {
  clientId: `grainhero-bridge-${Date.now()}`,
  clean: true,
  reconnectPeriod: 5000,
});

client.on("connect", () => {
  console.log(`[bridge] 🔌  Connected to MQTT broker: ${MQTT_BROKER_URL}`);
  client.subscribe(TELEMETRY_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      console.error("[bridge] ❌  Subscribe failed:", err.message);
    } else {
      console.log(`[bridge] 📡  Subscribed to: ${TELEMETRY_TOPIC}`);
    }
  });
});

client.on("message", async (topic, message) => {
  let payload;
  try {
    payload = JSON.parse(message.toString());
  } catch (err) {
    console.warn(`[bridge] ⚠️  Non-JSON message on ${topic} – skipping`);
    return;
  }

  // Attach the raw MQTT topic for traceability
  payload._mqtt_topic = topic;

  // --- SECURITY: Verify API Key ---
  const AUTH_TOKEN = "GrainHero_Secret_2026";
  if (payload.api_key !== AUTH_TOKEN) {
    console.warn(`[bridge] ❌ SECURITY BREACH: Invalid API key on ${topic}. Forgery rejected.`);
    return;
  }

  console.log(`[bridge] 📨  Received telemetry from ${payload.deviceID || "unknown"} on ${topic}`);
  await postToSupabase(payload);
});

client.on("error", (err) => {
  console.error("[bridge] MQTT error:", err.message);
});

client.on("reconnect", () => {
  console.log("[bridge] 🔄  Reconnecting to MQTT broker…");
});

client.on("offline", () => {
  console.warn("[bridge] ⚡  MQTT broker is offline");
});

// ─── Graceful shutdown ────────────────────────────────────────────────────────
process.on("SIGINT", () => {
  console.log("\n[bridge] 🛑  Shutting down…");
  client.end(true);
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("\n[bridge] 🛑  Shutting down…");
  client.end(true);
  process.exit(0);
});
