/**
 * Supabase Edge Function: mqtt-bridge
 * ====================================
 * A Deno-compatible MQTT → Supabase bridge.
 *
 * Because Supabase Edge Functions are ephemeral (30–60s max runtime),
 * this function is designed to be invoked on a SCHEDULE (e.g., every 30 seconds
 * from an external cron / pg_cron) rather than as a long-running daemon.
 *
 * On each invocation, it:
 *  1. Opens an MQTT connection to the broker
 *  2. Subscribes to the telemetry topic
 *  3. Collects messages for ~25 seconds
 *  4. POSTs each message to the Supabase ingest function
 *  5. Disconnects cleanly
 *
 * Required Environment Secrets (set via `supabase secrets set`):
 *   MQTT_BROKER_URL         e.g. mqtt://your-broker:1883
 *   MQTT_USERNAME           (optional)
 *   MQTT_PASSWORD           (optional)
 *   SUPABASE_INGEST_URL     e.g. https://<project>.supabase.co/functions/v1/ingest
 *   SUPABASE_SERVICE_KEY    Service-role key for Authorization header
 *
 * MQTT Topics consumed:
 *   grainhero/telemetry/#  — all device telemetry payloads
 *   (Device publishes to grainhero/telemetry/{device_id})
 *
 * MQTT Topics for actuators (outbound from backend):
 *   grainhero/actuators/{deviceId}/control
 *   (Published by ml-pipeline.functions.ts → writeFirebaseControl via RTDB,
 *    OR directly here if MQTT actuator bridge mode is enabled)
 *
 * Fumigation Interlock:
 *   When a silo's fumigation_active = true, ALL fan-on MQTT commands are blocked.
 *   This is enforced in ml-pipeline.functions.ts and sync-firebase.ts.
 */

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ─── Config ──────────────────────────────────────────────────────────────────

const MQTT_BROKER_URL     = Deno.env.get("MQTT_BROKER_URL") ?? "";
const MQTT_USERNAME       = Deno.env.get("MQTT_USERNAME") ?? "";
const MQTT_PASSWORD       = Deno.env.get("MQTT_PASSWORD") ?? "";
const SUPABASE_INGEST_URL = Deno.env.get("SUPABASE_INGEST_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_KEY") ?? "";

const TELEMETRY_TOPIC     = "grainhero/telemetry/#";
const COLLECTION_WINDOW_MS = 25_000; // collect for 25 seconds then exit
const MAX_RETRIES          = 3;

// ─── HTTP helper with retry ───────────────────────────────────────────────────

