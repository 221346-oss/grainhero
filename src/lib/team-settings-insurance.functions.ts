import { createServerFn } from "@tanstack/react-start";
import { randomInt } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";
import { assertPlanAllows } from "@/lib/plan-gate";

// Excludes visually ambiguous characters (0/O, 1/I/L).
const INVITE_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function generateInvitationCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++)
    out += INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)];
  return out;
}

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
      .select(
        "id, name, email, phone, avatar, status, blocked, email_verified, department, employee_id, created_at, warehouse_id",
      )
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
  .validator((d: { email: string; name?: string; role: "admin" | "manager" | "technician" }) => d)
  .handler(async ({ data, context }) => {
    console.log(
      "[inviteTeamMember] Starting invite for",
      data.email,
      "as",
      data.role,
      "from user",
      context.userId,
    );
    const { isSuper, isAdmin, isManager } = await roleFlags(context.supabase, context.userId);
    console.log("[inviteTeamMember] Role flags:", { isSuper, isAdmin, isManager });
    if (!isSuper && !isAdmin && !isManager) throw new Error("Forbidden");
    if (isManager && !isAdmin && !isSuper && data.role !== "technician")
      throw new Error("Managers can only invite technicians");
    if (isAdmin && !isSuper && data.role === "admin")
      throw new Error("Only super admins can invite admins");

    // Get the tenant admin ID - for managers/technicians, this is their admin's ID
    // For admins, this is their own ID
    const { data: tenantRow } = await context.supabase
      .from("profiles")
      .select("admin_id, id")
      .eq("id", context.userId)
      .maybeSingle();

    const admin_id = tenantRow?.admin_id ?? tenantRow?.id ?? context.userId;

    console.log(
      "[inviteTeamMember] Tenant resolution - userId:",
      context.userId,
      "tenantRow:",
      tenantRow,
      "resolved admin_id:",
      admin_id,
    );

    // Enforce plan-based staff limit via central gate.
    await assertPlanAllows({ feature: "max_users", sb: context.supabase, userId: context.userId });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = data.email.trim().toLowerCase();
    let uid: string | undefined;
    console.log("[inviteTeamMember] Creating auth user for email:", email);
    // 1) Ensure an auth user exists. Prefer createUser (doesn't require SMTP);
    //    fall back to locating an existing user if the email is already registered.
    const createRes = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: { name: data.name ?? "", invited_role: data.role, admin_id },
    });
    if (createRes.error) {
      const msg = createRes.error.message || (createRes.error as { code?: string }).code || "";
      const already = /already|registered|exists|duplicate/i.test(msg);
      if (!already) {
        console.error("[inviteTeamMember] createUser failed", createRes.error);
        throw new Error(msg || "Could not create the user in Supabase Auth.");
      }
      console.log("[inviteTeamMember] User already exists, looking up...");
      const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      if (listErr) throw new Error(listErr.message || "Failed to look up existing user");
      uid = existing?.users?.find((u) => (u.email ?? "").toLowerCase() === email)?.id;
      if (!uid) throw new Error("A user with that email already exists but could not be located.");
    } else {
      uid = createRes.data.user?.id;
      console.log("[inviteTeamMember] Auth user created successfully, uid:", uid);
    }

    // 2) Generate a one-time invitation code. Replaces the old Supabase magic-link
    //    invite, which the Flutter technician app can't open (no deep-link handling
    //    set up) — a code works identically for the web (manager) and app (technician)
    //    acceptance flows via /api/public/v1/auth/validate-invitation + accept-invite.
    const invitationCode = generateInvitationCode();
    const invitationExpires = new Date(Date.now() + INVITE_CODE_TTL_MS).toISOString();
    const acceptUrl = `https://grainheroo.lovable.app/auth/accept-invite?email=${encodeURIComponent(email)}`;

    // 3) Send the invitation email via Resend (already configured in this project).
    try {
      const { sendEmailViaResend } = await import("@/lib/resend.server");
      const cta =
        data.role === "technician"
          ? `<p>Open the GrainHero app and enter this code to finish setting up your account.</p>`
          : `<p>Enter this code at <a href="${acceptUrl}">${acceptUrl}</a> to finish setting up your account.</p>`;
      await sendEmailViaResend({
        to: email,
        subject: `You've been invited to GrainHero as ${data.role}`,
        html: `<div style="font-family:Inter,Arial,sans-serif;color:#0f172a;max-width:520px;margin:auto">
          <h2 style="color:#065f46">You're invited to GrainHero</h2>
          <p>Hi ${data.name ?? "there"}, you've been added to a GrainHero tenant as <strong>${data.role}</strong>.</p>
          <p style="font-size:28px;font-weight:700;letter-spacing:6px;background:#f1f5f9;padding:14px 20px;border-radius:8px;display:inline-block;font-family:monospace">${invitationCode}</p>
          ${cta}
          <p style="color:#64748b;font-size:12px">This code expires in 7 days.</p>
          <p style="color:#64748b;font-size:12px;margin-top:24px">If you didn't expect this, you can ignore this email.</p>
        </div>`,
      });
    } catch (e) {
      console.warn("[inviteTeamMember] email send failed (non-fatal)", e);
    }
    if (uid) {
      console.log("[inviteTeamMember] Upserting profile for uid:", uid, "with admin_id:", admin_id);
      const { error: pErr } = await supabaseAdmin.from("profiles").upsert(
        {
          id: uid,
          email,
          name: data.name ?? email.split("@")[0],
          admin_id,
          invited_by: context.userId,
          invitation_role: data.role,
          invitation_token: invitationCode,
          invitation_expires: invitationExpires,
        },
        { onConflict: "id" },
      );
      if (pErr) {
        console.error("[inviteTeamMember] profiles upsert failed", pErr);
        throw new Error(pErr.message || "Failed to save profile");
      }
      console.log("[inviteTeamMember] Profile upserted successfully");

      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: uid, role: data.role });
      if (rErr) {
        console.error("[inviteTeamMember] user_roles insert failed", rErr);
        throw new Error(rErr.message || "Failed to assign role");
      }
      console.log("[inviteTeamMember] User role assigned successfully");
    }
    console.log("[inviteTeamMember] Invite completed successfully");
    return { ok: true };
  });

