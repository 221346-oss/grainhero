import { createFileRoute } from "@tanstack/react-router";

/**
 * Phase 17 — Carrier tracking webhook.
 * URL: /api/public/webhooks/carrier/:carrierCode
 * Provider must send `X-Signature: sha256=<hex hmac of raw body using carriers.webhook_secret>`.
 * Body: { tracking_number?, external_event_id?, code, label?, occurred_at?, raw? }
 */
export const Route = createFileRoute("/api/public/webhooks/carrier/$carrierCode")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const code = params.carrierCode.toLowerCase();
        const rawBody = await request.text();
        const sigHeader = request.headers.get("x-signature") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabaseAdmin as any;

        const { data: carrier } = await sb.from("carriers").select("id, webhook_secret, event_map, active").eq("code", code).maybeSingle();
        if (!carrier || !carrier.active) return new Response("Unknown carrier", { status: 404 });
        const secret = carrier.webhook_secret as string | null;
        if (!secret) return new Response("Webhook secret not configured", { status: 500 });

        // HMAC verify
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", enc.encode(secret),
          { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const macBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
        const expected = "sha256=" + Array.from(macBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
        const a = enc.encode(expected);
        const b = enc.encode(sigHeader);
        if (a.length !== b.length) return new Response("Invalid signature", { status: 401 });
        let same = 0;
        for (let i = 0; i < a.length; i++) same |= a[i] ^ b[i];
        if (same !== 0) return new Response("Invalid signature", { status: 401 });

        let payload: Record<string, unknown>;
        try { payload = JSON.parse(rawBody); } catch { return new Response("Bad JSON", { status: 400 }); }

        const externalId = String(payload.external_event_id ?? payload.event_id ?? "").slice(0, 200) || null;
        const providerCode = String(payload.code ?? payload.status ?? "").slice(0, 60);
        const label = payload.label ? String(payload.label).slice(0, 200) : null;
        const trackingNumber = payload.tracking_number ? String(payload.tracking_number).slice(0, 120) : null;
        const occurredAt = payload.occurred_at ? new Date(String(payload.occurred_at)).toISOString() : new Date().toISOString();

        // Locate assignment via tracking_number → buyer_shipments
        let assignmentId: string | null = null;
        let shipmentId: string | null = null;
        if (trackingNumber) {
          const { data: ship } = await sb.from("buyer_shipments").select("id").eq("tracking_number", trackingNumber).maybeSingle();
          if (ship) {
            shipmentId = ship.id;
            const { data: a0 } = await sb.from("shipment_assignments").select("id").eq("shipment_id", ship.id).maybeSingle();
            if (a0) assignmentId = a0.id;
          }
        }

        // Idempotent insert of the raw event
        if (externalId) {
          const { data: existing } = await sb.from("carrier_tracking_events")
            .select("id").eq("carrier_id", carrier.id).eq("external_event_id", externalId).maybeSingle();
          if (existing) return Response.json({ ok: true, dedup: true });
        }
        await sb.from("carrier_tracking_events").insert({
          carrier_id: carrier.id, assignment_id: assignmentId, shipment_id: shipmentId,
          external_event_id: externalId, provider_code: providerCode, label,
          occurred_at: occurredAt, raw: payload,
        });

        // Translate provider_code → canonical using event_map
        const map = (carrier.event_map ?? {}) as Record<string, string>;
        const canonical = map[providerCode] ?? providerCode;

        if (shipmentId) {
          await sb.from("buyer_shipment_events").insert({
            shipment_id: shipmentId, code: canonical, label: label ?? canonical,
            source: "carrier", occurred_at: occurredAt,
          });
        }
        if (assignmentId) {
          const patch: Record<string, unknown> = {};
          if (canonical === "picked_up") patch.status = "in_transit";
          if (canonical === "in_transit") patch.status = "in_transit";
          if (canonical === "out_for_delivery") patch.status = "in_transit";
          if (canonical === "delivered") { patch.status = "delivered"; patch.actual_delivery_at = occurredAt; }
          if (canonical === "exception" || canonical === "failed_delivery") patch.status = "exception";
          if (Object.keys(patch).length) {
            await sb.from("shipment_assignments").update(patch).eq("id", assignmentId);
          }
        }

        return Response.json({ ok: true, canonical });
      },
    },
  },
});