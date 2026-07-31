import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { Badge } from "@/components/ui/badge";
import { getSaasRevenueAnalytics } from "@/lib/revenue-analytics.functions";
import { getPlatformInsuranceOverview } from "@/lib/platform-overviews.functions";

export const Route = createFileRoute("/_authenticated/platform/business")({
  component: PlatformBusinessPage,
});

const fmtPKR = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 });

function PlatformBusinessPage() {
  const revenueFn = useServerFn(getSaasRevenueAnalytics);
  const insuranceFn = useServerFn(getPlatformInsuranceOverview);

  const revenueQ = useQuery({ queryKey: ["platform-revenue"], queryFn: () => revenueFn(), refetchInterval: 60_000 });
  const insuranceQ = useQuery({ queryKey: ["platform-insurance"], queryFn: () => insuranceFn(), refetchInterval: 60_000 });

  const kpis = revenueQ.data?.kpis;
  const planSeries = revenueQ.data?.planSeries ?? [];
  const expiring = revenueQ.data?.expiring ?? [];
  const insTotals = insuranceQ.data?.totals;
  const insRows = insuranceQ.data?.rows ?? [];

  const revenueTiles = [
    { key: "mrr", label: "MRR", value: kpis ? fmtPKR.format(kpis.mrr) : "—" },
    { key: "arr", label: "ARR", value: kpis ? fmtPKR.format(kpis.arr) : "—" },
    { key: "active", label: "Active subs", value: kpis?.activeCount ?? "—" },
    { key: "trial", label: "Trial", value: kpis?.trialCount ?? "—" },
    { key: "churn", label: "Churn (30d)", value: kpis ? `${kpis.churnRate}%` : "—" },
  ];

  const insuranceTiles = [
    { key: "coverage", label: "Total insured value", value: insTotals ? fmtPKR.format(insTotals.coverage) : "—" },
    { key: "premium", label: "Total premium", value: insTotals ? fmtPKR.format(insTotals.premium) : "—" },
    { key: "policies", label: "Policies", value: insTotals?.policies ?? "—" },
    { key: "openClaims", label: "Open claims", value: insTotals?.openClaims ?? "—" },
  ];

  return (
    <AdminPageShell
      title="Business"
      subtitle="Revenue, subscriptions, and insurance across every tenant — aggregate view. Read-only."
    >
      <PlatformScopeBanner label="Platform-wide totals. Manage individual tenant billing/insurance from Tenants or the tenant's own Business page." />

      <AdminDataCard title="Revenue & subscriptions" description={kpis ? `${fmtPKR.format(kpis.totalRevenue)} total revenue (invoices + hardware)` : "Loading…"}>
        <div className="p-4">
          <AdminSummaryTiles columns={5} tiles={revenueTiles} />
        </div>
      </AdminDataCard>

      <AdminDataCard title="MRR by plan" description="Monthly recurring revenue split across plans">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Plan</th>
              <th className="text-right px-4 py-2 font-medium">MRR</th>
            </tr>
          </thead>
          <tbody>
            {planSeries.map((p) => (
              <tr key={p.plan} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800 capitalize">{p.plan}</td>
                <td className="px-4 py-2 text-right tabular-nums">{fmtPKR.format(p.mrr)}</td>
              </tr>
            ))}
            {planSeries.length === 0 && !revenueQ.isLoading && (
              <tr><td colSpan={2} className="text-center text-slate-400 py-8">No active subscriptions yet.</td></tr>
            )}
          </tbody>
        </table>
      </AdminDataCard>

      {expiring.length > 0 && (
        <AdminDataCard title="Expiring soon" description="Subscriptions ending within 7 days">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Plan</th>
                <th className="text-right px-4 py-2 font-medium">Ends</th>
              </tr>
            </thead>
            <tbody>
              {expiring.map((s) => (
                <tr key={s.id} className="border-t hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-800">{s.plan_name ?? "—"}</td>
                  <td className="px-4 py-2 text-right text-amber-700">{s.end_date ? new Date(s.end_date).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataCard>
      )}

      <AdminDataCard title="Insurance" description={insTotals ? `${insTotals.policies} policies · ${insTotals.openClaims} open claims` : "Loading…"}>
        <div className="p-4">
          <AdminSummaryTiles columns={4} tiles={insuranceTiles} />
        </div>
      </AdminDataCard>

      <AdminDataCard title="Insurance by tenant" description="Coverage, premium, and claim activity — highest coverage first">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Tenant</th>
              <th className="text-right px-2 py-2 font-medium">Policies</th>
              <th className="text-right px-2 py-2 font-medium">Coverage</th>
              <th className="text-right px-4 py-2 font-medium">Open claims</th>
            </tr>
          </thead>
          <tbody>
            {insRows.slice(0, 25).map((r) => (
              <tr key={r.admin_id} className="border-t hover:bg-slate-50">
                <td className="px-4 py-2 font-medium text-slate-800 truncate max-w-[220px]">{r.name}</td>
                <td className="px-2 py-2 text-right tabular-nums text-slate-600">{r.activePolicies}/{r.policies}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtPKR.format(r.coverage)}</td>
                <td className="px-4 py-2 text-right">
                  {r.openClaims > 0 ? <Badge variant="destructive" className="font-mono">{r.openClaims}</Badge> : <span className="text-slate-400">0</span>}
                </td>
              </tr>
            ))}
            {insRows.length === 0 && !insuranceQ.isLoading && (
              <tr><td colSpan={4} className="text-center text-slate-400 py-8">No insurance policies yet.</td></tr>
            )}
          </tbody>
        </table>
      </AdminDataCard>
    </AdminPageShell>
  );
}
