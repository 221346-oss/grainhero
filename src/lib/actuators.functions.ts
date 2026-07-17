/**
 * Phase 9 — Actuator command queue.
 * issueCommand: admin/manager; ackCommand called by device bridge; expireStale runs from cron.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "@/lib/rbac.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const ISSUE_INPUT = z.object({
  actuatorId: z.string().uuid(),
  command: z.enum(["on", "off", "toggle", "pulse", "set_level"]),
  params: z.record(z.string(), z.unknown()).default({}),
});

export const issueCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => ISSUE_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["admin", "manager", "super_admin", "technician"].includes(role)) throw new Error("Forbidden");

    const { data: act } = await context.supabase
      .from("actuators").select("id, admin_id, status").eq("id", data.actuatorId).maybeSingle();
    if (!act) throw new Error("Actuator not found");
    const a = act as Row;

    // Simple rate limit: max 6 commands per actuator per minute
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await context.supabase
      .from("actuator_commands")
      .select("id", { count: "exact", head: true })
      .eq("actuator_id", data.actuatorId)
      .gte("created_at", since);
    if ((count ?? 0) >= 6) throw new Error("RATE_LIMIT: too many commands, wait a moment");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cmd, error } = await supabaseAdmin
      .from("actuator_commands")
      .insert({
        admin_id: a.admin_id,
        actuator_id: data.actuatorId,
        issued_by: context.userId,
        command: data.command,
        params: data.params,
        status: "queued",
      } as never)
      .select("id, correlation_id")
      .single();
    if (error) throw error;

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId,
      tenantAdminId: a.admin_id as string,
      action: "actuator.command_issued",
      targetType: "actuator", targetId: data.actuatorId,
      meta: { command: data.command, correlationId: (cmd as Row).correlation_id },
    });
    return { id: (cmd as Row).id as string, correlationId: (cmd as Row).correlation_id as string };
  });

export const listCommands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ actuatorId: z.string().uuid().optional(), limit: z.number().int().min(1).max(200).default(50) }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("actuator_commands").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.actuatorId) q = q.eq("actuator_id", data.actuatorId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { commands: (rows ?? []) as Row[] };
  });

/** Called by the device bridge (public HTTP) to mark ack/failed. */
export async function ackCommandByCorrelation(
  correlationId: string,
  outcome: "ack" | "failed",
  error?: string | null,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const patch: Row = outcome === "ack"
    ? { status: "ack", ack_at: new Date().toISOString(), error: null }
    : { status: "failed", ack_at: new Date().toISOString(), error: error ?? "unknown" };
  const { data, error: e } = await supabaseAdmin
    .from("actuator_commands")
    .update(patch as never)
    .eq("correlation_id", correlationId)
    .select("id")
    .maybeSingle();
  if (e) return false;
  return !!data;
}

/** Cron sweep: mark queued commands past expires_at as expired. */
export async function expireStaleCommands(): Promise<{ expired: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("actuator_commands")
    .update({ status: "expired" } as never)
    .in("status", ["queued", "sent"])
    .lt("expires_at", new Date().toISOString())
    .select("id");
  return { expired: (data as Row[] | null)?.length ?? 0 };
}
