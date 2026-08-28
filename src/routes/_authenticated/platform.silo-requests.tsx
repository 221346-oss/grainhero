import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  listAllHardwareOrders,
  updateHardwareOrder,
  getTenantSiloInfo,
  sendOrderMessage,
} from "@/lib/hardware-orders.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Search,
  RefreshCw,
  MapPin,
  Phone,
  Package,
  Clock,
  User,
  Building2,
  TrendingUp,
  ArrowUpCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/_authenticated/platform/silo-requests")({
  head: () => ({ meta: [{ title: "Silo requests — Platform" }] }),
  component: SiloRequestsPage,
});

// ── Status config ─────────────────────────────────────────────────────────────
// `label` holds a translation key under the `siloRequests` section.
const STATUS_CFG: Record<string, { badge: string; label: string }> = {
  pending_payment: {
    badge: "bg-muted text-muted-foreground border-border",
    label: "stPendingPayment",
  },
  paid: { badge: "bg-blue-100 text-blue-800 border-blue-200", label: "stPaid" },
  new: { badge: "bg-amber-100 text-amber-800 border-amber-200", label: "stNew" },
  approved: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "stApproved" },
  packing: { badge: "bg-amber-100 text-amber-800 border-amber-200", label: "stPacking" },
  shipped: { badge: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "stShipped" },
  in_transit: { badge: "bg-indigo-100 text-indigo-800 border-indigo-200", label: "stInTransit" },
  installing: { badge: "bg-cyan-100 text-cyan-800 border-cyan-200", label: "stInstalling" },
  tech_assigned: {
    badge: "bg-indigo-100 text-indigo-800 border-indigo-200",
    label: "stTechAssigned",
  },
  completed: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "stCompleted" },
  installed: { badge: "bg-emerald-100 text-emerald-800 border-emerald-200", label: "stInstalled" },
  live: { badge: "bg-emerald-600 text-white border-emerald-600", label: "stLive" },
  cancelled: { badge: "bg-red-100 text-red-700 border-red-200", label: "stCancelled" },
  refunded: { badge: "bg-muted text-muted-foreground border-border", label: "stRefunded" },
};

// Pending review = only orders that haven't been approved/rejected yet.
// paid/pending_payment orders have already been approved and are in the install pipeline.
const PENDING_STATUSES = new Set(["new"]);
const APPROVED_STATUSES = new Set([
  "approved",
  "paid",
  "pending_payment",
  "packing",
  "shipped",
  "in_transit",
  "installing",
  "tech_assigned",
  "completed",
  "installed",
  "live",
]);
const REJECTED_STATUSES = new Set(["cancelled", "refunded"]);

type Tab = "pending" | "approved" | "rejected" | "all";

// `label` holds a translation key under the `siloRequests` section.
const TAB_CFG: { key: Tab; label: string; color: string }[] = [
  { key: "pending", label: "pendingReview", color: "#f59e0b" },
  { key: "approved", label: "approved", color: "#10b981" },
  { key: "rejected", label: "rejected", color: "#ef4444" },
  { key: "all", label: "allRequests", color: "#64748b" },
];

// Which "action" panel is open inside the sheet
type SheetMode = "view" | "approve" | "reject" | "upgrade";

const fmt = (n: number) => new Intl.NumberFormat("en-PK").format(n);

// ── Main page ─────────────────────────────────────────────────────────────────
function SiloRequestsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fetchFn = useServerFn(listAllHardwareOrders);
  const updateFn = useServerFn(updateHardwareOrder);
  const siloInfoFn = useServerFn(getTenantSiloInfo);
  const msgFn = useServerFn(sendOrderMessage);

  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mode, setMode] = useState<SheetMode>("view");
  const [approveNotes, setApproveNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [upgradeNote, setUpgradeNote] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["platform-orders"],
    queryFn: () => fetchFn(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const allOrders: any[] = data?.orders ?? [];

  const counts = useMemo(
    () => ({
      pending: allOrders.filter((o) => PENDING_STATUSES.has(o.status)).length,
      approved: allOrders.filter((o) => APPROVED_STATUSES.has(o.status)).length,
      rejected: allOrders.filter((o) => REJECTED_STATUSES.has(o.status)).length,
      all: allOrders.length,
    }),
    [allOrders],
  );

  const filtered = useMemo(() => {
    let rows = allOrders;
    if (tab === "pending") rows = rows.filter((o) => PENDING_STATUSES.has(o.status));
    if (tab === "approved") rows = rows.filter((o) => APPROVED_STATUSES.has(o.status));
    if (tab === "rejected") rows = rows.filter((o) => REJECTED_STATUSES.has(o.status));
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (o) =>
          (o.buyer?.name ?? o.customer_name ?? "").toLowerCase().includes(s) ||
          (o.buyer?.email ?? o.customer_email ?? "").toLowerCase().includes(s) ||
          (o.plan_name ?? "").toLowerCase().includes(s) ||
          (o.install_city ?? "").toLowerCase().includes(s) ||
          String(o.id ?? "")
            .toLowerCase()
            .includes(s),
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
          message:
            upgradeNote.trim() ||
            t("siloRequests.upgradeDefaultMsg", {
              plan: siloInfo?.planName ?? "—",
              limit: siloInfo?.limit ?? "—",
              used: siloInfo?.used ?? "—",
            }),
          emailBuyer: true,
        },
      }),
    onSuccess: () => {
      toast.success(t("siloRequests.toastUpgradeSent"));
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
          toast.success(t("siloRequests.toastApproved"));
        },
        onError: (e: Error) => {
          toast.error(t("siloRequests.toastApprovalFailed", { msg: e.message }));
        },
      },
    );
  }

  function submitReject() {
    if (!selected) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error(t("siloRequests.toastEnterReason"));
      return;
    }
    // Capture values BEFORE closeSheet() nulls out `selected` and `rejectReason`
    const orderId = selected.id as string;
    closeSheet();
    updateMut.mutate(
      { orderId, status: "cancelled", cancelReason: reason },
      {
        onSuccess: () => {
          toast.success(t("siloRequests.toastRejected"));
        },
        onError: (e: Error) => {
          toast.error(t("siloRequests.toastRejectionFailed", { msg: e.message }));
        },
      },
    );
  }

  const tabColor = TAB_CFG.find((t) => t.key === tab)?.color ?? "#64748b";

  return (
    <AdminPageShell
      title={t("siloRequests.title")}
      subtitle={t("siloRequests.subtitle")}
      actions={
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1.5 text-[13px] text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3 h-3", isFetching && "animate-spin")} />
          {t("siloRequests.refresh")}
        </button>
      }
    >
      {/* Summary tiles — neon hairline gap-px grid ─────────────────────── */}
      <div className="grid gap-px bg-border rounded-md overflow-hidden grid-cols-2 sm:grid-cols-4">
        {TAB_CFG.map((c) => (
          <button
            key={c.key}
            onClick={() => setTab(c.key)}
            className={`bg-background p-4 text-left transition-colors hover:bg-muted/40 focus:outline-none ${tab === c.key ? "bg-muted/60" : ""}`}
          >
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-1">
              {t(`siloRequests.${c.label}`)}
            </p>
            <p
              className={`text-2xl font-medium tabular-nums leading-none ${
                c.key === "pending" && counts.pending > 0
                  ? "text-warning"
                  : c.key === "rejected"
                    ? "text-severity-critical"
                    : c.key === "approved"
                      ? "text-success"
                      : "text-foreground"
              }`}
            >
              {counts[c.key]}
            </p>
            {tab === c.key && <span className="mt-1.5 inline-block w-4 h-px bg-foreground/40" />}
          </button>
        ))}
      </div>

      {/* Search ─────────────────────────────────────────────────────── */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("siloRequests.searchPlaceholder")}
          className="pl-8 h-8 text-[13px] bg-transparent"
        />
      </div>

      {/* Request list ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-px bg-border rounded-md overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-background px-4 py-4 flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="animate-pulse rounded bg-muted h-[13px] w-32" />
                <div className="animate-pulse rounded bg-muted h-[11px] w-24" />
              </div>
              <div className="animate-pulse rounded bg-muted h-5 w-16" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-border rounded-md bg-background py-16 text-center">
          <Package className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
          <p className="text-[13px] text-muted-foreground">
            {tab === "pending" ? t("siloRequests.noPending") : t("siloRequests.noMatch")}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden bg-background">
          <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-0 border-b border-border px-4 py-2.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider bg-muted/30">
            <span>{t("siloRequests.requester")}</span>
            <span>{t("siloRequests.plan")}</span>
            <span>{t("siloRequests.qty")}</span>
            <span>{t("siloRequests.location")}</span>
            <span>{t("siloRequests.status")}</span>
            <span />
          </div>
          <div className="divide-y divide-border">
            {filtered.map((order) => (
              <RequestRow
                key={order.id}
                order={order}
                tabColor={tabColor}
                onOpen={() => openSheet(order)}
              />
            ))}
          </div>
          <div className="px-4 py-2 border-t border-border text-[12px] text-muted-foreground">
            {filtered.length} {t("siloRequests.requests")}
          </div>
        </div>
      )}

      {/* Detail / action sheet ─────────────────────────────────────── */}
      <Sheet
        open={sheetOpen}
        onOpenChange={(v) => {
          if (!v) closeSheet();
        }}
      >
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          {selected && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-lg font-bold">{t("siloRequests.sheetTitle")}</SheetTitle>
                <SheetDescription>
                  {PENDING_STATUSES.has(selected.status)
                    ? t("siloRequests.sheetDescPending")
                    : t("siloRequests.sheetDesc")}
                </SheetDescription>
              </SheetHeader>

              {/* Status badge */}
              <Badge
                variant="outline"
                className={cn("w-fit capitalize text-xs mb-5", STATUS_CFG[selected.status]?.badge)}
              >
                {STATUS_CFG[selected.status]
                  ? t(`siloRequests.${STATUS_CFG[selected.status].label}`)
                  : selected.status}
              </Badge>

              {/* Request details */}
              <div className="space-y-4 text-sm flex-1">
                <DetailRow icon={<User className="h-4 w-4" />} label={t("siloRequests.requester")}>
                  <p className="font-medium text-foreground">
                    {selected.buyer?.name ?? selected.customer_name ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.buyer?.email ?? selected.customer_email ?? ""}
                  </p>
                </DetailRow>

                {selected.business_name && (
                  <DetailRow icon={<Building2 className="h-4 w-4" />} label={t("siloRequests.business")}>
                    <p className="font-medium text-foreground">{selected.business_name}</p>
                  </DetailRow>
                )}

                <DetailRow icon={<Package className="h-4 w-4" />} label={t("siloRequests.planHardware")}>
                  <p className="font-medium text-foreground">
                    {selected.plan_name ?? selected.plan_id ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.hardware_quantity ?? 1} {t("siloRequests.siloUnits")}
                    {" · "}PKR {fmt(Number(selected.hardware_total ?? 0))}
                  </p>
                </DetailRow>

                <DetailRow icon={<MapPin className="h-4 w-4" />} label={t("siloRequests.installLocation")}>
                  <p className="font-medium text-foreground">
                    {[selected.install_address, selected.install_city, selected.install_country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </DetailRow>

                {selected.contact_phone && (
                  <DetailRow icon={<Phone className="h-4 w-4" />} label={t("siloRequests.contactPhone")}>
                    <p className="font-medium text-foreground">{selected.contact_phone}</p>
                  </DetailRow>
                )}

                {selected.preferred_install_date && (
                  <DetailRow icon={<Clock className="h-4 w-4" />} label={t("siloRequests.preferredDate")}>
                    <p className="font-medium text-foreground">
                      {new Date(selected.preferred_install_date).toLocaleDateString()}
                    </p>
                  </DetailRow>
                )}

                <DetailRow icon={<Clock className="h-4 w-4" />} label={t("siloRequests.requestedOn")}>
                  <p className="font-medium text-foreground">
                    {new Date(selected.created_at).toLocaleString()}
                  </p>
                </DetailRow>

                {selected.notes && (
                  <DetailRow icon={<MessageSquare className="h-4 w-4" />} label={t("siloRequests.notesFromTenant")}>
                    <p className="text-foreground whitespace-pre-wrap">{selected.notes}</p>
                  </DetailRow>
                )}

                {selected.cancel_reason && (
                  <DetailRow
                    icon={<XCircle className="h-4 w-4 text-red-500" />}
                    label={t("siloRequests.rejectionReason")}
                  >
                    <p className="text-red-700 whitespace-pre-wrap">{selected.cancel_reason}</p>
                  </DetailRow>
                )}
              </div>

              {/* ── Plan limit bar (pending only, while silo info loads) ── */}
              {PENDING_STATUSES.has(selected.status) && selected.admin_id && (
                <div className="mt-5">
                  {siloInfoQuery.isLoading ? (
                    <div className="h-14 rounded-lg bg-muted animate-pulse" />
                  ) : siloInfo ? (
                    <PlanLimitBar info={siloInfo} />
                  ) : null}
                </div>
              )}

              {/* ── Inline approve / reject / upgrade panels (pending only) ── */}
              {PENDING_STATUSES.has(selected.status) && (
                <div className="mt-4 border-t border-border pt-5 space-y-3">
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
                              t("siloRequests.upgradeNoteDefault", {
                                plan: siloInfo.planName,
                                limit: siloInfo.limit,
                                used: siloInfo.used,
                              }),
                            );
                            setMode("upgrade");
                          }}
                        >
                          <ArrowUpCircle className="h-4 w-4 mr-2" />{" "}
                          {t("siloRequests.requestPlanUpgrade")}
                        </Button>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setMode("reject")}
                        >
                          <XCircle className="h-4 w-4 mr-2" /> {t("siloRequests.reject")}
                        </Button>
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => setMode("approve")}
                          disabled={!!(siloInfo && !siloInfo.withinLimit && !siloInfo.unlimited)}
                          title={
                            siloInfo && !siloInfo.withinLimit && !siloInfo.unlimited
                              ? t("siloRequests.atLimitTitle")
                              : undefined
                          }
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" /> {t("siloRequests.approve")}
                        </Button>
                      </div>
                      {siloInfo && !siloInfo.withinLimit && !siloInfo.unlimited && (
                        <p className="text-[11px] text-amber-600 text-center">
                          {t("siloRequests.limitNote", {
                            used: siloInfo.used,
                            limit: siloInfo.limit,
                          })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Approve panel */}
                  {mode === "approve" && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-emerald-900">
                        {t("siloRequests.approveTitle")}
                      </p>
                      <div>
                        <Label
                          htmlFor="approve-notes"
                          className="text-xs font-medium text-foreground"
                        >
                          {t("siloRequests.notesForTenant")}{" "}
                          <span className="text-muted-foreground">
                            {t("siloRequests.optional")}
                          </span>
                        </Label>
                        <Textarea
                          id="approve-notes"
                          value={approveNotes}
                          onChange={(e) => setApproveNotes(e.target.value)}
                          placeholder={t("siloRequests.notesPlaceholder")}
                          className="mt-1.5 text-sm min-h-[72px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setMode("view")}
                          disabled={updateMut.isPending}
                        >
                          {t("siloRequests.back")}
                        </Button>
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={submitApprove}
                          disabled={updateMut.isPending}
                        >
                          {updateMut.isPending
                            ? t("siloRequests.approving")
                            : t("siloRequests.confirmApproval")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Reject panel */}
                  {mode === "reject" && (
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-red-900">
                        {t("siloRequests.rejectTitle")}
                      </p>
                      <div>
                        <Label
                          htmlFor="reject-reason"
                          className="text-xs font-medium text-foreground"
                        >
                          {t("siloRequests.reason")} <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="reject-reason"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder={t("siloRequests.reasonPlaceholder")}
                          className="mt-1.5 text-sm min-h-[72px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setMode("view")}
                          disabled={updateMut.isPending}
                        >
                          {t("siloRequests.back")}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={submitReject}
                          disabled={updateMut.isPending || !rejectReason.trim()}
                        >
                          {updateMut.isPending
                            ? t("siloRequests.rejecting")
                            : t("siloRequests.confirmRejection")}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Upgrade-request panel */}
                  {mode === "upgrade" && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-amber-900">
                        {t("siloRequests.upgradeTitle")}
                      </p>
                      <div>
                        <Label
                          htmlFor="upgrade-note"
                          className="text-xs font-medium text-foreground"
                        >
                          {t("siloRequests.messageToTenant")}
                        </Label>
                        <Textarea
                          id="upgrade-note"
                          value={upgradeNote}
                          onChange={(e) => setUpgradeNote(e.target.value)}
                          className="mt-1.5 text-sm min-h-[96px]"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setMode("view")}
                          disabled={msgMut.isPending}
                        >
                          {t("siloRequests.back")}
                        </Button>
                        <Button
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => msgMut.mutate()}
                          disabled={msgMut.isPending || !upgradeNote.trim()}
                        >
                          {msgMut.isPending
                            ? t("siloRequests.sending")
                            : t("siloRequests.sendUpgrade")}
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
function PlanLimitBar({
  info,
}: {
  info: {
    used: number;
    limit: number;
    unlimited: boolean;
    withinLimit: boolean;
    planName: string;
    tenantName: string;
  };
}) {
  const { t } = useTranslation();
  const pct = info.unlimited
    ? 0
    : info.limit > 0
      ? Math.min(100, Math.round((info.used / info.limit) * 100))
      : 100;
  const overLimit = !info.unlimited && !info.withinLimit;
  const atLimit = !info.unlimited && info.used === info.limit;

  return (
    <div
      className={cn(
        "rounded-md border p-3 space-y-2",
        overLimit
          ? "border-severity-critical/30 bg-severity-critical/5"
          : atLimit
            ? "border-warning/30 bg-warning/5"
            : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          {t("siloRequests.planUsage", { plan: info.planName })}
        </div>
        {overLimit ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-severity-critical">
            <AlertTriangle className="h-3 w-3" /> {t("siloRequests.overLimit")}
          </span>
        ) : atLimit ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-warning">
            <AlertTriangle className="h-3 w-3" /> {t("siloRequests.atLimit")}
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {!info.unlimited && (
          <div className="flex-1 h-1.5 rounded-none bg-muted overflow-hidden">
            <div
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                background:
                  overLimit || atLimit ? "hsl(var(--severity-critical))" : "hsl(var(--success))",
              }}
            />
          </div>
        )}
        <span className="text-[12px] font-medium text-foreground tabular-nums shrink-0">
          {info.unlimited
            ? t("siloRequests.unlimitedSilos")
            : t("siloRequests.silosCount", { used: info.used, limit: info.limit })}
        </span>
      </div>
      {(overLimit || atLimit) && (
        <p className="text-[11px] text-muted-foreground">
          {t("siloRequests.exceedNote", { tenant: info.tenantName })}
        </p>
      )}
    </div>
  );
}

// ── Request row ───────────────────────────────────────────────────────────────
function RequestRow({
  order,
  tabColor,
  onOpen,
}: {
  order: any;
  tabColor: string;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const cfg = STATUS_CFG[order.status] ?? STATUS_CFG.new;
  const isPending = PENDING_STATUSES.has(order.status);
  void tabColor;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full px-5 py-4 hover:bg-muted/30 transition-colors text-left block"
    >
      {/* Mobile view */}
      <div className="flex md:hidden flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {order.buyer?.name ?? order.customer_name ?? "—"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {order.buyer?.email ?? order.customer_email ?? ""}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={cn("capitalize text-[10px] px-2 py-0.5", cfg.badge)}
            >
              {t(`siloRequests.${cfg.label}`)}
            </Badge>
            {isPending && (
              <p className="text-[9px] text-amber-500 font-medium">
                ● {t("siloRequests.awaitingReview")}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 pt-1 border-t border-border/30">
          <div className="truncate">
            <span className="font-medium text-foreground">
              {order.plan_name ?? order.plan_id ?? "—"}
            </span>
            <span>
              {" "}
              · {order.hardware_quantity ?? 1} {t("siloRequests.siloUnits")}
            </span>
          </div>
          <div className="shrink-0">
            {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {[order.install_city, order.install_country].filter(Boolean).join(", ") || "—"}
          </span>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1.5fr_auto] gap-0 items-center">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {order.buyer?.name ?? order.customer_name ?? "—"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {order.buyer?.email ?? order.customer_email ?? ""}
          </p>
        </div>
        <div className="text-sm text-muted-foreground truncate">
          {order.plan_name ?? order.plan_id ?? "—"}
        </div>
        <div className="text-sm text-muted-foreground">
          {order.hardware_quantity ?? 1} {t("siloRequests.siloUnits")}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {[order.install_city, order.install_country].filter(Boolean).join(", ") || "—"}
          </span>
        </div>
        <div>
          <Badge variant="outline" className={cn("capitalize text-xs", cfg.badge)}>
            {t(`siloRequests.${cfg.label}`)}
          </Badge>
          {isPending && (
            <p className="text-[10px] text-amber-500 font-medium mt-1">
              ● {t("siloRequests.awaitingReview")}
            </p>
          )}
        </div>
        <div className="text-xs text-muted-foreground text-right pl-4 shrink-0">
          {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
        </div>
      </div>
    </button>
  );
}

// ── Detail row helper ─────────────────────────────────────────────────────────
function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}
