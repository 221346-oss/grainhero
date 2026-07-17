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
  
  if (isLoading || !data) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-slate-500">Loading audit logs…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Audit Logs
          </h1>
          <p className="text-sm text-slate-600 mt-1">Configuration changes, access events, and security events</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
            <CardTitle className="text-base">Activity Logs ({data.activity.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              <ul className="divide-y divide-slate-100">
                {data.activity.map((row) => {
                  const r = row as Record<string, unknown>;
                  return (
                    <li key={String(r.id)} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="font-medium text-slate-800 text-sm">{String(r.action ?? r.event ?? "activity")}</div>
                      <div className="text-slate-500 text-xs mt-1">{new Date(String(r.created_at)).toLocaleString()}</div>
                    </li>
                  );
                })}
                {data.activity.length === 0 && (
                  <li className="p-8 text-center text-slate-500">No activity logs yet</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-l-4 border-l-red-500">
          <CardHeader className="border-b bg-gradient-to-r from-red-50 to-white">
            <CardTitle className="text-base text-red-700">Security Events ({data.security.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              <ul className="divide-y divide-slate-100">
                {data.security.map((row) => {
                  const r = row as Record<string, unknown>;
                  return (
                    <li key={String(r.id)} className="p-3 hover:bg-red-50 transition-colors">
                      <div className="font-medium text-slate-800 text-sm">{String(r.event)}</div>
                      <div className="text-slate-500 text-xs mt-1">{new Date(String(r.created_at)).toLocaleString()}</div>
                    </li>
                  );
                })}
                {data.security.length === 0 && (
                  <li className="p-8 text-center text-slate-500">No security events</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}