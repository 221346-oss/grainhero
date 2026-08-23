import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboards/_shared";
import { AlertTriangle, WifiOff, Radio, ArrowRight } from "lucide-react";
import { getAttentionQueue } from "@/lib/attention-queue.functions";

export const Route = createFileRoute("/_authenticated/attention")({
  head: () => ({
    meta: [
      { title: "Attention — Grain Hero" },
      {
        name: "description",
        content: "Attention workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Attention — Grain Hero" },
      { property: "og:description", content: "Attention workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AttentionPage,
});

function AttentionPage() {
  const fn = useServerFn(getAttentionQueue);
  const { data, isLoading } = useQuery({ queryKey: ["attention-queue"], queryFn: () => fn() });
  const d = data as
    | {
        rows: Array<{
          siloId: string;
          siloName: string;
          score: number;
          fillPct: number;
          alerts: number;
          critical: number;
          topAlert: Record<string, unknown> | null;
        }>;
        offlineDeviceCount: number;
        failedCommandCount: number;
      }
    | undefined;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <PageHeader title="Attention queue" subtitle="Ranked silos needing action right now." />

      <div className="grid gap-4 sm:grid-cols-3">
        <TileCard
          icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
          label="Silos flagged"
          value={String(d?.rows.length ?? 0)}
        />
        <TileCard
          icon={<WifiOff className="h-4 w-4 text-amber-500" />}
          label="Offline devices"
          value={String(d?.offlineDeviceCount ?? 0)}
        />
        <TileCard
          icon={<Radio className="h-4 w-4 text-rose-500" />}
          label="Failed commands (24h)"
          value={String(d?.failedCommandCount ?? 0)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : !d?.rows.length ? (
            <div className="p-6 text-sm text-muted-foreground">No silos need attention. 🎉</div>
          ) : (
            <div className="divide-y">
              {d.rows.map((r) => (
                <div key={r.siloId} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.siloName}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.alerts} alert(s) · {r.critical} critical · fill {r.fillPct}%
                      {r.topAlert
                        ? ` · ${String((r.topAlert as { message?: string }).message ?? "")}`
                        : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      className={
                        r.critical > 0
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                      }
                    >
                      score {r.score}
                    </Badge>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/silos/$siloId" params={{ siloId: r.siloId }}>
                        Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
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

function TileCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
