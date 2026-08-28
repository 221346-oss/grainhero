/**
 * Phase 22 — Rate-limited insurance webhook replay with history.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "@/lib/rbac.server";

type OpsCfg = {
  webhook_max_replays_per_hour: number;
  webhook_min_backoff_seconds: number;
  webhook_cooldown_failures: number;
  webhook_cooldown_seconds: number;
};

const DEFAULTS: OpsCfg = {
  webhook_max_replays_per_hour: 6,
  webhook_min_backoff_seconds: 60,
  webhook_cooldown_failures: 3,
  webhook_cooldown_seconds: 900,
};

async function loadOps(sb: any): Promise<OpsCfg> {
  const { data } = await sb
    .from("platform_settings")
    .select("config")
    .eq("id", "singleton")
    .maybeSingle();
  return { ...DEFAULTS, ...(data?.config?.platform_ops_settings ?? {}) };
}

export const safeReplayWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ event_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);

    const sb = context.supabase as any;
    const cfg = await loadOps(sb);
    const { data: ev, error: evErr } = await sb
      .from("insurance_webhook_events")
      .select("*")
      .eq("id", data.event_id)
      .single();
    if (evErr || !ev) throw new Error("Event not found");

    const now = Date.now();
    if (ev.next_replay_allowed_at && new Date(ev.next_replay_allowed_at).getTime() > now) {
      const wait = Math.ceil((new Date(ev.next_replay_allowed_at).getTime() - now) / 1000);
      return {
        ok: false as const,
        error: `Cooldown active. Retry in ${wait}s`,
        cooldown_seconds: wait,
        history: [] as any[],
      };
    }

    const history: Array<{ at: string; ok: boolean; actor?: string; error?: string | null }> =
      Array.isArray(ev.replay_history) ? ev.replay_history : [];
    const oneHourAgo = now - 3600_000;
    const recentCount = history.filter((h) => new Date(h.at).getTime() > oneHourAgo).length;
    if (recentCount >= cfg.webhook_max_replays_per_hour) {
      return {
        ok: false as const,
        error: `Hourly replay cap reached (${cfg.webhook_max_replays_per_hour}/h)`,
        cooldown_seconds: 0,
        history: history as any[],
      };
    }

    const { replayInsuranceWebhookEvent } = await import("@/lib/insurance.functions");

    const res: any = await (replayInsuranceWebhookEvent as any)({
      data: { event_id: data.event_id },
    });
    const success = !!res?.ok;

    const nextEntry = {
      at: new Date().toISOString(),
      ok: success,
      actor: context.userId,
      error: success ? null : (res?.result?.error ?? "unknown"),
    };
    const newHistory = [nextEntry, ...history].slice(0, 50);
    const failuresInWindow = newHistory
      .slice(0, cfg.webhook_cooldown_failures)
      .filter((h) => !h.ok).length;
    const nextAllowed =
      failuresInWindow >= cfg.webhook_cooldown_failures
        ? new Date(now + cfg.webhook_cooldown_seconds * 1000).toISOString()
        : new Date(now + cfg.webhook_min_backoff_seconds * 1000).toISOString();

    await sb
      .from("insurance_webhook_events")
      .update({
        replay_count: (ev.replay_count ?? 0) + 1,
        last_replay_at: new Date().toISOString(),
        next_replay_allowed_at: nextAllowed,
        replay_history: newHistory,
      })
      .eq("id", data.event_id);

    return {
      ok: success,
      next_replay_allowed_at: nextAllowed,
      history: newHistory as any[],
      cooldown_seconds: 0,
    };
  });

export const getReplayHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ event_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);

    const sb = context.supabase as any;
    const { data: ev } = await sb
      .from("insurance_webhook_events")
      .select("replay_count,last_replay_at,next_replay_allowed_at,replay_history")
      .eq("id", data.event_id)
      .maybeSingle();
    return { event: ev ?? null };
  });
