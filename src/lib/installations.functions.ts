import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function isSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "super_admin" });
  return !!data;
}

export const getInstallation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data, context }) => {
    const supa = context.supabase;
    const [{ data: order }, { data: install }, { data: devices }, { data: events }, { data: settings }] = await Promise.all([
      supa.from("hardware_orders").select("id, admin_id, install_address, install_city, install_country, contact_phone, technician_name, technician_phone, status, plan_name, hardware_quantity, hardware_total, created_at, scheduled_install_date").eq("id", data.orderId).maybeSingle(),
      supa.from("hardware_order_installations").select("*").eq("order_id", data.orderId).maybeSingle(),
      supa.from("hardware_order_devices").select("*").eq("order_id", data.orderId).order("created_at"),
      supa.from("hardware_order_visit_events").select("*").eq("order_id", data.orderId).order("event_at", { ascending: false }),
      supa.from("platform_settings").select("config").eq("id", "singleton").maybeSingle(),
    ]);
    if (!order) throw new Error("Order not found");
    const company = ((settings?.config as { company?: { origin_address?: string } } | null)?.company) ?? {};
    return {
      order,
      installation: install ?? null,
      devices: devices ?? [],
      events: events ?? [],
      companyOrigin: company.origin_address ?? "J453+GPQ, Old Airport Rd, Chaklala Cantt., Rawalpindi, 46000",
    };
  });

