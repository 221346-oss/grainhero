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
import { logActivity, logManagerAction } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function resolveTenantAdminId(supabase: Row, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("admin_id")
    .eq("id", userId)
    .maybeSingle();
  return (profile as { admin_id?: string | null } | null)?.admin_id ?? userId;
}

/** Technicians in the caller's tenant with no batch currently in a non-terminal QC status. */
export const listAvailableTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["admin", "manager"]);
    const tenantAdminId = await resolveTenantAdminId(context.supabase, context.userId);

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, name, email")
      .or(`admin_id.eq.${tenantAdminId},id.eq.${tenantAdminId}`);
    if (error) throw error;

    const ids = (profiles ?? []).map((p: Row) => p.id);
    if (ids.length === 0) return [];
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids)
      .eq("role", "technician");
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
    .select("id, admin_id, batch_id, status, assigned_technician_id, silo_id, quantity_kg, qc_passed_at, manager_override_approval, manager_override_at, created_by")
    .eq("id", batchId)
    .maybeSingle();
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
  .inputValidator((d) => submitInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["technician"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.assigned_technician_id !== context.userId)
      throw new Error("This batch isn't assigned to you");
    if (!["pending_qc", "qc_failed"].includes(b.status)) {
      throw new Error(`Batch isn't awaiting QC input (currently ${b.status})`);
    }

    const intake_conditions =
      data.intake_temperature != null || data.intake_humidity != null
        ? {
            temperature: data.intake_temperature ?? null,
            humidity: data.intake_humidity ?? null,
          }
        : null;

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
  .inputValidator((d) => reviewInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["manager", "admin"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.status !== "qc_submitted")
      throw new Error(`Batch isn't awaiting manager review (currently ${b.status})`);

    const toStatus = data.decision === "pass" ? "qc_passed" : "qc_failed";
    const updateData: any = { 
      status: toStatus as never, 
      updated_by: context.userId 
    };
    
    // Add timestamp when QC passes to track 6-hour admin approval window
    if (data.decision === "pass") {
      updateData.qc_passed_at = new Date().toISOString();
    }
    
    const { error } = await context.supabase
      .from("grain_batches")
      .update(updateData as never)
      .eq("id", data.batchId);
    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id,
      action: data.decision === "pass" ? "batch.qc_passed" : "batch.qc_failed",
      targetType: "grain_batch",
      targetId: data.batchId,
      severity: "warning",
      meta: {
        batchId: b.batch_id,
        decision: data.decision,
        note: data.note ?? null,
        reviewedBy: "manager",
      },
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
  .inputValidator((d) => adminReviewInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.status !== "qc_passed")
      throw new Error(`Batch isn't awaiting admin review (currently ${b.status})`);

    const toStatus = data.decision === "approve" ? "stored" : "admin_rejected";

    if (data.decision === "approve" && b.silo_id) {
      // This is the actual stock-effective moment: occupancy is added here,
      // not at intake creation (see upsertGrainBatch in operations.functions.ts).
      // Re-check capacity against *current* occupancy — other batches may have
      // been approved into this silo since this one passed QC, so the
      // intake-time check alone can't guarantee it still fits.
      const { data: silo, error: siloErr } = await context.supabase
        .from("silos")
        .select("id, capacity_kg, current_occupancy_kg")
        .eq("id", b.silo_id)
        .single();
      if (siloErr) throw siloErr;
      const currentOccupancy = Number((silo as Row)?.current_occupancy_kg ?? 0);
      const capacity =
        (silo as Row)?.capacity_kg != null ? Number((silo as Row).capacity_kg) : null;
      const qty = Number(b.quantity_kg ?? 0);
      if (capacity != null && currentOccupancy + qty > capacity) {
        const free = Math.max(0, capacity - currentOccupancy);
        throw new Error(
          `Cannot approve: silo now only has ${free.toLocaleString()}kg free (capacity ${capacity.toLocaleString()}kg), this batch needs ${qty.toLocaleString()}kg. Another batch was likely approved into this silo since QC passed.`,
        );
      }
      const { error: occErr } = await context.supabase
        .from("silos")
        .update({
          current_occupancy_kg: currentOccupancy + qty,
          updated_by: context.userId,
        } as never)
        .eq("id", b.silo_id);
      if (occErr) throw occErr;
    }

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

const managerOverrideInput = z.object({
  batchId: z.string().uuid(),
});

/** Manager override approval after 6 hours if admin hasn't approved */
export const managerOverrideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => managerOverrideInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["manager"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    
    if (b.status !== "qc_passed")
      throw new Error(`Batch isn't awaiting approval (currently ${b.status})`);

    // Check if 6 hours have passed since qc_passed timestamp
    const qcPassedAt = b.qc_passed_at ? new Date(b.qc_passed_at).getTime() : null;
    if (!qcPassedAt) {
      throw new Error("QC passed timestamp not found");
    }

    const sixHoursInMs = 6 * 60 * 60 * 1000;
    const elapsedTime = Date.now() - qcPassedAt;

    if (elapsedTime < sixHoursInMs) {
      const remainingMinutes = Math.ceil((sixHoursInMs - elapsedTime) / (60 * 1000));
      throw new Error(
        `Admin approval period hasn't expired yet. ${remainingMinutes} minutes remaining.`
      );
    }

    // Manager can approve after 6 hours
    if (b.silo_id) {
      const { data: silo, error: siloErr } = await context.supabase
        .from("silos")
        .select("id, capacity_kg, current_occupancy_kg")
        .eq("id", b.silo_id)
        .single();
      if (siloErr) throw siloErr;
      const currentOccupancy = Number((silo as Row)?.current_occupancy_kg ?? 0);
      const capacity =
        (silo as Row)?.capacity_kg != null ? Number((silo as Row).capacity_kg) : null;
      const qty = Number(b.quantity_kg ?? 0);
      if (capacity != null && currentOccupancy + qty > capacity) {
        const free = Math.max(0, capacity - currentOccupancy);
        throw new Error(
          `Cannot approve: silo now only has ${free.toLocaleString()}kg free (capacity ${capacity.toLocaleString()}kg), this batch needs ${qty.toLocaleString()}kg.`,
        );
      }
      const { error: occErr } = await context.supabase
        .from("silos")
        .update({
          current_occupancy_kg: currentOccupancy + qty,
          updated_by: context.userId,
        } as never)
        .eq("id", b.silo_id);
      if (occErr) throw occErr;
    }

    const { error } = await context.supabase
      .from("grain_batches")
      .update({ 
        status: "stored" as never, 
        updated_by: context.userId,
        manager_override_approval: true,
        manager_override_at: new Date().toISOString(),
      } as never)
      .eq("id", data.batchId);
    if (error) throw error;

    await logManagerAction({
      actorId: context.userId,
      managerId: context.userId,
      tenantAdminId: b.admin_id,
      action: "batch.manager_override_approval",
      targetType: "grain_batch",
      targetId: data.batchId,
      meta: { 
        batchId: b.batch_id,
        hoursWaited: (elapsedTime / (60 * 60 * 1000)).toFixed(1),
        reason: "Admin approval timeout exceeded (6 hours)",
      },
    });

    return { ok: true, message: "Batch approved by manager override after 6-hour timeout" };
  });

const resolveInput = z.object({
  batchId: z.string().uuid(),
  action: z.enum(["resend_to_manager", "mark_damaged"]),
});

/** Admin explicitly resolves an admin_rejected batch — never auto-discarded. */
export const resolveRejectedBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => resolveInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.status !== "admin_rejected")
      throw new Error(`Batch isn't in admin_rejected (currently ${b.status})`);

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

