/**
 * Technician Management Functions (Super-admin only)
 * Create, update, and manage global company technicians
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type Row = Record<string, any>;

async function requireSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!data) throw new Error("Forbidden: super-admin only");
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ────────────────────────────────────────────────────────────────────────────
// List all global technicians
// ────────────────────────────────────────────────────────────────────────────

export const listGlobalTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get all profiles with admin_id IS NULL (global/company technicians).
    // Technicians are identified by the technician role in user_roles — there
    // is no is_technician column on profiles.
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs, created_at, updated_at",
      )
      .is("admin_id", null)
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
          p.technician_status === "available" ||
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
  password: z.string().min(8).max(100).optional(), // If creating with password
  max_concurrent_jobs: z.number().int().min(1).max(20).default(3),
});

export const createGlobalTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createTechnicianInput.parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Look up any existing profile with this email. A profile may already
    // exist when the technician was added before and then "removed" — Remove
    // is a soft delete that keeps the profile row but drops the technician
    // role, so re-adding used to fail with "Email already registered" while
    // the technician stayed invisible in the fleet list (which filters by
    // role) and no welcome email was sent.
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, admin_id")
      .eq("email", data.email)
      .maybeSingle();

    let userId: string;

    if (existing && existing.admin_id !== null) {
      // The email belongs to a customer/admin account — it can't be reused.
      throw new Error("Email already registered");
    }

    if (existing) {
      // Global-technician profile already exists (e.g. soft-deleted earlier) —
      // reuse its id instead of erroring out.
      userId = existing.id;
    } else {
      // Always create a real auth user — profiles.id is a foreign key to
      // auth.users(id), so a synthetic UUID can never be inserted (that was the
      // source of "violates foreign key constraint profiles_id_fkey"). If the
      // auth user already exists (e.g. an abandoned checkout signup with no
      // profile row), fall back to locating them by email.
      try {
        const createOpts: {
          email: string;
          email_confirm: boolean;
          password?: string;
          user_metadata?: Record<string, unknown>;
        } = {
          email: data.email,
          email_confirm: true, // Auto-confirm email — login is OTP-based
          user_metadata: { name: data.name, global_technician: true },
        };
        if (data.password) createOpts.password = data.password;

        const { data: authData, error: authError } =
          await supabaseAdmin.auth.admin.createUser(createOpts);
        if (authError) throw authError;
        userId = authData.user.id;
      } catch (createErr: any) {
        const msg = createErr?.message || String(createErr ?? "");
        console.warn("[createGlobalTechnician] createUser failed, falling back to listUsers:", msg);
        const { data: existingUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        if (listErr) throw new Error(listErr.message || "Failed to look up existing user");
        const found = existingUsers?.users?.find(
          (u) => (u.email ?? "").toLowerCase() === data.email,
        );
        if (!found) throw new Error(msg || "Could not create the user in Supabase Auth.");
        userId = found.id;
      }
    }

    // Upsert the profile with the technician fields. Supabase's
    // handle_new_user() trigger already created a minimal profile row when the
    // auth user was created, so a plain INSERT fails with a profiles_pkey
    // duplicate-key error — the upsert updates that row instead and sets the
    // technician fields in one step (it also covers the restore path).
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: userId,
        email: data.email,
        name: data.name,
        phone: data.phone || null,
        admin_id: null, // KEY: Global technician
        technician_status: "available",
        max_concurrent_jobs: data.max_concurrent_jobs,
        current_job_count: 0,
        has_access: "full",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

    if (profileError) throw new Error(`Failed to save profile: ${profileError.message}`);

    // handle_new_user() also grants a default 'admin' role on signup. A
    // company technician must only have the technician role, so strip the
    // auto-granted role and then ensure the technician role exists (the row
    // may already exist when restoring a previously soft-deleted technician).
    const { error: stripRoleError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .in("role", ["admin", "pending"]);
    if (stripRoleError)
      throw new Error(`Failed to configure technician role: ${stripRoleError.message}`);

    const { data: roleExists } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("user_id", userId)
      .eq("role", "technician")
      .maybeSingle();

    if (!roleExists) {
      const { error: roleError } = await supabaseAdmin.from("user_roles").insert({
        user_id: userId,
        role: "technician",
      });

      if (roleError) throw new Error(`Failed to assign role: ${roleError.message}`);
    }

    // No password means "invite via email" — the app logs in with email OTP,
    // so just notify the technician that their account is ready. Non-fatal.
    if (!data.password) {
      try {
        const { sendEmailViaResend } = await import("@/lib/resend.server");
        const appBase = (process.env.APP_ORIGIN ?? "https://grainhero.app").replace(/\/$/, "");
        const safeName = escapeHtml(data.name);
        await sendEmailViaResend({
          to: data.email,
          subject: "You've been added as a GrainHero technician",
          html: `<div style="font-family:Inter,Arial,sans-serif;color:#0f172a;max-width:520px;margin:auto">
            <h2 style="color:#065f46">Welcome to GrainHero, ${safeName}</h2>
            <p>You've been added as a company technician. Install assignments will appear in your dashboard once the super-admin assigns them.</p>
            <p>Sign in with your email at <a href="${appBase}" style="color:#059669">${appBase}</a> — you'll receive a one-time code to log in.</p>
            <p style="color:#64748b;font-size:12px">If you didn't expect this, you can ignore this email.</p>
          </div>`,
        });
      } catch (emailErr) {
        console.warn(
          "[createGlobalTechnician] invite email failed (non-fatal):",
          (emailErr as Error).message,
        );
      }
    }

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
  // Manual override for the job counter — lets the super-admin fix a count
  // that was inflated by pre-fix assignments (e.g. 5/3) or sync a recount.
  current_job_count: z.number().int().min(0).max(999).optional(),
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
    if (data.max_concurrent_jobs !== undefined)
      updates.max_concurrent_jobs = data.max_concurrent_jobs;
    if (data.current_job_count !== undefined) updates.current_job_count = data.current_job_count;

    // Cast is required because the generated DB types don't expose the
    // technician columns on profiles (technician_status, max_concurrent_jobs).
    const { error } = await supabaseAdmin
      .from("profiles")
      .update(updates as any)
      .eq("id", data.technicianId)
      .is("admin_id", null); // Safety: only update global technicians

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

    // Remove technician role (soft delete). Also remove the default 'admin'
    // role that handle_new_user() grants on signup, so a removed technician
    // doesn't keep admin powers and can be cleanly re-added later.
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.technicianId)
      .in("role", ["technician", "admin"]);

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
      .select(
        "id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs, created_at, updated_at",
      )
      .eq("id", data.technicianId)
      .is("admin_id", null)
      .maybeSingle();

    if (error) throw error;
    if (!tech) throw new Error("Technician not found");

    return { technician: tech };
  });

// ────────────────────────────────────────────────────────────────────────────
// Technician dashboard stats (Overview tab)
// ────────────────────────────────────────────────────────────────────────────

export const getTechnicianDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // All technician ids
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "technician");
    const techIds = ((roleRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);

    // Global technician profiles (admin_id IS NULL)
    const { data: profiles } = techIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("id, technician_status, current_job_count, max_concurrent_jobs")
          .is("admin_id", null)
          .in("id", techIds)
      : { data: [] };

    const statusCounts = { available: 0, busy: 0, offline: 0, on_leave: 0, other: 0 };
    for (const p of (profiles ?? []) as Array<{ technician_status: string | null }>) {
      const s = p.technician_status;
      if (s === "available" || s === "busy" || s === "offline" || s === "on_leave")
        statusCounts[s]++;
      else statusCounts.other++;
    }

    // Active + blocked installs
    const { data: installs } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id, technician_id, status, scheduled_for, order_id, blocker_note, updated_at")
      .in("status", ["scheduled", "en_route", "onsite", "blocked"] as never);
    const allInstalls = (installs ?? []) as Array<Record<string, any>>;
    const activeInstalls = allInstalls.filter((i) => i.status !== "blocked");
    const blockedInstalls = allInstalls
      .filter((i) => i.status === "blocked")
      .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));

    // In-transit hardware orders (silos on trucks)
    const { count: inTransit } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id", { count: "exact", head: true })
      .in("status", ["shipped", "in_transit"] as never);

    // Installs due within the next 7 days
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const dueThisWeek = activeInstalls.filter((i) => {
      if (!i.scheduled_for) return false;
      const d = new Date(i.scheduled_for).getTime();
      return d >= now && d <= weekFromNow;
    }).length;

    // City coverage from warehouse assignments
    const { data: assignments } = await supabaseAdmin
      .from("technician_warehouse_assignments" as never)
      .select("city, technician_id, warehouse_id");
    const cityMap = new Map<string, { technicians: Set<string>; warehouses: Set<string> }>();
    for (const a of (assignments ?? []) as Array<{
      city: string | null;
      technician_id: string;
      warehouse_id: string | null;
    }>) {
      const city = a.city ?? "Unknown";
      if (!cityMap.has(city)) cityMap.set(city, { technicians: new Set(), warehouses: new Set() });
      const entry = cityMap.get(city)!;
      if (a.technician_id) entry.technicians.add(a.technician_id);
      if (a.warehouse_id) entry.warehouses.add(a.warehouse_id);
    }
    const cityCoverage = Array.from(cityMap.entries())
      .map(([city, v]) => ({
        city,
        technicians: v.technicians.size,
        warehouses: v.warehouses.size,
      }))
      .sort((a, b) => b.technicians - a.technicians || b.warehouses - a.warehouses);

    return {
      totalTechnicians: (profiles ?? []).length,
      statusCounts,
      activeInstalls: activeInstalls.length,
      inTransitOrders: inTransit ?? 0,
      blockedInstalls,
      dueThisWeek,
      cityCoverage,
    };
  });

// ────────────────────────────────────────────────────────────────────────────
// Get technician detail (profile + installs + warehouse assignments)
// ────────────────────────────────────────────────────────────────────────────

export const getGlobalTechnicianDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ technicianId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: tech } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs, created_at, updated_at, last_active_at",
      )
      .eq("id", data.technicianId)
      .is("admin_id", null)
      .maybeSingle();
    if (!tech) throw new Error("Technician not found");

    const { data: installs } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select(
        "id, status, scheduled_for, completed_at, blocker_note, order_id, hardware_orders(id, customer_name, customer_email, install_city, status, tracking_carrier, tracking_number)",
      )
      .eq("technician_id", data.technicianId)
      .order("scheduled_for", { ascending: false });

    const { data: assignments } = await supabaseAdmin
      .from("technician_warehouse_assignments" as never)
      .select("id, city, is_primary, warehouse_id, warehouses(id, name, warehouse_id, location)")
      .eq("technician_id", data.technicianId);

    return {
      technician: tech,
      installs: (installs ?? []) as Array<Record<string, any>>,
      assignments: (assignments ?? []) as Array<Record<string, any>>,
    };
  });

// ────────────────────────────────────────────────────────────────────────────
// Technician self-service (availability + own profile)
//
// The super-admin only assigns tasks to technicians who declared themselves
// available. These functions let the technician manage that from their own
// dashboard (web or mobile), and the super-admin sees the live status in the
// fleet table and every assignment picker.
// ────────────────────────────────────────────────────────────────────────────

export const getMyTechnicianProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select(
        "id, name, email, phone, admin_id, technician_status, current_job_count, max_concurrent_jobs",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    console.log(
      `[getMyTechnicianProfile] userId=${context.userId} profile=${JSON.stringify({ id: data?.id, name: data?.name, admin_id: data?.admin_id, current_job_count: data?.current_job_count })}`,
    );
    return { profile: data ?? null };
  });

// ────────────────────────────────────────────────────────────────────────────
// List ALL installations (super-admin overview — all technicians)
// ────────────────────────────────────────────────────────────────────────────

export const listAllInstallations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: installs, error } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select(
        "id, status, scheduled_for, completed_at, blocker_note, order_id, technician_id, created_at, updated_at, " +
          "hardware_orders(id, plan_name, hardware_quantity, install_city, install_country, customer_name, customer_email, status, assigned_technician_id, created_at), " +
          "profiles!hardware_order_installations_technician_id_fkey(id, name, email, phone)",
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Also fetch orders that don't have an install row yet but have a technician assigned
    const { data: ordersWithTech } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select(
        "id, plan_name, hardware_quantity, install_city, install_country, customer_name, customer_email, status, assigned_technician_id, created_at, " +
          "profiles!hardware_orders_assigned_technician_id_fkey(id, name, email)",
      )
      .not("assigned_technician_id", "is", null)
      .order("created_at", { ascending: false });

    // Dedupe: orders that already have an install row are already covered
    const installOrderIds = new Set((installs ?? []).map((i: any) => i.order_id as string));
    const pendingAssigns = ((ordersWithTech ?? []) as any[])
      .filter((o) => !installOrderIds.has(o.id as string))
      .map((o) => ({
        id: null,
        status: "pending_install",
        scheduled_for: null,
        completed_at: null,
        blocker_note: null,
        order_id: o.id,
        technician_id: o.assigned_technician_id,
        created_at: o.created_at,
        updated_at: o.created_at,
        hardware_orders: o,
        profiles: o.profiles,
      }));

    const all = [...((installs ?? []) as any[]), ...pendingAssigns].sort((a: any, b: any) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );

    return { installations: all };
  });

export const updateMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        technician_status: z.enum(["available", "busy", "offline", "on_leave"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isTech } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "technician",
    });
    if (!isTech) throw new Error("Forbidden: technicians only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        technician_status: data.technician_status,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", context.userId);
    if (error) throw new Error(`Failed to update availability: ${error.message}`);

    return { ok: true, technician_status: data.technician_status };
  });

// ────────────────────────────────────────────────────────────────────────────
// SuperAdmin Technician Dashboard — fleet-wide data accessible to
// users with the technician role (not just super_admin). This lets a
// senior / superadmin-technician manage the entire fleet from their
// own dashboard without needing full super_admin privileges.
// ────────────────────────────────────────────────────────────────────────────

async function requireTechnicianOrSuperAdmin(supabase: any, userId: string) {
  const { data: isSuper } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "super_admin",
  });
  if (isSuper) return;
  const { data: isTech } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "technician",
  });
  if (!isTech) throw new Error("Forbidden: technician or super-admin only");
}

/**
 * List ALL installations — accessible to technicians and super-admins.
 * Technicians see the same fleet-wide view that was previously super-admin only.
 */
