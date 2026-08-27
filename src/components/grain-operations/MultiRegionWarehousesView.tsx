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
import { useMemo, useState } from "react";
import { listWarehousesWithTeam } from "@/lib/operations.functions";
import { WarehouseAssignmentSidebar } from "./WarehouseAssignmentSidebar";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Warehouse,
  Users,
  User,
  Wrench,
  Database,
  AlertCircle,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { LocalizedContent } from "@/i18n";

type WarehouseRow = {
  id: string;
  warehouse_id: string;
  name: string;
  status: string;
  location: { description?: string | null; address?: string | null };
  total_capacity_kg: number;
  total_silos: number;
  silos: Array<{
    id: string;
    warehouse_id: string;
    name: string;
    silo_id: string;
    capacity_kg: number;
    status: string;
  }>;
  notes: string | null;
  manager_id: string | null;
  manager_name: string | null;
  technician_ids: string[];
  technician_names: string[];
};

// ── Extract a region label (city) from location fields ──────────────────────
// Extracts just the city name for grouping, not the full address.
// e.g. "125 farm road, block a, Lahore" → "Lahore"
//      "123 Farm road, Block A, Sialkot" → "Sialkot"
//      "abc123, Block A" → "abc123, Block A" (no city found, use as-is)
const KNOWN_CITIES = [
  "Lahore",
  "Sialkot",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Gujranwala",
  "Sargodha",
  "Abbottabad",
  "Mardan",
  "Hyderabad",
  "Gujrat",
  "Jhang",
  "Sheikhupura",
  "Sahiwal",
  "Okara",
  "Dera Ghazi Khan",
];

function extractCityFromAddress(addr: string): string | null {
  const parts = addr
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // Check each part against known cities
  for (const part of parts) {
    const normalized = part.toLowerCase();
    for (const city of KNOWN_CITIES) {
      if (normalized === city.toLowerCase()) return city;
    }
  }

  // If no known city, try to extract city from comma-separated address
  // Typically: "street, area, city, country" → city is second-to-last
  if (parts.length >= 2) {
    // Check second-to-last part (common position for city in Pakistani addresses)
    const candidate = parts[parts.length - 2];
    // If it's short and doesn't contain numbers, likely a city name
    if (candidate.length <= 20 && !/\d/.test(candidate)) {
      return candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
    }
  }

  return null;
}

function extractRegion(loc: WarehouseRow["location"] | null, warehouseName?: string): string {
  if (!loc) return "Unassigned Region";

  const desc = (loc.description ?? "").trim();
  const addr = (loc.address ?? "").trim();

  // Location.description is now the city name (set during silo creation)
  // Use it directly if it looks like a city name
  if (desc) {
    // Check if it's a known city
    const city = extractCityFromAddress(desc);
    if (city) return city;
    // If not a known city but short (likely a city name), use as-is
    if (desc.length <= 30) return desc.charAt(0).toUpperCase() + desc.slice(1).toLowerCase();
  }

  // Try to extract city from address
  if (addr) {
    const city = extractCityFromAddress(addr);
    if (city) return city;
  }

  // Check warehouse name — e.g. "sialkot — D2E304" → "Sialkot"
  if (warehouseName) {
    const city = extractCityFromAddress(warehouseName);
    if (city) return city;
  }

  // Fallback: use description as-is
  if (desc) return desc;

  // Last resort: use full address
  if (addr) return addr;

  return "Unassigned Region";
}

