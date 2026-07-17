/**
 * Phase 8 — Hardware order lifecycle & installation workflow.
 *
 * State machine (enforced server-side):
 *   pending_payment -> paid -> packing -> shipped -> in_transit -> installing -> completed
 *   any -> cancelled (super_admin only)
 *
 * Legacy statuses ("new","approved","tech_assigned","installed","live") are
 * normalized for reads via normalizeStatus() but never written.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireRole, getEffectiveRole } from "./rbac.server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

export const LIFECYCLE_STATUSES = [
  "pending_payment",
  "paid",
  "packing",
  "shipped",
  "in_transit",
  "installing",
  "completed",
  "cancelled",
  "refunded",
] as const;
export type LifecycleStatus = (typeof LIFECYCLE_STATUSES)[number];

const LEGACY_ALIAS: Record<string, LifecycleStatus> = {
  new: "paid",
  approved: "paid",
  tech_assigned: "installing",
  installed: "completed",
  live: "completed",
};

export function normalizeStatus(raw: string | null | undefined): LifecycleStatus {
  if (!raw) return "pending_payment";
  if ((LIFECYCLE_STATUSES as readonly string[]).includes(raw)) return raw as LifecycleStatus;
  return LEGACY_ALIAS[raw] ?? "pending_payment";
}

const ALLOWED_TRANSITIONS: Record<LifecycleStatus, LifecycleStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["packing", "shipped", "cancelled"],
  packing: ["shipped", "cancelled"],
  shipped: ["in_transit", "installing", "cancelled"],
  in_transit: ["installing", "cancelled"],
  installing: ["completed", "cancelled"],
  completed: ["refunded"],
  cancelled: [],
  refunded: [],
};

function assertTransition(from: LifecycleStatus, to: LifecycleStatus): void {
  if (from === to) return;
  const ok = ALLOWED_TRANSITIONS[from]?.includes(to);
  if (!ok) throw new Error(`Illegal status transition: ${from} -> ${to}`);
}

async function recordStatusChange(
  sb: unknown,
  args: { orderId: string; from: LifecycleStatus; to: LifecycleStatus; actorId: string; actorRole: string; note?: string | null },
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (sb as any).from("hardware_order_status_history").insert({
    order_id: args.orderId,
    from_status: args.from,
    to_status: args.to,
    actor_id: args.actorId,
    actor_role: args.actorRole,
    note: args.note ?? null,
  });
}

/* ---------------- Super-admin ---------------- */

export const assignTechnician = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      orderId: z.string().uuid(),
      technicianId: z.string().uuid(),
      scheduledFor: z.string().datetime().optional().nullable(),
      siloId: z.string().uuid().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: oErr } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id,status,admin_id")
      .eq("id", data.orderId)
      .single();
    if (oErr || !order) throw new Error("Order not found");
    const o = order as Row;
    const from = normalizeStatus(o.status);

    await supabaseAdmin
      .from("hardware_orders" as never)
      .update({ assigned_technician_id: data.technicianId } as never)
      .eq("id", data.orderId);

    const { data: existing } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin
        .from("hardware_order_installations" as never)
        .update({
          technician_id: data.technicianId,
          scheduled_for: data.scheduledFor ?? null,
          silo_id: data.siloId ?? null,
          status: "scheduled",
        } as never)
        .eq("id", (existing as Row).id);
    } else {
      await supabaseAdmin.from("hardware_order_installations" as never).insert({
        order_id: data.orderId,
        technician_id: data.technicianId,
        scheduled_for: data.scheduledFor ?? null,
        silo_id: data.siloId ?? null,
        status: "scheduled",
      } as never);
    }

    const { emitNotification } = await import("@/lib/notify");
    if (o.admin_id) {
      await emitNotification(supabaseAdmin, {
        recipientId: o.admin_id as string,
        tenantAdminId: o.admin_id as string,
        category: "install",
        severity: "info",
        title: "Technician assigned to your install",
        body: data.scheduledFor
          ? `Scheduled for ${new Date(data.scheduledFor).toLocaleString()}`
          : "You will receive a scheduling update shortly.",
        link: `/orders`,
        entityType: "hardware_order",
        entityId: data.orderId,
      });
    }
    await emitNotification(supabaseAdmin, {
      recipientId: data.technicianId,
      tenantAdminId: data.technicianId,
      category: "install",
      severity: "info",
      title: "New install assignment",
      body: `Order ${data.orderId.slice(0, 8)} was assigned to you.`,
      link: `/technician/installs`,
      entityType: "hardware_order",
      entityId: data.orderId,
    });

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId,
      tenantAdminId: (o.admin_id as string) ?? null,
      action: "order.technician_assigned",
      targetType: "hardware_order",
      targetId: data.orderId,
      meta: { technicianId: data.technicianId, from },
    });
    return { ok: true };
  });

