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
  args: {
    orderId: string;
    from: LifecycleStatus;
    to: LifecycleStatus;
    actorId: string;
    actorRole: string;
    note?: string | null;
  },
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
    z
      .object({
        orderId: z.string().uuid(),
        technicianId: z.string().uuid(),
        scheduledFor: z.string().datetime().optional().nullable(),
        siloId: z.string().uuid().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order, error: oErr } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id,status,admin_id,assigned_technician_id")
      .eq("id", data.orderId)
      .single();
    if (oErr || !order) throw new Error("Order not found");
    const o = order as Row;
    const from = normalizeStatus(o.status);

    const prevTechnicianId = (o.assigned_technician_id as string | null) ?? null;

    // Respect the technician's self-declared availability AND capacity: a
    // technician who set on_leave/offline, or who is already at their max
    // concurrent jobs, must not receive new tasks. Same-tech re-assignment is
    // a no-op (no new slot is taken), so it is allowed.
    const { data: techProfile } = await supabaseAdmin
      .from("profiles")
      .select("technician_status, current_job_count, max_concurrent_jobs")
      .eq("id", data.technicianId)
      .maybeSingle();
    if (techProfile) {
      const tp = techProfile as Row;
      if (["on_leave", "offline"].includes(tp.technician_status)) {
        throw new Error(
          "This technician is unavailable (on leave / offline) — they must set themselves available first.",
        );
      }
      const atCapacity = (tp.current_job_count ?? 0) >= (tp.max_concurrent_jobs ?? 3);
      if (atCapacity && prevTechnicianId !== data.technicianId) {
        throw new Error(
          `This technician is at capacity (${tp.current_job_count ?? 0}/${tp.max_concurrent_jobs ?? 3}). Complete an install, reassign one, or raise their max concurrent jobs first.`,
        );
      }
    }

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
      // Do NOT reset the install's status on (re)assignment — the
      // enforce_install_status_forward trigger rejects moving an install
      // backward (e.g. completed -> scheduled), which used to abort the whole
      // assignment and left the order assigned but the install row without a
      // technician. Only the technician/schedule/silo are updated.
      await supabaseAdmin
        .from("hardware_order_installations" as never)
        .update({
          technician_id: data.technicianId,
          scheduled_for: data.scheduledFor ?? null,
          silo_id: data.siloId ?? null,
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

    // Keep the technician's live job counter in sync: release the previous
    // technician's slot when reassigning, then take a slot for the new one.
    // (The decrement RPC is what was missing — the count only ever grew.)
    try {
      if (prevTechnicianId && prevTechnicianId !== data.technicianId) {
        await supabaseAdmin.rpc("decrement_technician_jobs", {
          tech_id: prevTechnicianId,
        } as never);
      }
      if (prevTechnicianId !== data.technicianId) {
        await supabaseAdmin.rpc("increment_technician_jobs", {
          tech_id: data.technicianId,
        } as never);
      }
    } catch (e) {
      console.warn("[assignTechnician] job count sync failed (non-fatal):", e);
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
    z
      .object({
        orderId: z.string().uuid(),
        carrier: z.string().trim().min(1).max(80),
        trackingNumber: z.string().trim().min(1).max(120),
        expectedArrivalAt: z.string().datetime().optional().nullable(),
        driverName: z.string().trim().max(80).optional().nullable(),
        driverPhone: z.string().trim().max(40).optional().nullable(),
        vehiclePlate: z.string().trim().max(40).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id,status,admin_id,assigned_technician_id")
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
        driver_name: data.driverName ?? null,
        driver_phone: data.driverPhone ?? null,
        vehicle_plate: data.vehiclePlate ?? null,
      } as never)
      .eq("id", data.orderId);

    if (from !== to) {
      await recordStatusChange(supabaseAdmin, {
        orderId: data.orderId,
        from,
        to,
        actorId: context.userId,
        actorRole: "super_admin",
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
          data.expectedArrivalAt
            ? ` · ETA ${new Date(data.expectedArrivalAt).toLocaleDateString()}`
            : ""
        }${data.driverName ? ` · Driver: ${data.driverName}${data.driverPhone ? ` (${data.driverPhone})` : ""}` : ""}`,
        link: `/orders`,
        entityType: "hardware_order",
        entityId: data.orderId,
      });
    }
    return { ok: true };
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({ orderId: z.string().uuid(), reason: z.string().trim().min(3).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id,status,admin_id,assigned_technician_id")
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
      orderId: data.orderId,
      from,
      to: "cancelled",
      actorId: context.userId,
      actorRole: "super_admin",
      note: data.reason,
    });

    // A cancelled order is no longer a live job for the assigned technician.
    if (o.assigned_technician_id) {
      try {
        await supabaseAdmin.rpc("decrement_technician_jobs", {
          tech_id: o.assigned_technician_id,
        } as never);
      } catch (e) {
        console.warn("[cancelOrder] job count sync failed (non-fatal):", e);
      }
    }
    const { emitNotification } = await import("@/lib/notify");
    if (o.admin_id) {
      await emitNotification(supabaseAdmin, {
        recipientId: o.admin_id as string,
        tenantAdminId: o.admin_id as string,
        category: "install",
        severity: "warning",
        title: "Your install order was cancelled",
        body: data.reason,
        link: `/orders`,
        entityType: "hardware_order",
        entityId: data.orderId,
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
      context.supabase
        .from("hardware_order_installations" as never)
        .select("*")
        .eq("order_id", data.orderId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("hardware_order_status_history" as never)
        .select("*")
        .eq("order_id", data.orderId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("hardware_order_devices" as never)
        .select("*")
        .eq("order_id", data.orderId),
      o.admin_id
        ? context.supabase
            .from("profiles")
            .select("id,name,email,phone")
            .eq("id", o.admin_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    let technician: Row | null = null;
    if (o.assigned_technician_id) {
      const { data: t } = await context.supabase
        .from("profiles")
        .select("id,name,email,phone")
        .eq("id", o.assigned_technician_id)
        .maybeSingle();
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
    // Service-role read: RLS has no policy letting a technician read installs
    // assigned to them (the technician RLS migration is still pending), so the
    // caller's own client would silently return zero rows — the "no assigned
    // tasks visible" bug. Role + technician_id scoping below are the
    // authorized path for this privileged read.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const SELECT =
      "*, hardware_orders(id, admin_id, status, customer_name, customer_email, install_city, install_country, install_address, expected_arrival_at, tracking_carrier, tracking_number)";
    // The assignment can be stored in two places: the install row's
    // technician_id (set by the assign sheet) OR the order's
    // assigned_technician_id (the trigger-guarded status update can abort the
    // install write, leaving only the order-level assignment). Match both.
    const [byTechRes, ordersRes] = await Promise.all([
      supabaseAdmin
        .from("hardware_order_installations" as never)
        .select(SELECT)
        .eq("technician_id", context.userId),
      supabaseAdmin
        .from("hardware_orders" as never)
        .select("id")
        .eq("assigned_technician_id", context.userId),
    ]);
    if (byTechRes.error) throw byTechRes.error;
    const byTech = (byTechRes.data ?? []) as Row[];
    const orderIds = new Set(((ordersRes.data ?? []) as Row[]).map((o) => o.id as string));
    let installs = byTech;
    if (orderIds.size > 0) {
      const { data: byOrder, error: byOrderErr } = await supabaseAdmin
        .from("hardware_order_installations" as never)
        .select(SELECT)
        .in("order_id", [...orderIds]);
      if (byOrderErr) throw byOrderErr;
      const seen = new Set(byTech.map((i) => i.id as string));
      installs = [
        ...byTech,
        ...((byOrder ?? []) as Row[]).filter((i) => !seen.has(i.id as string)),
      ];
    }
    installs.sort((a, b) =>
      String(a.scheduled_for ?? "9999").localeCompare(String(b.scheduled_for ?? "9999")),
    );
    return { installs };
  });

export const getInstallDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ installId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["technician", "super_admin"].includes(role)) throw new Error("Forbidden");
    // Service-role read (same RLS gap as listMyInstalls) — authorization is
    // the role check above plus the ownership check below.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: install, error } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("*, hardware_orders(*)")
      .eq("id", data.installId)
      .single();
    if (error || !install) throw new Error("Install not found");
    const inst = install as Row;
    const order = (inst.hardware_orders ?? null) as Row | null;
    // Ownership: a technician may only open installs assigned to them — either
    // on the install row or on the order (assignments can live in both spots).
    if (
      role === "technician" &&
      inst.technician_id !== context.userId &&
      (order?.assigned_technician_id as string | undefined) !== context.userId
    )
      throw new Error("Forbidden");
    const adminId = (order?.admin_id as string | undefined) ?? null;

    const [devicesRes, eventsRes, silosRes, buyerRes] = await Promise.all([
      supabaseAdmin
        .from("hardware_order_devices" as never)
        .select("*")
        .eq("order_id", inst.order_id),
      supabaseAdmin
        .from("hardware_order_visit_events" as never)
        .select("*")
        .eq("installation_id", inst.id)
        .order("created_at", { ascending: false }),
      adminId
        ? supabaseAdmin.from("silos").select("id,name,warehouse_id").eq("admin_id", adminId)
        : Promise.resolve({ data: [] }),
      adminId
        ? supabaseAdmin
            .from("profiles")
            .select("id,name,email,phone")
            .eq("id", adminId)
            .maybeSingle()
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
    z
      .object({
        installId: z.string().uuid(),
        status: z.enum(["scheduled", "en_route", "onsite", "installing", "completed", "blocked"]),
        blockerNote: z.string().trim().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["technician", "super_admin"].includes(role)) throw new Error("Forbidden");
    // Service-role read: RLS has no policy letting a technician read installs
    // assigned to them (same gap as listMyInstalls). Role + technician_id
    // ownership checks below are the authorized path.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: install } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id, order_id, technician_id, status")
      .eq("id", data.installId)
      .single();
    if (!install) throw new Error("Install not found");
    const inst = install as Row;
    if (role === "technician" && inst.technician_id !== context.userId)
      throw new Error("Forbidden");

    // Role-based status transition enforcement:
    // - en_route: only super_admin (fleet manager marks dispatch)
    // - onsite, installing (completed via updateInstallStatus): only assigned technician
    // - blocked: super_admin or assigned technician
    // - completed: handled by advanceInstallStage (admin sign-off) — not allowed here
    if (data.status === "en_route" && role !== "super_admin") {
      throw new Error("Only super-admin technicians can mark an install as en route");
    }
    if (
      ["onsite", "installing", "scheduled"].includes(data.status) &&
      role === "super_admin" &&
      inst.technician_id !== context.userId
    ) {
      throw new Error("Only the assigned technician can advance to on-site/installing");
    }
    if (data.status === "completed") {
      throw new Error("Completion requires admin sign-off via the orders page");
    }

    const prevStatus = inst.status as string;
    const patch: Row = { status: data.status };
    if (data.status === "blocked") patch.blocker_note = data.blockerNote ?? null;

    const { error: updateErr } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .update(patch as never)
      .eq("id", data.installId);
    if (updateErr) throw new Error(`Failed to update status: ${updateErr.message}`);

    // Terminal state: blocked releases the technician's job slot.
    // (completed is handled by advanceInstallStage via admin sign-off.)
    if (
      data.status === "blocked" &&
      prevStatus !== "completed" &&
      prevStatus !== "blocked" &&
      inst.technician_id
    ) {
      try {
        await supabaseAdmin.rpc("decrement_technician_jobs", {
          tech_id: inst.technician_id,
        } as never);
      } catch (e) {
        console.warn("[updateInstallStatus] job count sync failed (non-fatal):", e);
      }
    }

    if (data.status === "onsite" || data.status === "en_route") {
      await supabaseAdmin
        .from("hardware_orders" as never)
        .update({ status: "installing" } as never)
        .eq("id", inst.order_id);
    }

    const { emitNotification } = await import("@/lib/notify");
    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("admin_id")
      .eq("id", inst.order_id)
      .single();
    const adminId = (order as Row | null)?.admin_id as string | undefined;
    if (adminId) {
      await emitNotification(supabaseAdmin, {
        recipientId: adminId,
        tenantAdminId: adminId,
        category: "install",
        severity: data.status === "blocked" ? "warning" : "info",
        title: `Install ${data.status.replace("_", " ")}`,
        body:
          data.status === "blocked"
            ? `Blocked: ${data.blockerNote ?? "reason unspecified"}`
            : `Your installation is now ${data.status.replace("_", " ")}.`,
        link: `/orders`,
        entityType: "hardware_order",
        entityId: inst.order_id,
      });
    }
    return { ok: true };
  });

export const logVisitEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z
      .object({
        installId: z.string().uuid(),
        eventType: z.enum(["arrived", "inspection", "install", "test", "handover", "issue"]),
        note: z.string().trim().max(1000).optional().nullable(),
        photoUrls: z.array(z.string().url()).max(10).optional(),
        location: z.object({ lat: z.number(), lng: z.number() }).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const role = await getEffectiveRole(context.supabase, context.userId);
    if (!["technician", "super_admin"].includes(role)) throw new Error("Forbidden");
    // Service-role read (same RLS gap as updateInstallStatus)
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: install } = await supabaseAdmin
      .from("hardware_order_installations" as never)
      .select("id, order_id, technician_id")
      .eq("id", data.installId)
      .single();
    if (!install) throw new Error("Install not found");
    const inst = install as Row;
    if (role === "technician" && inst.technician_id !== context.userId)
      throw new Error("Forbidden");

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
    z
      .object({
        installId: z.string().uuid(),
        orderDeviceId: z.string().uuid(),
        serialNumber: z.string().trim().min(3).max(80),
        siloId: z.string().uuid(),
        deviceType: z.string().trim().min(1).max(60).default("sensor"),
      })
      .parse(d),
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
    if (role === "technician" && inst.technician_id !== context.userId)
      throw new Error("Forbidden");

    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id, admin_id")
      .eq("id", inst.order_id)
      .single();
    const adminId = (order as Row | null)?.admin_id as string | undefined;
    if (!adminId) throw new Error("Order missing admin");

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
      await supabaseAdmin
        .from("hardware_order_installations" as never)
        .update({ status: "completed", completed_at: new Date().toISOString() } as never)
        .eq("id", data.installId);
      await supabaseAdmin
        .from("hardware_orders" as never)
        .update({ status: "completed", installed_at: new Date().toISOString() } as never)
        .eq("id", inst.order_id);

      // Commissioning the last device completes the install — release the
      // technician's job slot unless the stepper already did on completion.
      if (inst.technician_id && inst.status !== "completed") {
        try {
          await supabaseAdmin.rpc("decrement_technician_jobs", {
            tech_id: inst.technician_id,
          } as never);
        } catch (e) {
          console.warn("[commissionDevice] job count sync failed (non-fatal):", e);
        }
      }
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
      context.supabase
        .from("hardware_order_status_history" as never)
        .select("from_status,to_status,note,created_at")
        .eq("order_id", data.orderId)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("hardware_order_installations" as never)
        .select("id,status,scheduled_for,completed_at,blocker_note")
        .eq("order_id", data.orderId),
      context.supabase
        .from("hardware_order_visit_events" as never)
        .select("event_type,note,created_at")
        .eq("order_id", data.orderId)
        .order("created_at", { ascending: true }),
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
  .validator((d) => z.object({ warehouseId: z.string().uuid().optional().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireRole(context.supabase, context.userId, ["super_admin"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Always start from the super-admin fleet (Company Technicians) so newly
    // created technicians are visible even before warehouse assignment.
    const { data: globalProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs")
      .is("admin_id", null);
    const { data: globalRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "technician")
      .in(
        "user_id",
        (globalProfiles ?? []).map((p: any) => p.id),
      );
    const fleetIds = new Set((globalRoles ?? []).map((r: any) => r.user_id));
    const globalTechnicians: Row[] = (globalProfiles ?? [])
      .filter((p: any) => fleetIds.has(p.id))
      .map((p: any) => ({
        ...p,
        // Availability is a two-part gate: the technician must have declared
        // themselves available AND have a free job slot. A manual on_leave /
        // offline status must never be overridden by a free slot.
        is_available:
          p.technician_status === "available" &&
          (p.current_job_count ?? 0) < (p.max_concurrent_jobs ?? 3),
      }));

    // If warehouseId provided, surface technicians assigned to that warehouse
    // first (explicit FK hint — technician_warehouse_assignments has multiple
    // FKs to profiles, so a bare `profiles!inner` embed is ambiguous/PGRST201).
    if (data.warehouseId) {
      const { data: techs, error } = await supabaseAdmin
        .from("technician_warehouse_assignments" as never)
        .select(
          "technician_id, is_primary, profiles!technician_warehouse_assignments_technician_id_fkey!inner(id, name, email, phone, technician_status, current_job_count, max_concurrent_jobs)",
        )
        .eq("warehouse_id", data.warehouseId);

      if (error) throw error;

      const warehouseTechnicians = (techs ?? []).map((t: any) => ({
        ...t.profiles,
        is_primary: t.is_primary,
        is_available:
          t.profiles.technician_status === "available" &&
          (t.profiles.current_job_count ?? 0) < (t.profiles.max_concurrent_jobs ?? 3),
      }));

      // Merge: warehouse-assigned first, then the rest of the fleet (dedupe).
      const seen = new Set(warehouseTechnicians.map((t: any) => t.id));
      const technicians = [
        ...warehouseTechnicians,
        ...globalTechnicians.filter((t: any) => !seen.has(t.id)),
      ];

      return { technicians, filtered_by_warehouse: (techs ?? []).length > 0 };
    }

    return { technicians: globalTechnicians, filtered_by_warehouse: false };
  });
