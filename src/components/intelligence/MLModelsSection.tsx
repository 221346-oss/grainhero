import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Database, Activity, GitBranch } from "lucide-react";
import { getMLModels } from "@/lib/analytics.functions";
import { getMyRole } from "@/lib/roles.functions";
import { useLocationScope } from "@/components/app/location/LocationScope";

export function MLModelsSection() {
  const fetchRole = useServerFn(getMyRole);
  const fetchModels = useServerFn(getMLModels);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const allowed = role === "admin";

  // Each site trains on its own data, so performance is reported per location.
  const scope = useLocationScope();
  const loc = scope?.scopeKey ?? null;

  const { data } = useQuery({
    queryKey: ["ml-models", loc],
    queryFn: () => fetchModels({ data: { loc: loc ?? undefined } }),
    enabled: allowed,
  });

  if (!roleQ.isLoading && !allowed) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access restricted</CardTitle>
          <CardDescription>
            Model performance is available to admins. Super Admin has a separate model-monitoring
            view under Platform.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const models = data?.models ?? [];

  return (
    <div className="space-y-6">
      {/* Say which data these figures come from. Without this an admin reading
          one city's accuracy has no way to tell it is not the whole account. */}
      {scope?.active && (
        <p className="text-[11px] text-muted-foreground">
          Performance for <span className="font-semibold text-foreground">{scope.active.city}</span>{" "}
          only — each location trains on its own data, so these figures differ between sites.
        </p>
      )}
      {data?.lowConfidence && (
        <p className="text-[11px] font-medium text-warning">
          Based on {data.labelledSamples ?? 0} labelled readings — below the {data.minSamples ?? 50}{" "}
          needed for a stable figure. Treat these numbers as indicative.
        </p>
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
                  <Badge
                    className={
                      m.status === "production"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }
                  >
                    {m.status}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {m.version}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Accuracy
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">
                    {(m.accuracy * 100).toFixed(1)}%
                  </div>
                  <Progress value={m.accuracy * 100} className="h-1.5 mt-1" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                    Avg confidence
                  </div>
                  <div className="text-2xl font-bold text-foreground">
                    {(m.confidence * 100).toFixed(1)}%
                  </div>
                  <Progress value={m.confidence * 100} className="h-1.5 mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Database className="h-3.5 w-3.5" />
                  {m.samples} samples
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" />
                  {m.type}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GitBranch className="h-3.5 w-3.5" />
                  {new Date(m.last_trained).toLocaleDateString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Features
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.features.map((f: string) => (
                    <span
                      key={f}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">
                  Output classes
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.classes.map((c: string) => (
                    <span
                      key={c}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border-emerald-100"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {models.length === 0 && (
          <div className="lg:col-span-2 p-10 text-center text-sm text-muted-foreground">
            No models available.
          </div>
        )}
      </div>
    </div>
  );
}
