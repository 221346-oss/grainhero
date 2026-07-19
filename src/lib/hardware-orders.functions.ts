import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getEffectiveRole } from "./rbac.server";

// Order rows contain arbitrary column values; return them as a JSON-safe map.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type HardwareOrder = Record<string, any>;

const STATUS = z.enum([
  "pending_payment",
  "new",
  "approved",
  "tech_assigned",
  "installed",
  "live",
  "cancelled",
]);

/** Buyer: list my own orders. */
export const listMyHardwareOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("hardware_orders" as never)
      .select("*, installation:hardware_order_installations(*), visit_events:hardware_order_visit_events(*)")
      .eq("admin_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { orders: (data ?? []).map((o: any) => ({
      ...o,
      installation: Array.isArray(o.installation) ? o.installation[0] ?? null : o.installation ?? null,
      visit_events: o.visit_events ?? [],
    })) as HardwareOrder[] };
  });

/** Super-admin: list every order. */
export const listAllHardwareOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSuper = (await getEffectiveRole(context.supabase, context.userId)) === "super_admin";
    if (!isSuper) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("hardware_orders" as never)
      .select("*, installation:hardware_order_installations(*), visit_events:hardware_order_visit_events(*)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    // Attach the buyer profile so the console can show name + email.
    const rows = (data ?? []).map((o: any) => ({
      ...o,
      installation: Array.isArray(o.installation) ? o.installation[0] ?? null : o.installation ?? null,
      visit_events: o.visit_events ?? [],
    }) as HardwareOrder);
    const adminIds = Array.from(new Set(rows.map((o) => o.admin_id as string | null).filter(Boolean) as string[]));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let profiles: Record<string, any> = {};
    if (adminIds.length > 0) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id,name,email")
        .in("id", adminIds);
      profiles = Object.fromEntries((profs ?? []).map((p) => [p.id, { name: p.name ?? null, email: p.email ?? null }]));
    }
    return {
      orders: rows.map((o) => ({
        ...o,
        buyer: profiles[o.admin_id as string] ?? {
          name: o.customer_name ?? null,
          email: o.customer_email ?? null,
        },
      })) as HardwareOrder[],
    };
  });

const updateInput = z.object({
  orderId: z.string().uuid(),
  status: STATUS.optional(),
  technicianName: z.string().trim().max(200).optional().nullable(),
  technicianPhone: z.string().trim().max(40).optional().nullable(),
  scheduledInstallDate: z.string().trim().max(60).optional().nullable(),
  cancelReason: z.string().trim().max(500).optional().nullable(),
  refunded: z.boolean().optional(),
});

/** Super-admin: update status / assign technician / mark installed / cancel. */
export const updateHardwareOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const isSuper = (await getEffectiveRole(context.supabase, context.userId)) === "super_admin";
    if (!isSuper) throw new Error("Forbidden");
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (data.technicianName !== undefined) patch.technician_name = data.technicianName;
    if (data.technicianPhone !== undefined) patch.technician_phone = data.technicianPhone;
    if (data.scheduledInstallDate !== undefined) patch.scheduled_install_date = data.scheduledInstallDate || null;
    if (data.status === "installed") patch.installed_at = new Date().toISOString();
    if (data.status === "cancelled") patch.cancelled_at = new Date().toISOString();
    if (data.cancelReason !== undefined) patch.cancel_reason = data.cancelReason;
    if (data.refunded !== undefined) patch.refunded = data.refunded;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("hardware_orders" as never)
      .update(patch as never)
      .eq("id", data.orderId)
      .select("*")
      .single();
    if (error) throw error;

    // Notify the buyer in-app.
    const o = updated as HardwareOrder;
    if (o.admin_id) {
      const { emitNotification } = await import("@/lib/notify");
      await emitNotification(supabaseAdmin, {
        recipientId: o.admin_id as string,
        tenantAdminId: o.admin_id as string,
        category: "install",
        severity: data.status === "cancelled" ? "warning" : "info",
        title: "Your install order was updated",
        body: `Status: ${o.status}${o.technician_name ? ` · Tech: ${o.technician_name}` : ""}${o.scheduled_install_date ? ` · Scheduled: ${new Date(o.scheduled_install_date as string).toLocaleString()}` : ""}`,
        link: "/orders",
        entityType: "hardware_order",
        entityId: o.id as string,
        metadata: { status: o.status },
      });
    }

    return { order: o as HardwareOrder };
  });

