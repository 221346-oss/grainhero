/**
 * Phase 12 — Buyer email dispatch. Every subject/body comes from
 * platform_settings.config.marketplace, never hardcoded.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendEmailViaResend } from "@/lib/resend.server";
import { loadMarketplaceSettings, renderTemplate } from "@/lib/marketplace-settings.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

type Kind =
  | "placed"
  | "paymentSucceeded"
  | "paymentFailed"
  | "dispatched"
  | "outForDelivery"
  | "delivered"
  | "exception"
  | "reviewPromptBuyer"
  | "reviewPromptSeller"
  | "invoiceReady"
  | "disputeOpened"
  | "disputeResolved"
  | "refundIssued"
  | "orderCancelled";

async function fetchOrderCtx(
  sb: SupabaseClient<Database>,
  orderId: string,
): Promise<{
  to: string | null;
  vars: Record<string, string>;
} | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (sb as any)
    .from("buyer_orders")
    .select(
      "id, order_number, quantity_kg, subtotal, currency, buyer_account_id, grain_listings(title)",
    )
    .eq("id", orderId)
    .maybeSingle();
  const o = data as Row | null;
  if (!o) return null;
  let email: string | null = null;
  if (o.buyer_account_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: acc } = await (sb as any)
      .from("buyer_accounts")
      .select("user_id, contact_phone")
      .eq("id", o.buyer_account_id)
      .maybeSingle();
    const userId = (acc as Row | null)?.user_id;
    if (userId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: prof } = await (sb as any)
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      email = (prof as Row | null)?.email ?? null;
    }
  }
  const origin = process.env.APP_URL ?? "";
  return {
    to: email,
    vars: {
      orderNumber: String(o.order_number ?? ""),
      quantityKg: String(o.quantity_kg ?? ""),
      subtotal: Number(o.subtotal ?? 0).toFixed(2),
      currency: String(o.currency ?? ""),
      listingTitle: String(o.grain_listings?.title ?? "your order"),
      trackingUrl: `${origin}/buyer/orders/${o.id}`,
    },
  };
}

function toHtml(body: string): string {
  const escaped = body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n\n+/)
    .map(
      (p) =>
        `<p style="margin:0 0 12px;line-height:1.5;color:#0f172a">${p.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;padding:24px;color:#0f172a">${paragraphs}</div>`;
}

export async function sendBuyerOrderEmail(
  sb: SupabaseClient<Database>,
  orderId: string,
  kind: Kind,
): Promise<void> {
  try {
    const settings = await loadMarketplaceSettings(sb);
    const ctx = await fetchOrderCtx(sb, orderId);
    if (!ctx || !ctx.to) return;
    const subject = renderTemplate(settings.emailSubjects[kind] ?? "", ctx.vars);
    const body = renderTemplate(settings.emailBodies[kind] ?? "", ctx.vars);
    if (!subject || !body) return;
    await sendEmailViaResend({
      to: ctx.to,
      subject,
      html: toHtml(body),
      from: settings.fromEmail,
    });
  } catch (e) {
    console.warn(`[buyer-email:${kind}] failed:`, (e as Error).message);
  }
}
