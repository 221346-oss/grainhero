/**
 * Phase 19 — Insurance domain server functions.
 * Carriers/products managed by super-admin. Policies bound by tenant admins
 * against batches/shipments/hardware. Claims lifecycle:
 *   draft → submitted → under_review → approved|rejected → paid.
 * All copy/config remains driven from marketplace-settings (no hardcoding).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function assertSuperAdmin(ctx: { supabase: unknown; userId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (ctx.supabase as any).rpc("is_super_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden");
}

async function tenantAdminId(ctx: { supabase: unknown; userId: string }): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (ctx.supabase as any).rpc("get_tenant_admin_id", { _user_id: ctx.userId });
  return (data as string) ?? ctx.userId;
}

// Insert an audit-log row. Best-effort; never throws.
async function audit(
  ctx: { supabase: unknown; userId: string },
  entry: {
    action: string;
    subject_type?: string;
    subject_id?: string | null;
    admin_id?: string | null;
    carrier_id?: string | null;
    policy_id?: string | null;
    claim_id?: string | null;
    payload?: Record<string, unknown>;
  },
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (ctx.supabase as any).from("insurance_audit_log").insert({
      actor_id: ctx.userId,
      admin_id: entry.admin_id ?? null,
      action: entry.action,
      subject_type: entry.subject_type ?? null,
      subject_id: entry.subject_id ?? null,
      carrier_id: entry.carrier_id ?? null,
      policy_id: entry.policy_id ?? null,
      claim_id: entry.claim_id ?? null,
      payload: entry.payload ?? {},
      source: "app",
    });
  } catch (e) {
    console.warn("[insurance-audit] insert failed", e);
  }
}

/* -------------------- Carriers -------------------- */

export const listCarriers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any)
      .from("insurance_carriers").select("*").order("name");
    return { carriers: (data ?? []) as Row[] };
  });

export const upsertCarrier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(160),
    contact_email: z.string().email().optional().nullable(),
    contact_phone: z.string().max(60).optional().nullable(),
    api_mode: z.enum(["manual","webhook"]).default("manual"),
    logo_url: z.string().url().optional().nullable(),
    active: z.boolean().default(true),
    notes: z.string().max(2000).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any).from("insurance_carriers");
    if (data.id) {
      const { error } = await sb.update(data).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb.insert(data).select("id").single();
    if (error) throw error;
    return { id: (row as Row).id as string };
  });

export const deleteCarrier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).from("insurance_carriers").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* -------------------- Products -------------------- */

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (context.supabase as any)
      .from("insurance_products")
      .select("*, carrier:insurance_carriers(id,name,logo_url)")
      .order("name");
    return { products: (data ?? []) as Row[] };
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    id: z.string().uuid().optional(),
    carrier_id: z.string().uuid(),
    code: z.string().min(1).max(40),
    name: z.string().min(1).max(160),
    coverage_type: z.enum(["batch","shipment","hardware"]),
    base_premium_bps: z.number().int().min(0).max(10000).default(100),
    deductible_bps: z.number().int().min(0).max(10000).default(0),
    max_payout_cents: z.number().int().nonnegative().nullable().optional(),
    currency: z.string().length(3).default("USD"),
    terms_url: z.string().url().nullable().optional(),
    active: z.boolean().default(true),
    description: z.string().max(2000).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any).from("insurance_products");
    if (data.id) {
      const { error } = await sb.update(data).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await sb.insert(data).select("id").single();
    if (error) throw error;
    return { id: (row as Row).id as string };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).from("insurance_products").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* -------------------- Policies -------------------- */

export const listPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ scope: z.enum(["mine","all"]).default("mine") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    let q = sb.from("insurance_policies")
      .select("*, product:insurance_products(id,name,coverage_type,currency, carrier:insurance_carriers(name))")
      .order("created_at", { ascending: false }).limit(500);
    if (data.scope === "mine") {
      const t = await tenantAdminId(context);
      q = q.eq("admin_id", t);
    }
    const { data: rows } = await q;
    return { policies: (rows ?? []) as Row[] };
  });

