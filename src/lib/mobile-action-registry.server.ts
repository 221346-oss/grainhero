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

const ackAlertSchema = z.object({ alert_id: z.string().uuid(), note: z.string().max(500).optional() });
const installStepSchema = z.object({
  installation_id: z.string().uuid(),
  step_key: z.string().min(1).max(64),
  status: z.enum(["started", "completed", "skipped", "failed"]),
  notes: z.string().max(1000).optional(),
  attachments: z.array(z.object({ bucket: z.string(), path: z.string() })).max(10).optional(),
});
const confirmDeliverySchema = z.object({
  order_id: z.string().uuid(),
  notes: z.string().max(1000).optional(),
});
const readNotifsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

export const ACTIONS: Record<string, ActionHandler> = {
  "ack-alert": async (ctx, raw) => {
    const body = ackAlertSchema.parse(raw);
    const { error } = await ctx.supabase.from("grain_alerts").update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: ctx.userId,
      resolution_notes: body.note ?? null,
    } as never).eq("id", body.alert_id);
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
      .select("id").maybeSingle();
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
    const { error } = await ctx.supabase.from("notifications").update({
      read_at: new Date().toISOString(),
    } as never).in("id", body.ids).eq("user_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { ok: true, count: body.ids.length };
  },
};
