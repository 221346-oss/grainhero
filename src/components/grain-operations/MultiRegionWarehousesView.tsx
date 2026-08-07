/**
 * MultiRegionWarehousesView
 *
 * Groups admin warehouses by region (extracted from location.address or
 * location.description). Shows manager + technician assignments per
 * warehouse. Read-only — all edits are done via the standard WarehousesSection.
 *
 * Role access: admin (and manager / super_admin who can see grain-operations).
 * Super admin does NOT drill into grain operations per requirements — this
 * component is only rendered on the admin-facing grain-operations page.
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { listWarehousesWithTeam } from "@/lib/operations.functions";
import { Badge } from "@/components/ui/badge";
import {
  MapPin, Warehouse, Users, User, Wrench,
  Database, AlertCircle, Loader2,
} from "lucide-react";

type WarehouseRow = {
  id: string;
  warehouse_id: string;
  name: string;
  status: string;
  location: { description?: string | null; address?: string | null };
  total_capacity_kg: number;
  total_silos: number;
  silos: Array<{ id: string; warehouse_id: string; name: string; silo_id: string; capacity_kg: number; status: string }>;
  notes: string | null;
  manager_id: string | null;
  manager_name: string | null;
  technician_ids: string[];
  technician_names: string[];
};

// ── Extract a region label from location fields ──────────────────────────────
// Tries location.description first, then full address for better grouping.
// This ensures warehouses at the same location are grouped together.
function extractRegion(loc: WarehouseRow["location"] | null): string {
  if (!loc) return "Unassigned Region";
  
  // Prefer location.description if set (for custom grouping)
  const desc = (loc.description ?? "").trim();
  if (desc) return desc;
  
  // Otherwise use full address - this groups same-location warehouses together
  const addr = (loc.address ?? "").trim();
  if (addr) return addr;
  
  return "Unassigned Region";
}

// ── Status colour map ────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { dot: string; badge: string; label: string }> = {
  active:      { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700",  label: "Active"      },
  offline:     { dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600",      label: "Offline"     },
  error:       { dot: "bg-red-500",     badge: "bg-red-100 text-red-700",          label: "Error"       },
  maintenance: { dot: "bg-amber-500",   badge: "bg-amber-100 text-amber-700",      label: "Maintenance" },
};
const statusCfg = (s: string) => STATUS_CFG[s] ?? STATUS_CFG.offline;

// ── Warehouse card ───────────────────────────────────────────────────────────
function WarehouseCard({ w }: { w: WarehouseRow }) {
  const cfg = statusCfg(w.status);
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3 hover:border-slate-300 transition-colors">

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Warehouse className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-semibold text-sm text-slate-900 truncate">{w.name}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400 ml-5">{w.warehouse_id}</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Address if distinct from region label */}
      {w.location?.address && (
        <div className="flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="w-3 h-3 shrink-0 mt-0.5 text-slate-400" />
          <span className="truncate">{w.location.address}</span>
        </div>
      )}

      {/* Capacity + silos summary */}
      <div className="flex items-center gap-4 text-xs text-slate-500 border-b border-slate-100 pb-2">
        <span className="flex items-center gap-1">
          <Database className="w-3 h-3 text-slate-400" />
          {w.total_silos} silo{w.total_silos !== 1 ? "s" : ""}
        </span>
        <span>{w.total_capacity_kg.toLocaleString()} kg total</span>
      </div>

      {/* Silos grid - same row layout */}
      {w.silos && w.silos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {w.silos.map((silo) => (
            <div key={silo.id} className="flex items-center justify-between bg-slate-50 rounded border border-slate-100 p-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  silo.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                }`} />
                <span className="text-slate-700 truncate font-medium">{silo.name}</span>
              </div>
              <span className="text-slate-500 shrink-0 ml-1">{(silo.capacity_kg / 1000).toFixed(0)}t</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic py-1">No silos in this warehouse yet</div>
      )}

      {/* Team assignments */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        {/* Manager */}
        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0">Manager</span>
          {w.manager_name ? (
            <span className="text-xs font-medium text-slate-700 truncate">{w.manager_name}</span>
          ) : (
            <span className="text-xs text-slate-400 italic">Unassigned</span>
          )}
        </div>

        {/* Technicians */}
        <div className="flex items-start gap-2">
          <Wrench className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0 mt-0.5">
            Tech{w.technician_names.length !== 1 ? "s" : ""}
          </span>
          {w.technician_names.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {w.technician_names.map((t, i) => (
                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic mt-0.5">None assigned</span>
          )}
        </div>
      </div>

      {w.notes && (
        <p className="text-[11px] text-slate-400 italic leading-snug border-t border-slate-100 pt-2 line-clamp-2">
          {w.notes}
        </p>
      )}
    </div>
  );
}

// ── Region group ─────────────────────────────────────────────────────────────
function RegionGroup({ region, warehouses }: { region: string; warehouses: WarehouseRow[] }) {
  const activeCount = warehouses.filter((w) => w.status === "active").length;
  const totalSilos  = warehouses.reduce((s, w) => s + w.total_silos, 0);
  const totalCap    = warehouses.reduce((s, w) => s + w.total_capacity_kg, 0);

  // Unique team members across this region
  const managers    = [...new Set(warehouses.map((w) => w.manager_name).filter(Boolean))] as string[];
  const technicians = [...new Set(warehouses.flatMap((w) => w.technician_names))];

  return (
    <div className="space-y-3">
      {/* Region header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#2FAC0C]" />
          <h3 className="text-sm font-semibold text-slate-800">{region}</h3>
          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {warehouses.length} warehouse{warehouses.length !== 1 ? "s" : ""}
          </span>
        </div>
        {/* Region summary chips */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {activeCount} active
          </span>
          <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
            {totalSilos} silos
          </span>
          <span className="text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full font-medium">
            {totalCap.toLocaleString()} kg
          </span>
        </div>
      </div>

      {/* Regional team summary bar */}
      {(managers.length > 0 || technicians.length > 0) && (
        <div className="flex flex-wrap gap-3 px-1 pb-1 text-xs">
          {managers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <User className="w-3 h-3 text-slate-400" />
              <span className="text-slate-500 font-medium">Managers:</span>
              <div className="flex flex-wrap gap-1">
                {managers.map((m, i) => (
                  <span key={i} className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
          {technicians.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Wrench className="w-3 h-3 text-slate-400" />
              <span className="text-slate-500 font-medium">Technicians:</span>
              <div className="flex flex-wrap gap-1">
                {technicians.map((t, i) => (
                  <span key={i} className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full text-[10px] font-medium">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warehouse cards grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {warehouses.map((w) => <WarehouseCard key={w.id} w={w} />)}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MultiRegionWarehousesView() {
  const fetchFn = useServerFn(listWarehousesWithTeam);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["warehouses-with-team"],
    queryFn:  () => fetchFn(),
    staleTime: 30_000,
  });

  // Group by region
  const regionGroups = useMemo(() => {
    const warehouses = (data ?? []) as WarehouseRow[];
    const map = new Map<string, WarehouseRow[]>();
    for (const w of warehouses) {
      const region = extractRegion(w.location);
      if (!map.has(region)) map.set(region, []);
      map.get(region)!.push(w);
    }
    // Sort: "Unassigned Region" goes last, rest alphabetically
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "Unassigned Region") return 1;
      if (b === "Unassigned Region") return -1;
      return a.localeCompare(b);
    });
  }, [data]);

  const totalWarehouses = (data ?? []).length;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading regions…
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
        <p className="text-sm text-red-700">
          {error instanceof Error ? error.message : "Failed to load warehouses"}
        </p>
      </div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (totalWarehouses === 0) {
    return (
      <div className="py-12 text-center text-slate-400">
        <Warehouse className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No warehouses yet. Create one to see the regional view.</p>
      </div>
    );
  }

  // ── Summary strip ──────────────────────────────────────────────────────────
  const totalRegions  = regionGroups.length;
  const totalSilos    = (data ?? []).reduce((s, w) => s + (w as WarehouseRow).total_silos, 0);
  const totalCapacity = (data ?? []).reduce((s, w) => s + (w as WarehouseRow).total_capacity_kg, 0);

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Regions",         value: totalRegions    },
          { label: "Warehouses",      value: totalWarehouses },
          { label: "Total silos",     value: totalSilos      },
          { label: "Total capacity",  value: `${totalCapacity.toLocaleString()} kg` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">{value}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Region groups */}
      {regionGroups.map(([region, warehouses]) => (
        <RegionGroup key={region} region={region} warehouses={warehouses} />
      ))}
    </div>
  );
}
