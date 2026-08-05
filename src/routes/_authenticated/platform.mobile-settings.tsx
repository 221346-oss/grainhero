import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DEFAULT_MOBILE_SETTINGS,
  getMobileSettings,
  updateMobileSettings,
  type MobileSettingsShape,
} from "@/lib/mobile-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/platform/mobile-settings")({
  head: () => ({
    meta: [
      { title: "Platform · Mobile Settings — Grain Hero" },
      { name: "description", content: "Platform · Mobile Settings workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Mobile Settings — Grain Hero" },
      { property: "og:description", content: "Platform · Mobile Settings workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MobileSettingsPage,
});

function MobileSettingsPage() {
  const load = useServerFn(getMobileSettings);
  const save = useServerFn(updateMobileSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["mobile-settings"], queryFn: () => load() });
  const [s, setS] = useState<MobileSettingsShape>(DEFAULT_MOBILE_SETTINGS);
  useEffect(() => { if (data?.settings) setS(data.settings); }, [data]);

  const mut = useMutation({
    mutationFn: () => save({ data: s }),
    onSuccess: () => {
      toast.success("Mobile settings updated");
      qc.invalidateQueries({ queryKey: ["mobile-settings"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const patch = (p: Partial<MobileSettingsShape>) => setS((prev) => ({ ...prev, ...p }));

  return (
    <AdminPageShell
      title="Mobile app settings"
      subtitle="Control mobile client versioning, sync limits, upload buckets, feature flags, and deep-link scheme. Applied to every Flutter build on next refresh."
      actions={<Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save changes"}</Button>}
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Versioning</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Field label="Min build">
              <Input type="number" value={s.min_build} onChange={(e) => patch({ min_build: Number(e.target.value) })} />
            </Field>
            <Field label="Latest build">
              <Input type="number" value={s.latest_build} onChange={(e) => patch({ latest_build: Number(e.target.value) })} />
            </Field>
            <Field label="Force update below">
              <Input type="number" value={s.force_update_below} onChange={(e) => patch({ force_update_below: Number(e.target.value) })} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sync limits</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <Field label="Default page size">
              <Input type="number" value={s.sync_page_size} onChange={(e) => patch({ sync_page_size: Number(e.target.value) })} />
            </Field>
            <Field label="Max page size">
              <Input type="number" value={s.max_sync_page_size} onChange={(e) => patch({ max_sync_page_size: Number(e.target.value) })} />
            </Field>
            <Field label="Heartbeat (seconds)">
              <Input type="number" value={s.heartbeat_interval_seconds} onChange={(e) => patch({ heartbeat_interval_seconds: Number(e.target.value) })} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Deep link</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="URI scheme">
              <Input value={s.deep_link.scheme} onChange={(e) => patch({ deep_link: { ...s.deep_link, scheme: e.target.value } })} />
            </Field>
            <Field label="Universal host">
              <Input value={s.deep_link.universal_host} onChange={(e) => patch({ deep_link: { ...s.deep_link, universal_host: e.target.value } })} />
            </Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Uploads &amp; flags (JSON)</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Upload buckets">
              <Textarea rows={6} value={JSON.stringify(s.uploads, null, 2)}
                onChange={(e) => { try { patch({ uploads: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} />
            </Field>
            <Field label="Feature flags">
              <Textarea rows={4} value={JSON.stringify(s.feature_flags, null, 2)}
                onChange={(e) => { try { patch({ feature_flags: JSON.parse(e.target.value) }); } catch { /* ignore */ } }} />
            </Field>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
