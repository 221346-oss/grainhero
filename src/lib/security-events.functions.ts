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

// Failed sign-in attempts happen BEFORE a session exists, so they can't go
// through logSecurityEvent (which requires requireSupabaseAuth). This is the
// one security-event trigger point that's legitimately pre-auth.
export const logFailedSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: { email: string; reason: string }) => data)
  .handler(async ({ data }) => {
    const ip =
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for") ||
      null;
    const ua = getRequestHeader("user-agent") || null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, admin_id")
      .eq("email", data.email.trim().toLowerCase())
      .maybeSingle();

    await supabaseAdmin.from("security_events").insert({
      user_id: profile?.id ?? null,
      tenant_id: profile?.admin_id ?? profile?.id ?? null,
      event: "sign_in_failed",
      ip,
      user_agent: ua,
      meta: { email: data.email, reason: data.reason } as never,
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

// For Administration → Security Center. RLS ("admins read tenant security
// events") already restricts this to the caller's tenant when they're
// admin/super_admin — no extra role check needed here, same as
// getSecurityOverview's use of context.supabase elsewhere.
export const listTenantSecurityEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("security_events")
      .select("id, user_id, event, ip, user_agent, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { events: data ?? [] };
  });

// "Warn" row action on a security event — sends the flagged user a
// notification via the same public.notifications table every other feature
// (batch review, installs, etc.) already writes to, plus its own security
// event so a warning is itself auditable.
export const warnUserForSecurityEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; message: string }) => data)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("admin_id")
      .eq("id", context.userId)
      .maybeSingle();

    await context.supabase.from("notifications").insert({
      user_id: data.userId,
      title: "Security warning",
      message: data.message,
      category: "security",
      severity: "warning",
    } as never);

    await supabaseAdmin.from("security_events").insert({
      user_id: context.userId,
      tenant_id: profile?.admin_id ?? context.userId,
      event: "security_warning_issued",
      meta: { targetUserId: data.userId, message: data.message } as never,
    });

    return { ok: true };
  });