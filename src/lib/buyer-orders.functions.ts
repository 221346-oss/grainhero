/**
 * Phase 11 — Buyer order state machine.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const STATES = ["pending","confirmed","invoiced","paid","dispatched","completed","cancelled","refunded"] as const;
type State = typeof STATES[number];

const ALLOWED: Record<State, State[]> = {
  pending: ["confirmed","cancelled"],
  confirmed: ["invoiced","cancelled"],
  invoiced: ["paid","cancelled"],
  paid: ["dispatched","refunded"],
  dispatched: ["completed","refunded"],
  completed: [],
  cancelled: [],
  refunded: [],
};

async function nextOrderNumber(sb: unknown, adminId: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = sb as any;
  const { count } = await c.from("buyer_orders")
    .select("id", { count: "exact", head: true }).eq("admin_id", adminId);
  const seq = ((count ?? 0) + 1).toString().padStart(5, "0");
  return `ORD-${new Date().getFullYear()}-${seq}`;
}

const PLACE_ORDER = z.object({
  listingId: z.string().uuid(),
  buyerId: z.string().uuid(),
  quantityKg: z.number().positive(),
  expectedDeliveryDate: z.string().date().optional(),
  notes: z.string().max(1000).optional(),
});

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => PLACE_ORDER.parse(d))
  .handler(async ({ data, context }) => {
    const { data: listing } = await context.supabase
      .from("grain_listings")
      .select("id, admin_id, batch_id, price_per_kg, available_kg, min_order_kg, currency, status")
      .eq("id", data.listingId).single();
    const l = listing as Row | null;
    if (!l) throw new Error("Listing not found");
    if (l.status !== "active") throw new Error("Listing not active");
    if (data.quantityKg < Number(l.min_order_kg ?? 0)) throw new Error(`Minimum order is ${l.min_order_kg}kg`);
    if (data.quantityKg > Number(l.available_kg ?? 0)) throw new Error("Requested quantity exceeds available stock");

    const orderNumber = await nextOrderNumber(context.supabase, l.admin_id as string);
    const subtotal = Number((data.quantityKg * Number(l.price_per_kg)).toFixed(2));
    const { data: order, error } = await context.supabase
      .from("buyer_orders").insert({
        admin_id: l.admin_id, buyer_id: data.buyerId, listing_id: l.id, batch_id: l.batch_id,
        order_number: orderNumber, quantity_kg: data.quantityKg,
        unit_price: l.price_per_kg, subtotal, currency: l.currency,
        status: "pending", expected_delivery_date: data.expectedDeliveryDate ?? null,
        notes: data.notes ?? null, placed_by: context.userId,
      } as never).select("id, order_number").single();
    if (error) throw error;

    await context.supabase.from("buyer_order_events").insert({
      order_id: (order as Row).id, admin_id: l.admin_id,
      from_state: null, to_state: "pending",
      actor_user_id: context.userId, note: "Order placed",
    } as never);

    await logActivity({
      actorId: context.userId, tenantAdminId: l.admin_id as string,
      action: "order.placed", targetType: "buyer_order",
      targetId: (order as Row).id as string,
      meta: { orderNumber, quantityKg: data.quantityKg, subtotal },
    });

    return { id: (order as Row).id as string, orderNumber: (order as Row).order_number as string };
  });

const TRANSITION = z.object({
  orderId: z.string().uuid(),
  toState: z.enum(STATES),
  note: z.string().max(1000).optional(),
});

export const transitionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => TRANSITION.parse(d))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("buyer_orders").select("id, admin_id, status, batch_id, quantity_kg, listing_id")
      .eq("id", data.orderId).single();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    const from = String(o.status) as State;
    if (!ALLOWED[from].includes(data.toState)) {
      throw new Error(`Invalid transition ${from} → ${data.toState}`);
    }

    const { error: e1 } = await context.supabase.from("buyer_orders")
      .update({ status: data.toState } as never).eq("id", data.orderId);
    if (e1) throw e1;
    await context.supabase.from("buyer_order_events").insert({
      order_id: data.orderId, admin_id: o.admin_id,
      from_state: from, to_state: data.toState,
      actor_user_id: context.userId, note: data.note ?? null,
    } as never);

    // Cross-link to batch lifecycle
    if (o.batch_id) {
      const target =
        data.toState === "dispatched" ? "dispatched" :
        data.toState === "completed" ? "sold" : null;
      if (target) {
        await context.supabase.from("grain_batches").update({
          status: target, state_changed_at: new Date().toISOString(),
        } as never).eq("id", o.batch_id);
        await context.supabase.from("grain_batch_events").insert({
          batch_id: o.batch_id, admin_id: o.admin_id,
          from_state: null, to_state: target,
          actor_user_id: context.userId, note: `Auto: order ${data.toState}`,
        } as never);
      }
    }

    await logActivity({
      actorId: context.userId, tenantAdminId: o.admin_id as string,
      action: `order.${data.toState}`, targetType: "buyer_order", targetId: data.orderId,
      meta: { from, to: data.toState },
    });

    if (data.toState === "dispatched") {
      try {
        const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
        await sendBuyerOrderEmail(context.supabase, data.orderId, "dispatched");
      } catch (e) {
        console.warn("[buyer-orders] dispatched email failed:", (e as Error).message);
      }
    }

    return { ok: true, from, to: data.toState };
  });

export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    status: z.enum([...STATES, "all"]).default("all"),
    limit: z.number().int().min(1).max(200).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("buyer_orders")
      .select("*, buyers(id, name, company_name, contact_email), grain_listings(id, title, currency)")
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { orders: (rows ?? []) as Row[] };
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const [orderRes, eventsRes, invoiceRes] = await Promise.all([
      context.supabase.from("buyer_orders")
        .select("*, buyers(*), grain_listings(*, grain_batches(id, batch_number, grain_type, quality_grade))")
        .eq("id", data.orderId).single(),
      context.supabase.from("buyer_order_events").select("*").eq("order_id", data.orderId)
        .order("created_at", { ascending: false }),
      context.supabase.from("buyer_invoices").select("*").eq("order_id", data.orderId).maybeSingle(),
    ]);
    if (orderRes.error) throw orderRes.error;
    const invoice = (invoiceRes.data as Row | null) ?? null;
    let payments: Row[] = [];
    if (invoice?.id) {
      const { data: pays } = await context.supabase.from("buyer_payments")
        .select("*").eq("invoice_id", invoice.id).order("created_at", { ascending: false });
      payments = (pays ?? []) as Row[];
    }
    return {
      order: orderRes.data as Row,
      events: (eventsRes.data ?? []) as Row[],
      invoice,
      payments,
    };
  });

export const getAllowedOrderTransitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: o } = await context.supabase
      .from("buyer_orders").select("status").eq("id", data.orderId).single();
    const from = String((o as Row | null)?.status ?? "pending") as State;
    return { from, next: ALLOWED[from] ?? [] };
  });
