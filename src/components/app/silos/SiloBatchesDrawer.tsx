import { Link } from "@tanstack/react-router";
import { useLocationScopeKey } from "@/components/app/location/LocationScope";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, Loader2, Truck, Wheat, Inbox } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { listGrainBatches } from "@/lib/operations.functions";

// Structurally-compatible with the Silo type used in the Silos page.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Silo = any;

type Batch = {
  id: string;
  batch_id: string;
  grain_type: string;
  quantity_kg: number | null;
  dispatched_quantity_kg: number | null;
  status: string;
  intake_date: string | null;
  risk_score: number | null;
  silos?: { id: string } | null;
};

function statusPill(s: string) {
  const l = s.toLowerCase();
  if (l.includes("dispatch"))
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (l.includes("sold")) return "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30";
  if (l.includes("damag") || l.includes("expir"))
    return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
  return "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/30";
}

export function SiloBatchesDrawer({
  silo,
  open,
  onOpenChange,
  onDispatch,
}: {
  silo: Silo | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDispatch: (silo: Silo) => void;
}) {
  const list = useServerFn(listGrainBatches);
  // Scope every location-dependent query to the active city — in the key as
  // well as the request, so one city's rows are never served for another.
  const loc = useLocationScopeKey();
  const q = useQuery({
    queryKey: ["grain-batches", loc],
    queryFn: () => list({ data: { loc: loc ?? undefined } }) as Promise<Batch[]>,
    enabled: open,
  });

  const rows = useMemo(() => {
    if (!silo) return [];
    return (q.data ?? []).filter((b) => b.silos?.id === silo.id);
  }, [q.data, silo]);

  const cap = Number(silo?.capacity_kg ?? 0);
  const occ = Number(silo?.current_occupancy_kg ?? 0);
  const pct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-5 py-4 border-b border-border/60">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="flex items-center gap-2 min-w-0">
                <span className="truncate">{silo?.name ?? "Silo"}</span>
              </SheetTitle>
              <SheetDescription className="flex items-center gap-2 text-xs mt-0.5">
                <span className="font-mono">{silo?.silo_id}</span>
                {silo?.warehouses?.name && (
                  <span className="truncate">· {silo.warehouses.name}</span>
                )}
              </SheetDescription>
            </div>
            {silo && (
              <Button
                size="sm"
                onClick={() => onDispatch(silo)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Truck className="w-3.5 h-3.5" /> Dispatch
              </Button>
            )}
          </div>

          {silo && (
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Fill
                </div>
                <div className="font-semibold tabular-nums mt-0.5">{pct}%</div>
                <Progress value={pct} className="h-1 mt-1" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Occupancy
                </div>
                <div className="font-semibold tabular-nums mt-0.5">
                  {occ.toLocaleString()}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    / {cap.toLocaleString()} kg
                  </span>
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Grain
                </div>
                <div className="font-semibold mt-0.5 inline-flex items-center gap-1">
                  <Wheat className="w-3 h-3 text-amber-600" />
                  {silo.current_batch?.grain_type ?? "—"}
                </div>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-auto">
          <div className="flex items-center justify-between px-5 py-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Batches
              </span>
              <Badge variant="outline" className="h-4 px-1.5 text-[10px] tabular-nums">
                {rows.length}
              </Badge>
            </div>
            <Link
              to="/grain-operations"
              search={{ tab: "batches" }}
              className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-0.5 text-xs font-medium"
            >
              Open full page <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {q.isLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground text-xs">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading batches…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 flex flex-col items-center text-muted-foreground">
              <Inbox className="w-8 h-8 opacity-50 mb-2" />
              <p className="text-xs">No batches in this silo yet.</p>
              <Link
                to="/grain-operations"
                search={{ tab: "batches" }}
                className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Add first batch →
              </Link>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/60">
                <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-2 font-medium">Batch</th>
                  <th className="px-2 py-2 font-medium">Grain</th>
                  <th className="px-2 py-2 font-medium text-right">Qty (kg)</th>
                  <th className="px-2 py-2 font-medium text-right">Remaining</th>
                  <th className="px-5 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b, idx) => {
                  const qty = Number(b.quantity_kg ?? 0);
                  const dispatched = Number(b.dispatched_quantity_kg ?? 0);
                  const remaining = Math.max(0, qty - dispatched);
                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-border/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition ${idx % 2 ? "bg-muted/20" : ""}`}
                    >
                      <td className="px-5 py-2 font-medium">{b.batch_id}</td>
                      <td className="px-2 py-2 text-muted-foreground">{b.grain_type}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{qty.toLocaleString()}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {remaining.toLocaleString()}
                      </td>
                      <td className="px-5 py-2">
                        <span
                          className={`inline-block h-5 px-1.5 rounded-full text-[10px] font-medium border ${statusPill(String(b.status))}`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
