import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListHubspotDeals, adminUpdateDealStage } from "@/lib/hubspot.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { KpiChartHubSkeleton } from "@/components/app/skeletons";

const STAGES: { id: string; label: string; color: string }[] = [
  {
    id: "appointmentscheduled",
    label: "Trial Started",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  {
    id: "qualifiedtobuy",
    label: "Trial Active",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  {
    id: "presentationscheduled",
    label: "Trial Engaged",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  {
    id: "decisionmakerboughtin",
    label: "Demo Requested",
    color: "bg-amber-100 text-amber-700 border-amber-200",
  },
  {
    id: "contractsent",
    label: "Quote Sent",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  {
    id: "closedwon",
    label: "Closed Won",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  { id: "closedlost", label: "Closed Lost", color: "bg-red-100 text-red-700 border-red-200" },
];

export const Route = createFileRoute("/_authenticated/platform/pipeline")({
  head: () => ({
    meta: [
      { title: "Platform · Pipeline — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Pipeline workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Pipeline — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Pipeline workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const listFn = useServerFn(adminListHubspotDeals);
  const updateFn = useServerFn(adminUpdateDealStage);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["platform-pipeline"],
    queryFn: () => listFn(),
  });
  const mut = useMutation({
    mutationFn: (v: { dealId: string; stage: string }) => updateFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["platform-pipeline"] }),
  });

  const dealsByStage = new Map<string, Array<{ id: string; properties: Record<string, string> }>>();
  for (const s of STAGES) dealsByStage.set(s.id, []);
  for (const d of data?.results ?? []) {
    const stage = d.properties?.dealstage ?? "appointmentscheduled";
    if (!dealsByStage.has(stage)) dealsByStage.set(stage, []);
    dealsByStage.get(stage)!.push(d);
  }

  const totalDeals = data?.results?.length ?? 0;
  const totalValue = (data?.results ?? []).reduce(
    (sum, d) => sum + (Number(d.properties?.amount) || 0),
    0,
  );
  const wonDeals = dealsByStage.get("closedwon")?.length ?? 0;
  const wonValue = (dealsByStage.get("closedwon") ?? []).reduce(
    (sum, d) => sum + (Number(d.properties?.amount) || 0),
    0,
  );

  if (isLoading) return <KpiChartHubSkeleton />;

  return (
    <AdminPageShell title="Sales pipeline" subtitle="HubSpot deals across the sales funnel">
      <AdminSummaryTiles
        columns={4}
        tiles={[
          { key: "d", label: "Total deals", value: totalDeals },
          { key: "v", label: "Pipeline value", value: `PKR ${totalValue.toLocaleString()}` },
          { key: "w", label: "Won deals", value: wonDeals },
          { key: "wv", label: "Won value", value: `PKR ${wonValue.toLocaleString()}` },
        ]}
      />

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-red-600">{(error as Error).message}</CardContent>
        </Card>
      )}
      {!error && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => {
            const list = dealsByStage.get(s.id) ?? [];
            const stageValue = list.reduce(
              (sum, d) => sum + (Number(d.properties?.amount) || 0),
              0,
            );
            return (
              <Card key={s.id}>
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-700">
                      {s.label}
                    </CardTitle>
                    <Badge variant="outline" className={s.color}>
                      {list.length}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    PKR {stageValue.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2 max-h-[360px] overflow-y-auto">
                  {list.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-md border border-slate-200 p-2.5 hover:shadow-sm transition-shadow bg-white"
                    >
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {d.properties?.dealname ?? d.id}
                      </div>
                      <div className="text-xs text-emerald-600 font-medium mt-0.5 mb-1.5">
                        PKR {Number(d.properties?.amount ?? 0).toLocaleString()}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {STAGES.filter((x) => x.id !== s.id)
                          .slice(0, 2)
                          .map((x) => (
                            <Button
                              key={x.id}
                              size="sm"
                              variant="outline"
                              className="h-6 px-2 text-[10px]"
                              onClick={() => mut.mutate({ dealId: d.id, stage: x.id })}
                              disabled={mut.isPending}
                            >
                              {mut.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                              {x.label}
                            </Button>
                          ))}
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-xs">No deals</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AdminPageShell>
  );
}
