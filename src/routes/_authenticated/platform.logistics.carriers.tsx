import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { listCarriers, upsertCarrier, rotateCarrierWebhookSecret } from "@/lib/logistics.functions";

export const Route = createFileRoute("/_authenticated/platform/logistics/carriers")({
  head: () => ({ meta: [{ title: "Carriers · GrainHero" }] }),
  component: CarriersPage,
});

function CarriersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCarriers);
  const upsertFn = useServerFn(upsertCarrier);
  const rotateFn = useServerFn(rotateCarrierWebhookSecret);
  const { data } = useQuery({ queryKey: ["carriers"], queryFn: () => listFn() });

  const upsert = useMutation({
    mutationFn: (payload: Record<string, unknown>) => upsertFn({ data: payload as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["carriers"] }); toast.success("Carrier saved"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rotate = useMutation({
    mutationFn: (id: string) => rotateFn({ data: { id } }),
    onSuccess: (r: { secret: string }) => {
      qc.invalidateQueries({ queryKey: ["carriers"] });
      toast.success(`Webhook secret rotated: ${r.secret.slice(0, 12)}… (copied)`);
      navigator.clipboard?.writeText(r.secret).catch(() => {});
    },
  });

  return (
    <AdminPageShell
      title="Carriers"
      subtitle="In-house and third-party carriers you can assign to shipments."
      actions={<CarrierSheet onSave={(p) => upsert.mutate(p)} />}
    >
      <div className="grid gap-3">
        {(data?.carriers ?? []).map((c) => (
          <Card key={c.id} className="border-slate-200/70 hover:border-emerald-400 transition-colors">
            <CardContent className="p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">{c.name}</span>
                  <Badge variant={c.type === "in_house" ? "default" : "secondary"}>{c.type}</Badge>
                  {!c.active && <Badge variant="outline">Inactive</Badge>}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  code <code className="font-mono">{c.code}</code>
                  {c.contact_email && <> · {c.contact_email}</>}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 font-mono">
                  webhook: /api/public/webhooks/carrier/{c.code}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => rotate.mutate(c.id)}>
                  {c.webhook_secret ? "Rotate secret" : "Generate secret"}
                </Button>
                <CarrierSheet initial={c} onSave={(p) => upsert.mutate({ ...p, id: c.id })} />
              </div>
            </CardContent>
          </Card>
        ))}
        {(data?.carriers ?? []).length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">
            No carriers yet. Add one to start assigning shipments.
          </p>
        )}
      </div>
    </AdminPageShell>
  );
}

function CarrierSheet({
  initial,
  onSave,
}: {
  initial?: Record<string, unknown>;
  onSave: (payload: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: String(initial?.code ?? ""),
    name: String(initial?.name ?? ""),
    type: String(initial?.type ?? "third_party") as "in_house" | "third_party",
    contact_email: String(initial?.contact_email ?? ""),
    contact_phone: String(initial?.contact_phone ?? ""),
    tracking_url_template: String(initial?.tracking_url_template ?? ""),
    active: initial?.active !== false,
  });
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">{initial ? "Edit" : "New carrier"}</Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader><SheetTitle>{initial ? "Edit carrier" : "New carrier"}</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4">
          <Field label="Code"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="acme_freight" /></Field>
          <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Type">
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "in_house" | "third_party" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_house">In-house</SelectItem>
                <SelectItem value="third_party">Third party</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Contact email"><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
          <Field label="Contact phone"><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></Field>
          <Field label="Tracking URL template">
            <Input value={form.tracking_url_template} onChange={(e) => setForm({ ...form, tracking_url_template: e.target.value })}
              placeholder="https://track.acme.com/{tracking}" />
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              onSave({
                code: form.code, name: form.name, type: form.type,
                contact_email: form.contact_email || null,
                contact_phone: form.contact_phone || null,
                tracking_url_template: form.tracking_url_template || null,
                active: form.active,
              });
              setOpen(false);
            }}
          >Save</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}