/** List all batches awaiting admin approval (pending_approval status) */
export const listPendingApprovalBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const tenantAdminId = await resolveTenantAdminId(context.supabase, context.userId);

    const { data, error } = await context.supabase
      .from("grain_batches")
      .select(
        `
        *,
        silo:silos(id, name, warehouse_id),
        warehouse:warehouses(id, name),
        created_by_profile:profiles!grain_batches_created_by_fkey(id, name, email)
      `,
      )
      .eq("admin_id", tenantAdminId)
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { batches: data ?? [] };
  });

const managerApprovalInput = z.object({
  batchId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

/**
 * Admin gives the initial approval on a manager-created batch (pending_approval
 * status). Approving feeds the batch into the same, unmodified QC pipeline
 * admin-created batches use — pending_qc -> technician submits QC -> manager
 * passes/fails -> admin's FINAL approval (adminReviewBatch) -> stored. This
 * function is deliberately NOT the stock-effective moment: occupancy is only
 * committed at adminReviewBatch, same as the admin-created pipeline. Adding
 * it here too would double-count once adminReviewBatch later runs for this
 * same batch.
 */
export const reviewManagerBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => managerApprovalInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["admin"]);
    const b = await loadBatchForTransition(context.supabase, data.batchId);
    if (b.status !== "pending_approval") {
      throw new Error(`Batch isn't awaiting approval (currently ${b.status})`);
    }

    const toStatus = data.decision === "approve" ? "pending_qc" : "admin_rejected";

    if (data.decision === "approve" && b.silo_id) {
      // Early capacity sanity-check only, same as upsertGrainBatch's
      // intake-time check — an obvious "doesn't fit at all" reject before QC
      // even starts. adminReviewBatch re-checks against then-current
      // occupancy at the real stock-effective moment.
      const { data: silo, error: siloErr } = await context.supabase
        .from("silos")
        .select("id, capacity_kg, current_occupancy_kg")
        .eq("id", b.silo_id)
        .single();
      if (siloErr) throw siloErr;

      const currentOccupancy = Number((silo as Row)?.current_occupancy_kg ?? 0);
      const capacity =
        (silo as Row)?.capacity_kg != null ? Number((silo as Row).capacity_kg) : null;
      const qty = Number(b.quantity_kg ?? 0);

      if (capacity != null && currentOccupancy + qty > capacity) {
        const free = Math.max(0, capacity - currentOccupancy);
        throw new Error(
          `Cannot approve: silo only has ${free.toLocaleString()}kg free (capacity ${capacity.toLocaleString()}kg), this batch needs ${qty.toLocaleString()}kg.`,
        );
      }
    }

    // Update batch status
    const { error } = await context.supabase
      .from("grain_batches")
      .update({
        status: toStatus as never,
        updated_by: context.userId,
        ...(data.decision === "reject" && data.rejectionReason
          ? { notes: data.rejectionReason }
          : {}),
      } as never)
      .eq("id", data.batchId);
    if (error) throw error;

    // Send notification to the manager who created the batch
    if (b.created_by) {
      const notificationMessage =
        data.decision === "approve"
          ? `Batch ${b.batch_id} has been approved and sent for quality control.`
          : `Batch ${b.batch_id} has been rejected. ${data.rejectionReason || ""}`;

      await context.supabase.from("notifications").insert({
        user_id: b.created_by,
        title: data.decision === "approve" ? "Batch Approved" : "Batch Rejected",
        message: notificationMessage,
        category: "batch",
        severity: data.decision === "approve" ? "info" : "warning",
        entity_type: "grain_batch",
        entity_id: data.batchId,
        entity_ref: b.batch_id,
      } as never);
    }

    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id,
      action:
        data.decision === "approve"
          ? "batch.manager_batch_approved"
          : "batch.manager_batch_rejected",
      targetType: "grain_batch",
      targetId: data.batchId,
      severity: "warning",
      meta: {
        batchId: b.batch_id,
        decision: data.decision,
        rejectionReason: data.rejectionReason ?? null,
        approvedBy: "admin",
        affectsManagerBatch: true,
      },
    });

    // Also a security event: an admin overriding/finalizing a manager's
    // batch decision, distinct from the routine activity_logs entry above.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("security_events").insert({
      user_id: context.userId,
      tenant_id: b.admin_id,
      event: "batch_approval_override",
      meta: { batchId: b.batch_id, decision: data.decision } as never,
    });

    return { ok: true, status: toStatus };
  });
