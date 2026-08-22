import { DashboardSkeleton } from "@/components/app/skeletons";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Shield, Plus, Edit2, Trash2, DollarSign, FileText, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboards/_shared";
import {
  listPolicies, upsertPolicy, deletePolicy,
  listClaims, upsertClaim, deleteClaim,
  type InsurancePolicyRow, type InsuranceClaimRow,
} from "@/lib/team-settings-insurance.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { PlatformOverviewTable } from "@/components/app/PlatformOverviewTable";
import { getPlatformInsuranceOverview } from "@/lib/platform-overviews.functions";

const POLICY_STATUS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  expired: "bg-slate-100 text-slate-700 border-slate-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};
const CLAIM_STATUS: Record<string, string> = {
  filed: "bg-blue-100 text-blue-700 border-blue-200",
  investigating: "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  paid: "bg-purple-100 text-purple-700 border-purple-200",
};

type PolicyForm = {
  id?: string; policy_number: string; provider_name: string; coverage_type: string;
  coverage_amount: string; premium_amount: string; deductible: string; status: string;
  start_date: string; end_date: string; renewal_date: string; notes: string;
};
const emptyPolicy: PolicyForm = {
  policy_number: "", provider_name: "", coverage_type: "comprehensive",
  coverage_amount: "0", premium_amount: "0", deductible: "0", status: "active",
  start_date: "", end_date: "", renewal_date: "", notes: "",
};

type ClaimForm = {
  id?: string; claim_number: string; policy_id: string; claim_type: string;
  description: string; amount_claimed: string; amount_approved: string; status: string;
  incident_date: string; notes: string;
};
const emptyClaim: ClaimForm = {
  claim_number: "", policy_id: "", claim_type: "spoilage",
  description: "", amount_claimed: "0", amount_approved: "0", status: "filed",
  incident_date: "", notes: "",
};

