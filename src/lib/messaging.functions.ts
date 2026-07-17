/**
 * Phase 16 — Order-scoped buyer↔seller messaging with moderation.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { emitNotification } from "@/lib/notify";
import { loadMarketplaceSettings } from "@/lib/marketplace-settings.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

async function resolveOrderParties(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  orderId: string,
): Promise<{ adminId: string; buyerUserId: string | null; orderNumber: string | null } | null> {
  const { data } = await sb.from("buyer_orders")
    .select("admin_id, order_number, buyer_account_id")
    .eq("id", orderId).maybeSingle();
  const o = data as Row | null;
  if (!o) return null;
  let buyerUserId: string | null = null;
  if (o.buyer_account_id) {
    const { data: acc } = await sb.from("buyer_accounts")
      .select("user_id").eq("id", o.buyer_account_id).maybeSingle();
    buyerUserId = (acc as Row | null)?.user_id ?? null;
  }
  return { adminId: o.admin_id as string, buyerUserId, orderNumber: o.order_number ?? null };
}

function detectModeration(body: string, keywords: string[]): string | null {
  const lc = body.toLowerCase();
  for (const k of keywords) {
    if (k && lc.includes(k.toLowerCase())) return `Matched keyword: ${k}`;
  }
  return null;
}

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    orderId: z.string().uuid(),
    body: z.string().min(1).max(20000),
    attachments: z.array(z.object({
      path: z.string(), name: z.string(), size: z.number().optional(),
    })).max(10).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const settings = await loadMarketplaceSettings(context.supabase);
    if (!settings.messaging.enabled) throw new Error("Messaging disabled");
    if (data.body.length > settings.messaging.maxBodyChars) {
      throw new Error(`Message exceeds ${settings.messaging.maxBodyChars} characters`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const parties = await resolveOrderParties(sb, data.orderId);
    if (!parties) throw new Error("Order not found");

    const isSeller = parties.adminId === context.userId;
    const isBuyer = parties.buyerUserId === context.userId;
    const { data: roleData } = await sb.rpc("get_my_role", { _user_id: context.userId });
    const isSuper = roleData === "super_admin";
    if (!isSeller && !isBuyer && !isSuper) throw new Error("Forbidden");

    const senderRole = isSeller ? "seller" : isBuyer ? "buyer" : "super_admin";
    const modReason = detectModeration(data.body, settings.messaging.autoModerationKeywords);

    const { data: inserted, error } = await sb.from("buyer_order_messages").insert({
      order_id: data.orderId, admin_id: parties.adminId,
      sender_user_id: context.userId, sender_role: senderRole,
      body: data.body,
      attachments: (data.attachments ?? []) as never,
      moderated_at: modReason ? new Date().toISOString() : null,
      moderation_reason: modReason,
      moderated_by: modReason ? context.userId : null,
    } as never).select("id").single();
    if (error) throw error;

    // Notify the other side.
    const recipientId = senderRole === "buyer" ? parties.adminId : parties.buyerUserId;
    if (recipientId) {
      void emitNotification(sb, {
        recipientId, tenantAdminId: parties.adminId,
        category: "order", severity: modReason ? "warning" : "info",
        title: `New message on order ${parties.orderNumber ?? ""}`.trim(),
        body: data.body.slice(0, 240),
        link: senderRole === "buyer" ? `/platform/orders/${data.orderId}` : `/buyer/orders/${data.orderId}`,
        entityType: "buyer_order", entityId: data.orderId,
      });
    }
    return { id: (inserted as Row).id as string, moderated: !!modReason };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: rows, error } = await sb.from("buyer_order_messages")
      .select("*").eq("order_id", data.orderId).order("created_at", { ascending: true });
    if (error) throw error;
    return { messages: (rows ?? []) as Row[] };
  });

export const markMessagesRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid(), as: z.enum(["seller","buyer"]) }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const nowIso = new Date().toISOString();
    const col = data.as === "seller" ? "read_by_seller_at" : "read_by_buyer_at";
    await sb.from("buyer_order_messages")
      .update({ [col]: nowIso } as never)
      .eq("order_id", data.orderId)
      .is(col, null);
    const zero = data.as === "seller"
      ? { unread_seller_messages: 0 }
      : { unread_buyer_messages: 0 };
    await sb.from("buyer_orders").update(zero as never).eq("id", data.orderId);
    return { ok: true };
  });

export const listFlaggedMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: role } = await sb.rpc("get_my_role", { _user_id: context.userId });
    if (role !== "super_admin") throw new Error("Forbidden");
    const { data: rows } = await sb.from("buyer_order_messages")
      .select("*, buyer_orders(order_number)")
      .not("moderation_reason", "is", null)
      .order("created_at", { ascending: false }).limit(200);
    return { messages: (rows ?? []) as Row[] };
  });

export const moderateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({
    messageId: z.string().uuid(),
    action: z.enum(["approve","hide"]),
    reason: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const { data: role } = await sb.rpc("get_my_role", { _user_id: context.userId });
    if (role !== "super_admin") throw new Error("Forbidden");
    const patch = data.action === "approve"
      ? { moderated_at: null, moderated_by: null, moderation_reason: null }
      : { moderated_at: new Date().toISOString(), moderated_by: context.userId, moderation_reason: data.reason ?? "hidden by super_admin" };
    const { error } = await sb.from("buyer_order_messages")
      .update(patch as never).eq("id", data.messageId);
    if (error) throw error;
    return { ok: true };
  });