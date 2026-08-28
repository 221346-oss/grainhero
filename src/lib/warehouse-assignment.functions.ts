/**
 * Warehouse-aware technician assignment functions for super admin platform
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "./rbac.server";

type Row = Record<string, any>;

/* ---------------- Get Admin Warehouses ---------------- */

export const getAdminWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ adminId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: warehouses, error } = await supabaseAdmin
      .from("warehouses")
      .select("id, name, warehouse_id, location, total_capacity_kg, total_silos")
      .eq("admin_id", data.adminId)
      .is("deleted_at", null)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Parse location JSONB to get city
    const warehousesWithCity = (warehouses ?? []).map((w: any) => ({
      ...w,
      city: w.location?.city || w.location?.address || null,
    }));

    return { warehouses: warehousesWithCity as Row[] };
  });

/* ---------------- Get Technicians by Warehouse ---------------- */

// Super-admin fleet: profiles with admin_id IS NULL that carry the technician
// role (i.e. the technicians created on the Company Technicians page). Shared
// by every technician picker so a freshly created technician is always
// assignable, even before they have any warehouse assignment.
async function fetchGlobalTechnicians(supabaseAdmin: any): Promise<Row[]> {
  const { data: globalTechs } = await supabaseAdmin
    .from("profiles")
    .select("id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs")
    .is("admin_id", null);

  if (!globalTechs || globalTechs.length === 0) return [];

  // Verify they have the technician role (a profile row alone isn't enough —
  // the fleet list filters on the role in user_roles).
  const { data: techRoles } = await supabaseAdmin
    .from("user_roles")
    .select("user_id")
    .eq("role", "technician")
    .in(
      "user_id",
      globalTechs.map((t: any) => t.id),
    );

  const validTechIds = new Set((techRoles ?? []).map((r: any) => r.user_id));

  return (globalTechs ?? [])
    .filter((p: any) => validTechIds.has(p.id))
    .map((p: any) => ({
      ...p,
      // Availability is a two-part gate: the technician must have declared
      // themselves available AND have a free job slot. A manual on_leave /
      // offline status must never be overridden by a free slot.
      is_available:
        p.technician_status === "available" &&
        (p.current_job_count ?? 0) < (p.max_concurrent_jobs ?? 3),
      is_primary: false,
    }));
}

export const getTechniciansForWarehouse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ warehouseId: z.string().uuid().optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Always start from the super-admin fleet so newly created technicians are
    // visible even before they are assigned to any warehouse.
    const globalTechnicians = await fetchGlobalTechnicians(supabaseAdmin);

    // If warehouseId provided, surface the technicians assigned to that
    // warehouse first, then the rest of the fleet.
    if (data.warehouseId) {
      // NOTE: technician_warehouse_assignments has MULTIPLE foreign keys to
      // profiles (technician_id, admin_id, assigned_by), so a bare
      // `profiles!inner(...)` embed is ambiguous (PGRST201) and the query
      // fails. The explicit FK hint disambiguates it.
      const { data: assignments, error } = await supabaseAdmin
        .from("technician_warehouse_assignments" as never)
        .select(
          `
          technician_id,
          is_primary,
          profiles!technician_warehouse_assignments_technician_id_fkey!inner(
            id,
            name,
            email,
            phone,
            technician_status,
            current_job_count,
            max_concurrent_jobs
          )
        `,
        )
        .eq("warehouse_id", data.warehouseId);

      if (error) throw error;

      const warehouseTechnicians = (assignments ?? []).map((a: any) => ({
        id: a.profiles.id,
        name: a.profiles.name,
        email: a.profiles.email,
        phone: a.profiles.phone,
        technician_status: a.profiles.technician_status || "available",
        current_job_count: a.profiles.current_job_count || 0,
        max_concurrent_jobs: a.profiles.max_concurrent_jobs || 3,
        is_primary: a.is_primary,
        is_available:
          a.profiles.technician_status === "available" &&
          (a.profiles.current_job_count ?? 0) < (a.profiles.max_concurrent_jobs ?? 3),
      }));

      // Merge: warehouse-assigned first, then the remaining fleet (dedupe).
      const seen = new Set(warehouseTechnicians.map((t: any) => t.id));
      const technicians = [
        ...warehouseTechnicians,
        ...globalTechnicians.filter((t: any) => !seen.has(t.id)),
      ];

      return {
        technicians,
        filtered_by_warehouse: (assignments ?? []).length > 0,
        warehouse_id: data.warehouseId,
      };
    }

    return {
      technicians: globalTechnicians,
      filtered_by_warehouse: false,
    };
  });

