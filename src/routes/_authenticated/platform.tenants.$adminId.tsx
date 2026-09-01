/**
 * Tenant drill-down — one tenant, broken out the way that tenant sees itself.
 *
 * The tenants list answers "who are our customers"; this answers "what does
 * this one actually run". Navigation is three levels — city, then the
 * warehouses in that city, then one warehouse — mirroring the admin's own
 * picker, and using the same tiles so the two views cannot drift apart.
 *
 * The level lives in the URL (`?loc=…&wh=…`, the same params the admin
 * dashboard uses), so a super admin can link a colleague straight to a
 * warehouse and the browser's back button walks back up the hierarchy.
 *
 * Surface kit rules apply: surfaces group by fill and never by outline, labels
 * are the quiet 10px uppercase register, figures are bold and tabular, and
 * colour is semantic only.
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  ChevronRight,
  MapPin,
  Package,
  UserRound,
  Warehouse,
} from "lucide-react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Panel, Rail, SectionLabel, compact } from "@/components/app/surface";
import {
  LocationTile,
  WarehouseTile,
  utilisationTone,
} from "@/components/app/location/LocationPicker";
import {
  getTenantLocations,
  getTenantWarehouseDetail,
} from "@/lib/platform-tenant-locations.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/platform/tenants/$adminId")({
  head: () => ({
    meta: [
      { title: "Platform · Tenant locations — Grain Hero" },
      {
        name: "description",
        content:
          "Per-tenant location breakdown in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Tenant locations — Grain Hero" },
      {
        property: "og:description",
        content: "Per-tenant location breakdown in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { loc?: string; wh?: string } => {
    const out: { loc?: string; wh?: string } = {};
    if (typeof search.loc === "string" && search.loc.trim()) out.loc = search.loc;
    if (typeof search.wh === "string" && search.wh.trim()) out.wh = search.wh;
    return out;
  },
  component: TenantLocationsPage,
});

function Sk({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted/40", className)} />;
}

/** Label over a bold figure — the one hierarchy pairing this system uses. */
function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "critical" | "warning";
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "text-2xl font-bold tabular-nums",
          tone === "critical"
            ? "text-severity-critical"
            : tone === "warning"
              ? "text-warning"
              : "text-foreground",
        )}
      >
        {value}
        {unit && (
          <span className="ml-1 text-[11px] font-semibold text-muted-foreground">{unit}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Where you are, and the way back out.
 *
 * Four levels deep is past the point where a lone back arrow is enough — the
 * trail says which tenant and which city you are inside, both of which are
 * otherwise only visible in the URL.
 */
function Trail({
  adminId,
  tenantName,
  city,
  warehouseName,
}: {
  adminId: string;
  tenantName: string;
  city?: string;
  warehouseName?: string;
}) {
  const crumb = "text-[10px] font-semibold uppercase tracking-wider";
  const sep = <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" aria-hidden />;

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5">
      <Link
        to="/platform/tenants"
        className={cn(crumb, "text-muted-foreground transition-colors hover:text-foreground")}
      >
        Tenants
      </Link>
      {sep}
      {city ? (
        <Link
          to="/platform/tenants/$adminId"
          params={{ adminId }}
          search={{}}
          className={cn(crumb, "text-muted-foreground transition-colors hover:text-foreground")}
        >
          {tenantName}
        </Link>
      ) : (
        <span className={cn(crumb, "text-foreground")}>{tenantName}</span>
      )}
      {city && (
        <>
          {sep}
          {warehouseName ? (
            <Link
              to="/platform/tenants/$adminId"
              params={{ adminId }}
              search={{ loc: city }}
              className={cn(crumb, "text-muted-foreground transition-colors hover:text-foreground")}
            >
              {city}
            </Link>
          ) : (
            <span className={cn(crumb, "text-foreground")}>{city}</span>
          )}
        </>
      )}
      {warehouseName && (
        <>
          {sep}
          <span className={cn(crumb, "truncate text-foreground")}>{warehouseName}</span>
        </>
      )}
    </nav>
  );
}

/** Level three — one warehouse, loaded on demand rather than with the tree. */
function WarehouseDetail({ adminId, warehouseId }: { adminId: string; warehouseId: string }) {
  const fn = useServerFn(getTenantWarehouseDetail);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenant-warehouse-detail", adminId, warehouseId],
    queryFn: () => fn({ data: { adminId, warehouseId } }),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Sk className="h-28" />
        <div className="grid gap-3 lg:grid-cols-2">
          <Sk className="h-56" />
          <Sk className="h-56" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <Panel>
        <p className="text-[13px] text-severity-critical">Could not load this warehouse.</p>
      </Panel>
    );
  }

  const wh = data?.warehouse;
  if (!wh) {
    return (
      <Panel>
        <p className="text-[13px] text-muted-foreground">
          This warehouse no longer exists, or it does not belong to this tenant.
        </p>
      </Panel>
    );
  }

  const { silos = [], alerts = [], batches = [], team = [] } = data ?? {};
  const critical = alerts.filter((a) => a.priority === "critical").length;

  return (
    <div className="space-y-3">
      <Panel>
        <SectionLabel index="01">Warehouse</SectionLabel>
        <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Silos" value={wh.siloCount} />
          <Stat label="Capacity" value={compact(wh.capacityKg)} unit="kg" />
          <Stat label="Stored" value={compact(wh.occupancyKg)} unit="kg" />
          <Stat
            label="Open alerts"
            value={alerts.length}
            tone={critical > 0 ? "critical" : alerts.length > 0 ? "warning" : undefined}
          />
        </div>
        {wh.utilisationPct !== null && (
          <div className="mt-5 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Utilisation
              </span>
              <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                {wh.utilisationPct}%
              </span>
            </div>
            <Rail pct={wh.utilisationPct} tone={utilisationTone(wh.utilisationPct)} />
          </div>
        )}
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel>
          <SectionLabel index="02">Silos ({silos.length})</SectionLabel>
          {silos.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">
              No silos are provisioned in this warehouse yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {silos.map((s) => (
                <li key={s.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Boxes className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate text-[13px] text-foreground">{s.name ?? "—"}</span>
                    </span>
                    <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                      {s.utilisationPct === null ? "—" : `${s.utilisationPct}%`}
                    </span>
                  </div>
                  <Rail pct={s.utilisationPct ?? 0} tone={utilisationTone(s.utilisationPct)} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <SectionLabel index="03">Open alerts</SectionLabel>
          {alerts.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">
              Nothing open here — every alert on this warehouse is resolved or closed.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-2">
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      a.priority === "critical" ? "text-severity-critical" : "text-warning",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] text-foreground">{a.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {a.priority ?? "—"}
                      {a.triggered_at ? ` · ${new Date(a.triggered_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <SectionLabel index="04">Recent batches</SectionLabel>
          {batches.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">
              No batches have been booked into this warehouse.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {batches.map((b) => (
                <li key={b.id} className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Package className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate text-[13px] capitalize text-foreground">
                      {b.grain_type ?? "—"}
                    </span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {b.status ?? "—"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {compact(Number(b.quantity_kg ?? 0))} kg
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <SectionLabel index="05">Assigned staff</SectionLabel>
          {team.length === 0 ? (
            <p className="mt-4 text-[13px] text-muted-foreground">
              Nobody is assigned to this warehouse.
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {team.map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate text-[13px] text-foreground">
                      {m.name ?? m.email ?? m.id.slice(0, 8)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {m.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

function TenantLocationsPage() {
  const { adminId } = Route.useParams();
  const { loc, wh } = Route.useSearch();
  const navigate = useNavigate();

  const fn = useServerFn(getTenantLocations);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tenant-locations", adminId],
    queryFn: () => fn({ data: { adminId } }),
    staleTime: 30_000,
  });

  const tenant = data?.tenant;
  const locations = data?.locations ?? [];
  const tenantName = tenant?.name ?? tenant?.email ?? "Tenant";

  const city = loc ? locations.find((l) => l.key === loc) : undefined;
  const warehouse = wh && city ? city.warehouses.find((w) => w.id === wh) : undefined;

  // A city holding one warehouse skips its own level: there is nothing to pick.
  function openCity(key: string) {
    const target = locations.find((l) => l.key === key);
    if (target && target.warehouses.length === 1) {
      navigate({
        to: "/platform/tenants/$adminId",
        params: { adminId },
        search: { loc: key, wh: target.warehouses[0].id },
      });
      return;
    }
    navigate({ to: "/platform/tenants/$adminId", params: { adminId }, search: { loc: key } });
  }

  function openWarehouse(warehouseId: string) {
    navigate({
      to: "/platform/tenants/$adminId",
      params: { adminId },
      search: { loc, wh: warehouseId },
    });
  }

  const subtitle = [tenant?.email, tenant?.businessType, tenant?.planName]
    .filter(Boolean)
    .join(" · ");

  const totals = {
    warehouses: locations.reduce((t, l) => t + l.warehouseCount, 0),
    silos: locations.reduce((t, l) => t + l.siloCount, 0),
    alerts: locations.reduce((t, l) => t + l.openAlerts, 0),
    critical: locations.reduce((t, l) => t + l.criticalAlerts, 0),
  };

  return (
    <AdminPageShell title={tenantName} subtitle={subtitle || undefined}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Trail
            adminId={adminId}
            tenantName={tenantName}
            city={city?.city}
            warehouseName={warehouse?.name}
          />
          {tenant?.blocked && (
            <span className="rounded-md bg-severity-critical/15 px-1.5 py-0.5 text-[11px] font-semibold text-severity-critical">
              Blocked
            </span>
          )}
        </div>

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Sk key={i} className="h-44" />
            ))}
          </div>
        )}

        {isError && (
          <Panel>
            <p className="text-[13px] text-severity-critical">Could not load this tenant.</p>
          </Panel>
        )}

        {data && !tenant && (
          <Panel>
            <p className="text-[13px] text-muted-foreground">
              No such tenant. The account may have been removed.
            </p>
          </Panel>
        )}

        {/* ── Level 3 — one warehouse ── */}
        {data && tenant && warehouse && (
          <>
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/platform/tenants/$adminId",
                  params: { adminId },
                  search: city && city.warehouses.length > 1 ? { loc: city.key } : {},
                })
              }
              className="group flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
              {city && city.warehouses.length > 1 ? city.city : "All locations"}
            </button>
            <WarehouseDetail adminId={adminId} warehouseId={warehouse.id} />
          </>
        )}

        {/* ── Level 2 — the warehouses inside one city ── */}
        {data && tenant && city && !warehouse && (
          <>
            <button
              type="button"
              onClick={() =>
                navigate({ to: "/platform/tenants/$adminId", params: { adminId }, search: {} })
              }
              className="group flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
              All locations
            </button>
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-semibold text-foreground">{city.city}</h2>
              <span className="text-[11px] text-muted-foreground">
                {city.warehouseCount} {city.warehouseCount === 1 ? "warehouse" : "warehouses"}, kept
                separate
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {city.warehouses.map((w) => (
                <WarehouseTile key={w.id} wh={w} onSelect={() => openWarehouse(w.id)} />
              ))}
            </div>
          </>
        )}

        {/* ── Level 1 — the tenant's cities ── */}
        {data && tenant && !city && (
          <>
            <Panel>
              <SectionLabel index="01">Account totals</SectionLabel>
              <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-4">
                <Stat label="Cities" value={locations.length} />
                <Stat label="Warehouses" value={totals.warehouses} />
                <Stat label="Silos" value={totals.silos} />
                <Stat
                  label="Open alerts"
                  value={totals.alerts}
                  tone={
                    totals.critical > 0 ? "critical" : totals.alerts > 0 ? "warning" : undefined
                  }
                />
              </div>
              {data.plan.warehousesLimit > 0 && (
                <div className="mt-5 space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Plan allowance
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        data.plan.atLimit ? "text-warning" : "text-muted-foreground",
                      )}
                    >
                      {data.plan.warehousesUsed} of {data.plan.warehousesLimit} warehouses
                    </span>
                  </div>
                  <Rail
                    pct={(data.plan.warehousesUsed / data.plan.warehousesLimit) * 100}
                    tone={data.plan.atLimit ? "warning" : "success"}
                  />
                </div>
              )}
            </Panel>

            {locations.length === 0 ? (
              <Panel className="py-12 text-center">
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-muted/20">
                  <Warehouse className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <h3 className="mt-5 text-sm font-semibold text-foreground">No locations yet</h3>
                <p className="mx-auto mt-2 max-w-sm text-[13px] text-muted-foreground">
                  This tenant has no warehouses provisioned. One appears here once a hardware order
                  is installed against their account.
                </p>
              </Panel>
            ) : (
              <section className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  <h2 className="text-sm font-semibold text-foreground">Locations</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {locations.map((l) => (
                    <LocationTile key={l.key} loc={l} onSelect={() => openCity(l.key)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AdminPageShell>
  );
}
