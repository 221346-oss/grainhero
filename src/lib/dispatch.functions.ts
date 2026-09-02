/**
 * Phase 13 — Dispatch & delivery lifecycle.
 * Sellers create shipments, append tracking events, and mark delivered.
 * All couriers/SLA/copy come from platform_settings — nothing hardcoded.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { logActivity } from "@/lib/activity";
import { loadMarketplaceSettings, renderTemplate } from "@/lib/marketplace-settings.functions";
import { emitNotification } from "@/lib/notify";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/**
 * Emit in-app notifications to the buyer (via buyer_accounts.user_id) and
 * the seller admin whenever a shipment audit event lands. Fire-and-forget.
 */

async function notifyShipmentParties(
  sb: any,
  args: {
    orderId: string;
    adminId: string;
    title: string;
    body: string;
    link: string;
  },
) {
  try {
    // Seller / tenant admin
    void emitNotification(sb, {
      recipientId: args.adminId,
      tenantAdminId: args.adminId,
      category: "order",
      severity: "info",
      title: args.title,
      body: args.body,
      link: args.link,
      entityType: "buyer_order",
      entityId: args.orderId,
    });
    // Buyer
    const { data: order } = await sb
      .from("buyer_orders")
      .select("buyer_account_id")
      .eq("id", args.orderId)
      .maybeSingle();
    const acctId = (order as Row | null)?.buyer_account_id;
    if (acctId) {
      const { data: acc } = await sb
        .from("buyer_accounts")
        .select("user_id")
        .eq("id", acctId)
        .maybeSingle();
      const uid = (acc as Row | null)?.user_id;
      if (uid) {
        void emitNotification(sb, {
          recipientId: uid,
          tenantAdminId: args.adminId,
          category: "order",
          severity: "info",
          title: args.title,
          body: args.body,
          link: `/buyer/orders/${args.orderId}`,
          entityType: "buyer_order",
          entityId: args.orderId,
        });
      }
    }
  } catch (e) {
    console.warn("[dispatch] notify failed", (e as Error).message);
  }
}

function resolveTrackingUrl(template: string, trackingNumber: string | null): string | null {
  if (!template || !trackingNumber) return null;
  return renderTemplate(template, { trackingNumber });
}

async function resolveActor(
  sb: any,
  userId: string,
): Promise<{
  actor_user_id: string;
  actor_name: string | null;
  actor_role: string | null;
}> {
  const [{ data: p }, { data: role }] = await Promise.all([
    sb.from("profiles").select("name").eq("id", userId).maybeSingle(),
    sb.rpc("get_my_role", { _user_id: userId }),
  ]);
  return {
    actor_user_id: userId,
    actor_name: (p as { name?: string } | null)?.name ?? null,
    actor_role: (role as string | null) ?? null,
  };
}

export const createShipment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        courierKey: z.string().min(1).max(60),
        trackingNumber: z.string().max(120).optional().nullable(),
        expectedDeliveryAt: z.string().datetime().optional().nullable(),
        notes: z.string().max(1000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: order } = await sb
      .from("buyer_orders")
      .select("id, admin_id, status, shipment_id")
      .eq("id", data.orderId)
      .single();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    if (o.shipment_id) throw new Error("Shipment already exists for this order");
    if (o.status !== "paid") throw new Error("Order must be paid before dispatch");

    const settings = await loadMarketplaceSettings(context.supabase);
    const courier = settings.dispatch.couriers.find((c) => c.key === data.courierKey);
    if (!courier) throw new Error("Unknown courier");
    const trackingUrl = resolveTrackingUrl(
      courier.trackingUrlTemplate,
      data.trackingNumber ?? null,
    );

    const nowIso = new Date().toISOString();
    const { data: ship, error } = await sb
      .from("buyer_shipments")
      .insert({
        order_id: data.orderId,
        admin_id: o.admin_id,
        courier_key: courier.key,
        courier_label: courier.label,
        tracking_number: data.trackingNumber ?? null,
        tracking_url: trackingUrl,
        status: "in_transit",
        dispatched_at: nowIso,
        expected_delivery_at: data.expectedDeliveryAt ?? null,
        notes: data.notes ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    const shipmentId = (ship as Row).id as string;

    await sb
      .from("buyer_orders")
      .update({
        shipment_id: shipmentId,
        status: "dispatched",
      } as never)
      .eq("id", data.orderId);
    await sb.from("buyer_order_events").insert({
      order_id: data.orderId,
      admin_id: o.admin_id,
      from_state: "paid",
      to_state: "dispatched",
      actor_user_id: context.userId,
      note: `Dispatched via ${courier.label}${data.trackingNumber ? ` #${data.trackingNumber}` : ""}`,
    } as never);
    await sb.from("buyer_shipment_events").insert({
      shipment_id: shipmentId,
      code: "dispatched",
      label: `Dispatched via ${courier.label}`,
      source: "seller",
      ...(await resolveActor(sb, context.userId)),
    } as never);

    await logActivity({
      actorId: context.userId,
      tenantAdminId: o.admin_id as string,
      action: "shipment.created",
      targetType: "buyer_shipment",
      targetId: shipmentId,
      meta: { orderId: data.orderId, courier: courier.key },
    });

    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, data.orderId, "dispatched");
    } catch (e) {
      console.warn("[dispatch] dispatched email failed:", (e as Error).message);
    }
    await notifyShipmentParties(sb, {
      orderId: data.orderId,
      adminId: o.admin_id as string,
      title: `Order dispatched`,
      body: `Shipment created via ${courier.label}${data.trackingNumber ? ` #${data.trackingNumber}` : ""}.`,
      link: `/platform/orders/${data.orderId}`,
    });
    return { shipmentId };
  });

