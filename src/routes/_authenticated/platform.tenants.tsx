import { TableSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Building2, Search, Users, Package, UserCog } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "@tanstack/react-router";
import { listAllTenants } from "@/lib/platform.functions";
import { startImpersonation } from "@/lib/impersonation.functions";

export const Route = createFileRoute("/_authenticated/platform/tenants")({ component: TenantsPage });

type Tenant = { id: string; name: string | null; email: string | null; business_type: string | null; created_at: string | null; blocked: boolean | null; subscription_plan: string | null; team_size: number; batch_count: number };

function TenantsPage() {
  const fn = useServerFn(listAllTenants);
  const impersonateFn = useServerFn(startImpersonation);
  const qc = useQueryClient();
  const router = useRouter();
  const { data = [], isLoading } = useQuery({ queryKey: ["platform-tenants"], queryFn: () => fn() as Promise<Tenant[]> });
  const impersonate = useMutation({
    mutationFn: (targetAdminId: string) => impersonateFn({ data: { targetAdminId } }),
    onSuccess: async (res) => {
      toast.success(`Viewing as ${res.tenantName}`);
      await qc.invalidateQueries();
      router.navigate({ to: "/dashboard" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const [q, setQ] = useState("");
  const filtered = useMemo(() => data.filter((t) => {
    const s = q.toLowerCase();
    return !s || (t.name ?? "").toLowerCase().includes(s) || (t.email ?? "").toLowerCase().includes(s);
  }), [data, q]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tenants..." className="pl-9" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><TableSkeleton rows={6} cols={4} /></div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-slate-500">No tenants found</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((t) => (
                <div key={t.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><Building2 className="h-5 w-5 text-slate-500" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{t.name ?? "—"}</div>
                    <div className="text-xs text-slate-500 truncate">{t.email} · {t.business_type ?? "—"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600"><Users className="h-4 w-4" />{t.team_size}</div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600"><Package className="h-4 w-4" />{t.batch_count}</div>
                  <Badge variant="outline" className={t.blocked ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>
                    {t.blocked ? "Blocked" : "Active"}
                  </Badge>
                  {t.subscription_plan && <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">{t.subscription_plan}</Badge>}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={impersonate.isPending}
                    onClick={() => impersonate.mutate(t.id)}
                    className="gap-1.5"
                  >
                    <UserCog className="h-3.5 w-3.5" /> View as
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}