/**
 * Phase 7 — Multi-channel notification dispatch.
 *
 * Server-only. Called from `emitNotification` after a row lands in
 * `public.notifications`. Fans out to email / SMS / push per user prefs and
 * records each attempt in `notification_deliveries`.
 *
 * Failure policy: never throw — log and record the failed row. The in-app
 * notification must not be blocked by an outbound provider outage.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailViaResend } from "@/lib/resend.server";
import { requireAppOrigin } from "@/lib/app-url";
import { loadUserDevices, markDeviceError, markDeviceRevoked, markDeviceSuccess, sendPush } from "@/lib/push-dispatch.server";

type Channel = "email" | "sms" | "push";
type Severity = "info" | "success" | "warning" | "critical";

type NotifRow = {
  id: string;
  admin_id: string;
  user_id: string;
  type: string | null;
  category: string | null;
  title: string | null;
  message: string | null;
  action_url: string | null;
};

type Prefs = {
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  categories: Record<string, Partial<Record<Channel, boolean>>> | null;
};

const DEFAULTS: Prefs = {
  email_enabled: true,
  sms_enabled: false,
  push_enabled: true,
  categories: null,
};

/** Category severity overrides: security + critical always email. */
function forceEmail(category: string | null, severity: Severity): boolean {
  if (category === "security" || category === "billing") return true;
  if (severity === "critical") return true;
  return false;
}

function channelAllowed(
  channel: Channel,
  category: string | null,
  prefs: Prefs,
): boolean {
  const base =
    channel === "email" ? prefs.email_enabled :
    channel === "sms" ? prefs.sms_enabled :
    prefs.push_enabled;
  if (!base) return false;
  if (!category || !prefs.categories) return true;
  const catPrefs = prefs.categories[category];
  if (!catPrefs || catPrefs[channel] === undefined) return true;
  return Boolean(catPrefs[channel]);
}

