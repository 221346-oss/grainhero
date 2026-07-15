import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListHubspotDeals, adminUpdateDealStage } from "@/lib/hubspot.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

const STAGES: { id: string; label: string }[] = [
  { id: "appointmentscheduled", label: "Trial Started" },
  { id: "qualifiedtobuy", label: "Trial Active" },
  { id: "presentationscheduled", label: "Trial Engaged" },
  { id: "decisionmakerboughtin", label: "Demo Requested" },
  { id: "contractsent", label: "Quote Sent" },
  { id: "closedwon", label: "Closed Won" },
  { id: "closedlost", label: "Closed Lost" },
];

export const Route = createFileRoute("/_authenticated/platform/pipeline")({
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Sales Pipeline</h2>
        <p className="text-xs text-slate-500 mt-1">HubSpot deals across the funnel.</p>
      </div>
      {isLoading && <div className="text-sm text-slate-500">Loading pipeline…</div>}
      {error && <div className="text-sm text-red-600">Error: {(error as Error).message}</div>}
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        {STAGES.map((s) => {
          const list = dealsByStage.get(s.id) ?? [];
          return (
            <Card key={s.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs uppercase tracking-wider text-slate-500">{s.label}</CardTitle>
                  <Badge variant="outline">{list.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {list.map((d) => (
                  <div key={d.id} className="rounded-md border border-slate-200 p-2 text-xs">
                    <div className="font-semibold text-slate-800 truncate">{d.properties?.dealname ?? d.id}</div>
                    <div className="text-slate-500">${d.properties?.amount ?? "0"}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {STAGES.filter((x) => x.id !== s.id).slice(0, 3).map((x) => (
                        <Button
                          key={x.id}
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => mut.mutate({ dealId: d.id, stage: x.id })}
                          disabled={mut.isPending}
                        >
                          → {x.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                {list.length === 0 && <div className="text-xs text-slate-400 italic">Empty</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}