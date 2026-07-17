/**
 * Phase 16 — Returns / RMA workflow.
 * Buyers request; sellers approve/deny/receive; super-admins can intervene.
 * Finalization ties into the existing Phase 14 refund flow.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emitNotification } from "@/lib/notify";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function requireRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  userId: string,
  allowed: string[],
): Promise<string> {
  const { data } = await sb.rpc("get_my_role", { _user_id: userId });
  const r = (data as string) ?? "";
  if (!allowed.includes(r)) throw new Error("Forbidden");
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveOrder(sb: any, orderId: string): Promise<Row> {
  const { data } = await sb.from("buyer_orders")
    .select("id, admin_id, order_number, subtotal, currency, delivered_at, buyer_account_id")
    .eq("id", orderId).maybeSingle();
  const o = data as Row | null;
  if (!o) throw new Error("Order not found");
  let buyerUserId: string | null = null;
  if (o.buyer_account_id) {
    const { data: acc } = await sb.from("buyer_accounts")
      .select("user_id").eq("id", o.buyer_account_id).maybeSingle();
    buyerUserId = (acc as Row | null)?.user_id ?? null;
  }
  return { ...o, buyerUserId } as Row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertEvent(sb: any, args: {
  returnId: string; fromState: string | null; toState: string;
  actorUserId: string; actorRole: string; note?: string | null;
}) {
  await sb.from("buyer_return_events").insert({
    return_id: args.returnId, from_state: args.fromState, to_state: args.toState,
    actor_user_id: args.actorUserId, actor_role: args.actorRole, note: args.note ?? null,
  } as never);
}

export const requestReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    orderId: z.string().uuid(),
    reasonKey: z.string().min(1),
    requestedQty: z.number().positive().optional(),
    notes: z.string().max(2000).optional(),
    attachments: z.array(z.object({
      path: z.string(), name: z.string(), size: z.number().optional(),
    })).max(10).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    if (!settings.returns.enabled) throw new Error("Returns disabled");
    const reason = settings.returns.reasons.find((r) => r.key === data.reasonKey);
    if (!reason) throw new Error("Unknown return reason");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const order = await resolveOrder(sb, data.orderId);
    if (order.buyerUserId !== context.userId) throw new Error("Only the buyer can request a return");
    if (!order.delivered_at) throw new Error("Order not yet delivered");
    const daysSince = (Date.now() - new Date(order.delivered_at as string).getTime()) / 86400_000;
    if (daysSince > settings.returns.windowDays) throw new Error(`Return window (${settings.returns.windowDays}d) has closed`);

    const { data: ins, error } = await sb.from("buyer_returns").insert({
      order_id: order.id, admin_id: order.admin_id,
      buyer_user_id: context.userId,
      reason_key: data.reasonKey, reason_label: reason.label,
      requested_qty: data.requestedQty ?? null,
      notes: data.notes ?? null,
      attachments: (data.attachments ?? []) as never,
      status: "requested",
    } as never).select("id").single();
    if (error) throw error;
    const rid = (ins as Row).id as string;

    await insertEvent(sb, {
      returnId: rid, fromState: null, toState: "requested",
      actorUserId: context.userId, actorRole: "buyer",
      note: `Reason: ${reason.label}${data.notes ? ` — ${data.notes}` : ""}`,
    });

    // Notify seller in-app + email.
    void emitNotification(sb, {
      recipientId: order.admin_id as string, tenantAdminId: order.admin_id as string,
      category: "order", severity: "warning",
      title: `Return requested on order ${order.order_number ?? ""}`.trim(),
      body: `${reason.label}${data.notes ? ` — ${data.notes}` : ""}`,
      link: `/returns`, entityType: "buyer_return", entityId: rid,
    });
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, order.id as string, "returnRequested" as never);
    } catch { /* best effort */ }

    await logActivity({
      actorId: context.userId, tenantAdminId: order.admin_id as string,
      action: "return.requested", targetType: "buyer_return", targetId: rid,
      meta: { orderId: order.id, reason: data.reasonKey },
    });
    return { returnId: rid };
  });

export const approveReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    returnId: z.string().uuid(),
    resolutionKey: z.string().min(1),
    note: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    const resolution = settings.returns.resolutions.find((r) => r.key === data.resolutionKey);
    if (!resolution) throw new Error("Unknown resolution");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const role = await requireRole(sb, context.userId, ["admin", "manager", "super_admin"]);
    const { data: r } = await sb.from("buyer_returns").select("*").eq("id", data.returnId).maybeSingle();
    const ret = r as Row | null;
    if (!ret) throw new Error("Return not found");
    if (role !== "super_admin" && ret.admin_id !== context.userId) throw new Error("Forbidden");
    if (ret.status !== "requested") throw new Error(`Cannot approve from status ${ret.status}`);

    await sb.from("buyer_returns").update({
      status: "approved", resolution: resolution.key,
    } as never).eq("id", data.returnId);
    await insertEvent(sb, {
      returnId: data.returnId, fromState: ret.status, toState: "approved",
      actorUserId: context.userId, actorRole: role, note: data.note ?? resolution.label,
    });

    if (ret.buyer_user_id) {
      void emitNotification(sb, {
        recipientId: ret.buyer_user_id as string, tenantAdminId: ret.admin_id as string,
        category: "order", severity: "success",
        title: `Return approved`, body: resolution.label,
        link: `/buyer/orders/${ret.order_id}`,
        entityType: "buyer_return", entityId: data.returnId,
      });
    }
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, ret.order_id as string, "returnApproved" as never);
    } catch { /* noop */ }
    return { ok: true };
  });

