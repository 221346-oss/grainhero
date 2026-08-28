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

type Row = Record<string, any>;

async function assertSuperAdmin(ctx: { supabase: unknown; userId: string }) {
  const { data } = await (ctx.supabase as any).rpc("is_super_admin", { _user_id: ctx.userId });
  if (!data) throw new Error("Forbidden");
}

async function tenantAdminId(ctx: { supabase: unknown; userId: string }): Promise<string> {
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
    const { data } = await (context.supabase as any)
      .from("insurance_carriers")
      .select("*")
      .order("name");
    return { carriers: (data ?? []) as Row[] };
  });

export const upsertCarrier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(160),
        contact_email: z.string().email().optional().nullable(),
        contact_phone: z.string().max(60).optional().nullable(),
        api_mode: z.enum(["manual", "webhook"]).default("manual"),
        logo_url: z.string().url().optional().nullable(),
        active: z.boolean().default(true),
        notes: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

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

    const { error } = await (context.supabase as any)
      .from("insurance_carriers")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* -------------------- Products -------------------- */

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (context.supabase as any)
      .from("insurance_products")
      .select("*, carrier:insurance_carriers(id,name,logo_url)")
      .order("name");
    return { products: (data ?? []) as Row[] };
  });

export const upsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        id: z.string().uuid().optional(),
        carrier_id: z.string().uuid(),
        code: z.string().min(1).max(40),
        name: z.string().min(1).max(160),
        coverage_type: z.enum(["batch", "shipment", "hardware"]),
        base_premium_bps: z.number().int().min(0).max(10000).default(100),
        deductible_bps: z.number().int().min(0).max(10000).default(0),
        max_payout_cents: z.number().int().nonnegative().nullable().optional(),
        currency: z.string().length(3).default("USD"),
        terms_url: z.string().url().nullable().optional(),
        active: z.boolean().default(true),
        description: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

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

    const { error } = await (context.supabase as any)
      .from("insurance_products")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

/* -------------------- Policies -------------------- */

export const listPolicies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ scope: z.enum(["mine", "all"]).default("mine") }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb
      .from("insurance_policies")
      .select(
        "*, product:insurance_products(id,name,coverage_type,currency, carrier:insurance_carriers(name))",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.scope === "mine") {
      const t = await tenantAdminId(context);
      q = q.eq("admin_id", t);
    }
    const { data: rows } = await q;
    return { policies: (rows ?? []) as Row[] };
  });

export const bindPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        product_id: z.string().uuid(),
        subject_type: z.enum(["batch", "shipment", "hardware_order"]),
        subject_id: z.string().uuid(),
        coverage_start: z.string(),
        coverage_end: z.string(),
        premium_cents: z.number().int().nonnegative(),
        currency: z.string().length(3).default("USD"),
        external_ref: z.string().max(120).nullable().optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await tenantAdminId(context);

    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("insurance_policies")
      .insert({
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
      })
      .select("id")
      .single();
    if (error) throw error;
    const id = (row as Row).id as string;
    await audit(context, {
      action: "policy.bind",
      subject_type: "policy",
      subject_id: id,
      admin_id: admin,
      policy_id: id,
      payload: {
        product_id: data.product_id,
        subject_type: data.subject_type,
        subject_id: data.subject_id,
        premium_cents: data.premium_cents,
      },
    });
    return { id };
  });

export const cancelPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any)
      .from("insurance_policies")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw error;
    await audit(context, {
      action: "policy.cancel",
      subject_type: "policy",
      subject_id: data.id,
      policy_id: data.id,
    });
    return { ok: true };
  });

export const renewPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        id: z.string().uuid(),
        new_end_date: z.string(),
        premium_cents: z.number().int().nonnegative().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const patch: Row = {
      coverage_end: data.new_end_date,
      end_date: data.new_end_date,
      status: "active",
    };
    if (data.premium_cents != null) {
      patch.premium_cents = data.premium_cents;
      patch.premium_amount = data.premium_cents / 100;
    }
    const { error } = await sb.from("insurance_policies").update(patch).eq("id", data.id);
    if (error) throw error;
    await audit(context, {
      action: "policy.renew",
      subject_type: "policy",
      subject_id: data.id,
      policy_id: data.id,
      payload: { new_end_date: data.new_end_date, premium_cents: data.premium_cents ?? null },
    });
    return { ok: true };
  });

/* -------------------- Claims -------------------- */

