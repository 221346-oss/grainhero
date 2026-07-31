import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Truck, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDispatchFromSilo, listSiloAvailableBatches } from "@/lib/dispatches.functions";
import { listBuyers } from "@/lib/operations.functions";
import { getPriceSettings } from "@/lib/suppliers.functions";

type Batch = { id: string; batch_id: string; grain_type: string; remaining_kg: number | string; purchase_price_per_kg: number | string | null };
type Buyer = { id: string; name: string; company_name: string | null };

export function DispatchDialog({
  open, onOpenChange, siloId, siloName,
}: { open: boolean; onOpenChange: (o: boolean) => void; siloId: string | null; siloName?: string }) {
  const qc = useQueryClient();
  const [grainType, setGrainType] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [newBuyer, setNewBuyer] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [currency] = useState("PKR");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");
  const [destination, setDestination] = useState("");
  const [notes, setNotes] = useState("");
  const [expected, setExpected] = useState("");
  const [basis, setBasis] = useState<"cost_margin" | "market" | "manual">("manual");
  const [stage, setStage] = useState<"staged" | "in_transit">("staged");

  useEffect(() => {
    if (open) { setGrainType(""); setBuyerId(""); setNewBuyer(""); setQty(""); setPrice(""); setVehicle(""); setDriver(""); setDestination(""); setNotes(""); setExpected(""); setBasis("manual"); setStage("staged"); }
  }, [open]);

  const listBatchesFn = useServerFn(listSiloAvailableBatches);
  const listBuyersFn = useServerFn(listBuyers);
  const createFn = useServerFn(createDispatchFromSilo);
  const priceFn = useServerFn(getPriceSettings);
  const priceQ = useQuery({ queryKey: ["price-settings"], queryFn: () => priceFn(), enabled: open });

  const batchesQ = useQuery({
    queryKey: ["silo-batches", siloId],
    queryFn: () => listBatchesFn({ data: { siloId: siloId! } }),
    enabled: open && !!siloId,
  });
  const buyersQ = useQuery({ queryKey: ["buyers-mini"], queryFn: () => listBuyersFn(), enabled: open });

  const batches = (batchesQ.data?.batches ?? []) as Batch[];
  const grainTypes = useMemo(() => Array.from(new Set(batches.map((b) => b.grain_type))), [batches]);
  useEffect(() => { if (!grainType && grainTypes.length > 0) setGrainType(grainTypes[0]); }, [grainTypes, grainType]);

  const filtered = batches.filter((b) => b.grain_type === grainType);
  const available = filtered.reduce((s, b) => s + Number(b.remaining_kg ?? 0), 0);
  const qtyNum = Number(qty) || 0;
  const priceNum = Number(price) || 0;
  const total = qtyNum * priceNum;

  // FIFO preview + per-lot cost
  const preview: { batch_id: string; qty: number; unit_cost: number | null; line_cost: number | null }[] = [];
  let need = qtyNum;
  let costed = 0; let costSum = 0;
  for (const b of filtered) {
    if (need <= 0) break;
    const take = Math.min(need, Number(b.remaining_kg));
    const uc = b.purchase_price_per_kg != null ? Number(b.purchase_price_per_kg) : null;
    const line = uc != null ? uc * take : null;
    preview.push({ batch_id: b.batch_id, qty: take, unit_cost: uc, line_cost: line });
    if (uc != null) { costed += take; costSum += uc * take; }
    need -= take;
  }
  const avgCost = costed > 0 ? costSum / costed : null;
  const profit = avgCost != null ? total - avgCost * qtyNum : null;

  // Suggested prices
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const settings = (priceQ.data ?? null) as any;
  const marginPct = settings?.default_margin_pct != null ? Number(settings.default_margin_pct) : 15;
  const marketMap = (settings?.per_grain_margin ?? settings?.market_price_snapshot ?? {}) as Record<string, number>;
  const suggestedCost = avgCost != null ? avgCost * (1 + marginPct / 100) : null;
  const suggestedMarket = grainType ? Number(marketMap[grainType] ?? 0) || null : null;

  const mut = useMutation({
    mutationFn: async () => {
      if (!siloId) throw new Error("No silo");
      if (!grainType) throw new Error("Pick a grain");
      if (!(qtyNum > 0)) throw new Error("Quantity required");
      if (!(priceNum > 0)) throw new Error("Price required");
      if (qtyNum > available) throw new Error(`Only ${available} kg available in silo`);
      if (!buyerId && !newBuyer.trim()) throw new Error("Pick or add a buyer");
      return createFn({ data: {
        siloId, grainType, qtyKg: qtyNum, pricePerKg: priceNum, currency,
        buyerId: buyerId || null,
        newBuyer: !buyerId && newBuyer.trim() ? { name: newBuyer.trim() } : null,
        vehicleNumber: vehicle || null, driverName: driver || null, destination: destination || null,
        notes: notes || null, expectedDate: expected || null,
        priceBasis: basis, marketPriceSnapshot: suggestedMarket, stage,
      } });
    },
    onSuccess: (r) => {
      toast.success(`Sale request ${r.dispatchNumber} submitted — awaiting admin approval`);
      qc.invalidateQueries({ queryKey: ["silo-dispatch-drafts", siloId] });
      qc.invalidateQueries({ queryKey: ["silo-dispatches", siloId] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-4 w-4 text-emerald-600" /> Sell from {siloName ?? "silo"}</DialogTitle>
          <DialogDescription>Requests a sale from this silo (FIFO cost preview below). Stock isn&apos;t deducted until an Admin approves the request.</DialogDescription>
        </DialogHeader>

        {batchesQ.isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading batches…</div>
        ) : batches.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">This silo has no batches with remaining stock.</div>
        ) : (
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Grain</Label>
                <Select value={grainType} onValueChange={setGrainType}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Grain type" /></SelectTrigger>
                  <SelectContent>
                    {grainTypes.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">Available: <span className="tabular-nums">{available.toLocaleString()} kg</span></p>
              </div>
              <div>
                <Label className="text-xs">Quantity (kg)</Label>
                <Input className="h-9" type="number" min="0" step="1" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="e.g. 10000" />
              </div>
              <div>
                <Label className="text-xs">Price / kg ({currency})</Label>
                <Input className="h-9" type="number" min="0" step="0.01" value={price} onChange={(e) => { setPrice(e.target.value); setBasis("manual"); }} placeholder="e.g. 120" />
              </div>
              <div>
                <Label className="text-xs">Expected date</Label>
                <Input className="h-9" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
              </div>
            </div>

            {(suggestedCost != null || suggestedMarket != null) && (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => { if (suggestedCost != null) { setPrice(suggestedCost.toFixed(2)); setBasis("cost_margin"); } }} disabled={suggestedCost == null}
                  className={`rounded-lg border p-2 text-left transition ${basis === "cost_margin" ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/50"} disabled:opacity-50`}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cost + {marginPct}%</div>
                  <div className="text-sm font-semibold tabular-nums">{suggestedCost != null ? `${currency} ${suggestedCost.toFixed(2)}` : "—"}</div>
                  {avgCost != null && <div className="text-[10px] text-muted-foreground">avg cost {avgCost.toFixed(2)}</div>}
                </button>
                <button type="button" onClick={() => { if (suggestedMarket != null) { setPrice(suggestedMarket.toFixed(2)); setBasis("market"); } }} disabled={suggestedMarket == null}
                  className={`rounded-lg border p-2 text-left transition ${basis === "market" ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/50"} disabled:opacity-50`}>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Market price</div>
                  <div className="text-sm font-semibold tabular-nums">{suggestedMarket != null ? `${currency} ${suggestedMarket.toFixed(2)}` : "not set"}</div>
                  <div className="text-[10px] text-muted-foreground">from platform settings</div>
                </button>
              </div>
            )}

            <div>
              <Label className="text-xs">Buyer</Label>
              <Select value={buyerId} onValueChange={(v) => { setBuyerId(v); setNewBuyer(""); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select existing buyer" /></SelectTrigger>
                <SelectContent>
                  {(buyersQ.data ?? []).map((b: Buyer) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}{b.company_name ? ` · ${b.company_name}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input className="h-9 mt-2" placeholder="…or new buyer name" value={newBuyer} onChange={(e) => { setNewBuyer(e.target.value); if (e.target.value) setBuyerId(""); }} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input className="h-9" placeholder="Vehicle #" value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
              <Input className="h-9" placeholder="Driver name" value={driver} onChange={(e) => setDriver(e.target.value)} />
            </div>
            <Input className="h-9" placeholder="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
            <Textarea rows={2} placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <div>
              <Label className="text-xs">Stage</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button type="button" onClick={() => setStage("staged")} className={`rounded-lg border p-2 text-left text-xs ${stage === "staged" ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/50"}`}>
                  <div className="font-medium">Sold, still on premises</div>
                  <div className="text-muted-foreground">Reserved but not yet loaded.</div>
                </button>
                <button type="button" onClick={() => setStage("in_transit")} className={`rounded-lg border p-2 text-left text-xs ${stage === "in_transit" ? "border-emerald-500 bg-emerald-500/10" : "border-border hover:border-emerald-500/50"}`}>
                  <div className="font-medium">Dispatched now</div>
                  <div className="text-muted-foreground">Truck is leaving with the load.</div>
                </button>
              </div>
            </div>

            {qtyNum > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Revenue</span><span className="font-medium tabular-nums">{currency} {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                {avgCost != null && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Avg cost / kg</span><span className="tabular-nums">{currency} {avgCost.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Profit</span><span className={`font-semibold tabular-nums ${profit! >= 0 ? "text-emerald-600" : "text-red-600"}`}>{currency} {profit!.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                  </>
                )}
                {preview.length > 0 && (
                  <div className="pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">FIFO cost breakdown</div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${stage === "in_transit" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" : "bg-slate-500/15 text-slate-700 dark:text-slate-300"}`}>
                        {stage === "in_transit" ? "Dispatching now" : "Sold · on premises"}
                      </span>
                    </div>
                    <div className="grid gap-1">
                      {preview.map((p) => (
                        <div key={p.batch_id} className="flex items-center justify-between rounded-md bg-background/60 border border-border/60 px-2 py-1 text-[11px]">
                          <span className="font-mono text-emerald-700 dark:text-emerald-400">{p.batch_id}</span>
                          <span className="tabular-nums text-muted-foreground">{p.qty.toLocaleString()} kg</span>
                          <span className="tabular-nums">{p.unit_cost != null ? `${currency} ${p.unit_cost.toFixed(2)}/kg` : <span className="text-amber-600">no cost</span>}</span>
                          <span className="tabular-nums font-medium">{p.line_cost != null ? `${currency} ${p.line_cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}</span>
                        </div>
                      ))}
                    </div>
                    {need > 0 && <div className="text-[10px] text-red-600 mt-1">Short by {need.toLocaleString()} kg — reduce quantity.</div>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || batches.length === 0} className="gap-1.5">
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />} Request sale (needs admin approval)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}