export const markShipped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      orderId: z.string().uuid(),
      carrier: z.string().trim().min(1).max(80),
      trackingNumber: z.string().trim().min(1).max(120),
      expectedArrivalAt: z.string().datetime().optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id,status,admin_id")
      .eq("id", data.orderId)
      .single();
    if (!order) throw new Error("Order not found");
    const o = order as Row;
    const from = normalizeStatus(o.status);
    const to: LifecycleStatus = "shipped";
    if (from !== to) assertTransition(from, to);

    await supabaseAdmin
      .from("hardware_orders" as never)
      .update({
        status: to,
        shipped_at: new Date().toISOString(),
        tracking_carrier: data.carrier,
        tracking_number: data.trackingNumber,
        expected_arrival_at: data.expectedArrivalAt ?? null,
      } as never)
      .eq("id", data.orderId);

    if (from !== to) {
      await recordStatusChange(supabaseAdmin, {
        orderId: data.orderId, from, to,
        actorId: context.userId, actorRole: "super_admin",
        note: `Shipped via ${data.carrier} #${data.trackingNumber}`,
      });
    }

    const { emitNotification } = await import("@/lib/notify");
    if (o.admin_id) {
      await emitNotification(supabaseAdmin, {
        recipientId: o.admin_id as string,
        tenantAdminId: o.admin_id as string,
        category: "install",
        severity: "info",
        title: "Your hardware has shipped",
        body: `${data.carrier} · Tracking ${data.trackingNumber}${
          data.expectedArrivalAt ? ` · ETA ${new Date(data.expectedArrivalAt).toLocaleDateString()}` : ""
        }`,
        link: `/orders`,
        entityType: "hardware_order",
        entityId: data.orderId,
      });
    }
    return { ok: true };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id,status,admin_id")
      .eq("id", data.orderId)
      .single();
    if (!order) throw new Error("Order not found");
    const o = order as Row;
    const from = normalizeStatus(o.status);
    assertTransition(from, "cancelled");
    await supabaseAdmin
      .from("hardware_orders" as never)
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_reason: data.reason,
      } as never)
      .eq("id", data.orderId);
    await recordStatusChange(supabaseAdmin, {
      orderId: data.orderId, from, to: "cancelled",
      actorId: context.userId, actorRole: "super_admin", note: data.reason,
    });
    const { emitNotification } = await import("@/lib/notify");
    if (o.admin_id) {
      await emitNotification(supabaseAdmin, {
        recipientId: o.admin_id as string,
        tenantAdminId: o.admin_id as string,
        category: "install", severity: "warning",
        title: "Your install order was cancelled",
        body: data.reason, link: `/orders`,
        entityType: "hardware_order", entityId: data.orderId,
      });
    }
    return { ok: true };
  });

/* ---------------- Order detail (super-admin & tenant admin) ---------------- */

export const getOrderDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("hardware_orders" as never)
      .select("*")
      .eq("id", data.orderId)
      .single();
    if (error || !order) throw new Error("Order not found");
    const o = order as Row;

    const [installsRes, historyRes, devicesRes, buyerRes] = await Promise.all([
      context.supabase.from("hardware_order_installations" as never).select("*").eq("order_id", data.orderId).order("created_at", { ascending: false }),
      context.supabase.from("hardware_order_status_history" as never).select("*").eq("order_id", data.orderId).order("created_at", { ascending: false }),
      context.supabase.from("hardware_order_devices" as never).select("*").eq("order_id", data.orderId),
      o.admin_id ? context.supabase.from("profiles").select("id,name,email,phone").eq("id", o.admin_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    let technician: Row | null = null;
    if (o.assigned_technician_id) {
      const { data: t } = await context.supabase.from("profiles").select("id,name,email,phone").eq("id", o.assigned_technician_id).maybeSingle();
      technician = (t as Row) ?? null;
    }

    return {
      order: { ...o, status_normalized: normalizeStatus(o.status) } as Row,
      installs: (installsRes.data ?? []) as Row[],
      history: (historyRes.data ?? []) as Row[],
      devices: (devicesRes.data ?? []) as Row[],
      buyer: (buyerRes.data as Row) ?? null,
      technician,
    };
  });

/* ---------------- Technician ---------------- */

export const listMyInstalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["technician", "super_admin"].includes(role)) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("hardware_order_installations" as never)
      .select("*, hardware_orders(id, admin_id, status, shipping_city, shipping_address, customer_name, customer_email, expected_arrival_at, tracking_carrier, tracking_number)")
      .eq("technician_id", context.userId)
      .order("scheduled_for", { ascending: true });
    if (error) throw error;
    return { installs: (data ?? []) as Row[] };
  });