export const listClaims = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        scope: z.enum(["mine", "queue"]).default("mine"),
        status: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb
      .from("insurance_claims")
      .select(
        "*, policy:insurance_policies(id,subject_type,subject_id, product:insurance_products(name,coverage_type, carrier:insurance_carriers(name)))",
      )
      .order("created_at", { ascending: false })
      .limit(500);
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
  .validator((d) =>
    z
      .object({
        policy_id: z.string().uuid(),
        claim_type: z.enum([
          "spoilage",
          "transit_damage",
          "theft",
          "quality_failure",
          "hardware_loss",
          "other",
        ]),
        incident_at: z.string().optional(),
        loss_amount_cents: z.number().int().nonnegative(),
        requested_payout_cents: z.number().int().nonnegative(),
        currency: z.string().length(3).default("USD"),
        narrative: z.string().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const admin = await tenantAdminId(context);

    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("insurance_claims")
      .insert({
        admin_id: admin,
        created_by: context.userId,
        opened_by: context.userId,
        policy_id: data.policy_id,
        claim_type: data.claim_type,
        incident_at: data.incident_at ?? new Date().toISOString(),
        incident_date: (data.incident_at ?? new Date().toISOString()).slice(0, 10),
        filed_date: new Date().toISOString().slice(0, 10),
        loss_amount_cents: data.loss_amount_cents,
        requested_payout_cents: data.requested_payout_cents,
        amount_claimed: data.requested_payout_cents / 100,
        currency: data.currency,
        narrative: data.narrative ?? null,
        description: data.narrative ?? "",
        status: "submitted",
      })
      .select("id")
      .single();
    if (error) throw error;
    const claimId = (row as Row).id as string;
    await sb.from("insurance_claim_events").insert({
      claim_id: claimId,
      actor_id: context.userId,
      event_type: "submitted",
      payload: { loss_amount_cents: data.loss_amount_cents },
    });
    await audit(context, {
      action: "claim.open",
      subject_type: "claim",
      subject_id: claimId,
      admin_id: admin,
      claim_id: claimId,
      policy_id: data.policy_id,
      payload: { claim_type: data.claim_type, requested_payout_cents: data.requested_payout_cents },
    });
    return { id: claimId };
  });

export const addClaimEvidence = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        claim_id: z.string().uuid(),
        file_path: z.string().min(1),
        mime: z.string().optional().nullable(),
        size_bytes: z.number().int().nonnegative().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb
      .from("insurance_claim_attachments")
      .insert({
        claim_id: data.claim_id,
        file_path: data.file_path,
        mime: data.mime ?? null,
        size_bytes: data.size_bytes ?? null,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    await sb.from("insurance_claim_events").insert({
      claim_id: data.claim_id,
      actor_id: context.userId,
      event_type: "evidence_added",
      payload: { file_path: data.file_path },
    });
    return { id: (row as Row).id as string };
  });

export const moderateClaim = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["under_review", "approved", "rejected", "paid", "cancelled"]),
        approved_payout_cents: z.number().int().nonnegative().optional(),
        decision_reason: z.string().max(2000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const sb = context.supabase as any;
    const patch: Row = { status: data.decision };
    if (data.decision === "approved" || data.decision === "rejected") {
      patch.decided_at = new Date().toISOString();
      patch.approved_date = new Date().toISOString().slice(0, 10);
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
      claim_id: data.id,
      actor_id: context.userId,
      event_type: `decision_${data.decision}`,
      payload: {
        approved_payout_cents: data.approved_payout_cents ?? null,
        reason: data.decision_reason ?? null,
      },
    });
    await audit(context, {
      action: `claim.${data.decision}`,
      subject_type: "claim",
      subject_id: data.id,
      claim_id: data.id,
      payload: {
        approved_payout_cents: data.approved_payout_cents ?? null,
        reason: data.decision_reason ?? null,
      },
    });
    // Fan-out notifications to tenant + super-admins.
    try {
      const { data: cl } = await sb
        .from("insurance_claims")
        .select("admin_id")
        .eq("id", data.id)
        .maybeSingle();
      const { emitBulk, emitToSuperAdmins } = await import("@/lib/notify");
      if (cl?.admin_id) {
        await emitBulk(sb, [cl.admin_id as string], {
          tenantAdminId: cl.admin_id as string,
          category: "insurance" as never,
          severity:
            data.decision === "rejected"
              ? "warning"
              : data.decision === "approved" || data.decision === "paid"
                ? "success"
                : "info",
          title: `Claim ${data.decision}`,
          body: data.decision_reason ?? `Insurance claim moved to ${data.decision}.`,
          link: `/insurance-claims/${data.id}`,
          entityType: "insurance_claim",
          entityId: data.id,
        });
      }
      await emitToSuperAdmins(sb, {
        category: "insurance" as never,
        severity: "info",
        title: `Claim ${data.decision}`,
        body: `Claim ${data.id.slice(0, 8)} moved to ${data.decision}.`,
        link: `/platform/insurance/claims/${data.id}`,
        entityType: "insurance_claim",
        entityId: data.id,
      });
    } catch (e) {
      console.warn("[insurance] notify moderate failed", (e as Error).message);
    }
    return { ok: true };
  });

