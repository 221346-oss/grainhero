import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getOrderAuditTimeline } from "@/lib/order-audit-timeline.functions";
import { ArrowLeft, Truck, ShoppingCart, ScrollText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/orders/$orderId/audit")({
  head: () => ({
    meta: [
      { title: "Platform · Orders · OrderId · Audit — Grain Hero" },
      { name: "description", content: "Platform · Orders · OrderId · Audit workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Orders · OrderId · Audit — Grain Hero" },
      { property: "og:description", content: "Platform · Orders · OrderId · Audit workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: OrderAuditPage,
});

const SOURCE_ICON: Record<string, React.ReactNode> = {
  shipment_event: <Truck className="h-3.5 w-3.5" />,
  order_event: <ShoppingCart className="h-3.5 w-3.5" />,
  activity_log: <ScrollText className="h-3.5 w-3.5" />,
};

function OrderAuditPage() {
  const { orderId } = Route.useParams();
  const load = useServerFn(getOrderAuditTimeline);
  const [source, setSource] = useState<"all" | "shipment_event" | "order_event" | "activity_log">("all");
  const [actorRole, setActorRole] = useState<string>("all");
  const [manualOnly, setManualOnly] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["order-audit-timeline", orderId, source, actorRole, manualOnly],
    queryFn: () => load({
      data: {
        orderId,
        sources: source === "all" ? undefined : [source],
        actorRole: actorRole === "all" ? undefined : actorRole,
        manualOnly: manualOnly || undefined,
      },
    }),
  });

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const e of data?.entries ?? []) if (e.actorRole) set.add(e.actorRole);
    return Array.from(set).sort();
  }, [data]);

  return (
    <AdminPageShell
      title={data ? `Audit · ${data.order.orderNumber}` : "Order audit"}
      subtitle="Every shipment audit event, order-state change, and activity log entry for this order."
      actions={
        <Link to="/platform/orders/$orderId" params={{ orderId }}>
          <Button variant="outline" size="sm"><ArrowLeft className="h-3 w-3 mr-1" /> Back to order</Button>
        </Link>
      }
    >
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex flex-wrap items-center gap-3">
            <span>Filters</span>
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="shipment_event">Shipment events</SelectItem>
                <SelectItem value="order_event">Order events</SelectItem>
                <SelectItem value="activity_log">Activity log</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actorRole} onValueChange={setActorRole}>
              <SelectTrigger className="w-40 h-8"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any role</SelectItem>
                {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={manualOnly} onCheckedChange={setManualOnly} /> Manual changes only
            </label>
            {data && (
              <span className="ml-auto text-xs text-muted-foreground">
                {data.counts.shipment_event} shipment · {data.counts.order_event} order · {data.counts.activity_log} log
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <div className="text-sm text-muted-foreground">Loading timeline…</div>}
          {!isLoading && (data?.entries.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">No entries match these filters.</div>
          )}
          <div className="space-y-2">
            {data?.entries.map((e) => (
              <div key={e.id} className="border-l-2 border-emerald-500 pl-3 py-2 hover:bg-emerald-50/30 rounded-r transition-colors">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="gap-1">
                    {SOURCE_ICON[e.source]}
                    {e.source.replace("_", " ")}
                  </Badge>
                  <span className="font-medium">{e.kind}</span>
                  {e.actorRole && <Badge variant="secondary" className="text-[10px]">{e.actorRole}</Badge>}
                  {e.actorName && <span className="text-xs text-muted-foreground">by {e.actorName}</span>}
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</span>
                </div>
                {e.note && <div className="text-xs text-muted-foreground mt-1">{e.note}</div>}
                {e.metadata && Object.keys(e.metadata as object).length > 0 && (
                  <details className="mt-1">
                    <summary className="text-[10px] text-muted-foreground cursor-pointer">metadata</summary>
                    <pre className="text-[10px] bg-slate-50 dark:bg-slate-900 rounded p-2 mt-1 overflow-x-auto">
                      {JSON.stringify(e.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
