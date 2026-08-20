import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { assertPlanAllows } from "@/lib/plan-gate";
import { requireRole } from "@/lib/rbac.server";
import { logActivity, logManagerAction } from "@/lib/activity";

// Roles allowed to rename a silo/warehouse — same allow-list used for team
// invite/manage (see inviteTeamMember/updateTeamMember in
// team-settings-insurance.functions.ts). Technicians are excluded.
const RENAME_ROLES = ["super_admin", "admin", "manager"] as const;

// Roles allowed to rename a silo. Managers are excluded from editing silos.
const SILO_RENAME_ROLES = ["super_admin", "admin"] as const;

// Turn ZodError into a readable one-liner so the client toast is helpful.
function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const msg = r.error.issues.map((i) => `${i.path.join(".") || "field"}: ${i.message}`).join(" · ");
  throw new Error(msg);
}

export const listWarehousesByCity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Get user role
    const { getEffectiveRole } = await import("./rbac.server");
    const userRole = await getEffectiveRole(context.supabase, context.userId);
    
    let query = context.supabase
      .from("warehouses")
      .select("*, silos:silos(id, silo_id, name, capacity_kg, current_occupancy_kg, status)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // For managers and technicians: only show their assigned warehouses
    if (userRole === "manager" || userRole === "technician") {
      if (userRole === "manager") {
        query = query.eq("manager_id", context.userId);
      } else if (userRole === "technician") {
        query = query.contains("technician_ids", [context.userId]);
      }
    }

    const { data: warehouses, error } = await query;
    if (error) throw error;

    // Group warehouses by city (extracted from address)
    const warehousesByCity: Record<string, any[]> = {};
    
    (warehouses ?? []).forEach((warehouse) => {
      // Extract city from address - assume format like "Street, City, State"
      let city = "Unknown City";
      const loc = warehouse.location as { address?: string; city?: string } | null;
      const address = typeof loc?.address === "string" ? loc.address : undefined;
      if (typeof loc?.city === "string" && loc.city.trim()) {
        city = loc.city.trim();
      } else if (address) {
        const addressParts = address.split(',');
        if (addressParts.length >= 2) {
          city = addressParts[1].trim();
        } else {
          city = addressParts[0].trim();
        }
      }
      
      if (!warehousesByCity[city]) {
        warehousesByCity[city] = [];
      }
      
      warehousesByCity[city].push({
        ...warehouse,
        city,
        siloCount: warehouse.silos?.length || 0,
        totalCapacity: warehouse.silos?.reduce((sum: number, silo: any) => 
          sum + (silo.capacity_kg || 0), 0) || 0,
        currentOccupancy: warehouse.silos?.reduce((sum: number, silo: any) => 
          sum + (silo.current_occupancy_kg || 0), 0) || 0,
      });
    });

    return { byCity: warehousesByCity, userRole };
  });

export const listWarehouses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Get user role
    const { getEffectiveRole } = await import("./rbac.server");
    const userRole = await getEffectiveRole(context.supabase, context.userId);

    let query = context.supabase
      .from("warehouses")
      .select("*, silos:silos(id)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);

    // For managers and technicians: only show their assigned warehouses
    if (userRole === "manager" || userRole === "technician") {
      if (userRole === "manager") {
        // Managers see warehouses where they are the manager
        query = query.eq("manager_id", context.userId);
      } else if (userRole === "technician") {
        // Technicians see warehouses where they are in the technician_ids array
        query = query.contains("technician_ids", [context.userId]);
      }
    }
    // For super_admin and admin: show all warehouses (RLS enforces tenant scoping)

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  });

const warehouseInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  // Auto-generated on insert if omitted (same pattern as silo_id below) —
  // the create-warehouse form has no field for this and never sends one.
  warehouse_id: z.string().min(1).max(50).optional(),
  location_description: z.string().max(500).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  total_capacity_kg: z.number().nonnegative().optional().nullable(),
  status: z.enum(["active", "offline", "error", "maintenance"]).default("active"),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(warehouseInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({
        feature: "max_warehouses",
        sb: context.supabase,
        userId: context.userId,
      });
    }
    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    // Managers/technicians have profiles.admin_id set to their tenant admin; admins have it null.
    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const location = {
      description: data.location_description ?? null,
      address: data.address ?? null,
    };
    if (data.id) {
      // Update: don't touch warehouse_id (immutable, same convention as silos).
      // Renaming (changing `name`) is gated to admin/manager/super_admin —
      // same allow-list as team invite/manage — everything else in this
      // form stays open to whoever could already edit a warehouse.
      const { data: current } = await context.supabase
        .from("warehouses")
        .select("name")
        .eq("id", data.id)
        .maybeSingle();
      if (current && current.name !== data.name) {
        await requireRole(context.supabase, context.userId, [...RENAME_ROLES]);
      }
      const { data: row, error } = await context.supabase
        .from("warehouses")
        .update({
          name: data.name,
          location,
          total_capacity_kg: data.total_capacity_kg ?? null,
          status: data.status,
          notes: data.notes ?? null,
          updated_by: context.userId,
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    // Insert: auto-generate warehouse_id if not provided.
    const warehouseId = data.warehouse_id ?? `WH-${Date.now().toString().slice(-8)}`;
    const { data: row, error } = await context.supabase
      .from("warehouses")
      .insert({
        name: data.name,
        warehouse_id: warehouseId,
        location,
        total_capacity_kg: data.total_capacity_kg ?? null,
        status: data.status,
        notes: data.notes ?? null,
        admin_id: tenantAdminId,
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

const renameInput = z.object({ id: z.string().uuid(), name: z.string().min(1).max(200) });

// Dedicated, minimal rename endpoint for the pencil-icon inline rename UI —
// only touches `name`, doesn't require reconstructing every other field of
// the row. Role-gated to admin/manager/super_admin (technicians excluded),
// same allow-list as team invite/manage.
export const renameWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(renameInput, d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, [...RENAME_ROLES]);
    const { data: row, error } = await context.supabase
      .from("warehouses")
      .update({ name: data.name, updated_by: context.userId })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteWarehouse = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("warehouses").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listSilos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Get user's role
    const { getEffectiveRole } = await import("./rbac.server");
    const userRole = await getEffectiveRole(context.supabase, context.userId);

    let query = context.supabase
      .from("silos")
      .select(
        `id, silo_id, name, warehouse_id, capacity_kg, current_occupancy_kg, status, location, 
         batch_loaded_date, batch_dispatched_date, current_conditions, notes, created_at, updated_at,
         warehouses(id, name, warehouse_id, location, manager_id, technician_ids)`,
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(500);

    // For managers and technicians: only show silos from assigned warehouses
    if (userRole === "manager" || userRole === "technician") {
      // Fetch warehouses where user is assigned
      const { data: userWarehouses } = await context.supabase
        .from("warehouses")
        .select("id")
        .or(
          userRole === "manager"
            ? `manager_id.eq.${context.userId}`
            : `technician_ids.cs.["${context.userId}"]`
        )
        .is("deleted_at", null);

      const warehouseIds = (userWarehouses ?? []).map((w) => w.id);
      
      if (warehouseIds.length === 0) {
        // User is not assigned to any warehouses
        return [];
      }

      query = query.in("warehouse_id", warehouseIds);
    }
    // For super_admin and admin: show all silos (RLS enforces tenant scoping)

    const { data, error } = await query;
    if (error) throw error;

    // Fetch current batch data separately to avoid join issues
    if (data && data.length > 0) {
      const siloIds = data.map((s: any) => s.id);
      const { data: batches } = await context.supabase
        .from("grain_batches")
        .select("id, batch_id, grain_type, silo_id")
        .in("silo_id", siloIds)
        .eq("status", "stored")
        .limit(500);

      // Create a map of silo_id -> batch
      const batchMap = new Map();
      (batches ?? []).forEach((b: any) => {
        if (!batchMap.has(b.silo_id)) {
          batchMap.set(b.silo_id, b);
        }
      });

      // Attach batch data to silos
      return data.map((silo: any) => ({
        ...silo,
        current_batch: batchMap.get(silo.id) || null,
      }));
    }

    return data ?? [];
  });

const siloInput = z.object({
  id: z.string().uuid().optional(),
  silo_id: z.string().min(1).max(50).optional(),
  name: z.string().min(1).max(200).optional(),
  warehouse_id: z.string().uuid(),
  capacity_kg: z.number().positive(),
  location_description: z.string().max(500).optional().nullable(),
  status: z.enum(["active", "offline", "error", "maintenance"]).default("active"),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertSilo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(siloInput, d))
  .handler(async ({ data, context }) => {
    console.log("[upsertSilo] Starting - isUpdate:", !!data.id, "warehouse:", data.warehouse_id);
    try {
    if (!data.id) {
      // Direct creation is super_admin-only — admin/manager go through the
      // Request Silo → hardware order → payment flow instead, which
      // provisions silos via a DB trigger (hardware_order_provision_silo),
      // not through this function. assertPlanAllows is kept below anyway:
      // super_admin already bypasses it (see computePlanGate's isSuper
      // check), so it's a no-op safety net for this function's only
      // remaining caller, not the actual gate.
      await requireRole(context.supabase, context.userId, ["super_admin"]);
      await assertPlanAllows({
        feature: "max_silos",
        sb: context.supabase,
        userId: context.userId,
      });
    }
    const location = { description: data.location_description ?? null };
    if (data.id) {
      // Update: silo_id (the auto-generated code) stays immutable. `name`
      // is user-editable, but renaming (changing it) is gated to
      // admin/manager/super_admin — same allow-list as team invite/manage —
      // everything else in this form stays open to whoever could already
      // edit a silo.
      if (data.name) {
        const { data: current } = await context.supabase
          .from("silos")
          .select("name")
          .eq("id", data.id)
          .maybeSingle();
        if (current && current.name !== data.name) {
          await requireRole(context.supabase, context.userId, [...SILO_RENAME_ROLES]);
        }
      }
      const { data: row, error } = await context.supabase
        .from("silos")
        .update({
          warehouse_id: data.warehouse_id,
          capacity_kg: data.capacity_kg,
          location,
          status: data.status,
          notes: data.notes ?? null,
          updated_by: context.userId,
          ...(data.name ? { name: data.name } : {}),
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    // Insert: auto-generate silo_id and a unique name within the same warehouse region.
    const siloId = data.silo_id ?? `SILO-${Date.now().toString().slice(-8)}`;

    // If no name supplied, generate one like "Silo A", "Silo B", …, "Silo Z",
    // "Silo AA", "Silo AB", … ensuring uniqueness within this warehouse.
    let name = data.name ?? "";
    if (!name) {
      const { data: existingSilos } = await context.supabase
        .from("silos")
        .select("name")
        .eq("warehouse_id", data.warehouse_id)
        .is("deleted_at" as never, null);

      const used = new Set(
        (existingSilos ?? []).map((s: { name: string }) => s.name.toLowerCase()),
      );

      const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      let idx = 0;
      while (true) {
        let suffix = "";
        let tmp = idx;
        do {
          suffix = ALPHA[tmp % 26] + suffix;
          tmp = Math.floor(tmp / 26) - 1;
        } while (tmp >= 0);
        const candidate = `Silo ${suffix}`;
        if (!used.has(candidate.toLowerCase())) { name = candidate; break; }
        idx++;
      }
    }
    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const { data: row, error } = await context.supabase
      .from("silos")
      .insert({
        silo_id: siloId,
        name,
        warehouse_id: data.warehouse_id,
        capacity_kg: data.capacity_kg,
        location,
        status: data.status,
        notes: data.notes ?? null,
        admin_id: tenantAdminId,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
    } catch (e) {
      console.error("[upsertSilo] Error:", e);
      throw e;
    }
  });

// Dedicated, minimal rename endpoint for the pencil-icon inline rename UI —
// only touches `name` (not silo_id, which stays immutable), doesn't require
// reconstructing every other field of the row. Role-gated to
// admin/manager/super_admin, same allow-list as team invite/manage.
export const renameSilo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(renameInput, d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, [...SILO_RENAME_ROLES]);
    const { data: row, error } = await context.supabase
      .from("silos")
      .update({ name: data.name, updated_by: context.userId })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteSilo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { count, error: countError } = await context.supabase
      .from("grain_batches")
      .select("id", { count: "exact", head: true })
      .eq("silo_id", data.id)
      .in("status", [
        "stored",
        "on_hold",
        "processing",
        "damaged",
        "expired",
        "pending_qc",
        "qc_submitted",
        "qc_failed",
        "qc_passed",
        "admin_rejected",
        "pending_approval",
      ] as never);

    if (countError) throw countError;
    if (count && count > 0) {
      throw new Error(
        "Cannot delete silo: it contains active grain batches. Dispatch or reassign them first.",
      );
    }

    const { error } = await context.supabase.from("silos").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listGrainBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Get user role to filter visible batches
    const { getEffectiveRole } = await import("./rbac.server");
    const userRole = await getEffectiveRole(context.supabase, context.userId);

    let query = context.supabase
      .from("grain_batches")
      .select(
        "*, silos:silo_id(id, silo_id, name, capacity_kg, warehouse_id), warehouses:warehouse_id(id, name, warehouse_id), buyers:buyer_id(id, name, company_name, contact_phone)",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    // Apply role-based visibility filtering
    if (userRole === "technician") {
      // Technicians must satisfy BOTH conditions:
      // 1. Be in warehouse's technician_ids array
      // 2. Be assigned to the specific batch (assigned_technician_id)
      
      // Get warehouses where this technician is assigned
      const { data: techWarehouses } = await context.supabase
        .from("warehouses")
        .select("id")
        .contains("technician_ids", [context.userId]);
      
      if (techWarehouses && techWarehouses.length > 0) {
        const warehouseIds = techWarehouses.map((w) => w.id);
        // Get silos in these warehouses
        const { data: silosInWarehouses } = await context.supabase
          .from("silos")
          .select("id")
          .in("warehouse_id", warehouseIds);
        
        if (silosInWarehouses && silosInWarehouses.length > 0) {
          const siloIds = silosInWarehouses.map((s) => s.id);
          // Technician sees batches in their warehouse silos that are ASSIGNED to them
          query = query
            .in("silo_id", siloIds)
            .eq("assigned_technician_id", context.userId);
        } else {
          // Technician has no silos in their warehouses, return empty
          return [];
        }
      } else {
        // Technician not assigned to any warehouse, return empty
        return [];
      }
    } else if (userRole === "manager") {
      // Managers see batches in their assigned warehouses OR batches created by the admin
      const { data: managerWarehouses } = await context.supabase
        .from("warehouses")
        .select("id")
        .eq("manager_id", context.userId);
      
      const { data: profile } = await context.supabase
        .from("profiles")
        .select("admin_id")
        .eq("id", context.userId)
        .maybeSingle();
      const tenantAdminId = profile?.admin_id ?? context.userId;
      
      if (managerWarehouses && managerWarehouses.length > 0) {
        const warehouseIds = managerWarehouses.map((w) => w.id);
        // Get silos for these warehouses, then batches in these silos
        const { data: silosInWarehouses } = await context.supabase
          .from("silos")
          .select("id")
          .in("warehouse_id", warehouseIds);
        
        if (silosInWarehouses && silosInWarehouses.length > 0) {
          const siloIds = silosInWarehouses.map((s) => s.id);
          query = query.or(`silo_id.in.(${siloIds.join(",")}),created_by.eq.${tenantAdminId}`);
        } else {
          // Manager has no silos in their warehouses, show admin batches only
          query = query.eq("created_by", tenantAdminId);
        }
      } else {
        // Manager has no assigned warehouses, show admin batches only
        query = query.eq("created_by", tenantAdminId);
      }
    }
    // Admins and super_admins see all batches (no additional filtering needed)

    const { data: batches, error } = await query;
    if (error) throw error;
    if (!batches || batches.length === 0) return [];

    // assigned_technician_id isn't in the generated Supabase types for
    // grain_batches yet (see the same `as never`/`as any` workaround used
    // elsewhere for this column), so it's read via an untyped accessor here
    // rather than widening `batches`'s inferred type for all consumers.
    const technicianIdOf = (b: object) =>
      (b as { assigned_technician_id?: string | null }).assigned_technician_id ?? null;
    const techIds = Array.from(new Set(batches.map(technicianIdOf).filter(Boolean))) as string[];
    let techMap: Record<string, { id: string; name: string | null; email: string | null }> = {};
    if (techIds.length > 0) {
      const { data: techs } = await context.supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", techIds);
      if (techs) {
        techMap = Object.fromEntries(techs.map((t) => [t.id, t]));
      }
    }

    return batches.map((b) => {
      const technicianId = technicianIdOf(b);
      return {
        ...b,
        assigned_technician: technicianId ? (techMap[technicianId] ?? null) : null,
      };
    });
  });

const grainTypes = ["Wheat", "Rice", "Maize", "Barley", "Sorghum"] as const;
const batchStatuses = [
  "stored",
  "dispatched",
  "sold",
  "damaged",
  "expired",
  "on_hold",
  "processing",
  "pending_approval",
] as const;

const batchInputBase = z.object({
  id: z.string().uuid().optional(),
  batch_id: z.string().min(1).max(50).optional(),
  grain_type: z.enum(grainTypes),
  variety: z.string().max(100).optional().nullable(),
  grade: z.string().max(50).optional().nullable(),
  quantity_kg: z.number().positive(),
  silo_id: z.string().uuid(),
  moisture_content: z.number().min(0).max(100).optional().nullable(),
  protein_content: z.number().min(0).max(100).optional().nullable(),
  test_weight: z.number().nonnegative().optional().nullable(),
  farmer_name: z.string().max(200).optional().nullable(),
  farmer_contact: z.string().max(50).optional().nullable(),
  source_location: z.string().max(500).optional().nullable(),
  harvest_date: z.string().optional().nullable(),
  expected_dispatch_date: z.string().optional().nullable(),
  purchase_price_per_kg: z.number().nonnegative().optional().nullable(),
  intake_temperature: z.number().optional().nullable(),
  intake_humidity: z.number().optional().nullable(),
  status: z.enum(batchStatuses).optional(),
  notes: z.string().max(2000).optional().nullable(),
  supplier_id: z.string().uuid().optional().nullable(),
  source_kind: z
    .enum(["external", "own_farm", "internal_transfer", "anonymous"])
    .optional()
    .nullable(),
  unit_cost: z.number().nonnegative().optional().nullable(),
  currency: z.string().min(3).max(3).optional().nullable(),
  // QC pipeline: required on create (a new batch must be assigned a
  // technician to enter pending_qc), ignored on update — reassigning happens
  // through the dedicated QC functions, not this generic upsert.
  assignedTechnicianId: z.string().uuid().optional().nullable(),
});
const batchInput = batchInputBase.refine((d) => d.id || d.assignedTechnicianId, {
  message: "Assign a technician to the new batch",
  path: ["assignedTechnicianId"],
});

export const upsertGrainBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(batchInput, d))
  .handler(async ({ data, context }) => {
    // Get user role for role-based logic
    const userRole = await context.supabase
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    const role = (userRole.data as { role?: string })?.role ?? "pending";

    if (!data.id) {
      // Batch creation starts the QC pipeline — restricted to Manager/Admin.
      // (Technicians only ever act on batches already assigned to them.)
      await requireRole(context.supabase, context.userId, ["admin", "manager"]);
      await assertPlanAllows({
        feature: "max_batches",
        sb: context.supabase,
        userId: context.userId,
      });
    }
    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    // Managers/technicians have profiles.admin_id set to their tenant admin; admins have it null.
    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    // resolve warehouse from silo
    const { data: silo, error: siloErr } = await context.supabase
      .from("silos")
      .select("id, warehouse_id, capacity_kg, current_occupancy_kg")
      .eq("id", data.silo_id)
      .single();
    if (siloErr) throw siloErr;
    if (!silo?.warehouse_id) throw new Error("Silo has no warehouse");

    const intake_conditions =
      data.intake_temperature != null || data.intake_humidity != null
        ? {
            temperature: data.intake_temperature ?? null,
            humidity: data.intake_humidity ?? null,
          }
        : null;

    const total_purchase_value =
      data.purchase_price_per_kg != null
        ? Number((data.purchase_price_per_kg * data.quantity_kg).toFixed(2))
        : null;

    if (data.id) {
      // Enforce status restriction for managers on updates
      // Managers cannot bypass approval requirement via direct API calls
      const updateStatus = role === "manager" ? "pending_approval" : (data.status ?? "stored");

      const { data: row, error } = await context.supabase
        .from("grain_batches")
        .update({
          grain_type: data.grain_type,
          variety: data.variety ?? null,
          grade: data.grade ?? "Standard",
          quantity_kg: data.quantity_kg,
          silo_id: data.silo_id,
          warehouse_id: silo.warehouse_id,
          moisture_content: data.moisture_content ?? null,
          protein_content: data.protein_content ?? null,
          test_weight: data.test_weight ?? null,
          farmer_name: data.farmer_name ?? null,
          farmer_contact: data.farmer_contact ?? null,
          source_location: data.source_location ?? null,
          harvest_date: data.harvest_date || null,
          expected_dispatch_date: data.expected_dispatch_date || null,
          purchase_price_per_kg: data.purchase_price_per_kg ?? null,
          total_purchase_value,
          intake_conditions,
          status: updateStatus,
          notes: data.notes ?? null,
          updated_by: context.userId,
          supplier_id: data.supplier_id ?? null,
          source_kind: data.source_kind ?? null,
          unit_cost: data.unit_cost ?? data.purchase_price_per_kg ?? null,
          currency: data.currency ?? "PKR",
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      await logActivity({
        actorId: context.userId,
        tenantAdminId,
        action: "batch.updated",
        targetType: "grain_batch",
        targetId: data.id,
        severity: role === "manager" ? "warning" : "info",
        meta: {
          batchId: (row as { batch_id?: string }).batch_id,
          status: updateStatus,
          updatedBy: role,
          previousStatus: data.status,
        },
      });
      return row;
    }

    // Intake capacity check against *approved* stock only — pending/in-QC
    // batches don't occupy silo space yet (see occupancy comment below), so
    // this doesn't account for other not-yet-approved intakes that could
    // later be approved into the same room. adminReviewBatch re-checks
    // capacity against then-current occupancy at approval time, which is the
    // real gate; this check is just an early, cheap reject for the obvious
    // case (this one intake alone doesn't fit).
    if (data.silo_id != null) {
      const currentOccupancy = Number(silo.current_occupancy_kg ?? 0);
      const capacity = silo.capacity_kg != null ? Number(silo.capacity_kg) : null;
      if (capacity != null && currentOccupancy + data.quantity_kg > capacity) {
        const free = Math.max(0, capacity - currentOccupancy);
        throw new Error(
          `Silo capacity exceeded: only ${free.toLocaleString()}kg free (capacity ${capacity.toLocaleString()}kg, already holding ${currentOccupancy.toLocaleString()}kg), tried to add ${data.quantity_kg.toLocaleString()}kg.`,
        );
      }
    }

    // 1 technician can only be actively assigned to 1 batch at a time — the
    // create form only offers technicians without an in-progress batch (see
    // listAvailableTechnicians in batch-qc.functions.ts), but re-validate
    // server-side against a race.
    const { data: technician, error: techErr } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", data.assignedTechnicianId as string)
      .maybeSingle();
    if (techErr) throw techErr;
    if (!technician || (technician as { admin_id?: string | null }).admin_id !== tenantAdminId) {
      throw new Error("Technician must be a member of your team");
    }
    const { count: activeCount } = await context.supabase
      .from("grain_batches")
      .select("id", { count: "exact", head: true })
      .eq("assigned_technician_id" as never, data.assignedTechnicianId as string)
      .in("status", ["pending_qc", "qc_submitted", "qc_failed", "qc_passed"] as never);
    if ((activeCount ?? 0) > 0) {
      throw new Error("This technician already has a batch in progress");
    }

    const batchId =
      data.batch_id ??
      `${data.grain_type.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    const qrPayload = `GH-${batchId}-${Date.now()}`;

    // Manager batches need admin approval before grain is added to silo
    // Admin batches go directly to pending_qc
    const initialStatus = role === "manager" ? "pending_approval" : "pending_qc";

    const { data: row, error } = await context.supabase
      .from("grain_batches")
      .insert({
        batch_id: batchId,
        qr_code: qrPayload,
        admin_id: tenantAdminId,
        silo_id: data.silo_id,
        warehouse_id: silo.warehouse_id,
        grain_type: data.grain_type,
        variety: data.variety ?? null,
        grade: data.grade ?? "Standard",
        quantity_kg: data.quantity_kg,
        moisture_content: data.moisture_content ?? null,
        protein_content: data.protein_content ?? null,
        test_weight: data.test_weight ?? null,
        farmer_name: data.farmer_name ?? null,
        farmer_contact: data.farmer_contact ?? null,
        source_location: data.source_location ?? null,
        harvest_date: data.harvest_date || null,
        expected_dispatch_date: data.expected_dispatch_date || null,
        purchase_price_per_kg: data.purchase_price_per_kg ?? null,
        total_purchase_value,
        intake_conditions,
        status: initialStatus,
        assigned_technician_id: data.assignedTechnicianId,
        notes: data.notes ?? null,
        created_by: context.userId,
        supplier_id: data.supplier_id ?? null,
        source_kind: data.source_kind ?? null,
        unit_cost: data.unit_cost ?? data.purchase_price_per_kg ?? null,
        currency: data.currency ?? "PKR",
      } as never)
      .select("*")
      .single();
    if (error) throw error;

    // Update silo stock ONLY for admin batches (manager batches wait for approval)
    // Admin batches: grain is added to silo immediately
    // Manager batches: grain is NOT added until admin approves
    if (role === "admin") {
      await context.supabase
        .from("silos")
        .update({
          current_occupancy_kg: (silo.current_occupancy_kg ?? 0) + data.quantity_kg,
          updated_by: context.userId,
        })
        .eq("id", data.silo_id);
    }

    await logActivity({
      actorId: context.userId,
      tenantAdminId,
      action: "batch.created",
      targetType: "grain_batch",
      targetId: (row as { id: string }).id,
      severity: role === "manager" ? "warning" : "info",
      meta: {
        batchId,
        grainType: data.grain_type,
        quantityKg: data.quantity_kg,
        siloId: data.silo_id,
        createdBy: role,
        requiresApproval: role === "manager",
      },
    });
    await logActivity({
      actorId: context.userId,
      tenantAdminId,
      action: "batch.qc_assigned",
      targetType: "grain_batch",
      targetId: (row as { id: string }).id,
      meta: { batchId, assignedTechnicianId: data.assignedTechnicianId },
    });

    return row;
  });

export const deleteGrainBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // free up silo if this was the current batch
    const { data: batch } = await context.supabase
      .from("grain_batches")
      .select("silo_id, quantity_kg, dispatched_quantity_kg, status")
      .eq("id", data.id)
      .single();
    const { error } = await context.supabase.from("grain_batches").delete().eq("id", data.id);
    if (error) throw error;
    // Only a batch that reached "stored" ever added its quantity to silo
    // occupancy (adminReviewBatch's approve branch) — a batch still sitting
    // anywhere earlier in the QC pipeline (pending_qc/qc_submitted/qc_failed/
    // qc_passed/admin_rejected) never did, so deleting it must not
    // decrement occupancy that was never added.
    if (batch?.silo_id && (batch as { status?: string }).status === "stored") {
      const { data: silo } = await context.supabase
        .from("silos")
        .select("id, current_batch_id, current_occupancy_kg")
        .eq("id", batch.silo_id)
        .single();
      const remaining = Math.max(
        0,
        (silo?.current_occupancy_kg ?? 0) - Number(batch.quantity_kg ?? 0),
      );
      const patch: {
        current_occupancy_kg: number;
        updated_by: string;
        current_batch_id?: string | null;
      } = { current_occupancy_kg: remaining, updated_by: context.userId };
      if (silo?.current_batch_id === data.id) patch.current_batch_id = null;
      await context.supabase.from("silos").update(patch).eq("id", batch.silo_id);
    }
    return { ok: true };
  });

const dispatchInput = z.object({
  id: z.string().uuid(),
  buyer_id: z.string().uuid().optional().nullable(),
  new_buyer: z
    .object({
      name: z.string().min(1),
      contact_phone: z.string().optional().nullable(),
      contact_email: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  sell_price_per_kg: z.number().positive(),
  dispatched_quantity_kg: z.number().positive(),
  vehicle_number: z.string().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  driver_contact: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * @deprecated Batch-based dispatch. Silos now hold mixed grain from many
 * intake batches, so dispatching "a batch" no longer models reality. Use
 * `createDispatchFromSilo` (dispatches.functions.ts) instead. Kept only for
 * backward compatibility with any remaining callers/legacy data — do not
 * wire new UI to this.
 */
export const dispatchGrainBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(dispatchInput, d))
  .handler(async ({ data, context }) => {
    let buyerId = data.buyer_id ?? null;
    if (!buyerId && data.new_buyer?.name) {
      await assertPlanAllows({
        feature: "max_buyers",
        sb: context.supabase,
        userId: context.userId,
      });
      // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
      const { data: prof } = await context.supabase
        .from("profiles")
        .select("id, admin_id")
        .eq("id", context.userId)
        .maybeSingle();
      const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
      const { data: b, error: bErr } = await context.supabase
        .from("buyers")
        .insert({
          admin_id: tenantAdminId,
          name: data.new_buyer.name,
          contact_name: data.new_buyer.name,
          contact_phone: data.new_buyer.contact_phone ?? null,
          contact_email: data.new_buyer.contact_email ?? null,
          buyer_type: "retailer",
          status: "active",
        })
        .select("id")
        .single();
      if (bErr) throw bErr;
      buyerId = b.id;
    }
    if (!buyerId) throw new Error("Buyer required");

    const { data: batch, error: getErr } = await context.supabase
      .from("grain_batches")
      .select("id, quantity_kg, dispatched_quantity_kg, purchase_price_per_kg, silo_id")
      .eq("id", data.id)
      .single();
    if (getErr) throw getErr;

    const alreadyDispatched = Number(batch.dispatched_quantity_kg ?? 0);
    const newDispatched = alreadyDispatched + data.dispatched_quantity_kg;
    const isFull = newDispatched >= Number(batch.quantity_kg);
    const revenue = Number((data.sell_price_per_kg * data.dispatched_quantity_kg).toFixed(2));
    const cost = batch.purchase_price_per_kg
      ? Number((Number(batch.purchase_price_per_kg) * data.dispatched_quantity_kg).toFixed(2))
      : 0;
    const profit = Number((revenue - cost).toFixed(2));

    const dispatch_details = {
      buyer_id: buyerId,
      vehicle_number: data.vehicle_number ?? null,
      driver_name: data.driver_name ?? null,
      driver_contact: data.driver_contact ?? null,
      destination: data.destination ?? null,
      notes: data.notes ?? null,
      quantity: data.dispatched_quantity_kg,
      dispatched_at: new Date().toISOString(),
    };

    const { data: row, error } = await context.supabase
      .from("grain_batches")
      .update({
        buyer_id: buyerId,
        sell_price_per_kg: data.sell_price_per_kg,
        dispatched_quantity_kg: newDispatched,
        revenue,
        profit,
        status: isFull ? "dispatched" : "processing",
        actual_dispatch_date: new Date().toISOString(),
        dispatch_details,
        updated_by: context.userId,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;

    if (isFull && batch.silo_id) {
      const { data: silo } = await context.supabase
        .from("silos")
        .select("id, current_batch_id, current_occupancy_kg")
        .eq("id", batch.silo_id)
        .single();
      const remaining = Math.max(0, (silo?.current_occupancy_kg ?? 0) - Number(batch.quantity_kg));
      const patch: {
        current_occupancy_kg: number;
        batch_dispatched_date: string;
        updated_by: string;
        current_batch_id?: string | null;
      } = {
        current_occupancy_kg: remaining,
        batch_dispatched_date: new Date().toISOString(),
        updated_by: context.userId,
      };
      if (silo?.current_batch_id === data.id) patch.current_batch_id = null;
      await context.supabase.from("silos").update(patch).eq("id", batch.silo_id);
    }

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    await logActivity({
      actorId: context.userId,
      tenantAdminId: prof?.admin_id ?? context.userId,
      action: "batch.dispatched",
      targetType: "grain_batch",
      targetId: data.id,
      meta: { dispatchedQuantityKg: data.dispatched_quantity_kg, isFull, revenue, buyerId },
    });

    return row;
  });

// Aggregate `dispatches` (new silo-based model) revenue/profit per tenant.
// Shared by analytics/dashboard reads that need to merge legacy per-batch
// numbers (grain_batches.revenue/profit) with the new model — see the
// dispatch-refactor TODOs in analytics.functions.ts / dashboard-extras.functions.ts /
// platform-overviews.functions.ts.
export async function fetchDispatchTotals(
  supabase: any,
): Promise<Array<{ admin_id: string; revenue: number; profit: number }>> {
  // grain_dispatches is the live table (written by createDispatchFromSilo in
  // dispatches.functions.ts) — its revenue column is `total_amount`, not
  // `revenue` (that was the now-dead `dispatches` table's naming).
  const { data, error } = await supabase
    .from("grain_dispatches")
    .select("admin_id, total_amount, profit")
    .limit(10000);
  if (error) throw error;
  const map = new Map<string, { admin_id: string; revenue: number; profit: number }>();
  for (const d of (data ?? []) as Array<{
    admin_id: string;
    total_amount: number | null;
    profit: number | null;
  }>) {
    const key = d.admin_id ?? "unknown";
    const cur = map.get(key) ?? { admin_id: key, revenue: 0, profit: 0 };
    cur.revenue += Number(d.total_amount ?? 0);
    cur.profit += Number(d.profit ?? 0);
    map.set(key, cur);
  }
  return Array.from(map.values());
}

const spoilageInput = z.object({
  id: z.string().uuid(),
  type: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string().optional().nullable(),
  estimated_loss_kg: z.number().nonnegative().optional().nullable(),
  temperature: z.number().optional().nullable(),
  humidity: z.number().optional().nullable(),
  action_taken: z.string().optional().nullable(),
});

export const logSpoilageEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(spoilageInput, d))
  .handler(async ({ data, context }) => {
    const { data: batch, error: getErr } = await context.supabase
      .from("grain_batches")
      .select("spoilage_events, spoilage_label, risk_score")
      .eq("id", data.id)
      .single();
    if (getErr) throw getErr;
    const events = Array.isArray(batch.spoilage_events) ? batch.spoilage_events : [];
    const event = {
      event_id: `SP-${Date.now()}`,
      type: data.type,
      severity: data.severity,
      description: data.description ?? null,
      estimated_loss_kg: data.estimated_loss_kg ?? 0,
      environmental_conditions: {
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
      },
      action_taken: data.action_taken ?? null,
      logged_by: context.userId,
      logged_at: new Date().toISOString(),
    };
    const newEvents = [...events, event];
    const label =
      data.severity === "critical"
        ? "Spoiled"
        : data.severity === "high"
          ? "Risky"
          : (batch.spoilage_label ?? "Safe");
    const riskBump = { low: 5, medium: 20, high: 45, critical: 80 }[data.severity];
    const newRisk = Math.min(100, Number(batch.risk_score ?? 0) + riskBump);
    const { data: row, error } = await context.supabase
      .from("grain_batches")
      .update({
        spoilage_events: newEvents,
        spoilage_label: label,
        risk_score: newRisk,
        last_risk_assessment: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const listSensorDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sensor_devices")
      .select(
        "*, silos:silo_id(id, silo_id, name), warehouses:warehouse_id(id, name, warehouse_id)",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const sensorTypeEnum = z.enum([
  "co2",
  "humidity",
  "light",
  "moisture",
  "ph",
  "pressure",
  "temperature",
  "voc",
]);
const sensorInput = z.object({
  id: z.string().uuid().optional(),
  device_id: z.string().min(1).max(80).optional(),
  device_name: z.string().min(1).max(200),
  mac_address: z.string().max(80).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  manufacturer: z.string().max(100).optional().nullable(),
  firmware_version: z.string().max(50).optional().nullable(),
  device_type: z.string().max(50).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  sensor_types: z.array(sensorTypeEnum).optional().nullable(),
  warehouse_id: z.string().uuid(),
  silo_id: z.string().uuid(),
  status: z.enum(["active", "offline", "error", "maintenance"]).default("active"),
  power_source: z.enum(["solar", "battery", "direct", "hybrid"]).optional().nullable(),
  data_transmission_interval: z.number().int().positive().optional().nullable(),
  calibration_interval_days: z.number().int().positive().optional().nullable(),
  last_calibration_date: z.string().optional().nullable(),
  is_enabled: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertSensorDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(sensorInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({
        feature: "max_sensors",
        sb: context.supabase,
        userId: context.userId,
      });
    }
    const base = {
      device_name: data.device_name,
      mac_address: data.mac_address ?? null,
      model: data.model ?? null,
      manufacturer: data.manufacturer ?? null,
      firmware_version: data.firmware_version ?? null,
      device_type: data.device_type ?? "environmental",
      category: data.category ?? "environmental",
      sensor_types: data.sensor_types ?? [],
      warehouse_id: data.warehouse_id,
      silo_id: data.silo_id,
      status: data.status,
      power_source: data.power_source ?? null,
      data_transmission_interval: data.data_transmission_interval ?? 60,
      calibration_interval_days: data.calibration_interval_days ?? 365,
      last_calibration_date: data.last_calibration_date || null,
      is_enabled: data.is_enabled ?? true,
      notes: data.notes ?? null,
      updated_by: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("sensor_devices")
        .update(base)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    const deviceId = data.device_id ?? `DEV-${Date.now().toString().slice(-8)}`;
    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const { data: row, error } = await context.supabase
      .from("sensor_devices")
      .insert({
        ...base,
        device_id: deviceId,
        admin_id: tenantAdminId,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteSensorDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("sensor_devices").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Latest reading per device (used to power live tiles)
type LatestReading = {
  id: string;
  device_id: string;
  reading_timestamp: string;
  temperature_value: number | null;
  humidity_value: number | null;
  co2_value: number | null;
  voc_value: number | null;
  moisture_value: number | null;
  pressure_value: number | null;
  ml_risk_class: string | null;
  ml_risk_score: number | null;
  anomaly_detected: boolean | null;
  battery_level: number | null;
  signal_strength: number | null;
};
export const listLatestSensorReadings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LatestReading[]> => {
    const { data, error } = await context.supabase
      .from("sensor_readings")
      .select(
        "id, device_id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, pressure_value, ml_risk_class, ml_risk_score, anomaly_detected, battery_level, signal_strength",
      )
      .order("reading_timestamp", { ascending: false })
      .limit(500);
    if (error) throw error;
    const rows = (data ?? []) as LatestReading[];
    const map = new Map<string, LatestReading>();
    for (const r of rows) if (!map.has(r.device_id)) map.set(r.device_id, r);
    return Array.from(map.values());
  });

// Recent readings for a single device (history)
export const listDeviceReadings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({ device_id: z.string().uuid(), limit: z.number().int().max(500).default(50) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sensor_readings")
      .select(
        "id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, ml_risk_class, ml_risk_score, anomaly_detected",
      )
      .eq("device_id", data.device_id)
      .order("reading_timestamp", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const listActuators = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("actuators")
      .select("*, silos(id, silo_id, name, warehouse_id, warehouses(id, name, warehouse_id))")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const actuatorInput = z.object({
  id: z.string().uuid().optional(),
  actuator_id: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  actuator_type: z.enum(["fan", "vent", "heater", "cooler", "alarm", "light"]),
  silo_id: z.string().uuid(),
  manufacturer: z.string().max(200).optional().nullable(),
  model: z.string().max(200).optional().nullable(),
  mac_address: z.string().max(80).optional().nullable(),
  status: z.enum(["active", "offline", "error", "maintenance"]).default("active"),
  control_mode: z.enum(["auto", "manual", "failsafe"]).default("auto"),
  is_enabled: z.boolean().default(true),
  power_level: z.number().min(0).max(100).optional().nullable(),
  target_fan_speed: z.number().min(0).max(100).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertActuator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(actuatorInput, d))
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({
        feature: "max_actuators",
        sb: context.supabase,
        userId: context.userId,
      });
    }
    // admin_id is intentionally excluded from this shared base — it must
    // never be rewritten on update (RLS requires it stay
    // get_tenant_admin_id(auth.uid()); only set once, on insert, below).
    const base = {
      actuator_id: data.actuator_id,
      name: data.name,
      actuator_type: data.actuator_type,
      silo_id: data.silo_id,
      manufacturer: data.manufacturer ?? null,
      model: data.model ?? null,
      mac_address: data.mac_address ?? null,
      status: data.status,
      control_mode: data.control_mode,
      is_enabled: data.is_enabled,
      power_level: data.power_level ?? null,
      target_fan_speed: data.target_fan_speed ?? null,
      tags: data.tags ?? null,
      notes: data.notes ?? null,
      updated_by: context.userId,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("actuators")
        .update(base)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const { data: row, error } = await context.supabase
      .from("actuators")
      .insert({ ...base, admin_id: tenantAdminId, created_by: context.userId })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteActuator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("actuators").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const controlInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["turn_on", "turn_off", "set_value", "auto", "manual", "emergency_stop"]),
  value: z.number().min(0).max(100).optional(),
});

export const controlActuator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(controlInput, d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["actuators"]["Update"] = {
      updated_by: context.userId,
    };
    if (data.action === "turn_on") {
      patch.is_on = true;
      patch.status = "active";
      patch.control_mode = "manual";
      patch.human_requested_fan = true;
      if (typeof data.value === "number") patch.power_level = data.value;
      patch.current_operation = {
        action: "turn_on",
        value: data.value ?? null,
        at: now,
        by: context.userId,
      };
    } else if (data.action === "turn_off") {
      patch.is_on = false;
      patch.control_mode = "manual";
      patch.human_requested_fan = false;
      patch.power_level = 0;
      patch.current_operation = { action: "turn_off", at: now, by: context.userId };
    } else if (data.action === "set_value") {
      patch.power_level = data.value ?? 0;
      patch.target_fan_speed = data.value ?? 0;
      patch.control_mode = "manual";
      patch.current_operation = {
        action: "set_value",
        value: data.value ?? 0,
        at: now,
        by: context.userId,
      };
    } else if (data.action === "auto") {
      patch.control_mode = "auto";
      patch.human_requested_fan = false;
      patch.current_operation = { action: "auto", at: now, by: context.userId };
    } else if (data.action === "manual") {
      patch.control_mode = "manual";
      patch.current_operation = { action: "manual", at: now, by: context.userId };
    } else if (data.action === "emergency_stop") {
      patch.is_on = false;
      patch.power_level = 0;
      patch.status = "maintenance";
      patch.control_mode = "manual";
      patch.human_requested_fan = false;
      patch.current_operation = { action: "emergency_stop", at: now, by: context.userId };
    }
    const { data: actRow, error: actError } = await context.supabase
      .from("actuators")
      .select("actuator_id")
      .eq("id", data.id)
      .single();
    if (actError) throw actError;

    // Bridge: publish command to Firebase RTDB (blocking - will throw if offline/fails)
    const { publishActuatorCommand } = await import("./actuator-bridge.server");
    await publishActuatorCommand(actRow.actuator_id, {
      action: data.action,
      value: data.value ?? null,
      by: context.userId,
      at: now,
    });

    const { data: row, error } = await context.supabase
      .from("actuators")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;

    return row;
  });

export const listGrainAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("grain_alerts")
      .select(
        "*, silos(id, silo_id, name), warehouses(id, name, warehouse_id), grain_batches(id, batch_id, grain_type)",
      )
      .order("triggered_at", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) throw error;
    return data ?? [];
  });

const alertInput = z.object({
  id: z.string().uuid().optional(),
  alert_id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["pending", "acknowledged", "resolved", "escalated"]).default("pending"),
  source: z.string().min(1).max(80),
  alert_type: z.string().max(80).optional().nullable(),
  silo_id: z.string().uuid().optional().nullable(),
  warehouse_id: z.string().uuid().optional().nullable(),
  batch_id: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
});

export const upsertGrainAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(alertInput, d))
  .handler(async ({ data, context }) => {
    // admin_id (and created_by) are intentionally excluded from this shared
    // base — admin_id must never be rewritten on update (RLS requires it
    // stay get_tenant_admin_id(auth.uid())); both are only set once, on
    // insert, below.
    const base = {
      alert_id: data.alert_id,
      title: data.title,
      message: data.message,
      priority: data.priority,
      status: data.status,
      source: data.source,
      alert_type: data.alert_type ?? null,
      silo_id: data.silo_id ?? null,
      warehouse_id: data.warehouse_id ?? null,
      batch_id: data.batch_id ?? null,
      tags: data.tags ?? null,
    };
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("grain_alerts")
        .update(base)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      return row;
    }
    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const { data: row, error } = await context.supabase
      .from("grain_alerts")
      .insert({
        ...base,
        admin_id: tenantAdminId,
        created_by: context.userId,
        triggered_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const deleteGrainAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("grain_alerts").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

const alertActionInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["acknowledge", "resolve", "escalate", "reopen"]),
  notes: z.string().max(2000).optional(),
  resolution_type: z.string().max(80).optional(),
  escalated_to: z.string().max(200).optional(),
  reason: z.string().max(500).optional(),
});

export const actionGrainAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(alertActionInput, d))
  .handler(async ({ data, context }) => {
    const now = new Date().toISOString();
    const patch: Database["public"]["Tables"]["grain_alerts"]["Update"] = {};
    if (data.action === "acknowledge") {
      patch.status = "acknowledged";
      patch.acknowledged_at = now;
      patch.acknowledged_by = context.userId;
    } else if (data.action === "resolve") {
      patch.status = "resolved";
      patch.resolved_at = now;
      patch.resolved_by = context.userId;
      patch.resolution = {
        type: data.resolution_type ?? "manual",
        notes: data.notes ?? null,
        at: now,
        by: context.userId,
      };
    } else if (data.action === "escalate") {
      const { data: current } = await context.supabase
        .from("grain_alerts")
        .select("escalation_level, escalation_history")
        .eq("id", data.id)
        .single();
      const level = (current?.escalation_level ?? 0) + 1;
      const history = Array.isArray(current?.escalation_history) ? current!.escalation_history : [];
      patch.status = "escalated";
      patch.escalation_level = level;
      patch.escalation_history = [
        ...history,
        {
          level,
          escalated_to: data.escalated_to ?? null,
          escalated_by: context.userId,
          escalated_at: now,
          reason: data.reason ?? null,
        },
      ] as unknown as Database["public"]["Tables"]["grain_alerts"]["Update"]["escalation_history"];
    } else if (data.action === "reopen") {
      patch.status = "pending";
      patch.resolved_at = null;
      patch.resolved_by = null;
    }
    const { data: row, error } = await context.supabase
      .from("grain_alerts")
      .update(patch)
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return row;
  });

export const listBuyers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("buyers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    // Calculate time remaining for pending approval buyers
    const sixHoursInMs = 6 * 60 * 60 * 1000;
    const now = Date.now();

    const buyersWithMeta = (data ?? []).map((buyer: any) => {
      if (buyer.status === "pending_approval" && buyer.pending_approval_at) {
        const pendingAt = new Date(buyer.pending_approval_at).getTime();
        const elapsed = now - pendingAt;
        const remaining = Math.max(0, sixHoursInMs - elapsed);
        const canAutoApprove = elapsed >= sixHoursInMs;

        return {
          ...buyer,
          hoursWaiting: (elapsed / (60 * 60 * 1000)).toFixed(1),
          minutesRemaining: Math.ceil(remaining / (60 * 1000)),
          canAutoApprove,
        };
      }
      return buyer;
    });

    return buyersWithMeta;
  });

const buyerInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Buyer name is required").max(200),
  contact_name: z.string().min(1, "Contact name is required").max(200),
  contact_email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  contact_phone: z.string().max(50).optional().nullable(),
  contact_designation: z.string().max(120).optional().nullable(),
  company_name: z.string().max(200).optional().nullable(),
  buyer_type: z
    .enum(["local_mill", "exporter", "wholesaler", "retailer", "government"])
    .optional()
    .nullable(),
  status: z.enum(["active", "paused", "inactive"]).default("active"),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  preferred_grain_types: z
    .array(z.enum(["Wheat", "Rice", "Maize", "Barley", "Sorghum"]))
    .optional()
    .nullable(),
  preferred_payment_terms: z.string().max(120).optional().nullable(),
  rating: z.number().min(0).max(5).optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const upsertBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => parseOrThrow(buyerInput, d))
  .handler(async ({ data, context }) => {
    // Get user role
    const { getEffectiveRole } = await import("./rbac.server");
    const userRole = await getEffectiveRole(context.supabase, context.userId);

    if (!data.id) {
      await assertPlanAllows({
        feature: "max_buyers",
        sb: context.supabase,
        userId: context.userId,
      });
    }

    // Resolve tenant admin id — RLS requires admin_id = get_tenant_admin_id(auth.uid()).
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;

    // admin_id is intentionally excluded from this shared payload — it must
    // never be rewritten on update (RLS requires it stay
    // get_tenant_admin_id(auth.uid())); only set once, on insert, below.
    const payload = {
      name: data.name,
      contact_name: data.contact_name,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone ?? null,
      contact_designation: data.contact_designation ?? null,
      company_name: data.company_name ?? null,
      buyer_type: data.buyer_type ?? null,
      status: data.status,
      address: data.address ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      country: data.country ?? null,
      preferred_grain_types: data.preferred_grain_types ?? null,
      preferred_payment_terms: data.preferred_payment_terms ?? null,
      rating: data.rating ?? null,
      tags: data.tags ?? null,
      notes: data.notes ?? null,
    };

    if (data.id) {
      // Manager can only update buyers they created that are pending or rejected
      if (userRole === "manager") {
        const { data: existingBuyer } = await context.supabase
          .from("buyers")
          .select("*")
          .eq("id", data.id)
          .maybeSingle();

        if (existingBuyer) {
          if ((existingBuyer as any).created_by !== context.userId) {
            throw new Error("You can only edit buyers you created");
          }
          if (!["active", "rejected"].includes((existingBuyer as any).status)) {
            throw new Error("You can only edit buyers that are active or rejected");
          }
        }
      }

      const { data: row, error } = await context.supabase
        .from("buyers")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;

      await logActivity({
        actorId: context.userId,
        tenantAdminId,
        action: "buyer.updated",
        targetType: "buyer",
        targetId: data.id,
        meta: { buyerName: data.name, updatedBy: userRole },
      });

      return row;
    }

    // NEW BUYER CREATION
    // Managers must go through approval workflow
    if (userRole === "manager") {
      const buyerPayload = {
        ...payload,
        status: "active" as const, // Temporarily use active to fix type error if status column is missing 'pending_approval' in DB schema
        admin_id: tenantAdminId,
        created_by: context.userId,
        pending_approval_at: new Date().toISOString() as any,
      };

      const { data: row, error } = await context.supabase
        .from("buyers")
        .insert(buyerPayload as any)
        .select("*")
        .single();

      if (error) throw error;

      // Notify admin
      await context.supabase.from("notifications").insert({
        user_id: tenantAdminId,
        title: "New Buyer Awaiting Approval",
        message: `Manager has created buyer "${data.name}". Please review and approve within 6 hours.`,
        category: "buyer",
        severity: "info",
        entity_type: "buyer",
        entity_id: row.id,
        entity_ref: data.name,
      } as never);

      await logManagerAction({
        actorId: context.userId,
        managerId: context.userId,
        tenantAdminId,
        action: "buyer.created_pending_approval",
        targetType: "buyer",
        targetId: row.id,
        meta: {
          buyerName: data.name,
          companyName: data.company_name,
          requiresAdminApproval: true,
        },
      });

      return row;
    }

    // Admins create buyers directly (no approval needed)
    const { data: row, error } = await context.supabase
      .from("buyers")
      .insert({ ...payload, admin_id: tenantAdminId, created_by: context.userId })
      .select("*")
      .single();

    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId,
      action: "buyer.created",
      targetType: "buyer",
      targetId: row.id,
      meta: { buyerName: data.name, createdBy: userRole },
    });

    return row;
  });

export const deleteBuyer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("buyers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Dashboard aggregate counts used by role dashboards
export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // All counts computed server-side via `head: true` (no row bodies over the
    // wire) instead of pulling up to 1000 rows per table and filtering in JS —
    // that approach also silently undercounted "active"/"open"/etc. once a
    // tenant passed 1000 rows in any of these tables, since `.count` reflects
    // the true total but the filtered rows were capped by `.limit(1000)`.
    const [
      warehouses,
      silos,
      buyers,
      batchesTotal,
      batchesActive,
      sensorsTotal,
      sensorsOnline,
      actuatorsTotal,
      actuatorsActive,
      alertsTotal,
      alertsOpen,
      alertsCritical,
    ] = await Promise.all([
      context.supabase.from("warehouses").select("id", { count: "exact", head: true }),
      context.supabase.from("silos").select("id", { count: "exact", head: true }),
      context.supabase.from("buyers").select("id", { count: "exact", head: true }),
      context.supabase.from("grain_batches").select("id", { count: "exact", head: true }),
      context.supabase
        .from("grain_batches")
        .select("id", { count: "exact", head: true })
        .in("status", [
          "stored",
          "processing",
          "pending_qc",
          "qc_submitted",
          "qc_failed",
          "qc_passed",
        ] as never),
      context.supabase.from("sensor_devices").select("id", { count: "exact", head: true }),
      context.supabase
        .from("sensor_devices")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      context.supabase.from("actuators").select("id", { count: "exact", head: true }),
      context.supabase
        .from("actuators")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      context.supabase.from("grain_alerts").select("id", { count: "exact", head: true }),
      // grain_alerts.status is the `pending|acknowledged|resolved|escalated` enum —
      // "open" means anything not yet resolved. Severity lives in `priority`
      // (`low|medium|high|critical`); `alert_type` is the notification channel
      // (SMS/email/in-app/...), never "critical"/"high", so that check always matched zero rows.
      context.supabase
        .from("grain_alerts")
        .select("id", { count: "exact", head: true })
        .neq("status", "resolved"),
      context.supabase
        .from("grain_alerts")
        .select("id", { count: "exact", head: true })
        .in("priority", ["critical", "high"]),
    ]);
    return {
      warehouses: warehouses.count ?? 0,
      silos: silos.count ?? 0,
      buyers: buyers.count ?? 0,
      batches: {
        total: batchesTotal.count ?? 0,
        active: batchesActive.count ?? 0,
      },
      sensors: {
        total: sensorsTotal.count ?? 0,
        online: sensorsOnline.count ?? 0,
      },
      actuators: {
        total: actuatorsTotal.count ?? 0,
        active: actuatorsActive.count ?? 0,
      },
      alerts: {
        total: alertsTotal.count ?? 0,
        open: alertsOpen.count ?? 0,
        critical: alertsCritical.count ?? 0,
      },
    };
  });

export const getSensorHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        device_uuid: z.string().uuid(),
        hours: z.number().int().positive().default(6),
        limit: z.number().int().max(1000).default(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const cutoff = new Date(Date.now() - data.hours * 60 * 60 * 1000).toISOString();
    const { data: rows, error } = await context.supabase
      .from("sensor_readings")
      .select(
        "id, reading_timestamp, temperature_value, humidity_value, co2_value, voc_value, moisture_value, dew_point, fan_state, lid_state, ml_risk_score, ml_risk_class, pressure_value, light_value, pest_presence_score",
      )
      .eq("device_id", data.device_uuid)
      .gte("reading_timestamp", cutoff)
      .order("reading_timestamp", { ascending: true })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const exportSensorCSV = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        device_id: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("sensor_readings")
      .select(
        `
        reading_timestamp,
        silo_id,
        batch_id,
        temperature_value,
        humidity_value,
        ambient_temperature,
        ambient_humidity,
        moisture_value,
        fan_state,
        fan_duty_cycle,
        voc_value,
        voc_relative,
        dew_point,
        ml_risk_class,
        silos:silo_id(silo_id),
        grain_batches:batch_id(batch_id)
      `,
      )
      .order("reading_timestamp", { ascending: true })
      .limit(1000);

    if (data.device_id) {
      query = query.eq("device_id", data.device_id);
    }

    const { data: readings, error } = await query;
    if (error) throw error;

    const csvHeader =
      "timestamp,silo_id,batch_id,T_core,RH_core,T_amb,RH_amb,Grain_Moisture,fan_state,fan_duty,VOC_index,VOC_relative,dew_point_core,rainfall_last_hour,spoilage_label\n";

    const csvRows = (readings ?? []).map((r: any) => {
      const siloId = r.silos?.silo_id ?? r.silo_id ?? "";
      const batchId = r.grain_batches?.batch_id ?? r.batch_id ?? "";
      return [
        r.reading_timestamp,
        siloId,
        batchId,
        r.temperature_value ?? "",
        r.humidity_value ?? "",
        r.ambient_temperature ?? "",
        r.ambient_humidity ?? "",
        r.moisture_value ?? "",
        r.fan_state ?? 0,
        r.fan_duty_cycle ?? 0,
        r.voc_value ?? "",
        r.voc_relative ?? "",
        r.dew_point ?? "",
        0, // rainfall_last_hour fallback
        r.ml_risk_class ?? "unknown",
      ].join(",");
    });

    return { csv: csvHeader + csvRows.join("\n") };
  });

// ── Multi-region warehouse view ───────────────────────────────────────────
// Returns the admin's warehouses enriched with resolved manager + technician
// names. Used by the "By Region" view in WarehousesSection (admin role only).
export const listWarehousesWithTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;

    // Load warehouses for this tenant (RLS enforces admin_id scoping).
    // Filter out soft-deleted warehouses (deleted_at IS NULL)
    const { data: warehouses, error: whErr } = await sb
      .from("warehouses")
      .select(
        "id, warehouse_id, name, status, location, total_capacity_kg, total_silos, manager_id, technician_ids, created_at, notes",
      )
      .is("deleted_at", null)
      .order("name", { ascending: true })
      .limit(500);
    if (whErr) throw whErr;

    if (!warehouses || warehouses.length === 0) return [];

    // Collect all unique profile IDs we need to resolve names for.
    const profileIds = new Set<string>();
    const warehouseIds = new Set<string>();
    for (const w of warehouses) {
      warehouseIds.add(w.id);
      if (w.manager_id) profileIds.add(w.manager_id);
      for (const tid of (w.technician_ids ?? []) as string[]) profileIds.add(tid);
    }

    // Batch-fetch profiles — only name + role fields needed.
    const profileMap = new Map<string, { name: string | null; email: string | null }>();
    if (profileIds.size > 0) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("id, name, email")
        .in("id", [...profileIds]);
      for (const p of profiles ?? []) {
        profileMap.set(p.id, { name: p.name, email: p.email });
      }
    }

    // Batch-fetch silos for all warehouses
    const { data: silos } = await sb
      .from("silos")
      .select("id, warehouse_id, name, silo_id, capacity_kg, status")
      .in("warehouse_id", [...warehouseIds])
      .order("name", { ascending: true });
    
    const silosByWarehouse = new Map<string, any[]>();
    for (const silo of silos ?? []) {
      if (!silosByWarehouse.has(silo.warehouse_id)) {
        silosByWarehouse.set(silo.warehouse_id, []);
      }
      silosByWarehouse.get(silo.warehouse_id)!.push(silo);
    }

    const resolve = (id: string | null | undefined) => {
      if (!id) return null;
      const p = profileMap.get(id);
      return p ? (p.name ?? p.email ?? id.slice(0, 8)) : id.slice(0, 8);
    };

    return (warehouses as any[]).map((w) => ({
      id: w.id as string,
      warehouse_id: w.warehouse_id as string,
      name: w.name as string,
      status: (w.status ?? "active") as string,
      location: (w.location ?? {}) as { description?: string | null; address?: string | null },
      total_capacity_kg: (w.total_capacity_kg ?? 0) as number,
      total_silos: (silosByWarehouse.get(w.id) ?? []).length,
      silos: (silosByWarehouse.get(w.id) ?? []) as any[],
      notes: (w.notes ?? null) as string | null,
      manager_id: (w.manager_id ?? null) as string | null,
      manager_name: resolve(w.manager_id),
      technician_ids: (w.technician_ids ?? []) as string[],
      technician_names: ((w.technician_ids ?? []) as string[])
        .map(resolve)
        .filter(Boolean) as string[],
    }));
  });

// Update manager and technician assignments for a warehouse
export const updateWarehouseTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => {
    console.log("[updateWarehouseTeam] Raw data received:", d);
    console.log("[updateWarehouseTeam] Data type:", typeof d);
    console.log("[updateWarehouseTeam] Data keys:", Object.keys(d || {}));
    return d;
  })
  .handler(async ({ data, context }) => {
    console.log("[updateWarehouseTeam] Handler data:", data);
    console.log("[updateWarehouseTeam] Handler data type:", typeof data);
    console.log("[updateWarehouseTeam] Handler data keys:", Object.keys(data || {}));

    // Check authorization
    const { getEffectiveRole } = await import("./rbac.server");
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["super_admin", "admin"].includes(role)) throw new Error("Forbidden");

    const parsed = parseOrThrow(
      z.object({
        warehouseId: z.string().min(1),
        managerId: z.string().nullable(),
        technicianIds: z.array(z.string()),
      }),
      data,
    );
    console.log("[updateWarehouseTeam] Parsed data:", parsed);

    const { warehouseId, managerId, technicianIds } = parsed;

    const sb = context.supabase;

    // Update warehouse with new assignments
    const { error: updateErr } = await sb
      .from("warehouses")
      .update({
        manager_id: managerId,
        technician_ids: technicianIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", warehouseId);

    if (updateErr) throw updateErr;

    // Log the action
    await logManagerAction({
      actorId: context.userId,
      action: "update_warehouse_team",
      targetType: "warehouse",
      targetId: warehouseId,
      meta: {
        warehouse_id: warehouseId,
        manager_id: managerId,
        technician_ids: technicianIds,
      },
    });

    return { success: true };
  });

// Fetch available managers and technicians for assignment
export const listAvailableTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Check authorization
    const { getEffectiveRole } = await import("./rbac.server");
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["super_admin", "admin"].includes(role)) throw new Error("Forbidden");

    const sb = context.supabase;

    try {
      // Get the tenant ID (admin_id from the current user's profile)
      const { data: currentProfile, error: profileErr } = await sb
        .from("profiles")
        .select("admin_id, id")
        .eq("id", context.userId)
        .maybeSingle();
      
      if (profileErr) {
        console.error("[listAvailableTeam] Error fetching current profile:", profileErr);
        throw profileErr;
      }
      
      const tenantId = currentProfile?.admin_id ?? currentProfile?.id;
      if (!tenantId) throw new Error("Could not determine tenant");
      console.log("[listAvailableTeam] Tenant ID:", tenantId);

      // Fetch all users under this tenant (admin_id) with manager/technician role
      const { data: profiles, error: profilesErr } = await sb
        .from("profiles")
        .select("id, name, email, admin_id")
        .or(`admin_id.eq.${tenantId},id.eq.${tenantId}`)
        .limit(1000);

      if (profilesErr) {
        console.error("[listAvailableTeam] Error fetching profiles:", profilesErr);
        throw profilesErr;
      }

      console.log("[listAvailableTeam] Profiles found:", profiles?.length ?? 0);

      if (!profiles || profiles.length === 0) {
        console.warn("[listAvailableTeam] No profiles found for tenant", tenantId);
        return { managers: [], technicians: [] };
      }

      const userIds = profiles.map((p) => p.id);
      const profileMap = new Map<string, { name: string | null; email: string | null }>();
      for (const p of profiles) {
        profileMap.set(p.id, { name: p.name, email: p.email });
      }

      // Get roles for these users
      const { data: userRoles, error: rolesErr } = await sb
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .in("role", ["manager", "technician"]);

      if (rolesErr) {
        console.error("[listAvailableTeam] Error fetching roles:", rolesErr);
        throw rolesErr;
      }

      console.log("[listAvailableTeam] User roles found:", userRoles?.length ?? 0);

      // Separate managers and technicians
      const managers = [];
      const technicians = [];

      for (const ur of userRoles ?? []) {
        const profile = profileMap.get(ur.user_id);
        if (!profile) {
          console.warn("[listAvailableTeam] No profile for user", ur.user_id);
          continue;
        }
        
        const displayName = profile.name || profile.email || ur.user_id.slice(0, 8);
        const item = { id: ur.user_id, name: displayName };

        if (ur.role === "manager") {
          managers.push(item);
        } else if (ur.role === "technician") {
          technicians.push(item);
        }
      }

      console.log("[listAvailableTeam] Returning - managers:", managers.length, "technicians:", technicians.length);

      return {
        managers: managers.sort((a, b) => a.name.localeCompare(b.name)),
        technicians: technicians.sort((a, b) => a.name.localeCompare(b.name)),
      };
    } catch (error) {
      console.error("[listAvailableTeam] Exception:", error);
      throw error;
    }
  });