export const getClaimTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ claim_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [claim, events, attachments] = await Promise.all([
      sb
        .from("insurance_claims")
        .select(
          "*, policy:insurance_policies(id, subject_type, subject_id, admin_id, product:insurance_products(name, currency, carrier:insurance_carriers(name)))",
        )
        .eq("id", data.claim_id)
        .maybeSingle(),
      sb
        .from("insurance_claim_events")
        .select("*")
        .eq("claim_id", data.claim_id)
        .order("created_at", { ascending: true }),
      sb
        .from("insurance_claim_attachments")
        .select("*")
        .eq("claim_id", data.claim_id)
        .order("created_at", { ascending: false }),
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
    const sb = context.supabase as any;
    const [policies, claims] = await Promise.all([
      sb.from("insurance_policies").select("status, premium_cents, currency").limit(5000),
      sb
        .from("insurance_claims")
        .select(
          "status, requested_payout_cents, approved_payout_cents, decided_at, created_at, currency",
        )
        .limit(5000),
    ]);
    const p = (policies.data ?? []) as Row[];
    const c = (claims.data ?? []) as Row[];
    const active = p.filter((x) => x.status === "active").length;
    const openClaims = c.filter((x) => ["submitted", "under_review"].includes(x.status)).length;
    const paidClaims = c.filter((x) => x.status === "paid");
    const totalPayout =
      paidClaims.reduce((s, x) => s + Number(x.approved_payout_cents ?? 0), 0) / 100;
    const totalPremium = p.reduce((s, x) => s + Number(x.premium_cents ?? 0), 0) / 100;
    const lossRatio = totalPremium > 0 ? (totalPayout / totalPremium) * 100 : 0;
    const decided = c.filter((x) => x.decided_at);
    const avgHours = decided.length
      ? decided.reduce(
          (s, x) =>
            s + (new Date(x.decided_at).getTime() - new Date(x.created_at).getTime()) / 3_600_000,
          0,
        ) / decided.length
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

/* -------------------- Analytics -------------------- */

export const getInsuranceAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);

    const sb = context.supabase as any;
    const [policies, claims] = await Promise.all([
      sb
        .from("insurance_policies")
        .select(
          "id, premium_cents, status, created_at, product:insurance_products(id,name, carrier:insurance_carriers(id,name))",
        )
        .limit(5000),
      sb
        .from("insurance_claims")
        .select(
          "id, status, requested_payout_cents, approved_payout_cents, created_at, policy:insurance_policies(product:insurance_products(id,name, carrier:insurance_carriers(id,name)))",
        )
        .limit(5000),
    ]);
    const p = (policies.data ?? []) as Row[];
    const c = (claims.data ?? []) as Row[];

    // Monthly buckets — last 12 months
    const months: string[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const bucket = (iso: string) => iso?.slice(0, 7);
    const trend = months.map((m) => {
      const pm = p.filter((x) => bucket(x.created_at) === m);
      const cm = c.filter((x) => bucket(x.created_at) === m);
      return {
        month: m,
        policies: pm.length,
        premium: pm.reduce((s, x) => s + Number(x.premium_cents ?? 0), 0) / 100,
        claims: cm.length,
        payout:
          cm
            .filter((x) => x.status === "paid")
            .reduce((s, x) => s + Number(x.approved_payout_cents ?? 0), 0) / 100,
      };
    });

    // Carrier performance
    const carrierMap = new Map<
      string,
      { name: string; policies: number; premium: number; claims: number; payout: number }
    >();
    for (const row of p) {
      const carrier = row.product?.carrier as Row | undefined;
      if (!carrier?.id) continue;
      const key = carrier.id as string;
      const agg = carrierMap.get(key) ?? {
        name: carrier.name as string,
        policies: 0,
        premium: 0,
        claims: 0,
        payout: 0,
      };
      agg.policies++;
      agg.premium += Number(row.premium_cents ?? 0) / 100;
      carrierMap.set(key, agg);
    }
    for (const row of c) {
      const carrier = row.policy?.product?.carrier as Row | undefined;
      if (!carrier?.id) continue;
      const key = carrier.id as string;
      const agg = carrierMap.get(key) ?? {
        name: carrier.name as string,
        policies: 0,
        premium: 0,
        claims: 0,
        payout: 0,
      };
      agg.claims++;
      if (row.status === "paid") agg.payout += Number(row.approved_payout_cents ?? 0) / 100;
      carrierMap.set(key, agg);
    }
    const carriers = Array.from(carrierMap.values())
      .map((a) => ({
        ...a,
        lossRatio: a.premium > 0 ? Math.round((a.payout / a.premium) * 1000) / 10 : 0,
      }))
      .sort((x, y) => y.premium - x.premium)
      .slice(0, 12);

    // Product performance
    const productMap = new Map<
      string,
      { name: string; policies: number; premium: number; claims: number; payout: number }
    >();
    for (const row of p) {
      const prod = row.product as Row | undefined;
      if (!prod?.id) continue;
      const key = prod.id as string;
      const agg = productMap.get(key) ?? {
        name: prod.name as string,
        policies: 0,
        premium: 0,
        claims: 0,
        payout: 0,
      };
      agg.policies++;
      agg.premium += Number(row.premium_cents ?? 0) / 100;
      productMap.set(key, agg);
    }
    for (const row of c) {
      const prod = row.policy?.product as Row | undefined;
      if (!prod?.id) continue;
      const key = prod.id as string;
      const agg = productMap.get(key) ?? {
        name: prod.name as string,
        policies: 0,
        premium: 0,
        claims: 0,
        payout: 0,
      };
      agg.claims++;
      if (row.status === "paid") agg.payout += Number(row.approved_payout_cents ?? 0) / 100;
      productMap.set(key, agg);
    }
    const products = Array.from(productMap.values())
      .sort((x, y) => y.premium - x.premium)
      .slice(0, 12);

    return { trend, carriers, products };
  });