async function postToIngest(payload: Record<string, unknown>, attempt = 1): Promise<void> {
  try {
    const res = await fetch(SUPABASE_INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }
    console.log(`[mqtt-bridge] ✅ Forwarded telemetry from ${payload.deviceID ?? "unknown"}`);
  } catch (err) {
    if (attempt <= MAX_RETRIES) {
      const delay = 1000 * attempt;
      console.warn(`[mqtt-bridge] ⚠️ POST failed (attempt ${attempt}/${MAX_RETRIES}): ${(err as Error).message}. Retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
      return postToIngest(payload, attempt + 1);
    }
    console.error(`[mqtt-bridge] ❌ Gave up after ${MAX_RETRIES} retries:`, (err as Error).message);
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req) => {
  // Only allow POST (from cron) or internal calls
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Validate env
  if (!MQTT_BROKER_URL) {
    return new Response(
      JSON.stringify({ error: "MQTT_BROKER_URL not configured. Set it via: supabase secrets set MQTT_BROKER_URL=mqtt://..." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!SUPABASE_INGEST_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(
      JSON.stringify({ error: "SUPABASE_INGEST_URL or SUPABASE_SERVICE_KEY not set." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  /**
   * NOTE: Deno does not have a native MQTT client package.
   * The recommended approach for production is to use a WebSocket-based
   * MQTT broker (e.g., EMQX with WebSocket port 8083) or a TCP-over-WebSocket
   * transport with a library like mqtt-client.deno.
   *
   * For this Edge Function scaffold, we implement the WebSocket MQTT transport
   * manually using the MQTT v3.1.1 protocol over WebSocket.
   *
   * If your broker exposes a REST/HTTP ingest endpoint, replace the WebSocket
   * block below with a simple HTTP poll.
   */

  const messages: Array<{ topic: string; payload: Record<string, unknown> }> = [];
  let wsUrl = MQTT_BROKER_URL
    .replace("mqtt://", "ws://")
    .replace("mqtts://", "wss://");

  // Default MQTT-over-WebSocket port if not specified
  if (!wsUrl.includes(":8083") && !wsUrl.includes(":443")) {
    wsUrl = wsUrl.replace(/(ws:\/\/[^:]+)(:\d+)?/, "$18083");
  }

  let connected = false;
  let ws: WebSocket | null = null;

  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        resolve(); // End collection window gracefully
      }, COLLECTION_WINDOW_MS);

      ws = new WebSocket(wsUrl, ["mqtt"]);

      ws.onopen = () => {
        // Send MQTT CONNECT packet
        const clientId = `grainhero-edge-${Date.now()}`;
        const connectPacket = buildMQTTConnect(clientId, MQTT_USERNAME, MQTT_PASSWORD);
        ws!.send(connectPacket);
      };

      ws.onmessage = async (event) => {
        const data = event.data instanceof ArrayBuffer
          ? new Uint8Array(event.data)
          : event.data;

        if (!connected) {
          // First message should be CONNACK
          connected = true;
          // Send SUBSCRIBE packet
          const subPacket = buildMQTTSubscribe(TELEMETRY_TOPIC);
          ws!.send(subPacket);
          console.log(`[mqtt-bridge] 🔌 Connected. Subscribed to: ${TELEMETRY_TOPIC}`);
          return;
        }

        // Parse PUBLISH packet
        try {
          const parsed = parseMQTTPublish(data as Uint8Array);
          if (!parsed) return;
          const { topic, payload: payloadStr } = parsed;
          const payload = JSON.parse(payloadStr) as Record<string, unknown>;
          payload._mqtt_topic = topic;
          payload._received_at = new Date().toISOString();
          messages.push({ topic, payload });
          await postToIngest(payload);
        } catch (_e) {
          // Skip non-JSON or non-PUBLISH packets silently
        }
      };

      ws.onerror = (e) => {
        console.error("[mqtt-bridge] WebSocket error", e);
        clearTimeout(timeout);
        reject(new Error("WebSocket connection failed. Check MQTT_BROKER_URL and ensure broker supports WebSocket on port 8083."));
      };

      ws.onclose = () => {
        clearTimeout(timeout);
        resolve();
      };
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, hint: "Ensure broker supports MQTT-over-WebSocket. See function comments." }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  } finally {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  }

  return new Response(
    JSON.stringify({ ok: true, messages_forwarded: messages.length }),
    { headers: { "Content-Type": "application/json" } },
  );
});

// ─── Minimal MQTT v3.1.1 packet builders ─────────────────────────────────────

function encodeString(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  const result = new Uint8Array(2 + encoded.length);
  result[0] = (encoded.length >> 8) & 0xff;
  result[1] = encoded.length & 0xff;
  result.set(encoded, 2);
  return result;
}

function buildMQTTConnect(clientId: string, username: string, password: string): Uint8Array {
  const protocolName = encodeString("MQTT");
  const protocolLevel = new Uint8Array([4]); // v3.1.1
  let flags = 0x02; // clean session
  if (username) flags |= 0x80;
  if (password) flags |= 0x40;
  const connectFlags = new Uint8Array([flags]);
  const keepAlive = new Uint8Array([0x00, 0x3c]); // 60s
  const clientIdBytes = encodeString(clientId);
  const usernameBytes = username ? encodeString(username) : new Uint8Array(0);
  const passwordBytes = password ? encodeString(password) : new Uint8Array(0);

  const payload = new Uint8Array([
    ...protocolName, ...protocolLevel, ...connectFlags, ...keepAlive,
    ...clientIdBytes, ...usernameBytes, ...passwordBytes,
  ]);

  const remainingLength = payload.length;
  const fixedHeader = new Uint8Array([0x10, remainingLength]);
  return new Uint8Array([...fixedHeader, ...payload]);
}

function buildMQTTSubscribe(topic: string): Uint8Array {
  const packetId = new Uint8Array([0x00, 0x01]);
  const topicBytes = encodeString(topic);
  const qos = new Uint8Array([0x01]);
  const payload = new Uint8Array([...packetId, ...topicBytes, ...qos]);
  const fixedHeader = new Uint8Array([0x82, payload.length]);
  return new Uint8Array([...fixedHeader, ...payload]);
}

function parseMQTTPublish(data: Uint8Array): { topic: string; payload: string } | null {
  if (!data || data.length < 4) return null;
  const packetType = (data[0] >> 4) & 0x0f;
  if (packetType !== 3) return null; // not PUBLISH

  let pos = 1;
  // Decode remaining length (variable encoding)
  let multiplier = 1, remainingLen = 0;
  while (true) {
    if (pos >= data.length) return null;
    const byte = data[pos++];
    remainingLen += (byte & 0x7f) * multiplier;
    if ((byte & 0x80) === 0) break;
    multiplier *= 128;
  }

  // Topic
  if (pos + 2 > data.length) return null;
  const topicLen = (data[pos] << 8) | data[pos + 1];
  pos += 2;
  const topic = new TextDecoder().decode(data.slice(pos, pos + topicLen));
  pos += topicLen;

  // Payload (remainder)
  const payloadBytes = data.slice(pos, 1 + (pos - 1) + remainingLen - topicLen);
  const payload = new TextDecoder().decode(payloadBytes);
  return { topic, payload };
}