/* ---------------- Assign Technician with Warehouse Context ---------------- */

export const assignTechnicianToOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        technicianId: z.string().uuid(),
        warehouseId: z.string().uuid().optional().nullable(),
        scheduledFor: z.string().datetime().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get the order
    const { data: order, error: oErr } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id, status, admin_id, warehouse_id, assigned_technician_id")
      .eq("id", data.orderId)
      .single();

    if (oErr || !order) throw new Error("Order not found");
    const o = order as Row;

    const prevTechnicianId = (o.assigned_technician_id as string | null) ?? null;

    // Respect the technician's self-declared availability AND capacity: a
    // technician who set on_leave/offline, or who is already at their max
    // concurrent jobs, must not receive new tasks. Same-tech re-assignment is
    // a no-op (no new slot is taken), so it is allowed.
    const { data: techProfile } = await supabaseAdmin
      .from("profiles")
      .select("technician_status, current_job_count, max_concurrent_jobs")
      .eq("id", data.technicianId)
      .maybeSingle();
    if (techProfile) {
      const tp = techProfile as Row;
      if (["on_leave", "offline"].includes(tp.technician_status)) {
        throw new Error(
          "This technician is unavailable (on leave / offline) — they must set themselves available first.",
        );
      }
      const atCapacity = (tp.current_job_count ?? 0) >= (tp.max_concurrent_jobs ?? 3);
      if (atCapacity && prevTechnicianId !== data.technicianId) {
        throw new Error(
          `This technician is at capacity (${tp.current_job_count ?? 0}/${tp.max_concurrent_jobs ?? 3}). Complete an install, reassign one, or raise their max concurrent jobs first.`,
        );
      }
    }

    // Update order with warehouse and technician
    const orderUpdate: any = {
      assigned_technician_id: data.technicianId,
    };

    if (data.warehouseId) {
      orderUpdate.warehouse_id = data.warehouseId;
    }

    // Always persist the scheduled date on the order (including same-tech
    // reassignment) so the orders page shows it.
    if (data.scheduledFor) {
      orderUpdate.scheduled_install_date = data.scheduledFor;
    } else if (data.scheduledFor === null && prevTechnicianId === data.technicianId) {
      // Don't clear the schedule on same-tech reassignment if no new date given
    } else {
      orderUpdate.scheduled_install_date = null;
    }

    await supabaseAdmin
      .from("hardware_orders" as never)
      .update(orderUpdate as never)
      .eq("id", data.orderId);

    // Update or create installation record
    const { data: existing } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id")
      .eq("order_id", data.orderId)
      .maybeSingle();

    if (existing) {
      // Do NOT reset the install's status on (re)assignment — the
      // enforce_install_status_forward trigger rejects moving an install
      // backward (e.g. completed -> scheduled), which used to abort the whole
      // assignment and left the order assigned but the install row without a
      // technician. Only the technician/schedule/warehouse are updated.
      await supabaseAdmin
        .from("hardware_order_installations" as never)
        .update({
          technician_id: data.technicianId,
          scheduled_for: data.scheduledFor ?? null,
          warehouse_id: data.warehouseId ?? o.warehouse_id ?? null,
        } as never)
        .eq("id", (existing as Row).id);
    } else {
      await supabaseAdmin.from("hardware_order_installations" as never).insert({
        order_id: data.orderId,
        technician_id: data.technicianId,
        scheduled_for: data.scheduledFor ?? null,
        warehouse_id: data.warehouseId ?? o.warehouse_id ?? null,
        status: "scheduled",
      } as never);
    }

    // Increment technician's job count — and release the previous technician's
    // slot first when reassigning, so the counter never over-counts (the
    // decrement RPC was never called anywhere — that's why counts climbed past
    // the max and showed e.g. 4/3).
    try {
      if (prevTechnicianId && prevTechnicianId !== data.technicianId) {
        await supabaseAdmin.rpc("decrement_technician_jobs", {
          tech_id: prevTechnicianId,
        } as never);
      }
      if (prevTechnicianId !== data.technicianId) {
        await supabaseAdmin.rpc("increment_technician_jobs", {
          tech_id: data.technicianId,
        } as never);
      }
    } catch (e) {
      console.warn("Failed to sync technician jobs:", e);
      // Non-critical, continue
    }

    // Send notifications
    const { emitNotification } = await import("@/lib/notify");
    if (o.admin_id) {
      await emitNotification(supabaseAdmin, {
        recipientId: o.admin_id as string,
        tenantAdminId: o.admin_id as string,
        category: "install",
        severity: "info",
        title: "Technician assigned to your install",
        body: data.scheduledFor
          ? `Scheduled for ${new Date(data.scheduledFor).toLocaleString()}`
          : "You will receive a scheduling update shortly.",
        link: `/orders`,
        entityType: "hardware_order",
        entityId: data.orderId,
      });
    }

    await emitNotification(supabaseAdmin, {
      recipientId: data.technicianId,
      tenantAdminId: data.technicianId,
      category: "install",
      severity: "info",
      title: "New install assignment",
      body: `Order ${data.orderId.slice(0, 8)} was assigned to you.`,
      link: `/technician/installs`,
      entityType: "hardware_order",
      entityId: data.orderId,
    });

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId,
      tenantAdminId: (o.admin_id as string) ?? null,
      action: "order.technician_assigned",
      targetType: "hardware_order",
      targetId: data.orderId,
      meta: {
        technicianId: data.technicianId,
        warehouseId: data.warehouseId,
      },
    });

    return { ok: true };
  });

