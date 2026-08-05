import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getCommerceSettings, updateCommerceSettings } from "@/lib/mobile-commerce-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

type S = {
  checkout_enabled: boolean;
  allowed_payment_methods: string[];
  min_order_cents: number;
  max_order_cents: number;
  platform_fee_bps: number;
  currency_default: string;
  terms_url: string | null;
  refund_policy_url: string | null;
  stripe_publishable_key_override: string | null;
  cod_max_cents: number;
  quote_ttl_seconds: number;
};
const DEFAULTS: S = {
  checkout_enabled: false,
  allowed_payment_methods: ["card"],
  min_order_cents: 500,
  max_order_cents: 500000,
  platform_fee_bps: 250,
  currency_default: "usd",
  terms_url: null, refund_policy_url: null, stripe_publishable_key_override: null,
  cod_max_cents: 0,
  quote_ttl_seconds: 300,
};

export const Route = createFileRoute("/_authenticated/platform/commerce-mobile")({
  head: () => ({
    meta: [
      { title: "Platform · Commerce Mobile — Grain Hero" },
      { name: "description", content: "Platform · Commerce Mobile workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Commerce Mobile — Grain Hero" },
      { property: "og:description", content: "Platform · Commerce Mobile workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CommerceMobilePage,
});

function CommerceMobilePage() {
  const load = useServerFn(getCommerceSettings);
  const save = useServerFn(updateCommerceSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["mobile-commerce-settings"], queryFn: () => load() });
  const [s, setS] = useState<S>(DEFAULTS);
  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setS({
        checkout_enabled: Boolean(d.checkout_enabled),
        allowed_payment_methods: (d.allowed_payment_methods as string[]) ?? DEFAULTS.allowed_payment_methods,
        min_order_cents: (d.min_order_cents as number) ?? DEFAULTS.min_order_cents,
        max_order_cents: (d.max_order_cents as number) ?? DEFAULTS.max_order_cents,
        platform_fee_bps: (d.platform_fee_bps as number) ?? DEFAULTS.platform_fee_bps,
        currency_default: (d.currency_default as string) ?? DEFAULTS.currency_default,
        terms_url: (d.terms_url as string | null) ?? null,
        refund_policy_url: (d.refund_policy_url as string | null) ?? null,
        stripe_publishable_key_override: (d.stripe_publishable_key_override as string | null) ?? null,
        cod_max_cents: (d.cod_max_cents as number) ?? DEFAULTS.cod_max_cents,
        quote_ttl_seconds: (d.quote_ttl_seconds as number) ?? DEFAULTS.quote_ttl_seconds,
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => save({ data: s }),
    onSuccess: () => { toast.success("Commerce settings saved"); qc.invalidateQueries({ queryKey: ["mobile-commerce-settings"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const patch = (p: Partial<S>) => setS((prev) => ({ ...prev, ...p }));

  return (
    <AdminPageShell
      title="Mobile commerce"
      subtitle="Control checkout availability, payment methods, order ceilings, platform fee, and legal links surfaced in the mobile buyer app."
      actions={<Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save changes"}</Button>}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Availability</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded border p-3">
              <div><div className="font-medium text-sm">Checkout enabled</div><div className="text-xs text-muted-foreground">Turn mobile buyer checkout on or off</div></div>
              <Switch checked={s.checkout_enabled} onCheckedChange={(v) => patch({ checkout_enabled: v })} />
            </div>
            <F label="Allowed payment methods (comma separated)">
              <Input value={s.allowed_payment_methods.join(",")}
                onChange={(e) => patch({ allowed_payment_methods: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
            </F>
            <F label="Default currency (ISO)"><Input value={s.currency_default} onChange={(e) => patch({ currency_default: e.target.value.toLowerCase() })} /></F>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Limits &amp; fees</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <F label="Min order (cents)"><Input type="number" value={s.min_order_cents} onChange={(e) => patch({ min_order_cents: Number(e.target.value) })} /></F>
            <F label="Max order (cents)"><Input type="number" value={s.max_order_cents} onChange={(e) => patch({ max_order_cents: Number(e.target.value) })} /></F>
            <F label="Platform fee (bps)"><Input type="number" value={s.platform_fee_bps} onChange={(e) => patch({ platform_fee_bps: Number(e.target.value) })} /></F>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Checkout behaviour</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <F label="Cash-on-delivery max (cents, 0 = disabled)">
              <Input type="number" value={s.cod_max_cents} onChange={(e) => patch({ cod_max_cents: Number(e.target.value) })} />
            </F>
            <F label="Quote TTL (seconds)">
              <Input type="number" value={s.quote_ttl_seconds} onChange={(e) => patch({ quote_ttl_seconds: Number(e.target.value) })} />
            </F>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader><CardTitle>Legal &amp; overrides</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <F label="Terms URL"><Input value={s.terms_url ?? ""} onChange={(e) => patch({ terms_url: e.target.value || null })} /></F>
            <F label="Refund policy URL"><Input value={s.refund_policy_url ?? ""} onChange={(e) => patch({ refund_policy_url: e.target.value || null })} /></F>
            <F label="Stripe publishable key (optional override)">
              <Input value={s.stripe_publishable_key_override ?? ""} onChange={(e) => patch({ stripe_publishable_key_override: e.target.value || null })} />
            </F>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}