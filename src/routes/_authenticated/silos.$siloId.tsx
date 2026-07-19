import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Package, ArrowLeft, Building2, MapPin, Truck, Wheat, Loader2, Inbox, Edit2, Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboards/_shared";
import { StatusBadge } from "@/components/app/DataListPage";
import { listSilos, listGrainBatches } from "@/lib/operations.functions";
import { DispatchDialog } from "@/components/app/silos/DispatchDialog";

export const Route = createFileRoute("/_authenticated/silos/$siloId")({
  component: SiloDetailPage,
});

type Silo = {
  id: string;
  silo_id: string;
  name: string;
  warehouse_id: string | null;
  capacity_kg: number | null;
  current_occupancy_kg: number | null;
  status: string | null;
  location: { description?: string | null } | null;
  notes: string | null;
  warehouses?: {
    id: string; name: string; warehouse_id: string;
    city?: string | null; country?: string | null; address_line1?: string | null;
  } | null;
};

type Batch = {
  id: string;
  batch_id: string;
  grain_type: string;
  quantity_kg: number;
  dispatched_quantity_kg: number | null;
  status: string;
  intake_date: string | null;
  harvest_date: string | null;
  farmer_name: string | null;
  silos?: { id: string } | null;
};

function SiloDetailPage() {
  const { siloId } = Route.useParams();
  const listS = useServerFn(listSilos);
  const listB = useServerFn(listGrainBatches);
  const silosQ = useQuery({ queryKey: ["silos"], queryFn: () => listS() as Promise<Silo[]> });
  const batchesQ = useQuery({ queryKey: ["grain-batches"], queryFn: () => listB() as Promise<Batch[]> });
  const [dispatchOpen, setDispatchOpen] = useState(false);

  const silo = useMemo(() => silosQ.data?.find((s) => s.id === siloId) ?? null, [silosQ.data, siloId]);
  const batches = useMemo(
    () => (batchesQ.data ?? []).filter((b) => b.silos?.id === siloId),
    [batchesQ.data, siloId],
  );

  if (silosQ.isLoading || batchesQ.isLoading) {
    return (
      <div className="p-8 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading silo…
      </div>
    );
  }
  if (!silo) {
    return (
      <div className="p-8 max-w-3xl mx-auto">
        <Link to="/silos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to silos
        </Link>
        <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground">Silo not found.</CardContent></Card>
      </div>
    );
  }

  const cap = Number(silo.capacity_kg ?? 0);
  const occ = Number(silo.current_occupancy_kg ?? 0);
  const pct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
  const wh = silo.warehouses;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Link to="/silos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to silos
      </Link>

      <PageHeader
        title={silo.name}
        subtitle={`${silo.silo_id} · ${cap.toLocaleString()} kg capacity`}
        badge={<StatusBadge value={silo.status} />}
      />

      {/* Silo + Warehouse cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Package className="w-4 h-4 text-emerald-600" /> Silo
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Occupancy</span>
                <span className="font-medium tabular-nums">{occ.toLocaleString()} / {cap.toLocaleString()} kg</span>
              </div>
              <Progress value={pct} className="h-2" />
              <div className="text-[10px] text-muted-foreground mt-1">{pct}% full</div>
            </div>
            {silo.location?.description && (
              <div className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {silo.location.description}
              </div>
            )}
            {silo.notes && (
              <div className="pt-2 border-t border-border/60">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{silo.notes}</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button size="sm" className="gap-1" onClick={() => setDispatchOpen(true)}>
                <Truck className="w-3.5 h-3.5" /> Dispatch
              </Button>
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link to="/grain-batches">
                  <Wheat className="w-3.5 h-3.5" /> Add batch
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Building2 className="w-4 h-4 text-sky-600" /> Warehouse
              </div>
              {wh && (
                <Button size="sm" variant="ghost" className="h-7 gap-1" asChild>
                  <Link to="/warehouses"><Eye className="w-3.5 h-3.5" /> Open</Link>
                </Button>
              )}
            </div>
            {wh ? (
              <div className="space-y-2 text-sm">
                <div className="font-medium text-foreground">{wh.name}</div>
                <div className="text-xs text-muted-foreground">{wh.warehouse_id}</div>
                {(wh.address_line1 || wh.city || wh.country) && (
                  <div className="text-xs text-muted-foreground inline-flex items-start gap-1">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>
                      {[wh.address_line1, wh.city, wh.country].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Not assigned to a warehouse.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Batches in this silo */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Wheat className="w-4 h-4 text-amber-600" /> Grain batches in this silo
              <Badge variant="secondary" className="ml-1">{batches.length}</Badge>
            </div>
            <Button size="sm" variant="outline" asChild className="gap-1 h-7">
              <Link to="/grain-batches"><Edit2 className="w-3.5 h-3.5" /> Manage</Link>
            </Button>
          </div>
          {batches.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-muted-foreground text-sm">
              <Inbox className="w-8 h-8 mb-2 opacity-60" />
              No grain batches in this silo yet.
              <Link to="/grain-batches" className="text-emerald-600 hover:underline mt-2">Add the first batch →</Link>
            </div>
          ) : (
            <div className="overflow-auto max-h-[60vh]">
              <Table className="text-xs">
                <TableHeader className="sticky top-0 bg-card/95 backdrop-blur z-10">
                  <TableRow className="[&_th]:h-9 [&_th]:text-[10px] [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-muted-foreground [&_th]:font-medium">
                    <TableHead>Batch</TableHead>
                    <TableHead>Grain</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Intake (kg)</TableHead>
                    <TableHead className="text-right">Remaining (kg)</TableHead>
                    <TableHead>Intake date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => {
                    const intake = Number(b.quantity_kg ?? 0);
                    const remaining = Math.max(0, intake - Number(b.dispatched_quantity_kg ?? 0));
                    const intakeDate = b.harvest_date ?? b.intake_date ?? null;
                    return (
                      <TableRow key={b.id} className="[&_td]:py-2 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5">
                        <TableCell className="font-medium">
                          <Link to="/grain-batches" className="hover:text-emerald-700 hover:underline">{b.batch_id}</Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{b.grain_type}</TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-[140px]">{b.farmer_name ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{intake.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{remaining.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{intakeDate ? new Date(intakeDate).toLocaleDateString() : "—"}</TableCell>
                        <TableCell><StatusBadge value={b.status} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DispatchDialog
        open={dispatchOpen}
        onOpenChange={setDispatchOpen}
        siloId={silo.id}
        siloName={silo.name}
      />
    </div>
  );
}