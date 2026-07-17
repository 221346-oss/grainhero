import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_MARKETPLACE_SETTINGS,
  getMarketplaceSettings,
  updateMarketplaceSettings,
  type MarketplaceSettings,
} from "@/lib/marketplace-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/platform/marketplace-settings")({
  component: MarketplaceSettingsPage,
});

function MarketplaceSettingsPage() {
  const load = useServerFn(getMarketplaceSettings);
  const save = useServerFn(updateMarketplaceSettings);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["marketplace-settings"],
    queryFn: () => load(),
  });
  const [s, setS] = useState<MarketplaceSettings>(DEFAULT_MARKETPLACE_SETTINGS);
  useEffect(() => { if (data?.settings) setS(data.settings); }, [data]);

  const mut = useMutation({
    mutationFn: () => save({ data: s }),
    onSuccess: () => {
      toast.success("Marketplace settings updated");
      qc.invalidateQueries({ queryKey: ["marketplace-settings"] });
      qc.invalidateQueries({ queryKey: ["marketplace-branding"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const patch = (p: Partial<MarketplaceSettings>) => setS((prev) => ({ ...prev, ...p }));
  const patchSub = (p: Partial<MarketplaceSettings["emailSubjects"]>) =>
    setS((prev) => ({ ...prev, emailSubjects: { ...prev.emailSubjects, ...p } }));
  const patchBody = (p: Partial<MarketplaceSettings["emailBodies"]>) =>
    setS((prev) => ({ ...prev, emailBodies: { ...prev.emailBodies, ...p } }));

  return (
    <AdminPageShell
      title="Marketplace settings"
      description="Control storefront branding, buyer email copy and checkout messaging. All values apply immediately across the buyer marketplace and transactional emails."
      actions={
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Storefront branding</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Brand name"><Input value={s.brandName} onChange={(e) => patch({ brandName: e.target.value })} /></Field>
            <Field label="Tagline"><Input value={s.tagline} onChange={(e) => patch({ tagline: e.target.value })} /></Field>
            <Field label="Support email"><Input type="email" value={s.supportEmail} onChange={(e) => patch({ supportEmail: e.target.value })} /></Field>
            <Field label="From email (Resend)"><Input value={s.fromEmail} onChange={(e) => patch({ fromEmail: e.target.value })} /></Field>
            <Field label="Default currency (ISO 4217)"><Input value={s.currency} maxLength={3} onChange={(e) => patch({ currency: e.target.value.toUpperCase() })} /></Field>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><div className="text-sm font-medium">Storefront enabled</div><div className="text-xs text-muted-foreground">Turn off to hide public /marketplace pages.</div></div>
              <Switch checked={s.storefrontEnabled} onCheckedChange={(v) => patch({ storefrontEnabled: v })} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div><div className="text-sm font-medium">Show brand banner</div><div className="text-xs text-muted-foreground">Renders the tagline strip on storefront pages.</div></div>
              <Switch checked={s.showBrandBanner} onCheckedChange={(v) => patch({ showBrandBanner: v })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Buyer emails</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Placeholders: <code>{"{{orderNumber}}"}</code>, <code>{"{{quantityKg}}"}</code>, <code>{"{{subtotal}}"}</code>, <code>{"{{currency}}"}</code>, <code>{"{{listingTitle}}"}</code>, <code>{"{{trackingUrl}}"}</code>.
            </p>
            {(["placed","paymentSucceeded","paymentFailed","dispatched"] as const).map((k) => (
              <div key={k} className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
                <Field label="Subject">
                  <Input value={s.emailSubjects[k]} onChange={(e) => patchSub({ [k]: e.target.value } as never)} />
                </Field>
                <Field label="Body">
                  <Textarea rows={4} value={s.emailBodies[k]} onChange={(e) => patchBody({ [k]: e.target.value } as never)} />
                </Field>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}