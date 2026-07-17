import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { listAllTenants } from "@/lib/platform-no-admin.functions";

export const Route = createFileRoute("/_authenticated/platform/tenants")({ component: TenantsPage });

type Tenant = { id: string; name: string | null; email: string | null; business_type: string | null; created_at: string | null; blocked: boolean | null; subscription_plan: string | null; team_size: number; batch_count: number };

function TenantsPage() {
  const fn = useServerFn(listAllTenants);
  const { data = [], isLoading } = useQuery({ queryKey: ["platform-tenants"], queryFn: () => fn() as Promise<Tenant[]> });
  const [q, setQ] = useState("");
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
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Tenants</h1>
          <p className="text-xs text-slate-600 mt-1">Manage organizations and their subscriptions</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Tenants</p>
            <p className="text-2xl font-bold mt-1 text-slate-900">{totalTenants}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Active</p>
            <p className="text-2xl font-bold mt-1 text-green-700">{activeTenants}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">This Month</p>
            <p className="text-2xl font-bold mt-1 text-blue-700">{thisMonth}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Blocked</p>
            <p className="text-2xl font-bold mt-1 text-red-600">{blockedTenants}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenants by name or email..." className="h-9 text-sm" />
        </CardContent>
      </Card>

      {/* Tenants List */}
      <Card className="shadow-md">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-lg">All Tenants</CardTitle>
          <CardDescription>View organizations, team sizes, and subscription plans</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent"></div>
              <p className="mt-2 text-sm text-slate-500">Loading tenants…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-500 font-medium">No tenants found</p>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate text-lg">{t.name ?? "Unnamed Organization"}</div>
                    <div className="text-sm text-slate-500 truncate mt-0.5">
                      {t.email}
                      {t.business_type && <span className="ml-2">• {t.business_type}</span>}
                    </div>
                    {t.created_at && (
                      <div className="text-xs text-slate-400 mt-1">
                        Joined {new Date(t.created_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="font-semibold text-slate-700">{t.team_size}</span>
                        <span className="text-slate-500 text-xs ml-1">users</span>
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold text-slate-700">{t.batch_count}</span>
                        <span className="text-slate-500 text-xs ml-1">batches</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={t.blocked ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>
                        {t.blocked ? "Blocked" : "Active"}
                      </Badge>
                      {t.subscription_plan && (
                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                          {t.subscription_plan}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
