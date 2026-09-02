import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getMarketplaceMobileSettings,
  updateMarketplaceMobileSettings,
} from "@/lib/marketplace-mobile-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/platform/marketplace-mobile")({
  head: () => ({
    meta: [
      { title: "Platform · Marketplace Mobile — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Marketplace Mobile workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Marketplace Mobile — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Marketplace Mobile workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarketplaceMobilePage,
});

type S = {
  hero_headline: string;
  hero_subheadline: string;
  featured_commodities: string[];
  min_app_build: number;
  kill_switch: boolean;
  kill_switch_message: string;
  allowed_attachment_types: string[];
  max_message_length: number;
  moderation_banner: string;
};
const DEFAULTS: S = {
  hero_headline: "",
  hero_subheadline: "",
  featured_commodities: [],
  min_app_build: 1,
  kill_switch: false,
  kill_switch_message: "",
  allowed_attachment_types: ["image/jpeg", "image/png", "application/pdf"],
  max_message_length: 2000,
  moderation_banner: "",
};

function MarketplaceMobilePage() {
  const load = useServerFn(getMarketplaceMobileSettings);
  const save = useServerFn(updateMarketplaceMobileSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["mkt-mobile"], queryFn: () => load() });
  const [s, setS] = useState<S>(DEFAULTS);
  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setS({
        hero_headline: (d.hero_headline as string) ?? "",
        hero_subheadline: (d.hero_subheadline as string) ?? "",
        featured_commodities: (d.featured_commodities as string[]) ?? [],
        min_app_build: (d.min_app_build as number) ?? 1,
        kill_switch: Boolean(d.kill_switch),
        kill_switch_message: (d.kill_switch_message as string) ?? "",
        allowed_attachment_types:
          (d.allowed_attachment_types as string[]) ?? DEFAULTS.allowed_attachment_types,
        max_message_length: (d.max_message_length as number) ?? 2000,
        moderation_banner: (d.moderation_banner as string) ?? "",
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () =>
      save({
        data: {
          ...s,
          kill_switch_message: s.kill_switch_message || null,
          moderation_banner: s.moderation_banner || null,
        },
      }),
    onSuccess: () => {
      toast.success("Marketplace mobile settings saved");
      qc.invalidateQueries({ queryKey: ["mkt-mobile"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const patch = (p: Partial<S>) => setS((prev) => ({ ...prev, ...p }));

  return (
    <AdminPageShell
      title="Marketplace mobile"
      subtitle="Configure the buyer/seller mobile marketplace surface. Zero hardcoded copy — everything below drives the Flutter app."
      actions={
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Storefront hero</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <F label="Headline">
              <Input
                value={s.hero_headline}
                onChange={(e) => patch({ hero_headline: e.target.value })}
              />
            </F>
            <F label="Subheadline">
              <Textarea
                rows={2}
                value={s.hero_subheadline}
                onChange={(e) => patch({ hero_subheadline: e.target.value })}
              />
            </F>
            <F label="Featured commodities (comma separated)">
              <Input
                value={s.featured_commodities.join(",")}
                onChange={(e) =>
                  patch({
                    featured_commodities: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
              />
            </F>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Client &amp; availability</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <F label="Minimum app build">
              <Input
                type="number"
                value={s.min_app_build}
                onChange={(e) => patch({ min_app_build: Number(e.target.value) })}
              />
            </F>
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium text-sm">Kill switch</div>
                <div className="text-xs text-muted-foreground">
                  Temporarily disable marketplace on mobile
                </div>
              </div>
              <Switch checked={s.kill_switch} onCheckedChange={(v) => patch({ kill_switch: v })} />
            </div>
            <F label="Kill switch message">
              <Textarea
                rows={2}
                value={s.kill_switch_message}
                onChange={(e) => patch({ kill_switch_message: e.target.value })}
              />
            </F>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Messaging &amp; moderation</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            <F label="Max message length">
              <Input
                type="number"
                value={s.max_message_length}
                onChange={(e) => patch({ max_message_length: Number(e.target.value) })}
              />
            </F>
            <F label="Allowed attachment MIME (comma separated)">
              <Input
                value={s.allowed_attachment_types.join(",")}
                onChange={(e) =>
                  patch({
                    allowed_attachment_types: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
              />
            </F>
            <F label="Moderation banner">
              <Textarea
                rows={2}
                value={s.moderation_banner}
                onChange={(e) => patch({ moderation_banner: e.target.value })}
              />
            </F>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
