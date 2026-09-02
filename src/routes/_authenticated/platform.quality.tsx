import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listPendingCertificates, verifyCertificate } from "@/lib/quality-certificates.functions";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/quality")({
  head: () => ({
    meta: [
      { title: "Platform · Quality — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Quality workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Quality — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Quality workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: QualityQueue,
});

function QualityQueue() {
  const list = useServerFn(listPendingCertificates);
  const verify = useServerFn(verifyCertificate);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-quality-queue"],
    queryFn: () => list(),
  });
  const m = useMutation({
    mutationFn: (args: { id: string; approved: boolean }) =>
      verify({ data: { certificateId: args.id, approved: args.approved } }),
    onSuccess: () => {
      toast.success("Recorded");
      qc.invalidateQueries({ queryKey: ["platform-quality-queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AdminPageShell
      title="Quality certificates"
      subtitle="Verify submitted batch quality certificates."
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {data?.certificates?.length ?? 0} pending
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left border-b">
              <tr>
                <th className="p-3">Batch</th>
                <th>Lab</th>
                <th>Auto</th>
                <th>Issued</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!isLoading && (data?.certificates?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    Nothing pending.
                  </td>
                </tr>
              )}
              {data?.certificates?.map((c) => (
                <tr key={c.id as string} className="border-b hover:bg-emerald-50/30">
                  <td className="p-3 font-mono text-xs">
                    {(c.grain_batches as { batch_id?: string } | null)?.batch_id ??
                      String(c.batch_id).slice(0, 8)}
                  </td>
                  <td>{(c.lab_name as string) ?? "—"}</td>
                  <td>
                    <Badge variant="outline" className="capitalize">
                      {c.status as string}
                    </Badge>
                  </td>
                  <td className="text-xs text-muted-foreground">
                    {c.issued_at ? new Date(c.issued_at as string).toLocaleDateString() : "—"}
                  </td>
                  <td className="space-x-2">
                    <Button
                      size="sm"
                      onClick={() => m.mutate({ id: c.id as string, approved: true })}
                      disabled={m.isPending}
                    >
                      Verify
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => m.mutate({ id: c.id as string, approved: false })}
                      disabled={m.isPending}
                    >
                      Reject
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
