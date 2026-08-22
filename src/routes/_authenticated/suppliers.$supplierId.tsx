import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getSupplierDetail } from "@/lib/suppliers.functions";

export const Route = createFileRoute("/_authenticated/suppliers/$supplierId")({
  head: () => ({
    meta: [
      { title: "Suppliers · SupplierId — Grain Hero" },
      { name: "description", content: "Suppliers · SupplierId workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Suppliers · SupplierId — Grain Hero" },
      { property: "og:description", content: "Suppliers · SupplierId workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SupplierDetail,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function SupplierDetail() {
  const { supplierId } = Route.useParams();
  const fn = useServerFn(getSupplierDetail);
  const q = useQuery({ queryKey: ["supplier", supplierId], queryFn: () => fn({ data: { id: supplierId } }) });
  if (q.isLoading) return <div className="p-6"><Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Loading…</div>;
  const s = (q.data?.supplier ?? {}) as Row;
  const batches = (q.data?.batches ?? []) as Row[];
  const total_kg = batches.reduce((sum, b) => sum + Number(b.quantity_kg ?? 0), 0);
  const avg_cost = (() => {
    const withCost = batches.filter((b) => b.unit_cost != null);
    if (!withCost.length) return null;
    const s = withCost.reduce((a, b) => a + Number(b.unit_cost) * Number(b.quantity_kg ?? 0), 0);
    const q = withCost.reduce((a, b) => a + Number(b.quantity_kg ?? 0), 0);
    return q > 0 ? s / q : null;
  })();

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm"><Link to="/suppliers"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" />{s.name}</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">{s.kind}</span>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Deliveries</div><div className="text-xl font-semibold tabular-nums">{batches.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total kg</div><div className="text-xl font-semibold tabular-nums">{total_kg.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Avg cost / kg</div><div className="text-xl font-semibold tabular-nums">{avg_cost != null ? avg_cost.toFixed(2) : "—"}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Contact</div><div className="text-sm">{[s.phone, s.email].filter(Boolean).join(" · ") || "—"}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-3 text-sm font-medium border-b border-border/40">Delivery history</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2">Batch</th>
                <th className="text-left px-3 py-2">Grain</th>
                <th className="text-left px-3 py-2">Silo</th>
                <th className="text-right px-3 py-2">Qty</th>
                <th className="text-right px-3 py-2">Unit cost</th>
                <th className="text-left px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No deliveries recorded yet.</td></tr>
              ) : batches.map((b) => (
                <tr key={b.id} className="hover:bg-emerald-500/5">
                  <td className="px-3 py-2 font-mono text-xs">{b.batch_id}</td>
                  <td className="px-3 py-2">{b.grain_type}</td>
                  <td className="px-3 py-2 text-xs">{b.silos?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{Number(b.quantity_kg ?? 0).toLocaleString()} kg</td>
                  <td className="px-3 py-2 text-right tabular-nums">{b.unit_cost != null ? Number(b.unit_cost).toFixed(2) : "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{b.intake_date ? new Date(b.intake_date).toLocaleDateString() : (b.created_at ? new Date(b.created_at).toLocaleDateString() : "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {s.notes && <Card><CardContent className="p-4 text-sm whitespace-pre-wrap">{s.notes}</CardContent></Card>}
    </div>
  );
}