const messageInput = z.object({
  orderId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
  emailBuyer: z.boolean().default(true),
});

/** Super-admin OR the order owner (admin): send a message on the order thread. */
export const sendOrderMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => messageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id,admin_id,customer_email,customer_name")
      .eq("id", data.orderId)
      .single();
    if (!order) throw new Error("Order not found");
    const buyerId = (order as { admin_id?: string | null }).admin_id ?? null;
    const isSuper = (await getEffectiveRole(context.supabase, context.userId)) === "super_admin";
    const isOwner = !!buyerId && buyerId === context.userId;
    if (!isSuper && !isOwner) throw new Error("Forbidden");
    const senderRole: "super_admin" | "admin" = isSuper ? "super_admin" : "admin";

    let emailed = false;
    if (data.emailBuyer && isSuper) {
      const { data: buyer } = buyerId
        ? await supabaseAdmin
            .from("profiles")
            .select("email,name")
            .eq("id", buyerId)
            .maybeSingle()
        : { data: null };
      const email = (buyer as { email?: string } | null)?.email ?? (order as { customer_email?: string | null }).customer_email ?? null;
      const gatewayKey = process.env.LOVABLE_API_KEY;
      const resendKey = process.env.RESEND_API_KEY;
      const from = process.env.RESEND_FROM_EMAIL || "GrainHero <onboarding@resend.dev>";
      if (email && gatewayKey && resendKey) {
        const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${gatewayKey}`,
            "X-Connection-Api-Key": resendKey,
          },
          body: JSON.stringify({
            from,
            to: [email],
            subject: `Update on your GrainHero install order`,
            html: `<p>${data.message.replace(/</g, "&lt;").replace(/\n/g, "<br/>")}</p>`,
          }),
        }).catch(() => null);
        emailed = !!res?.ok;
      }
    }

    await supabaseAdmin.from("hardware_order_messages" as never).insert({
      order_id: data.orderId,
      sender_id: context.userId,
      message: data.message,
      emailed,
    } as never);

    // Notify the OTHER party.
    if (isSuper && buyerId) {
      const { emitNotification } = await import("@/lib/notify");
      await emitNotification(supabaseAdmin, {
        recipientId: buyerId,
        tenantAdminId: buyerId,
        category: "install",
        severity: "info",
        title: "New message about your install order",
        body: data.message,
        link: "/orders",
        entityType: "hardware_order",
        entityId: data.orderId,
      });
    } else if (isOwner) {
      const { emitToSuperAdmins } = await import("@/lib/notify");
      await emitToSuperAdmins(supabaseAdmin, {
        category: "install",
        severity: "info",
        title: "Buyer replied on install order",
        body: data.message,
        link: `/platform/orders/${data.orderId}`,
        entityType: "hardware_order",
        entityId: data.orderId,
      });
    }

    return { ok: true, emailed, senderRole };
  });

/** List messages on an install order — visible to owner admin and super admins. */
export const listOrderMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // RLS on hardware_order_messages already scopes to owner or super_admin.
    const { data: rows, error } = await context.supabase
      .from("hardware_order_messages" as never)
      .select("*")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    type Msg = { id: string; order_id: string; sender_id: string; message: string; emailed: boolean | null; created_at: string };
    const list = (rows ?? []) as unknown as Msg[];
    // Attach sender role (admin vs super_admin) by matching against the order owner.
    const { data: order } = await context.supabase
      .from("hardware_orders" as never)
      .select("admin_id")
      .eq("id", data.orderId)
      .maybeSingle();
    const ownerId = (order as { admin_id?: string | null } | null)?.admin_id ?? null;
    const messages = list.map((m) => ({
      id: m.id,
      order_id: m.order_id,
      sender_id: m.sender_id,
      message: m.message,
      created_at: m.created_at,
      sender_role: (m.sender_id === ownerId ? "admin" : "super_admin") as "admin" | "super_admin",
    }));
    return { messages, viewerIsOwner: ownerId === context.userId };
  });

/** Super-admin: count of orders needing attention, for sidebar badge. */
export const countPendingOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSuper = (await getEffectiveRole(context.supabase, context.userId)) === "super_admin";
    if (!isSuper) return { count: 0 };
    const { count } = await context.supabase
      .from("hardware_orders" as never)
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "approved", "tech_assigned"] as never);
    return { count: count ?? 0 };
  });