/* -------------------- Audit -------------------- */

export const listInsuranceAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        scope: z.enum(["mine", "all"]).default("all"),
        action: z.string().optional(),
        subject_type: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(2000).default(500),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb
      .from("insurance_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.scope === "mine") {
      const t = await tenantAdminId(context);
      q = q.eq("admin_id", t);
    }
    if (data.action) q = q.eq("action", data.action);
    if (data.subject_type) q = q.eq("subject_type", data.subject_type);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows } = await q;
    return { entries: (rows ?? []) as Row[] };
  });

export const exportInsuranceAuditCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        action: z.string().optional(),
        subject_type: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const sb = context.supabase as any;
    let q = sb
      .from("insurance_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);
    if (data.action) q = q.eq("action", data.action);
    if (data.subject_type) q = q.eq("subject_type", data.subject_type);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows } = await q;
    const header = [
      "created_at",
      "action",
      "subject_type",
      "subject_id",
      "admin_id",
      "actor_id",
      "carrier_id",
      "policy_id",
      "claim_id",
      "source",
      "payload",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [header.join(",")];
    for (const r of (rows ?? []) as Row[]) {
      lines.push(header.map((k) => escape(r[k])).join(","));
    }
    return {
      csv: lines.join("\n"),
      filename: `insurance-audit-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  });

export const listInsuranceWebhookEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        status: z.enum(["all", "received", "processed", "error"]).default("all"),
        carrier_code: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const sb = context.supabase as any;
    let q = sb
      .from("insurance_webhook_events")
      .select("*, carrier:insurance_carriers(id,name)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.carrier_code) q = q.eq("carrier_code", data.carrier_code);
    const { data: rows } = await q;
    return { events: (rows ?? []) as Row[] };
  });

export const replayInsuranceWebhookEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ event_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const sb = context.supabase as any;
    const { data: evt, error } = await sb
      .from("insurance_webhook_events")
      .select("id, carrier_id, external_id, raw")
      .eq("id", data.event_id)
      .maybeSingle();
    if (error || !evt) throw new Error("Event not found");
    const { processInsuranceWebhookPayload } = await import("@/lib/insurance-webhook.server");
    const result = await processInsuranceWebhookPayload(sb, {
      carrierId: evt.carrier_id as string,
      externalId: evt.external_id as string | null,
      payload: (evt.raw ?? {}) as Record<string, unknown>,
    });
    await sb
      .from("insurance_webhook_events")
      .update({
        status: result.status,
        processed_at: new Date().toISOString(),
        policy_id: result.policyId,
        claim_id: result.claimId,
        error_message: result.error ?? null,
      })
      .eq("id", evt.id);
    await audit(context, {
      action: "webhook.replay",
      subject_type: "webhook_event",
      subject_id: evt.id as string,
      payload: { result: result.status, error: result.error ?? null },
    });
    return { ok: result.status === "processed", result };
  });

/* -------------------- Policy documents -------------------- */

export const listPolicyDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ policy_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [{ data: policy }, { data: docs }] = await Promise.all([
      sb
        .from("insurance_policies")
        .select("*, product:insurance_products(name, carrier:insurance_carriers(id,name))")
        .eq("id", data.policy_id)
        .maybeSingle(),
      sb
        .from("insurance_policy_documents")
        .select("*")
        .eq("policy_id", data.policy_id)
        .order("version", { ascending: false }),
    ]);
    return { policy: (policy ?? null) as Row | null, documents: (docs ?? []) as Row[] };
  });

export const createPolicyDocumentUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        policy_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const admin = await tenantAdminId(context);
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${admin}/${data.policy_id}/${Date.now()}-${safe}`;
    const { data: signed, error } = await sb.storage
      .from("insurance-attachments")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed?.token as string, signedUrl: signed?.signedUrl as string };
  });