export const bindPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    product_id: z.string().uuid(),
    subject_type: z.enum(["batch","shipment","hardware_order"]),
    subject_id: z.string().uuid(),
    coverage_start: z.string(),
    coverage_end: z.string(),
    premium_cents: z.number().int().nonnegative(),
    currency: z.string().length(3).default("USD"),
    external_ref: z.string().max(120).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await tenantAdminId(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    const { data: row, error } = await sb.from("insurance_policies").insert({
      admin_id: admin,
      created_by: context.userId,
      product_id: data.product_id,
      subject_type: data.subject_type,
      subject_id: data.subject_id,
      coverage_start: data.coverage_start,
      coverage_end: data.coverage_end,
      start_date: data.coverage_start,
      end_date: data.coverage_end,
      premium_cents: data.premium_cents,
      premium_amount: data.premium_cents / 100,
      currency: data.currency,
      status: "active",
      external_ref: data.external_ref ?? null,
      notes: data.notes ?? null,
    }).select("id").single();
    if (error) throw error;
    const id = (row as Row).id as string;
    await audit(context, { action: "policy.bind", subject_type: "policy", subject_id: id, admin_id: admin, policy_id: id, payload: { product_id: data.product_id, subject_type: data.subject_type, subject_id: data.subject_id, premium_cents: data.premium_cents } });
    return { id };
  });

export const cancelPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from("insurance_policies").update({ status: "cancelled" }).eq("id", data.id);
    if (error) throw error;
    await audit(context, { action: "policy.cancel", subject_type: "policy", subject_id: data.id, policy_id: data.id });
    return { ok: true };
  });

export const renewPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    id: z.string().uuid(),
    new_end_date: z.string(),
    premium_cents: z.number().int().nonnegative().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    const patch: Row = { coverage_end: data.new_end_date, end_date: data.new_end_date, status: "active" };
    if (data.premium_cents != null) {
      patch.premium_cents = data.premium_cents;
      patch.premium_amount = data.premium_cents / 100;
    }
    const { error } = await sb.from("insurance_policies").update(patch).eq("id", data.id);
    if (error) throw error;
    await audit(context, { action: "policy.renew", subject_type: "policy", subject_id: data.id, policy_id: data.id, payload: { new_end_date: data.new_end_date, premium_cents: data.premium_cents ?? null } });
    return { ok: true };
  });

/* -------------------- Claims -------------------- */

export const listClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    scope: z.enum(["mine","queue"]).default("mine"),
    status: z.string().optional(),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    let q = sb.from("insurance_claims")
      .select("*, policy:insurance_policies(id,subject_type,subject_id, product:insurance_products(name,coverage_type, carrier:insurance_carriers(name)))")
      .order("created_at", { ascending: false }).limit(500);
    if (data.scope === "mine") {
      const t = await tenantAdminId(context);
      q = q.eq("admin_id", t);
    }
    if (data.status) q = q.eq("status", data.status);
    const { data: rows } = await q;
    return { claims: (rows ?? []) as Row[] };
  });

export const openClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    policy_id: z.string().uuid(),
    claim_type: z.enum(["spoilage","transit_damage","theft","quality_failure","hardware_loss","other"]),
    incident_at: z.string().optional(),
    loss_amount_cents: z.number().int().nonnegative(),
    requested_payout_cents: z.number().int().nonnegative(),
    currency: z.string().length(3).default("USD"),
    narrative: z.string().max(4000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const admin = await tenantAdminId(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    const { data: row, error } = await sb.from("insurance_claims").insert({
      admin_id: admin,
      created_by: context.userId,
      opened_by: context.userId,
      policy_id: data.policy_id,
      claim_type: data.claim_type,
      incident_at: data.incident_at ?? new Date().toISOString(),
      incident_date: (data.incident_at ?? new Date().toISOString()).slice(0,10),
      filed_date: new Date().toISOString().slice(0,10),
      loss_amount_cents: data.loss_amount_cents,
      requested_payout_cents: data.requested_payout_cents,
      amount_claimed: data.requested_payout_cents / 100,
      currency: data.currency,
      narrative: data.narrative ?? null,
      description: data.narrative ?? "",
      status: "submitted",
    }).select("id").single();
    if (error) throw error;
    const claimId = (row as Row).id as string;
    await sb.from("insurance_claim_events").insert({
      claim_id: claimId, actor_id: context.userId, event_type: "submitted",
      payload: { loss_amount_cents: data.loss_amount_cents },
    });
    await audit(context, { action: "claim.open", subject_type: "claim", subject_id: claimId, admin_id: admin, claim_id: claimId, policy_id: data.policy_id, payload: { claim_type: data.claim_type, requested_payout_cents: data.requested_payout_cents } });
    return { id: claimId };
  });

