import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

const getAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");
    const [{ data: activity }, { data: security }] = await Promise.all([
      context.supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      context.supabase
        .from("security_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    return { activity: activity ?? [], security: security ?? [] };
  });

export const Route = createFileRoute("/_authenticated/platform/audit-logs")({
  head: () => ({
    meta: [
      { title: "Platform · Audit Logs — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Audit Logs workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Audit Logs — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Audit Logs workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const fetchAudit = useServerFn(getAudit);
  const { data, isLoading } = useQuery({
    queryKey: ["platform-audit-logs"],
    queryFn: () => fetchAudit(),
  });

  return (
    <AdminPageShell
      title="Audit logs"
      subtitle="Configuration changes, access events, and security events"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <AdminDataCard
          title="Activity"
          description={isLoading ? "Loading…" : `${data?.activity.length ?? 0} events`}
        >
          {!isLoading && (data?.activity.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <p className="text-sm">No activity logs yet</p>
            </div>
          ) : (
            <ul className="">
              {(data?.activity ?? []).map((row) => {
                const r = row as Record<string, unknown>;
                return (
                  <li key={String(r.id)} className="px-4 py-3 hover:bg-muted/20">
                    <div className="text-sm font-medium text-foreground">
                      {String(r.action ?? r.event ?? "activity")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(String(r.created_at)).toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminDataCard>
        <AdminDataCard
          title="Security events"
          description={isLoading ? "Loading…" : `${data?.security.length ?? 0} events`}
        >
          {!isLoading && (data?.security.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
              <p className="text-sm">No security events</p>
            </div>
          ) : (
            <ul className="">
              {(data?.security ?? []).map((row) => {
                const r = row as Record<string, unknown>;
                return (
                  <li key={String(r.id)} className="px-4 py-3 hover:bg-red-50/40">
                    <div className="text-sm font-medium text-foreground">{String(r.event)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {new Date(String(r.created_at)).toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminDataCard>
      </div>
    </AdminPageShell>
  );
}
