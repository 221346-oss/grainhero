import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyHardwareOrders } from "@/lib/hardware-orders.functions";
import { createSiloAddonCheckoutSession } from "@/lib/stripe-checkout.functions";
import { advanceInstallStage } from "@/lib/installations.functions";
import { usePlanGate } from "@/lib/plan-gate";
import { getPlatformSettings } from "@/lib/platform-settings.functions";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Phone, Wrench, Calendar, ArrowLeft, Truck, CheckCircle2, PlusCircle, Loader2 } from "lucide-react";
import { OrdersSkeleton } from "@/components/app/skeletons";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InstallationDrawer } from "@/components/app/orders/InstallationDrawer";
import { HardwareOrderThread } from "@/components/app/orders/HardwareOrderThread";
import { InstallStageTracker, deriveStage } from "@/components/app/orders/InstallStageTracker";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "My install orders — GrainHero" }] }),
  component: MyOrdersPage,
});

const STATUS_STYLE: Record<string, string> = {
  pending_payment: "bg-slate-200 text-slate-700",
  new: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  tech_assigned: "bg-indigo-100 text-indigo-800",
  installed: "bg-emerald-100 text-emerald-800",
  live: "bg-emerald-600 text-white",
  cancelled: "bg-red-100 text-red-700",
};

const emptyAddonForm = { address: "", city: "", country: "", phone: "", notes: "" };