export const addClaimEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    claim_id: z.string().uuid(),
    file_path: z.string().min(1),
    mime: z.string().optional().nullable(),
    size_bytes: z.number().int().nonnegative().optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    const { data: row, error } = await sb.from("insurance_claim_attachments").insert({
      claim_id: data.claim_id, file_path: data.file_path,
      mime: data.mime ?? null, size_bytes: data.size_bytes ?? null,
      uploaded_by: context.userId,
    }).select("id").single();
    if (error) throw error;
    await sb.from("insurance_claim_events").insert({
      claim_id: data.claim_id, actor_id: context.userId,
      event_type: "evidence_added", payload: { file_path: data.file_path },
    });
    return { id: (row as Row).id as string };
  });

export const moderateClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    id: z.string().uuid(),
    decision: z.enum(["under_review","approved","rejected","paid","cancelled"]),
    approved_payout_cents: z.number().int().nonnegative().optional(),
    decision_reason: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    const patch: Row = { status: data.decision };
    if (data.decision === "approved" || data.decision === "rejected") {
      patch.decided_at = new Date().toISOString();
      patch.approved_date = new Date().toISOString().slice(0,10);
    }
    if (data.decision === "approved" && data.approved_payout_cents != null) {
      patch.approved_payout_cents = data.approved_payout_cents;
      patch.amount_approved = data.approved_payout_cents / 100;
    }
    if (data.decision === "paid") {
      patch.paid_at = new Date().toISOString();
    }
    if (data.decision_reason) patch.decision_reason = data.decision_reason;
    const { error } = await sb.from("insurance_claims").update(patch).eq("id", data.id);
    if (error) throw error;
    await sb.from("insurance_claim_events").insert({
      claim_id: data.id, actor_id: context.userId,
      event_type: `decision_${data.decision}`,
      payload: { approved_payout_cents: data.approved_payout_cents ?? null, reason: data.decision_reason ?? null },
    });
    await audit(context, { action: `claim.${data.decision}`, subject_type: "claim", subject_id: data.id, claim_id: data.id, payload: { approved_payout_cents: data.approved_payout_cents ?? null, reason: data.decision_reason ?? null } });
    return { ok: true };
  });

export const getClaimTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ claim_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    const [claim, events, attachments] = await Promise.all([
      sb.from("insurance_claims")
        .select("*, policy:insurance_policies(id, subject_type, subject_id, admin_id, product:insurance_products(name, currency, carrier:insurance_carriers(name)))")
        .eq("id", data.claim_id).maybeSingle(),
      sb.from("insurance_claim_events").select("*").eq("claim_id", data.claim_id).order("created_at", { ascending: true }),
      sb.from("insurance_claim_attachments").select("*").eq("claim_id", data.claim_id).order("created_at", { ascending: false }),
    ]);
    return {
      claim: (claim.data ?? null) as Row | null,
      events: (events.data ?? []) as Row[],
      attachments: (attachments.data ?? []) as Row[],
    };
  });

export const getInsuranceKpis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = (context.supabase as any);
    const [policies, claims] = await Promise.all([
      sb.from("insurance_policies").select("status, premium_cents, currency").limit(5000),
      sb.from("insurance_claims").select("status, requested_payout_cents, approved_payout_cents, decided_at, created_at, currency").limit(5000),
    ]);
    const p = (policies.data ?? []) as Row[];
    const c = (claims.data ?? []) as Row[];
    const active = p.filter((x) => x.status === "active").length;
    const openClaims = c.filter((x) => ["submitted","under_review"].includes(x.status)).length;
    const paidClaims = c.filter((x) => x.status === "paid");
    const totalPayout = paidClaims.reduce((s, x) => s + Number(x.approved_payout_cents ?? 0), 0) / 100;
    const totalPremium = p.reduce((s, x) => s + Number(x.premium_cents ?? 0), 0) / 100;
    const lossRatio = totalPremium > 0 ? (totalPayout / totalPremium) * 100 : 0;
    const decided = c.filter((x) => x.decided_at);
    const avgHours = decided.length
      ? decided.reduce((s, x) => s + (new Date(x.decided_at).getTime() - new Date(x.created_at).getTime()) / 3_600_000, 0) / decided.length
      : 0;
    return {
      activePolicies: active,
      openClaims,
      totalPayout,
      totalPremium,
      lossRatioPct: Math.round(lossRatio * 10) / 10,
      avgDecisionHours: Math.round(avgHours * 10) / 10,
      currency: (p[0]?.currency as string) ?? "USD",
    };
  });
