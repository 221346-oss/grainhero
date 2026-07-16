import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

const getAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    if (!roles?.some((r) => r.role === "super_admin")) throw new Error("Forbidden");
    const [{ data: activity }, { data: security }] = await Promise.all([
      context.supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
      context.supabase.from("security_events").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    return { activity: activity ?? [], security: security ?? [] };
  });

export const Route = createFileRoute("/_authenticated/platform/audit-logs")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const fetchAudit = useServerFn(getAudit);
  const { data, isLoading } = useQuery({ queryKey: ["platform-audit-logs"], queryFn: () => fetchAudit() });
  if (isLoading || !data) return <div className="text-sm text-slate-500">Loading audit logs…</div>;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><ScrollText className="h-4 w-4" /> Audit Logs</h2>
        <p className="text-xs text-slate-500 mt-1">Configuration changes, access events, security events.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Activity ({data.activity.length})</CardTitle></CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            <ul className="divide-y divide-slate-100 text-xs">
              {data.activity.map((row) => {
                const r = row as Record<string, unknown>;
                return (
                  <li key={String(r.id)} className="py-1.5">
                    <div className="font-mono text-slate-700">{String(r.action ?? r.event ?? "activity")}</div>
                    <div className="text-slate-400 text-[10px]">{new Date(String(r.created_at)).toLocaleString()}</div>
                  </li>
                );
              })}
              {data.activity.length === 0 && <li className="py-2 text-slate-500">No activity yet.</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base text-red-700">Security ({data.security.length})</CardTitle></CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            <ul className="divide-y divide-slate-100 text-xs">
              {data.security.map((row) => {
                const r = row as Record<string, unknown>;
                return (
                  <li key={String(r.id)} className="py-1.5">
                    <div className="font-mono text-slate-700">{String(r.event)}</div>
                    <div className="text-slate-400 text-[10px]">{new Date(String(r.created_at)).toLocaleString()}</div>
                  </li>
                );
              })}
              {data.security.length === 0 && <li className="py-2 text-slate-500">No security events.</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}