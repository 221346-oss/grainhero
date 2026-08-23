import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { getTenantDetail } from "@/lib/platform-no-admin.functions";

export const Route = createFileRoute("/_authenticated/platform/tenants/$adminId")({
  head: () => ({
    meta: [
      { title: "Platform · Tenants · AdminId — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Tenants · AdminId workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Tenants · AdminId — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Tenants · AdminId workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: TenantDetailSheet,
});

function Sk({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  const color = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#2FAC0C";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {used} / {max > 0 ? max : "∞"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TenantDetailSheet() {
  const { adminId } = Route.useParams();
  const navigate = useNavigate();
  const fn = useServerFn(getTenantDetail);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenant-detail", adminId],
    queryFn: () => fn({ data: { adminId } }),
    staleTime: 30_000,
  });

  function onClose() {
    navigate({ to: "/platform/tenants" });
  }

  const {
    profile,
    subscription: sub,
    usage,
    silos,
    team,
    recentBatches,
    activityLogs,
  } = data ?? {};

  const daysUntilExpiry = sub?.end_date
    ? Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86_400_000)
    : null;

  function severityDot(s?: string | null) {
    if (s === "critical") return "bg-red-500";
    if (s === "warning" || s === "high") return "bg-amber-500";
    return "bg-slate-300";
  }

  return (
    <Sheet
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{profile?.name ?? profile?.email ?? "Tenant"}</SheetTitle>
          {profile?.email && (
            <p className="text-xs text-muted-foreground">
              {profile.email}
              {profile.business_type ? ` · ${profile.business_type}` : ""}
            </p>
          )}
        </SheetHeader>

        {isLoading && (
          <div className="mt-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <Sk key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Sk className="h-40 rounded-lg" />
            <Sk className="h-32 rounded-lg" />
          </div>
        )}

        {isError && <p className="mt-6 text-sm text-red-500">Could not load tenant details.</p>}

        {data && profile && (
          <div className="mt-6 space-y-5">
            {/* Stats strip */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border-border/40 bg-muted/20 p-3">
                <div className="text-base font-bold text-foreground">
                  {sub?.plan_name ?? profile.subscription_plan ?? "—"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {sub?.status ?? "no active sub"}
                </div>
              </div>
              <div
                className={`rounded-lg border p-3 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "border-amber-200 bg-amber-50" : "border-border/40 bg-muted/20"}`}
              >
                <div
                  className={`text-base font-bold ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? "text-amber-700" : "text-foreground"}`}
                >
                  {sub?.end_date ? new Date(sub.end_date).toLocaleDateString() : "—"}
                </div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  {daysUntilExpiry !== null ? `${daysUntilExpiry} days left` : "Expires"}
                </div>
              </div>
              <div className="rounded-lg border-border/40 bg-muted/20 p-3">
                <div className="text-base font-bold text-foreground">{usage?.silos ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  Silos
                </div>
              </div>
              <div className="rounded-lg border-border/40 bg-muted/20 p-3">
                <div className="text-base font-bold text-foreground">{usage?.team ?? 0}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                  Team members
                </div>
              </div>
            </div>

            {/* Plan usage bars */}
            {sub && (
              <div className="rounded-2xl border-border/40 bg-card p-4 space-y-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Plan Usage
                </p>
                <UsageBar used={usage?.silos ?? 0} max={sub.max_silos ?? 0} label="Silos" />
                <UsageBar
                  used={usage?.warehouses ?? 0}
                  max={sub.max_warehouses ?? 0}
                  label="Warehouses"
                />
                <UsageBar used={usage?.team ?? 0} max={sub.max_users ?? 0} label="Team" />
                <UsageBar used={usage?.batches ?? 0} max={sub.max_batches ?? 0} label="Batches" />
                {(usage?.capacityKg ?? 0) > 0 && (
                  <UsageBar
                    used={usage?.totalKg ?? 0}
                    max={usage?.capacityKg ?? 0}
                    label={`Storage (${(usage?.totalKg ?? 0).toLocaleString()} / ${(usage?.capacityKg ?? 0).toLocaleString()} kg)`}
                  />
                )}
              </div>
            )}

            {/* Profile */}
            <div className="rounded-2xl border-border/40 bg-card p-4 space-y-2 text-sm">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Profile
              </p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  className={
                    profile.blocked
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "bg-emerald-100 text-emerald-700 border-emerald-200"
                  }
                >
                  {profile.blocked ? "Blocked" : "Active"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span className="text-foreground font-medium">
                  {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
                </span>
              </div>
              {sub?.price && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">MRR</span>
                  <span className="text-foreground font-medium">
                    PKR {Number(sub.price).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Silos */}
            {(silos ?? []).length > 0 && (
              <div className="rounded-2xl border-border/40 bg-card overflow-hidden">
                <p className="px-4 py-2.5 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Silos ({(silos ?? []).length})
                </p>
                <div className="divide-y divide-slate-50 max-h-40 overflow-y-auto">
                  {(silos as any[]).map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-4 py-2 text-xs">
                      <span className="text-foreground truncate max-w-[200px]">{s.name}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Team */}
            {(team ?? []).length > 0 && (
              <div className="rounded-2xl border-border/40 bg-card overflow-hidden">
                <p className="px-4 py-2.5 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Team ({(team ?? []).length})
                </p>
                <div className="divide-y divide-slate-50 max-h-36 overflow-y-auto">
                  {(team as any[]).map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {m.name ?? m.email ?? m.id.slice(0, 8)}
                        </p>
                        {m.email && (
                          <p className="text-[10px] text-muted-foreground truncate">{m.email}</p>
                        )}
                      </div>
                      {m.blocked && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium shrink-0">
                          blocked
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent batches */}
            {(recentBatches ?? []).length > 0 && (
              <div className="rounded-2xl border-border/40 bg-card overflow-hidden">
                <p className="px-4 py-2.5 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Batches
                </p>
                <div className="divide-y divide-slate-50 max-h-36 overflow-y-auto">
                  {(recentBatches as any[]).map((b) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-2 text-xs">
                      <span className="text-foreground capitalize">
                        {b.grain_type ?? "—"} · {Number(b.quantity_kg ?? 0).toLocaleString()} kg
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${b.status === "stored" ? "bg-emerald-100 text-emerald-700" : b.status === "dispatched" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}
                      >
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity */}
            {(activityLogs ?? []).length > 0 && (
              <div className="rounded-2xl border-border/40 bg-card overflow-hidden">
                <p className="px-4 py-2.5 border-b border-border/40 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Recent Activity
                </p>
                <div className="divide-y divide-slate-50 max-h-36 overflow-y-auto">
                  {(activityLogs as any[]).map((l) => (
                    <div key={l.id} className="flex items-start gap-2 px-4 py-2">
                      <span
                        className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(l.severity)}`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs text-foreground truncate">
                          {l.description ?? l.action}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {l.created_at ? new Date(l.created_at).toLocaleString() : ""}
                        </p>
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
