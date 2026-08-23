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
  head: () => ({
    meta: [
      { title: "Platform · Marketplace Settings — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Marketplace Settings workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Marketplace Settings — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Marketplace Settings workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
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
  useEffect(() => {
    if (data?.settings) setS(data.settings);
  }, [data]);

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
  const patchSub = (p: Record<string, string>) =>
    setS((prev) => ({ ...prev, emailSubjects: { ...prev.emailSubjects, ...p } }));
  const patchBody = (p: Record<string, string>) =>
    setS((prev) => ({ ...prev, emailBodies: { ...prev.emailBodies, ...p } }));

  return (
    <AdminPageShell
      title="Marketplace settings"
      subtitle="Control storefront branding, buyer email copy and checkout messaging. Changes apply immediately across the buyer marketplace and transactional emails."
      actions={
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Storefront branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Brand name">
              <Input value={s.brandName} onChange={(e) => patch({ brandName: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <Input value={s.tagline} onChange={(e) => patch({ tagline: e.target.value })} />
            </Field>
            <Field label="Support email">
              <Input
                type="email"
                value={s.supportEmail}
                onChange={(e) => patch({ supportEmail: e.target.value })}
              />
            </Field>
            <Field label="From email (Resend)">
              <Input value={s.fromEmail} onChange={(e) => patch({ fromEmail: e.target.value })} />
            </Field>
            <Field label="Default currency (ISO 4217)">
              <Input
                value={s.currency}
                maxLength={3}
                onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
              />
            </Field>
            <div className="flex items-center justify-between rounded-md p-3">
              <div>
                <div className="text-sm font-medium">Storefront enabled</div>
                <div className="text-xs text-muted-foreground">
                  Turn off to hide public /marketplace pages.
                </div>
              </div>
              <Switch
                checked={s.storefrontEnabled}
                onCheckedChange={(v) => patch({ storefrontEnabled: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md p-3">
              <div>
                <div className="text-sm font-medium">Show brand banner</div>
                <div className="text-xs text-muted-foreground">
                  Renders the tagline strip on storefront pages.
                </div>
              </div>
              <Switch
                checked={s.showBrandBanner}
                onCheckedChange={(v) => patch({ showBrandBanner: v })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buyer emails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Placeholders: <code>{"{{orderNumber}}"}</code>, <code>{"{{quantityKg}}"}</code>,{" "}
              <code>{"{{subtotal}}"}</code>, <code>{"{{currency}}"}</code>,{" "}
              <code>{"{{listingTitle}}"}</code>, <code>{"{{trackingUrl}}"}</code>.
            </p>
            {(
              [
                "placed",
                "paymentSucceeded",
                "paymentFailed",
                "dispatched",
                "outForDelivery",
                "delivered",
                "exception",
                "reviewPromptBuyer",
                "reviewPromptSeller",
              ] as const
            ).map((k) => (
              <div key={k} className="space-y-2 rounded-md p-3">
                <div className="text-sm font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
                <Field label="Subject">
                  <Input
                    value={s.emailSubjects[k]}
                    onChange={(e) => patchSub({ [k]: e.target.value } as never)}
                  />
                </Field>
                <Field label="Body">
                  <Textarea
                    rows={4}
                    value={s.emailBodies[k]}
                    onChange={(e) => patchBody({ [k]: e.target.value } as never)}
                  />
                </Field>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dispatch & couriers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Tracking URL supports <code>{"{{trackingNumber}}"}</code>. Leave blank for couriers
              without web tracking.
            </p>
            {s.dispatch.couriers.map((c, i) => (
              <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-md p-2">
                <Input
                  className="col-span-3"
                  placeholder="key"
                  value={c.key}
                  onChange={(e) =>
                    setS((p) => {
                      const cs = [...p.dispatch.couriers];
                      cs[i] = { ...cs[i], key: e.target.value };
                      return { ...p, dispatch: { ...p.dispatch, couriers: cs } };
                    })
                  }
                />
                <Input
                  className="col-span-3"
                  placeholder="Label"
                  value={c.label}
                  onChange={(e) =>
                    setS((p) => {
                      const cs = [...p.dispatch.couriers];
                      cs[i] = { ...cs[i], label: e.target.value };
                      return { ...p, dispatch: { ...p.dispatch, couriers: cs } };
                    })
                  }
                />
                <Input
                  className="col-span-5"
                  placeholder="Tracking URL template"
                  value={c.trackingUrlTemplate}
                  onChange={(e) =>
                    setS((p) => {
                      const cs = [...p.dispatch.couriers];
                      cs[i] = { ...cs[i], trackingUrlTemplate: e.target.value };
                      return { ...p, dispatch: { ...p.dispatch, couriers: cs } };
                    })
                  }
                />
                <Button
                  className="col-span-1"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setS((p) => ({
                      ...p,
                      dispatch: {
                        ...p.dispatch,
                        couriers: p.dispatch.couriers.filter((_, ix) => ix !== i),
                      },
                    }))
                  }
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setS((p) => ({
                  ...p,
                  dispatch: {
                    ...p.dispatch,
                    couriers: [
                      ...p.dispatch.couriers,
                      { key: "", label: "", trackingUrlTemplate: "" },
                    ],
                  },
                }))
              }
            >
              + Add courier
            </Button>
            <div className="grid grid-cols-3 gap-3 pt-2">
              <Field label="SLA in-transit (h)">
                <Input
                  type="number"
                  value={s.dispatch.slaHours.inTransit}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      dispatch: {
                        ...p.dispatch,
                        slaHours: { ...p.dispatch.slaHours, inTransit: Number(e.target.value) },
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Out for delivery (h)">
                <Input
                  type="number"
                  value={s.dispatch.slaHours.outForDelivery}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      dispatch: {
                        ...p.dispatch,
                        slaHours: {
                          ...p.dispatch.slaHours,
                          outForDelivery: Number(e.target.value),
                        },
                      },
                    }))
                  }
                />
              </Field>
              <Field label="Delivered target (h)">
                <Input
                  type="number"
                  value={s.dispatch.slaHours.delivered}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      dispatch: {
                        ...p.dispatch,
                        slaHours: { ...p.dispatch.slaHours, delivered: Number(e.target.value) },
                      },
                    }))
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t">
              <Field label="Alert cooldown (min)">
                <Input
                  type="number"
                  value={s.dispatch.alertCooldownMinutes}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      dispatch: { ...p.dispatch, alertCooldownMinutes: Number(e.target.value) },
                    }))
                  }
                />
              </Field>
              <Field label="Delivery-rate drop alert (pp)">
                <Input
                  type="number"
                  value={s.dispatch.deliveryRateAlertDropPct}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      dispatch: { ...p.dispatch, deliveryRateAlertDropPct: Number(e.target.value) },
                    }))
                  }
                />
              </Field>
              <Field label="Overdue grace (min)">
                <Input
                  type="number"
                  value={s.dispatch.overdueGraceMinutes}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      dispatch: { ...p.dispatch, overdueGraceMinutes: Number(e.target.value) },
                    }))
                  }
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reviews & moderation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-md p-3">
              <div>
                <div className="text-sm font-medium">Reviews enabled</div>
                <div className="text-xs text-muted-foreground">
                  When off, both sides cannot submit ratings.
                </div>
              </div>
              <Switch
                checked={s.reviews.enabled}
                onCheckedChange={(v) =>
                  setS((p) => ({ ...p, reviews: { ...p.reviews, enabled: v } }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md p-3">
              <div>
                <div className="text-sm font-medium">Auto-publish</div>
                <div className="text-xs text-muted-foreground">Skip the moderation queue.</div>
              </div>
              <Switch
                checked={s.reviews.autoPublish}
                onCheckedChange={(v) =>
                  setS((p) => ({ ...p, reviews: { ...p.reviews, autoPublish: v } }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md p-3">
              <div>
                <div className="text-sm font-medium">Show on storefront</div>
                <div className="text-xs text-muted-foreground">
                  Display average + latest reviews on listings.
                </div>
              </div>
              <Switch
                checked={s.reviews.showOnStorefront}
                onCheckedChange={(v) =>
                  setS((p) => ({ ...p, reviews: { ...p.reviews, showOnStorefront: v } }))
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Min characters">
                <Input
                  type="number"
                  value={s.reviews.minChars}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      reviews: { ...p.reviews, minChars: Number(e.target.value) },
                    }))
                  }
                />
              </Field>
              <Field label="Prompt delay (h)">
                <Input
                  type="number"
                  value={s.reviews.promptDelayHours}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      reviews: { ...p.reviews, promptDelayHours: Number(e.target.value) },
                    }))
                  }
                />
              </Field>
              <Field label="Min count for avg">
                <Input
                  type="number"
                  value={s.reviews.minCountForAverage}
                  onChange={(e) =>
                    setS((p) => ({
                      ...p,
                      reviews: { ...p.reviews, minCountForAverage: Number(e.target.value) },
                    }))
                  }
                />
              </Field>
            </div>
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
