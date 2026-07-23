/**
 * Phase 10 — Grain batch state machine + audit trail.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const STATES = ["intake", "stored", "processing", "treatment", "ready", "dispatched", "sold", "on_hold", "damaged", "expired", "rejected"] as const;
type State = typeof STATES[number];

// Allowed transitions. Empty target list = terminal.
const ALLOWED: Record<State, State[]> = {
  intake: ["stored", "rejected", "on_hold"],
  stored: ["processing", "treatment", "ready", "on_hold", "damaged"],
  processing: ["stored", "treatment", "ready", "damaged"],
  treatment: ["stored", "ready", "damaged"],
  ready: ["dispatched", "on_hold", "damaged"],
  dispatched: ["sold"],
  sold: [],
  on_hold: ["stored", "processing", "ready", "rejected", "damaged"],
  damaged: ["expired", "rejected"],
  expired: [],
  rejected: [],
};

export const transitionBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) =>
    z.object({
      batchId: z.string().uuid(),
      toState: z.enum(STATES),
      note: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: batch } = await context.supabase
      .from("grain_batches")
      .select("id, admin_id, silo_id, status")
      .eq("id", data.batchId).single();
    const b = batch as Row | null;
    if (!b) throw new Error("Batch not found");

    const from = String(b.status ?? "intake") as State;
    const allowed = ALLOWED[from] ?? [];
    if (from !== data.toState && !allowed.includes(data.toState)) {
      throw new Error(`Invalid transition ${from} → ${data.toState}`);
    }

    // Snapshot latest silo readings
    let snapshot: Row | null = null;
    if (b.silo_id) {
      const { data: recent } = await context.supabase
        .from("sensor_readings")
        .select("temperature_value, humidity_value, moisture_value, co2_value, reading_timestamp")
        .eq("silo_id", b.silo_id)
        .order("reading_timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();
      snapshot = (recent as Row | null) ?? null;
    }

    const now = new Date().toISOString();
    const patch: Row = {
      status: data.toState,
      state_changed_at: now,
      quality_snapshot: snapshot,
      updated_by: context.userId,
    };
    if (data.toState === "dispatched") patch.actual_dispatch_date = now;

    const { error: upErr } = await context.supabase
      .from("grain_batches").update(patch as never).eq("id", data.batchId);
    if (upErr) throw upErr;

    await context.supabase.from("grain_batch_events").insert({
      batch_id: data.batchId,
      admin_id: b.admin_id,
      from_state: from,
      to_state: data.toState,
      actor_user_id: context.userId,
      note: data.note ?? null,
      snapshot,
    } as never);

    const { logActivity } = await import("@/lib/activity");
    await logActivity({
      actorId: context.userId,
      tenantAdminId: b.admin_id as string,
      action: "batch.transition",
      targetType: "grain_batch",
      targetId: data.batchId,
      meta: { from, to: data.toState, note: data.note },
    });
    return { ok: true, from, to: data.toState };
  });

export const listBatchEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ batchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("grain_batch_events")
      .select("*")
      .eq("batch_id", data.batchId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { events: (rows ?? []) as Row[] };
  });

export const getAllowedTransitions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d) => z.object({ batchId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: b } = await context.supabase
      .from("grain_batches").select("status").eq("id", data.batchId).single();
    const from = String((b as Row | null)?.status ?? "intake") as State;
    return { from, next: ALLOWED[from] ?? [] };
  });
