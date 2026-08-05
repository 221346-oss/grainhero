import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { listAllHardwareOrders, updateHardwareOrder, getTenantSiloInfo, sendOrderMessage } from "@/lib/hardware-orders.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  CheckCircle2, XCircle, MessageSquare, Search, RefreshCw,
  MapPin, Phone, Package, Clock, User, Building2,
  TrendingUp, AlertTriangle, ArrowUpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/platform/silo-requests")({
  head: () => ({ meta: [{ title: "Silo requests — Platform" }] }),
  component: SiloRequestsPage,
});

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { badge: string; label: string }> = {
  pending_payment: { badge: "bg-slate-100 text-slate-600 border-slate-200",      label: "Pending payment" },
  paid:            { badge: "bg-blue-100 text-blue-800 border-blue-200",          label: "Paid"            },
  new:             { badge: "bg-amber-100 text-amber-800 border-amber-200",       label: "New"             },
  approved:        { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Approved"        },
  packing:         { badge: "bg-amber-100 text-amber-800 border-amber-200",       label: "Packing"         },
  shipped:         { badge: "bg-indigo-100 text-indigo-800 border-indigo-200",    label: "Shipped"         },
  in_transit:      { badge: "bg-indigo-100 text-indigo-800 border-indigo-200",    label: "In transit"      },
  installing:      { badge: "bg-cyan-100 text-cyan-800 border-cyan-200",          label: "Installing"      },
  tech_assigned:   { badge: "bg-indigo-100 text-indigo-800 border-indigo-200",    label: "Tech assigned"   },
  completed:       { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Completed"       },
  installed:       { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "Installed"       },
  live:            { badge: "bg-emerald-600 text-white border-emerald-600",        label: "Live"            },
  cancelled:       { badge: "bg-red-100 text-red-700 border-red-200",             label: "Cancelled"       },
  refunded:        { badge: "bg-slate-200 text-slate-600 border-slate-300",       label: "Refunded"        },
};

// Pending review = only orders that haven't been approved/rejected yet.
// paid/pending_payment orders have already been approved and are in the install pipeline.
const PENDING_STATUSES  = new Set(["new"]);
const APPROVED_STATUSES = new Set(["approved", "paid", "pending_payment", "packing", "shipped", "in_transit", "installing", "tech_assigned", "completed", "installed", "live"]);
const REJECTED_STATUSES = new Set(["cancelled", "refunded"]);

type Tab = "pending" | "approved" | "rejected" | "all";

const TAB_CFG: { key: Tab; label: string; color: string }[] = [
  { key: "pending",  label: "Pending review", color: "#f59e0b" },
  { key: "approved", label: "Approved",        color: "#10b981" },
  { key: "rejected", label: "Rejected",        color: "#ef4444" },
  { key: "all",      label: "All requests",    color: "#64748b" },
];

// Which "action" panel is open inside the sheet
type SheetMode = "view" | "approve" | "reject" | "upgrade";

const fmt = (n: number) => new Intl.NumberFormat("en-PK").format(n);

// ── Main page ─────────────────────────────────────────────────────────────────
function SiloRequestsPage() {
  const qc        = useQueryClient();
  const fetchFn   = useServerFn(listAllHardwareOrders);
  const updateFn  = useServerFn(updateHardwareOrder);
  const siloInfoFn = useServerFn(getTenantSiloInfo);
  const msgFn     = useServerFn(sendOrderMessage);

  const [tab, setTab]           = useState<Tab>("pending");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode]         = useState<SheetMode>("view");
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [upgradeNote, setUpgradeNote]   = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-orders"],
    queryFn:  () => fetchFn(),
    refetchInterval: 60_000,
  });

  const allOrders: any[] = data?.orders ?? [];

  const counts = useMemo(() => ({
    pending:  allOrders.filter((o) => PENDING_STATUSES.has(o.status)).length,
    approved: allOrders.filter((o) => APPROVED_STATUSES.has(o.status)).length,
    rejected: allOrders.filter((o) => REJECTED_STATUSES.has(o.status)).length,
    all:      allOrders.length,
  }), [allOrders]);

  const filtered = useMemo(() => {
    let rows = allOrders;
    if (tab === "pending")  rows = rows.filter((o) => PENDING_STATUSES.has(o.status));
    if (tab === "approved") rows = rows.filter((o) => APPROVED_STATUSES.has(o.status));
    if (tab === "rejected") rows = rows.filter((o) => REJECTED_STATUSES.has(o.status));
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((o) =>
        (o.buyer?.name ?? o.customer_name ?? "").toLowerCase().includes(s) ||
        (o.buyer?.email ?? o.customer_email ?? "").toLowerCase().includes(s) ||
        (o.plan_name ?? "").toLowerCase().includes(s) ||
        (o.install_city ?? "").toLowerCase().includes(s) ||
        String(o.id ?? "").toLowerCase().includes(s),
      );
    }
    return rows;
  }, [allOrders, tab, search]);

  const updateMut = useMutation({
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["platform-orders"] });
      qc.invalidateQueries({ queryKey: ["pending-order-count"] });
      // Also bust the admin-side cache so approved status shows immediately on /orders
      qc.invalidateQueries({ queryKey: ["my-hardware-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Lazy-fetch tenant's silo usage whenever the sheet opens on a pending order
  const siloInfoQuery = useQuery({
    queryKey: ["tenant-silo-info", selected?.admin_id],
    queryFn: () => siloInfoFn({ data: { adminId: selected!.admin_id } }),
    enabled: !!selected?.admin_id && sheetOpen,
    staleTime: 30_000,
  });
  const siloInfo = siloInfoQuery.data;

  // Send upgrade-request message to the tenant
  const msgMut = useMutation({
    mutationFn: () =>
      msgFn({
        data: {
          orderId: selected!.id,
          message: upgradeNote.trim() ||
            `Your current plan (${siloInfo?.planName ?? "your plan"}) allows up to ${siloInfo?.limit ?? "N"} silos and you are already using ${siloInfo?.used ?? "all"} of them. Please upgrade your plan to add more silos. Visit /plan-management to request an upgrade.`,
          emailBuyer: true,
        },
      }),
    onSuccess: () => {
      toast.success("Upgrade request sent to tenant.");
      closeSheet();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openSheet(order: any) {
    setSelected(order);
    setApproveNotes(order.notes ?? "");
    setRejectReason("");
    setMode("view");
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setSelected(null);
    setMode("view");
    setApproveNotes("");
    setRejectReason("");
    setUpgradeNote("");
  }

  function submitApprove() {
    if (!selected) return;
    // Capture values BEFORE closeSheet() nulls out `selected`
    const orderId = selected.id as string;
    closeSheet();
    updateMut.mutate(
      { orderId, status: "approved" },
      {
        onSuccess: () => {
          toast.success("Request approved — tenant has been notified to complete payment.");
        },
        onError: (e: Error) => {
          toast.error(`Approval failed: ${e.message}`);
        },
      },
    );
  }

  function submitReject() {
    if (!selected) return;
    const reason = rejectReason.trim();
    if (!reason) { toast.error("Please enter a rejection reason"); return; }
    // Capture values BEFORE closeSheet() nulls out `selected` and `rejectReason`
    const orderId = selected.id as string;
    closeSheet();
    updateMut.mutate(
      { orderId, status: "cancelled", cancelReason: reason },
      {
        onSuccess: () => {
          toast.success("Request rejected — tenant has been notified.");
        },
        onError: (e: Error) => {
          toast.error(`Rejection failed: ${e.message}`);
        },
      },
    );
  }

  const tabColor = TAB_CFG.find((t) => t.key === tab)?.color ?? "#64748b";

  return (
    <AdminPageShell
      title="Silo requests"
      subtitle="Hardware silo installation requests from tenant admins — review, approve or reject"
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
          Refresh
        </button>
      }
    >
      {/* Summary tiles ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TAB_CFG.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative rounded-lg border bg-white overflow-hidden text-left transition-all hover:shadow-sm",
              tab === t.key ? "border-2 shadow-sm" : "border-slate-200",
            )}
            style={tab === t.key ? { borderColor: t.color } : undefined}
          >
            <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg" style={{ background: t.color }} />
            <div className="pl-5 pr-4 py-4">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-1">{t.label}</p>
              <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{counts[t.key]}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Search ─────────────────────────────────────────────────────── */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, plan, city…"
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Request list ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 rounded-lg bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white py-16 text-center">
          <Package className="mx-auto h-8 w-8 text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">
            {tab === "pending" ? "No pending silo requests" : "No requests match your filters"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-0 border-b border-slate-100 px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/80">
            <span>Requester</span><span>Plan</span><span>Qty</span>
            <span>Location</span><span>Status</span><span />
          </div>
          <div className="divide-y divide-slate-50">
            {filtered.map((order) => (
              <RequestRow key={order.id} order={order} tabColor={tabColor} onOpen={() => openSheet(order)} />
            ))}
          </div>
          <div className="px-5 py-2 border-t border-slate-100 text-xs text-slate-400">
            {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Detail / action sheet ─────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={(v) => { if (!v) closeSheet(); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-lg font-bold">Silo request</SheetTitle>
                <SheetDescription>
                  {PENDING_STATUSES.has(selected.status)
                    ? "Review the details below, then approve or reject."
                    : "Request details."}
                </SheetDescription>
              </SheetHeader>

              {/* Status badge */}
              <Badge variant="outline" className={cn("w-fit capitalize text-xs mb-5", STATUS_CFG[selected.status]?.badge)}>
                {STATUS_CFG[selected.status]?.label ?? selected.status}
              </Badge>

              {/* Request details */}
              <div className="space-y-4 text-sm flex-1">
                <DetailRow icon={<User className="h-4 w-4" />} label="Requester">
                  <p className="font-medium text-slate-900">{selected.buyer?.name ?? selected.customer_name ?? "—"}</p>
                  <p className="text-xs text-slate-500">{selected.buyer?.email ?? selected.customer_email ?? ""}</p>
                </DetailRow>

                {selected.business_name && (
                  <DetailRow icon={<Building2 className="h-4 w-4" />} label="Business">
                    <p className="font-medium text-slate-900">{selected.business_name}</p>
                  </DetailRow>
                )}

                <DetailRow icon={<Package className="h-4 w-4" />} label="Plan / hardware">
                  <p className="font-medium text-slate-900">{selected.plan_name ?? selected.plan_id ?? "—"}</p>
                  <p className="text-xs text-slate-500">
                    {selected.hardware_quantity ?? 1} silo unit{(selected.hardware_quantity ?? 1) !== 1 ? "s" : ""}
                    {" · "}PKR {fmt(Number(selected.hardware_total ?? 0))}
                  </p>
                </DetailRow>

                <DetailRow icon={<MapPin className="h-4 w-4" />} label="Install location">
                  <p className="font-medium text-slate-900">
                    {[selected.install_address, selected.install_city, selected.install_country].filter(Boolean).join(", ") || "—"}
                  </p>
                </DetailRow>

                {selected.contact_phone && (
                  <DetailRow icon={<Phone className="h-4 w-4" />} label="Contact phone">
                    <p className="font-medium text-slate-900">{selected.contact_phone}</p>
                  </DetailRow>
                )}

                {selected.preferred_install_date && (
                  <DetailRow icon={<Clock className="h-4 w-4" />} label="Preferred install date">
                    <p className="font-medium text-slate-900">{new Date(selected.preferred_install_date).toLocaleDateString()}</p>
                  </DetailRow>
                )}

                <DetailRow icon={<Clock className="h-4 w-4" />} label="Requested on">
                  <p className="font-medium text-slate-900">{new Date(selected.created_at).toLocaleString()}</p>
                </DetailRow>

                {selected.notes && (
                  <DetailRow icon={<MessageSquare className="h-4 w-4" />} label="Notes from tenant">
                    <p className="text-slate-700 whitespace-pre-wrap">{selected.notes}</p>
                  </DetailRow>
                )}

                {selected.cancel_reason && (
                  <DetailRow icon={<XCircle className="h-4 w-4 text-red-500" />} label="Rejection reason">
                    <p className="text-red-700 whitespace-pre-wrap">{selected.cancel_reason}</p>
                  </DetailRow>
                )}
              </div>

              {/* ── Plan limit bar (pending only, while silo info loads) ── */}
              {PENDING_STATUSES.has(selected.status) && selected.admin_id && (
                <div className="mt-5">
                  {siloInfoQuery.isLoading ? (
                    <div className="h-14 rounded-lg bg-slate-100 animate-pulse" />
                  ) : siloInfo ? (
                    <PlanLimitBar info={siloInfo} />
                  ) : null}
                </div>
              )}

              {/* ── Inline approve / reject / upgrade panels (pending only) ── */}
              {PENDING_STATUSES.has(selected.status) && (
                <div className="mt-4 border-t border-slate-100 pt-5 space-y-3">

                  {/* Default action buttons */}
                  {mode === "view" && (
                    <div className="flex flex-col gap-2">
                      {/* If at/over limit — surface upgrade first */}
                      {siloInfo && !siloInfo.withinLimit && (
                        <Button
                          variant="outline"
                          className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                          onClick={() => {
                            setUpgradeNote(
                              `Your plan (${siloInfo.planName}) allows up to ${siloInfo.limit} silos and you currently have ${siloInfo.used}. Please upgrade your plan before we can approve this silo request.`,
                            );
                            setMode("upgrade");
                          }}
                        >
                          <ArrowUpCircle className="h-4 w-4 mr-2" /> Request plan upgrade
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setMode("reject")}
                        >
                          <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setMode("approve")}
                          disabled={!!(siloInfo && !siloInfo.withinLimit && !siloInfo.unlimited)}
                          title={siloInfo && !siloInfo.withinLimit && !siloInfo.unlimited ? "Tenant is at plan limit — request upgrade first" : undefined}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                        </Button>
                      </div>
                      {siloInfo && !siloInfo.withinLimit && !siloInfo.unlimited && (
                        <p className="text-[11px] text-amber-600 text-center">
                          Tenant is at their plan limit ({siloInfo.used}/{siloInfo.limit} silos). Approve is disabled until they upgrade.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Approve panel */}
                  {mode === "approve" && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-emerald-900">Approving request</p>
                      <div>
                        <Label htmlFor="approve-notes" className="text-xs font-medium text-slate-700">
                          Notes for the tenant <span className="text-slate-400">(optional)</span>
                        </Label>
                        <Textarea
                          id="approve-notes"
                          value={approveNotes}
                          onChange={(e) => setApproveNotes(e.target.value)}
                          placeholder="e.g. Technician will contact you within 48 h to schedule the install."
                          className="mt-1.5 text-sm min-h-[72px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setMode("view")} disabled={updateMut.isPending}>Back</Button>
                        <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={submitApprove} disabled={updateMut.isPending}>
                          {updateMut.isPending ? "Approving…" : "Confirm approval"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reject panel */}
                  {mode === "reject" && (
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-red-900">Rejecting request</p>
                      <div>
                        <Label htmlFor="reject-reason" className="text-xs font-medium text-slate-700">
                          Reason <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="reject-reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="e.g. Install location outside our service area. Please contact support."
                          className="mt-1.5 text-sm min-h-[72px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setMode("view")} disabled={updateMut.isPending}>Back</Button>
                        <Button variant="destructive" className="flex-1" onClick={submitReject} disabled={updateMut.isPending || !rejectReason.trim()}>
                          {updateMut.isPending ? "Rejecting…" : "Confirm rejection"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Upgrade-request panel */}
                  {mode === "upgrade" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-amber-900">Send plan upgrade request to tenant</p>
                      <div>
                        <Label htmlFor="upgrade-note" className="text-xs font-medium text-slate-700">
                          Message to tenant
                        </Label>
                        <Textarea
                          id="upgrade-note"
                          value={upgradeNote}
                          onChange={(e) => setUpgradeNote(e.target.value)}
                          className="mt-1.5 text-sm min-h-[96px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => setMode("view")} disabled={msgMut.isPending}>Back</Button>
                        <Button
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => msgMut.mutate()}
                          disabled={msgMut.isPending || !upgradeNote.trim()}
                        >
                          {msgMut.isPending ? "Sending…" : "Send upgrade request"}
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>
    </AdminPageShell>
  );
}

// ── Plan limit bar ────────────────────────────────────────────────────────────
function PlanLimitBar({ info }: {
  info: { used: number; limit: number; unlimited: boolean; withinLimit: boolean; planName: string; tenantName: string };
}) {
  const pct = info.unlimited ? 0 : info.limit > 0 ? Math.min(100, Math.round((info.used / info.limit) * 100)) : 100;
  const overLimit = !info.unlimited && !info.withinLimit;
  const atLimit   = !info.unlimited && info.used === info.limit;

  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      overLimit ? "border-red-200 bg-red-50/60" : atLimit ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-slate-50/60",
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <TrendingUp className="h-3.5 w-3.5" />
          Plan usage — {info.planName}
        </div>
        {overLimit ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-red-600">
            <AlertTriangle className="h-3 w-3" /> Over limit
          </span>
        ) : atLimit ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
            <AlertTriangle className="h-3 w-3" /> At limit
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {!info.unlimited && (
          <div className="flex-1 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", overLimit || atLimit ? "bg-red-500" : "bg-emerald-500")}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <span className="text-xs font-medium text-slate-700 tabular-nums shrink-0">
          {info.unlimited ? "Unlimited silos" : `${info.used} / ${info.limit} silos used`}
        </span>
      </div>
      {(overLimit || atLimit) && (
        <p className="text-[11px] text-amber-700">
          Approving this request would exceed {info.tenantName}'s plan limit.
          Use <strong>Request plan upgrade</strong> below to ask them to upgrade first.
        </p>
      )}
    </div>
  );
}

// ── Request row ───────────────────────────────────────────────────────────────
function RequestRow({ order, tabColor, onOpen }: { order: any; tabColor: string; onOpen: () => void }) {
  const cfg       = STATUS_CFG[order.status] ?? STATUS_CFG.new;
  const isPending = PENDING_STATUSES.has(order.status);
  void tabColor;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-2 md:gap-0 items-center px-5 py-4 hover:bg-slate-50/70 transition-colors text-left"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{order.buyer?.name ?? order.customer_name ?? "—"}</p>
        <p className="text-[11px] text-slate-400 truncate">{order.buyer?.email ?? order.customer_email ?? ""}</p>
      </div>
      <div className="text-sm text-slate-600 truncate">{order.plan_name ?? order.plan_id ?? "—"}</div>
      <div className="text-sm text-slate-600">{order.hardware_quantity ?? 1} unit{(order.hardware_quantity ?? 1) !== 1 ? "s" : ""}</div>
      <div className="text-xs text-slate-500 flex items-center gap-1">
        <MapPin className="w-3 h-3 shrink-0" />
        <span className="truncate">{[order.install_city, order.install_country].filter(Boolean).join(", ") || "—"}</span>
      </div>
      <div>
        <Badge variant="outline" className={cn("capitalize text-xs", cfg.badge)}>{cfg.label}</Badge>
        {isPending && <p className="text-[10px] text-amber-500 font-medium mt-1">● Awaiting review</p>}
      </div>
      <div className="text-xs text-slate-400 text-right md:pl-4 shrink-0">
        {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
      </div>
    </button>
  );
}

// ── Detail row helper ─────────────────────────────────────────────────────────
function DetailRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        {children}
      </div>
    </div>
  );
}
