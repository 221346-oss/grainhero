import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListHubspotDeals, adminUpdateDealStage } from "@/lib/hubspot.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, ArrowRight, Loader2 } from "lucide-react";

const STAGES: { id: string; label: string; color: string }[] = [
  { id: "appointmentscheduled", label: "Trial Started", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "qualifiedtobuy", label: "Trial Active", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { id: "presentationscheduled", label: "Trial Engaged", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "decisionmakerboughtin", label: "Demo Requested", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { id: "contractsent", label: "Quote Sent", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "closedwon", label: "Closed Won", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "closedlost", label: "Closed Lost", color: "bg-red-100 text-red-700 border-red-200" },
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

  const totalDeals = data?.results?.length ?? 0;
  const totalValue = (data?.results ?? []).reduce((sum, d) => sum + (Number(d.properties?.amount) || 0), 0);
  const wonDeals = dealsByStage.get("closedwon")?.length ?? 0;
  const wonValue = (dealsByStage.get("closedwon") ?? []).reduce((sum, d) => sum + (Number(d.properties?.amount) || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center shadow-md">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            Sales Pipeline
          </h1>
          <p className="text-sm text-slate-600 mt-1">HubSpot deals across the sales funnel</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Total Deals</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">{totalDeals}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Pipeline Value</p>
                <p className="text-3xl font-bold mt-1 text-slate-900">PKR {totalValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Won Deals</p>
                <p className="text-3xl font-bold mt-1 text-emerald-700">{wonDeals}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Won Value</p>
                <p className="text-3xl font-bold mt-1 text-green-700">PKR {wonValue.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Board */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-slate-500">Loading pipeline…</p>
        </div>
      )}
      {error && (
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-6">
            <p className="text-red-600 font-medium">Error: {(error as Error).message}</p>
          </CardContent>
        </Card>
      )}
      {!isLoading && !error && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((s) => {
            const list = dealsByStage.get(s.id) ?? [];
            const stageValue = list.reduce((sum, d) => sum + (Number(d.properties?.amount) || 0), 0);
            return (
              <Card key={s.id} className="shadow-md">
                <CardHeader className="pb-3 bg-gradient-to-r from-slate-50 to-white border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-slate-700">{s.label}</CardTitle>
                    <Badge variant="outline" className={s.color}>{list.length}</Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    PKR {stageValue.toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                  {list.map((d) => (
                    <div key={d.id} className="rounded-lg border border-slate-200 p-3 hover:shadow-sm transition-shadow bg-white">
                      <div className="font-semibold text-slate-800 truncate mb-1">{d.properties?.dealname ?? d.id}</div>
                      <div className="text-sm text-emerald-600 font-medium mb-2">PKR {Number(d.properties?.amount ?? 0).toLocaleString()}</div>
                      <div className="flex gap-1 flex-wrap">
                        {STAGES.filter((x) => x.id !== s.id).slice(0, 2).map((x) => (
                          <Button
                            key={x.id}
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            onClick={() => mut.mutate({ dealId: d.id, stage: x.id })}
                            disabled={mut.isPending}
                          >
                            {mut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3 mr-1" />}
                            {x.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      No deals in this stage
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
