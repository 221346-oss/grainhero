import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { AdminSummaryTiles } from "@/components/app/admin/AdminSummaryTiles";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  listListings,
  updateListing,
  createListingFromBatch,
  getEligibleBatches,
} from "@/lib/listings.functions";
import { placeOrder } from "@/lib/buyer-orders.functions";
import { GrainBatchesSkeleton } from "@/components/app/skeletons";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/_authenticated/listings")({
  head: () => ({
    meta: [
      { title: "Listings — Grain Hero" },
      {
        name: "description",
        content: "Listings workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Listings — Grain Hero" },
      { property: "og:description", content: "Listings workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ListingsPage,
  pendingComponent: GrainBatchesSkeleton,
});

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-200 text-slate-700",
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  sold_out: "bg-slate-300 text-slate-800",
  archived: "bg-slate-100 text-slate-500",
};

function ListingsPage() {
  const { t } = useTranslation();
  const [openNew, setOpenNew] = useState(false);
  const [orderFor, setOrderFor] = useState<string | null>(null);
  const qc = useQueryClient();
  const listFn = useServerFn(listListings);
  const updateFn = useServerFn(updateListing);
  const listQ = useQuery({
    queryKey: ["listings"],
    queryFn: () => listFn({ data: { status: "all", limit: 100 } }),
  });
  const items = listQ.data?.listings ?? [];

  const summary = useMemo(
    () => ({
      total: items.length,

      active: items.filter((l: any) => l.status === "active").length,

      stock: items
        .filter((l: any) => l.status === "active")
        .reduce((s: number, l: any) => s + Number(l.available_kg), 0),
    }),
    [items],
  );

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "active" | "paused" | "archived" }) =>
      updateFn({ data: { id: v.id, status: v.status } }),
    onSuccess: () => {
      toast.success(t("listings.updatedToast"));
      void qc.invalidateQueries({ queryKey: ["listings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AdminPageShell
      title={t("listings.title")}
      subtitle={t("listings.subtitle")}
      actions={
        <Button onClick={() => setOpenNew(true)}>
          <Plus className="w-4 h-4 mr-1" />
          {t("listings.newListing")}
        </Button>
      }
    >
      <AdminSummaryTiles
        columns={3}
        tiles={[
          { key: "t", label: t("listings.listings"), value: summary.total },
          { key: "a", label: t("listings.active"), value: summary.active },
          { key: "s", label: t("listings.stockKg"), value: summary.stock.toLocaleString() },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("listings.allListings")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {listQ.isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
              {t("listings.loading")}
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {t("listings.noListings")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("listings.headerTitle")}</TableHead>
                  <TableHead>{t("listings.headerBatch")}</TableHead>
                  <TableHead className="text-right">{t("listings.headerPrice")}</TableHead>
                  <TableHead className="text-right">{t("listings.headerAvailable")}</TableHead>
                  <TableHead>{t("listings.headerVisibility")}</TableHead>
                  <TableHead>{t("listings.headerStatus")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {}
                {items.map((l: any) => (
                  <TableRow key={l.id} className="hover:bg-emerald-50/40">
                    <TableCell className="font-medium max-w-[220px] truncate">{l.title}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {l.grain_batches?.batch_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {l.currency} {Number(l.price_per_kg).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(l.available_kg).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{l.visibility}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[l.status] ?? ""}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {l.status === "active" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => statusMut.mutate({ id: l.id, status: "paused" })}
                        >
                          {t("listings.pause")}
                        </Button>
                      ) : l.status === "paused" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => statusMut.mutate({ id: l.id, status: "active" })}
                        >
                          {t("listings.activate")}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() => setOrderFor(l.id)}
                        disabled={l.status !== "active"}
                      >
                        <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                        {t("listings.order")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {openNew && (
        <NewListingDialog
          onClose={() => setOpenNew(false)}
          onCreated={() => {
            setOpenNew(false);
            void qc.invalidateQueries({ queryKey: ["listings"] });
          }}
        />
      )}
      {orderFor && (
        <PlaceOrderDialog
          listingId={orderFor}
          onClose={() => setOrderFor(null)}
          onPlaced={() => {
            setOrderFor(null);
            void qc.invalidateQueries({ queryKey: ["listings"] });
          }}
        />
      )}
    </AdminPageShell>
  );
}

function NewListingDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { t } = useTranslation();
  const getBatches = useServerFn(getEligibleBatches);
  const createFn = useServerFn(createListingFromBatch);
  const batchesQ = useQuery({ queryKey: ["eligible-batches"], queryFn: () => getBatches() });
  const [batchId, setBatchId] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState("");
  const [minOrder, setMinOrder] = useState("100");
  const [visibility, setVisibility] = useState<"private" | "buyer_network" | "public">(
    "buyer_network",
  );
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const selected = (batchesQ.data?.batches ?? []).find((b: any) => b.id === batchId);
  useEffect(() => {
    if (selected && !available)
      setAvailable(
        String(Number((selected as any).net_weight_kg ?? (selected as any).quantity_kg ?? 0)),
      );
  }, [selected, available]);

  const createMut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          batchId,
          pricePerKg: Number(price),
          availableKg: Number(available),
          minOrderKg: Number(minOrder || "0"),
          visibility,
          title: title || undefined,
          description: desc || undefined,
          currency: "USD",
        },
      }),
    onSuccess: () => {
      toast.success(t("listings.createdToast"));
      onCreated();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("listings.newListingTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("listings.batch")}</Label>
            <Select value={batchId} onValueChange={setBatchId}>
              <SelectTrigger>
                <SelectValue placeholder={t("listings.pickReadyBatch")} />
              </SelectTrigger>
              <SelectContent>
                {}
                {(batchesQ.data?.batches ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batch_number} · {b.grain_type ?? "grain"} ·{" "}
                    {Number(b.net_weight_kg ?? b.quantity_kg ?? 0).toLocaleString()}kg
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {batchesQ.data?.batches.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">{t("listings.noReadyBatches")}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t("listings.pricePerKg")}</Label>
              <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <Label>{t("listings.availableKg")}</Label>
              <Input
                type="number"
                value={available}
                onChange={(e) => setAvailable(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("listings.minOrderKg")}</Label>
              <Input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} />
            </div>
            <div>
              <Label>{t("listings.visibility")}</Label>
              {}
              <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{t("listings.visPrivate")}</SelectItem>
                  <SelectItem value="buyer_network">{t("listings.visBuyerNetwork")}</SelectItem>
                  <SelectItem value="public">{t("listings.visPublic")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>{t("listings.titleOptional")}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("listings.autoFromBatch")}
            />
          </div>
          <div>
            <Label>{t("listings.description")}</Label>
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!batchId || !price || !available || createMut.isPending}
            onClick={() => createMut.mutate()}
          >
            {t("listings.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlaceOrderDialog({
  listingId,
  onClose,
  onPlaced,
}: {
  listingId: string;
  onClose: () => void;
  onPlaced: () => void;
}) {
  const { t } = useTranslation();
  const placeFn = useServerFn(placeOrder);
  const [buyerId, setBuyerId] = useState("");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");

  const buyersQ = useQuery<any[]>({
    queryKey: ["buyers-simple"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buyers")
        .select("id, name, company_name")
        .order("name")
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const placeMut = useMutation({
    mutationFn: () =>
      placeFn({
        data: {
          listingId,
          buyerId,
          quantityKg: Number(qty),
          notes: note || undefined,
        },
      }),
    onSuccess: (r) => {
      toast.success(t("listings.orderPlacedToast", { number: r.orderNumber }));
      onPlaced();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("listings.placeOrder")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("listings.buyer")}</Label>
            <Select value={buyerId} onValueChange={setBuyerId}>
              <SelectTrigger>
                <SelectValue placeholder={t("listings.pickBuyer")} />
              </SelectTrigger>
              <SelectContent>
                {(buyersQ.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.company_name ?? b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(buyersQ.data ?? []).length === 0 && (
              <p className="text-xs text-amber-600 mt-1">{t("listings.noBuyers")}</p>
            )}
          </div>
          <div>
            <Label>{t("listings.quantityKg")}</Label>
            <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <Label>{t("listings.notes")}</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            disabled={!buyerId || !qty || placeMut.isPending}
            onClick={() => placeMut.mutate()}
          >
            {t("listings.placeOrder")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
