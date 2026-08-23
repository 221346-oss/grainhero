/**
 * Phase 10 — Automation rules: silo threshold → actuator command.
 * Manual issueCommand within OVERRIDE_WINDOW_SEC blocks auto-fire.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const OVERRIDE_WINDOW_SEC = 300;

const RULE_INPUT = z.object({
  id: z.string().uuid().optional(),
  siloId: z.string().uuid(),
  actuatorId: z.string().uuid(),
  triggerMetric: z.enum(["temperature", "humidity", "moisture", "co2"]),
  triggerOp: z.enum(["gt", "lt"]),
  triggerValue: z.number().finite(),
  command: z.enum(["on", "off", "pulse", "set_level", "toggle"]),
  commandParams: z.record(z.string(), z.unknown()).default({}),
  cooldownSeconds: z.number().int().min(30).max(86400).default(900),
  enabled: z.boolean().default(true),
});

export const listAutomationRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ siloId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("automation_rules")
      .select("*, actuators(id, name, actuator_type), silos(id, name)")
      .order("created_at", { ascending: false });
    if (data.siloId) q = q.eq("silo_id", data.siloId);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { rules: (rows ?? []) as Row[] };
  });

export const saveAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => RULE_INPUT.parse(d))
  .handler(async ({ data, context }) => {
    const { data: silo } = await context.supabase
      .from("silos")
      .select("admin_id")
      .eq("id", data.siloId)
      .single();
    const adminId = (silo as Row | null)?.admin_id as string | undefined;
    if (!adminId) throw new Error("Silo not found");

    const patch = {
      admin_id: adminId,
      silo_id: data.siloId,
      actuator_id: data.actuatorId,
      trigger_metric: data.triggerMetric,
      trigger_op: data.triggerOp,
      trigger_value: data.triggerValue,
      command: data.command,
      command_params: data.commandParams,
      cooldown_seconds: data.cooldownSeconds,
      enabled: data.enabled,
    };
    const q = data.id
      ? context.supabase
          .from("automation_rules")
          .update(patch as never)
          .eq("id", data.id)
          .select("id")
          .single()
      : context.supabase
          .from("automation_rules")
          .insert(patch as never)
          .select("id")
          .single();
    const { data: saved, error } = await q;
    if (error) throw error;

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId,
      tenantAdminId: adminId,
      action: data.id ? "automation_rule.updated" : "automation_rule.created",
      targetType: "automation_rule",
      targetId: (saved as Row).id as string,
      meta: { metric: data.triggerMetric, op: data.triggerOp, value: data.triggerValue },
    });
    return { id: (saved as Row).id as string };
  });

export const deleteAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("automation_rules").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const toggleAutomationRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("automation_rules")
      .update({ enabled: data.enabled } as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/**
 * Called from writeReadingAndEvaluate after a reading is stored.
 * Loads matching enabled rules and queues an actuator command when triggered
 * and outside cooldown, unless a manual command was issued in the last 5min.
 */
export async function evaluateAutomationForReading(
  sb: SB,
  input: { adminId: string; siloId: string; metric: string; value: number },
): Promise<{ fired: number }> {
  const { data: rules } = await sb
    .from("automation_rules")
    .select("*")
    .eq("silo_id", input.siloId)
    .eq("trigger_metric", input.metric)
    .eq("enabled", true);
  const list = (rules ?? []) as Row[];
  if (list.length === 0) return { fired: 0 };

  let fired = 0;
  for (const r of list) {
    const triggerValue = Number(r.trigger_value);
    const matches = r.trigger_op === "gt" ? input.value > triggerValue : input.value < triggerValue;
    if (!matches) continue;

    // Cooldown
    if (r.last_fired_at) {
      const ageSec = (Date.now() - new Date(r.last_fired_at as string).getTime()) / 1000;
      if (ageSec < Number(r.cooldown_seconds ?? 900)) continue;
    }

    // Manual override: skip if a manual command hit this actuator in the last N sec
    const overrideSince = new Date(Date.now() - OVERRIDE_WINDOW_SEC * 1000).toISOString();
    const { data: manual } = await sb
      .from("actuator_commands")
      .select("id")
      .eq("actuator_id", r.actuator_id)
      .eq("source", "manual")
      .gte("created_at", overrideSince)
      .limit(1);
    if (manual && (manual as Row[]).length) continue;

    // Enqueue
    await sb.from("actuator_commands").insert({
      admin_id: input.adminId,
      actuator_id: r.actuator_id,
      issued_by: null,
      command: r.command,
      params: r.command_params ?? {},
      status: "queued",
      source: "automation",
    } as never);

    await sb
      .from("automation_rules")
      .update({ last_fired_at: new Date().toISOString() } as never)
      .eq("id", r.id);
    fired += 1;
  }
  return { fired };
}