export const getInstallDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ installId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: install, error } = await context.supabase
      .from("hardware_order_installations" as never)
      .select("*, hardware_orders(*)")
      .eq("id", data.installId)
      .single();
    if (error || !install) throw new Error("Install not found");
    const inst = install as Row;

    const [devicesRes, eventsRes, silosRes, buyerRes] = await Promise.all([
      context.supabase.from("hardware_order_devices" as never).select("*").eq("order_id", inst.order_id),
      context.supabase.from("hardware_order_visit_events" as never).select("*").eq("installation_id", inst.id).order("created_at", { ascending: false }),
      inst.hardware_orders?.admin_id
        ? context.supabase.from("silos").select("id,name,warehouse_id").eq("admin_id", inst.hardware_orders.admin_id)
        : Promise.resolve({ data: [] }),
      inst.hardware_orders?.admin_id
        ? context.supabase.from("profiles").select("id,name,email,phone").eq("id", inst.hardware_orders.admin_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    return {
      install: inst,
      devices: (devicesRes.data ?? []) as Row[],
      events: (eventsRes.data ?? []) as Row[],
      silos: (silosRes.data ?? []) as Row[],
      buyer: (buyerRes.data as Row) ?? null,
    };
  });

export const updateInstallStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      installId: z.string().uuid(),
      status: z.enum(["scheduled", "en_route", "onsite", "completed", "blocked"]),
      blockerNote: z.string().trim().max(500).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["technician", "super_admin"].includes(role)) throw new Error("Forbidden");
    const { data: install } = await context.supabase
      .from("hardware_order_installations" as never)
      .select("id, order_id, technician_id, status")
      .eq("id", data.installId)
      .single();
    if (!install) throw new Error("Install not found");
    const inst = install as Row;
    if (role === "technician" && inst.technician_id !== context.userId) throw new Error("Forbidden");

    const patch: Row = { status: data.status };
    if (data.status === "blocked") patch.blocker_note = data.blockerNote ?? null;
    if (data.status === "completed") patch.completed_at = new Date().toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("hardware_order_installations" as never).update(patch as never).eq("id", data.installId);

    if (data.status === "onsite" || data.status === "en_route") {
      await supabaseAdmin.from("hardware_orders" as never).update({ status: "installing" } as never).eq("id", inst.order_id);
    }
    if (data.status === "completed") {
      await supabaseAdmin.from("hardware_orders" as never).update({ status: "completed", installed_at: new Date().toISOString() } as never).eq("id", inst.order_id);
    }

    const { emitNotification } = await import("@/lib/notify");
    const { data: order } = await supabaseAdmin.from("hardware_orders" as never).select("admin_id").eq("id", inst.order_id).single();
    const adminId = (order as Row | null)?.admin_id as string | undefined;
    if (adminId) {
      await emitNotification(supabaseAdmin, {
        recipientId: adminId, tenantAdminId: adminId,
        category: "install",
        severity: data.status === "blocked" ? "warning" : "info",
        title: `Install ${data.status.replace("_", " ")}`,
        body: data.status === "blocked"
          ? `Blocked: ${data.blockerNote ?? "reason unspecified"}`
          : `Your installation is now ${data.status.replace("_", " ")}.`,
        link: `/orders`,
        entityType: "hardware_order", entityId: inst.order_id,
      });
    }
    return { ok: true };
  });