export const denyReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    returnId: z.string().uuid(), note: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const role = await requireRole(sb, context.userId, ["admin", "manager", "super_admin"]);
    const { data: r } = await sb.from("buyer_returns").select("*").eq("id", data.returnId).maybeSingle();
    const ret = r as Row | null;
    if (!ret) throw new Error("Return not found");
    if (role !== "super_admin" && ret.admin_id !== context.userId) throw new Error("Forbidden");
    await sb.from("buyer_returns").update({
      status: "denied", resolution: "reject", resolved_at: new Date().toISOString(),
    } as never).eq("id", data.returnId);
    await insertEvent(sb, {
      returnId: data.returnId, fromState: ret.status, toState: "denied",
      actorUserId: context.userId, actorRole: role, note: data.note ?? null,
    });
    if (ret.buyer_user_id) {
      void emitNotification(sb, {
        recipientId: ret.buyer_user_id as string, tenantAdminId: ret.admin_id as string,
        category: "order", severity: "warning",
        title: `Return denied`, body: data.note ?? "See order for details.",
        link: `/buyer/orders/${ret.order_id}`,
        entityType: "buyer_return", entityId: data.returnId,
      });
    }
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, ret.order_id as string, "returnDenied" as never);
    } catch { /* noop */ }
    return { ok: true };
  });

export const markReturnReceived = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    returnId: z.string().uuid(), note: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const role = await requireRole(sb, context.userId, ["admin", "manager", "super_admin"]);
    const { data: r } = await sb.from("buyer_returns").select("*").eq("id", data.returnId).maybeSingle();
    const ret = r as Row | null;
    if (!ret) throw new Error("Return not found");
    if (role !== "super_admin" && ret.admin_id !== context.userId) throw new Error("Forbidden");
    await sb.from("buyer_returns").update({ status: "received" } as never).eq("id", data.returnId);
    await insertEvent(sb, {
      returnId: data.returnId, fromState: ret.status, toState: "received",
      actorUserId: context.userId, actorRole: role, note: data.note ?? null,
    });
    return { ok: true };
  });

export const finalizeReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    returnId: z.string().uuid(),
    refundAmount: z.number().positive().optional(),
    note: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const role = await requireRole(sb, context.userId, ["admin", "manager", "super_admin"]);
    const { data: r } = await sb.from("buyer_returns").select("*").eq("id", data.returnId).maybeSingle();
    const ret = r as Row | null;
    if (!ret) throw new Error("Return not found");
    if (role !== "super_admin" && ret.admin_id !== context.userId) throw new Error("Forbidden");
    if (!["approved", "received"].includes(ret.status as string)) {
      throw new Error(`Cannot finalize from status ${ret.status}`);
    }

    let refundId: string | null = null;
    const resolution = ret.resolution as string | null;
    if (resolution === "refund_full" || resolution === "refund_partial") {
      const { initiateRefund } = await import("@/lib/refunds.functions");
      try {
        const res = await initiateRefund({
          data: {
            orderId: ret.order_id as string,
            reasonKey: "quality",
            amount: data.refundAmount,
          },
        });
        refundId = res.refundId;
      } catch (e) {
        throw new Error(`Refund failed: ${(e as Error).message}`);
      }
    }
    await sb.from("buyer_returns").update({
      status: "refunded", refund_id: refundId, resolved_at: new Date().toISOString(),
    } as never).eq("id", data.returnId);
    await insertEvent(sb, {
      returnId: data.returnId, fromState: ret.status, toState: "refunded",
      actorUserId: context.userId, actorRole: role,
      note: data.note ?? (refundId ? `Refund ${refundId} issued` : "Closed"),
    });
    if (ret.buyer_user_id) {
      void emitNotification(sb, {
        recipientId: ret.buyer_user_id as string, tenantAdminId: ret.admin_id as string,
        category: "billing", severity: "success",
        title: `Refund issued`, body: `Refund processed for your return.`,
        link: `/buyer/orders/${ret.order_id}`,
        entityType: "buyer_return", entityId: data.returnId,
      });
    }
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, ret.order_id as string, "returnRefunded" as never);
    } catch { /* noop */ }
    return { ok: true, refundId };
  });

export const listReturns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    scope: z.enum(["mine-seller","mine-buyer","platform"]).default("mine-seller"),
    status: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let q = sb.from("buyer_returns")
      .select("*, buyer_orders(order_number)")
      .order("created_at", { ascending: false }).limit(200);
    if (data.scope === "mine-seller") q = q.eq("admin_id", context.userId);
    else if (data.scope === "mine-buyer") q = q.eq("buyer_user_id", context.userId);
    else {
      const { data: role } = await sb.rpc("get_my_role", { _user_id: context.userId });
      if (role !== "super_admin") throw new Error("Forbidden");
    }
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { returns: (rows ?? []) as Row[] };
  });

export const getReturnDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ returnId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [{ data: ret }, { data: events }] = await Promise.all([
      sb.from("buyer_returns").select("*, buyer_orders(order_number, currency, subtotal)").eq("id", data.returnId).maybeSingle(),
      sb.from("buyer_return_events").select("*").eq("return_id", data.returnId).order("created_at", { ascending: true }),
    ]);
    return { return: ret ?? null, events: events ?? [] };
  });