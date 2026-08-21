/**
 * Phase 11 — Grain listings.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logActivity } from "@/lib/activity";

type Row = Record<string, any>;

const CREATE_FROM_BATCH = z.object({
  batchId: z.string().uuid(),
  pricePerKg: z.number().positive(),
  availableKg: z.number().positive(),
  minOrderKg: z.number().nonnegative().default(100),
  visibility: z.enum(["private", "buyer_network", "public"]).default("buyer_network"),
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).optional(),
  currency: z.string().min(3).max(3).default("USD"),
  expiresAt: z.string().datetime().optional(),
});

async function tenantAdminIdFor(sb: unknown, userId: string): Promise<string> {
  const c = sb as any;
  const { data } = await c.rpc("get_tenant_admin_id", { _user_id: userId });
  return (data as string | null) ?? userId;
}

export const createListingFromBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => CREATE_FROM_BATCH.parse(d))
  .handler(async ({ data, context }) => {
    const { data: batch } = await context.supabase
      .from("grain_batches")
      .select("id, admin_id, status, grain_type, batch_number, quality_grade")
      .eq("id", data.batchId)
      .single();
    const b = batch as Row | null;
    if (!b) throw new Error("Batch not found");
    if (!["ready", "stored", "processing"].includes(String(b.status))) {
      throw new Error(`Batch must be ready before listing (current: ${b.status})`);
    }

    const title = data.title ?? `${b.grain_type ?? "Grain"} · ${b.batch_number}`;
    const { data: saved, error } = await context.supabase
      .from("grain_listings")
      .insert({
        admin_id: b.admin_id,
        batch_id: b.id,
        title,
        description: data.description ?? null,
        price_per_kg: data.pricePerKg,
        currency: data.currency,
        available_kg: data.availableKg,
        min_order_kg: data.minOrderKg,
        visibility: data.visibility,
        status: "active",
        expires_at: data.expiresAt ?? null,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw error;

    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id as string,
      action: "listing.created",
      targetType: "grain_listing",
      targetId: (saved as Row).id as string,
      meta: { batchId: b.id, title, pricePerKg: data.pricePerKg },
    });
    return { id: (saved as Row).id as string };
  });

const UPDATE_LISTING = z.object({
  id: z.string().uuid(),
  pricePerKg: z.number().positive().optional(),
  availableKg: z.number().nonnegative().optional(),
  minOrderKg: z.number().nonnegative().optional(),
  visibility: z.enum(["private", "buyer_network", "public"]).optional(),
  status: z.enum(["draft", "active", "paused", "sold_out", "archived"]).optional(),
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const updateListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => UPDATE_LISTING.parse(d))
  .handler(async ({ data, context }) => {
    const patch: Row = {};
    if (data.pricePerKg !== undefined) patch.price_per_kg = data.pricePerKg;
    if (data.availableKg !== undefined) patch.available_kg = data.availableKg;
    if (data.minOrderKg !== undefined) patch.min_order_kg = data.minOrderKg;
    if (data.visibility) patch.visibility = data.visibility;
    if (data.status) patch.status = data.status;
    if (data.title) patch.title = data.title;
    if (data.description !== undefined) patch.description = data.description;
    if (data.expiresAt !== undefined) patch.expires_at = data.expiresAt;
    const { error } = await context.supabase
      .from("grain_listings")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw error;
    await logActivity({
      actorId: context.userId,
      tenantAdminId: await tenantAdminIdFor(context.supabase, context.userId),
      action: "listing.updated",
      targetType: "grain_listing",
      targetId: data.id,
      meta: patch,
    });
    return { ok: true };
  });

export const listListings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        status: z.enum(["draft", "active", "paused", "sold_out", "archived", "all"]).default("all"),
        limit: z.number().int().min(1).max(200).default(100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("grain_listings")
      .select("*, grain_batches(id, batch_number, grain_type, quality_grade)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { listings: (rows ?? []) as Row[] };
  });

export const getEligibleBatches = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Batches that are ready and not yet listed
    const { data: batches } = await context.supabase
      .from("grain_batches")
      .select(
        "id, batch_number, grain_type, quality_grade, net_weight_kg, quantity_kg, silo_id, status",
      )
      .in("status", ["ready", "stored"])
      .order("state_changed_at", { ascending: false, nullsFirst: false })
      .limit(50);
    const { data: existing } = await context.supabase.from("grain_listings").select("batch_id");
    const listed = new Set(((existing ?? []) as Row[]).map((r) => r.batch_id as string));
    const rows = ((batches ?? []) as Row[]).filter((b) => !listed.has(b.id as string));
    return { batches: rows };
  });
