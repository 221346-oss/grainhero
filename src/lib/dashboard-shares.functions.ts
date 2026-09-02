/**
 * Phase 22 — Shareable read-only dashboard links.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "@/lib/rbac.server";

function makeToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const listMyShares = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data, error } = await sb
      .from("dashboard_shares")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { shares: data ?? [] };
  });

export const createShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        title: z.string().min(1).max(120).default("Shared dashboard"),
        widget_ids: z.array(z.string().uuid()).min(1),
        expires_in_days: z.number().int().min(1).max(365).default(30),
        date_defaults: z.record(z.string(), z.any()).default({}),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const role = await getEffectiveRole(sb, context.userId);
    const token = makeToken();
    const expiresAt = new Date(Date.now() + data.expires_in_days * 86400_000).toISOString();
    const { data: row, error } = await sb
      .from("dashboard_shares")
      .insert({
        owner_user_id: context.userId,
        title: data.title,
        role_snapshot: role,
        widget_ids: data.widget_ids,
        date_defaults: data.date_defaults,
        token,
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await sb.rpc("record_governance_audit", {
      _action: "share.create",
      _target_type: "share",
      _target_key: row.id,
      _before: null,
      _after: row,
    });
    return { share: row };
  });

export const revokeShare = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { error } = await sb
      .from("dashboard_shares")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw error;
    await sb.rpc("record_governance_audit", {
      _action: "share.revoke",
      _target_type: "share",
      _target_key: data.id,
      _before: null,
      _after: null,
    });
    return { ok: true };
  });

/** Public — resolves a share token via SECURITY DEFINER RPC (no auth). */
export const resolveShare = createServerFn({ method: "POST" })
  .validator((d) => z.object({ token: z.string().min(8).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = supabaseAdmin as any;
    const { data: meta, error } = await admin.rpc("resolve_dashboard_share", {
      _token: data.token,
    });
    if (error) throw error;
    if (!meta) return { ok: false as const, error: "Link expired or revoked" };
    // Fetch widgets + metric metadata for the whitelisted ids
    const ids: string[] = meta.widget_ids ?? [];

    if (ids.length === 0)
      return {
        ok: true as const,
        meta,
        widgets: [] as any[],
        metrics: [] as any[],
        results: {} as Record<string, any>,
      };
    const { data: widgets } = await admin.from("dashboard_widgets").select("*").in("id", ids);
    const metricKeys = Array.from(
      new Set(((widgets ?? []) as Array<{ metric_key: string }>).map((w) => w.metric_key)),
    );
    const { data: metrics } = await admin.from("metric_registry").select("*").in("key", metricKeys);
    // Run each metric in the caller-agnostic way (using admin — public read-only surface).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, any> = {};
    for (const m of (metrics ?? []) as Array<{ key: string; sql_template: string }>) {
      try {
        // We can't call run_metric as anon (RLS), so execute the template with admin.
        // Only whitelisted metrics reach this path (via share widget_ids).
        const { data: raw } = await admin
          .rpc("run_metric_as_admin", { _key: m.key })
          .catch(() => ({ data: null }));
        results[m.key] = raw ?? null;
      } catch {
        results[m.key] = null;
      }
    }
    return { ok: true as const, meta, widgets: widgets ?? [], metrics: metrics ?? [], results };
  });
