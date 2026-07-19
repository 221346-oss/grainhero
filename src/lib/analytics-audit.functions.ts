/**
 * Phase 22 — Analytics governance audit log (super-admin only).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "@/lib/rbac.server";

export const listGovernanceAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    target_type: z.enum(["all", "metric", "widget", "share", "refresh"]).default("all"),
    limit: z.number().int().min(1).max(500).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let q = sb.from("analytics_governance_audit").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.target_type !== "all") q = q.eq("target_type", data.target_type);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { rows: rows ?? [] };
  });

export const exportGovernanceAuditCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    target_type: z.enum(["all", "metric", "widget", "share", "refresh"]).default("all"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let q = sb.from("analytics_governance_audit").select("created_at,actor_user_id,action,target_type,target_key").order("created_at", { ascending: false }).limit(10000);
    if (data.target_type !== "all") q = q.eq("target_type", data.target_type);
    const { data: rows, error } = await q;
    if (error) throw error;
    const header = "created_at,actor,action,target_type,target_key";
    const body = ((rows ?? []) as Array<{ created_at: string; actor_user_id: string | null; action: string; target_type: string; target_key: string | null }>)
      .map((r) => [r.created_at, r.actor_user_id ?? "", r.action, r.target_type, r.target_key ?? ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    return { csv: `${header}\n${body}` };
  });