export const listAllInstallationsForFleet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTechnicianOrSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: installs, error } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select(
        "id, status, scheduled_for, completed_at, blocker_note, order_id, technician_id, created_at, updated_at, " +
          "hardware_orders(id, plan_name, hardware_quantity, install_city, install_country, customer_name, customer_email, status, assigned_technician_id, created_at), " +
          "profiles!hardware_order_installations_technician_id_fkey(id, name, email, phone)",
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Also fetch orders that don't have an install row yet but have a technician assigned
    const { data: ordersWithTech } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select(
        "id, plan_name, hardware_quantity, install_city, install_country, customer_name, customer_email, status, assigned_technician_id, created_at, " +
          "profiles!hardware_orders_assigned_technician_id_fkey(id, name, email)",
      )
      .not("assigned_technician_id", "is", null)
      .order("created_at", { ascending: false });

    const installOrderIds = new Set((installs ?? []).map((i: any) => i.order_id as string));
    const pendingAssigns = ((ordersWithTech ?? []) as any[])
      .filter((o) => !installOrderIds.has(o.id as string))
      .map((o) => ({
        id: null,
        status: "pending_install",
        scheduled_for: null,
        completed_at: null,
        blocker_note: null,
        order_id: o.id,
        technician_id: o.assigned_technician_id,
        created_at: o.created_at,
        updated_at: o.created_at,
        hardware_orders: o,
        profiles: o.profiles,
      }));

    const all = [...((installs ?? []) as any[]), ...pendingAssigns].sort((a: any, b: any) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );

    return { installations: all };
  });