export const savePolicyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        policy_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        storage_path: z.string().min(1),
        mime: z.string().max(120).optional().nullable(),
        size_bytes: z.number().int().nonnegative().optional().nullable(),
        document_type: z.string().max(40).default("policy"),
        notes: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const admin = await tenantAdminId(context);
    // Determine next version and demote current docs.
    const { data: existing } = await sb
      .from("insurance_policy_documents")
      .select("version")
      .eq("policy_id", data.policy_id)
      .order("version", { ascending: false })
      .limit(1);
    const nextVersion = ((existing?.[0]?.version as number | undefined) ?? 0) + 1;
    const { data: pol } = await sb
      .from("insurance_policies")
      .select("admin_id, product:insurance_products(carrier_id)")
      .eq("id", data.policy_id)
      .maybeSingle();
    await sb
      .from("insurance_policy_documents")
      .update({ is_current: false })
      .eq("policy_id", data.policy_id);
    const { data: row, error } = await sb
      .from("insurance_policy_documents")
      .insert({
        policy_id: data.policy_id,
        admin_id: (pol?.admin_id as string) ?? admin,
        carrier_id: (pol?.product?.carrier_id as string) ?? null,
        version: nextVersion,
        is_current: true,
        document_type: data.document_type,
        filename: data.filename,
        storage_path: data.storage_path,
        mime: data.mime ?? null,
        size_bytes: data.size_bytes ?? null,
        notes: data.notes ?? null,
        uploaded_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw error;
    await audit(context, {
      action: "policy.document.upload",
      subject_type: "policy_document",
      subject_id: (row as Row).id as string,
      policy_id: data.policy_id,
      admin_id: (pol?.admin_id as string) ?? admin,
      payload: { version: nextVersion, filename: data.filename },
    });
    return { id: (row as Row).id as string, version: nextVersion };
  });

export const getPolicyDocumentDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: doc } = await sb
      .from("insurance_policy_documents")
      .select("storage_path, filename")
      .eq("id", data.id)
      .maybeSingle();
    if (!doc) throw new Error("Document not found");
    const { data: signed, error } = await sb.storage
      .from("insurance-attachments")
      .createSignedUrl(doc.storage_path as string, 60 * 10);
    if (error) throw error;
    return { url: signed?.signedUrl as string, filename: doc.filename as string };
  });

export const deletePolicyDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);

    const sb = context.supabase as any;
    const { data: doc } = await sb
      .from("insurance_policy_documents")
      .select("storage_path, policy_id, admin_id")
      .eq("id", data.id)
      .maybeSingle();
    if (doc?.storage_path) {
      try {
        await sb.storage.from("insurance-attachments").remove([doc.storage_path as string]);
      } catch {
        /* ignore */
      }
    }
    const { error } = await sb.from("insurance_policy_documents").delete().eq("id", data.id);
    if (error) throw error;
    await audit(context, {
      action: "policy.document.delete",
      subject_type: "policy_document",
      subject_id: data.id,
      policy_id: doc?.policy_id as string,
      admin_id: doc?.admin_id as string | null,
    });
    return { ok: true };
  });

/* -------------------- Attachments (signed upload) -------------------- */

export const createEvidenceUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        claim_id: z.string().uuid(),
        filename: z.string().min(1).max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const admin = await tenantAdminId(context);
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${admin}/${data.claim_id}/${Date.now()}-${safe}`;
    const { data: signed, error } = await sb.storage
      .from("insurance-attachments")
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path, token: signed?.token as string, signedUrl: signed?.signedUrl as string };
  });
