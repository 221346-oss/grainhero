import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Assign a QC task to a technician ──────────────────────────────────────
export const assignQCTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) =>
    z
      .object({
        id: z.string().uuid(),
        assigned_to: z.string().uuid(),
      })
      .parse(v)
  )
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./rbac.server");
    await requireRole(context.supabase, context.userId, [
      "admin",
      "manager",
      "super_admin",
    ]);

    // Policy: A technician can only be assigned to 1 active batch (testing/pending) at a time
    const { data: activeTasks, error: activeErr } = await context.supabase
      .from("grain_batches")
      .select("id, batch_id")
      .eq("qc_assigned_to", data.assigned_to)
      .in("qc_status", ["testing", "pending"])
      .neq("id", data.id);

    if (activeErr) throw new Error(activeErr.message);
    if (activeTasks && activeTasks.length > 0) {
      throw new Error(`Technician is already assigned to active batch ${activeTasks[0].batch_id}. Each technician can only work on 1 batch at a time.`);
    }

    const { error } = await context.supabase
      .from("grain_batches")
      .update({
        qc_assigned_to: data.assigned_to,
        qc_status: "testing",
      } as never)
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ─── Technician submits quality measurements ──────────────────────────────
export const submitQCResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) =>
    z
      .object({
        id: z.string().uuid(),
        moisture_content: z.number().min(0).max(100).optional().nullable(),
        protein_content: z.number().min(0).max(100).optional().nullable(),
        test_weight: z.number().min(0).optional().nullable(),
        qc_notes: z.string().max(2000).optional().nullable(),
      })
      .parse(v)
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {
      qc_status: "pending",
      qc_notes: data.qc_notes ?? null,
    };
    if (data.moisture_content != null) patch.moisture_content = data.moisture_content;
    if (data.protein_content != null) patch.protein_content = data.protein_content;
    if (data.test_weight != null) patch.test_weight = data.test_weight;

    const { error } = await context.supabase
      .from("grain_batches")
      .update(patch as never)
      .eq("id", data.id)
      .eq("qc_assigned_to", context.userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Manager approves or rejects QC result ───────────────────────────────
export const approveQCResult = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) =>
    z
      .object({
        id: z.string().uuid(),
        passed: z.boolean(),
      })
      .parse(v)
  )
  .handler(async ({ data, context }) => {
    const { requireRole } = await import("./rbac.server");
    await requireRole(context.supabase, context.userId, [
      "admin",
      "manager",
      "super_admin",
    ]);

    const { error } = await context.supabase
      .from("grain_batches")
      .update({
        qc_status: data.passed ? "passed" : "failed",
        status: data.passed ? "stored" : "on_hold",
        qc_completed_at: new Date().toISOString(),
        qc_completed_by: context.userId,
      } as never)
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Technician fetches their own QC tasks ─────────────────────────────────
export const getMyQCTasks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("grain_batches")
      .select(
        "id, batch_id, grain_type, quantity_kg, qc_status, qc_notes, moisture_content, protein_content, test_weight, silo_id, created_at"
      )
      .eq("qc_assigned_to", context.userId)
      .eq("qc_status", "testing")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ─── List technicians for manager assignment (with 1-to-1 availability flag) ─────────────
export const listTenantTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const adminId = prof?.admin_id ?? prof?.id ?? context.userId;

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, name, email, phone")
      .or(`admin_id.eq.${adminId},id.eq.${adminId}`)
      .limit(100);

    if (error) throw new Error(error.message);
    if (!profiles || profiles.length === 0) return [];

    // Check which technicians have active QC tasks OR active field incidents
    const techIds = profiles.map((p) => p.id);
    const [{ data: activeBatches }, { data: activeIncidents }] = await Promise.all([
      context.supabase
        .from("grain_batches")
        .select("qc_assigned_to, batch_id")
        .in("qc_assigned_to", techIds)
        .in("qc_status", ["testing", "pending"]),
      context.supabase
        .from("field_incidents")
        .select("assigned_to, category")
        .in("assigned_to", techIds)
        .in("status", ["open", "investigating"] as never),
    ]);

    const busyMap: Record<string, string> = {};
    if (activeBatches) {
      activeBatches.forEach((b) => {
        if (b.qc_assigned_to) busyMap[b.qc_assigned_to] = `QC: ${b.batch_id}`;
      });
    }
    if (activeIncidents) {
      activeIncidents.forEach((inc) => {
        if (inc.assigned_to) busyMap[inc.assigned_to] = `Incident: ${inc.category}`;
      });
    }

    return profiles.map((p) => ({
      ...p,
      is_busy: Boolean(busyMap[p.id]),
      active_batch_id: busyMap[p.id] ?? null,
    }));
  });




