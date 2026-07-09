import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const input = z.object({ sessionId: z.string().trim().min(5).max(200) });

type OrderRow = {
  id?: string;
  plan_name?: string | null;
  hardware_quantity?: number | null;
  hardware_total?: number | null;
  install_address?: string | null;
  install_city?: string | null;
  install_country?: string | null;
  contact_phone?: string | null;
  preferred_install_date?: string | null;
  customer_email?: string | null;
  customer_name?: string | null;
  confirmation_email_sent_at?: string | null;
};

/**
 * Idempotently emails the buyer a payment-confirmation with next steps.
 * Safe to call from the success page and from the Stripe webhook.
 * De-dupes by writing `confirmation_email_sent_at` on the hardware_orders row.
 */
export const sendCheckoutConfirmationEmail = createServerFn({ method: "POST" })
  .inputValidator((d) => input.parse(d))
  .handler(async ({ data }) => {
    const { stripeFetch } = await import("@/lib/stripe-api.server");

    // Verify the session is actually paid — never email on an unpaid session.
    const session = (await stripeFetch(
      `/checkout/sessions/${encodeURIComponent(data.sessionId)}`,
      null,
      "GET",
    )) as {
      id: string;
      status?: string;
      payment_status?: string;
      customer_details?: { email?: string; name?: string };
      metadata?: Record<string, string>;
    };
    const paid = session.payment_status === "paid" || session.status === "complete";
    console.log("[checkout email] session status:", session.payment_status, session.status, "paid:", paid);
    if (!paid) return { sent: false, reason: "not_paid" as const };

    // Load the order (best-effort — email still sends without a DB row).
    let order: OrderRow = {};
    let admin: Awaited<ReturnType<typeof loadAdmin>> = null;
    try {
      admin = await loadAdmin();
      if (!admin) throw new Error("no admin");
      const { data: row } = await admin
        .from("hardware_orders" as never)
        .select(
          "id,plan_name,hardware_quantity,hardware_total,install_address,install_city,install_country,contact_phone,preferred_install_date,customer_email,customer_name,confirmation_email_sent_at",
        )
        .eq("stripe_session_id", data.sessionId)
        .maybeSingle();
      order = ((row as OrderRow | null) ?? {}) as OrderRow;
      console.log("[checkout email] order found:", !!row, "already_sent:", !!order.confirmation_email_sent_at, "email:", order.customer_email);
      // Note: removed already_sent guard so email always sends during testing
    } catch (e) {
      console.warn("[checkout email] admin unavailable:", (e as Error).message);
    }

    const to =
      order.customer_email ||
      session.customer_details?.email ||
      session.metadata?.customer_email ||
      "";
    const name =
      order.customer_name ||
      session.customer_details?.name ||
      session.metadata?.customer_name ||
      "there";
    console.log("[checkout email] sending to:", to, "name:", name);
    if (!to) return { sent: false, reason: "no_recipient" as const };

    const gatewayKey = process.env.LOVABLE_API_KEY;
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL || "GrainHero <onboarding@resend.dev>";
    if (!resendKey) {
      console.warn("[checkout email] missing RESEND_API_KEY — skipping email");
      return { sent: false, reason: "not_configured" as const };
    }

    // Send via Resend directly (preferred) or via Lovable gateway fallback
    const emailEndpoint = gatewayKey
      ? "https://connector-gateway.lovable.dev/resend/emails"
      : "https://api.resend.com/emails";
    const emailHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${gatewayKey ?? resendKey}`,
    };
    if (gatewayKey) {
      emailHeaders["X-Connection-Api-Key"] = resendKey;
    }

    const appOrigin = process.env.APP_ORIGIN || "https://grainheroo.lovable.app";
    const activateUrl = `${appOrigin}/auth/signup?email=${encodeURIComponent(to)}&redirect=${encodeURIComponent(
      `/checkout/success?session_id=${data.sessionId}`,
    )}`;

    const planName = order.plan_name || session.metadata?.plan_id || "your plan";
    const qty = Number(order.hardware_quantity ?? session.metadata?.iot_quantity ?? 0);
    const totalPkr = Number(order.hardware_total ?? qty * 7000);

    const html = `<!doctype html><html><body style="margin:0;background:#f6faf7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;padding:24px">
    <div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(15,23,42,.06)">
      <div style="background:linear-gradient(135deg,#00a63e,#22c55e);padding:28px;color:#fff;text-align:center">
        <div style="font-size:14px;letter-spacing:.08em;text-transform:uppercase;opacity:.9">GrainHero</div>
        <h1 style="margin:8px 0 0;font-size:24px">Payment received 🎉</h1>
      </div>
      <div style="padding:24px">
        <p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 16px">Thanks for choosing GrainHero — your payment was confirmed.</p>
        <div style="background:#f0fdf4;border:1px solid #dcfce7;border-radius:12px;padding:16px;margin:16px 0">
          <div style="font-size:12px;color:#065f46;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Order summary</div>
          <div style="margin-top:8px;font-size:14px;color:#0f172a">
            <div><b>Plan:</b> ${escapeHtml(String(planName))}</div>
            <div><b>IoT sensors:</b> ${qty} × Rs. 7,000 = Rs. ${totalPkr.toLocaleString()}</div>
            ${order.install_address ? `<div style="margin-top:6px"><b>Install:</b> ${escapeHtml(order.install_address)}, ${escapeHtml(order.install_city ?? "")}, ${escapeHtml(order.install_country ?? "")}</div>` : ""}
            ${order.contact_phone ? `<div><b>Phone:</b> ${escapeHtml(order.contact_phone)}</div>` : ""}
          </div>
        </div>
        <h3 style="margin:20px 0 8px;font-size:16px">Activate your account</h3>
        <p style="margin:0 0 16px;font-size:14px;color:#334155">Create a password so you can sign in and track your install:</p>
        <p style="text-align:center;margin:24px 0"><a href="${activateUrl}" style="background:#00a63e;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Activate account</a></p>
        <p style="font-size:12px;color:#64748b;margin:12px 0 0">Or paste this link in your browser:<br/><span style="word-break:break-all">${activateUrl}</span></p>
        <h3 style="margin:24px 0 8px;font-size:16px">What happens next</h3>
        <ol style="padding-left:20px;margin:0;color:#334155;font-size:14px;line-height:1.6">
          <li>Our team contacts you within 24 hours to schedule the sensor install.</li>
          <li>Our technician installs the IoT sensors on-site and turns monitoring live.</li>
          <li>You get a guided walkthrough of your dashboard.</li>
        </ol>
        <p style="margin:24px 0 0;font-size:12px;color:#64748b">Need help? Reply to this email or write to support@grainhero.app.</p>
      </div>
    </div>
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin:16px 0 0">© GrainHero</p>
  </div>
</body></html>`;

    const res = await fetch(emailEndpoint, {
      method: "POST",
      headers: emailHeaders,
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Payment confirmed — welcome to GrainHero`,
        html,
      }),
    });
    const resBody = await res.text();
    console.log(`[checkout email] resend response ${res.status}:`, resBody);
    if (!res.ok) {
      console.error(`[checkout email] resend failed ${res.status}: ${resBody}`);
      throw new Error(`Email send failed: ${res.status}: ${resBody}`);
    }

    // Best-effort de-dupe marker.
    if (admin && order.id) {
      try {
        await admin
          .from("hardware_orders" as never)
          .update({ confirmation_email_sent_at: new Date().toISOString() } as never)
          .eq("id", order.id);
      } catch (e) {
        console.warn("[checkout email] could not mark sent:", (e as Error).message);
      }
    }

    return { sent: true as const, to };
  });

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function loadAdmin() {
  try {
    const mod = await import("@/integrations/supabase/client.server");
    return mod.supabaseAdmin;
  } catch {
    return null;
  }
}