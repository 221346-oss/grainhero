import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";

async function roleFlags(supabase: any, userId: string) {
  const r = await getEffectiveRole(supabase, userId);
  return {
    role: r,
    isSuper: r === "super_admin",
    isAdmin: r === "admin",
    isManager: r === "manager",
  };
}

// ============= TEAM MANAGEMENT =============

export const listTeamMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: adminRow } = await context.supabase
      .from("profiles")
      .select("admin_id, id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantId = adminRow?.admin_id ?? adminRow?.id ?? context.userId;

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, name, email, phone, avatar, status, blocked, email_verified, department, employee_id, created_at, warehouse_id")
      .or(`admin_id.eq.${tenantId},id.eq.${tenantId}`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) return [];
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .in("user_id", ids);
    const roleMap = new Map<string, string>();
    const order = ["super_admin", "admin", "manager", "technician", "pending"];
    for (const r of roles ?? []) {
      const cur = roleMap.get(r.user_id);
      if (!cur || order.indexOf(r.role) < order.indexOf(cur)) roleMap.set(r.user_id, r.role);
    }
    return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "pending" }));
  });

export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; name?: string; role: "admin" | "manager" | "technician" }) => d)
  .handler(async ({ data, context }) => {
    const { isSuper, isAdmin, isManager } = await roleFlags(context.supabase, context.userId);
    if (!isSuper && !isAdmin && !isManager) throw new Error("Forbidden");
    if (isManager && !isAdmin && !isSuper && data.role !== "technician") throw new Error("Managers can only invite technicians");
    if (isAdmin && !isSuper && data.role === "admin") throw new Error("Only super admins can invite admins");

    const tenantId = context.userId;
    const { data: tenantRow } = await context.supabase
      .from("profiles").select("admin_id, id").eq("id", context.userId).maybeSingle();
    const admin_id = tenantRow?.admin_id ?? tenantRow?.id ?? tenantId;

    // Enforce plan-based staff limit (admin's active subscription)
    if (!isSuper) {
      const { supabaseAdmin: sa } = await import("@/integrations/supabase/client.server");
      const { data: sub } = await sa
        .from("subscriptions")
        .select("max_users, status")
        .eq("admin_id", admin_id)
        .in("status", ["active", "trial"] as never)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!sub) throw new Error("No active subscription. Purchase a plan first to invite staff.");
      const maxUsers = Number((sub as { max_users?: number }).max_users ?? 0);
      const { count } = await sa
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .or(`admin_id.eq.${admin_id},id.eq.${admin_id}`);
      const current = count ?? 1;
      if (maxUsers > 0 && current >= maxUsers) {
        throw new Error(`Staff limit reached (${current}/${maxUsers}). Upgrade your plan to add more members.`);
      }
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invited, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email.trim().toLowerCase(), {
      data: { name: data.name ?? "", invited_role: data.role, admin_id },
    });
    if (error) throw new Error(error.message);
    const uid = invited.user?.id;
    if (uid) {
      await supabaseAdmin.from("profiles").upsert({ id: uid, email: data.email.trim().toLowerCase(), name: data.name ?? data.email.split("@")[0], admin_id, invited_by: context.userId, invitation_role: data.role }, { onConflict: "id" });
      await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: data.role }, { onConflict: "user_id,role" });
    }
    return { ok: true };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; name?: string; phone?: string; role?: "admin" | "manager" | "technician" | "pending"; blocked?: boolean }) => d)
  .handler(async ({ data, context }) => {
    const { isSuper, isAdmin, isManager } = await roleFlags(context.supabase, context.userId);
    if (!isSuper && !isAdmin && !isManager) throw new Error("Forbidden");

    const update: Record<string, any> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.blocked !== undefined) update.blocked = data.blocked;
    if (Object.keys(update).length) {
      const { error } = await context.supabase.from("profiles").update(update as any).eq("id", data.id);
      if (error) throw error;
    }
    if (data.role) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("user_roles").delete().eq("user_id", data.id);
      await supabaseAdmin.from("user_roles").insert({ user_id: data.id, role: data.role });
    }
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { isSuper, isAdmin } = await roleFlags(context.supabase, context.userId);
    if (!isSuper && !isAdmin) throw new Error("Forbidden");
    if (data.id === context.userId) throw new Error("You cannot remove yourself");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============= SETTINGS / PROFILE =============

