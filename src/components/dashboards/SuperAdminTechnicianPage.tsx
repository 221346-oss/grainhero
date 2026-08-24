/**
 * SuperAdminTechnicianPage
 *
 * A comprehensive dashboard for superadmin technicians — scoped to THEIR OWN
 * installs, profile, and warehouse assignments. Shows:
 *   • My Profile (availability, contact, job count)
 *   • My Installs (with status advancement: En route → On-site → Installing)
 *   • Install Detail Drawer (lifecycle timeline, maps, devices, events)
 *   • Warehouse Assignments
 *   • Real-time status updates via Supabase Realtime
 */
import { useState, useEffect, useId } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  getMyTechnicianProfile,
  getMyTechnicianInstalls,
  getMyInstallDetail,
  getMyWarehouseAssignments,
  updateMyAvailability,
} from "@/lib/technician-management.functions";
import {
  updateInstallStatus,
  logVisitEvent,
  commissionDevice,
} from "@/lib/hardware-lifecycle.functions";
import { recountMyActiveJobs } from "@/lib/technician-job-recount.functions";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  RefreshCw,
  MapPin,
  Wrench,
  Users,
  Truck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  CalendarClock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Activity,
  Shield,
  ArrowUpRight,
  Package,
  Ban,
  Cpu,
  HardHat,
  Warehouse as WarehouseIcon,
  CheckCircle,
  Circle,
} from "lucide-react";

// ── Status config ──────────────────────────────────────────────────────────

const INSTALL_STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-slate-200 text-slate-700",
  en_route: "bg-indigo-100 text-indigo-800",
  onsite: "bg-amber-100 text-amber-800",
  installing: "bg-blue-100 text-blue-800",
  installed: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-600 text-white",
  blocked: "bg-rose-100 text-rose-700",
  pending_install: "bg-purple-100 text-purple-800",
};

const TECH_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  available: { label: "Available", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  busy: { label: "Busy", color: "bg-amber-100 text-amber-800", icon: Clock },
  offline: { label: "Offline", color: "bg-slate-100 text-slate-700", icon: XCircle },
  on_leave: { label: "On Leave", color: "bg-rose-100 text-rose-800", icon: AlertCircle },
};

// Lifecycle steps for the timeline
const LIFECYCLE_STEPS = [
  { key: "paid", label: "Paid", description: "Admin has paid" },
  { key: "en_route", label: "En Route", description: "Silo is on the way" },
  { key: "onsite", label: "On-site", description: "Arrived at location" },
  { key: "installing", label: "Installing", description: "Installation in progress" },
  { key: "completed", label: "Completed", description: "Admin sign-off done" },
];

// ── Main Component ─────────────────────────────────────────────────────────

