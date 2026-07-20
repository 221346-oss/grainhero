import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyHardwareOrders } from "@/lib/hardware-orders.functions";
import { advanceInstallStage } from "@/lib/installations.functions";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Wrench, Calendar, ArrowLeft, Truck, CheckCircle2 } from "lucide-react";
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

function MyOrdersPage() {
  const fetchFn = useServerFn(listMyHardwareOrders);
  const qc = useQueryClient();
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
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My install orders</h1>
          <p className="text-sm text-slate-500">Track the technician install for each subscription you purchased.</p>
        </div>
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