export const updateTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      id: string;
      name?: string;
      phone?: string;
      role?: "admin" | "manager" | "technician" | "pending";
      blocked?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { isSuper, isAdmin, isManager } = await roleFlags(context.supabase, context.userId);
    if (!isSuper && !isAdmin && !isManager) throw new Error("Forbidden");

    const update: Record<string, any> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.blocked !== undefined) update.blocked = data.blocked;
    if (Object.keys(update).length) {
      const { error } = await context.supabase
        .from("profiles")
        .update(update as any)
        .eq("id", data.id);
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
  .validator((d: { id: string }) => d)
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
      .select(
        "id, name, email, phone, avatar, business_type, address, location, preferences, department, employee_id, shift_pattern, certification_level",
      )
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return data;
  });

export const updateMySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      name?: string;
      phone?: string;
      business_type?: string;
      avatar?: string | null;
      address?: Record<string, unknown>;
      location?: Record<string, unknown>;
      preferences?: Record<string, unknown>;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const update: Record<string, any> = {};
    for (const k of [
      "name",
      "phone",
      "business_type",
      "avatar",
      "address",
      "location",
      "preferences",
    ] as const) {
      if (data[k] !== undefined) update[k] = data[k];
    }
    const { error } = await context.supabase
      .from("profiles")
      .update(update as any)
      .eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// ============= INSURANCE =============

export type InsurancePolicyRow = {
  id: string;
  policy_number: string;
  provider_name: string;
  coverage_type: string;
  coverage_amount: number;
  premium_amount: number;
  deductible: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  covered_batches: any;
  risk_factors: any;
  notes: string | null;
  created_at: string;
};

export type InsuranceClaimRow = {
  id: string;
  claim_number: string;
  policy_id: string | null;
  claim_type: string;
  description: string | null;
  amount_claimed: number;
  amount_approved: number;
  status: string;
  incident_date: string | null;
  filed_date: string | null;
  approved_date: string | null;
  batch_affected: any;
  photos: any;
  notes: string | null;
  created_at: string;
};

async function tenantAdminId(supabase: any, userId: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("admin_id, id")
    .eq("id", userId)
    .maybeSingle();
  return data?.admin_id ?? data?.id ?? userId;
}

export const listPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("insurance_policies")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as InsurancePolicyRow[];
  });

export const upsertPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: Partial<InsurancePolicyRow> & { id?: string }) => d)
  .handler(async ({ data, context }) => {
    if (!data.id) {
      await assertPlanAllows({
        feature: "insurance",
        sb: context.supabase,
        userId: context.userId,
      });
    }
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
      const { error } = await context.supabase
        .from("insurance_policies")
        .update(row)
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("insurance_policies")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return { id: ins.id };
  });

export const deletePolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("insurance_policies").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("insurance_claims")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as InsuranceClaimRow[];
  });

export const upsertClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: Partial<InsuranceClaimRow> & { id?: string }) => d)
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
      const { error } = await context.supabase
        .from("insurance_claims")
        .update(row)
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("insurance_claims")
      .insert(row)
      .select("id")
      .single();
    if (error) throw error;
    return { id: ins.id };
  });

export const deleteClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("insurance_claims").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
