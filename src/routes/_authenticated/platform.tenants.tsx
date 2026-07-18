import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listAllTenants } from "@/lib/platform-no-admin.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminFilterBar, AdminFilterField } from "@/components/app/admin/AdminFilterBar";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

export const Route = createFileRoute("/_authenticated/platform/tenants")({ component: TenantsPage });

type Tenant = { id: string; name: string | null; email: string | null; business_type: string | null; created_at: string | null; blocked: boolean | null; subscription_plan: string | null; team_size: number; batch_count: number };

function TenantsPage() {
  const fn = useServerFn(listAllTenants);
  const { data = [], isLoading } = useQuery({ queryKey: ["platform-tenants"], queryFn: () => fn() as Promise<Tenant[]> });
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const filtered = useMemo(() => data.filter((t) => {
    const s = q.toLowerCase();
    return !s || (t.name ?? "").toLowerCase().includes(s) || (t.email ?? "").toLowerCase().includes(s);
  }), [data, q]);

  const totalTenants = data.length;
  const activeTenants = data.filter((t) => !t.blocked).length;
  const blockedTenants = data.filter((t) => t.blocked).length;
  const thisMonth = data.filter((t) => {
    if (!t.created_at) return false;
    const created = new Date(t.created_at);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return created >= monthAgo;
  }).length;

  return (
    <AdminPageShell title="Platform tenants" subtitle="Organizations and their subscriptions">
      <AdminSummaryTiles
        columns={4}
        tiles={[
          { key: "all", label: "Total tenants", value: totalTenants },
          { key: "active", label: "Active", value: activeTenants },
          { key: "this-month", label: "This month", value: thisMonth },
          { key: "blocked", label: "Blocked", value: blockedTenants },
        ]}
      />

      <AdminFilterBar onSubmit={() => setQ(qInput)}>
        <AdminFilterField label="Search" width="flex-1 min-w-[240px]">
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search tenants by name or email…" />
        </AdminFilterField>
      </AdminFilterBar>

      <AdminDataCard
        title="All tenants"
        description={`Showing ${filtered.length} of ${data.length}`}
      >
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={6} cols={4} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <p className="text-sm">No tenants found</p>
          </div>
        ) : (
          <div>
            {filtered.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{t.name ?? "Unnamed organization"}</div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {t.email}
                    {t.business_type && <span className="ml-2">• {t.business_type}</span>}
                    {t.created_at && <span className="ml-2 text-slate-400">• Joined {new Date(t.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span><span className="font-semibold text-slate-700">{t.team_size}</span> <span className="text-slate-500">users</span></span>
                  <span><span className="font-semibold text-slate-700">{t.batch_count}</span> <span className="text-slate-500">batches</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={t.blocked ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>
                    {t.blocked ? "Blocked" : "Active"}
                  </Badge>
                  {t.subscription_plan && (
                    <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                      {t.subscription_plan}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminDataCard>
    </AdminPageShell>
  );
}
