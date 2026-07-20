/**
 * Warehouse-aware technician assignment functions for super admin platform
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole } from "./rbac.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

export const getTechniciansForWarehouse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ warehouseId: z.string().uuid().optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // If warehouseId provided, get technicians assigned to that warehouse
    if (data.warehouseId) {
      const { data: assignments, error } = await supabaseAdmin
        .from("technician_warehouse_assignments" as never)
        .select(`
          technician_id,
          is_primary,
          profiles!inner(
            id,
            name,
            email,
            phone,
            technician_status,
            current_job_count,
            max_concurrent_jobs
          )
        `)
        .eq("warehouse_id", data.warehouseId);
      
      if (error) throw error;
      
      const technicians = (assignments ?? []).map((a: any) => ({
        id: a.profiles.id,
        name: a.profiles.name,
        email: a.profiles.email,
        phone: a.profiles.phone,
        technician_status: a.profiles.technician_status || 'available',
        current_job_count: a.profiles.current_job_count || 0,
        max_concurrent_jobs: a.profiles.max_concurrent_jobs || 3,
        is_primary: a.is_primary,
        is_available: 
          a.profiles.technician_status === 'available' || 
          (a.profiles.current_job_count ?? 0) < (a.profiles.max_concurrent_jobs ?? 3),
      }));
      
      return { 
        technicians, 
        filtered_by_warehouse: true,
        warehouse_id: data.warehouseId,
      };
    }
    
    // Otherwise, get all technicians (fallback for orders without warehouse)
    const { data: techIds } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "technician");
      
    const ids = (techIds ?? []).map((r) => (r as Row).user_id as string);
    if (ids.length === 0) {
      return { 
        technicians: [] as Row[], 
        filtered_by_warehouse: false,
      };
    }
    
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs, service_areas")
      .in("id", ids);
    
    const technicians = (profiles ?? []).map((p: any) => ({
      ...p,
      is_available: 
        p.technician_status === 'available' || 
        (p.current_job_count ?? 0) < (p.max_concurrent_jobs ?? 3),
      is_primary: false,
    }));
    
    return { 
      technicians, 
      filtered_by_warehouse: false,
    };
  });

/* ---------------- Assign Technician with Warehouse Context ---------------- */

export const assignTechnicianToOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      orderId: z.string().uuid(),
      technicianId: z.string().uuid(),
      warehouseId: z.string().uuid().optional().nullable(),
      scheduledFor: z.string().datetime().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get the order
    const { data: order, error: oErr } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id, status, admin_id, warehouse_id")
      .eq("id", data.orderId)
      .single();
      
    if (oErr || !order) throw new Error("Order not found");
    const o = order as Row;

    // Update order with warehouse and technician
    const orderUpdate: any = { 
      assigned_technician_id: data.technicianId,
    };
    
    if (data.warehouseId) {
      orderUpdate.warehouse_id = data.warehouseId;
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
      
    const installPayload: any = {
      technician_id: data.technicianId,
      scheduled_for: data.scheduledFor ?? null,
      warehouse_id: data.warehouseId ?? o.warehouse_id ?? null,
      status: "scheduled",
    };
    
    if (existing) {
      await supabaseAdmin
        .from("hardware_order_installations" as never)
        .update(installPayload as never)
        .eq("id", (existing as Row).id);
    } else {
      await supabaseAdmin
        .from("hardware_order_installations" as never)
        .insert({
          order_id: data.orderId,
          ...installPayload,
        } as never);
    }
    
    // Increment technician's job count
    try {
      await supabaseAdmin.rpc("increment_technician_jobs", { 
        tech_id: data.technicianId 
      } as never);
    } catch (e) {
      console.warn("Failed to increment technician jobs:", e);
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
    z.object({
      technicianId: z.string().uuid(),
      warehouseId: z.string().uuid(),
      city: z.string().min(1).max(100),
      isPrimary: z.boolean().default(false),
    }).parse(d),
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
    const { error } = await supabaseAdmin
      .from("technician_warehouse_assignments" as never)
      .insert({
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
    z.object({
      technicianId: z.string().uuid(),
      warehouseId: z.string().uuid(),
    }).parse(d),
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
