/**
 * Device bridge posts here after executing a command.
 * Body: { correlationId, outcome: "ack"|"failed", error? }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";

const BODY = z.object({
  correlationId: z.string().uuid(),
  outcome: z.enum(["ack", "failed"]),
  error: z.string().max(500).optional(),
});

function verify(rawBody: string, signature: string | null): boolean {
  const secret = process.env.DEVICE_BRIDGE_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try { return timingSafeEqual(a, b); } catch { return false; }
}

export const Route = createFileRoute("/api/public/actuator-ack")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        if (!verify(raw, request.headers.get("x-signature"))) return new Response("invalid signature", { status: 401 });
        let parsed; try { parsed = BODY.parse(JSON.parse(raw)); } catch (e) { return Response.json({ error: String(e) }, { status: 400 }); }
        const { ackCommandByCorrelation } = await import("@/lib/actuators.functions");
        const ok = await ackCommandByCorrelation(parsed.correlationId, parsed.outcome, parsed.error ?? null);
        return Response.json({ ok });
      },
    },
  },
});