function MyOrdersPage() {
  const fetchFn = useServerFn(listMyHardwareOrders);
  const settingsFn = useServerFn(getPlatformSettings);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const siloGate = usePlanGate("max_silos");
  const addonFn = useServerFn(createSiloAddonCheckoutSession);
  const [addonOpen, setAddonOpen] = useState(false);
  const [addonForm, setAddonForm] = useState(emptyAddonForm);
  const [selectedSkuId, setSelectedSkuId] = useState<string>("");

  // Load IoT pricing set by super admin
  const { data: platformSettings } = useQuery({
    queryKey: ["platform-settings-public"],
    queryFn: () => settingsFn(),
    staleTime: 5 * 60_000,
  });
  const iotPricing = platformSettings?.iot_pricing ?? [];
  const selectedSku = iotPricing.find((s) => s.id === selectedSkuId) ?? iotPricing[0] ?? null;

  const fmtPKR = (n: number) =>
    new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);

  function handleRequestSilo() {
    // Requesting one more silo must stay within the plan limit — if it
    // wouldn't, send them to upgrade instead of into the payment flow.
    if (siloGate.data && !siloGate.data.allowed) {
      navigate({ to: "/plan-management" });
      return;
    }
    setAddonForm(emptyAddonForm);
    setAddonOpen(true);
  }
  const addonMut = useMutation({
    mutationFn: () =>
      addonFn({
        data: {
          install: {
            address: addonForm.address.trim(),
            city: addonForm.city.trim() || null,
            country: addonForm.country.trim(),
            phone: addonForm.phone.trim(),
            notes: addonForm.notes.trim() || null,
          },
        },
      }),
    onSuccess: (res) => {
      if (!res?.url) { toast.error("Could not start checkout"); return; }
      window.location.href = res.url;
    },
    onError: (e: Error) => toast.error(e.message || "Could not start checkout"),
  });
  const advanceFn = useServerFn(advanceInstallStage);
  const completeMut = useMutation({
    mutationFn: (orderId: string) => advanceFn({ data: { orderId, next: "completed" } }),
    onSuccess: () => {
      toast.success("Admin sign-off recorded. Silos & warehouse are ready.");
      qc.invalidateQueries({ queryKey: ["my-hardware-orders"] });
      qc.invalidateQueries({ queryKey: ["installation"] });
      qc.invalidateQueries({ queryKey: ["silos"] });
      qc.invalidateQueries({ queryKey: ["warehouses"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not complete install"),
  });
  const { data, isLoading } = useQuery({
    queryKey: ["my-hardware-orders"],
    queryFn: () => fetchFn(),
  });
  const orders = data?.orders ?? [];
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </Link>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My install orders</h1>
          <p className="text-sm text-slate-500">Track the technician install for each subscription you purchased.</p>
        </div>
        <Button onClick={handleRequestSilo} disabled={siloGate.isLoading} className="gap-2">
          <PlusCircle className="h-4 w-4" /> Request new silo
        </Button>
      </div>

      {isLoading ? (
        <OrdersSkeleton />
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-slate-500 text-sm">
            No install orders yet. Pick a plan on the pricing page to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((o) => (
            <Card key={o.id as string}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base">{o.plan_name ?? o.plan_id} · {o.hardware_quantity} sensor{Number(o.hardware_quantity) === 1 ? "" : "s"}</CardTitle>
                    <CardDescription className="text-xs">Placed {new Date(o.created_at as string).toLocaleString()}</CardDescription>
                  </div>
                  <InstallStageTracker
                    variant="row"
                    {...deriveStage(o as any, (o as any).installation ?? null, ((o as any).visit_events ?? []) as any)}
                  />
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2 text-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                  <div>
                    <div>{o.install_address}</div>
                    <div className="text-xs text-slate-500">{o.install_city}, {o.install_country}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /> {o.contact_phone ?? "—"}</div>
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-slate-400" />
                  {o.technician_name ? (
                    <span>{o.technician_name}{o.technician_phone ? ` · ${o.technician_phone}` : ""}</span>
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
                  Rs. {Number(o.hardware_total ?? 0).toLocaleString()} in hardware · order id: {o.id}
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

      <Dialog open={addonOpen} onOpenChange={(o) => { setAddonOpen(o); if (!o) setAddonForm(emptyAddonForm); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request a new silo</DialogTitle>
            <DialogDescription>
              Select a hardware package below, fill in your install details, and we'll dispatch a technician.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3 py-1"
            onSubmit={(e) => { e.preventDefault(); addonMut.mutate(); }}
          >
            {/* IoT pricing picker — only shown when super admin has set pricing */}
            {iotPricing.length > 0 && (
              <div className="grid gap-1.5">
                <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Select hardware package</Label>
                <div className="grid gap-2">
                  {iotPricing.map((sku) => (
                    <button
                      key={sku.id}
                      type="button"
                      onClick={() => setSelectedSkuId(sku.id)}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        (selectedSkuId || iotPricing[0]?.id) === sku.id
                          ? "border-emerald-400 bg-emerald-50/60 ring-1 ring-emerald-400/40"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{sku.name}</p>
                          {sku.description && (
                            <p className="text-xs text-slate-500 mt-0.5 truncate">{sku.description}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-bold text-slate-800">PKR {fmtPKR(sku.price_pkr)}</p>
                          <p className="text-[10px] text-slate-400">{sku.unit}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label htmlFor="addon-address">Install address</Label>
              <Input
                id="addon-address"
                value={addonForm.address}
                onChange={(e) => setAddonForm((f) => ({ ...f, address: e.target.value }))}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="addon-city">City</Label>
                <Input
                  id="addon-city"
                  value={addonForm.city}
                  onChange={(e) => setAddonForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="addon-country">Country</Label>
                <Input
                  id="addon-country"
                  value={addonForm.country}
                  onChange={(e) => setAddonForm((f) => ({ ...f, country: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="addon-phone">Contact phone</Label>
              <Input
                id="addon-phone"
                value={addonForm.phone}
                onChange={(e) => setAddonForm((f) => ({ ...f, phone: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="addon-notes">Notes (optional)</Label>
              <Textarea
                id="addon-notes"
                rows={2}
                value={addonForm.notes}
                onChange={(e) => setAddonForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={() => setAddonOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addonMut.isPending} className="gap-2">
                {addonMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {addonMut.isPending ? "Starting checkout…" : "Continue to payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CardActions({ order, onTrack, onComplete, completing }: {
  order: Record<string, unknown>;
  onTrack: () => void;
  onComplete: () => void;
  completing: boolean;
}) {
  const derived = deriveStage(order as any, (order as any).installation ?? null, ((order as any).visit_events ?? []) as any);
  const canComplete = derived.stage === "installed" && !derived.blocked;
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={onTrack}>
        <Truck className="h-3.5 w-3.5 mr-1.5" /> Track installation
      </Button>
      {canComplete && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={completing}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {completing ? "Signing off…" : "Sign off & complete"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Admin sign-off required</AlertDialogTitle>
              <AlertDialogDescription>
                By signing off, you confirm every sensor is physically installed and working at your site. GrainHero will automatically:
                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                  <li>Provision a warehouse for this install (if none exists).</li>
                  <li>Create one silo per installed device serial.</li>
                  <li>Record your Admin sign-off and move the order to <strong>Completed</strong> — this step cannot be reversed.</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not yet</AlertDialogCancel>
              <AlertDialogAction
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={onComplete}
              >
                Yes, sign off
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}