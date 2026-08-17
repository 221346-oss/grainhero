/**
 * Technician Management Functions (Super-admin only)
 * Create, update, and manage global company technicians
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function requireSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!data) throw new Error("Forbidden: super-admin only");
}

// ────────────────────────────────────────────────────────────────────────────
// List all global technicians
// ────────────────────────────────────────────────────────────────────────────

export const listGlobalTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get all technicians with admin_id IS NULL (global technicians)
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs, created_at, updated_at")
      .is("admin_id", null)
      .eq("is_technician", true)  // Only those marked as technician
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Verify they have technician role
    const techIds = (data || []).map((p: any) => p.id);
    if (techIds.length === 0) {
      return { technicians: [] };
    }

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "technician")
      .in("user_id", techIds);

    const validIds = new Set((roles || []).map((r: any) => r.user_id));

    const technicians = (data || [])
      .filter((p: any) => validIds.has(p.id))
      .map((p: any) => ({
        ...p,
        is_available: 
          p.technician_status === 'available' || 
          (p.current_job_count ?? 0) < (p.max_concurrent_jobs ?? 3),
      }));

    return { technicians };
  });

// ────────────────────────────────────────────────────────────────────────────
// Create a new global technician
// ────────────────────────────────────────────────────────────────────────────

const createTechnicianInput = z.object({
  email: z.string().email().toLowerCase(),
  name: z.string().min(2).max(100),
  phone: z.string().optional(),
  password: z.string().min(8).max(100).optional(),  // If creating with password
  max_concurrent_jobs: z.number().int().min(1).max(20).default(3),
});

export const createGlobalTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createTechnicianInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (existing) {
      throw new Error("Email already registered");
    }

    // Create auth user if password provided, otherwise just create profile
    let userId: string;

    if (data.password) {
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,  // Auto-confirm email
      });

      if (authError) throw new Error(`Failed to create user: ${authError.message}`);
      userId = authData.user.id;
    } else {
      // Generate a random user ID if not creating auth user
      userId = crypto.randomUUID?.() || require("uuid").v4();
    }

    // Create profile (admin_id IS NULL for global technician)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userId,
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        admin_id: null,  // KEY: Global technician
        is_technician: true,
        technician_status: "available",
        max_concurrent_jobs: data.max_concurrent_jobs,
        current_job_count: 0,
        has_access: "full",
      });

    if (profileError) throw new Error(`Failed to create profile: ${profileError.message}`);

    // Assign technician role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "technician",
      });

    if (roleError) throw new Error(`Failed to assign role: ${roleError.message}`);

    return {
      ok: true,
      technician: {
        id: userId,
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        technician_status: "available",
        max_concurrent_jobs: data.max_concurrent_jobs,
        current_job_count: 0,
      },
    };
  });

// ────────────────────────────────────────────────────────────────────────────
// Update technician
// ────────────────────────────────────────────────────────────────────────────

const updateTechnicianInput = z.object({
  technicianId: z.string().uuid(),
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  technician_status: z.enum(["available", "busy", "offline", "on_leave"]).optional(),
  max_concurrent_jobs: z.number().int().min(1).max(20).optional(),
});

export const updateGlobalTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateTechnicianInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Build update object with only provided fields
    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name) updates.name = data.name;
    if (data.phone !== undefined) updates.phone = data.phone || null;
    if (data.technician_status) updates.technician_status = data.technician_status;
    if (data.max_concurrent_jobs !== undefined) updates.max_concurrent_jobs = data.max_concurrent_jobs;

    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates)
      .eq("id", data.technicianId)
      .is("admin_id", null);  // Safety: only update global technicians

    if (error) throw new Error(`Failed to update: ${error.message}`);

    return { ok: true };
  });

// ────────────────────────────────────────────────────────────────────────────
// Delete technician (soft delete via role removal)
// ────────────────────────────────────────────────────────────────────────────

const deleteTechnicianInput = z.object({
  technicianId: z.string().uuid(),
});

export const deleteGlobalTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => deleteTechnicianInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Remove technician role (soft delete)
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.technicianId)
      .eq("role", "technician");

    if (error) throw new Error(`Failed to remove: ${error.message}`);

    // Mark as offline
    await supabaseAdmin
      .from("profiles")
      .update({ technician_status: "offline" })
      .eq("id", data.technicianId);

    return { ok: true };
  });

// ────────────────────────────────────────────────────────────────────────────
// Get technician details
// ────────────────────────────────────────────────────────────────────────────

export const getGlobalTechnicianDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ technicianId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tech, error } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs, created_at, updated_at")
      .eq("id", data.technicianId)
      .is("admin_id", null)
      .maybeSingle();

    if (error) throw error;
    if (!tech) throw new Error("Technician not found");

    return { technician: tech };
  });
