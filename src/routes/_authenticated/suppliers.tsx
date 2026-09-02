import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Users,
  Loader2,
  Trash2,
  ExternalLink,
  Sprout,
  ArrowLeftRight,
  EyeOff,
  Pencil,
} from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { RowActions } from "@/components/app/RowActions";
import { listSuppliers, upsertSupplier, deleteSupplier } from "@/lib/suppliers.functions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupplierRow = Record<string, any>;

export const Route = createFileRoute("/_authenticated/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — Grain Hero" },
      {
        name: "description",
        content: "Suppliers workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Suppliers — Grain Hero" },
      { property: "og:description", content: "Suppliers workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: SuppliersPage,
});

type Kind = "external" | "own_farm" | "internal_transfer" | "anonymous";
const kindLabel: Record<Kind, string> = {
  external: "External",
  own_farm: "Own farm",
  internal_transfer: "Internal transfer",
  anonymous: "Anonymous",
};
const KindIcon = ({ kind }: { kind: Kind }) => {
  const cls = "h-3.5 w-3.5";
  if (kind === "own_farm") return <Sprout className={cls + " text-emerald-600"} />;
  if (kind === "internal_transfer") return <ArrowLeftRight className={cls + " text-sky-600"} />;
  if (kind === "anonymous") return <EyeOff className={cls + " text-slate-500"} />;
  return <ExternalLink className={cls + " text-amber-600"} />;
};

type FormState = {
  id?: string;
  kind: Kind;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
  notes: string;
};
const empty: FormState = {
  kind: "external",
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  country: "",
  notes: "",
};

function SuppliersPage() {
  const qc = useQueryClient();
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);

  const listFn = useServerFn(listSuppliers);
  const saveFn = useServerFn(upsertSupplier);
  const delFn = useServerFn(deleteSupplier);

  const q = useQuery({
    queryKey: ["suppliers", kindFilter, search],
    queryFn: () =>
      listFn({
        data: {
          kind: kindFilter === "all" ? undefined : (kindFilter as Kind),
          search: search || undefined,
        },
      }),
  });
  const rows: SupplierRow[] = (q.data?.suppliers ?? []) as SupplierRow[];

  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: form.id,
          kind: form.kind,
          name: form.name.trim(),
          phone: form.phone || null,
          email: form.email || null,
          address: form.address || null,
          city: form.city || null,
          country: form.country || null,
          notes: form.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success(form.id ? "Supplier updated" : "Supplier added");
      setEditOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Supplier removed");
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const kpi = useMemo(() => {
    const total_kg = rows.reduce((s, r) => s + Number(r.total_kg ?? 0), 0);
    return { count: rows.length, total_kg };
  }, [rows]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-600" /> Suppliers
          </h1>
          <p className="text-sm text-muted-foreground">
            Every grain source we buy from — track profile, history, and average cost.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(empty);
            setEditOpen(true);
          }}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add supplier
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Suppliers</div>
            <div className="text-2xl font-semibold tabular-nums">{kpi.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Total delivered</div>
            <div className="text-2xl font-semibold tabular-nums">
              {kpi.total_kg.toLocaleString()} kg
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Own farms</div>
            <div className="text-2xl font-semibold tabular-nums">
              {rows.filter((r) => r.kind === "own_farm").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="h-9 max-w-sm"
          placeholder="Search name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={kindFilter} onValueChange={setKindFilter}>
          <SelectTrigger className="h-9 w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All kinds</SelectItem>
            <SelectItem value="external">External supplier</SelectItem>
            <SelectItem value="own_farm">Own farm</SelectItem>
            <SelectItem value="internal_transfer">Internal transfer</SelectItem>
            <SelectItem value="anonymous">Anonymous</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Kind</th>
              <th className="text-left px-3 py-2">Contact</th>
              <th className="text-right px-3 py-2">Delivered</th>
              <th className="text-right px-3 py-2">Avg cost</th>
              <th className="text-left px-3 py-2">Last delivery</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {q.isLoading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-muted-foreground">
                  No suppliers yet. Add your first source above.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-emerald-500/5">
                  <td className="px-3 py-2 font-medium">
                    <Link
                      to="/suppliers/$supplierId"
                      params={{ supplierId: r.id }}
                      className="hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1 text-xs">
                      <KindIcon kind={r.kind as Kind} />
                      {kindLabel[r.kind as Kind]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {[r.phone, r.email, r.city].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {Number(r.total_kg ?? 0).toLocaleString()} kg
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.avg_cost != null ? Number(r.avg_cost).toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.last_delivery ? new Date(r.last_delivery).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-2 py-2">
                    <RowActions
                      actions={[
                        {
                          label: "Edit",
                          icon: Pencil,
                          onClick: () => {
                            setForm({
                              id: r.id,
                              kind: r.kind,
                              name: r.name,
                              phone: r.phone ?? "",
                              email: r.email ?? "",
                              address: r.address ?? "",
                              city: r.city ?? "",
                              country: r.country ?? "",
                              notes: r.notes ?? "",
                            });
                            setEditOpen(true);
                          },
                        },
                        {
                          label: "Delete",
                          icon: Trash2,
                          destructive: true,
                          onClick: () => {
                            if (confirm(`Delete ${r.name}?`)) delMut.mutate(r.id);
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setForm(empty);
        }}
      >
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit supplier" : "New supplier"}</DialogTitle>
            <DialogDescription>
              Kind determines how this source appears in batch intake.
            </DialogDescription>
          </DialogHeader>
          <form
            id="sup-form"
            className="grid gap-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.name.trim()) {
                toast.error("Name required");
                return;
              }
              saveMut.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Kind</Label>
                <Select
                  value={form.kind}
                  onValueChange={(v) => setForm({ ...form, kind: v as Kind })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external">External supplier</SelectItem>
                    <SelectItem value="own_farm">Own farm / harvest</SelectItem>
                    <SelectItem value="internal_transfer">Internal transfer</SelectItem>
                    <SelectItem value="anonymous">Anonymous / walk-in</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  className="h-9"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Supplier or farm name"
                />
              </div>
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  className="h-9"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  className="h-9"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input
                  className="h-9"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Country</Label>
                <Input
                  className="h-9"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Address</Label>
              <Input
                className="h-9"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button form="sup-form" type="submit" disabled={saveMut.isPending}>
              {saveMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : form.id ? (
                "Save changes"
              ) : (
                "Add supplier"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
