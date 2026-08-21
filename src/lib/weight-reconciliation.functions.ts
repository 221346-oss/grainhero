/**
 * Phase 16 — Weight reconciliation between dispatched and received qty.
 * Variance beyond the configured threshold auto-flags the order for the seller.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emitNotification } from "@/lib/notify";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";

type Row = Record<string, any>;

export const recordDispatchedWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        dispatchedKg: z.number().positive(),
        note: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: order } = await sb
      .from("buyer_orders")
      .select("admin_id, order_number")
      .eq("id", data.orderId)
      .maybeSingle();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    if (o.admin_id !== context.userId) {
      const { data: role } = await sb.rpc("get_my_role", { _user_id: context.userId });
      if (role !== "super_admin") throw new Error("Forbidden");
    }
    const { data: existing } = await sb
      .from("buyer_order_weight_reconciliation")
      .select("id")
      .eq("order_id", data.orderId)
      .maybeSingle();
    const payload = {
      order_id: data.orderId,
      admin_id: o.admin_id,
      dispatched_kg: data.dispatchedKg,
      dispatched_by: context.userId,
      dispatched_at: new Date().toISOString(),
      dispatched_note: data.note ?? null,
    };
    if (existing) {
      await sb
        .from("buyer_order_weight_reconciliation")
        .update(payload as never)
        .eq("id", (existing as Row).id);
      return { id: (existing as Row).id as string };
    }
    const { data: ins, error } = await sb
      .from("buyer_order_weight_reconciliation")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (ins as Row).id as string };
  });

export const recordReceivedWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        orderId: z.string().uuid(),
        receivedKg: z.number().positive(),
        note: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const settings = await loadMarketplaceSettings(context.supabase);
    const { data: rec } = await sb
      .from("buyer_order_weight_reconciliation")
      .select("*")
      .eq("order_id", data.orderId)
      .maybeSingle();
    const existing = rec as Row | null;
    const dispatched = existing?.dispatched_kg ? Number(existing.dispatched_kg) : null;
    const variancePct = dispatched
      ? (Math.abs(dispatched - data.receivedKg) / dispatched) * 100
      : null;
    const flagged = variancePct != null && variancePct > settings.returns.varianceThresholdPct;

    const payload = {
      order_id: data.orderId,
      received_kg: data.receivedKg,
      received_by: context.userId,
      received_at: new Date().toISOString(),
      received_note: data.note ?? null,
      variance_pct: variancePct,
      flagged,
    };
    if (existing) {
      await sb
        .from("buyer_order_weight_reconciliation")
        .update(payload as never)
        .eq("id", existing.id);
    } else {
      const { data: order } = await sb
        .from("buyer_orders")
        .select("admin_id")
        .eq("id", data.orderId)
        .maybeSingle();
      const o = order as Row | null;
      if (!o) throw new Error("Order not found");
      await sb.from("buyer_order_weight_reconciliation").insert({
        ...payload,
        admin_id: o.admin_id,
      } as never);
    }

    if (flagged) {
      const { data: order } = await sb
        .from("buyer_orders")
        .select("admin_id, order_number")
        .eq("id", data.orderId)
        .maybeSingle();
      const o = order as Row | null;
      if (o) {
        void emitNotification(sb, {
          recipientId: o.admin_id as string,
          tenantAdminId: o.admin_id as string,
          category: "order",
          severity: "warning",
          title: `Weight variance flagged on order ${o.order_number ?? ""}`.trim(),
          body: `Received ${data.receivedKg}kg vs dispatched ${dispatched}kg (${variancePct?.toFixed(1)}%)`,
          link: `/platform/orders/${data.orderId}`,
          entityType: "buyer_order",
          entityId: data.orderId,
        });
      }
    }
    return { variancePct, flagged };
  });

export const getReconciliation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: rec } = await sb
      .from("buyer_order_weight_reconciliation")
      .select("*")
      .eq("order_id", data.orderId)
      .maybeSingle();
    return { reconciliation: rec as Row | null };
  });
