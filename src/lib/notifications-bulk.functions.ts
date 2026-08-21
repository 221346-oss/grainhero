/**
 * Phase 22 — Bulk actions on the current user's notifications.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idsSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200) });

export const bulkMarkNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => idsSchema.extend({ read: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const patch = data.read
      ? { read: true, read_at: new Date().toISOString() }
      : { read: false, read_at: null };
    const { error, count } = await sb
      .from("notifications")
      .update(patch, { count: "exact" })
      .in("id", data.ids)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true, updated: count ?? data.ids.length };
  });

export const bulkArchiveNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => idsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { error, count } = await sb
      .from("notifications")
      .delete({ count: "exact" })
      .in("id", data.ids)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true, archived: count ?? data.ids.length };
  });