/**
 * Fleet stats — accessible to technicians and super-admins.
 */
export const getFleetDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTechnicianOrSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // All technician ids
    const { data: roleRows } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "technician");
    const techIds = ((roleRows ?? []) as Array<{ user_id: string }>).map((r) => r.user_id);

    // Global technician profiles (admin_id IS NULL)
    const { data: profiles } = techIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select(
            "id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs, created_at",
          )
          .is("admin_id", null)
          .in("id", techIds)
      : { data: [] };

    const statusCounts = { available: 0, busy: 0, offline: 0, on_leave: 0, other: 0 };
    for (const p of (profiles ?? []) as Array<{ technician_status: string | null }>) {
      const s = p.technician_status;
      if (s === "available" || s === "busy" || s === "offline" || s === "on_leave")
        statusCounts[s]++;
      else statusCounts.other++;
    }

    // Active + blocked installs
    const { data: installs } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id, technician_id, status, scheduled_for, order_id, blocker_note, updated_at")
      .in("status", ["scheduled", "en_route", "onsite", "blocked"] as never);
    const allInstalls = (installs ?? []) as Array<Record<string, any>>;
    const activeInstalls = allInstalls.filter((i) => i.status !== "blocked");
    const blockedInstalls = allInstalls
      .filter((i) => i.status === "blocked")
      .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")));

    // In-transit hardware orders
    const { count: inTransit } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id", { count: "exact", head: true })
      .in("status", ["shipped", "in_transit"] as never);

    // Installs due within the next 7 days
    const now = Date.now();
    const weekFromNow = now + 7 * 24 * 60 * 60 * 1000;
    const dueThisWeek = activeInstalls.filter((i) => {
      if (!i.scheduled_for) return false;
      const d = new Date(i.scheduled_for).getTime();
      return d >= now && d <= weekFromNow;
    }).length;

    // Completed installs
    const { count: completedInstalls } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id", { count: "exact", head: true })
      .eq("status", "completed" as never);

    // Total installs
    const { count: totalInstalls } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id", { count: "exact", head: true });

    return {
      totalTechnicians: (profiles ?? []).length,
      technicians: (profiles ?? []) as Array<Record<string, any>>,
      statusCounts,
      activeInstalls: activeInstalls.length,
      inTransitOrders: inTransit ?? 0,
      blockedInstalls,
      dueThisWeek,
      completedInstalls: completedInstalls ?? 0,
      totalInstalls: totalInstalls ?? 0,
    };
  });

