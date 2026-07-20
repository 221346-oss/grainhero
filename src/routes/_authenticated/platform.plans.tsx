import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listPlanThresholds,
  updatePlanThreshold,
  listPlanChangeRequests,
  decidePlanChangeRequest,
} from "@/lib/plan-thresholds.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { AdminDetailPanel, DetailField } from "@/components/app/admin/AdminDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/platform/plans")({
  component: PlatformPlansPage,
});

type Plan = Awaited<ReturnType<typeof listPlanThresholds>>[number];
type Req = Awaited<ReturnType<typeof listPlanChangeRequests>>[number];

function PlatformPlansPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending">("pending");

  const fetchPlans = useServerFn(listPlanThresholds);
  const fetchRequests = useServerFn(listPlanChangeRequests);
  const savePlan = useServerFn(updatePlanThreshold);
  const decide = useServerFn(decidePlanChangeRequest);

  const plansQ = useQuery({ queryKey: ["plan-thresholds"], queryFn: () => fetchPlans() });
  const reqQ = useQuery({
    queryKey: ["plan-change-requests", statusFilter],
    queryFn: () => fetchRequests({ data: { status: statusFilter } }),
  });

  const plans: Plan[] = plansQ.data ?? [];
  const requests: Req[] = reqQ.data ?? [];
  const selected = plans.find((p) => p.plan_id === selectedId) ?? null;

  const tiles = useMemo(
    () => [
      { key: "total", label: "Plans", value: plans.length },
      { key: "active", label: "Active", value: plans.filter((p) => p.is_active).length },
      { key: "pending", label: "Pending requests", value: requests.filter((r) => r.status === "pending").length },
      { key: "auto", label: "Auto-applied", value: requests.filter((r) => r.status === "auto_applied").length },
    ],
    [plans, requests],
  );

  const decideMut = useMutation({
    mutationFn: (v: { id: string; approve: boolean; reason?: string | null }) => decide({ data: v }),
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["plan-change-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const saveMut = useMutation({
    mutationFn: (v: any) => savePlan({ data: v }),
    onSuccess: () => {
      toast.success("Plan updated");
      qc.invalidateQueries({ queryKey: ["plan-thresholds"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <AdminPageShell
      title="Plans & Thresholds"
      subtitle="Configure plan limits and review tenant upgrade / downgrade requests."
    >
      <AdminSummaryTiles tiles={tiles} columns={4} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <AdminDataCard title="Plan tiers" description={`${plans.length} plans configured`}>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Plan</th>
                  <th className="text-right px-2 py-2 font-medium">Price</th>
                  <th className="text-right px-2 py-2 font-medium">Users</th>
                  <th className="text-right px-2 py-2 font-medium">Silos</th>
                  <th className="text-right px-2 py-2 font-medium">Batches</th>
                  <th className="text-right px-2 py-2 font-medium">Sensors</th>
                  <th className="text-center px-2 py-2 font-medium">Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plans.map((p) => (
                  <tr
                    key={p.plan_id}
                    onClick={() => setSelectedId(p.plan_id)}
                    className={`cursor-pointer hover:bg-slate-50 ${selectedId === p.plan_id ? "bg-emerald-50/60" : ""}`}
                  >
                    <td className="px-4 py-2">
                      <div className="font-medium text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500">{p.plan_id}</div>
                    </td>
                    <td className="text-right px-2 py-2 font-mono text-slate-700">
                      ${(p.price_cents / 100).toFixed(0)}
                    </td>
                    <td className="text-right px-2 py-2 text-slate-700">{p.max_users}</td>
                    <td className="text-right px-2 py-2 text-slate-700">{p.max_silos}</td>
                    <td className="text-right px-2 py-2 text-slate-700">{p.max_batches}</td>
                    <td className="text-right px-2 py-2 text-slate-700">{p.max_sensors}</td>
                    <td className="text-center px-2 py-2">
                      {p.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Off</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {plans.length === 0 && !plansQ.isLoading && (
                  <tr>
                    <td colSpan={7} className="text-center text-slate-400 py-10">
                      No plans configured
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </AdminDataCard>

          <AdminDataCard
            title="Plan change requests"
            description={
              <span className="flex items-center gap-2">
                <button
                  className={`text-xs px-2 py-0.5 rounded-full border ${statusFilter === "pending" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600"}`}
                  onClick={() => setStatusFilter("pending")}
                >
                  Pending
                </button>
                <button
                  className={`text-xs px-2 py-0.5 rounded-full border ${statusFilter === "all" ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-200 text-slate-600"}`}
                  onClick={() => setStatusFilter("all")}
                >
                  All
                </button>
              </span>
            }
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Tenant</th>
                  <th className="text-left px-2 py-2 font-medium">From → To</th>
                  <th className="text-left px-2 py-2 font-medium">Direction</th>
                  <th className="text-left px-2 py-2 font-medium">Status</th>
                  <th className="text-right px-4 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-mono text-[11px] text-slate-600 truncate max-w-[160px]">
                      {r.tenant_admin_id.slice(0, 8)}…
                    </td>
                    <td className="px-2 py-2 text-slate-700">
                      {r.current_plan ?? "—"} → <span className="font-medium">{r.requested_plan}</span>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className={r.direction === "upgrade" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>
                        {r.direction}
                      </Badge>
                    </td>
                    <td className="px-2 py-2">
                      <Badge variant="outline" className="text-slate-600">{r.status}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {r.status === "pending" ? (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const reason = window.prompt("Reason for rejection?");
                              if (!reason || !reason.trim()) return;
                              decideMut.mutate({ id: r.id, approve: false, reason: reason.trim() });
                            }}
                          >
                            Reject
                          </Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => decideMut.mutate({ id: r.id, approve: true })}>
                            Approve
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {requests.length === 0 && !reqQ.isLoading && (
                  <tr>
                    <td colSpan={5} className="text-center text-slate-400 py-8">
                      No {statusFilter === "pending" ? "pending" : ""} requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </AdminDataCard>
        </div>

        <AdminDetailPanel title="Edit plan" isEmpty={!selected} emptyText="Select a plan to edit thresholds">
          {selected && (
            <PlanEditor
              key={selected.plan_id}
              plan={selected}
              onSave={(patch) => saveMut.mutate({ plan_id: selected.plan_id, ...patch })}
              saving={saveMut.isPending}
            />
          )}
        </AdminDetailPanel>
      </div>
    </AdminPageShell>
  );
}

function PlanEditor({ plan, onSave, saving }: { plan: Plan; onSave: (patch: any) => void; saving: boolean }) {
  const [form, setForm] = useState({
    name: plan.name,
    price_cents: plan.price_cents,
    max_users: plan.max_users,
    max_silos: plan.max_silos,
    max_batches: plan.max_batches,
    max_sensors: plan.max_sensors,
    max_actuators: plan.max_actuators,
    is_active: plan.is_active,
    is_popular: plan.is_popular,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="space-y-4">
      <DetailField label="Name">
        <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
      </DetailField>
      <DetailField label="Price (cents)">
        <Input type="number" value={form.price_cents} onChange={(e) => set("price_cents", Number(e.target.value))} />
      </DetailField>
      <div className="grid grid-cols-2 gap-3">
        {(["max_users", "max_silos", "max_batches", "max_sensors", "max_actuators"] as const).map((k) => (
          <DetailField key={k} label={k.replace("max_", "").replace(/_/g, " ")}>
            <Input type="number" value={form[k]} onChange={(e) => set(k, Number(e.target.value))} />
          </DetailField>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
        <span className="text-sm text-slate-700">Active</span>
        <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
        <span className="text-sm text-slate-700">Popular</span>
        <Switch checked={form.is_popular} onCheckedChange={(v) => set("is_popular", v)} />
      </div>
      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        disabled={saving}
        onClick={() => onSave(form)}
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}