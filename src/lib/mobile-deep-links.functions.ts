import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listDeepLinks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("mobile_deep_link_routes")
      .select("id, key, native_route, web_fallback, description, active, updated_at")
      .order("key", { ascending: true });
    if (error) throw error;
    return { rows: (data ?? []) as Array<Record<string, any>> };
  });

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1).max(120).regex(/^[a-z0-9._-]+$/),
  native_route: z.string().min(1).max(300),
  web_fallback: z.string().min(1).max(300),
  description: z.string().max(500).optional(),
  active: z.boolean().default(true),
});

export const upsertDeepLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v) => upsertSchema.parse(v))
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("mobile_deep_link_routes")
      .upsert({ ...data, updated_by: context.userId } as never, { onConflict: "key" });
    if (error) throw error;
    return { ok: true };
  });

export const deleteDeepLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((v: { id: string }) => v)
  .handler(async ({ data, context }) => {
    const { isSuperAdmin } = await import("./rbac.server");
    if (!(await isSuperAdmin(context.supabase, context.userId))) throw new Error("Forbidden");
    const { error } = await context.supabase.from("mobile_deep_link_routes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
