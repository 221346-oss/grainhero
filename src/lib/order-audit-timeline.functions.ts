/**
 * Phase 17.5 — Order/shipment audit timeline.
 * Merges buyer_shipment_events, buyer_order_events, and activity_logs
 * into a single filterable timeline visible to super-admins and to the
 * order's own buyer/seller.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export type TimelineEntry = {
  id: string;
  source: "shipment_event" | "order_event" | "activity_log";
  kind: string;
  actorRole: string | null;
  actorName: string | null;
  from: string | null;
  to: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export const getOrderAuditTimeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      orderId: z.string().uuid(),
      sources: z.array(z.enum(["shipment_event", "order_event", "activity_log"])).optional(),
      actorRole: z.string().optional(),
      manualOnly: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    // Authorise: super_admin, or the buyer/seller on the order.
    const { data: order } = await sb
      .from("buyer_orders")
      .select("id, admin_id, buyer_id, order_number, status")
      .eq("id", data.orderId).maybeSingle();
    if (!order) throw new Error("Order not found");
    const { data: role } = await sb.rpc("get_my_role", { _user_id: context.userId });
    const isSuper = role === "super_admin";
    const { data: prof } = await sb.from("profiles").select("admin_id").eq("id", context.userId).maybeSingle();
    const tenantAdminId = prof?.admin_id ?? context.userId;
    const isSeller = order.admin_id === tenantAdminId;
    const { data: buyer } = await sb.from("buyer_accounts").select("id").eq("user_id", context.userId).maybeSingle();
    const isBuyer = buyer?.id && buyer.id === order.buyer_id;
    if (!isSuper && !isSeller && !isBuyer) throw new Error("Forbidden");

    const wantShip = !data.sources || data.sources.includes("shipment_event");
    const wantOrder = !data.sources || data.sources.includes("order_event");
    const wantActivity = !data.sources || data.sources.includes("activity_log");

    const [shipEvents, orderEvents, shipRows, activityRows] = await Promise.all([
      wantShip
        ? sb.from("buyer_shipment_events")
            .select("id, event_code, note, metadata, created_at, actor_id, actor_role, is_manual, shipment_id, buyer_shipments!inner(order_id)")
            .eq("buyer_shipments.order_id", data.orderId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      wantOrder
        ? sb.from("buyer_order_events")
            .select("id, from_state, to_state, note, metadata, created_at, actor_id, actor_role")
            .eq("order_id", data.orderId)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      wantShip
        ? sb.from("buyer_shipments").select("id").eq("order_id", data.orderId)
        : Promise.resolve({ data: [] }),
      wantActivity
        ? sb.from("activity_logs")
            .select("id, action, category, description, severity, user_role, user_name, metadata, created_at, entity_ref")
            .eq("entity_ref", data.orderId)
            .order("created_at", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [] }),
    ]);

    // Collect actor names lazily.
    const actorIds = new Set<string>();
    for (const r of ((shipEvents.data ?? []) as Row[])) if (r.actor_id) actorIds.add(r.actor_id);
    for (const r of ((orderEvents.data ?? []) as Row[])) if (r.actor_id) actorIds.add(r.actor_id);
    const { data: actors } = actorIds.size
      ? await sb.from("profiles").select("id, name, email").in("id", Array.from(actorIds))
      : { data: [] };
    const nameOf = new Map((actors ?? []).map((a: Row) => [a.id, a.name ?? a.email ?? a.id]));

    const merged: TimelineEntry[] = [];

    for (const r of ((shipEvents.data ?? []) as Row[])) {
      if (data.manualOnly && !r.is_manual) continue;
      if (data.actorRole && r.actor_role && r.actor_role !== data.actorRole) continue;
      merged.push({
        id: `s-${r.id}`,
        source: "shipment_event",
        kind: r.event_code,
        actorRole: r.actor_role ?? null,
        actorName: (nameOf.get(r.actor_id) as string) ?? null,
        from: null,
        to: r.event_code,
        note: r.note ?? null,
        metadata: (r.metadata ?? null) as Record<string, unknown> | null,
        createdAt: r.created_at,
      });
    }
    for (const r of ((orderEvents.data ?? []) as Row[])) {
      if (data.actorRole && r.actor_role && r.actor_role !== data.actorRole) continue;
      merged.push({
        id: `o-${r.id}`,
        source: "order_event",
        kind: `${r.from_state ?? "—"} → ${r.to_state}`,
        actorRole: r.actor_role ?? null,
        actorName: (nameOf.get(r.actor_id) as string) ?? null,
        from: r.from_state ?? null,
        to: r.to_state,
        note: r.note ?? null,
        metadata: (r.metadata ?? null) as Record<string, unknown> | null,
        createdAt: r.created_at,
      });
    }
    for (const r of ((activityRows.data ?? []) as Row[])) {
      if (data.actorRole && r.user_role && r.user_role !== data.actorRole) continue;
      merged.push({
        id: `a-${r.id}`,
        source: "activity_log",
        kind: r.action,
        actorRole: r.user_role ?? null,
        actorName: r.user_name ?? null,
        from: null,
        to: null,
        note: r.description ?? null,
        metadata: (r.metadata ?? null) as Record<string, unknown> | null,
        createdAt: r.created_at,
      });
    }

    merged.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    return {
      order: { id: order.id, orderNumber: order.order_number, status: order.status },
      shipmentIds: ((shipRows.data ?? []) as Row[]).map((r) => r.id as string),
      entries: merged,
      counts: {
        shipment_event: ((shipEvents.data ?? []) as Row[]).length,
        order_event: ((orderEvents.data ?? []) as Row[]).length,
        activity_log: ((activityRows.data ?? []) as Row[]).length,
      },
    };
  });
