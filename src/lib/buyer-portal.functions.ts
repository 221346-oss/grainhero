/**
 * Phase 12 — Buyer self-service (portal) server functions.
 * All require the auth middleware; they enforce role via `buyer_accounts` presence.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logActivity } from "@/lib/activity";

type Row = Record<string, any>;

async function ensureBuyerAccount(context: {
  supabase: unknown;
  userId: string;
  claims: Record<string, unknown>;
}): Promise<Row> {
  const sb = context.supabase as any;
  const { data: existing } = await sb
    .from("buyer_accounts")
    .select("*")
    .eq("user_id", context.userId)
    .maybeSingle();
  if (existing) return existing as Row;
  const email = (context.claims as { email?: string })?.email ?? null;
  const { data: created, error } = await sb
    .from("buyer_accounts")
    .insert({ user_id: context.userId, company_name: email ?? "Buyer" } as never)
    .select("*")
    .single();
  if (error) throw error;
  return created as Row;
}

export const getMyBuyerAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const account = await ensureBuyerAccount(context);
    return { account };
  });

export const updateMyBuyerAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        companyName: z.string().min(1).max(200).optional(),
        contactPhone: z.string().max(50).optional(),
        defaultShippingAddress: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const account = await ensureBuyerAccount(context);

    const sb = context.supabase as any;
    const patch: Row = {};
    if (data.companyName !== undefined) patch.company_name = data.companyName;
    if (data.contactPhone !== undefined) patch.contact_phone = data.contactPhone;
    if (data.defaultShippingAddress !== undefined)
      patch.default_shipping_address = data.defaultShippingAddress;
    const { error } = await sb.from("buyer_accounts").update(patch).eq("id", account.id);
    if (error) throw error;
    return { ok: true };
  });

const CREATE = z.object({
  listingId: z.string().uuid(),
  quantityKg: z.number().positive(),
  shippingAddress: z.record(z.string(), z.unknown()).optional(),
  notes: z.string().max(1000).optional(),
});

export const createBuyerOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => CREATE.parse(d))
  .handler(async ({ data, context }) => {
    const account = await ensureBuyerAccount(context);

    const sb = context.supabase as any;

    // Read listing via public policy (no admin access)
    const { data: listing, error: lerr } = await sb
      .from("grain_listings")
      .select(
        "id, admin_id, batch_id, price_per_kg, available_kg, min_order_kg, currency, status, visibility, title",
      )
      .eq("id", data.listingId)
      .maybeSingle();
    if (lerr) throw lerr;
    const l = listing as Row | null;
    if (!l || l.status !== "active" || l.visibility !== "public") {
      throw new Error("Listing unavailable");
    }
    if (data.quantityKg < Number(l.min_order_kg ?? 0))
      throw new Error(`Minimum order is ${l.min_order_kg} kg`);
    if (data.quantityKg > Number(l.available_kg ?? 0))
      throw new Error("Quantity exceeds available stock");

    // Create a lightweight buyer record if account has no buyer link yet — needed by legacy FK on buyer_orders.
    let buyerId = account.buyer_id as string | null;
    if (!buyerId) {
      const { data: newBuyer, error: berr } = await sb
        .from("buyers")
        .insert({
          admin_id: l.admin_id,
          name: account.company_name ?? "Marketplace buyer",
          contact_email: (context.claims as { email?: string })?.email ?? null,
        } as never)
        .select("id")
        .single();
      if (berr) throw berr;
      buyerId = (newBuyer as Row).id as string;
      await sb
        .from("buyer_accounts")
        .update({ buyer_id: buyerId } as never)
        .eq("id", account.id);
    }

    // Order number via admin scope count (best-effort; may 0 without perms)
    const { count } = await sb
      .from("buyer_orders")
      .select("id", { count: "exact", head: true })
      .eq("admin_id", l.admin_id);
    const seq = ((count ?? 0) + 1).toString().padStart(5, "0");
    const orderNumber = `MKT-${new Date().getFullYear()}-${seq}`;

    const subtotal = Number((data.quantityKg * Number(l.price_per_kg)).toFixed(2));
    const { data: order, error: oerr } = await sb
      .from("buyer_orders")
      .insert({
        admin_id: l.admin_id,
        buyer_id: buyerId,
        listing_id: l.id,
        batch_id: l.batch_id,
        order_number: orderNumber,
        quantity_kg: data.quantityKg,
        unit_price: l.price_per_kg,
        subtotal,
        currency: l.currency,
        status: "pending",
        notes: data.notes ?? null,
        placed_by: context.userId,
        buyer_account_id: account.id,
        channel: "portal",
        shipping_address: data.shippingAddress ?? account.default_shipping_address ?? null,
      } as never)
      .select("id, order_number")
      .single();
    if (oerr) throw oerr;

    await sb.from("buyer_order_events").insert({
      order_id: (order as Row).id,
      admin_id: l.admin_id,
      from_state: null,
      to_state: "pending",
      actor_user_id: context.userId,
      note: "Order placed via marketplace portal",
    } as never);

    await logActivity({
      actorId: context.userId,
      tenantAdminId: l.admin_id as string,
      action: "order.placed.portal",
      targetType: "buyer_order",
      targetId: (order as Row).id as string,
      meta: { orderNumber, quantityKg: data.quantityKg, subtotal, channel: "portal" },
    });

    // Fire-and-forget confirmation email (fully templated in super-admin settings).
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(sb, (order as Row).id as string, "placed");
    } catch (e) {
      console.warn("[buyer-portal] placed email failed:", (e as Error).message);
    }

    return { id: (order as Row).id as string, orderNumber };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const account = await ensureBuyerAccount(context);

    const sb = context.supabase as any;
    const { data, error } = await sb
      .from("buyer_orders")
      .select(
        "id, order_number, status, quantity_kg, unit_price, subtotal, currency, created_at, checkout_url, paid_at, dispatched_at, completed_at, grain_listings(title, cover_image_url)",
      )
      .eq("buyer_account_id", account.id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { orders: (data ?? []) as Row[] };
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const account = await ensureBuyerAccount(context);

    const sb = context.supabase as any;
    const [oRes, eRes] = await Promise.all([
      sb
        .from("buyer_orders")
        .select(
          "*, grain_listings(title, cover_image_url, description), buyer_invoices(id, invoice_number, pdf_url, email_status)",
        )
        .eq("id", data.orderId)
        .eq("buyer_account_id", account.id)
        .maybeSingle(),
      sb
        .from("buyer_order_events")
        .select("*")
        .eq("order_id", data.orderId)
        .order("created_at", { ascending: false }),
    ]);
    if (oRes.error) throw oRes.error;
    if (!oRes.data) throw new Error("Order not found");
    return { order: oRes.data as Row, events: (eRes.data ?? []) as Row[] };
  });

export const cancelMyOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const account = await ensureBuyerAccount(context);

    const sb = context.supabase as any;
    const { data: o } = await sb
      .from("buyer_orders")
      .select("id, admin_id, status")
      .eq("id", data.orderId)
      .eq("buyer_account_id", account.id)
      .maybeSingle();
    const row = o as Row | null;
    if (!row) throw new Error("Order not found");
    if (row.status !== "pending") throw new Error("Only pending orders can be cancelled");
    const { error } = await sb
      .from("buyer_orders")
      .update({ status: "cancelled" } as never)
      .eq("id", data.orderId);
    if (error) throw error;
    await sb.from("buyer_order_events").insert({
      order_id: data.orderId,
      admin_id: row.admin_id,
      from_state: "pending",
      to_state: "cancelled",
      actor_user_id: context.userId,
      note: "Cancelled by buyer",
    } as never);
    return { ok: true };
  });

/* -------------------------------------------------------------
 * Phase 15 — favourites + reorder
 * ----------------------------------------------------------- */

