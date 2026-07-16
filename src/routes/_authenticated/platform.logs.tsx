import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlatformLogs } from "@/lib/platform.functions";

export const Route = createFileRoute("/_authenticated/platform/logs")({ component: LogsPage });

const SEV: Record<string, string> = {
  info: "bg-slate-100 text-slate-700 border-slate-200",
  warning: "bg-amber-100 text-amber-700 border-amber-200",
  critical: "bg-red-100 text-red-700 border-red-200",
};

function LogsPage() {
  const [sev, setSev] = useState("all");
  const fn = useServerFn(getPlatformLogs);
  const { data = [], isLoading } = useQuery({
    queryKey: ["platform-logs", sev],
    queryFn: () => fn({ data: { limit: 200, severity: sev } }),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 grid place-items-center shadow-md">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            Platform Logs
          </h1>
          <p className="text-sm text-slate-600 mt-1">Global activity across all tenants and users</p>
        </div>
        <Select value={sev} onValueChange={setSev}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs List */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-lg">Activity Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-slate-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-slate-500">Loading logs…</p>
            </div>
          ) : data.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No logs found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your filter</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.map((l: any) => (
                <div key={l.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <Badge variant="outline" className={SEV[l.severity] ?? SEV.info}>
                      {l.severity}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-800">{l.action}</span>
                    <span className="text-xs text-slate-500">{l.category}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      {new Date(l.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">{l.description}</div>
                  <div className="mt-1 text-xs text-slate-400">
                    {l.user_name ?? "system"} · {l.user_role ?? "—"} · tenant {l.admin_id?.slice(0, 8)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}