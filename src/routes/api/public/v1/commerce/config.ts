import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Public read of buyer-safe commerce config for the mobile app.
export const Route = createFileRoute("/api/public/v1/commerce/config")({
  server: {
    handlers: {
      GET: async () => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return Response.json({ error: "server_misconfigured" }, { status: 500 });
        const supabase = createClient<Database>(url, key, {
          auth: { persistSession: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`)
                h.delete("Authorization");
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });
        const { data, error } = await supabase
          .from("mobile_commerce_settings" as never)
          .select("*")
          .limit(1)
          .maybeSingle();
        if (error) return Response.json({ error: error.message }, { status: 500 });
        const row = data as unknown as {
          checkout_enabled: boolean;
          allowed_payment_methods: string[];
          min_order_cents: number;
          max_order_cents: number;
          currency_default: string;
          terms_url: string | null;
          refund_policy_url: string | null;
          stripe_publishable_key_override: string | null;
        } | null;
        return Response.json({
          data: row
            ? {
                checkout_enabled: row.checkout_enabled,
                allowed_payment_methods: row.allowed_payment_methods,
                min_order_cents: row.min_order_cents,
                max_order_cents: row.max_order_cents,
                currency_default: row.currency_default,
                terms_url: row.terms_url,
                refund_policy_url: row.refund_policy_url,
                stripe_publishable_key: row.stripe_publishable_key_override ?? null,
              }
            : null,
          meta: { server_time: new Date().toISOString(), version: "v1" },
        });
      },
    },
  },
});