export const listMyFavorites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const account = await ensureBuyerAccount(context);

    const sb = context.supabase as any;
    const { data } = await sb
      .from("favorite_listings")
      .select(
        "listing_id, created_at, grain_listings(id, title, slug, cover_image_url, price_per_kg, available_kg, currency, status)",
      )
      .eq("buyer_account_id", account.id)
      .order("created_at", { ascending: false });
    return { favorites: (data ?? []) as Row[] };
  });

export const toggleFavoriteListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ listingId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const account = await ensureBuyerAccount(context);

    const sb = context.supabase as any;
    const { data: existing } = await sb
      .from("favorite_listings")
      .select("id")
      .eq("buyer_account_id", account.id)
      .eq("listing_id", data.listingId)
      .maybeSingle();
    if (existing) {
      await sb
        .from("favorite_listings")
        .delete()
        .eq("id", (existing as Row).id);
      return { ok: true, favorited: false };
    }
    const { error } = await sb.from("favorite_listings").insert({
      buyer_account_id: account.id,
      listing_id: data.listingId,
    } as never);
    if (error && !String(error.message).match(/duplicate|unique/i)) throw error;
    return { ok: true, favorited: true };
  });

export const duplicateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const account = await ensureBuyerAccount(context);

    const sb = context.supabase as any;
    const { data: prev } = await sb
      .from("buyer_orders")
      .select(
        "id, admin_id, buyer_id, listing_id, batch_id, quantity_kg, unit_price, subtotal, currency, shipping_address, channel",
      )
      .eq("id", data.orderId)
      .eq("buyer_account_id", account.id)
      .maybeSingle();
    const p = prev as Row | null;
    if (!p) throw new Error("Order not found");
    // Ensure listing still active and enough stock
    const { data: listing } = await sb
      .from("grain_listings")
      .select("id, status, available_kg, price_per_kg, currency")
      .eq("id", p.listing_id)
      .maybeSingle();
    const l = listing as Row | null;
    if (!l || l.status !== "active") throw new Error("Listing no longer available");
    const qty = Math.min(Number(p.quantity_kg), Number(l.available_kg));
    const unit = Number(l.price_per_kg);
    const orderNumber = `ORD-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const { data: created, error } = await sb
      .from("buyer_orders")
      .insert({
        admin_id: p.admin_id,
        buyer_id: p.buyer_id,
        buyer_account_id: account.id,
        listing_id: p.listing_id,
        batch_id: p.batch_id,
        quantity_kg: qty,
        unit_price: unit,
        subtotal: qty * unit,
        currency: l.currency ?? p.currency,
        status: "pending",
        channel: p.channel ?? "marketplace",
        shipping_address: p.shipping_address,
        order_number: orderNumber,
        placed_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    await logActivity({
      actorId: context.userId,
      tenantAdminId: p.admin_id as string,
      action: "order.duplicated",
      targetType: "buyer_order",
      targetId: (created as Row).id as string,
      meta: { sourceOrderId: p.id },
    });
    return { ok: true, orderId: (created as Row).id as string };
  });
