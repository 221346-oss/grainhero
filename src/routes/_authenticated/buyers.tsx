import { ListSkeleton } from "@/components/app/skeletons";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users, Plus, Search, Edit2, Trash2, Eye, Loader2, Inbox, Mail, Phone,
  MapPin, Building2, Star, Wheat, CheckCircle, PauseCircle, XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/dashboards/_shared";
import { listBuyers, upsertBuyer, deleteBuyer } from "@/lib/operations.functions";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { PlatformScopeBanner } from "@/components/app/PlatformScopeBanner";
import { PlatformOverviewTable } from "@/components/app/PlatformOverviewTable";
import { getPlatformBuyersOverview } from "@/lib/platform-overviews.functions";

export const Route = createFileRoute("/_authenticated/buyers")({
  component: BuyersPage,
});

const BUYER_TYPES = ["local_mill","exporter","wholesaler","retailer","government"] as const;
const GRAIN_TYPES = ["Wheat","Rice","Maize","Corn","Barley","Sorghum"] as const;
type BuyerType = typeof BUYER_TYPES[number];
type GrainType = typeof GRAIN_TYPES[number];
type Status = "active" | "paused" | "inactive";

type Buyer = {
  id: string; name: string; contact_name: string;
  contact_email: string | null; contact_phone: string | null; contact_designation: string | null;
  company_name: string | null; buyer_type: BuyerType | null; status: Status | null;
  address: string | null; city: string | null; state: string | null; country: string | null;
  preferred_grain_types: GrainType[] | null; preferred_payment_terms: string | null;
  rating: number | null; tags: string[] | null; notes: string | null;
  last_order_at: string | null; last_interaction_at: string | null;
  created_at: string | null;
};

type Form = {
  id?: string;
  name: string; contact_name: string; contact_email: string; contact_phone: string;
  contact_designation: string; company_name: string;
  buyer_type: BuyerType | ""; status: Status;
  address: string; city: string; state: string; country: string;
  preferred_grain_types: GrainType[];
  preferred_payment_terms: string;
  rating: string; tags: string; notes: string;
};

const empty: Form = {
  name: "", contact_name: "", contact_email: "", contact_phone: "",
  contact_designation: "", company_name: "",
  buyer_type: "", status: "active",
  address: "", city: "", state: "", country: "",
  preferred_grain_types: [], preferred_payment_terms: "",
  rating: "", tags: "", notes: "",
};

const STATUS_ICON: Record<Status, React.ComponentType<{ className?: string }>> = {
  active: CheckCircle, paused: PauseCircle, inactive: XCircle,
};
const STATUS_CLASS: Record<Status, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  paused: "bg-amber-100 text-amber-800 border-amber-200",
  inactive: "bg-slate-100 text-slate-700 border-slate-200",
};

