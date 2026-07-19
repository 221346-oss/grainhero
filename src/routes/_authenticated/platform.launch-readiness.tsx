import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getLaunchReadiness } from "@/lib/launch-readiness.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/launch-readiness")({
  head: () => ({ meta: [{ title: "Launch Readiness — Grain Hero" }, { name: "robots", content: "noindex" }] }),
  component: LaunchReadinessPage,
});

function LaunchReadinessPage() {
  const fetchFn = useServerFn(getLaunchReadiness);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["launch-readiness"],
    queryFn: () => fetchFn(),
    refetchInterval: 60_000,
  });

  return (
    <AdminPageShell
      title="Launch Readiness"
      subtitle="Final go-live checklist covering payments, notifications, mobile sync, and disputes."
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching || isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
    >
      <Card className="p-6 mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Overall score</div>
          <div className="text-4xl font-semibold">{data?.score ?? "—"}%</div>
          <div className="text-xs text-muted-foreground mt-1">{data?.passing ?? 0} of {data?.total ?? 0} checks passing</div>
        </div>
        <Badge variant={data && data.score === 100 ? "default" : "secondary"} className="text-sm">
          {data && data.score === 100 ? "Ready to publish" : "Needs attention"}
        </Badge>
      </Card>
      <div className="grid gap-3">
        {data?.checks.map((c) => (
          <Card key={c.key} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${c.ok ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}>
                {c.ok ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </div>
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.detail}</div>
              </div>
            </div>
            <Badge variant={c.ok ? "outline" : "destructive"}>{c.ok ? "OK" : "Review"}</Badge>
          </Card>
        ))}
      </div>
    </AdminPageShell>
  );
}