export function InsuranceSection() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const listPoliciesFn = useServerFn(listPolicies);
  const savePolicyFn = useServerFn(upsertPolicy);
  const delPolicyFn = useServerFn(deletePolicy);
  const listClaimsFn = useServerFn(listClaims);
  const saveClaimFn = useServerFn(upsertClaim);
  const delClaimFn = useServerFn(deleteClaim);

  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["insurance-policies"], queryFn: () => listPoliciesFn() as Promise<InsurancePolicyRow[]>,
  });
  const { data: claims = [], isLoading: claimsLoading } = useQuery({
    queryKey: ["insurance-claims"], queryFn: () => listClaimsFn() as Promise<InsuranceClaimRow[]>,
  });

  const fetchPlatformIns = useServerFn(getPlatformInsuranceOverview);
  const platformInsQ = useQuery({
    queryKey: ["platform-insurance-overview"],
    queryFn: () => fetchPlatformIns(),
    enabled: isSuperAdmin,
  });

  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyForm, setPolicyForm] = useState<PolicyForm>(emptyPolicy);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimForm, setClaimForm] = useState<ClaimForm>(emptyClaim);
  const [deletePolicyId, setDeletePolicyId] = useState<string | null>(null);
  const [deleteClaimId, setDeleteClaimId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const active = policies.filter((p) => p.status === "active").length;
    const totalCoverage = policies.reduce((s, p) => s + (p.coverage_amount ?? 0), 0);
    const openClaims = claims.filter((c) => c.status !== "paid" && c.status !== "rejected").length;
    const totalClaimed = claims.reduce((s, c) => s + (c.amount_claimed ?? 0), 0);
    return { active, totalCoverage, openClaims, totalClaimed };
  }, [policies, claims]);

  const savePolicy = useMutation({
    mutationFn: (v: PolicyForm) => savePolicyFn({ data: {
      id: v.id, policy_number: v.policy_number, provider_name: v.provider_name, coverage_type: v.coverage_type,
      coverage_amount: Number(v.coverage_amount), premium_amount: Number(v.premium_amount), deductible: Number(v.deductible),
      status: v.status, start_date: v.start_date || null, end_date: v.end_date || null, renewal_date: v.renewal_date || null,
      notes: v.notes || null,
    } }),
    onSuccess: () => { toast.success("Policy saved"); setPolicyOpen(false); setPolicyForm(emptyPolicy); qc.invalidateQueries({ queryKey: ["insurance-policies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removePolicy = useMutation({
    mutationFn: (id: string) => delPolicyFn({ data: { id } }),
    onSuccess: () => { toast.success("Policy deleted"); setDeletePolicyId(null); qc.invalidateQueries({ queryKey: ["insurance-policies"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveClaim = useMutation({
    mutationFn: (v: ClaimForm) => saveClaimFn({ data: {
      id: v.id, claim_number: v.claim_number, policy_id: v.policy_id || null, claim_type: v.claim_type,
      description: v.description || null, amount_claimed: Number(v.amount_claimed), amount_approved: Number(v.amount_approved),
      status: v.status, incident_date: v.incident_date || null, notes: v.notes || null,
    } }),
    onSuccess: () => { toast.success("Claim saved"); setClaimOpen(false); setClaimForm(emptyClaim); qc.invalidateQueries({ queryKey: ["insurance-claims"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeClaim = useMutation({
    mutationFn: (id: string) => delClaimFn({ data: { id } }),
    onSuccess: () => { toast.success("Claim deleted"); setDeleteClaimId(null); qc.invalidateQueries({ queryKey: ["insurance-claims"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEditPolicy = (p: InsurancePolicyRow) => {
    setPolicyForm({
      id: p.id, policy_number: p.policy_number, provider_name: p.provider_name, coverage_type: p.coverage_type,
      coverage_amount: String(p.coverage_amount), premium_amount: String(p.premium_amount), deductible: String(p.deductible),
      status: p.status, start_date: p.start_date ?? "", end_date: p.end_date ?? "", renewal_date: p.renewal_date ?? "",
      notes: p.notes ?? "",
    });
    setPolicyOpen(true);
  };
  const openEditClaim = (c: InsuranceClaimRow) => {
    setClaimForm({
      id: c.id, claim_number: c.claim_number, policy_id: c.policy_id ?? "", claim_type: c.claim_type,
      description: c.description ?? "", amount_claimed: String(c.amount_claimed), amount_approved: String(c.amount_approved),
      status: c.status, incident_date: c.incident_date ?? "", notes: c.notes ?? "",
    });
    setClaimOpen(true);
  };

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <PlatformScopeBanner label="Policies and claims across every tenant. Totals reflect all insured value on the platform." />
      )}
      {isSuperAdmin && platformInsQ.data && (
        <PlatformOverviewTable
          title="Per-tenant insurance"
          description={`Total coverage $${platformInsQ.data.totals.coverage.toLocaleString()} · ${platformInsQ.data.totals.openClaims} open claims`}
          rows={platformInsQ.data.rows}
          columns={[
            { key: "activePolicies", label: "Active", align: "right", render: (r) => `${r.activePolicies}/${r.policies}` },
            { key: "coverage", label: "Coverage", align: "right", render: (r) => `$${r.coverage.toLocaleString()}` },
            { key: "premium", label: "Premium", align: "right", render: (r) => `$${r.premium.toLocaleString()}` },
            { key: "openClaims", label: "Open claims", align: "right", render: (r) => (
                <span className={r.openClaims > 0 ? "text-amber-700 font-medium" : ""}>{r.openClaims}</span>
              ) },
            { key: "claimRate", label: "Claim rate", align: "right", render: (r) => `${(r.claimRate * 100).toFixed(0)}%` },
          ]}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Active Policies" value={stats.active} icon={Shield} accent="emerald" />
        <StatCard label="Total Coverage" value={`PKR ${stats.totalCoverage.toLocaleString()}`} icon={DollarSign} accent="sky" />
        <StatCard label="Open Claims" value={stats.openClaims} icon={AlertTriangle} accent="amber" />
        <StatCard label="Claimed Amount" value={`PKR ${stats.totalClaimed.toLocaleString()}`} icon={FileText} accent="violet" />
      </div>

      <Tabs defaultValue="policies">
        <TabsList className="mb-4">
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="policies">
          <div className="flex justify-end mb-3">
            <Button onClick={() => { setPolicyForm(emptyPolicy); setPolicyOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> New policy
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {policiesLoading ? (
                <DashboardSkeleton />
              ) : policies.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">No policies yet</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {policies.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground">{p.policy_number}</div>
                        <div className="text-xs text-muted-foreground">{p.provider_name} · {p.coverage_type}</div>
                      </div>
                      <div className="text-sm text-foreground">
                        <span className="text-muted-foreground">Coverage: </span>${(p.coverage_amount ?? 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-foreground">
                        <span className="text-muted-foreground">Premium: </span>${(p.premium_amount ?? 0).toLocaleString()}
                      </div>
                      <Badge className={POLICY_STATUS[p.status] ?? POLICY_STATUS.pending} variant="outline">{p.status}</Badge>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditPolicy(p)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeletePolicyId(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims">
          <div className="flex justify-end mb-3">
            <Button onClick={() => { setClaimForm(emptyClaim); setClaimOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-2" /> New claim
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {claimsLoading ? (
                <DashboardSkeleton />
              ) : claims.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">No claims yet</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {claims.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/20">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground">{c.claim_number}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.claim_type} · {c.description ?? "—"}</div>
                      </div>
                      <div className="text-sm text-foreground"><span className="text-muted-foreground">Claimed: </span>${(c.amount_claimed ?? 0).toLocaleString()}</div>
                      <div className="text-sm text-foreground"><span className="text-muted-foreground">Approved: </span>${(c.amount_approved ?? 0).toLocaleString()}</div>
                      <Badge className={CLAIM_STATUS[c.status] ?? CLAIM_STATUS.filed} variant="outline">{c.status}</Badge>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditClaim(c)}><Edit2 className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setDeleteClaimId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Policy dialog */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{policyForm.id ? "Edit policy" : "New policy"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Policy Number</Label><Input value={policyForm.policy_number} onChange={(e) => setPolicyForm({ ...policyForm, policy_number: e.target.value })} /></div>
            <div><Label>Provider</Label><Input value={policyForm.provider_name} onChange={(e) => setPolicyForm({ ...policyForm, provider_name: e.target.value })} /></div>
            <div>
              <Label>Coverage Type</Label>
              <Select value={policyForm.coverage_type} onValueChange={(v) => setPolicyForm({ ...policyForm, coverage_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="spoilage">Spoilage</SelectItem>
                  <SelectItem value="weather">Weather</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={policyForm.status} onValueChange={(v) => setPolicyForm({ ...policyForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Coverage Amount ($)</Label><Input type="number" value={policyForm.coverage_amount} onChange={(e) => setPolicyForm({ ...policyForm, coverage_amount: e.target.value })} /></div>
            <div><Label>Premium ($)</Label><Input type="number" value={policyForm.premium_amount} onChange={(e) => setPolicyForm({ ...policyForm, premium_amount: e.target.value })} /></div>
            <div><Label>Deductible ($)</Label><Input type="number" value={policyForm.deductible} onChange={(e) => setPolicyForm({ ...policyForm, deductible: e.target.value })} /></div>
            <div><Label>Start Date</Label><Input type="date" value={policyForm.start_date} onChange={(e) => setPolicyForm({ ...policyForm, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={policyForm.end_date} onChange={(e) => setPolicyForm({ ...policyForm, end_date: e.target.value })} /></div>
            <div><Label>Renewal Date</Label><Input type="date" value={policyForm.renewal_date} onChange={(e) => setPolicyForm({ ...policyForm, renewal_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea value={policyForm.notes} onChange={(e) => setPolicyForm({ ...policyForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyOpen(false)}>Cancel</Button>
            <Button onClick={() => savePolicy.mutate(policyForm)} disabled={savePolicy.isPending || !policyForm.provider_name} className="bg-emerald-600 hover:bg-emerald-700">
              {savePolicy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><CheckCircle className="h-4 w-4 mr-2" />Save</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Claim dialog */}
      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{claimForm.id ? "Edit claim" : "New claim"}</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Claim Number</Label><Input value={claimForm.claim_number} onChange={(e) => setClaimForm({ ...claimForm, claim_number: e.target.value })} /></div>
            <div>
              <Label>Policy</Label>
              <Select value={claimForm.policy_id} onValueChange={(v) => setClaimForm({ ...claimForm, policy_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select policy" /></SelectTrigger>
                <SelectContent>
                  {policies.map((p) => <SelectItem key={p.id} value={p.id}>{p.policy_number} · {p.provider_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Claim Type</Label>
              <Select value={claimForm.claim_type} onValueChange={(v) => setClaimForm({ ...claimForm, claim_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="spoilage">Spoilage</SelectItem>
                  <SelectItem value="fire">Fire</SelectItem>
                  <SelectItem value="theft">Theft</SelectItem>
                  <SelectItem value="weather">Weather</SelectItem>
                  <SelectItem value="pest">Pest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={claimForm.status} onValueChange={(v) => setClaimForm({ ...claimForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="filed">Filed</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount Claimed ($)</Label><Input type="number" value={claimForm.amount_claimed} onChange={(e) => setClaimForm({ ...claimForm, amount_claimed: e.target.value })} /></div>
            <div><Label>Amount Approved ($)</Label><Input type="number" value={claimForm.amount_approved} onChange={(e) => setClaimForm({ ...claimForm, amount_approved: e.target.value })} /></div>
            <div><Label>Incident Date</Label><Input type="date" value={claimForm.incident_date} onChange={(e) => setClaimForm({ ...claimForm, incident_date: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Description</Label><Textarea value={claimForm.description} onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea value={claimForm.notes} onChange={(e) => setClaimForm({ ...claimForm, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button onClick={() => saveClaim.mutate(claimForm)} disabled={saveClaim.isPending || !claimForm.claim_number} className="bg-emerald-600 hover:bg-emerald-700">
              {saveClaim.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><CheckCircle className="h-4 w-4 mr-2" />Save</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePolicyId} onOpenChange={(o) => !o && setDeletePolicyId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete policy?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deletePolicyId && removePolicy.mutate(deletePolicyId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteClaimId} onOpenChange={(o) => !o && setDeleteClaimId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete claim?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteClaimId && removeClaim.mutate(deleteClaimId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
