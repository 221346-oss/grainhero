import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listPushDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("notification_deliveries")
      .select("id, notification_id, channel, provider, status, error, provider_message_id, attempts, created_at")
      .eq("channel", "push")
      .order("created_at", { ascending: false })
      .limit(100);
    return { rows: (data ?? []) as Array<Record<string, any>> };
  });

export const listRegisteredDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("mobile_devices")
      .select("id, user_id, platform, app_version, last_seen_at, last_push_success_at, last_push_error, last_push_error_at, revoked_at")
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(100);
    return { rows: (data ?? []) as Array<Record<string, any>> };
  });

const testSchema = z.object({
  device_id: z.string().uuid(),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(500),
});

export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => testSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dev } = await supabaseAdmin
      .from("mobile_devices")
      .select("id, push_token, revoked_at")
      .eq("id", data.device_id).maybeSingle();
    if (!dev || !dev.push_token || dev.revoked_at) throw new Error("device not sendable");
    const { sendPush, markDeviceRevoked, markDeviceSuccess, markDeviceError } = await import("./push-dispatch.server");
    const res = await sendPush(dev.push_token, { title: data.title, body: data.body, data: { source: "diagnostic" } });
    if ("skipped" in res) return { status: "skipped", reason: res.reason };
    if (res.ok) { await markDeviceSuccess(supabaseAdmin, dev.id); return { status: "sent", message_id: res.messageId }; }
    if (res.unregistered) await markDeviceRevoked(supabaseAdmin, dev.id, res.error);
    else await markDeviceError(supabaseAdmin, dev.id, res.error);
    return { status: "failed", error: res.error };
  });
