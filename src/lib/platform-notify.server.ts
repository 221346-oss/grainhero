/**
 * Server-only helper. Posts platform-critical events to a Slack- or
 * Discord-compatible incoming webhook. Never throws — a broken webhook
 * must not break the user-facing action that triggered it.
 *
 * Configure the destination via the PLATFORM_EVENT_WEBHOOK_URL secret.
 * Both Slack ("text") and Discord ("content") accept the same payload
 * shape we send below.
 */
export type PlatformEvent =
  | { type: "signup"; email: string; userId: string; businessType?: string | null }
  | { type: "user_blocked"; email?: string | null; userId: string; by: string }
  | { type: "user_unblocked"; email?: string | null; userId: string; by: string }
  | { type: "critical_alert"; tenantId: string; alertId: string; message: string }
  | { type: "stripe_payment_failed"; customerId: string; amount?: number; currency?: string }
  | { type: "churn"; customerId: string; plan?: string | null };

function formatMessage(e: PlatformEvent): string {
  switch (e.type) {
    case "signup":
      return `🟢 New signup: ${e.email}${e.businessType ? ` (${e.businessType})` : ""}`;
    case "user_blocked":
      return `🚫 User blocked: ${e.email ?? e.userId} by ${e.by}`;
    case "user_unblocked":
      return `✅ User unblocked: ${e.email ?? e.userId} by ${e.by}`;
    case "critical_alert":
      return `🔥 Critical alert in tenant ${e.tenantId}: ${e.message}`;
    case "stripe_payment_failed":
      return `💳 Payment failed for customer ${e.customerId}${e.amount != null ? ` (${e.amount} ${e.currency ?? ""})` : ""}`;
    case "churn":
      return `📉 Churn: customer ${e.customerId}${e.plan ? ` (${e.plan})` : ""}`;
  }
}

export async function notifyPlatformEvent(event: PlatformEvent): Promise<void> {
  const url = process.env.PLATFORM_EVENT_WEBHOOK_URL;
  if (!url) return; // webhook not configured — silently no-op
  const text = formatMessage(event);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text, event }),
    });
  } catch {
    // swallow — telemetry must never break the caller
  }
}
