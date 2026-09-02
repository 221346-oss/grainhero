import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getFieldSettings, updateFieldSettings } from "@/lib/field-settings.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/platform/field-settings")({
  head: () => ({
    meta: [
      { title: "Platform · Field Settings — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Field Settings workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Field Settings — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Field Settings workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FieldSettingsPage,
});

type S = {
  default_page_size: number;
  max_attachment_mb: number;
  offline_window_hours: number;
  geofence_enforced: boolean;
  actuator_override_allowed: boolean;
  required_photo_rules: Record<string, unknown>;
  incident_categories: string[];
};
const DEFAULTS: S = {
  default_page_size: 100,
  max_attachment_mb: 10,
  offline_window_hours: 48,
  geofence_enforced: false,
  actuator_override_allowed: true,
  required_photo_rules: {},
  incident_categories: ["equipment_fault", "safety", "spillage", "other"],
};

function FieldSettingsPage() {
  const load = useServerFn(getFieldSettings);
  const save = useServerFn(updateFieldSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["field-settings"], queryFn: () => load() });
  const [s, setS] = useState<S>(DEFAULTS);
  useEffect(() => {
    if (data) {
      const d = data as Record<string, unknown>;
      setS({
        default_page_size: (d.default_page_size as number) ?? DEFAULTS.default_page_size,
        max_attachment_mb: (d.max_attachment_mb as number) ?? DEFAULTS.max_attachment_mb,
        offline_window_hours: (d.offline_window_hours as number) ?? DEFAULTS.offline_window_hours,
        geofence_enforced: Boolean(d.geofence_enforced),
        actuator_override_allowed: Boolean(d.actuator_override_allowed),
        required_photo_rules: (d.required_photo_rules as Record<string, unknown>) ?? {},
        incident_categories: (d.incident_categories as string[]) ?? DEFAULTS.incident_categories,
      });
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => save({ data: s }),
    onSuccess: () => {
      toast.success("Field settings saved");
      qc.invalidateQueries({ queryKey: ["field-settings"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const patch = (p: Partial<S>) => setS((prev) => ({ ...prev, ...p }));

  return (
    <AdminPageShell
      title="Field ops mobile settings"
      subtitle="Configure technician-facing mobile behaviors: sync limits, geofence enforcement, attachment ceilings, and incident taxonomy."
      actions={
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sync &amp; offline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <F label="Default page size">
              <Input
                type="number"
                value={s.default_page_size}
                onChange={(e) => patch({ default_page_size: Number(e.target.value) })}
              />
            </F>
            <F label="Max attachment (MB)">
              <Input
                type="number"
                value={s.max_attachment_mb}
                onChange={(e) => patch({ max_attachment_mb: Number(e.target.value) })}
              />
            </F>
            <F label="Offline window (hrs)">
              <Input
                type="number"
                value={s.offline_window_hours}
                onChange={(e) => patch({ offline_window_hours: Number(e.target.value) })}
              />
            </F>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium text-sm">Enforce geofence</div>
                <div className="text-xs text-muted-foreground">
                  Reject check-ins outside allowed radius
                </div>
              </div>
              <Switch
                checked={s.geofence_enforced}
                onCheckedChange={(v) => patch({ geofence_enforced: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <div>
                <div className="font-medium text-sm">Allow actuator override</div>
                <div className="text-xs text-muted-foreground">
                  Let technicians issue actuator commands from mobile
                </div>
              </div>
              <Switch
                checked={s.actuator_override_allowed}
                onCheckedChange={(v) => patch({ actuator_override_allowed: v })}
              />
            </div>
          </CardContent>
        </Card>
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Incident categories &amp; photo rules</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 lg:grid-cols-2">
            <F label="Categories (comma separated)">
              <Input
                value={s.incident_categories.join(",")}
                onChange={(e) =>
                  patch({
                    incident_categories: e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  })
                }
              />
            </F>
            <F label="Required photo rules (JSON)">
              <Textarea
                rows={5}
                value={JSON.stringify(s.required_photo_rules, null, 2)}
                onChange={(e) => {
                  try {
                    patch({ required_photo_rules: JSON.parse(e.target.value) });
                  } catch {
                    /* ignore */
                  }
                }}
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
