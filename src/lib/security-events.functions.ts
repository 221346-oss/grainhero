import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type LogInput = {
  event: string;
  meta?: Record<string, unknown>;
};

export const logSecurityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: LogInput) => data)
  .handler(async ({ data, context }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for") ||
      null;
    const ua = getRequestHeader("user-agent") || null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("admin_id")
      .eq("id", context.userId)
      .maybeSingle();

    await supabaseAdmin.from("security_events").insert({
      user_id: context.userId,
      tenant_id: profile?.admin_id ?? context.userId,
      event: data.event,
      ip,
      user_agent: ua,
      meta: (data.meta ?? {}) as never,
    });

    return { ok: true };
  });

export const listMySecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("security_events")
      .select("id, event, ip, user_agent, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return { events: data ?? [] };
  });