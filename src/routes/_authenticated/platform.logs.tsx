import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPlatformLogs } from "@/lib/platform.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { AdminFilterBar, AdminFilterField } from "@/components/app/admin/AdminFilterBar";

export const Route = createFileRoute("/_authenticated/platform/logs")({
  head: () => ({
    meta: [
      { title: "Platform · Logs — Grain Hero" },
      { name: "description", content: "Platform · Logs workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Logs — Grain Hero" },
      { property: "og:description", content: "Platform · Logs workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }), component: LogsPage });

const SEV: Record<string, string> = {
  info: "bg-muted text-foreground border-border/40",
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
    <AdminPageShell title="Platform logs" subtitle="Global activity across all tenants and users">
      <AdminFilterBar onSubmit={() => { /* client-side */ }}>
        <AdminFilterField label="Severity" width="w-48">
          <Select value={sev} onValueChange={setSev}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </AdminFilterField>
      </AdminFilterBar>

      <AdminDataCard title="Activity logs" description={`Showing ${data.length} events`}>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading logs…</div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-muted-foreground">
            <p className="text-sm">No logs found</p>
          </div>
        ) : (
          <div className="">
            {data.map((l: any) => (
              <div key={l.id} className="px-4 py-3 hover:bg-muted/20">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className={SEV[l.severity] ?? SEV.info}>{l.severity}</Badge>
                  <span className="text-sm font-medium text-foreground">{l.action}</span>
                  <span className="text-xs text-muted-foreground">{l.category}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
                </div>
                <div className="text-sm text-muted-foreground">{l.description}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {l.user_name ?? "system"} · {l.user_role ?? "—"} · tenant {l.admin_id?.slice(0, 8)}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminDataCard>
    </AdminPageShell>
  );
}