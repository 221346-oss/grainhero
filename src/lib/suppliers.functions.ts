/**
 * Suppliers — grain sources tracked per tenant.
 * Kinds: external | own_farm | internal_transfer | anonymous.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const kinds = ["external", "own_farm", "internal_transfer", "anonymous"] as const;

const supplierInput = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(kinds).default("external"),
  name: z.string().min(1).max(200),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  country: z.string().max(120).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const listSuppliers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ kind: z.enum(kinds).optional(), search: z.string().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.kind) q = q.eq("kind", data.kind);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    // enrich with totals
    const ids = (rows ?? []).map((r: Row) => r.id);
    let totals: Record<string, { kg: number; last: string | null; avg_cost: number | null }> = {};
    if (ids.length > 0) {
      const { data: agg } = await context.supabase
        .from("grain_batches")
        .select("supplier_id, quantity_kg, unit_cost, intake_date, created_at")
        .in("supplier_id", ids);
      for (const b of (agg ?? []) as Row[]) {
        const sid = b.supplier_id as string;
        const t = totals[sid] ?? { kg: 0, last: null, avg_cost: null };
        const qty = Number(b.quantity_kg ?? 0);
        t.kg += qty;
        const dt = (b.intake_date ?? b.created_at) as string | null;
        if (dt && (!t.last || dt > t.last)) t.last = dt;
        if (b.unit_cost != null) {
          const cur = t.avg_cost ?? 0;
          t.avg_cost = cur === 0 ? Number(b.unit_cost) : (cur + Number(b.unit_cost)) / 2;
        }
        totals[sid] = t;
      }
    }
    return {
      suppliers: (rows ?? []).map((r: Row) => ({
        ...r,
        total_kg: totals[r.id]?.kg ?? 0,
        last_delivery: totals[r.id]?.last ?? null,
        avg_cost: totals[r.id]?.avg_cost ?? null,
      })),
    };
  });

export const upsertSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => supplierInput.parse(d))
  .handler(async ({ data, context }) => {
    const adminId = context.userId;
    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("suppliers")
        .update({
          kind: data.kind,
          name: data.name,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          city: data.city ?? null,
          country: data.country ?? null,
          notes: data.notes ?? null,
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw error;
      await logActivity({ actorId: context.userId, tenantAdminId: adminId, action: "supplier.updated", targetType: "supplier", targetId: data.id });
      return row;
    }
    const { data: row, error } = await context.supabase
      .from("suppliers")
      .insert({
        admin_id: adminId,
        created_by: adminId,
        kind: data.kind,
        name: data.name,
        phone: data.phone ?? null,
        email: data.email ?? null,
        address: data.address ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    await logActivity({ actorId: context.userId, tenantAdminId: adminId, action: "supplier.created", targetType: "supplier", targetId: (row as Row).id });
    return row;
  });

export const deleteSupplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("suppliers").delete().eq("id", data.id);
    if (error) throw error;
    await logActivity({ actorId: context.userId, action: "supplier.deleted", targetType: "supplier", targetId: data.id });
    return { ok: true };
  });

export const getSupplierDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: supplier, error } = await context.supabase
      .from("suppliers")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    const { data: batches } = await context.supabase
      .from("grain_batches")
      .select("id, batch_id, grain_type, quantity_kg, remaining_kg, unit_cost, currency, intake_date, created_at, silo_id, silos:silo_id(name, silo_id)")
      .eq("supplier_id", data.id)
      .order("created_at", { ascending: false })
      .limit(200);
    return { supplier, batches: (batches ?? []) as Row[] };
  });

// Tenant pricing settings ----------------------------------------------------
export const getPriceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Resolve tenant admin id — settings are a single shared row per tenant.
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const { data } = await context.supabase
      .from("tenant_price_settings")
      .select("*")
      .eq("admin_id", tenantAdminId)
      .maybeSingle();
    return {
      default_margin_pct: Number((data as Row | null)?.default_margin_pct ?? 15),
      currency: String((data as Row | null)?.currency ?? "PKR"),
      per_grain_margin: ((data as Row | null)?.per_grain_margin ?? {}) as Record<string, number>,
    };
  });

export const savePriceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      default_margin_pct: z.number().min(0).max(500),
      currency: z.string().min(3).max(3).default("PKR"),
      per_grain_margin: z.record(z.string(), z.number()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Resolve tenant admin id — settings are a single shared row per tenant.
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("id, admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const tenantAdminId = prof?.admin_id ?? prof?.id ?? context.userId;
    const { error } = await context.supabase
      .from("tenant_price_settings")
      .upsert({
        admin_id: tenantAdminId,
        default_margin_pct: data.default_margin_pct,
        currency: data.currency,
        per_grain_margin: data.per_grain_margin ?? {},
        updated_by: context.userId,
      } as never);
    if (error) throw error;
    return { ok: true };
  });

// Silo pool summary ----------------------------------------------------------
export const getSiloPool = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ siloId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("silo_pool_summary")
      .select("*")
      .eq("silo_id", data.siloId)
      .maybeSingle();
    return {
      total_on_hand_kg: Number((row as Row | null)?.total_on_hand_kg ?? 0),
      weighted_avg_cost: Number((row as Row | null)?.weighted_avg_cost ?? 0),
      oldest_intake_at: (row as Row | null)?.oldest_intake_at ?? null,
      active_batch_count: Number((row as Row | null)?.active_batch_count ?? 0),
    };
  });