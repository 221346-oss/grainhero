import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { RefreshCw, Play } from "lucide-react";
import { toast } from "sonner";
import {
  listInsuranceWebhookEvents,
  replayInsuranceWebhookEvent,
} from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/platform/insurance/webhooks")({
  head: () => ({
    meta: [
      { title: "Platform · Insurance · Webhooks — Grain Hero" },
      { name: "description", content: "Platform · Insurance · Webhooks workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Insurance · Webhooks — Grain Hero" },
      { property: "og:description", content: "Platform · Insurance · Webhooks workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: WebhookMonitor,
});

type EventRow = {
  id: string; carrier_code: string | null; event_type: string | null;
  status: string; error_message: string | null; external_id: string | null;
  created_at: string; processed_at: string | null;
  policy_id: string | null; claim_id: string | null;
  raw: unknown; headers: unknown;
  carrier?: { name?: string } | null;
};

const STATUS_BADGE: Record<string, string> = {
  processed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  error: "bg-red-100 text-red-700 border-red-200",
  received: "bg-amber-100 text-amber-700 border-amber-200",
};

function WebhookMonitor() {
  const list = useServerFn(listInsuranceWebhookEvents);
  const replay = useServerFn(replayInsuranceWebhookEvent);
  const [status, setStatus] = useState<"all"|"received"|"processed"|"error">("all");
  const [detail, setDetail] = useState<EventRow | null>(null);

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["ins-webhooks", status],
    queryFn: () => list({ data: { status, limit: 200 } }),
  });

  const replayMut = useMutation({
    mutationFn: (id: string) => replay({ data: { event_id: id } }),
    onSuccess: (r) => {
      if (r.ok) toast.success("Replayed successfully");
      else toast.error(`Replay failed: ${r.result?.error ?? "unknown"}`);
      refetch();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const events = (data?.events ?? []) as EventRow[];
  const failed = events.filter((e) => e.status === "error").length;
  const processed = events.filter((e) => e.status === "processed").length;

  return (
    <AdminPageShell
      title="Insurance Webhook Monitor"
      subtitle="Failed carrier webhook events with manual replay controls."
      actions={
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Failed" value={failed} tone="red" />
        <StatTile label="Processed" value={processed} tone="emerald" />
        <StatTile label="Total shown" value={events.length} tone="slate" />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Status</span>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["all","received","processed","error"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No webhook events for the current filter
                </TableCell></TableRow>
              )}
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{new Date(e.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{e.carrier?.name ?? e.carrier_code ?? "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{e.event_type ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">{e.external_id ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${STATUS_BADGE[e.status] ?? ""}`}>{e.status}</Badge>
                    {e.error_message && (
                      <div className="text-[10px] text-red-500 mt-1 truncate max-w-[220px]" title={e.error_message}>
                        {e.error_message}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" variant="outline" onClick={() => setDetail(e)}>Details</Button>
                      <Button
                        size="sm"
                        disabled={replayMut.isPending}
                        onClick={() => replayMut.mutate(e.id)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <Play className="h-3.5 w-3.5 mr-1" /> Replay
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-[560px] sm:max-w-[560px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Webhook event</SheetTitle>
          </SheetHeader>
          {detail && (
            <div className="space-y-4 mt-4 text-sm">
              <div><span className="text-muted-foreground">Status:</span> {detail.status}</div>
              <div><span className="text-muted-foreground">Carrier:</span> {detail.carrier?.name ?? detail.carrier_code}</div>
              <div><span className="text-muted-foreground">Event:</span> {detail.event_type}</div>
              <div><span className="text-muted-foreground">External ID:</span> {detail.external_id ?? "—"}</div>
              {detail.error_message && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {detail.error_message}
                </div>
              )}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Payload</div>
                <pre className="text-[11px] bg-muted/20 p-2 rounded border overflow-auto max-h-64">
{JSON.stringify(detail.raw, null, 2)}
                </pre>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Headers</div>
                <pre className="text-[11px] bg-muted/20 p-2 rounded border overflow-auto max-h-40">
{JSON.stringify(detail.headers, null, 2)}
                </pre>
              </div>
              <Button
                onClick={() => replayMut.mutate(detail.id)}
                disabled={replayMut.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Play className="h-4 w-4 mr-2" /> Replay this event
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </AdminPageShell>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: "red"|"emerald"|"slate" }) {
  const cls = tone === "red" ? "text-red-600" : tone === "emerald" ? "text-emerald-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground uppercase">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}