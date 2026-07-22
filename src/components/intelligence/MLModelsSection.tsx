import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Activity, GitBranch } from "lucide-react";
import { getMLModels } from "@/lib/analytics.functions";
import { getPlatformMLInference } from "@/lib/platform-overviews.functions";
import { getMyRole } from "@/lib/roles.functions";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { PlatformOverviewTable } from "@/components/app/PlatformOverviewTable";

export function MLModelsSection() {
  const fetchRole = useServerFn(getMyRole);
  const fetchModels = useServerFn(getMLModels);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = ["super_admin", "admin"].includes(role);
  const isSuperAdmin = role === "super_admin";

  const { data } = useQuery({
    queryKey: ["ml-models"],
    queryFn: () => fetchModels(),
    enabled: allowed,
  });

  const fetchInf = useServerFn(getPlatformMLInference);
  const infQ = useQuery({
    queryKey: ["platform-ml-inference"],
    queryFn: () => fetchInf(),
    enabled: isSuperAdmin,
  });

  if (!roleQ.isLoading && !allowed) {
    return (
      <Card><CardHeader><CardTitle>Access restricted</CardTitle><CardDescription>Model performance is available to admins and super admins.</CardDescription></CardHeader></Card>
    );
  }

  const models = data?.models ?? [];

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <PlatformScopeBanner label="Inference volume, accuracy and confidence measured across every tenant. Retraining is not available from this view." />
      )}
      {isSuperAdmin && infQ.data && (
        <PlatformOverviewTable
          title="Per-tenant inference (last 7 days)"
          description={`${infQ.data.totalInferences.toLocaleString()} inferences · ${infQ.data.totalAnomalies.toLocaleString()} anomalies`}
          rows={infQ.data.rows}
          columns={[
            { key: "inferences", label: "Inferences", align: "right", render: (r) => r.inferences.toLocaleString() },
            { key: "critical", label: "Critical", align: "right", render: (r) => (
                <span className={r.critical > 0 ? "text-red-600 font-medium" : ""}>{r.critical}</span>
              ) },
            { key: "anomalies", label: "Anomalies", align: "right", render: (r) => r.anomalies },
            { key: "anomalyRate", label: "Anom rate", align: "right", render: (r) => `${(r.anomalyRate * 100).toFixed(1)}%` },
            { key: "avgConfidence", label: "Avg conf", align: "right", render: (r) => `${(r.avgConfidence * 100).toFixed(1)}%` },
          ]}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {models.map((m: any) => (
          <Card key={m.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{m.name}</CardTitle>
                  <CardDescription className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-mono">{m.id}</span> · {m.algorithm}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={m.status === "production" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{m.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{m.version}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Accuracy</div>
                  <div className="text-2xl font-bold text-emerald-600">{(m.accuracy * 100).toFixed(1)}%</div>
                  <Progress value={m.accuracy * 100} className="h-1.5 mt-1" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Avg confidence</div>
                  <div className="text-2xl font-bold text-slate-900">{(m.confidence * 100).toFixed(1)}%</div>
                  <Progress value={m.confidence * 100} className="h-1.5 mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600"><Database className="h-3.5 w-3.5" />{m.samples} samples</div>
                <div className="flex items-center gap-2 text-slate-600"><Activity className="h-3.5 w-3.5" />{m.type}</div>
                <div className="flex items-center gap-2 text-slate-600"><GitBranch className="h-3.5 w-3.5" />{new Date(m.last_trained).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Features</div>
                <div className="flex flex-wrap gap-1">
                  {m.features.map((f: string) => (
                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{f}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Output classes</div>
                <div className="flex flex-wrap gap-1">
                  {m.classes.map((c: string) => (
                    <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{c}</span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {models.length === 0 && (
          <div className="lg:col-span-2 p-10 text-center text-sm text-white/40">No models available.</div>
        )}
      </div>
    </div>
  );
}
