"use client";

import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Plus, Search, Edit2, Trash2, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { listBuyers, upsertBuyer, deleteBuyer } from "@/lib/operations.functions";
import { ExportMenu } from "@/components/app/ExportMenu";
import type { ExportColumn } from "@/lib/csv-pdf-export";
import { useTranslation } from "@/i18n";

const BUYER_TYPES = ["local_mill", "exporter", "wholesaler", "retailer", "government"] as const;
const GRAIN_TYPES = ["Wheat", "Rice", "Maize", "Barley", "Sorghum"] as const;
type BuyerType = (typeof BUYER_TYPES)[number];
type GrainType = (typeof GRAIN_TYPES)[number];
type Status = "active" | "paused" | "inactive";

type Buyer = {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_designation: string | null;
  company_name: string | null;
  buyer_type: BuyerType | null;
  status: Status | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  preferred_grain_types: GrainType[] | null;
  preferred_payment_terms: string | null;
  rating: number | null;
  tags: string[] | null;
  notes: string | null;
  last_order_at: string | null;
  last_interaction_at: string | null;
  created_at: string | null;
};

const buyerExportColumns: ExportColumn<Buyer>[] = [
  { header: "Name", value: (b) => b.name },
  { header: "Company", value: (b) => b.company_name ?? "" },
  { header: "Type", value: (b) => b.buyer_type ?? "" },
  { header: "Status", value: (b) => b.status ?? "" },
  { header: "Phone", value: (b) => b.contact_phone ?? "" },
  { header: "Email", value: (b) => b.contact_email ?? "" },
  { header: "City", value: (b) => b.city ?? "" },
];

type Form = {
  id?: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_designation: string;
  company_name: string;
  buyer_type: BuyerType | "";
  status: Status;
  address: string;
  city: string;
  state: string;
  country: string;
  preferred_grain_types: GrainType[];
  preferred_payment_terms: string;
  rating: string;
  tags: string;
  notes: string;
};

const empty: Form = {
  name: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  contact_designation: "",
  company_name: "",
  buyer_type: "",
  status: "active",
  address: "",
  city: "",
  state: "",
  country: "",
  preferred_grain_types: [],
  preferred_payment_terms: "",
  rating: "",
  tags: "",
  notes: "",
};

const STATUS_CLASS: Record<Status, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  paused: "bg-amber-100 text-amber-800 border-amber-200",
  inactive: "bg-slate-100 text-slate-700 border-slate-200",
};