/**
 * List all global technicians — accessible to technicians and super-admins.
 */
export const listAllFleetTechnicians = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTechnicianOrSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(
        "id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs, created_at, updated_at",
      )
      .is("admin_id", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    const techIds = (data || []).map((p: any) => p.id);
    if (techIds.length === 0) return { technicians: [] };

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
          p.technician_status === "available" ||
          (p.current_job_count ?? 0) < (p.max_concurrent_jobs ?? 3),
      }));

    return { technicians };
  });

/**
 * Get fleet-wide tickets (open field tickets) — accessible to technicians.
 */
export const listFleetTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireTechnicianOrSuperAdmin(context.supabase, context.userId);

    const { data: tickets, error } = await (context.supabase as any)
      .from("field_tickets")
      .select("*")
      .in("status", ["open", "resolved"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return { tickets: tickets ?? [] };
  });

// ────────────────────────────────────────────────────────────────────────────
// Technician's own dashboard — scoped to the current user only.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get the current technician's own installs with full detail.
 * Only returns installs assigned to the current user.
 */
export const getMyTechnicianInstalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isTech } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "technician",
    });
    if (!isTech) throw new Error("Forbidden: technicians only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get installs assigned to this technician
    const SELECT =
      "id, status, scheduled_for, completed_at, blocker_note, order_id, technician_id, created_at, updated_at, " +
      "hardware_orders(id, plan_name, hardware_quantity, install_city, install_country, install_address, customer_name, customer_email, contact_phone, status, assigned_technician_id, created_at, tracking_carrier, tracking_number, expected_arrival_at)";

    const [byTechRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from("hardware_order_installations" as never)
        .select(SELECT)
        .eq("technician_id", context.userId),
      supabaseAdmin
        .from("hardware_orders" as never)
        .select("id")
        .eq("assigned_technician_id", context.userId),
    ]);

    if (byTechRes.error) throw byTechRes.error;
    const byTech = (byTechRes.data ?? []) as Row[];
    const orderIds = new Set(((ordersRes.data ?? []) as Row[]).map((o) => o.id as string));

    console.log(
      `[getMyTechnicianInstalls] userId=${context.userId} byTech=${byTech.length} orderIds=${orderIds.size} ordersRes.error=${ordersRes.error ? JSON.stringify(ordersRes.error) : "none"}`,
    );

    // Diagnostic: check total orders/installations in DB to rule out data-vs-query issue
    const [{ count: totalOrders }, { count: totalInstalls }] = await Promise.all([
      supabaseAdmin.from("hardware_orders" as never).select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("hardware_order_installations" as never)
        .select("id", { count: "exact", head: true }),
    ]);
    // Also check how many orders have ANY technician assigned
    const { count: ordersWithTech } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id", { count: "exact", head: true })
      .not("assigned_technician_id", "is", null);
    console.log(
      `[getMyTechnicianInstalls] DIAGNOSTIC totalOrders=${totalOrders ?? 0} totalInstalls=${totalInstalls ?? 0} ordersWithTech=${ordersWithTech ?? 0}`,
    );

    let installs = byTech;
    if (orderIds.size > 0) {
      const { data: byOrder, error: byOrderErr } = await supabaseAdmin
        .from("hardware_order_installations" as never)
        .select(SELECT)
        .in("order_id", [...orderIds]);
      if (byOrderErr) throw byOrderErr;
      const seen = new Set(byTech.map((i) => i.id as string));
      installs = [
        ...byTech,
        ...((byOrder ?? []) as Row[]).filter((i) => !seen.has(i.id as string)),
      ];
    }

    // Get status history for each install
    const installIds = installs.map((i) => i.id).filter(Boolean);
    const { data: historyData } = installIds.length
      ? await supabaseAdmin
          .from("hardware_order_status_history" as never)
          .select("id, order_id, from_status, to_status, actor_id, actor_role, note, created_at")
          .in(
            "order_id",
            installIds.map((i) => i.order_id as string),
          )
          .order("created_at", { ascending: false })
      : { data: [] };

    // Group history by order_id
    const historyByOrder = new Map<string, Row[]>();
    for (const h of (historyData ?? []) as Row[]) {
      const oid = h.order_id as string;
      if (!historyByOrder.has(oid)) historyByOrder.set(oid, []);
      historyByOrder.get(oid)!.push(h);
    }

    // Attach history to each install
    const enrichedInstalls = installs.map((i) => ({
      ...i,
      status_history: historyByOrder.get(i.order_id as string) ?? [],
    }));

    // Sort by scheduled_for (nulls last), then created_at desc
    enrichedInstalls.sort((a: Record<string, any>, b: Record<string, any>) => {
      const aDate = a.scheduled_for ? new Date(a.scheduled_for as string).getTime() : Infinity;
      const bDate = b.scheduled_for ? new Date(b.scheduled_for as string).getTime() : Infinity;
      return aDate - bDate;
    });

    return { installs: enrichedInstalls };
  });

