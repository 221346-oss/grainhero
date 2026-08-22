import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { NeonPanel, NEON } from "@/components/charts/neon";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { getEnvHealth } from "@/lib/env-health.functions";

export const Route = createFileRoute("/_authenticated/platform/env-health")({
  component: EnvHealthPage,
});

function EnvHealthPage() {
  const fetchEnv = useServerFn(getEnvHealth);
  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["platform-env-health"],
    queryFn: () => fetchEnv(),
  });

  const serviceRoleOk = data?.serviceRole.ok ?? false;

  return (
    <AdminPageShell
      title="Environment health"
      subtitle="Verifies server-side environment variables required by GrainHero"
      actions={
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Re-check
        </button>
      }
    >
      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-md bg-muted h-14" />
          ))}
        </div>
      ) : error ? (
        <NeonPanel title="Unavailable">
          <p className="text-sm text-muted-foreground">
            Could not run the check. This page is restricted to platform super admins.
          </p>
        </NeonPanel>
      ) : (
        <>
          <NeonPanel
            title="Service role key"
            subtitle={`Last checked ${new Date(data!.checkedAt).toLocaleString()}`}
          >
            <div className="flex items-start gap-3">
              {serviceRoleOk ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: NEON.success }} />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: NEON.critical }} />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {serviceRoleOk ? "SUPABASE_SERVICE_ROLE_KEY is working" : "SUPABASE_SERVICE_ROLE_KEY problem"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground break-words">{data!.serviceRole.message}</p>
              </div>
            </div>
          </NeonPanel>

          <div className="grid gap-px bg-border rounded-md overflow-hidden">
            {data!.checks.map((c) => (
              <div key={c.name} className="bg-background px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">{c.name}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {c.required ? "required" : "optional"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
                </div>
                <span
                  className={`shrink-0 text-xs font-bold uppercase ${
                    c.present ? "text-success" : c.required ? "text-severity-critical" : "text-warning"
                  }`}
                >
                  {c.present ? "Set" : "Missing"}
                </span>
              </div>
            ))}
          </div>

          {!serviceRoleOk && (
            <NeonPanel title="How to fix the service-role key">
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  Open the project in the Lovable editor and go to{" "}
                  <span className="font-semibold text-foreground">Project Settings → Supabase</span>.
                </li>
                <li>
                  Refresh / re-bind the Supabase connection. This re-derives{" "}
                  <span className="font-mono">SUPABASE_URL</span>,{" "}
                  <span className="font-mono">SUPABASE_PUBLISHABLE_KEY</span> and{" "}
                  <span className="font-mono">SUPABASE_SERVICE_ROLE_KEY</span> for the server runtime.
                </li>
                <li>
                  Do not paste the service-role key into code or the <span className="font-mono">.env</span> file
                  manually — <span className="font-mono">SUPABASE_*</span> is a reserved, managed prefix.
                </li>
                <li>Redeploy / restart the app, then press “Re-check” above.</li>
                <li>
                  If the key is present but rejected, it was rotated in the Supabase dashboard — re-bind the
                  connection again so the app picks up the current key.
                </li>
              </ol>
              <div className="mt-4 flex items-start gap-2 rounded-md p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-xs text-muted-foreground">
                  While this key is missing, admin-only server functions (checkout claims, billing sync, platform
                  jobs) will fail with a 500 error.
                </p>
              </div>
            </NeonPanel>
          )}
        </>
      )}
    </AdminPageShell>
  );
}
