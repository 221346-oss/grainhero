import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Mail, Phone, Building2, Pencil, MoreVertical, LogIn, Ban, CheckCircle2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { getAdminProfile, updateAdminContact, setAdminSuspended, getAdminOrderFrequency } from "@/lib/admin-profile.functions";
import { startImpersonation } from "@/lib/impersonation.functions";
import { AdminProfileSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/admins/$adminId")({
  component: AdminProfilePage,
});

function money(n: number) { return `PKR ${Number(n ?? 0).toLocaleString()}`; }
function initials(name: string | null, email: string | null) {
  const s = (name || email || "?").trim();
  return s.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function AdminProfilePage() {
  const { adminId } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const getProfile = useServerFn(getAdminProfile);
  const getFreq = useServerFn(getAdminOrderFrequency);
  const updateFn = useServerFn(updateAdminContact);
  const suspendFn = useServerFn(setAdminSuspended);
  const impersonateFn = useServerFn(startImpersonation);

  const [source, setSource] = useState<"batches" | "orders">("batches");
  const [editOpen, setEditOpen] = useState(false);

  const profileQ = useQuery({ queryKey: ["admin-profile", adminId], queryFn: () => getProfile({ data: { adminId } }) });
  const freqQ = useQuery({ queryKey: ["admin-frequency", adminId, source], queryFn: () => getFreq({ data: { adminId, source } }) });

  const updateM = useMutation({
    mutationFn: (patch: { name?: string; phone?: string; notes?: string }) => updateFn({ data: { adminId, patch } }),
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["admin-profile", adminId] }); setEditOpen(false); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const suspendM = useMutation({
    mutationFn: (suspended: boolean) => suspendFn({ data: { adminId, suspended } }),
    onSuccess: (r: any) => { toast.success(r.suspended ? "Admin suspended" : "Admin reactivated"); qc.invalidateQueries({ queryKey: ["admin-profile", adminId] }); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });
  const impersonateM = useMutation({
    mutationFn: () => impersonateFn({ data: { adminId } }),
    onSuccess: (r: any) => {
      try {
        window.sessionStorage.setItem("impersonation", JSON.stringify({ adminId: r.adminId, adminName: r.adminName, adminEmail: r.adminEmail, businessType: r.businessType, startedAt: Date.now() }));
      } catch { /* noop */ }
      toast.success(`Impersonating ${r.adminName}`);
      nav({ to: "/dashboard" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (profileQ.isLoading) return <AdminProfileSkeleton />;
  const d = profileQ.data;
  if (!d || !d.profile) return <div className="p-8 text-sm text-muted-foreground">Admin not found.</div>;
  const p = d.profile as any;
  const stats = d.stats;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <Link to="/platform/tenants" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to tenants
      </Link>

      {/* Header card */}
      <Card>
        <CardContent className="p-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Avatar className="h-16 w-16 bg-primary/10 text-primary">
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">{initials(p.name, p.email)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{p.name ?? "Unnamed admin"}</h1>
            <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap mt-1">
              <span className="inline-flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {p.email ?? "—"}</span>
              <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {p.phone ?? "—"}</span>
              {p.business_type && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> {p.business_type}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {p.suspended ? (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 border-transparent">Suspended</Badge>
            ) : (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-transparent">Active</Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => impersonateM.mutate()} disabled={impersonateM.isPending}>
                  <LogIn className="h-4 w-4 mr-2" /> Impersonate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {p.suspended ? (
                  <DropdownMenuItem onClick={() => suspendM.mutate(false)}>
                    <CheckCircle2 className="h-4 w-4 mr-2" /> Reactivate
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => suspendM.mutate(true)}>
                    <Ban className="h-4 w-4 mr-2" /> Suspend
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiTile label="Total revenue" value={money(stats.totalRevenue)} accent="text-primary" />
        <KpiTile label="Silos" value={stats.silos} />
        <KpiTile label="Warehouses" value={stats.warehouses} />
        <KpiTile label="Batches" value={stats.batches} />
        <KpiTile label="Open alerts" value={stats.openAlerts} accent={stats.openAlerts > 0 ? "text-red-600 dark:text-red-400" : undefined} />
        <KpiTile label="Team size" value={stats.teamSize} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact + plan */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">Contact & plan</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Email" value={p.email} />
            <Row label="Phone" value={p.phone} />
            <Row label="Business type" value={p.business_type} />
            <Row label="Joined" value={p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"} />
            <div className="pt-3 mt-3 border-t border-border">
              <Row label="Plan" value={stats.currentPlan ?? "No plan"} />
              <Row label="Plan status" value={stats.planStatus ?? "—"} />
              <Row label="Monthly" value={money(stats.monthlyPrice)} />
            </div>
            {p.notes && (
              <div className="pt-3 mt-3 border-t border-border">
                <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Notes</div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{p.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Frequency chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Order frequency</CardTitle>
            <Tabs value={source} onValueChange={(v) => setSource(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="batches" className="text-xs px-3">Batches</TabsTrigger>
                <TabsTrigger value="orders" className="text-xs px-3">Hardware</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freqQ.data ?? []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis allowDecimals={false} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-xs text-muted-foreground mt-2">Last 6 months of {source === "batches" ? "grain batches" : "hardware orders"} created by this admin.</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Recent activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          {d.recentActivity.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No recent activity.</div>
          ) : (
            <ul className="divide-y divide-border">
              {d.recentActivity.map((a: any) => (
                <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{a.action}</div>
                    <div className="text-xs text-muted-foreground">{a.entity_type}{a.entity_name ? ` · ${a.entity_name}` : ""}</div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit admin contact</DialogTitle></DialogHeader>
          <EditForm profile={p} onSubmit={(patch) => updateM.mutate(patch)} pending={updateM.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiTile({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
        <div className={`text-xl font-bold mt-1 ${accent ?? "text-foreground"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right truncate max-w-[60%]">{value || "—"}</span>
    </div>
  );
}

function EditForm({ profile, onSubmit, pending }: { profile: any; onSubmit: (p: { name?: string; phone?: string; notes?: string }) => void; pending: boolean }) {
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [notes, setNotes] = useState(profile.notes ?? "");
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); onSubmit({ name, phone, notes }); }}>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Phone</label>
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground">Internal notes</label>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Only super admins see this." />
      </div>
      <DialogFooter>
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
      </DialogFooter>
    </form>
  );
}