/**
 * Get install detail with full history, devices, events, buyer info.
 * Scoped to the current technician — can only view their own installs.
 */
export const getMyInstallDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ installId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isTech } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "technician",
    });
    if (!isTech) throw new Error("Forbidden: technicians only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: install, error } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("*, hardware_orders(*)")
      .eq("id", data.installId)
      .single();
    if (error || !install) throw new Error("Install not found");
    const inst = install as Row;
    const order = (inst.hardware_orders ?? null) as Row | null;

    // Ownership check
    if (
      inst.technician_id !== context.userId &&
      (order?.assigned_technician_id as string | undefined) !== context.userId
    )
      throw new Error("Forbidden");

    const adminId = (order?.admin_id as string | undefined) ?? null;

    const [devicesRes, eventsRes, historyRes, buyerRes] = await Promise.all([
      supabaseAdmin
        .from("hardware_order_devices" as never)
        .select("*")
        .eq("order_id", inst.order_id),
      supabaseAdmin
        .from("hardware_order_visit_events" as never)
        .select("*")
        .eq("installation_id", inst.id)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("hardware_order_status_history" as never)
        .select("*")
        .eq("order_id", inst.order_id)
        .order("created_at", { ascending: true }),
      adminId
        ? supabaseAdmin
            .from("profiles")
            .select("id,name,email,phone")
            .eq("id", adminId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Get warehouse assignments for this technician
    const { data: warehouseAssignments } = await supabaseAdmin
      .from("technician_warehouse_assignments" as never)
      .select("id, city, is_primary, warehouse_id, warehouses(id, name, warehouse_id, location)")
      .eq("technician_id", context.userId);

    return {
      install: inst,
      devices: (devicesRes.data ?? []) as Row[],
      events: (eventsRes.data ?? []) as Row[],
      history: (historyRes.data ?? []) as Row[],
      buyer: (buyerRes.data as Row) ?? null,
      warehouseAssignments: (warehouseAssignments ?? []) as Row[],
    };
  });

/**
 * Get the current technician's warehouse assignments.
 *
 * Sources warehouse data from TWO places:
 * 1. `technician_warehouse_assignments` — formal warehouse coverage assignments
 * 2. `hardware_orders` — orders where this technician is assigned (derives warehouse info)
 *
 * This dual-source approach ensures the Warehouses tab shows data even when the
 * superadmin assigns a technician to an order (which sets orders.warehouse_id)
 * without separately creating a technician_warehouse_assignments row.
 */
export const getMyWarehouseAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isTech } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "technician",
    });
    if (!isTech) throw new Error("Forbidden: technicians only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Source 1: formal warehouse assignments
    const { data: assignments, error } = await supabaseAdmin
      .from("technician_warehouse_assignments" as never)
      .select("id, city, is_primary, warehouse_id, warehouses(id, name, warehouse_id, location)")
      .eq("technician_id", context.userId);
    if (error) throw error;

    // Source 2: orders assigned to this technician that have a warehouse_id
    const { data: assignedOrders } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select(
        "id, warehouse_id, status, customer_name, install_city, install_country, " +
          "tracking_carrier, tracking_number, expected_arrival_at, plan_name, hardware_quantity, " +
          "assigned_technician_id, created_at",
      )
      .eq("assigned_technician_id", context.userId)
      .not("warehouse_id", "is", null);

    console.log(
      `[getMyWarehouseAssignments] userId=${context.userId} formalAssignments=${(assignments ?? []).length} orderDerived=${((assignedOrders ?? []) as Row[]).length}`,
    );

    // Collect all unique warehouse IDs from both sources
    const formalWarehouseIds = new Set(
      (assignments ?? []).map((a: any) => a.warehouse_id as string).filter(Boolean),
    );
    const orderWarehouseIds = new Set(
      ((assignedOrders ?? []) as Row[]).map((o) => o.warehouse_id as string).filter(Boolean),
    );
    const allWarehouseIds = [...new Set([...formalWarehouseIds, ...orderWarehouseIds])];

    // Fetch warehouse details for any warehouse IDs we don't already have from formal assignments
    const missingWarehouseIds = allWarehouseIds.filter((id) => !formalWarehouseIds.has(id));
    const extraWarehouseDetails: Record<string, any> = {};
    if (missingWarehouseIds.length > 0) {
      const { data: whData } = await supabaseAdmin
        .from("warehouses" as never)
        .select("id, name, warehouse_id, location")
        .in("id", missingWarehouseIds);
      for (const w of (whData ?? []) as Row[]) {
        extraWarehouseDetails[w.id as string] = w;
      }
    }

    // Group orders by warehouse_id
    const ordersByWarehouse = new Map<string, Row[]>();
    for (const o of (assignedOrders ?? []) as Row[]) {
      const wid = o.warehouse_id as string;
      if (!ordersByWarehouse.has(wid)) ordersByWarehouse.set(wid, []);
      ordersByWarehouse.get(wid)!.push(o);
    }

    // Merge formal assignments with order-derived warehouse data
    const seenWarehouses = new Set<string>();
    const enriched: Row[] = [];

    // Add formal assignments first
    for (const a of (assignments ?? []) as any[]) {
      seenWarehouses.add(a.warehouse_id as string);
      enriched.push({
        ...a,
        orders: ordersByWarehouse.get(a.warehouse_id) ?? [],
        source: "assignment",
      });
    }

    // Add warehouses only known through orders (no formal assignment row)
    for (const wid of orderWarehouseIds) {
      if (seenWarehouses.has(wid)) continue;
      seenWarehouses.add(wid);
      const whDetails = extraWarehouseDetails[wid] ?? {};
      enriched.push({
        id: null,
        warehouse_id: wid,
        city: (whDetails as any).location?.city ?? (whDetails as any).location?.address ?? null,
        is_primary: false,
        warehouses: whDetails,
        orders: ordersByWarehouse.get(wid) ?? [],
        source: "order",
      });
    }

    return { assignments: enriched };
  });
