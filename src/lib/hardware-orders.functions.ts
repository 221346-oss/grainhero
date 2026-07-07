import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      .select("*")
      .eq("admin_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return { orders: (data ?? []) as HardwareOrder[] };
  });

/** Super-admin: list every order. */
export const listAllHardwareOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden");
    const { data, error } = await context.supabase
      .from("hardware_orders" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    // Attach the buyer profile so the console can show name + email.
    const rows = (data ?? []) as HardwareOrder[];
    const adminIds = Array.from(new Set(rows.map((o) => o.admin_id as string)));
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
        buyer: profiles[o.admin_id as string] ?? null,
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
  .inputValidator((d) => updateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
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
    await supabaseAdmin.from("notifications").insert({
      user_id: o.admin_id as string,
      tenant_id: o.admin_id as string,
      type: `order.${data.status ?? "update"}`,
      subject: `Your install order was updated`,
      body: `Status: ${o.status}${o.technician_name ? ` · Tech: ${o.technician_name}` : ""}${o.scheduled_install_date ? ` · Scheduled: ${new Date(o.scheduled_install_date as string).toLocaleString()}` : ""}`,
      is_read: false,
    } as never);

    return { order: o as HardwareOrder };
  });

const messageInput = z.object({
  orderId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
  emailBuyer: z.boolean().default(true),
});

/** Super-admin: send a message + optional email to the buyer for an order. */
export const sendOrderMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => messageInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("hardware_orders" as never)
      .select("id,admin_id")
      .eq("id", data.orderId)
      .single();
    if (!order) throw new Error("Order not found");
    const buyerId = (order as { admin_id: string }).admin_id;

    let emailed = false;
    if (data.emailBuyer) {
      const { data: buyer } = await supabaseAdmin
        .from("profiles")
        .select("email,name")
        .eq("id", buyerId)
        .maybeSingle();
      const email = (buyer as { email?: string } | null)?.email;
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

    await supabaseAdmin.from("notifications").insert({
      user_id: buyerId,
      tenant_id: buyerId,
      type: "order.message",
      subject: "New message about your install order",
      body: data.message,
      is_read: false,
    } as never);

    return { ok: true, emailed };
  });

/** Super-admin: count of orders needing attention, for sidebar badge. */
export const countPendingOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isSuper } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "super_admin",
    });
    if (!isSuper) return { count: 0 };
    const { count } = await context.supabase
      .from("hardware_orders" as never)
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "approved", "tech_assigned"] as never);
    return { count: count ?? 0 };
  });