export const getMySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("id, name, email, phone, avatar, business_type, address, location, preferences, department, employee_id, shift_pattern, certification_level")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateMySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name?: string; phone?: string; business_type?: string; avatar?: string | null;
    address?: Record<string, unknown>; location?: Record<string, unknown>;
    preferences?: Record<string, unknown>;
  }) => d)
  .handler(async ({ data, context }) => {
    const update: Record<string, any> = {};
    for (const k of ["name","phone","business_type","avatar","address","location","preferences"] as const) {
      if (data[k] !== undefined) update[k] = data[k];
    }
    const { error } = await context.supabase.from("profiles").update(update as any).eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ============= INSURANCE =============

export type InsurancePolicyRow = {
  id: string; policy_number: string; provider_name: string; coverage_type: string;
  coverage_amount: number; premium_amount: number; deductible: number; status: string;
  start_date: string | null; end_date: string | null; renewal_date: string | null;
  covered_batches: any; risk_factors: any; notes: string | null; created_at: string;
};

export type InsuranceClaimRow = {
  id: string; claim_number: string; policy_id: string | null; claim_type: string;
  description: string | null; amount_claimed: number; amount_approved: number; status: string;
  incident_date: string | null; filed_date: string | null; approved_date: string | null;
  batch_affected: any; photos: any; notes: string | null; created_at: string;
};

async function tenantAdminId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase.from("profiles").select("admin_id, id").eq("id", userId).maybeSingle();
  return data?.admin_id ?? data?.id ?? userId;
}

export const listPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("insurance_policies").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as InsurancePolicyRow[];
  });

export const upsertPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<InsurancePolicyRow> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const admin_id = await tenantAdminId(context.supabase, context.userId);
    const row: any = {
      policy_number: data.policy_number ?? `POL-${Date.now()}`,
      provider_name: data.provider_name ?? "",
      coverage_type: data.coverage_type ?? "comprehensive",
      coverage_amount: Number(data.coverage_amount ?? 0),
      premium_amount: Number(data.premium_amount ?? 0),
      deductible: Number(data.deductible ?? 0),
      status: data.status ?? "active",
      start_date: data.start_date ?? null,
      end_date: data.end_date ?? null,
      renewal_date: data.renewal_date ?? null,
      covered_batches: data.covered_batches ?? [],
      risk_factors: data.risk_factors ?? {},
      notes: data.notes ?? null,
      admin_id,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("insurance_policies").update(row).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("insurance_policies").insert(row).select("id").single();
    if (error) throw error;
    return { id: ins.id };
  });

export const deletePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("insurance_policies").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("insurance_claims").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as InsuranceClaimRow[];
  });

export const upsertClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Partial<InsuranceClaimRow> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    const admin_id = await tenantAdminId(context.supabase, context.userId);
    const row: any = {
      claim_number: data.claim_number ?? `CLM-${Date.now()}`,
      policy_id: data.policy_id ?? null,
      claim_type: data.claim_type ?? "spoilage",
      description: data.description ?? null,
      amount_claimed: Number(data.amount_claimed ?? 0),
      amount_approved: Number(data.amount_approved ?? 0),
      status: data.status ?? "filed",
      incident_date: data.incident_date ?? null,
      filed_date: data.filed_date ?? new Date().toISOString().slice(0, 10),
      approved_date: data.approved_date ?? null,
      batch_affected: data.batch_affected ?? {},
      photos: data.photos ?? [],
      notes: data.notes ?? null,
      admin_id,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("insurance_claims").update(row).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase.from("insurance_claims").insert(row).select("id").single();
    if (error) throw error;
    return { id: ins.id };
  });

export const deleteClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("insurance_claims").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });