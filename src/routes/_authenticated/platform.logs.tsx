import { BrandedLoader } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <ClipboardList className="h-4 w-4 text-slate-500" />
          <div className="text-sm font-medium text-slate-700 flex-1">Global activity across all tenants</div>
          <Select value={sev} onValueChange={setSev}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton rows={8} cols={4} /></div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No logs</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.map((l: any) => (
                <div key={l.id} className="p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className={SEV[l.severity] ?? SEV.info}>{l.severity}</Badge>
                    <span className="text-sm font-semibold text-slate-800">{l.action}</span>
                    <span className="text-xs text-slate-500">{l.category}</span>
                    <span className="ml-auto text-xs text-slate-400">{new Date(l.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{l.description}</div>
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