/**
 * SuperAdminTechnicianDashboard
 *
 * Superadmin-only view: fleet stats, installation KPIs, all installs table
 * with filters, search, and realtime updates. This is the comprehensive
 * technician management dashboard that only superadmin can access.
 */
import { useState, useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "@/i18n";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  listGlobalTechnicians,
  getTechnicianDashboardStats,
  listAllInstallations,
} from "@/lib/technician-management.functions";
import { supabase } from "@/integrations/supabase/client";
import { Search, RefreshCw, MapPin, Wrench, Users, Truck, Loader2 } from "lucide-react";

const INSTALL_STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-slate-200 text-slate-700",
  en_route: "bg-indigo-100 text-indigo-800",
  onsite: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-600 text-white",
  blocked: "bg-rose-100 text-rose-700",
};

export function SuperAdminTechnicianDashboard() {
  const channelId = useId();
  const qc = useQueryClient();
  const { t } = useTranslation();
  const fetchFn = useServerFn(listAllInstallations);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["all-installations"],
    queryFn: () => fetchFn(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Realtime: invalidate when installs or orders change
  useEffect(() => {
    const channel = supabase
      .channel(`sa-tech-installs-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hardware_order_installations" },
        () => {
          qc.invalidateQueries({ queryKey: ["all-installations"] });
          qc.invalidateQueries({ queryKey: ["technician-dashboard-stats"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "hardware_orders" }, () => {
        qc.invalidateQueries({ queryKey: ["all-installations"] });
        qc.invalidateQueries({ queryKey: ["technician-dashboard-stats"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, qc]);

  const allInstalls = (data?.installations ?? []) as Array<Record<string, any>>;

  const filtered = allInstalls.filter((i) => {
    const order = (i.hardware_orders ?? {}) as Record<string, any>;
    const tech = (i.profiles ?? {}) as Record<string, any>;
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const match =
        String(order.id ?? "")
          .toLowerCase()
          .includes(s) ||
        String(order.customer_name ?? "")
          .toLowerCase()
          .includes(s) ||
        String(order.plan_name ?? "")
          .toLowerCase()
          .includes(s) ||
        String(order.install_city ?? "")
          .toLowerCase()
          .includes(s) ||
        String(tech.name ?? "")
          .toLowerCase()
          .includes(s);
      if (!match) return false;
    }
    return true;
  });

  const statusCounts: Record<string, number> = {};
  for (const i of allInstalls) {
    statusCounts[i.status as string] = (statusCounts[i.status as string] ?? 0) + 1;
  }

  // Fetch fleet stats
  const statsFn = useServerFn(getTechnicianDashboardStats);
  const { data: statsData } = useQuery({
    queryKey: ["technician-dashboard-stats"],
    queryFn: () => statsFn(),
    staleTime: 30_000,
  });
  const sc = (statsData as any)?.statusCounts ?? { available: 0, busy: 0, offline: 0, on_leave: 0 };
  const inTransit = (statsData as any)?.inTransitOrders ?? 0;

  // Fetch tech count
  const listFn = useServerFn(listGlobalTechnicians);
  const { data: techData } = useQuery({
    queryKey: ["global-technicians"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });
  const techCount = (techData?.technicians ?? []).length;

  return (
    <div className="space-y-4">
      {/* Fleet summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[
          {
            label: t("technicians.fleet"),
            value: techCount,
            sub: `${sc.available} ${t("technicians.available")}`,
            color: "border-emerald-200 bg-emerald-50/50",
            icon: Users,
          },
          {
            label: t("technicians.busy"),
            value: sc.busy,
            sub: t("technicians.onActiveJobs"),
            color: "border-amber-200 bg-amber-50/50",
            icon: Wrench,
          },
          {
            label: t("technicians.inTransit"),
            value: inTransit,
            sub: t("technicians.silosOnTrucks"),
            color: "border-indigo-200 bg-indigo-50/50",
            icon: Truck,
          },
          {
            label: t("technicians.totalInstalls"),
            value: allInstalls.length,
            sub: `${statusCounts.completed ?? 0} ${t("technicians.completed")}`,
            color: "border-slate-200 bg-slate-50/50",
            icon: MapPin,
          },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.color}`}>
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {kpi.label}
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums">{kpi.value}</div>
            {kpi.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{kpi.sub}</div>}
          </div>
        ))}
      </div>

      {/* Install status KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {[
          { key: "all", label: t("technicians.total"), value: allInstalls.length },
          { key: "scheduled", label: t("technicians.scheduled"), value: statusCounts.scheduled ?? 0 },
          { key: "en_route", label: t("technicians.enRoute"), value: statusCounts.en_route ?? 0 },
          { key: "onsite", label: t("technicians.onSite"), value: statusCounts.onsite ?? 0 },
          { key: "completed", label: t("technicians.completed"), value: statusCounts.completed ?? 0 },
          { key: "blocked", label: t("platformUsers.blocked"), value: statusCounts.blocked ?? 0 },
        ].map((kpi) => (
          <button
            key={kpi.key}
            onClick={() => setStatusFilter(kpi.key === "all" ? "all" : kpi.key)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              statusFilter === kpi.key || (kpi.key === "all" && statusFilter === "all")
                ? "border-emerald-300 bg-emerald-50/50"
                : "border-border bg-background hover:bg-muted/30"
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {kpi.label}
            </div>
            <div className="text-xl font-bold mt-0.5 tabular-nums">{kpi.value}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("technicians.searchPlaceholder")}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? "animate-spin" : ""}`} />
        </button>
        <span className="text-xs text-muted-foreground ml-auto">
          {t("technicians.installsCount", { count: filtered.length })}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {t("technicians.noInstallations")}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    {t("technicians.headerOrder")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    {t("technicians.headerCustomer")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    {t("technicians.headerCity")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    {t("technicians.headerTechnician")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    {t("technicians.headerStatus")}
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    {t("technicians.headerScheduled")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((i) => {
                  const order = (i.hardware_orders ?? {}) as Record<string, any>;
                  const tech = (i.profiles ?? {}) as Record<string, any>;
                  return (
                    <tr
                      key={`${i.order_id}-${i.id ?? "none"}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to="/platform/orders"
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {(i.order_id as string)?.slice(0, 8) ?? "—"}
                        </Link>
                        <div className="text-[11px] text-muted-foreground">
                          {order.plan_name ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{order.customer_name ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.install_city ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {tech.name ? (
                          <span className="text-sm font-medium">{tech.name}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {t("technicians.unassigned")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`text-[10px] ${INSTALL_STATUS_COLOR[i.status as string] ?? "bg-slate-200 text-slate-700"}`}
                        >
                          {i.status === "scheduled"
                            ? t("technicians.scheduledStatus")
                            : i.status === "en_route"
                              ? t("technicians.enRoute")
                              : i.status === "onsite"
                                ? t("technicians.onsite")
                                : i.status === "completed"
                                  ? t("technicians.statusCompleted")
                                  : i.status === "blocked"
                                    ? t("technicians.blockedStatus")
                                    : (i.status as string)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {i.scheduled_for
                          ? new Date(i.scheduled_for as string).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
