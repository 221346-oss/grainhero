import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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

export const Route = createFileRoute("/_authenticated/platform/insurance")({
  component: PlatformInsurancePage,
});

function money(cents: number | null | undefined, cur = "USD") {
  const n = Number(cents ?? 0) / 100;
  return `${cur} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

const CLAIM_STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-700",
  under_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  paid: "bg-emerald-600 text-white",
  cancelled: "bg-slate-200 text-slate-600",
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-600" /> Insurance command center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Carriers, products, policies, and claims — all configurable, no hardcoding.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <Card key={t.label} className="hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
                <span>{t.label}</span>
                <t.icon className="h-3.5 w-3.5" />
              </div>
              <div className="text-lg font-bold tabular-nums text-foreground">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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
  if (isLoading || !data) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading analytics…</CardContent></Card>;
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="text-sm font-semibold flex items-center gap-2 mb-3"><BarChart3 className="h-4 w-4 text-emerald-600" /> Monthly trend (12m)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="premium" stroke="#059669" name="Premium" />
                <Line type="monotone" dataKey="payout" stroke="#dc2626" name="Payout" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Carrier performance</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.carriers}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="premium" fill="#059669" name="Premium" />
                <Bar dataKey="payout" fill="#dc2626" name="Payout" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-sm font-semibold mb-2">Product performance</div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Policies</TableHead><TableHead className="text-right">Premium</TableHead><TableHead className="text-right">Claims</TableHead><TableHead className="text-right">Payout</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.products.map((p) => (
                  <TableRow key={p.name} className="hover:bg-emerald-50/30">
                    <TableCell className="text-xs">{p.name}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{p.policies}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{p.premium.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{p.claims}</TableCell>
                    <TableCell className="text-xs text-right tabular-nums">{p.payout.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {!data.products.length && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">No product activity yet.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent></Card>
      </div>
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
    <Card>
      <CardContent className="p-4 space-y-3">
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
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filed</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.claims ?? []).map((c: Record<string, unknown>) => {
                const policy = c.policy as Record<string, unknown> | null;
                const product = policy?.product as Record<string, unknown> | null;
                const cur = (c.currency as string) ?? "USD";
                return (
                  <TableRow key={c.id as string} className="hover:bg-emerald-50/30">
                    <TableCell className="text-xs tabular-nums">{new Date(c.created_at as string).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{(product?.name as string) ?? "—"}</TableCell>
                    <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">{c.claim_type as string}</TableCell>
                    <TableCell className="tabular-nums text-sm">{money(c.requested_payout_cents as number, cur)}</TableCell>
                    <TableCell className="tabular-nums text-sm">{c.approved_payout_cents ? money(c.approved_payout_cents as number, cur) : "—"}</TableCell>
                    <TableCell>
                      <Badge className={CLAIM_STATUS_TONE[c.status as string] ?? ""} variant="secondary">
                        {(c.status as string).replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setOpenId(c.id as string)}>Review</Button></TableCell>
                  </TableRow>
                );
              })}
              {!(data?.claims ?? []).length && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No claims to review.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {openId && <ClaimReviewSheet claimId={openId} onClose={() => { setOpenId(null); qc.invalidateQueries({ queryKey: ["ins-claims"] }); qc.invalidateQueries({ queryKey: ["ins-kpis"] }); }} />}
    </Card>
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
              <div><div className="text-xs text-muted-foreground">Status</div><Badge className={CLAIM_STATUS_TONE[claim.status] ?? ""}>{claim.status}</Badge></div>
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
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{(data?.products ?? []).length} products</div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" />New product</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New insurance product</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-3">
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
              <DialogFooter>
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
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead><TableHead>Name</TableHead><TableHead>Carrier</TableHead>
                <TableHead>Type</TableHead><TableHead>Premium</TableHead><TableHead>Deductible</TableHead>
                <TableHead>Active</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.products ?? []).map((p: Record<string, unknown>) => {
                const carrier = p.carrier as Record<string, unknown> | null;
                return (
                  <TableRow key={p.id as string} className="hover:bg-emerald-50/30">
                    <TableCell className="font-mono text-xs">{p.code as string}</TableCell>
                    <TableCell className="text-sm">{p.name as string}</TableCell>
                    <TableCell className="text-sm">{(carrier?.name as string) ?? "—"}</TableCell>
                    <TableCell className="text-xs uppercase">{p.coverage_type as string}</TableCell>
                    <TableCell className="tabular-nums">{Number(p.base_premium_bps)/100}%</TableCell>
                    <TableCell className="tabular-nums">{Number(p.deductible_bps)/100}%</TableCell>
                    <TableCell>{p.active ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge> : <Badge variant="secondary">Off</Badge>}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={async () => { await del({ data: { id: p.id as string } }); invalidate(); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!(data?.products ?? []).length && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No products yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
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
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">{(data?.carriers ?? []).length} carriers</div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"><Plus className="h-4 w-4 mr-1" />New carrier</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New insurance carrier</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                <Input placeholder="Contact email" value={form.contact_email} onChange={(e) => setForm({...form, contact_email: e.target.value})} />
                <Input placeholder="Contact phone" value={form.contact_phone} onChange={(e) => setForm({...form, contact_phone: e.target.value})} />
              </div>
              <DialogFooter>
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
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.carriers ?? []).map((c: Record<string, unknown>) => (
                <TableRow key={c.id as string} className="hover:bg-emerald-50/30">
                  <TableCell className="font-medium">{c.name as string}</TableCell>
                  <TableCell className="text-sm">{(c.contact_email as string) ?? "—"}</TableCell>
                  <TableCell className="text-sm">{(c.contact_phone as string) ?? "—"}</TableCell>
                  <TableCell>{c.active ? <Badge className="bg-emerald-100 text-emerald-700">Active</Badge> : <Badge variant="secondary">Off</Badge>}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={async () => { await del({ data: { id: c.id as string } }); invalidate(); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!(data?.carriers ?? []).length && (
                <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No carriers configured.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}