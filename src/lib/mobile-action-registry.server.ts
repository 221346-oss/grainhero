/**
 * Phase 24 — Registry of mobile write endpoints for offline replay.
 *
 * Each handler takes the caller's Supabase context + body and returns a
 * plain JSON-serializable object. The `/actions/replay` endpoint iterates
 * queued ops and dispatches through this table so a single client-side
 * queue drives every offline mutation.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export type ActionCtx = { supabase: SupabaseClient; userId: string };

type ActionHandler = (ctx: ActionCtx, body: unknown) => Promise<unknown>;

const ackAlertSchema = z.object({
  alert_id: z.string().uuid(),
  note: z.string().max(500).optional(),
});
const installStepSchema = z.object({
  installation_id: z.string().uuid(),
  step_key: z.string().min(1).max(64),
  status: z.enum(["started", "completed", "skipped", "failed"]),
  notes: z.string().max(1000).optional(),
  attachments: z
    .array(z.object({ bucket: z.string(), path: z.string() }))
    .max(10)
    .optional(),
});
const confirmDeliverySchema = z.object({
  order_id: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});
const readNotifsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

// Phase 25 — field ops actions
const fieldIncidentSchema = z.object({
  silo_id: z.string().uuid().nullish(),
  category: z.string().min(1).max(64),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  notes: z.string().max(2000).optional(),
  attachments: z
    .array(z.object({ bucket: z.string(), path: z.string() }))
    .max(20)
    .optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
});
const geofenceSchema = z.object({
  order_id: z.string().uuid(),
  lat: z.number(),
  lng: z.number(),
  accuracy_m: z.number().optional(),
  note: z.string().max(500).optional(),
});
const overrideSchema = z.object({
  actuator_id: z.string().uuid(),
  command: z.string().min(1).max(64),
  reason: z.string().min(3).max(500),
  payload: z.record(z.string(), z.any()).optional(),
});

// Phase 26 — market actions
const favoriteSchema = z.object({ listing_id: z.string().uuid() });
const messageSchema = z.object({
  order_id: z.string().uuid(),
  body: z.string().min(1).max(4000),
});
const disputeSchema = z.object({
  order_id: z.string().uuid(),
  category: z.string().min(1).max(64),
  description: z.string().min(3).max(4000),
  attachments: z
    .array(z.object({ bucket: z.string(), path: z.string() }))
    .max(10)
    .optional(),
});
const listingActionSchema = z.object({ listing_id: z.string().uuid() });

export const ACTIONS: Record<string, ActionHandler> = {
  "ack-alert": async (ctx, raw) => {
    const body = ackAlertSchema.parse(raw);
    const { error } = await ctx.supabase
      .from("grain_alerts")
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: ctx.userId,
        resolution_notes: body.note ?? null,
      } as never)
      .eq("id", body.alert_id);
    if (error) throw new Error(error.message);
    return { ok: true, alert_id: body.alert_id };
  },
  "install-step": async (ctx, raw) => {
    const body = installStepSchema.parse(raw);
    const { data, error } = await ctx.supabase
      .from("hardware_order_visit_events")
      .insert({
        installation_id: body.installation_id,
        actor_user_id: ctx.userId,
        event_type: body.step_key,
        status: body.status,
        notes: body.notes ?? null,
        payload: body.attachments ? { attachments: body.attachments } : {},
      } as never)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true, event_id: (data as { id?: string } | null)?.id };
  },
  "confirm-delivery": async (ctx, raw) => {
    const body = confirmDeliverySchema.parse(raw);
    const { error } = await ctx.supabase.from("buyer_order_events").insert({
      order_id: body.order_id,
      event_type: "buyer_confirmed_delivery",
      actor_user_id: ctx.userId,
      notes: body.notes ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  "notifications-read": async (ctx, raw) => {
    const body = readNotifsSchema.parse(raw);
    const { error } = await ctx.supabase
      .from("notifications")
      .update({
        read_at: new Date().toISOString(),
      } as never)
      .in("id", body.ids)
      .eq("user_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { ok: true, count: body.ids.length };
  },

  // ---------- Phase 25 field ops ----------
  "field.report-incident": async (ctx, raw) => {
    const body = fieldIncidentSchema.parse(raw);
    const { data: prof } = await ctx.supabase
      .from("profiles")
      .select("admin_id, id")
      .eq("id", ctx.userId)
      .maybeSingle();
    const tenantId =
      (prof as { admin_id?: string; id?: string } | null)?.admin_id ??
      (prof as { id?: string } | null)?.id ??
      ctx.userId;
    const { data, error } = await ctx.supabase
      .from("field_incidents")
      .insert({
        tenant_id: tenantId,
        reporter_user_id: ctx.userId,
        silo_id: body.silo_id ?? null,
        category: body.category,
        severity: body.severity,
        notes: body.notes ?? null,
        attachments: (body.attachments ?? []) as never,
        location_lat: body.location_lat ?? null,
        location_lng: body.location_lng ?? null,
      } as never)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true, incident_id: (data as { id?: string } | null)?.id };
  },
  "field.geofence-checkin": async (ctx, raw) => {
    const body = geofenceSchema.parse(raw);
    const { error } = await ctx.supabase.from("hardware_order_visit_events").insert({
      order_id: body.order_id,
      created_by: ctx.userId,
      event_type: "geofence.checkin",
      note: body.note ?? "Geofence check-in",
      location: { lat: body.lat, lng: body.lng, accuracy_m: body.accuracy_m ?? null } as never,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  "field.override-actuator": async (ctx, raw) => {
    const body = overrideSchema.parse(raw);
    const { data: act } = await ctx.supabase
      .from("actuators")
      .select("admin_id")
      .eq("id", body.actuator_id)
      .maybeSingle();
    const adminId = (act as { admin_id?: string } | null)?.admin_id;
    if (!adminId) throw new Error("actuator not found");
    const { error } = await ctx.supabase.from("actuator_commands").insert({
      actuator_id: body.actuator_id,
      admin_id: adminId,
      command: body.command,
      params: { ...(body.payload ?? {}), reason: body.reason } as never,
      issued_by: ctx.userId,
      source: "mobile.override",
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  },

  // ---------- Phase 26 marketplace ----------
  "market.favorite-listing": async (ctx, raw) => {
    const body = favoriteSchema.parse(raw);
    const { data: acct } = await ctx.supabase
      .from("buyer_accounts")
      .select("id")
      .eq("user_id", ctx.userId)
      .maybeSingle();
    const buyerAccountId = (acct as { id?: string } | null)?.id;
    if (!buyerAccountId) throw new Error("buyer_account_missing");
    const { error } = await ctx.supabase
      .from("favorite_listings")
      .upsert({ buyer_account_id: buyerAccountId, listing_id: body.listing_id } as never, {
        onConflict: "buyer_account_id,listing_id",
      });
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  "market.unfavorite": async (ctx, raw) => {
    const body = favoriteSchema.parse(raw);
    const { data: acct } = await ctx.supabase
      .from("buyer_accounts")
      .select("id")
      .eq("user_id", ctx.userId)
      .maybeSingle();
    const buyerAccountId = (acct as { id?: string } | null)?.id;
    if (!buyerAccountId) return { ok: true };
    const { error } = await ctx.supabase
      .from("favorite_listings")
      .delete()
      .eq("buyer_account_id", buyerAccountId)
      .eq("listing_id", body.listing_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  "market.send-message": async (ctx, raw) => {
    const body = messageSchema.parse(raw);
    const { data: order } = await ctx.supabase
      .from("buyer_orders")
      .select("id, buyer_id, admin_id")
      .eq("id", body.order_id)
      .maybeSingle();
    const o = order as { buyer_id?: string; admin_id?: string } | null;
    if (!o?.admin_id) throw new Error("order not found");
    const role = o.buyer_id === ctx.userId ? "buyer" : "seller";
    const { error } = await ctx.supabase.from("buyer_order_messages").insert({
      order_id: body.order_id,
      admin_id: o.admin_id,
      sender_user_id: ctx.userId,
      sender_role: role,
      body: body.body,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  "market.open-dispute": async (ctx, raw) => {
    const body = disputeSchema.parse(raw);
    const { data: order } = await ctx.supabase
      .from("buyer_orders")
      .select("admin_id, buyer_id")
      .eq("id", body.order_id)
      .maybeSingle();
    const o = order as { admin_id?: string; buyer_id?: string } | null;
    if (!o?.admin_id || !o.buyer_id) throw new Error("order not found");
    const { data, error } = await ctx.supabase
      .from("buyer_disputes")
      .insert({
        order_id: body.order_id,
        admin_id: o.admin_id,
        buyer_id: o.buyer_id,
        category: body.category,
        description: body.description,
        status: "open",
        attachments: (body.attachments ?? []) as never,
      } as never)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { ok: true, dispute_id: (data as { id?: string } | null)?.id };
  },
  "seller.pause-listing": async (ctx, raw) => {
    const body = listingActionSchema.parse(raw);
    const { error } = await ctx.supabase
      .from("grain_listings")
      .update({ status: "paused" } as never)
      .eq("id", body.listing_id)
      .eq("admin_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
  "seller.publish-listing": async (ctx, raw) => {
    const body = listingActionSchema.parse(raw);
    const { error } = await ctx.supabase
      .from("grain_listings")
      .update({ status: "active" } as never)
      .eq("id", body.listing_id)
      .eq("admin_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  },
};
