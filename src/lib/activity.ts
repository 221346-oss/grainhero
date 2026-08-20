/**
 * Phase 1 — Unified activity logger.
 *
 * Every mutating server fn should call `logActivity({...})` instead of
 * inserting into `activity_logs` directly. This lets us evolve the schema
 * (retention, PII redaction, sinks) in one place.
 *
 * Import from server-side (server fns / .server.ts). The insert uses the
 * request-scoped Supabase client if provided, otherwise falls back to
 * `supabaseAdmin` (loaded lazily so this module stays client-safe when
 * merely imported).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export interface ActivityLogInput {
  actorId: string | null;
  managerId?: string | null; // Added to fix type errors in calls to logManagerAction
  tenantAdminId?: string | null;
  action: string; // e.g. "silo.created", "plan.upgraded"
  targetType?: string | null; // "silo" | "order" | ...
  targetId?: string | null;
  meta?: Record<string, unknown>;
  severity?: "info" | "warning" | "error";
  sb?: SupabaseClient<Database>;
}

export async function logActivity(input: ActivityLogInput): Promise<void> {
  const sb =
    input.sb ??
    (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  try {
    await sb.from("activity_logs").insert({
      admin_id: input.tenantAdminId ?? input.actorId ?? "",
      user_id: input.actorId,
      action: input.action,
      description: input.action,
      entity_type: input.targetType ?? null,
      entity_id: input.targetId ?? null,
      severity: input.severity ?? "info",
      metadata: (input.meta ?? {}) as unknown as Database["public"]["Tables"]["activity_logs"]["Insert"]["metadata"],
    });
  } catch (err) {
    // Never let logging fail the primary operation.
    console.warn("[activity] insert failed", err);
  }
}

/**
 * Log a manager action as a security event for admin review.
 * Managers are restricted users who need close monitoring of their actions.
 * All manager actions are logged with appropriate severity levels:
 * - "warning" for create/edit/delete operations
 * - "info" for view/access operations
 */
export async function logManagerAction(
  input: ActivityLogInput & { managerName?: string }
): Promise<void> {
  // Manager actions default to "warning" severity for audit visibility
  const severity = input.severity ?? "warning";

  await logActivity({
    ...input,
    severity,
    meta: {
      ...(input.meta ?? {}),
      actor_role: "manager",
      event_type: "manager_action",
      requires_admin_review: true,
    },
  });
}
