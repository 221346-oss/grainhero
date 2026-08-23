import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { listDeepLinks, upsertDeepLink, deleteDeepLink } from "@/lib/mobile-deep-links.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/platform/mobile-deep-links")({
  head: () => ({
    meta: [
      { title: "Platform · Mobile Deep Links — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Mobile Deep Links workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Mobile Deep Links — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Mobile Deep Links workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MobileDeepLinksPage,
});

type Row = {
  id?: string;
  key: string;
  native_route: string;
  web_fallback: string;
  description?: string;
  active: boolean;
};

function MobileDeepLinksPage() {
  const load = useServerFn(listDeepLinks);
  const save = useServerFn(upsertDeepLink);
  const del = useServerFn(deleteDeepLink);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["mobile-deep-links"], queryFn: () => load() });
  const rows = (data?.rows ?? []) as Row[];

  const [draft, setDraft] = useState<Row>({
    key: "",
    native_route: "",
    web_fallback: "",
    active: true,
  });

  const saveMut = useMutation({
    mutationFn: (row: Row) => save({ data: row } as never),
    onSuccess: () => {
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["mobile-deep-links"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["mobile-deep-links"] });
    },
  });

  return (
    <AdminPageShell
      title="Mobile deep links"
      subtitle="Map notification and share URLs to native app routes plus web fallbacks. Every entry is resolved through GET /api/public/v1/deeplink/:key."
    >
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add / update route</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Key (e.g. alert.detail)">
              <Input
                value={draft.key}
                onChange={(e) => setDraft({ ...draft, key: e.target.value })}
              />
            </Field>
            <Field label="Native route (:params allowed)">
              <Input
                value={draft.native_route}
                onChange={(e) => setDraft({ ...draft, native_route: e.target.value })}
              />
            </Field>
            <Field label="Web fallback">
              <Input
                value={draft.web_fallback}
                onChange={(e) => setDraft({ ...draft, web_fallback: e.target.value })}
              />
            </Field>
            <Field label="Description">
              <Input
                value={draft.description ?? ""}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </Field>
            <div className="flex items-center justify-between rounded-md p-3">
              <span className="text-sm">Active</span>
              <Switch
                checked={draft.active}
                onCheckedChange={(v) => setDraft({ ...draft, active: v })}
              />
            </div>
            <Button
              onClick={() => saveMut.mutate(draft)}
              disabled={saveMut.isPending || !draft.key}
            >
              Save
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configured routes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">No routes configured.</p>
            )}
            {rows.map((r) => (
              <div key={r.id ?? r.key} className="rounded-md p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-mono">{r.key}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDraft(r)}>
                      Edit
                    </Button>
                    {r.id && (
                      <Button size="sm" variant="ghost" onClick={() => delMut.mutate(r.id!)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  <div>
                    native: <span className="font-mono">{r.native_route}</span>
                  </div>
                  <div>
                    web: <span className="font-mono">{r.web_fallback}</span>
                  </div>
                  {r.description && <div className="mt-1">{r.description}</div>}
                </div>
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
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
