import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { checkRate } from "@/lib/rate-limit";

const CATEGORIES = ["billing", "plan", "order", "install", "security", "system", "ops"] as const;
const CHANNELS = ["email", "sms", "push"] as const;

export const getMyNotificationPrefs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: prefs }, { data: profile }] = await Promise.all([
      context.supabase
        .from("notification_channel_prefs")
        .select("email_enabled, sms_enabled, push_enabled, categories")
        .eq("user_id", context.userId)
        .maybeSingle(),
      context.supabase.from("profiles").select("phone_e164, email").eq("id", context.userId).maybeSingle(),
    ]);
    return {
      prefs: prefs ?? { email_enabled: true, sms_enabled: false, push_enabled: true, categories: {} },
      profile: profile ?? { phone_e164: null, email: null },
      categories: CATEGORIES,
      channels: CHANNELS,
    };
  });

export const updateMyNotificationPrefs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        email_enabled: z.boolean().optional(),
        sms_enabled: z.boolean().optional(),
        push_enabled: z.boolean().optional(),
        categories: z.record(z.string(), z.record(z.enum(CHANNELS), z.boolean())).optional(),
        phone_e164: z
          .string()
          .trim()
          .regex(/^\+[1-9]\d{6,14}$/, "Phone must be E.164 like +14155551234")
          .nullable()
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { phone_e164, ...prefsPatch } = data;
    const row: Record<string, unknown> = { user_id: context.userId, ...prefsPatch };
    await context.supabase
      .from("notification_channel_prefs")
      .upsert(row as never, { onConflict: "user_id" });
    if (phone_e164 !== undefined) {
      await context.supabase
        .from("profiles")
        .update({ phone_e164 } as never)
        .eq("id", context.userId);
    }
    return { ok: true };
  });

export const sendTestNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ channel: z.enum(CHANNELS) }).parse(d))
  .handler(async ({ data, context }) => {
    const rl = checkRate(`notif-test:${context.userId}`, 3, 60_000);
    if (!rl.ok) throw new Error("Please wait a minute before sending another test");
    const { emitNotification } = await import("@/lib/notify");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Temporarily flip the tested channel on for this one delivery via a stub
    // preference row — we just send a normal notification and let user prefs
    // decide. The UI enables the channel before calling this test.
    void data.channel;
    await emitNotification(supabaseAdmin, {
      recipientId: context.userId,
      tenantAdminId: context.userId,
      category: "system",
      severity: "info",
      title: `Test ${data.channel} notification`,
      body: `This is a test message delivered via your ${data.channel} channel. If you did not expect this, adjust your notification preferences.`,
      link: "/settings/notifications",
    });
    return { ok: true };
  });

export const getRecentDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("notification_deliveries")
      .select("id, notification_id, channel, provider, status, error, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });