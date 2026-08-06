import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyHardwareOrders } from "@/lib/hardware-orders.functions";
import { payApprovedSiloOrder, createSiloDraftRequest } from "@/lib/stripe-checkout.functions";
import { getPlatformSettings } from "@/lib/platform-settings.functions";
import { advanceInstallStage } from "@/lib/installations.functions";
import { usePlanGate } from "@/lib/plan-gate";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Phone,
  Wrench,
  Calendar,
  ArrowLeft,
  Truck,
  CheckCircle2,
  PlusCircle,
  Loader2,
} from "lucide-react";
import { OrdersSkeleton } from "@/components/app/skeletons";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { InstallationDrawer } from "@/components/app/orders/InstallationDrawer";
import { HardwareOrderThread } from "@/components/app/orders/HardwareOrderThread";
import { InstallStageTracker, deriveStage } from "@/components/app/orders/InstallStageTracker";
import { getMyRole } from "@/lib/roles.functions";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My install orders — GrainHero" }] }),
  // Accept any query params so Stripe redirect URLs with ?payment=success don't throw
  validateSearch: (s: Record<string, unknown>) => s,
  component: MyOrdersPage,
});

// ── Status display ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-slate-200 text-slate-700",
  new:             "bg-amber-100 text-amber-800",
  approved:        "bg-emerald-100 text-emerald-800",
  tech_assigned:   "bg-indigo-100 text-indigo-800",
  installed:       "bg-emerald-100 text-emerald-800",
  live:            "bg-emerald-600 text-white",
  cancelled:       "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Payment pending — waiting for approval",
  new:             "Awaiting approval",
  approved:        "Approved — payment required",
  paid:            "Paid — installation in progress",
  tech_assigned:   "Tech assigned",
  packing:         "Packing",
  shipped:         "Shipped",
  in_transit:      "In transit",
  installing:      "Installing",
  installed:       "Installed — sign-off required",
  completed:       "Completed",
  live:            "Live",
  cancelled:       "Cancelled",
};

// Pre-payment / pre-install statuses — no install pipeline active yet.
// "pending_payment" is borderline: show tracker if the order has an install row,
// otherwise show badge. Resolved by the simple status check below.
const DRAFT_STATUSES = new Set(["new", "approved", "cancelled"]);

// ── Pakistani phone validation ────────────────────────────────────────────────
function formatPakPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("92") && d.length === 12) return `+${d}`;
  if (d.startsWith("0") && d.length === 11) return `+92${d.slice(1)}`;
  if (d.length === 10) return `+92${d}`;
  return raw;
}
function validatePakPhone(val: string): string | null {
  if (!val.trim()) return "Phone number is required";
  const f = formatPakPhone(val.trim());
  if (/^\+92\d{10}$/.test(f)) return null;
  return "Enter a valid Pakistani number: +92XXXXXXXXXX";
}

const emptyDraftForm = { address: "", city: "", country: "", phone: "", notes: "" };

// ── Page ──────────────────────────────────────────────────────────────────────
function MyOrdersPage() {
  const fetchFn = useServerFn(listMyHardwareOrders);
  const settingsFn = useServerFn(getPlatformSettings);
  const payFn = useServerFn(payApprovedSiloOrder);
  const advanceFn = useServerFn(advanceInstallStage);
  const draftFn = useServerFn(createSiloDraftRequest);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const siloGate = usePlanGate("max_silos");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [draftForm, setDraftForm] = useState(emptyDraftForm);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const draftMut = useMutation({
    mutationFn: () =>
      draftFn({
        data: {
          address: draftForm.address,
          city: draftForm.city || null,
          country: draftForm.country,
          phone: formatPakPhone(draftForm.phone),
          notes: draftForm.notes || null,
        },
      }),
    onSuccess: () => {
      setRequestOpen(false);
      setDraftForm(emptyDraftForm);
      toast.success("Silo request submitted — awaiting approval");
      qc.invalidateQueries({ queryKey: ["my-hardware-orders"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit request"),
  });

  // Load IoT pricing set by super admin
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings-public"],
    queryFn: () => settingsFn(),
    staleTime: 5 * 60_000,
  });

  // ── Handle URL params on mount (Stripe return + auto-open request sheet) ─
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("silo_payment");
    const autoRequest   = params.get("request");

    // Auto-open request sheet when navigating here with ?request=1
    if (autoRequest === "1") {
      window.history.replaceState({}, "", window.location.pathname);
      if (siloGate.data && !siloGate.data.allowed) {
        setLimitOpen(true);
      } else {
        setDraftForm(emptyDraftForm);
        setPhoneError(null);
        setRequestOpen(true);
      }
    }

    if (paymentStatus === "success") {
      window.history.replaceState({}, "", window.location.pathname);
      // Stripe webhook will update the order status. Just refetch and notify.
      toast.success("🎉 Payment received! Your silo install order is now active.");
      qc.invalidateQueries({ queryKey: ["my-hardware-orders"] });
      qc.invalidateQueries({ queryKey: ["plan-gate"] });
    } else if (paymentStatus === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
      toast.info("Payment cancelled — your request is still saved. You can pay later.");
    }
  }, [siloGate.data]);

  // ── Pay an approved order ────────────────────────────────────────────────
  const payMut = useMutation({
    mutationFn: (orderId: string) => payFn({ data: { orderId } }),
    onSuccess: (res) => {
      if (!res?.url) {
        toast.error("Could not submit request");
        return;
      }
      // Close confirmation dialog and show success message
      setConfirmationOpen(false);
      
      toast.success("Silo request submitted successfully");
      // Optionally refresh orders list
      qc.invalidateQueries({ queryKey: ["my-hardware-orders"] });
    },
    onError: (e: Error) => {
      toast.error(e.message || "Could not submit request");
      setConfirmationOpen(false);
    },
  });

  // ── Admin sign-off after install ─────────────────────────────────────────
  const completeMut = useMutation({
    mutationFn: (orderId: string) => advanceFn({ data: { orderId, next: "completed" } }),
    onSuccess: () => {
      toast.success("Sign-off recorded. Silos & warehouse will appear in your Silos page shortly.");
      qc.invalidateQueries({ queryKey: ["my-hardware-orders"] });
      qc.invalidateQueries({ queryKey: ["installation"] });
      // Delay so the DB trigger (hardware_order_provision_silo) has time to commit
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ["silos"] });
        qc.invalidateQueries({ queryKey: ["warehouses"] });
        qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
        qc.invalidateQueries({ queryKey: ["dashboard-extras"] });
      }, 1500);
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not complete install"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["my-hardware-orders"],
    queryFn:  () => fetchFn(),
    staleTime: 0,          // always refetch — orders change after approval
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const orders      = data?.orders ?? [];
  const hasApproved = orders.some((o) => o.status === "approved");
  // Auto-poll every 8s while any approved order is waiting for payment confirmation
  useQuery({
    queryKey: ["my-hardware-orders"],
    queryFn:  () => fetchFn(),
    staleTime: 0,
    refetchInterval: hasApproved ? 8_000 : false,
    enabled: hasApproved,
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My install orders</h1>
          <p className="text-sm text-slate-500">
            Track the technician install for each subscription you purchased.
          </p>
        </div>
        <Button
          onClick={() => {
            if (siloGate.data && !siloGate.data.allowed) {
              setLimitOpen(true);
              return;
            }
            setDraftForm(emptyDraftForm);
            setPhoneError(null);
            setRequestOpen(true);
          }}
          disabled={siloGate.isLoading}
          className="gap-2"
        >
          <PlusCircle className="h-4 w-4" /> Request new silo
        </Button>
      </div>

      {/* Approved-but-unpaid top banner */}
      {orders.some((o) => o.status === "approved") && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">Your silo request has been approved!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Click <strong>Pay now</strong> on the order card below to complete payment and schedule your installation.
            </p>
          </div>
        </div>
      )}

      {/* Order list */}
      {isLoading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500 text-sm space-y-3">
            <p>No install orders yet.</p>
            <p className="text-xs text-slate-400">
              If you recently submitted a silo request, it may take a moment to appear.
            </p>
            <button
              type="button"
              onClick={() => qc.invalidateQueries({ queryKey: ["my-hardware-orders"] })}
              className="text-xs text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
            >
              Refresh orders
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((o) => (
            <Card key={o.id as string}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base">
                      {o.plan_name ?? o.plan_id} · {o.hardware_quantity} sensor
                      {Number(o.hardware_quantity) === 1 ? "" : "s"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Placed {new Date(o.created_at as string).toLocaleString()}
                    </CardDescription>
                  </div>
                  <InstallStageTracker
                    variant="row"
                    {...deriveStage(
                      o as any,
                      (o as any).installation ?? null,
                      ((o as any).visit_events ?? []) as any,
                    )}
                  />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <div>{o.install_address}</div>
                    <div className="text-xs text-slate-500">
                      {o.install_city}, {o.install_country}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-400" /> {o.contact_phone ?? "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-slate-400" />
                  {o.technician_name ? (
                    <span>
                      {o.technician_name}
                      {o.technician_phone ? ` · ${o.technician_phone}` : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500">Technician not yet assigned</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {o.scheduled_install_date
                    ? new Date(o.scheduled_install_date as string).toLocaleString()
                    : o.preferred_install_date
                      ? `Preferred: ${o.preferred_install_date}`
                      : "Awaiting schedule"}
                </div>
                <div className="md:col-span-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                  Rs. {Number(o.hardware_total ?? 0).toLocaleString()} in hardware · order id:{" "}
                  {o.id}
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <CardActions
                    order={o}
                    onTrack={() => setOpenOrderId(o.id as string)}
                    onComplete={() => completeMut.mutate(o.id as string)}
                    completing={completeMut.isPending && completeMut.variables === o.id}
                  />
                </div>
                <div className="md:col-span-2">
                  <HardwareOrderThread orderId={o.id as string} as="admin" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InstallationDrawer
        orderId={openOrderId}
        open={!!openOrderId}
        onOpenChange={(v) => !v && setOpenOrderId(null)}
        canEdit={false}
      />

      <Dialog
        open={addonOpen}
        onOpenChange={(o) => {
          setAddonOpen(o);
          if (!o) setDraftForm(emptyAddonForm);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Silo limit reached</DialogTitle>
            <DialogDescription>
              Your current plan (<strong>{siloGate.data?.planId ?? "starter"}</strong>) allows up to{" "}
              <strong>{typeof siloGate.data?.limit === "number" ? siloGate.data.limit : "—"}</strong> silos
              and you are already using{" "}
              <strong>{typeof siloGate.data?.used === "number" ? siloGate.data.used : "all"}</strong> of them.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-slate-600 px-1">
            To request additional silos you need to upgrade your plan. Visit the plan management page to
            request a higher tier.
          </p>
          <DialogFooter className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => setLimitOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => { setLimitOpen(false); navigate({ to: "/plan-management" }); }}
            >
              Upgrade plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Request silo sheet ───────────────────────────────────── */}
      <Sheet open={requestOpen} onOpenChange={(v) => { setRequestOpen(v); if (!v) { setDraftForm(emptyDraftForm); setPhoneError(null); } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Request a new silo</SheetTitle>
            <SheetDescription>
              Fill in your install details. Our team will review and approve — you'll be notified once it's ready for payment.
            </SheetDescription>
          </SheetHeader>
          <form
            className="mt-6 grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const err = validatePakPhone(draftForm.phone);
              setPhoneError(err);
              if (err) return;
              draftMut.mutate();
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="addon-address">Install address *</Label>
              <Input
                id="addon-address"
                value={draftForm.address}
                onChange={(e) => setDraftForm((f) => ({ ...f, address: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="addon-city">City *</Label>
                <Input
                  id="addon-city"
                  value={draftForm.city}
                  onChange={(e) => setDraftForm((f) => ({ ...f, city: e.target.value }))}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="addon-country">Country *</Label>
                <Input
                  id="addon-country"
                  value={draftForm.country}
                  onChange={(e) => setDraftForm((f) => ({ ...f, country: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="addon-phone">Contact phone *</Label>
              <Input
                id="addon-phone"
                type="tel"
                value={draftForm.phone}
                onChange={(e) => setDraftForm((f) => ({ ...f, phone: e.target.value }))}
                required
                className={phoneError ? "border-red-400" : ""}
              />
              {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
              <p className="text-[11px] text-slate-400">e.g. +923001234567 or 03001234567</p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-notes">Notes (optional)</Label>
              <Textarea id="s-notes" rows={3} value={draftForm.notes} onChange={(e) => setDraftForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Preferred install time, access instructions…" />
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-700">What happens next</p>
              <ol className="list-decimal pl-4 space-y-0.5">
                <li>Our team reviews your request (usually within 24 h).</li>
                <li>You'll get a notification once approved.</li>
                <li>Click <strong>Pay now</strong> on this page to complete payment.</li>
              </ol>
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={draftMut.isPending || siloGate.isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                {draftMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {draftMut.isPending ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request Submitted</AlertDialogTitle>
            <AlertDialogDescription>
              Your silo request has been sent to the admin for approval. Once approved, you will be
              notified to proceed with payment. Please wait for admin confirmation before
              continuing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmationOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                draftMut.mutate();
              }}
              disabled={draftMut.isPending}
            >
              {draftMut.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "OK"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Install-stage actions (track + sign-off) ──────────────────────────────────
function CardActions({ order, onTrack, onComplete, completing }: {
  order: Record<string, unknown>;
  onTrack: () => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const derived = deriveStage(
    order as any,
    (order as any).installation ?? null,
    ((order as any).visit_events ?? []) as any,
  );
  const canComplete = derived.stage === "installed" && !derived.blocked;

  // Count how many device serials are attached (provisioned by trigger per serial)
  const deviceCount = (order.hardware_quantity as number) ?? 0;

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={onTrack}>
        <Truck className="h-3.5 w-3.5 mr-1.5" /> Track installation
      </Button>

      {canComplete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={completing}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {completing ? "Signing off…" : "Sign off & complete"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Admin sign-off required</AlertDialogTitle>
              <AlertDialogDescription>
                By signing off, you confirm every sensor is physically installed and working at your
                site. GrainHero will automatically:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                  <li>Provision a warehouse for this install (if none exists).</li>
                  <li>Create one silo per installed device serial.</li>
                  <li>
                    Record your Admin sign-off and move the order to <strong>Completed</strong> —
                    this step cannot be reversed.
                  </li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 px-1 pb-1 text-xs text-slate-600">
              <p>GrainHero will automatically:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provision a warehouse for this install (if none exists yet).</li>
                <li>Create one silo per device serial the technician recorded ({deviceCount} ordered).</li>
                <li>Move the order to <strong>Completed</strong> — this cannot be reversed.</li>
              </ul>
              <p className="text-amber-700 bg-amber-50 rounded p-2 border border-amber-200">
                Silos don't appear instantly — if they're missing after a minute, open
                <strong> Track installation</strong> and confirm the technician saved device serials.
                Each serial provisions one silo.
              </p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Not yet</AlertDialogCancel>
              <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={onComplete}>
                Yes, sign off
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* If installed but no sign-off yet and stage not yet reached — hint */}
      {derived.stage !== "installed" && derived.stage !== "completed" && !derived.blocked && (
        <span className="text-xs text-slate-400">
          Sign-off available once technician marks installed
        </span>
      )}
    </div>
  );
}