// ── Status colour map ────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { dot: string; badge: string; label: string }> = {
  active: { dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", label: "Active" },
  offline: { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600", label: "Offline" },
  error: { dot: "bg-red-500", badge: "bg-red-100 text-red-700", label: "Error" },
  maintenance: { dot: "bg-amber-500", badge: "bg-amber-100 text-amber-700", label: "Maintenance" },
};
const statusCfg = (s: string) => STATUS_CFG[s] ?? STATUS_CFG.offline;

// ── Warehouse card ───────────────────────────────────────────────────────────
function WarehouseCard({
  w,
  onAssign,
}: {
  w: WarehouseRow;
  onAssign?: (warehouse: WarehouseRow) => void;
}) {
  const cfg = statusCfg(w.status);
  return (
    <LocalizedContent>
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
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}
        >
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
        <div className="flex flex-wrap gap-1.5">
          {w.silos.map((silo) => (
            <div
              key={silo.id}
              className="flex items-center justify-between bg-slate-50 rounded border border-slate-100 px-2.5 py-1.5 text-[11px] min-w-max"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    silo.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                />
                <span className="text-slate-700 font-medium">{silo.name}</span>
              </div>
              <span className="text-slate-500 shrink-0 ml-1.5">
                {(silo.capacity_kg / 1000).toFixed(0)}t
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-400 italic py-1">No silos in this warehouse yet</div>
      )}

      {/* Team assignments with edit button */}
      <div className="border-t border-slate-100 pt-3 space-y-2">
        {/* Manager */}
        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0">
            Manager
          </span>
          {w.manager_name ? (
            <span className="text-xs font-medium text-slate-700 truncate flex-1">
              {w.manager_name}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic flex-1">Unassigned</span>
          )}
        </div>

        {/* Technicians */}
        <div className="flex items-start gap-2">
          <Wrench className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-16 shrink-0 mt-0.5">
            Tech{w.technician_names.length !== 1 ? "s" : ""}
          </span>
          {w.technician_names.length > 0 ? (
            <div className="flex flex-wrap gap-1 flex-1">
              {w.technician_names.map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic mt-0.5 flex-1">None assigned</span>
          )}
        </div>

        {/* Assign button */}
        {onAssign && (
          <button
            onClick={() => onAssign(w)}
            className="w-full mt-2 px-2 py-1.5 text-[10px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
          >
            Assign Manager/Tech
          </button>
        )}
      </div>

      {w.notes && (
        <p className="text-[11px] text-slate-400 italic leading-snug border-t border-slate-100 pt-2 line-clamp-2">
          {w.notes}
        </p>
      )}
      </div>
    </LocalizedContent>
  );
}

// ── Region group ─────────────────────────────────────────────────────────────
function RegionGroup({
  region,
  warehouses,
  onAssign,
}: {
  region: string;
  warehouses: WarehouseRow[];
  onAssign?: (warehouse: WarehouseRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = warehouses.filter((w) => w.status === "active").length;
  const totalSilos = warehouses.reduce((s, w) => s + w.total_silos, 0);
  const totalCap = warehouses.reduce((s, w) => s + w.total_capacity_kg, 0);

  // Unique team members across this region
  const managers = [...new Set(warehouses.map((w) => w.manager_name).filter(Boolean))] as string[];
  const technicians = [...new Set(warehouses.flatMap((w) => w.technician_names))];

  return (
    <LocalizedContent>
      <div className="space-y-0 border border-slate-200 rounded-lg overflow-hidden">
      {/* Region header - clickable to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3 min-w-0">
          <ChevronDown
            className={`w-5 h-5 text-slate-400 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
          <MapPin className="w-4 h-4 text-[#2FAC0C] shrink-0" />
          <h3 className="text-sm font-semibold text-slate-800 truncate">{region}</h3>
          <span className="text-[11px] font-semibold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200 shrink-0">
            {warehouses.length} wh
          </span>
        </div>

        {/* Summary chips - always visible */}
        <div className="flex flex-wrap gap-2 text-[10px] shrink-0">
          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {activeCount} active
          </span>
          <span className="text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">
            {totalSilos} silos
          </span>
          <span className="text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full font-medium">
            {totalCap.toLocaleString()} kg
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-3 space-y-3 bg-white">
          {/* Regional team summary bar */}
          {(managers.length > 0 || technicians.length > 0) && (
            <div className="flex flex-wrap gap-3 text-xs pb-2 border-b border-slate-100">
              {managers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-500 font-medium">Managers:</span>
                  <div className="flex flex-wrap gap-1">
                    {managers.map((m, i) => (
                      <span
                        key={i}
                        className="bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {technicians.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-3 h-3 text-slate-400" />
                  <span className="text-slate-500 font-medium">Techs:</span>
                  <div className="flex flex-wrap gap-1">
                    {technicians.map((t, i) => (
                      <span
                        key={i}
                        className="bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                      >
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
            {warehouses.map((w) => (
              <WarehouseCard key={w.id} w={w} onAssign={onAssign} />
            ))}
          </div>
        </div>
      )}
      </div>
    </LocalizedContent>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MultiRegionWarehousesView() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseRow | null>(null);
  const fetchFn = useServerFn(listWarehousesWithTeam);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["warehouses-with-team"],
    queryFn: () => fetchFn(),
    staleTime: 30_000,
  });

  // Group by region
  const regionGroups = useMemo(() => {
    const warehouses = (data ?? []) as WarehouseRow[];
    const map = new Map<string, WarehouseRow[]>();
    for (const w of warehouses) {
      const region = extractRegion(w.location, w.name);
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
  const totalRegions = regionGroups.length;
  const totalSilos = (data ?? []).reduce((s, w) => s + (w as WarehouseRow).total_silos, 0);
  const totalCapacity = (data ?? []).reduce((s, w) => s + (w as WarehouseRow).total_capacity_kg, 0);

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Regions", value: totalRegions },
          { label: "Warehouses", value: totalWarehouses },
          { label: "Total silos", value: totalSilos },
          { label: "Total capacity", value: `${totalCapacity.toLocaleString()} kg` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="text-lg font-bold text-slate-900 tabular-nums leading-tight">
              {value}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Region groups */}
      {regionGroups.map(([region, warehouses]) => (
        <RegionGroup
          key={region}
          region={region}
          warehouses={warehouses}
          onAssign={setSelectedWarehouse}
        />
      ))}

      {/* Assignment sidebar */}
      <WarehouseAssignmentSidebar
        warehouse={selectedWarehouse}
        isOpen={selectedWarehouse !== null}
        onClose={() => setSelectedWarehouse(null)}
      />
    </div>
  );
}