export function SuperAdminTechnicianPage({ name }: { name?: string }) {
  const channelId = useId();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "installs" | "warehouses">("overview");
  const [selectedInstallId, setSelectedInstallId] = useState<string | null>(null);

  // ── Queries ──
  const fetchProfile = useServerFn(getMyTechnicianProfile);
  const fetchMyInstalls = useServerFn(getMyTechnicianInstalls);
  const fetchWarehouses = useServerFn(getMyWarehouseAssignments);

  const { data: profileData } = useQuery({
    queryKey: ["my-technician-profile"],
    queryFn: () => fetchProfile(),
    staleTime: 60_000,
  });

  const {
    data: installsData,
    isLoading: installsLoading,
    isFetching: installsFetching,
    refetch: refetchInstalls,
    error: installsError,
  } = useQuery({
    queryKey: ["my-technician-installs"],
    queryFn: () => fetchMyInstalls(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const {
    data: warehouseData,
    isLoading: warehouseLoading,
    error: warehouseError,
  } = useQuery({
    queryKey: ["my-warehouse-assignments"],
    queryFn: () => fetchWarehouses(),
    staleTime: 60_000,
  });

  const profile = (profileData as any)?.profile;
  const myInstalls = (installsData as any)?.installs ?? [];
  const warehouseAssignments = (warehouseData as any)?.assignments ?? [];
  const myStatus = profile?.technician_status ?? "available";

  // ── One-time job count recount ──
  const recountFn = useServerFn(recountMyActiveJobs);
  useEffect(() => {
    if (!profile?.id || !myInstalls.length) return;
    const activeCount = myInstalls.filter((i: any) =>
      ["scheduled", "en_route", "onsite", "installing", "installed"].includes(i.status),
    ).length;
    if (activeCount !== (profile.current_job_count ?? 0)) {
      recountFn()
        .then(() => {
          qc.invalidateQueries({ queryKey: ["my-technician-profile"] });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, myInstalls.length]);

  // ── Realtime ──
  useEffect(() => {
    const channel = supabase
      .channel(`tech-my-installs-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hardware_order_installations" },
        () => {
          qc.invalidateQueries({ queryKey: ["my-technician-installs"] });
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "hardware_orders" }, () => {
        qc.invalidateQueries({ queryKey: ["my-technician-installs"] });
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hardware_order_status_history" },
        () => {
          qc.invalidateQueries({ queryKey: ["my-technician-installs"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, qc]);

  // ── Derived data ──
  const statusCounts: Record<string, number> = {};
  for (const i of myInstalls) {
    const s = i.status as string;
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  // ── Availability mutation ──
  const availFn = useServerFn(updateMyAvailability);
  const setAvailability = useMutation({
    mutationFn: (status: string) => availFn({ data: { technician_status: status as any } }),
    onSuccess: () => {
      toast.success("Availability updated");
      qc.invalidateQueries({ queryKey: ["my-technician-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const tabs = [
    { key: "overview" as const, label: "Overview", icon: BarChart3 },
    { key: "installs" as const, label: "My Installs", icon: Wrench },
    { key: "warehouses" as const, label: "Warehouses", icon: WarehouseIcon },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Technician Dashboard — {name ?? profile?.name ?? "Technician"}
            </h1>
            <p className="text-sm text-muted-foreground">
              My installs, status tracking, and warehouse assignments
            </p>
          </div>
          <div className="flex items-center gap-2">{/* Status shown in profile card below */}</div>
        </div>

        {/* Profile Card */}
        {profile && (
          <Card>
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="font-medium">{profile.name}</div>
                <div className="text-sm text-muted-foreground">{profile.email}</div>
                {profile.phone && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Phone className="h-3 w-3" /> {profile.phone}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-lg font-bold tabular-nums">
                  {profile?.current_job_count ?? 0}/{profile?.max_concurrent_jobs ?? 3}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Active Jobs
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                  My Availability
                </div>
                <div className="flex gap-1">
                  {Object.entries(TECH_STATUS_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return (
                      <Button
                        key={key}
                        size="sm"
                        variant={myStatus === key ? "default" : "outline"}
                        className={`h-7 text-xs ${myStatus === key ? cfg.color : ""}`}
                        onClick={() => setAvailability.mutate(key)}
                        disabled={setAvailability.isPending}
                      >
                        <Icon className="h-3 w-3 mr-0.5" /> {cfg.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon className="h-4 w-4 mr-1.5 inline" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Error banners */}
        {installsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Installs error: {(installsError as Error).message}
          </div>
        )}
        {warehouseError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Warehouses error: {(warehouseError as Error).message}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Total Installs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{myInstalls.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Active</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {
                    myInstalls.filter((i: any) =>
                      ["scheduled", "en_route", "onsite", "installing", "installed"].includes(
                        i.status,
                      ),
                    ).length
                  }
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{statusCounts["completed"] ?? 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "installs" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {[
                  "total",
                  "scheduled",
                  "en_route",
                  "onsite",
                  "installing",
                  "installed",
                  "completed",
                  "blocked",
                ].map((key) => (
                  <div
                    key={key}
                    className={`rounded-lg border p-2 text-center min-w-[60px] ${key === "total" ? "border-emerald-400 bg-emerald-50" : ""}`}
                  >
                    <div className="text-[10px] uppercase text-muted-foreground">
                      {key.replace("_", " ")}
                    </div>
                    <div className="text-sm font-bold">
                      {key === "total" ? myInstalls.length : (statusCounts[key] ?? 0)}
                    </div>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => refetchInstalls()}
                disabled={installsFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${installsFetching ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {myInstalls.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No installs found.</div>
            ) : (
              <div className="space-y-2">
                {myInstalls.map((install: any) => {
                  const order = install.hardware_orders ?? {};
                  return (
                    <Card
                      key={install.id}
                      className="hover:border-emerald-400 transition-colors cursor-pointer"
                      onClick={() => setSelectedInstallId(install.id)}
                    >
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {String(order.id ?? "").slice(0, 8)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {order.plan_name ?? "—"}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {order.customer_name ?? "—"}
                          </div>
                          {(order.install_city || order.install_address) && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" />
                              {order.install_city ?? order.install_address}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {install.scheduled_for && (
                            <span className="text-xs text-muted-foreground">
                              {new Date(install.scheduled_for).toLocaleDateString()}
                            </span>
                          )}
                          <Badge
                            className={`${INSTALL_STATUS_COLOR[install.status] ?? "bg-slate-200"} text-xs`}
                          >
                            {(install.status as string).replace(/_/g, " ")}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "warehouses" && (
          <WarehousesTab assignments={warehouseAssignments} loading={warehouseLoading} />
        )}
      </div>

      {/* Install Detail Drawer */}
      {selectedInstallId && (
        <InstallDetailDrawer
          installId={selectedInstallId}
          onClose={() => setSelectedInstallId(null)}
        />
      )}
    </div>
  );
}

// ── Warehouses Tab ──────────────────────────────────────────────────────────

function WarehousesTab({ assignments, loading }: { assignments: any[]; loading: boolean }) {
  if (loading) return <div className="h-32 rounded-xl bg-muted animate-pulse" />;
  if (!assignments.length)
    return (
      <div className="text-center py-12 text-muted-foreground">No warehouse assignments found.</div>
    );

  return (
    <div className="space-y-4">
      {assignments.map((a: any, idx: number) => {
        const wh = a.warehouses ?? {};
        const orders = a.orders ?? [];
        const activeOrders = orders.filter(
          (o: any) => !["completed", "cancelled"].includes(o.status),
        );
        return (
          <Card key={a.id ?? idx}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium">{wh.name ?? a.city ?? "Warehouse"}</div>
                  {wh.location && (
                    <div className="text-xs text-muted-foreground">
                      {wh.location?.city ?? wh.location?.address}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {a.is_primary && (
                    <Badge className="bg-emerald-100 text-emerald-800 text-xs">Primary</Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {activeOrders.length} active
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {orders.length} total
                  </Badge>
                </div>
              </div>
              {orders.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">
                    Orders
                  </div>
                  {orders.map((o: any) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between text-sm rounded border p-2"
                    >
                      <div>
                        <span className="font-medium">{o.customer_name ?? "—"}</span>
                        <span className="text-muted-foreground ml-2">{o.plan_name ?? ""}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {o.tracking_carrier && <span>📦 {o.tracking_carrier}</span>}
                        {o.tracking_number && <span>#{o.tracking_number}</span>}
                        {o.expected_arrival_at && (
                          <span>ETA: {new Date(o.expected_arrival_at).toLocaleDateString()}</span>
                        )}
                        <Badge
                          className={`${INSTALL_STATUS_COLOR[o.status] ?? "bg-slate-200"} text-xs`}
                        >
                          {o.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Install Detail Drawer ──────────────────────────────────────────────────

function InstallDetailDrawer({
  installId,
  onClose,
}: {
  installId: string | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fetchDetail = useServerFn(getMyInstallDetail);
  const statusFn = useServerFn(updateInstallStatus);
  const eventFn = useServerFn(logVisitEvent);

  const { data, isLoading } = useQuery({
    queryKey: ["my-install-detail", installId],
    queryFn: () => fetchDetail({ data: { installId: installId! } }),
    enabled: !!installId,
  });

  const setStatus = useMutation({
    mutationFn: (v: {
      status: "scheduled" | "en_route" | "onsite" | "installing" | "completed" | "blocked";
      blockerNote?: string;
    }) =>
      statusFn({
        data: { installId: installId!, status: v.status, blockerNote: v.blockerNote ?? null },
      }),
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["my-technician-installs"] });
      qc.invalidateQueries({ queryKey: ["my-install-detail", installId] });
    },
    onError: (e: Error) => toast.error(String(e)),
  });

  const addEvent = useMutation({
    mutationFn: (v: {
      eventType: "arrived" | "inspection" | "install" | "test" | "handover" | "issue";
      note?: string;
    }) =>
      eventFn({ data: { installId: installId!, eventType: v.eventType, note: v.note ?? null } }),
    onSuccess: () => {
      toast.success("Event logged");
      qc.invalidateQueries({ queryKey: ["my-install-detail", installId] });
    },
    onError: (e: Error) => toast.error(String(e)),
  });

  if (!installId) return null;

  const detail = data as any;
  if (isLoading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="ml-auto w-[28rem] bg-white h-full overflow-y-auto relative z-10 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const { install, devices, events, history, buyer } = detail;
  const order = (install.hardware_orders ?? {}) as Record<string, any>;
  const status = install.status as string;

  // Determine which steps are done.
  // Map install statuses to lifecycle step indices:
  //   scheduled/paid → step 0 (Paid done, awaiting dispatch)
  //   en_route       → step 1
  //   onsite         → step 2
  //   installing     → step 3
  //   completed      → step 4
  const stepOrder = ["paid", "en_route", "onsite", "installing", "completed"];
  const statusToStep: Record<string, string> = {
    scheduled: "paid", // install is scheduled = admin has paid, awaiting dispatch
    blocked: "paid", // blocked goes back to showing paid as last progress
  };
  const currentStepIdx = stepOrder.indexOf(statusToStep[status] ?? status);

  // Available next statuses based on current status.
  const nextStatuses: Record<string, { status: string; label: string }[]> = {
    en_route: [{ status: "onsite", label: "Advance to On-site" }],
    onsite: [{ status: "installing", label: "Advance to Installing" }],
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="ml-auto w-[28rem] bg-white h-full overflow-y-auto relative z-10">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Install {install.id?.slice(0, 8)}</h2>
              {install.scheduled_for && (
                <p className="text-xs text-muted-foreground">
                  Scheduled {new Date(install.scheduled_for).toLocaleString()}
                </p>
              )}
            </div>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Status Badge */}
          <Badge
            className={`text-xs ${INSTALL_STATUS_COLOR[status] ?? "bg-slate-200 text-slate-700"}`}
          >
            {status.replace(/_/g, " ")}
          </Badge>

          {/* Lifecycle Timeline */}
          <div>
            <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-3">
              Installation Progress
            </h3>
            <div className="space-y-0">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const done = currentStepIdx >= idx;
                const current = stepOrder[currentStepIdx] === step.key;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      {done ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                      )}
                      {idx < LIFECYCLE_STEPS.length - 1 && (
                        <div className={`w-0.5 h-6 ${done ? "bg-emerald-600" : "bg-slate-200"}`} />
                      )}
                    </div>
                    <div className={`pb-4 ${current ? "font-semibold" : ""}`}>
                      <div
                        className={`text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {step.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{step.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Advancement Buttons */}
          {nextStatuses[status] && (
            <div className="flex items-center gap-2 flex-wrap">
              {nextStatuses[status].map((ns) => (
                <Button
                  key={ns.status}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate({ status: ns.status as any })}
                >
                  {setStatus.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  {ns.label}
                </Button>
              ))}
              {status !== "completed" && status !== "blocked" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-700 border-rose-200 hover:bg-rose-50"
                  disabled={setStatus.isPending}
                  onClick={() => {
                    const note = prompt("Blocker reason?");
                    if (note && note.trim().length >= 3)
                      setStatus.mutate({ status: "blocked", blockerNote: note.trim() });
                  }}
                >
                  <Ban className="h-3.5 w-3.5 mr-1" /> Mark Blocked
                </Button>
              )}
            </div>
          )}

          {/* Buyer Info */}
          <div className="grid gap-4 grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Buyer</CardTitle>
              </CardHeader>
              <CardContent className="text-sm min-w-0 overflow-hidden">
                <div className="font-medium truncate">{buyer?.name ?? order.customer_name ?? "—"}</div>
                <div className="text-muted-foreground text-xs truncate">
                  {buyer?.email ?? order.customer_email ?? "—"}
                </div>
                <div className="text-muted-foreground text-xs truncate">{buyer?.phone ?? "—"}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Address</CardTitle>
              </CardHeader>
              <CardContent className="text-sm min-w-0 overflow-hidden">
                <div className="truncate">{order.install_address ?? order.shipping_address ?? "—"}</div>
                <div className="text-muted-foreground text-xs truncate">
                  {order.install_city ?? order.shipping_city ?? ""}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Devices */}
          {devices.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Cpu className="h-4 w-4" /> Devices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {devices.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded border p-2 text-sm"
                  >
                    <div className="font-medium">{d.device_type ?? "sensor"}</div>
                    {d.commissioned_at ? (
                      <Badge className="bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Commissioned
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pending</Badge>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {history.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="text-sm max-h-48 overflow-y-auto space-y-2">
                {history.map((h: any) => (
                  <div key={h.id} className="flex items-start gap-2 text-xs">
                    <div className="mt-0.5">
                      <Circle className="h-2.5 w-2.5" />
                    </div>
                    <div>
                      <span className="font-medium">{h.to_status?.replace(/_/g, " ")}</span>
                      {h.note && <span className="text-muted-foreground ml-1">— {h.note}</span>}
                      <div className="text-muted-foreground">
                        {h.created_at ? new Date(h.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
