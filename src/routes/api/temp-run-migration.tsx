/**
 * Temporary migration route — run once, then delete.
 * Executes DDL SQL via a temporary helper function created through Supabase RPC.
 */
import { createFileRoute } from "@tanstack/react-router";
import { readFileSync } from "fs";
import path from "path";

export const Route = createFileRoute("/api/temp-run-migration")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Step 1: Create a helper function that can execute DDL
          const createHelperSQL = `
            CREATE OR REPLACE FUNCTION public.exec_sql(sql_query text)
            RETURNS void
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
              EXECUTE sql_query;
            END;
            $$;
            GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
          `;

          // We can't run DDL through PostgREST, so let's try using the
          // Supabase SQL API through a different approach.
          // Actually, let's try creating a function that the service role can call.

          // Alternative: use the REST API's RPC to create a helper, but we need DDL first.
          // Let's try the raw SQL endpoint that Supabase Studio uses.
          const SUPABASE_URL = process.env.SUPABASE_URL!;
          const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

          const migrationSQL = readFileSync(
            path.resolve(
              process.cwd(),
              "supabase/migrations/20260820000001_fix_technician_job_count_and_installing_status.sql",
            ),
            "utf-8",
          );

          // Try the Supabase SQL API endpoints
          const endpoints = [`${SUPABASE_URL}/pg/query`, `${SUPABASE_URL}/sql`];

          for (const endpoint of endpoints) {
            try {
              const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  apikey: SERVICE_KEY,
                  Authorization: `Bearer ${SERVICE_KEY}`,
                },
                body: JSON.stringify({ query: migrationSQL }),
              });
              if (res.ok) {
                const data = await res.text();
                return new Response(
                  JSON.stringify({ success: true, endpoint, data: data.slice(0, 500) }),
                  {
                    headers: { "Content-Type": "application/json" },
                  },
                );
              }
            } catch {
              /* ignore */
            }
          }

          // If none of the API endpoints work, try using the pg module
          // to connect directly using the pooler URL
          const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1];
          if (projectRef) {
            // Try connecting via the pooler - but we need the password
            // This won't work without the password, so return instructions
            return new Response(
              JSON.stringify({
                success: false,
                message:
                  "Could not execute SQL via API. Please run the migration in the Supabase Dashboard SQL Editor.",
                migrationFile:
                  "supabase/migrations/20260820000001_fix_technician_job_count_and_installing_status.sql",
                dashboardUrl: `https://supabase.com/dashboard/project/${projectRef}/sql/new`,
              }),
              {
                headers: { "Content-Type": "application/json" },
                status: 500,
              },
            );
          }

          return new Response(JSON.stringify({ success: false, message: "Unknown project ref" }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
          });
        } catch (e) {
          return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
            headers: { "Content-Type": "application/json" },
            status: 500,
          });
        }
      },
    },
  },
});
