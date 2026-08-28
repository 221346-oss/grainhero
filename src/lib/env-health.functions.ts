import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EnvCheck = {
  name: string;
  present: boolean;
  required: boolean;
  hint: string;
};

export type EnvHealth = {
  checks: EnvCheck[];
  serviceRole: { ok: boolean; message: string };
  allRequiredPresent: boolean;
  checkedAt: string;
};

export const getEnvHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EnvHealth> => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");

    const spec: Array<{ name: string; required: boolean; hint: string }> = [
      {
        name: "SUPABASE_URL",
        required: true,
        hint: "Supabase project URL used by all server-side clients.",
      },
      {
        name: "SUPABASE_PUBLISHABLE_KEY",
        required: true,
        hint: "Anon/publishable key used for RLS-scoped server reads.",
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        required: true,
        hint: "Service-role key used by admin server functions (bypasses RLS).",
      },
      {
        name: "APP_ORIGIN",
        required: false,
        hint: "Canonical site origin used in emails and redirects.",
      },
      {
        name: "STRIPE_SECRET_KEY",
        required: false,
        hint: "Needed for checkout, subscriptions and webhooks.",
      },
    ];

    const checks: EnvCheck[] = spec.map((s) => ({
      ...s,
      present: Boolean(process.env[s.name] && String(process.env[s.name]).length > 0),
    }));

    let serviceRole = { ok: false, message: "SUPABASE_SERVICE_ROLE_KEY is not set." };
    if (process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { error } = await supabaseAdmin
          .from("profiles")
          .select("id", { count: "exact", head: true });
        serviceRole = error
          ? { ok: false, message: `Key present but rejected by Supabase: ${error.message}` }
          : { ok: true, message: "Service-role key is present and accepted by Supabase." };
      } catch (e) {
        serviceRole = { ok: false, message: e instanceof Error ? e.message : "Unknown error" };
      }
    }

    return {
      checks,
      serviceRole,
      allRequiredPresent: checks.every((c) => !c.required || c.present),
      checkedAt: new Date().toISOString(),
    };
  });
