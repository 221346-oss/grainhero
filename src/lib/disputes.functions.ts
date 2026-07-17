/**
 * Phase 14 — Buyer dispute lifecycle. All categories, resolutions, and
 * dispute window come from platform_settings.marketplace.disputes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";
import { logActivity } from "@/lib/activity";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const openDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      orderId: z.string().uuid(),
      category: z.string().min(1).max(60),
      description: z.string().min(10).max(4000),
      evidenceUrls: z.array(z.string().url()).max(10).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    if (!settings.disputes.enabled) throw new Error("Disputes are disabled");
    if (!settings.disputes.categories.find((c) => c.key === data.category)) {
      throw new Error("Unknown dispute category");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: order } = await sb.from("buyer_orders")
      .select("id, admin_id, buyer_id, status, delivered_at, completed_at, paid_at")
      .eq("id", data.orderId).single();
    const o = order as Row | null;
    if (!o) throw new Error("Order not found");
    const anchor = o.delivered_at || o.completed_at || o.paid_at;
    if (!anchor) throw new Error("Order not eligible for disputes yet");
    const days = (Date.now() - new Date(anchor).getTime()) / 86400000;
    if (days > settings.disputes.windowDays) {
      throw new Error(`Dispute window (${settings.disputes.windowDays} days) has closed`);
    }
    const { data: existing } = await sb.from("buyer_disputes")
      .select("id").eq("order_id", data.orderId).in("status", ["open", "under_review"]).maybeSingle();
    if (existing) throw new Error("A dispute is already open on this order");

    const { data: disp, error } = await sb.from("buyer_disputes").insert({
      order_id: data.orderId, admin_id: o.admin_id, buyer_id: o.buyer_id,
      category: data.category, description: data.description,
      evidence_urls: data.evidenceUrls ?? [], status: "open",
    } as never).select("id").single();
    if (error) throw error;
    const id = (disp as Row).id as string;
    await sb.from("buyer_dispute_events").insert({
      dispute_id: id, actor_user_id: context.userId, action: "opened",
      note: settings.disputes.categories.find((c) => c.key === data.category)?.label ?? data.category,
    } as never);
    await logActivity({
      actorId: context.userId, tenantAdminId: o.admin_id as string,
      action: "dispute.opened", targetType: "buyer_dispute", targetId: id,
      meta: { orderId: data.orderId, category: data.category },
    });
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, data.orderId, "disputeOpened");
    } catch { /* email is best-effort */ }
    return { id };
  });

export const listDisputes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    status: z.enum(["open", "under_review", "resolved", "rejected", "all"]).default("open"),
    limit: z.number().int().min(1).max(200).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    let q = sb.from("buyer_disputes")
      .select("*, buyer_orders(order_number, currency, subtotal), buyers(name, company_name)")
      .order("opened_at", { ascending: false }).limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    return { disputes: (rows ?? []) as Row[] };
  });

export const getDispute = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const [{ data: disp }, { data: events }] = await Promise.all([
      sb.from("buyer_disputes").select("*, buyer_orders(*), buyers(*)").eq("id", data.id).maybeSingle(),
      sb.from("buyer_dispute_events").select("*").eq("dispute_id", data.id).order("at", { ascending: true }),
    ]);
    if (!disp) throw new Error("Dispute not found");
    return { dispute: disp as Row, events: (events ?? []) as Row[] };
  });

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    disputeId: z.string().uuid(),
    resolutionKey: z.string().min(1),
    note: z.string().max(2000).optional(),
    refundAmount: z.number().min(0).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    const rez = settings.disputes.resolutions.find((r) => r.key === data.resolutionKey);
    if (!rez) throw new Error("Unknown resolution");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: disp } = await sb.from("buyer_disputes")
      .select("id, admin_id, order_id, status").eq("id", data.disputeId).single();
    const d0 = disp as Row | null;
    if (!d0) throw new Error("Dispute not found");

    const status = data.resolutionKey === "reject" ? "rejected" : "resolved";
    await sb.from("buyer_disputes").update({
      status, resolution_key: data.resolutionKey,
      resolution_note: data.note ?? null,
      refund_amount: data.refundAmount ?? null,
      moderated_by: context.userId,
      closed_at: new Date().toISOString(),
    } as never).eq("id", data.disputeId);
    await sb.from("buyer_dispute_events").insert({
      dispute_id: data.disputeId, actor_user_id: context.userId,
      action: `resolved:${data.resolutionKey}`, note: data.note ?? rez.label,
    } as never);
    await logActivity({
      actorId: context.userId, tenantAdminId: d0.admin_id as string,
      action: "dispute.resolved", targetType: "buyer_dispute", targetId: data.disputeId,
      meta: { resolutionKey: data.resolutionKey, refund: rez.refund },
    });
    try {
      const { sendBuyerOrderEmail } = await import("@/lib/buyer-emails.server");
      await sendBuyerOrderEmail(context.supabase, d0.order_id as string, "disputeResolved");
    } catch { /* email best-effort */ }
    return { ok: true, refund: rez.refund };
  });