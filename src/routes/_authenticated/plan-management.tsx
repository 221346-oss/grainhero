import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listPlanThresholds,
  listPlanChangeRequests,
  requestPlanChange,
  cancelPlanChangeRequest,
  setAutoUpgrade,
} from "@/lib/plan-thresholds.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useMyProfile } from "@/hooks/useMyProfile";

export const Route = createFileRoute("/_authenticated/plan-management")({
  component: PlanManagementPage,
});

function PlanManagementPage() {
  const qc = useQueryClient();
  const profile = useMyProfile();
  const currentPlan = (profile.data as any)?.subscription_plan ?? "starter";
  const autoUpgrade = (profile.data as any)?.auto_upgrade_enabled === true;

  const [note, setNote] = useState("");

  const fetchPlans = useServerFn(listPlanThresholds);
  const fetchRequests = useServerFn(listPlanChangeRequests);
  const request = useServerFn(requestPlanChange);
  const cancel = useServerFn(cancelPlanChangeRequest);
  const setAuto = useServerFn(setAutoUpgrade);

  const plansQ = useQuery({ queryKey: ["plan-thresholds"], queryFn: () => fetchPlans() });
  const reqQ = useQuery({
    queryKey: ["my-plan-change-requests"],
    queryFn: () => fetchRequests({ data: { status: "all" } }),
  });

  const plans = plansQ.data ?? [];
  const requests = reqQ.data ?? [];
  const current = plans.find((p: any) => p.plan_id === currentPlan);

  const tiles = useMemo(
    () => [
      { key: "plan", label: "Current plan", value: current?.name ?? currentPlan },
      { key: "price", label: "Monthly", value: current ? `$${(current.price_cents / 100).toFixed(0)}` : "—" },
      { key: "pending", label: "Pending requests", value: requests.filter((r: any) => r.status === "pending").length },
      { key: "auto", label: "Auto-upgrade", value: autoUpgrade ? "On" : "Off" },
    ],
    [current, currentPlan, requests, autoUpgrade],
  );

  const reqMut = useMutation({
    mutationFn: (v: { requested_plan: string }) => request({ data: { ...v, note: note || null } }),
    onSuccess: (res: any) => {
      toast.success(res.auto_applied ? "Upgrade applied automatically" : "Change requested — awaiting super admin");
      setNote("");
      qc.invalidateQueries({ queryKey: ["my-plan-change-requests"] });
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => {
      toast.success("Request cancelled");
      qc.invalidateQueries({ queryKey: ["my-plan-change-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const autoMut = useMutation({
    mutationFn: (enabled: boolean) => setAuto({ data: { enabled } }),
    onSuccess: () => {
      toast.success("Preference saved");
      qc.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });

  return (
    <AdminPageShell
      title="Plan management"
      subtitle="Compare plans, request an upgrade or downgrade, and manage auto-upgrade."
    >
      <AdminSummaryTiles tiles={tiles} columns={4} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Preferences</CardTitle>
          <CardDescription>Auto-approve upgrades so they apply without super-admin review.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="text-sm text-slate-700">Automatically apply upgrade requests</div>
          <Switch checked={autoUpgrade} onCheckedChange={(v) => autoMut.mutate(v)} disabled={autoMut.isPending} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p: any) => {
          const isCurrent = p.plan_id === currentPlan;
          return (
            <Card key={p.plan_id} className={isCurrent ? "border-emerald-500 shadow" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  {isCurrent && <Badge className="bg-emerald-600 text-white">Current</Badge>}
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  ${(p.price_cents / 100).toFixed(0)}
                  <span className="text-xs font-normal text-slate-500">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                <div className="flex justify-between"><span className="text-slate-500">Users</span>{p.max_users}</div>
                <div className="flex justify-between"><span className="text-slate-500">Silos</span>{p.max_silos}</div>
                <div className="flex justify-between"><span className="text-slate-500">Batches</span>{p.max_batches}</div>
                <div className="flex justify-between"><span className="text-slate-500">Sensors</span>{p.max_sensors}</div>
                <Button
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                  disabled={isCurrent || reqMut.isPending}
                  onClick={() => reqMut.mutate({ requested_plan: p.plan_id })}
                >
                  {isCurrent ? "Current" : "Request"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Note (optional)</CardTitle>
          <CardDescription>Attach a note to your next plan-change request.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Why are you upgrading/downgrading?"
            rows={2}
          />
        </CardContent>
      </Card>

      <AdminDataCard title="Request history" description={`${requests.length} total`}>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Requested</th>
              <th className="text-left px-2 py-2 font-medium">From → To</th>
              <th className="text-left px-2 py-2 font-medium">Direction</th>
              <th className="text-left px-2 py-2 font-medium">Status</th>
              <th className="text-right px-4 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r: any) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString()}
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
                    <Button size="sm" variant="outline" onClick={() => cancelMut.mutate(r.id)}>Cancel</Button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && !reqQ.isLoading && (
              <tr>
                <td colSpan={5} className="text-center text-slate-400 py-8">No requests yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </AdminDataCard>
    </AdminPageShell>
  );
}