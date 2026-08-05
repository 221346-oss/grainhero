import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { InsuranceCommandSkeleton } from "@/components/app/skeletons";
import { Shield, ShieldCheck, AlertTriangle, DollarSign, Clock, TrendingDown, Plus, Trash2, ScrollText, BarChart3 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend } from "recharts";
import { toast } from "sonner";
import {
  getInsuranceKpis, listCarriers, upsertCarrier, deleteCarrier,
  listProducts, upsertProduct, deleteProduct,
  listClaims, moderateClaim, getClaimTimeline, getInsuranceAnalytics,
} from "@/lib/insurance.functions";
import {
  NEON, NeonPatternDefs, useNeonCharts, neonGrid, neonAxis, neonTooltipStyle, neonAnim,
  HairlineGrid, NeonPanel, StatGrid, ChartEmpty, StatusBadge,
} from "@/components/charts/neon";

export const Route = createFileRoute("/_authenticated/platform/insurance")({
  component: PlatformInsurancePage,
});

function money(cents: number | null | undefined, cur = "USD") {
  const n = Number(cents ?? 0) / 100;
  return `${cur} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const CLAIM_STATUS_TONE: Record<string, string> = {
  draft: "neutral",
  submitted: "info",
  under_review: "warning",
  approved: "ok",
  rejected: "critical",
  paid: "ok",
  cancelled: "neutral",
};

function PlatformInsurancePage() {
  const kpiFn = useServerFn(getInsuranceKpis);
  const { data: kpis, isLoading } = useQuery({ queryKey: ["ins-kpis"], queryFn: () => kpiFn() });

  if (isLoading || !kpis) return <InsuranceCommandSkeleton />;

  const tiles = [
    { label: "Active policies", value: kpis.activePolicies.toLocaleString(), icon: ShieldCheck },
    { label: "Open claims", value: kpis.openClaims.toLocaleString(), icon: AlertTriangle },
    { label: "Total premium", value: `${kpis.currency} ${kpis.totalPremium.toLocaleString()}`, icon: DollarSign },
    { label: "Total payout", value: `${kpis.currency} ${kpis.totalPayout.toLocaleString()}`, icon: TrendingDown },
    { label: "Loss ratio", value: `${kpis.lossRatioPct}%`, icon: TrendingDown },
    { label: "Avg decision", value: `${kpis.avgDecisionHours}h`, icon: Clock },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <NeonPatternDefs />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-600" /> Insurance command center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Carriers, products, policies, and claims — all configurable, no hardcoding.</p>
      </div>

      <HairlineGrid cols="grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="bg-background p-4 space-y-2 transition-colors hover:bg-muted/20">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground uppercase tracking-wide">
              <span>{t.label}</span>
              <t.icon className="h-3.5 w-3.5" />
            </div>
            <div className="text-lg font-medium tabular-nums text-foreground">{t.value}</div>
          </div>
        ))}
      </HairlineGrid>

      <Tabs defaultValue="claims" className="space-y-4">
        <TabsList>
          <TabsTrigger value="claims">Claims queue</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="carriers">Carriers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="claims"><ClaimsQueue /></TabsContent>
        <TabsContent value="products"><ProductsTab /></TabsContent>
        <TabsContent value="carriers"><CarriersTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Link to="/platform/insurance/webhooks" className="text-sm text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
          <ScrollText className="h-4 w-4" /> Webhook monitor
        </Link>
        <Link to="/platform/insurance/audit" className="text-sm text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1">
          <ScrollText className="h-4 w-4" /> Audit log
        </Link>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const fn = useServerFn(getInsuranceAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["ins-analytics"], queryFn: () => fn() });
  const { getFill } = useNeonCharts();
  if (isLoading || !data) return <div className="p-6 text-sm text-muted-foreground border border-border rounded-md">Loading analytics…</div>;
  return (
    <div className="space-y-4">
      <HairlineGrid cols="grid-cols-1">
        <NeonPanel
          title={
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" style={{ color: NEON.brand }} /> Monthly trend (12m)
            </span>
          }
        >
          <div className="h-64">
            {data.trend.length === 0 ? (
              <ChartEmpty label="No trend data yet" height={256} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trend}>
                  <CartesianGrid {...neonGrid} />
                  <XAxis dataKey="month" {...neonAxis} />
                  <YAxis {...neonAxis} />
                  <Tooltip {...neonTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="premium" stroke={NEON.brand} strokeWidth={2} name="Premium" {...neonAnim} />
                  <Line type="monotone" dataKey="payout" stroke={NEON.critical} strokeWidth={2} name="Payout" {...neonAnim} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </NeonPanel>
      </HairlineGrid>

      <HairlineGrid cols="grid-cols-1 lg:grid-cols-2">
        <NeonPanel title="Carrier performance">
          <div className="h-64">
            {data.carriers.length === 0 ? (
              <ChartEmpty label="No carrier activity yet" height={256} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.carriers}>
                  <CartesianGrid {...neonGrid} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis {...neonAxis} />
                  <Tooltip {...neonTooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="premium" name="Premium" radius={0} {...getFill(NEON.brand)} {...neonAnim} />
                  <Bar dataKey="payout" name="Payout" radius={0} {...getFill(NEON.critical)} {...neonAnim} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </NeonPanel>
        <NeonPanel title="Product performance" bodyClassName="-m-4 mt-0">
          <div className="border-t border-border overflow-hidden overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left font-medium text-muted-foreground px-3 py-2">Product</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">Policies</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">Premium</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">Claims</th>
                  <th className="text-right font-medium text-muted-foreground px-3 py-2">Payout</th>
                </tr>
              </thead>
              <tbody>
                {data.products.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.policies}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.premium.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.claims}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{p.payout.toLocaleString()}</td>
                  </tr>
                ))}
                {!data.products.length && (
                  <tr><td colSpan={5} className="text-center text-muted-foreground px-3 py-6">No product activity yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </NeonPanel>
      </HairlineGrid>
    </div>
  );
}

/* ------------------------ Claims ------------------------ */
function ClaimsQueue() {
  const qc = useQueryClient();
  const listFn = useServerFn(listClaims);
  const [status, setStatus] = useState<string>("all");
  const { data } = useQuery({
    queryKey: ["ins-claims", status],
    queryFn: () => listFn({ data: { scope: "queue" as const, status: status === "all" ? undefined : status } }),
  });
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">{(data?.claims ?? []).length} claims</div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all","submitted","under_review","approved","rejected","paid","cancelled"].map(s => (
              <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Filed</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Product</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Type</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Requested</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Approved</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.claims ?? []).map((c: Record<string, unknown>) => {
              const policy = c.policy as Record<string, unknown> | null;
              const product = policy?.product as Record<string, unknown> | null;
              const cur = (c.currency as string) ?? "USD";
              return (
                <tr key={c.id as string} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 tabular-nums">{new Date(c.created_at as string).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{(product?.name as string) ?? "—"}</td>
                  <td className="px-3 py-2 uppercase tracking-wide text-muted-foreground text-[11px]">{c.claim_type as string}</td>
                  <td className="px-3 py-2 tabular-nums">{money(c.requested_payout_cents as number, cur)}</td>
                  <td className="px-3 py-2 tabular-nums">{c.approved_payout_cents ? money(c.approved_payout_cents as number, cur) : "—"}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={CLAIM_STATUS_TONE[c.status as string] ?? "neutral"} label={(c.status as string).replace("_", " ")} />
                  </td>
                  <td className="px-3 py-2"><Button size="sm" variant="outline" onClick={() => setOpenId(c.id as string)}>Review</Button></td>
                </tr>
              );
            })}
            {!(data?.claims ?? []).length && (
              <tr><td colSpan={7} className="text-center text-muted-foreground px-3 py-8">No claims to review.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {openId && <ClaimReviewSheet claimId={openId} onClose={() => { setOpenId(null); qc.invalidateQueries({ queryKey: ["ins-claims"] }); qc.invalidateQueries({ queryKey: ["ins-kpis"] }); }} />}
    </div>
  );
}

function ClaimReviewSheet({ claimId, onClose }: { claimId: string; onClose: () => void }) {
  const timelineFn = useServerFn(getClaimTimeline);
  const moderateFn = useServerFn(moderateClaim);
  const { data } = useQuery({ queryKey: ["ins-claim", claimId], queryFn: () => timelineFn({ data: { claim_id: claimId } }) });
  const [approved, setApproved] = useState<string>("");
  const [reason, setReason] = useState("");
  const mut = useMutation({
    mutationFn: async (decision: "under_review"|"approved"|"rejected"|"paid") =>
      moderateFn({ data: {
        id: claimId, decision,
        approved_payout_cents: decision === "approved" && approved ? Math.round(Number(approved) * 100) : undefined,
        decision_reason: reason || undefined,
      } }),
    onSuccess: (_r, decision) => { toast.success(`Claim ${decision}`); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const claim = data?.claim;
  const cur = (claim?.currency as string) ?? "USD";

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle>Claim review</SheetTitle></SheetHeader>
        {!claim ? (
          <div className="text-sm text-muted-foreground py-8">Loading…</div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Type</div><div className="font-medium">{claim.claim_type}</div></div>
              <div><div className="text-xs text-muted-foreground">Status</div><StatusBadge status={CLAIM_STATUS_TONE[claim.status] ?? "neutral"} label={claim.status} /></div>
              <div><div className="text-xs text-muted-foreground">Loss</div><div className="tabular-nums">{money(claim.loss_amount_cents, cur)}</div></div>
              <div><div className="text-xs text-muted-foreground">Requested</div><div className="tabular-nums">{money(claim.requested_payout_cents, cur)}</div></div>
            </div>
            {claim.narrative && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{claim.narrative}</div>
            )}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Evidence ({data?.attachments.length ?? 0})</div>
              <ul className="text-xs space-y-1">
                {(data?.attachments ?? []).map((a: Record<string, unknown>) => (
                  <li key={a.id as string} className="truncate">{a.file_path as string}</li>
                ))}
                {!data?.attachments.length && <li className="text-muted-foreground">No attachments</li>}
              </ul>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Timeline</div>
              <ol className="space-y-1 text-xs">
                {(data?.events ?? []).map((e: Record<string, unknown>) => (
                  <li key={e.id as string} className="flex justify-between border-l-2 border-emerald-500/40 pl-2">
                    <span>{e.event_type as string}</span>
                    <span className="text-muted-foreground">{new Date(e.created_at as string).toLocaleString()}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-3 rounded-md border p-3">
              <div className="text-sm font-medium">Decision</div>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={`Approved payout (${cur})`} value={approved} onChange={(e) => setApproved(e.target.value)} type="number" min={0} step="0.01" />
              </div>
              <Textarea placeholder="Decision reason (shown to tenant)" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={mut.isPending} onClick={() => mut.mutate("under_review")}>Mark reviewing</Button>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={mut.isPending} onClick={() => mut.mutate("approved")}>Approve</Button>
                <Button size="sm" variant="destructive" disabled={mut.isPending} onClick={() => mut.mutate("rejected")}>Reject</Button>
                <Button size="sm" variant="secondary" disabled={mut.isPending} onClick={() => mut.mutate("paid")}>Mark paid</Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------ Products ------------------------ */
function ProductsTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listProducts);
  const upsert = useServerFn(upsertProduct);
  const del = useServerFn(deleteProduct);
  const carriersFn = useServerFn(listCarriers);
  const { data } = useQuery({ queryKey: ["ins-products"], queryFn: () => listFn() });
  const { data: carriers } = useQuery({ queryKey: ["ins-carriers"], queryFn: () => carriersFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ carrier_id: "", code: "", name: "", coverage_type: "batch", base_premium_bps: "100", deductible_bps: "0", currency: "USD" });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["ins-products"] }); };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{(data?.products ?? []).length} products</div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />New product
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>New insurance product</SheetTitle></SheetHeader>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Select value={form.carrier_id} onValueChange={(v) => setForm({...form, carrier_id: v})}>
              <SelectTrigger><SelectValue placeholder="Carrier" /></SelectTrigger>
              <SelectContent>
                {(carriers?.carriers ?? []).map((c: Record<string, unknown>) => (
                  <SelectItem key={c.id as string} value={c.id as string}>{c.name as string}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.coverage_type} onValueChange={(v) => setForm({...form, coverage_type: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="batch">Batch</SelectItem>
                <SelectItem value="shipment">Shipment</SelectItem>
                <SelectItem value="hardware">Hardware</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Code (e.g. BATCH-STD)" value={form.code} onChange={(e) => setForm({...form, code: e.target.value})} />
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            <Input placeholder="Premium (bps)" type="number" value={form.base_premium_bps} onChange={(e) => setForm({...form, base_premium_bps: e.target.value})} />
            <Input placeholder="Deductible (bps)" type="number" value={form.deductible_bps} onChange={(e) => setForm({...form, deductible_bps: e.target.value})} />
            <Input placeholder="Currency" value={form.currency} onChange={(e) => setForm({...form, currency: e.target.value.toUpperCase().slice(0,3)})} />
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                try {
                  await upsert({ data: {
                    carrier_id: form.carrier_id, code: form.code, name: form.name,
                    coverage_type: form.coverage_type as "batch"|"shipment"|"hardware",
                    base_premium_bps: Number(form.base_premium_bps),
                    deductible_bps: Number(form.deductible_bps),
                    currency: form.currency, active: true,
                  }});
                  toast.success("Product created"); setOpen(false); invalidate();
                } catch (e) { toast.error((e as Error).message); }
              }}
            >Create</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Code</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Name</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Carrier</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Type</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Premium</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Deductible</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.products ?? []).map((p: Record<string, unknown>) => {
              const carrier = p.carrier as Record<string, unknown> | null;
              return (
                <tr key={p.id as string} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 font-mono text-xs">{p.code as string}</td>
                  <td className="px-3 py-2">{p.name as string}</td>
                  <td className="px-3 py-2">{(carrier?.name as string) ?? "—"}</td>
                  <td className="px-3 py-2 uppercase text-[11px]">{p.coverage_type as string}</td>
                  <td className="px-3 py-2 tabular-nums">{Number(p.base_premium_bps)/100}%</td>
                  <td className="px-3 py-2 tabular-nums">{Number(p.deductible_bps)/100}%</td>
                  <td className="px-3 py-2">{p.active ? <StatusBadge status="ok" label="Active" /> : <StatusBadge status="neutral" label="Off" />}</td>
                  <td className="px-3 py-2">
                    <Button size="icon" variant="ghost" onClick={async () => { await del({ data: { id: p.id as string } }); invalidate(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
            {!(data?.products ?? []).length && (
              <tr><td colSpan={8} className="text-center text-muted-foreground px-3 py-8">No products yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------ Carriers ------------------------ */
function CarriersTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCarriers);
  const upsert = useServerFn(upsertCarrier);
  const del = useServerFn(deleteCarrier);
  const { data } = useQuery({ queryKey: ["ins-carriers"], queryFn: () => listFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_email: "", contact_phone: "" });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["ins-carriers"] });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{(data?.carriers ?? []).length} carriers</div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />New carrier
        </Button>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-sm">
          <SheetHeader><SheetTitle>New insurance carrier</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-3">
            <Input placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
            <Input placeholder="Contact email" value={form.contact_email} onChange={(e) => setForm({...form, contact_email: e.target.value})} />
            <Input placeholder="Contact phone" value={form.contact_phone} onChange={(e) => setForm({...form, contact_phone: e.target.value})} />
          </div>
          <SheetFooter className="mt-6">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={async () => {
                try {
                  await upsert({ data: {
                    name: form.name,
                    contact_email: form.contact_email || null,
                    contact_phone: form.contact_phone || null,
                    api_mode: "manual", active: true,
                  }});
                  toast.success("Carrier saved"); setOpen(false); setForm({ name: "", contact_email: "", contact_phone: "" }); invalidate();
                } catch (e) { toast.error((e as Error).message); }
              }}
            >Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="border border-border rounded-md overflow-hidden overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-muted/30">
            <tr>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Name</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Email</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Phone</th>
              <th className="text-left font-medium text-muted-foreground px-3 py-2">Active</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.carriers ?? []).map((c: Record<string, unknown>) => (
              <tr key={c.id as string} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-medium">{c.name as string}</td>
                <td className="px-3 py-2">{(c.contact_email as string) ?? "—"}</td>
                <td className="px-3 py-2">{(c.contact_phone as string) ?? "—"}</td>
                <td className="px-3 py-2">{c.active ? <StatusBadge status="ok" label="Active" /> : <StatusBadge status="neutral" label="Off" />}</td>
                <td className="px-3 py-2">
                  <Button size="icon" variant="ghost" onClick={async () => { await del({ data: { id: c.id as string } }); invalidate(); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {!(data?.carriers ?? []).length && (
              <tr><td colSpan={5} className="text-center text-muted-foreground px-3 py-8">No carriers configured.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