/* ---------------- Manage Technician-Warehouse Assignments ---------------- */

export const assignTechnicianToWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        technicianId: z.string().uuid(),
        warehouseId: z.string().uuid(),
        city: z.string().min(1).max(100),
        isPrimary: z.boolean().default(false),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get warehouse to verify admin_id
    const { data: warehouse } = await supabaseAdmin
      .from("warehouses")
      .select("admin_id")
      .eq("id", data.warehouseId)
      .single();

    if (!warehouse) throw new Error("Warehouse not found");

    // Create assignment
    const { error } = await supabaseAdmin.from("technician_warehouse_assignments" as never).insert({
      technician_id: data.technicianId,
      warehouse_id: data.warehouseId,
      admin_id: (warehouse as Row).admin_id,
      city: data.city,
      is_primary: data.isPrimary,
      assigned_by: context.userId,
    } as never);

    if (error) throw error;

    return { ok: true };
  });

export const removeTechnicianFromWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        technicianId: z.string().uuid(),
        warehouseId: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("technician_warehouse_assignments")
      .delete()
      .eq("technician_id", data.technicianId)
      .eq("warehouse_id", data.warehouseId);

    if (error) throw error;

    return { ok: true };
  });

/* ---------------- Get Warehouse Operations Metrics ---------------- */

export const getWarehouseMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ warehouseId: z.string().uuid().optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.warehouseId) {
      // Get metrics for specific warehouse
      const { data: metrics, error } = await supabaseAdmin
        .from("warehouse_metrics")
        .select("*")
        .eq("warehouse_id", data.warehouseId)
        .order("metric_date", { ascending: false })
        .limit(30); // Last 30 days

      if (error) throw error;
      return { metrics: metrics ?? [], warehouse_id: data.warehouseId };
    }

    // Get all warehouses summary from view
    const { data: summary, error } = await supabaseAdmin
      .from("warehouse_operations_summary_v" as never)
      .select("*")
      .order("warehouse_name", { ascending: true });

    if (error) throw error;
    return { warehouses: summary ?? [] };
  });