export const upsertInstallation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    orderId: string;
    patch: {
      city?: string; warehouse_id?: string | null; silo_id?: string | null; scheduled_visit_at?: string | null;
      origin_address?: string; origin_lat?: number | null; origin_lng?: number | null;
      destination_address?: string; destination_lat?: number | null; destination_lng?: number | null;
      status?: string;
    };
  }) => d)
  .handler(async ({ data, context }) => {
    if (!(await isSuperAdmin(context))) throw new Error("Forbidden: super_admin only");
    const supabaseAdmin = context.supabase;
    // Default origin to company address when caller left it blank
    const patch = { ...data.patch };
    if (!patch.origin_address || !patch.origin_address.trim()) {
      const { data: s } = await supabaseAdmin.from("platform_settings").select("config").eq("id", "singleton").maybeSingle();
      const co = ((s?.config as { company?: { origin_address?: string } } | null)?.company) ?? {};
      patch.origin_address = co.origin_address ?? "J453+GPQ, Old Airport Rd, Chaklala Cantt., Rawalpindi, 46000";
    }
    const { error } = await supabaseAdmin
      .from("hardware_order_installations")
      .upsert({ order_id: data.orderId, ...patch }, { onConflict: "order_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertDevices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; devices: { serial: string; model?: string; status?: string }[] }) => d)
  .handler(async ({ data, context }) => {
    if (!(await isSuperAdmin(context))) throw new Error("Forbidden: super_admin only");
    const supabaseAdmin = context.supabase;
    await supabaseAdmin.from("hardware_order_devices").delete().eq("order_id", data.orderId);
    if (data.devices.length > 0) {
      const { error } = await supabaseAdmin.from("hardware_order_devices").insert(
        data.devices.map((d) => ({ order_id: data.orderId, serial: d.serial, model: d.model ?? null, status: d.status ?? "shipped" })),
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const addVisitEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; note: string; photo_url?: string }) => d)
  .handler(async ({ data, context }) => {
    if (!(await isSuperAdmin(context))) throw new Error("Forbidden: super_admin only");
    const supabaseAdmin = context.supabase;
    const { error } = await supabaseAdmin
      .from("hardware_order_visit_events")
      .insert({ order_id: data.orderId, note: data.note, photo_url: data.photo_url ?? null, created_by: context.userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type InstallStage = "paid" | "assigned" | "en_route" | "onsite" | "installed" | "completed" | "blocked";

export const advanceInstallStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { orderId: string; next: "en_route" | "onsite" | "installed" | "completed" | "blocked"; note?: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: res, error } = await context.supabase.rpc("advance_install_stage", {
      _order_id: data.orderId,
      _next: data.next,
      _note: data.note ?? undefined,
    });
    if (error) throw new Error(error.message);

    // Fire notifications + emails for the two admin-visible milestones.
    if (data.next === "installed" || data.next === "completed") {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin
          .from("hardware_orders")
          .select("id, admin_id, plan_name, hardware_quantity, customer_email, customer_name")
          .eq("id", data.orderId)
          .maybeSingle();
        if (order?.admin_id) {
          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("email, name")
            .eq("id", order.admin_id)
            .maybeSingle();
          const adminEmail = profile?.email ?? order.customer_email ?? null;
          const adminName = profile?.name ?? order.customer_name ?? "there";
          const orderRef = String(order.id).slice(0, 8).toUpperCase();
          const qty = Number(order.hardware_quantity ?? 0);

          if (data.next === "installed") {
            // Notification (completion trigger already handles the 'completed' notif).
            await supabaseAdmin.from("notifications").insert({
              admin_id: order.admin_id,
              user_id: order.admin_id,
              title: "Installation done — action required",
              message: `Your ${qty} sensor(s) are installed on-site. Open the order and tap "Mark as complete" to auto-provision your silos & warehouse.`,
              type: "install.installed",
              category: "operations",
              entity_type: "hardware_order",
              entity_id: String(order.id),
              action_url: "/orders",
              metadata: { origin_order_id: order.id, requires_admin_confirmation: true },
            });

            if (adminEmail) {
              const { sendEmailViaResend } = await import("@/lib/resend.server");
              await sendEmailViaResend({
                to: adminEmail,
                subject: `✅ Your GrainHero install is done — please confirm (Order #${orderRef})`,
                html: emailShell({
                  title: "Installation complete on-site",
                  intro: `Hi ${escapeHtml(adminName)}, our technician has finished installing your ${qty} sensor(s).`,
                  body: `<p>The last step is yours: open the order and tap <strong>Mark as complete</strong>. That confirms everything is working and we'll instantly provision your warehouse and one silo per device serial.</p>`,
                  cta: { label: "Open my order", url: absUrl("/orders") },
                  footer: `Order reference: ${orderRef}`,
                }),
              }).catch((e) => console.warn("[install-installed email]", e));
            }
          } else if (data.next === "completed") {
            // Notification for 'completed' is inserted by auto_provision_from_install trigger — skip duplicate.
            if (adminEmail) {
              const { sendEmailViaResend } = await import("@/lib/resend.server");
              // Give the trigger a moment to finish provisioning before counting silos.
              const { count: siloCount } = await supabaseAdmin
                .from("silos")
                .select("id", { count: "exact", head: true })
                .eq("origin_order_id", order.id);
              await sendEmailViaResend({
                to: adminEmail,
                subject: `🚜 You're live on GrainHero — silos ready (Order #${orderRef})`,
                html: emailShell({
                  title: "You're all set!",
                  intro: `Hi ${escapeHtml(adminName)}, thanks for confirming — welcome aboard.`,
                  body: `<p>Your warehouse is provisioned and <strong>${siloCount ?? qty}</strong> silo(s) are ready to receive grain batches. Live sensor data will start flowing as soon as devices come online.</p>`,
                  cta: { label: "Go to silos", url: absUrl("/silos") },
                  footer: `Order reference: ${orderRef}`,
                }),
              }).catch((e) => console.warn("[install-completed email]", e));
            }
          }
        }
      } catch (e) {
        console.warn("[advanceInstallStage] post-notify failed:", e);
      }
    }

    return res as { ok: boolean; stage: string };
  });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function absUrl(path: string) {
  const base = process.env.PUBLIC_APP_URL ?? process.env.APP_ORIGIN ?? "https://grainhero.app";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function emailShell(opts: { title: string; intro: string; body: string; cta?: { label: string; url: string }; footer?: string }) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f8f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8f7;padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(15,23,42,.06)">
        <tr><td style="background:linear-gradient(135deg,#059669,#047857);padding:24px 28px;color:#fff">
          <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.85">GrainHero</div>
          <div style="font-size:22px;font-weight:700;margin-top:4px">${escapeHtml(opts.title)}</div>
        </td></tr>
        <tr><td style="padding:24px 28px;font-size:15px;line-height:1.55">
          <p style="margin:0 0 12px">${escapeHtml(opts.intro)}</p>
          ${opts.body}
          ${opts.cta ? `<p style="margin:22px 0 0"><a href="${opts.cta.url}" style="background:#059669;color:#fff;text-decoration:none;padding:11px 20px;border-radius:10px;font-weight:600;display:inline-block">${escapeHtml(opts.cta.label)}</a></p>` : ""}
        </td></tr>
        ${opts.footer ? `<tr><td style="padding:16px 28px;border-top:1px solid #eef2ef;font-size:12px;color:#64748b">${escapeHtml(opts.footer)}</td></tr>` : ""}
      </table>
      <div style="font-size:11px;color:#94a3b8;margin-top:14px">You're receiving this because you're the account admin for this order.</div>
    </td></tr>
  </table></body></html>`;
}
