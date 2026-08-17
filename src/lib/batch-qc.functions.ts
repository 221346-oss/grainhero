/**
 * Batch QC pipeline — Manager creates + assigns a technician (see
 * upsertGrainBatch in operations.functions.ts, which sets the new batch to
 * 'pending_qc') -> Technician submits QC values -> Manager passes/fails
 * (fail loops back for resubmission) -> Admin approves (-> 'stored') or
 * rejects (-> 'admin_rejected', then Admin explicitly resends to Manager or
 * marks 'damaged').
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "@/lib/rbac.server";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function resolveTenantAdminId(supabase: Row, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles").select("admin_id").eq("id", userId).maybeSingle();
  return (profile as { admin_id?: string | null } | null)?.admin_id ?? userId;
}

/** Technicians in the caller's tenant with no batch currently in a non-terminal QC status. */
export const listAvailableTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["admin", "manager"]);
    const tenantAdminId = await resolveTenantAdminId(context.supabase, context.userId);

    const { data: profiles, error } = await context.supabase
      .from("profiles").select("id, name, email")
      .or(`admin_id.eq.${tenantAdminId},id.eq.${tenantAdminId}`);
    if (error) throw error;

    const ids = (profiles ?? []).map((p: Row) => p.id);
    if (ids.length === 0) return [];
    const { data: roles } = await context.supabase
      .from("user_roles").select("user_id, role").in("user_id", ids).eq("role", "technician");
    const technicianIds = new Set((roles ?? []).map((r: Row) => r.user_id));

    const { data: busy } = await context.supabase
      .from("grain_batches")
      .select("assigned_technician_id")
      .in("status", ["pending_qc", "qc_submitted", "qc_failed", "qc_passed"] as never)
      .not("assigned_technician_id", "is", null);
    const busyIds = new Set((busy ?? []).map((b: Row) => b.assigned_technician_id));

    return (profiles ?? [])
      .filter((p: Row) => technicianIds.has(p.id) && !busyIds.has(p.id))
      .map((p: Row) => ({ id: p.id, name: p.name, email: p.email }));
  });

async function loadBatchForTransition(supabase: Row, batchId: string) {
  const { data, error } = await supabase
    .from("grain_batches")
    .select("id, admin_id, batch_id, status, assigned_technician_id")
    .eq("id", batchId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Batch not found");
  return data as Row;
}

const submitInput = z.object({
  batchId: z.string().uuid(),
  moisture_content: z.number().min(0).max(100).optional().nullable(),
  protein_content: z.number().min(0).max(100).optional().nullable(),
  test_weight: z.number().nonnegative().optional().nullable(),
  intake_temperature: z.number().optional().nullable(),
  intake_humidity: z.number().min(0).max(100).optional().nullable(),
});

/** The assigned technician submits QC values. pending_qc/qc_failed -> qc_submitted. */
export const submitBatchQC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => submitInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["technician"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.assigned_technician_id !== context.userId) throw new Error("This batch isn't assigned to you");
    if (!["pending_qc", "qc_failed"].includes(b.status)) {
      throw new Error(`Batch isn't awaiting QC input (currently ${b.status})`);
    }

    const intake_conditions = (data.intake_temperature != null || data.intake_humidity != null) ? {
      temperature: data.intake_temperature ?? null,
      humidity: data.intake_humidity ?? null,
    } : null;

    const { error } = await context.supabase
      .from("grain_batches")
      .update({
        moisture_content: data.moisture_content ?? null,
        protein_content: data.protein_content ?? null,
        test_weight: data.test_weight ?? null,
        intake_conditions,
        status: "qc_submitted" as never,
        updated_by: context.userId,
      } as never)
      .eq("id", data.batchId);
    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id,
      action: "batch.qc_submitted",
      targetType: "grain_batch",
      targetId: data.batchId,
      meta: { batchId: b.batch_id, from: b.status },
    });
    return { ok: true };
  });

const reviewInput = z.object({
  batchId: z.string().uuid(),
  decision: z.enum(["pass", "fail"]),
  note: z.string().trim().max(500).optional().nullable(),
});

/** Manager (or admin) reviews a qc_submitted batch. */
export const reviewBatchQC = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => reviewInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["manager", "admin"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.status !== "qc_submitted") throw new Error(`Batch isn't awaiting manager review (currently ${b.status})`);

    const toStatus = data.decision === "pass" ? "qc_passed" : "qc_failed";
    const { error } = await context.supabase
      .from("grain_batches")
      .update({ status: toStatus as never, updated_by: context.userId } as never)
      .eq("id", data.batchId);
    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id,
      action: data.decision === "pass" ? "batch.qc_passed" : "batch.qc_failed",
      targetType: "grain_batch",
      targetId: data.batchId,
      meta: { batchId: b.batch_id, note: data.note ?? null },
    });
    return { ok: true };
  });

const adminReviewInput = z.object({
  batchId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

/** Admin gives final review to a qc_passed batch. approve -> stored, reject -> admin_rejected. */
export const adminReviewBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => adminReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.status !== "qc_passed") throw new Error(`Batch isn't awaiting admin review (currently ${b.status})`);

    const toStatus = data.decision === "approve" ? "stored" : "admin_rejected";
    // Occupancy was already counted at intake (confirmed — no reserved-capacity
    // change), so approval is a pure status flip; nothing else to update.
    const { error } = await context.supabase
      .from("grain_batches")
      .update({ status: toStatus as never, updated_by: context.userId } as never)
      .eq("id", data.batchId);
    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id,
      action: data.decision === "approve" ? "batch.admin_approved" : "batch.admin_rejected",
      targetType: "grain_batch",
      targetId: data.batchId,
      meta: { batchId: b.batch_id },
    });
    return { ok: true };
  });

const resolveInput = z.object({
  batchId: z.string().uuid(),
  action: z.enum(["resend_to_manager", "mark_damaged"]),
});

/** Admin explicitly resolves an admin_rejected batch — never auto-discarded. */
export const resolveRejectedBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => resolveInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.status !== "admin_rejected") throw new Error(`Batch isn't in admin_rejected (currently ${b.status})`);

    const toStatus = data.action === "resend_to_manager" ? "pending_qc" : "damaged";
    const { error } = await context.supabase
      .from("grain_batches")
      .update({ status: toStatus as never, updated_by: context.userId } as never)
      .eq("id", data.batchId);
    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id,
      action: data.action === "resend_to_manager" ? "batch.resent_for_qc" : "batch.marked_damaged",
      targetType: "grain_batch",
      targetId: data.batchId,
      meta: { batchId: b.batch_id },
    });
    return { ok: true };
  });