async function recordDelivery(
  sb: SupabaseClient,
  input: {
    notificationId: string;
    channel: Channel;
    provider: string;
    status: "sent" | "failed" | "skipped";
    providerMessageId?: string | null;
    error?: string | null;
    attempts?: number;
  },
) {
  await sb
    .from("notification_deliveries")
    .upsert(
      {
        notification_id: input.notificationId,
        channel: input.channel,
        provider: input.provider,
        status: input.status,
        provider_message_id: input.providerMessageId ?? null,
        error: input.error ?? null,
        attempts: input.attempts ?? 1,
      } as never,
      { onConflict: "notification_id,channel" },
    );
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildEmailHtml(n: NotifRow, appOrigin: string) {
  const title = escapeHtml(n.title ?? "GrainHero notification");
  const message = escapeHtml(n.message ?? "");
  const link = n.action_url ? (n.action_url.startsWith("http") ? n.action_url : `${appOrigin}${n.action_url}`) : appOrigin;
  const cta = n.action_url
    ? `<p style="margin:24px 0 0"><a href="${link}" style="background:#059669;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:600">Open in GrainHero</a></p>`
    : "";
  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e2e8f0">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">${escapeHtml(n.category ?? "notification")}</div>
      <h1 style="font-size:20px;margin:8px 0 12px">${title}</h1>
      <p style="line-height:1.6;color:#334155;white-space:pre-wrap">${message}</p>
      ${cta}
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
      <p style="font-size:12px;color:#94a3b8">You are receiving this because you enabled email alerts for GrainHero. <a href="${appOrigin}/settings/notifications" style="color:#059669">Manage preferences</a>.</p>
    </div>
  </body></html>`;
}

async function sendSmsViaTwilio(to: string, body: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!lovableKey || !twilioKey || !from) {
    throw new Error("twilio-not-configured");
  }
  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 480) }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`twilio ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = (await res.json()) as { sid?: string };
  return j.sid ?? null;
}

export async function dispatchNotification(
  supabaseAdmin: SupabaseClient,
  notificationId: string,
): Promise<void> {
  // Load notification + recipient prefs in parallel.
  const { data: n } = await supabaseAdmin
    .from("notifications")
    .select("id, admin_id, user_id, type, category, title, message, action_url")
    .eq("id", notificationId)
    .maybeSingle<NotifRow>();
  if (!n) return;

  const [{ data: profile }, { data: prefRow }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("email, phone_e164, name")
      .eq("id", n.user_id)
      .maybeSingle<{ email: string | null; phone_e164: string | null; name: string | null }>(),
    supabaseAdmin
      .from("notification_channel_prefs")
      .select("email_enabled, sms_enabled, push_enabled, categories")
      .eq("user_id", n.user_id)
      .maybeSingle<Prefs>(),
  ]);

  const prefs: Prefs = prefRow ?? DEFAULTS;
  const severity = (n.type ?? "info") as Severity;
  const category = n.category ?? null;

  const shouldEmail =
    (forceEmail(category, severity) || channelAllowed("email", category, prefs)) && !!profile?.email;
  const shouldSms = channelAllowed("sms", category, prefs) && !!profile?.phone_e164;

  // Email
  if (shouldEmail) {
    try {
      const res = await sendEmailViaResend({
        to: profile!.email!,
        subject: n.title ?? "GrainHero notification",
        html: buildEmailHtml(n, requireAppOrigin()),
      });
      await recordDelivery(supabaseAdmin, {
        notificationId,
        channel: "email",
        provider: "resend",
        status: "sent",
        providerMessageId: res.id ?? null,
      });
    } catch (e) {
      await recordDelivery(supabaseAdmin, {
        notificationId,
        channel: "email",
        provider: "resend",
        status: "failed",
        error: (e as Error).message.slice(0, 500),
      });
    }
  } else {
    await recordDelivery(supabaseAdmin, {
      notificationId,
      channel: "email",
      provider: "resend",
      status: "skipped",
      error: !profile?.email ? "no-email" : "opt-out",
    });
  }

  // SMS
  if (shouldSms) {
    try {
      const sid = await sendSmsViaTwilio(profile!.phone_e164!, `${n.title ?? ""}\n\n${n.message ?? ""}`);
      await recordDelivery(supabaseAdmin, {
        notificationId,
        channel: "sms",
        provider: "twilio",
        status: "sent",
        providerMessageId: sid,
      });
    } catch (e) {
      const msg = (e as Error).message;
      await recordDelivery(supabaseAdmin, {
        notificationId,
        channel: "sms",
        provider: "twilio",
        status: msg === "twilio-not-configured" ? "skipped" : "failed",
        error: msg.slice(0, 500),
      });
    }
  } else {
    await recordDelivery(supabaseAdmin, {
      notificationId,
      channel: "sms",
      provider: "twilio",
      status: "skipped",
      error: !profile?.phone_e164 ? "no-phone" : "opt-out",
    });
  }

  const pushAllowed = channelAllowed("push", category, prefs);
  if (pushAllowed) {
    const devices = await loadUserDevices(supabaseAdmin, n.user_id);
    if (devices.length === 0) {
      await recordDelivery(supabaseAdmin, {
        notificationId, channel: "push", provider: "fcm",
        status: "skipped", error: "no-devices",
      });
    } else {
      const highPri = severity === "critical" || category === "security" || category === "billing";
      let anySent = false;
      let lastError: string | null = null;
      let lastMessageId: string | null = null;
      for (const dev of devices) {
        const res = await sendPush(dev.push_token, {
          title: n.title ?? "GrainHero",
          body: n.message ?? "",
          data: { notification_id: n.id, category: category ?? "", action_url: n.action_url ?? "" },
          highPriority: highPri,
        });
        if ("skipped" in res) {
          lastError = res.reason;
        } else if (res.ok) {
          anySent = true; lastMessageId = res.messageId;
          await markDeviceSuccess(supabaseAdmin, dev.id);
        } else {
          lastError = res.error;
          if (res.unregistered) await markDeviceRevoked(supabaseAdmin, dev.id, res.error);
          else await markDeviceError(supabaseAdmin, dev.id, res.error);
        }
      }
      await recordDelivery(supabaseAdmin, {
        notificationId, channel: "push", provider: "fcm",
        status: anySent ? "sent" : (lastError === "not-configured" ? "skipped" : "failed"),
        providerMessageId: lastMessageId,
        error: anySent ? null : lastError,
        attempts: devices.length,
      });
    }
  } else {
    await recordDelivery(supabaseAdmin, {
      notificationId, channel: "push", provider: "fcm",
      status: "skipped", error: "opt-out",
    });
  }
}