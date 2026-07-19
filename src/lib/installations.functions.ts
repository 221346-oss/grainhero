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
    return res as { ok: boolean; stage: string };
  });