function BuyersPage() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const listFn = useServerFn(listBuyers);
  const saveFn = useServerFn(upsertBuyer);
  const delFn = useServerFn(deleteBuyer);

  const { data: buyers = [], isLoading } = useQuery({
    queryKey: ["buyers"],
    queryFn: () => listFn() as Promise<Buyer[]>,
  });

  const fetchPlatformBuyers = useServerFn(getPlatformBuyersOverview);
  const platformBuyersQ = useQuery({
    queryKey: ["platform-buyers-overview"],
    queryFn: () => fetchPlatformBuyers(),
    enabled: isSuperAdmin,
  });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [viewing, setViewing] = useState<Buyer | null>(null);
  const [toDelete, setToDelete] = useState<Buyer | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return buyers.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (typeFilter !== "all" && b.buyer_type !== typeFilter) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.contact_name.toLowerCase().includes(q) ||
        (b.company_name ?? "").toLowerCase().includes(q) ||
        (b.contact_email ?? "").toLowerCase().includes(q) ||
        (b.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [buyers, query, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const total = buyers.length;
    const active = buyers.filter((b) => b.status === "active").length;
    const paused = buyers.filter((b) => b.status === "paused").length;
    const avgRating = (() => {
      const rs = buyers.filter((b) => typeof b.rating === "number").map((b) => b.rating!);
      if (!rs.length) return 0;
      return Math.round((rs.reduce((s, v) => s + v, 0) / rs.length) * 10) / 10;
    })();
    return { total, active, paused, avgRating };
  }, [buyers]);

  const save = useMutation({
    mutationFn: (p: unknown) => saveFn({ data: p } as never),
    onSuccess: () => {
      toast.success("Buyer saved");
      qc.invalidateQueries({ queryKey: ["buyers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setDlgOpen(false); setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } } as never),
    onSuccess: () => {
      toast.success("Buyer deleted");
      qc.invalidateQueries({ queryKey: ["buyers"] });
      setToDelete(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openCreate = () => { setForm(empty); setDlgOpen(true); };
  const openEdit = (b: Buyer) => {
    setForm({
      id: b.id, name: b.name, contact_name: b.contact_name,
      contact_email: b.contact_email ?? "", contact_phone: b.contact_phone ?? "",
      contact_designation: b.contact_designation ?? "",
      company_name: b.company_name ?? "",
      buyer_type: (b.buyer_type ?? "") as BuyerType | "",
      status: (b.status ?? "active") as Status,
      address: b.address ?? "", city: b.city ?? "", state: b.state ?? "", country: b.country ?? "",
      preferred_grain_types: (b.preferred_grain_types ?? []) as GrainType[],
      preferred_payment_terms: b.preferred_payment_terms ?? "",
      rating: b.rating != null ? String(b.rating) : "",
      tags: (b.tags ?? []).join(", "), notes: b.notes ?? "",
    });
    setDlgOpen(true);
  };

  const submit = () => {
    const missing = [!form.name && "buyer name", !form.contact_name && "contact name"].filter(Boolean);
    if (missing.length) { toast.error(`Missing: ${missing.join(", ")}`); return; }
    save.mutate({
      id: form.id,
      name: form.name.trim(), contact_name: form.contact_name.trim(),
      contact_email: form.contact_email.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      contact_designation: form.contact_designation.trim() || null,
      company_name: form.company_name.trim() || null,
      buyer_type: form.buyer_type || null,
      status: form.status,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      country: form.country.trim() || null,
      preferred_grain_types: form.preferred_grain_types.length ? form.preferred_grain_types : null,
      preferred_payment_terms: form.preferred_payment_terms.trim() || null,
      rating: form.rating ? Number(form.rating) : null,
      tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : null,
      notes: form.notes.trim() || null,
    });
  };

  const toggleGrain = (g: GrainType) => {
    setForm((f) => ({
      ...f,
      preferred_grain_types: f.preferred_grain_types.includes(g)
        ? f.preferred_grain_types.filter((x) => x !== g)
        : [...f.preferred_grain_types, g],
    }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 md:space-y-6">
      {isSuperAdmin && (
        <PlatformScopeBanner label="Buyers across every tenant. New Buyer and edit actions still apply to your own tenant." />
      )}
      {isSuperAdmin && platformBuyersQ.data && (
        <PlatformOverviewTable
          title="Per-tenant buyer activity"
          description={`${platformBuyersQ.data.totals.buyers} buyers · ${platformBuyersQ.data.totals.invoices} invoices · $${platformBuyersQ.data.totals.revenue.toLocaleString()} invoiced`}
          rows={platformBuyersQ.data.rows}
          columns={[
            { key: "active", label: "Active", align: "right", render: (r) => `${r.active}/${r.buyers}` },
            { key: "avgRating", label: "Rating", align: "right", render: (r) => r.avgRating > 0 ? r.avgRating.toFixed(1) : "—" },
            { key: "invoices", label: "Invoices", align: "right", render: (r) => r.invoices },
            { key: "revenue", label: "Revenue", align: "right", render: (r) => `$${r.revenue.toLocaleString()}` },
            { key: "outstanding", label: "Outstanding", align: "right", render: (r) => (
                <span className={r.outstanding > 0 ? "text-amber-700 font-medium" : ""}>${r.outstanding.toLocaleString()}</span>
              ) },
          ]}
        />
      )}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <PageHeader title="Buyers" subtitle="Customers purchasing your grain — contacts, ratings & preferences" />
        <Button size="sm" onClick={openCreate} className="gap-1.5 self-start md:self-auto">
          <Plus className="h-4 w-4" /> New Buyer
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard tone="indigo" label="Total Buyers" value={stats.total} icon={<Users className="h-4 w-4" />} />
        <StatCard tone="emerald" label="Active" value={stats.active} icon={<CheckCircle className="h-4 w-4" />} />
        <StatCard tone="amber" label="Paused" value={stats.paused} icon={<PauseCircle className="h-4 w-4" />} />
        <StatCard tone="blue" label="Avg Rating" value={stats.avgRating} icon={<Star className="h-4 w-4" />} suffix="/5" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, company, email, city" className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {BUYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Inbox className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <div className="font-medium">No buyers found</div>
          <div className="text-sm">Add your first buyer to start tracking sales.</div>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b) => {
            const SIcon = STATUS_ICON[(b.status ?? "active") as Status];
            return (
              <Card key={b.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{b.name}</h3>
                      {b.company_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Building2 className="h-3 w-3 flex-shrink-0" /> {b.company_name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={STATUS_CLASS[(b.status ?? "active") as Status]}>
                      <SIcon className="h-3 w-3 mr-1" /> {b.status ?? "active"}
                    </Badge>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{b.contact_name}{b.contact_designation ? ` · ${b.contact_designation}` : ""}</span>
                    </div>
                    {b.contact_email && (
                      <a href={`mailto:${b.contact_email}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground truncate">
                        <Mail className="h-3 w-3 flex-shrink-0" /> {b.contact_email}
                      </a>
                    )}
                    {b.contact_phone && (
                      <a href={`tel:${b.contact_phone}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                        <Phone className="h-3 w-3 flex-shrink-0" /> {b.contact_phone}
                      </a>
                    )}
                    {(b.city || b.country) && (
                      <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" /> {[b.city, b.state, b.country].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {b.buyer_type && <Badge variant="secondary" className="text-[10px]">{b.buyer_type.replace("_", " ")}</Badge>}
                    {b.rating != null && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {b.rating}
                      </Badge>
                    )}
                    {(b.preferred_grain_types ?? []).slice(0, 3).map((g) => (
                      <Badge key={g} variant="outline" className="text-[10px] gap-1">
                        <Wheat className="h-3 w-3" /> {g}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-1 pt-1 border-t">
                    <Button size="sm" variant="ghost" className="flex-1 gap-1.5" onClick={() => setViewing(b)}>
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 gap-1.5" onClick={() => openEdit(b)}>
                      <Edit2 className="h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setToDelete(b)}>
                      <Trash2 className="h-3 w-3 text-rose-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Buyer" : "New Buyer"}</DialogTitle>
            <DialogDescription>Track a customer who buys your grain.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Buyer name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Acme Mills" /></div>
            <div><Label>Company</Label><Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} /></div>
            <div><Label>Contact name *</Label><Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Full name" /></div>
            <div><Label>Designation</Label><Input value={form.contact_designation} onChange={(e) => setForm({ ...form, contact_designation: e.target.value })} placeholder="Procurement Manager" /></div>
            <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="contact@example.com" /></div>
            <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="+91 …" /></div>
            <div>
              <Label>Buyer Type</Label>
              <Select value={form.buyer_type || "none"} onValueChange={(v) => setForm({ ...form, buyer_type: v === "none" ? "" : v as BuyerType })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {BUYER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: Status) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></div>
            <div><Label>Country</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div><Label>Payment Terms</Label><Input value={form.preferred_payment_terms} onChange={(e) => setForm({ ...form, preferred_payment_terms: e.target.value })} placeholder="Net 30" /></div>
            <div className="sm:col-span-2">
              <Label className="mb-1 block">Preferred Grains</Label>
              <div className="flex flex-wrap gap-1.5">
                {GRAIN_TYPES.map((g) => {
                  const on = form.preferred_grain_types.includes(g);
                  return (
                    <button key={g} type="button" onClick={() => toggleGrain(g)}
                      className={`text-xs px-2 py-1 rounded border transition-colors ${on ? "bg-emerald-600 text-white border-emerald-600" : "border-input hover:bg-muted"}`}>
                      {g}
                    </button>
                  );
                })}
              </div>
            </div>
            <div><Label>Rating (0-5)</Label><Input type="number" step="0.1" min={0} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} /></div>
            <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
              {(!form.name || !form.contact_name) && (
                <span className="text-[11px] text-muted-foreground">
                  Missing: {[!form.name && "buyer name", !form.contact_name && "contact name"].filter(Boolean).join(", ")}
                </span>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDlgOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={save.isPending || !form.name || !form.contact_name}>
                  {save.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> {viewing.name}
                </DialogTitle>
                <DialogDescription>{viewing.company_name ?? "—"}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <Row label="Contact" val={`${viewing.contact_name}${viewing.contact_designation ? ` · ${viewing.contact_designation}` : ""}`} />
                <Row label="Email" val={viewing.contact_email ?? "—"} />
                <Row label="Phone" val={viewing.contact_phone ?? "—"} />
                <Row label="Type" val={viewing.buyer_type ?? "—"} />
                <Row label="Status" val={viewing.status ?? "—"} />
                <Row label="Address" val={[viewing.address, viewing.city, viewing.state, viewing.country].filter(Boolean).join(", ") || "—"} />
                <Row label="Preferred grains" val={(viewing.preferred_grain_types ?? []).join(", ") || "—"} />
                <Row label="Payment terms" val={viewing.preferred_payment_terms ?? "—"} />
                <Row label="Rating" val={viewing.rating != null ? `${viewing.rating}/5` : "—"} />
                <Row label="Last order" val={viewing.last_order_at ? new Date(viewing.last_order_at).toLocaleDateString() : "—"} />
                <Row label="Last contact" val={viewing.last_interaction_at ? new Date(viewing.last_interaction_at).toLocaleDateString() : "—"} />
                <Row label="Since" val={viewing.created_at ? new Date(viewing.created_at).toLocaleDateString() : "—"} />
                {viewing.tags && viewing.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {viewing.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                  </div>
                )}
                {viewing.notes && <p className="text-xs text-muted-foreground pt-2 border-t">{viewing.notes}</p>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete buyer?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently removes <strong>{toDelete?.name}</strong> and their contact info. Existing invoices remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && remove.mutate(toDelete.id)} className="bg-rose-600 hover:bg-rose-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, icon, tone, suffix }: { label: string; value: number; icon: React.ReactNode; tone: "indigo"|"emerald"|"amber"|"blue"; suffix?: string }) {
  const tones: Record<string, string> = {
    indigo: "from-indigo-500/10 to-indigo-500/5 text-indigo-600 border-indigo-200/60",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-200/60",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-200/60",
    blue: "from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-200/60",
  };
  return (
    <div className={`rounded-xl border p-3 bg-gradient-to-br ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider font-medium opacity-80">{label}</div>
        {icon}
      </div>
      <div className="text-2xl font-bold mt-1">{value}{suffix ?? ""}</div>
    </div>
  );
}

function Row({ label, val }: { label: string; val: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b py-1.5 last:border-0 gap-3">
      <span className="text-muted-foreground text-xs flex-shrink-0">{label}</span>
      <span className="font-medium text-sm text-right truncate">{val}</span>
    </div>
  );
}