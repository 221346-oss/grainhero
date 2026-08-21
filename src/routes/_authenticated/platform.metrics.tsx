import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Play, Plus } from "lucide-react";
import {
  listMetrics,
  upsertMetric,
  toggleMetric,
  deleteMetric,
  runMetricPreview,
} from "@/lib/metric-registry.functions";
import { listRefreshLog, refreshWarehouse } from "@/lib/analytics-refresh.functions";

export const Route = createFileRoute("/_authenticated/platform/metrics")({
  head: () => ({
    meta: [
      { title: "Platform · Metrics — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Metrics workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Metrics — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Metrics workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MetricRegistryPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Metric = Record<string, any>;

const ROLE_OPTIONS = ["super_admin", "admin", "manager", "technician", "buyer"] as const;
const FORMATS = ["number", "currency", "percent", "ratio", "duration"] as const;
const HINTS = ["tile", "line", "bar", "pie", "table"] as const;

const EMPTY: Metric = {
  id: undefined,
  key: "",
  label: "",
  description: "",
  sql_template: "SELECT count(*) AS value FROM analytics.fact_orders",
  unit: "",
  format: "number",
  allowed_roles: ["super_admin"],
  default_filters: {},
  chart_hint: "tile",
  active: true,
};

function MetricRegistryPage() {
  const qc = useQueryClient();
  const fetchList = useServerFn(listMetrics);
  const upsert = useServerFn(upsertMetric);
  const toggle = useServerFn(toggleMetric);
  const remove = useServerFn(deleteMetric);
  const preview = useServerFn(runMetricPreview);
  const refresh = useServerFn(refreshWarehouse);
  const fetchLog = useServerFn(listRefreshLog);

  const listQ = useQuery({
    queryKey: ["metric-registry"],
    queryFn: () => fetchList({ data: { onlyMine: false, active: "all" } }),
  });
  const logQ = useQuery({
    queryKey: ["refresh-log"],
    queryFn: () => fetchLog({ data: { limit: 20 } }),
  });

  const [editing, setEditing] = useState<Metric | null>(null);
  const [preview_, setPreview] = useState<string | null>(null);

  const saveM = useMutation({
    mutationFn: (m: Metric) => upsert({ data: m }),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["metric-registry"] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleM = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggle({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metric-registry"] }),
  });
  const removeM = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["metric-registry"] });
    },
  });
  const refreshM = useMutation({
    mutationFn: () => refresh({ data: { scope: "all" } }),
    onSuccess: () => {
      toast.success("Warehouse refresh queued");
      qc.invalidateQueries({ queryKey: ["refresh-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const previewM = useMutation({
    mutationFn: (key: string) => preview({ data: { key, filters: {} } }),
    onSuccess: (res) => setPreview(JSON.stringify(res, null, 2)),
    onError: (e: Error) => setPreview(String(e.message)),
  });

  const metrics = (listQ.data?.metrics ?? []) as Metric[];
  const tiles = useMemo(
    () => [
      { key: "total", label: "Metrics", value: metrics.length },
      { key: "active", label: "Active", value: metrics.filter((m) => m.active).length },
      { key: "inactive", label: "Inactive", value: metrics.filter((m) => !m.active).length },
      { key: "log", label: "Recent runs", value: logQ.data?.rows?.length ?? 0 },
    ],
    [metrics, logQ.data],
  );

  return (
    <AdminPageShell
      title="Metric Registry"
      subtitle="Every KPI on every dashboard is defined here. Zero hardcoded numbers."
      actions={
        <>
          <Button variant="outline" onClick={() => refreshM.mutate()} disabled={refreshM.isPending}>
            {refreshM.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            Refresh warehouse
          </Button>
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4 mr-1" /> New metric
          </Button>
        </>
      }
    >
      <AdminSummaryTiles tiles={tiles} columns={4} />

      <AdminDataCard title="Metrics" description="Click a metric to edit or preview.">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500 bg-slate-50/50">
            <tr>
              <th className="text-left px-4 py-2">Key</th>
              <th className="text-left px-4 py-2">Label</th>
              <th className="text-left px-4 py-2">Format</th>
              <th className="text-left px-4 py-2">Roles</th>
              <th className="text-left px-4 py-2">Active</th>
              <th className="text-right px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.id} className="border-t hover:bg-emerald-50/40">
                <td className="px-4 py-2 font-mono text-xs text-slate-700">{m.key}</td>
                <td className="px-4 py-2">{m.label}</td>
                <td className="px-4 py-2 text-slate-500">{m.format}</td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(m.allowed_roles as string[]).map((r) => (
                      <Badge key={r} variant="secondary" className="text-[10px]">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <Switch
                    checked={m.active}
                    onCheckedChange={(v) => toggleM.mutate({ id: m.id, active: v })}
                  />
                </td>
                <td className="px-4 py-2 text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => previewM.mutate(m.key)}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(m)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Delete metric?")) removeM.mutate(m.id);
                    }}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {metrics.length === 0 && !listQ.isPending && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No metrics yet. Add your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminDataCard>

      {preview_ && (
        <AdminDataCard title="Preview result">
          <pre className="p-4 text-xs overflow-auto bg-slate-950 text-emerald-200 rounded-b-lg">
            {preview_}
          </pre>
        </AdminDataCard>
      )}

      <AdminDataCard title="Recent warehouse refreshes">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-slate-500 bg-slate-50/50">
            <tr>
              <th className="text-left px-4 py-2">Fact</th>
              <th className="text-left px-4 py-2">Started</th>
              <th className="text-right px-4 py-2">Rows</th>
              <th className="text-left px-4 py-2">Error</th>
            </tr>
          </thead>
          <tbody>
            {(logQ.data?.rows ?? []).map((r) => (
              <tr key={String(r.id)} className="border-t">
                <td className="px-4 py-2 font-mono text-xs">{String(r.fact_name)}</td>
                <td className="px-4 py-2 text-xs text-slate-500">{String(r.started_at ?? "")}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {String(r.rows_upserted ?? 0)}
                </td>
                <td className="px-4 py-2 text-xs text-rose-600 truncate max-w-[300px]">
                  {String(r.error ?? "")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminDataCard>

      <MetricEditorSheet
        metric={editing}
        onClose={() => setEditing(null)}
        onSave={(m) => saveM.mutate(m)}
        saving={saveM.isPending}
      />
    </AdminPageShell>
  );
}

function MetricEditorSheet({
  metric,
  onClose,
  onSave,
  saving,
}: {
  metric: Metric | null;
  onClose: () => void;
  onSave: (m: Metric) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<Metric | null>(metric);
  // Sync when parent hands us a new metric
  if (metric && form?.id !== metric?.id && metric?.id !== undefined) {
    setForm(metric);
  } else if (metric && !form) {
    setForm(metric);
  } else if (!metric && form) {
    setForm(null);
  }
  if (!form) return null;

  const upd = (patch: Partial<Metric>) => setForm({ ...form, ...patch });
  const toggleRole = (r: string) => {
    const has = (form.allowed_roles as string[]).includes(r);
    upd({
      allowed_roles: has
        ? form.allowed_roles.filter((x: string) => x !== r)
        : [...form.allowed_roles, r],
    });
  };

  return (
    <Sheet open={!!metric} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{form.id ? "Edit" : "New"} metric</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Key</Label>
              <Input
                value={form.key}
                onChange={(e) => upd({ key: e.target.value })}
                placeholder="mrr_total"
                disabled={!!form.id}
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={form.label}
                onChange={(e) => upd({ label: e.target.value })}
                placeholder="MRR"
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={form.description ?? ""}
              onChange={(e) => upd({ description: e.target.value })}
            />
          </div>
          <div>
            <Label>SQL template</Label>
            <Textarea
              className="font-mono text-xs min-h-[160px]"
              value={form.sql_template}
              onChange={(e) => upd({ sql_template: e.target.value })}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Must return a single row. Access filters via <code>$1-&gt;&gt;'key'</code>. Bound by
              run_metric() sandbox.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Format</Label>
              <Select value={form.format} onValueChange={(v) => upd({ format: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                value={form.unit ?? ""}
                onChange={(e) => upd({ unit: e.target.value })}
                placeholder="USD"
              />
            </div>
            <div>
              <Label>Chart hint</Label>
              <Select value={form.chart_hint} onValueChange={(v) => upd({ chart_hint: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HINTS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Allowed roles</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {ROLE_OPTIONS.map((r) => {
                const on = (form.allowed_roles as string[]).includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRole(r)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${on ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300"}`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.active} onCheckedChange={(v) => upd({ active: v })} />
            <Label className="!m-0">Active</Label>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(form)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Save metric
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
