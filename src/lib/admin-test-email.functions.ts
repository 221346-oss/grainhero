import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";

const input = z.object({ to: z.string().trim().email().max(200) });

export const sendAdminTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => input.parse(d))
  .handler(async ({ data, context }) => {
    // Authorize: only super_admin or admin
    const isAdmin = (await getEffectiveRole(context.supabase, context.userId)) === "admin";
    const isSuper = (await getEffectiveRole(context.supabase, context.userId)) === "super_admin";
    if (!isAdmin && !isSuper) throw new Error("Forbidden");

    const gatewayKey = process.env.LOVABLE_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || "GrainHero <onboarding@resend.dev>";
    if (!gatewayKey || !resendKey) {
      throw new Error("Email not configured: missing LOVABLE_API_KEY or RESEND_API_KEY");
    }

    const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f6faf7;padding:24px;color:#0f172a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:14px;padding:24px;box-shadow:0 6px 24px rgba(15,23,42,.06)">
    <h1 style="margin:0 0 8px;color:#00a63e">GrainHero test email</h1>
    <p style="margin:0 0 12px">This is a delivery test sent from the admin dashboard.</p>
    <p style="margin:0;font-size:12px;color:#64748b">Sent at ${new Date().toISOString()}</p>
  </div>
</body></html>`;

    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${gatewayKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from,
        to: [data.to],
        subject: "GrainHero — test email",
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[admin test email] resend failed ${res.status}: ${body}`);
      throw new Error(`Resend failed (${res.status}): ${body}`);
    }
    const json = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true as const, id: json.id, to: data.to, from };
  });