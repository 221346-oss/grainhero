import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const submitInput = z.object({
  description: z.string().trim().min(5).max(2000),
  category: z.enum(["bug", "maintenance"]).default("bug"),
  pagePath: z.string().trim().max(300).optional().nullable(),
  userAgent: z.string().trim().max(500).optional().nullable(),
});

/** Authenticated: insert a bug report from the reporting user's own session. */
export const submitBugReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d) => submitInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("admin_id")
      .eq("id", context.userId)
      .maybeSingle();
    const adminId = (profile as { admin_id?: string | null } | null)?.admin_id ?? context.userId;

    const { data: row, error } = await context.supabase
      .from("bug_reports" as never)
      .insert({
        user_id: context.userId,
        admin_id: adminId,
        description: data.description,
        category: data.category,
        page_path: data.pagePath ?? null,
        user_agent: data.userAgent ?? null,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id };
  });