export const logVisitEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      installId: z.string().uuid(),
      eventType: z.enum(["arrived", "inspection", "install", "test", "handover", "issue"]),
      note: z.string().trim().max(1000).optional().nullable(),
      photoUrls: z.array(z.string().url()).max(10).optional(),
      location: z.object({ lat: z.number(), lng: z.number() }).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["technician", "super_admin"].includes(role)) throw new Error("Forbidden");
    const { data: install } = await context.supabase
      .from("hardware_order_installations" as never)
      .select("id, order_id, technician_id")
      .eq("id", data.installId)
      .single();
    if (!install) throw new Error("Install not found");
    const inst = install as Row;
    if (role === "technician" && inst.technician_id !== context.userId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("hardware_order_visit_events" as never).insert({
      installation_id: data.installId,
      order_id: inst.order_id,
      event_type: data.eventType,
      note: data.note ?? null,
      photo_urls: data.photoUrls ?? [],
      location: data.location ?? null,
      actor_id: context.userId,
    } as never);
    return { ok: true };
  });

export const commissionDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      installId: z.string().uuid(),
      orderDeviceId: z.string().uuid(),
      serialNumber: z.string().trim().min(3).max(80),
      siloId: z.string().uuid(),
      deviceType: z.string().trim().min(1).max(60).default("sensor"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["technician", "super_admin"].includes(role)) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: install } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id, order_id, technician_id, silo_id")
      .eq("id", data.installId)
      .single();
    if (!install) throw new Error("Install not found");
    const inst = install as Row;
    if (role === "technician" && inst.technician_id !== context.userId) throw new Error("Forbidden");

    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id, admin_id")
      .eq("id", inst.order_id)
      .single();
    const adminId = (order as Row).admin_id as string;

    const { data: sensor, error: sErr } = await supabaseAdmin
      .from("sensor_devices" as never)
      .insert({
        admin_id: adminId,
        silo_id: data.siloId,
        serial_number: data.serialNumber,
        device_type: data.deviceType,
        status: "active",
        commissioned_at: new Date().toISOString(),
      } as never)
      .select("id")
      .single();
    if (sErr) throw sErr;

    await supabaseAdmin
      .from("hardware_order_devices" as never)
      .update({
        sensor_device_id: (sensor as Row).id,
        commissioned_at: new Date().toISOString(),
        serial_number: data.serialNumber,
      } as never)
      .eq("id", data.orderDeviceId);

    const { data: pending } = await supabaseAdmin
      .from("hardware_order_devices" as never)
      .select("id")
      .eq("order_id", inst.order_id)
      .is("commissioned_at", null);
    if (!pending || pending.length === 0) {
      await supabaseAdmin.from("hardware_order_installations" as never).update({ status: "completed", completed_at: new Date().toISOString() } as never).eq("id", data.installId);
      await supabaseAdmin.from("hardware_orders" as never).update({ status: "completed", installed_at: new Date().toISOString() } as never).eq("id", inst.order_id);
    }

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId,
      tenantAdminId: adminId,
      action: "device.commissioned",
      targetType: "sensor_device",
      targetId: (sensor as Row).id,
      meta: { orderId: inst.order_id, serial: data.serialNumber },
    });
    return { ok: true, sensorId: (sensor as Row).id };
  });

/* ---------------- Admin (buyer) tracker ---------------- */

export const getMyOrderTracker = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: order, error } = await context.supabase
      .from("hardware_orders" as never)
      .select("*")
      .eq("id", data.orderId)
      .eq("admin_id", context.userId)
      .single();
    if (error || !order) throw new Error("Order not found");
    const o = order as Row;

    const [historyRes, installsRes, eventsRes] = await Promise.all([
      context.supabase.from("hardware_order_status_history" as never).select("from_status,to_status,note,created_at").eq("order_id", data.orderId).order("created_at", { ascending: true }),
      context.supabase.from("hardware_order_installations" as never).select("id,status,scheduled_for,completed_at,blocker_note").eq("order_id", data.orderId),
      context.supabase.from("hardware_order_visit_events" as never).select("event_type,note,created_at").eq("order_id", data.orderId).order("created_at", { ascending: true }),
    ]);

    return {
      order: { ...o, status_normalized: normalizeStatus(o.status) } as Row,
      history: (historyRes.data ?? []) as Row[],
      installs: (installsRes.data ?? []) as Row[],
      events: (eventsRes.data ?? []) as Row[],
    };
  });

/* ---------------- Helpers ---------------- */

export const listTechniciansForAssignment = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: techIds } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "technician");
    const ids = (techIds ?? []).map((r) => (r as Row).user_id as string);
    if (ids.length === 0) return { technicians: [] as Row[] };
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id,name,email,phone").in("id", ids);
    return { technicians: (profiles ?? []) as Row[] };
  });