export function BuyersSection() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const listFn = useServerFn(listBuyers);
  const upsertFn = useServerFn(upsertBuyer);
  const deleteFn = useServerFn(deleteBuyer);

  const { data, isLoading } = useQuery({
    queryKey: ["buyers"],
    queryFn: () => listFn() as Promise<Buyer[]>,
  });

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Buyer | null>(null);
  const [form, setForm] = useState<Form>(empty);

  const rows = useMemo(() => {
    const all = (data ?? []) as Buyer[];
    return all.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        b.name?.toLowerCase().includes(s) ||
        b.contact_name?.toLowerCase().includes(s) ||
        b.contact_email?.toLowerCase().includes(s) ||
        b.company_name?.toLowerCase().includes(s)
      );
    });
  }, [data, q, statusFilter]);

  const saveMutation = useMutation({
    mutationFn: async (fs: Form) =>
      upsertFn({
        data: {
          id: fs.id,
          name: fs.name.trim(),
          contact_name: fs.contact_name.trim(),
          contact_email: fs.contact_email.trim() || null,
          contact_phone: fs.contact_phone.trim() || null,
          contact_designation: fs.contact_designation.trim() || null,
          company_name: fs.company_name.trim() || null,
          buyer_type: fs.buyer_type || null,
          status: fs.status,
          address: fs.address.trim() || null,
          city: fs.city.trim() || null,
          state: fs.state.trim() || null,
          country: fs.country.trim() || null,
          preferred_grain_types: fs.preferred_grain_types.length ? fs.preferred_grain_types : null,
          preferred_payment_terms: fs.preferred_payment_terms.trim() || null,
          rating: fs.rating ? Number(fs.rating) : null,
          tags: fs.tags
            ? fs.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : null,
          notes: fs.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? t("buyers.updated") : t("buyers.created"));
      qc.invalidateQueries({ queryKey: ["buyers"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      setEditOpen(false);
      setForm(empty);
    },
    onError: (e: Error) => toast.error(e.message || t("common.error")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success(t("buyers.deleted"));
      qc.invalidateQueries({ queryKey: ["buyers"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || t("common.error")),
  });

  function openCreate() {
    setForm(empty);
    setEditOpen(true);
  }
  function openEdit(b: Buyer) {
    setForm({
      id: b.id,
      name: b.name ?? "",
      contact_name: b.contact_name ?? "",
      contact_email: b.contact_email ?? "",
      contact_phone: b.contact_phone ?? "",
      contact_designation: b.contact_designation ?? "",
      company_name: b.company_name ?? "",
      buyer_type: b.buyer_type ?? "",
      status: b.status ?? "active",
      address: b.address ?? "",
      city: b.city ?? "",
      state: b.state ?? "",
      country: b.country ?? "",
      preferred_grain_types: b.preferred_grain_types ?? [],
      preferred_payment_terms: b.preferred_payment_terms ?? "",
      rating: b.rating != null ? String(b.rating) : "",
      tags: b.tags?.join(", ") ?? "",
      notes: b.notes ?? "",
    });
    setEditOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("buyers.searchPlaceholder")}
            className="pl-9 h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue placeholder={t("common.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("buyers.allStatuses")}</SelectItem>
            <SelectItem value="active">{t("buyers.active")}</SelectItem>
            <SelectItem value="paused">{t("buyers.paused")}</SelectItem>
            <SelectItem value="inactive">{t("buyers.inactive")}</SelectItem>
          </SelectContent>
        </Select>
        <ExportMenu filename="buyers" title={t("buyers.title")} rows={rows} columns={buyerExportColumns} />
        <Button onClick={openCreate} className="gap-2 h-9 whitespace-nowrap">
          <Plus className="w-4 h-4" /> {t("buyers.newBuyer")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> {t("common.loading")}
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <p className="text-sm">{t("buyers.noBuyers")}</p>
        </div>
      ) : (
        // Fixed height container for 4 entries with vertical scroll
        <div className="h-[280px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {t("buyers.buyer")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {t("buyers.contact")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {t("buyers.company")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {t("buyers.type")}
                </th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {t("common.status")}
                </th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                  {t("common.actions")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5 transition-colors"
                >
                  <td className="px-3 py-2 text-foreground font-medium">{b.name}</td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {b.contact_phone ?? b.contact_email ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {b.company_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs">
                    {b.buyer_type ? t(`buyers.${b.buyer_type}`) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadgeCustom value={b.status} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelected(b);
                          setViewOpen(true);
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(b)}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(b.id)}
                        className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setForm(empty);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle>{form.id ? t("buyers.editBuyer") : t("buyers.newBuyer")}</DialogTitle>
            <DialogDescription>
              {form.id ? t("buyers.updateBuyerDetails") : t("buyers.addBuyerDescription")}
            </DialogDescription>
          </DialogHeader>
          <form
            id="buyer-form"
            className="grid gap-4 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(form);
            }}
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("common.name")} *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("buyers.contactName")} *</Label>
                <Input
                  required
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("buyers.company")}</Label>
                <Input
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("buyers.designation")}</Label>
                <Input
                  value={form.contact_designation}
                  onChange={(e) => setForm({ ...form, contact_designation: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("common.phone")}</Label>
                <Input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("common.email")}</Label>
                <Input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("buyers.type")}</Label>
                <Select
                  value={form.buyer_type}
                  onValueChange={(v) => setForm({ ...form, buyer_type: v as BuyerType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("buyers.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {BUYER_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {t(`buyers.${type}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("common.status")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as Status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("buyers.active")}</SelectItem>
                    <SelectItem value="paused">{t("buyers.paused")}</SelectItem>
                    <SelectItem value="inactive">{t("buyers.inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("common.address")}</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("buyers.city")}</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("buyers.state")}</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("buyers.country")}</Label>
                <Input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("buyers.preferredGrains")}</Label>
                <div className="flex flex-wrap gap-2">
                  {GRAIN_TYPES.map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.preferred_grain_types.includes(g)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setForm({
                              ...form,
                              preferred_grain_types: [...form.preferred_grain_types, g],
                            });
                          } else {
                            setForm({
                              ...form,
                              preferred_grain_types: form.preferred_grain_types.filter(
                                (x) => x !== g,
                              ),
                            });
                          }
                        }}
                      />
                      <span className="text-sm">{t(`business.${g.toLowerCase()}`)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>{t("buyers.paymentTerms")}</Label>
                <Input
                  value={form.preferred_payment_terms}
                  onChange={(e) => setForm({ ...form, preferred_payment_terms: e.target.value })}
                  placeholder={t("buyers.paymentTermsPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("buyers.rating")}</Label>
                <Input
                  type="number"
                  min={0}
                  max={5}
                  step={0.5}
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("buyers.tags")}</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder={t("buyers.tagsPlaceholder")}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>{t("buyers.notes")}</Label>
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
            </div>
          </form>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              form="buyer-form"
              type="submit"
              disabled={saveMutation.isPending || !form.name || !form.contact_name}
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : form.id ? (
                t("common.save")
              ) : (
                t("buyers.create")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{selected.contact_name}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm py-2">
                {selected.company_name && <Row label={t("buyers.company")}>{selected.company_name}</Row>}
                {selected.contact_phone && <Row label={t("common.phone")}>{selected.contact_phone}</Row>}
                {selected.contact_email && <Row label={t("common.email")}>{selected.contact_email}</Row>}
                {selected.buyer_type && (
                  <Row label={t("buyers.type")}>{t(`buyers.${selected.buyer_type}`)}</Row>
                )}
                <Row label={t("common.status")}>
                  <StatusBadgeCustom value={selected.status} />
                </Row>
                {selected.address && <Row label={t("common.address")}>{selected.address}</Row>}
                {selected.city && <Row label={t("buyers.city")}>{selected.city}</Row>}
                {selected.preferred_grain_types && selected.preferred_grain_types.length > 0 && (
                  <Row label={t("buyers.preferredGrains")}>
                    {selected.preferred_grain_types.map((grain) => t(`business.${grain.toLowerCase()}`)).join(", ")}
                  </Row>
                )}
                {selected.rating != null && (
                  <Row label={t("buyers.rating")}>{selected.rating.toFixed(1)}/5</Row>
                )}
                {selected.notes && (
                  <Row label={t("buyers.notes")}>
                    <span className="whitespace-pre-wrap">{selected.notes}</span>
                  </Row>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewOpen(false);
                    openEdit(selected);
                  }}
                  className="gap-1"
                >
                  <Edit2 className="w-4 h-4" /> {t("common.edit")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("buyers.deleteBuyer")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("buyers.deleteBuyerDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 items-start">
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-slate-800 text-right">{children}</span>
    </div>
  );
}

function StatusBadgeCustom({ value }: { value: string | null | undefined }) {
  const { t } = useTranslation();
  if (!value) return <span className="text-slate-400">—</span>;
  const cls = STATUS_CLASS[value as Status] ?? "bg-slate-100 text-slate-700";
  return <Badge className={`${cls} hover:${cls}`}>{t(`buyers.${value}`)}</Badge>;
}
