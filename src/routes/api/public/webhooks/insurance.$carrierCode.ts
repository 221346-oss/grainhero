import { createFileRoute } from "@tanstack/react-router";

/**
 * Phase 19 — Insurance carrier webhook.
 * URL: /api/public/webhooks/insurance/:carrierCode
 * Header: X-Signature: sha256=<hex hmac of raw body using insurance_carriers.webhook_secret>
 * Body:
 *   {
 *     external_event_id: string,           // for idempotency
 *     event_type: "policy.updated" | "claim.updated" | ...,
 *     external_ref?: string,               // matches insurance_policies.external_ref
 *     policy_status?: "active"|"expired"|"cancelled",
 *     claim_external_ref?: string,         // matches insurance_claims.external_ref
 *     claim_status?: "under_review"|"approved"|"rejected"|"paid",
 *     approved_payout_cents?: number,
 *     decision_reason?: string
 *   }
 */
export const Route = createFileRoute("/api/public/webhooks/insurance/$carrierCode")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const code = params.carrierCode.toLowerCase();
        const rawBody = await request.text();
        const sigHeader = request.headers.get("x-signature") ?? "";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sb = supabaseAdmin as any;

        // Carrier lookup by lowercased-name match on the code slug
        const { data: carriers } = await sb.from("insurance_carriers")
          .select("id, name, webhook_secret, active");
        const carrier = (carriers ?? []).find(
          (c: { id: string; name: string; webhook_secret: string | null; active: boolean }) =>
            c.active && c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") === code,
        );
        if (!carrier) return new Response("Unknown carrier", { status: 404 });
        const secret = carrier.webhook_secret as string | null;
        if (!secret) return new Response("Webhook secret not configured", { status: 500 });

        // HMAC verify
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", enc.encode(secret),
          { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(rawBody)));
        const expected = "sha256=" + Array.from(mac).map((b) => b.toString(16).padStart(2, "0")).join("");
        const a = enc.encode(expected);
        const b = enc.encode(sigHeader);
        if (a.length !== b.length) return new Response("Invalid signature", { status: 401 });
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
        if (diff !== 0) return new Response("Invalid signature", { status: 401 });

        let payload: Record<string, unknown>;
        try { payload = JSON.parse(rawBody); } catch { return new Response("Bad JSON", { status: 400 }); }

        const externalId = String(payload.external_event_id ?? payload.event_id ?? "").slice(0, 200) || null;
        const eventType = String(payload.event_type ?? "unknown").slice(0, 80);

        // Record raw event (idempotent via unique carrier_id+external_id)
        if (externalId) {
          const { data: dup } = await sb.from("insurance_webhook_events")
            .select("id, status").eq("carrier_id", carrier.id).eq("external_id", externalId).maybeSingle();
          if (dup && dup.status === "processed") return new Response("ok", { status: 200 });
        }

        const { data: evtRow } = await sb.from("insurance_webhook_events").insert({
          carrier_id: carrier.id, carrier_code: code, external_id: externalId,
          event_type: eventType, raw: payload, headers: Object.fromEntries(request.headers.entries()),
          status: "received",
        }).select("id").single();
        const evtId = evtRow?.id as string | undefined;

        try {
          const { processInsuranceWebhookPayload } = await import("@/lib/insurance-webhook.server");
          const result = await processInsuranceWebhookPayload(sb, {
            carrierId: carrier.id as string,
            externalId,
            payload,
          });
          if (result.status === "error") throw new Error(result.error ?? "processing failed");
          if (evtId) {
            await sb.from("insurance_webhook_events").update({
              status: "processed", processed_at: new Date().toISOString(),
              policy_id: result.policyId, claim_id: result.claimId,
            }).eq("id", evtId);
          }
          return new Response("ok", { status: 200 });
        } catch (e) {
          if (evtId) {
            await sb.from("insurance_webhook_events").update({
              status: "error", error_message: (e as Error).message,
            }).eq("id", evtId);
          }
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});