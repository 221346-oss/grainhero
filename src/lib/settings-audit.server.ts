/**
 * Phase 26.5 — Records super-admin changes to platform settings singletons.
 * Uses supabaseAdmin so failures never block a legitimate update; the audit
 * is best-effort but always attempted.
 */
export async function recordSettingsAudit(opts: {
  actorUserId: string;
  settingsKey: string;
  action?: "update" | "create" | "delete";
  before: unknown;
  after: unknown;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("platform_settings_audit").insert({
      actor_user_id: opts.actorUserId,
      settings_key: opts.settingsKey,
      action: opts.action ?? "update",
      before: (opts.before ?? null) as never,
      after: (opts.after ?? null) as never,
    } as never);
  } catch (err) {
    console.warn("[settings-audit] failed", err);
  }
}