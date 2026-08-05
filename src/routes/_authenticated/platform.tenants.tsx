import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listAllTenants, getTenantDetail } from "@/lib/platform-no-admin.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { AdminFilterBar, AdminFilterField } from "@/components/app/admin/AdminFilterBar";
import { AdminDataCard } from "@/components/app/admin/AdminDataCard";

export const Route = createFileRoute("/_authenticated/platform/tenants")({
  head: () => ({
    meta: [
      { title: "Platform · Tenants — Grain Hero" },
      { name: "description", content: "Platform · Tenants workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Tenants — Grain Hero" },
      { property: "og:description", content: "Platform · Tenants workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }), component: TenantsPage });

type Tenant = {
  id: string; name: string | null; email: string | null;
  business_type: string | null; created_at: string | null;
  blocked: boolean | null; subscription_plan: string | null;
  team_size: number; batch_count: number;
};

// ── Skeleton pulse ────────────────────────────────────────────────────────────
function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-slate-100 ${className}`} />;
}

// ── Usage bar ─────────────────────────────────────────────────────────────────
function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#2FAC0C";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="tabular-nums text-slate-500">{used} / {max > 0 ? max : "∞"}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Tenant detail Sheet ───────────────────────────────────────────────────────
function TenantDetailSheet({ adminId, onClose }: { adminId: string; onClose: () => void }) {
  const fn = useServerFn(getTenantDetail);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenant-detail", adminId],
    queryFn: () => fn({ data: { adminId } }),
    enabled: !!adminId,
    staleTime: 30_000,
  });

  const { profile, subscription: sub, usage, silos, team, recentBatches, activityLogs } = data ?? {};

  const daysUntilExpiry = sub?.end_date
    ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86_400_000)
    : null;

  function severityDot(s?: string | null) {
    if (s === "critical") return "bg-red-500";
    if (s === "warning" || s === "high") return "bg-amber-500";
    return "bg-slate-300";
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{profile?.name ?? profile?.email ?? "Tenant"}</SheetTitle>
          {profile?.email && (
            <p className="text-xs text-slate-500">{profile.email}{profile.business_type ? ` · ${profile.business_type}` : ""}</p>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <Sk key={i} className="h-16 rounded-lg" />)}
            </div>
            <Sk className="h-40 rounded-lg" />
            <Sk className="h-32 rounded-lg" />
          </div>
        )}

        {isError && (
          <p className="mt-6 text-sm text-red-500">Could not load tenant details.</p>
        )}

        {data && profile && (
          <div className="mt-6 space-y-5">

            {/* ── Stats strip ── */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-base font-bold text-slate-800">{sub?.plan_name ?? profile.subscription_plan ?? "—"}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{sub?.status ?? "no active sub"}</div>
              </div>
              <div className={`rounded-lg border p-3 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                <div className={`text-base font-bold ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "text-amber-700" : "text-slate-800"}`}>
                  {sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : "—"}
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">
                  {daysUntilExpiry !== null ? `${daysUntilExpiry} days left` : "Expires"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-base font-bold text-slate-800">{usage?.silos ?? 0}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Silos</div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-base font-bold text-slate-800">{usage?.team ?? 0}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Team members</div>
              </div>
            </div>

            {/* ── Plan usage bars ── */}
            {sub && (
              <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Plan Usage</p>
                <UsageBar used={usage?.silos ?? 0}      max={sub.max_silos      ?? 0} label="Silos" />
                <UsageBar used={usage?.warehouses ?? 0} max={sub.max_warehouses ?? 0} label="Warehouses" />
                <UsageBar used={usage?.team ?? 0}       max={sub.max_users      ?? 0} label="Team" />
                <UsageBar used={usage?.batches ?? 0}    max={sub.max_batches    ?? 0} label="Batches" />
                {(usage?.capacityKg ?? 0) > 0 && (
                  <UsageBar
                    used={usage?.totalKg ?? 0}
                    max={usage?.capacityKg ?? 0}
                    label={`Storage (${(usage?.totalKg ?? 0).toLocaleString()} / ${(usage?.capacityKg ?? 0).toLocaleString()} kg)`}
                  />
                )}
              </div>
            )}

            {/* ── Profile info ── */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-2 text-sm">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Profile</p>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <Badge className={profile.blocked ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}>
                  {profile.blocked ? "Blocked" : "Active"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Joined</span>
                <span className="text-slate-700 font-medium">{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</span>
              </div>
              {sub?.price && (
                <div className="flex justify-between">
                  <span className="text-slate-500">MRR</span>
                  <span className="text-slate-700 font-medium">PKR {Number(sub.price).toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* ── Silos list ── */}
            {(silos ?? []).length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <p className="px-4 py-2.5 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Silos ({(silos ?? []).length})
                </p>
                <div className="divide-y divide-slate-50 max-h-40 overflow-y-auto">
                  {(silos as any[]).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2 text-xs">
                      <span className="text-slate-700 truncate max-w-[200px]">{s.name}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Team ── */}
            {(team ?? []).length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <p className="px-4 py-2.5 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Team ({(team ?? []).length})
                </p>
                <div className="divide-y divide-slate-50 max-h-36 overflow-y-auto">
                  {(team as any[]).map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{m.name ?? m.email ?? m.id.slice(0, 8)}</p>
                        {m.email && <p className="text-[10px] text-slate-400 truncate">{m.email}</p>}
                      </div>
                      {m.blocked && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium shrink-0">blocked</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent batches ── */}
            {(recentBatches ?? []).length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <p className="px-4 py-2.5 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Recent Batches
                </p>
                <div className="divide-y divide-slate-50 max-h-36 overflow-y-auto">
                  {(recentBatches as any[]).map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2 text-xs">
                      <span className="text-slate-700 capitalize">{b.grain_type ?? "—"} · {Number(b.quantity_kg ?? 0).toLocaleString()} kg</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${b.status === "stored" ? "bg-emerald-100 text-emerald-700" : b.status === "dispatched" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Activity ── */}
            {(activityLogs ?? []).length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                <p className="px-4 py-2.5 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Recent Activity
                </p>
                <div className="divide-y divide-slate-50 max-h-36 overflow-y-auto">
                  {(activityLogs as any[]).map((l) => (
                    <div key={l.id} className="flex items-start gap-2 px-4 py-2">
                      <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(l.severity)}`} />
                      <div className="min-w-0">
                        <p className="text-xs text-slate-700 truncate">{l.description ?? l.action}</p>
                        <p className="text-[10px] text-slate-400">{l.created_at ? new Date(l.created_at).toLocaleString() : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
function TenantsPage() {
  const fn = useServerFn(listAllTenants);
  const { data = [], isLoading } = useQuery({ queryKey: ["platform-tenants"], queryFn: () => fn() as Promise<Tenant[]>, staleTime: 60_000 });
  const [q, setQ] = useState("");
  const [qInput, setQInput] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => data.filter((t) => {
    const s = q.toLowerCase();
    return !s || (t.name ?? "").toLowerCase().includes(s) || (t.email ?? "").toLowerCase().includes(s);
  }), [data, q]);

  const totalTenants   = data.length;
  const activeTenants  = data.filter((t) => !t.blocked).length;
  const blockedTenants = data.filter((t) => t.blocked).length;
  const thisMonth = data.filter((t) => {
    if (!t.created_at) return false;
    const created = new Date(t.created_at);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return created >= monthAgo;
  }).length;

  if (isLoading) {
    return (
      <AdminPageShell title="Platform tenants" subtitle="Organizations and their subscriptions">
        <div className="space-y-4">
          <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-background p-4 space-y-2">
                <Sk className="h-6 w-10" /><Sk className="h-[11px] w-20" />
              </div>
            ))}
          </div>
          <Sk className="h-11 rounded-md" />
          <div className="border border-border rounded-md overflow-hidden bg-background">
            <div className="px-4 py-3 border-b border-border flex justify-between">
              <Sk className="h-[13px] w-24" /><Sk className="h-[13px] w-20" />
            </div>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-4 border-b border-border last:border-0">
                <div className="flex-1 space-y-1.5"><Sk className="h-[13px] w-40" /><Sk className="h-[11px] w-56" /></div>
                <Sk className="h-[11px] w-16" /><Sk className="h-5 w-14 rounded" />
              </div>
            ))}
          </div>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell title="Platform tenants" subtitle="Organizations and their subscriptions">
      <AdminSummaryTiles
        columns={4}
        tiles={[
          { key: "all",     label: "Total tenants", value: totalTenants },
          { key: "active",  label: "Active",        value: activeTenants },
          { key: "month",   label: "This month",    value: thisMonth },
          { key: "blocked", label: "Blocked",       value: blockedTenants },
        ]}
      />

      <AdminFilterBar onSubmit={() => setQ(qInput)}>
        <AdminFilterField label="Search" width="flex-1 min-w-[240px]">
          <Input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search tenants by name or email…" />
        </AdminFilterField>
      </AdminFilterBar>

      <AdminDataCard title="All tenants" description={`Showing ${filtered.length} of ${data.length}`}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-slate-400">
            <p className="text-sm">No tenants found</p>
          </div>
        ) : (
          <div>
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className="w-full flex flex-wrap items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
              >
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
              </button>
            ))}
          </div>
        )}
      </AdminDataCard>

      {/* Tenant detail Sheet */}
      {selectedId && (
        <TenantDetailSheet adminId={selectedId} onClose={() => setSelectedId(null)} />
      )}

      {/* Child route outlet — required by router even though we use Sheet */}
      <Outlet />
    </AdminPageShell>
  );
}