export const appendShipmentEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        shipmentId: z.string().uuid(),
        code: z.string().min(1).max(60),
        label: z.string().min(1).max(200),
        location: z.string().max(200).optional().nullable(),
        note: z.string().max(1000).optional().nullable(),
        setStatus: z
          .enum(["queued", "in_transit", "out_for_delivery", "delivered", "exception"])
          .optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const actor = await resolveActor(sb, context.userId);
    const { error } = await sb.from("buyer_shipment_events").insert({
      shipment_id: data.shipmentId,
      code: data.code,
      label: data.label,
      location: data.location ?? null,
      note: data.note ?? null,
      source: "seller",
      ...actor,
    } as never);
    if (error) throw error;
    if (data.setStatus) {
      await sb
        .from("buyer_shipments")
        .update({ status: data.setStatus } as never)
        .eq("id", data.shipmentId);
      if (data.setStatus === "exception" || data.setStatus === "out_for_delivery") {
        const { data: ship } = await sb
          .from("buyer_shipments")
          .select("order_id")
          .eq("id", data.shipmentId)
          .maybeSingle();
        const orderId = (ship as Row | null)?.order_id;
        if (orderId) {
          try {
            const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
            await sendBuyerOrderEmail(
              context.supabase,
              orderId,
              data.setStatus === "exception" ? "exception" : "outForDelivery",
            );
          } catch (e) {
            console.warn("[dispatch] status email failed:", (e as Error).message);
          }
        }
      }
    }
    // In-app fan-out for every audit event.
    const { data: ship } = await sb
      .from("buyer_shipments")
      .select("order_id, admin_id")
      .eq("id", data.shipmentId)
      .maybeSingle();
    const s = ship as Row | null;
    if (s?.order_id && s?.admin_id) {
      await notifyShipmentParties(sb, {
        orderId: s.order_id as string,
        adminId: s.admin_id as string,
        title: `Shipment update: ${data.label}`,
        body: [data.location, data.note].filter(Boolean).join(" — ") || data.code,
        link: `/platform/orders/${s.order_id}`,
      });
    }
    return { ok: true };
  });

export const markDelivered = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        shipmentId: z.string().uuid(),
        note: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: ship } = await sb
      .from("buyer_shipments")
      .select("id, order_id, admin_id, status")
      .eq("id", data.shipmentId)
      .single();
    const s = ship as Row | null;
    if (!s) throw new Error("Shipment not found");
    const nowIso = new Date().toISOString();
    await sb
      .from("buyer_shipments")
      .update({
        status: "delivered",
        delivered_at: nowIso,
      } as never)
      .eq("id", data.shipmentId);
    await sb.from("buyer_shipment_events").insert({
      shipment_id: data.shipmentId,
      code: "delivered",
      label: "Delivered",
      source: "seller",
      ...(await resolveActor(sb, context.userId)),
      note: data.note ?? null,
    } as never);

    // Advance order to completed and mark batch sold.
    const { data: order } = await sb
      .from("buyer_orders")
      .select("id, admin_id, status, batch_id")
      .eq("id", s.order_id)
      .single();
    const o = order as Row | null;
    if (o && o.status !== "completed") {
      await sb
        .from("buyer_orders")
        .update({
          status: "completed",
          delivered_at: nowIso,
        } as never)
        .eq("id", o.id);
      await sb.from("buyer_order_events").insert({
        order_id: o.id,
        admin_id: o.admin_id,
        from_state: o.status,
        to_state: "completed",
        actor_user_id: context.userId,
        note: data.note ?? "Marked delivered",
      } as never);
      if (o.batch_id) {
        await sb
          .from("grain_batches")
          .update({
            status: "sold",
            state_changed_at: nowIso,
          } as never)
          .eq("id", o.batch_id);
      }
    }

    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, s.order_id, "delivered");
    } catch (e) {
      console.warn("[dispatch] delivered email failed:", (e as Error).message);
    }
    await notifyShipmentParties(sb, {
      orderId: s.order_id as string,
      adminId: s.admin_id as string,
      title: `Order delivered`,
      body: data.note ?? `Shipment marked delivered.`,
      link: `/platform/orders/${s.order_id}`,
    });

    await logActivity({
      actorId: context.userId,
      tenantAdminId: s.admin_id as string,
      action: "shipment.delivered",
      targetType: "buyer_shipment",
      targetId: data.shipmentId,
      meta: { orderId: s.order_id },
    });
    return { ok: true };
  });

export const getShipmentTracking = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: shipment } = await sb
      .from("buyer_shipments")
      .select("*")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!shipment) return { shipment: null, events: [] };
    const { data: events } = await sb
      .from("buyer_shipment_events")
      .select("*")
      .eq("shipment_id", (shipment as Row).id)
      .order("at", { ascending: true });
    return { shipment, events: events ?? [] };
  });
