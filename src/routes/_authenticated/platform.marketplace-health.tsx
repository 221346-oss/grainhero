import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMarketplaceHealth } from "@/lib/marketplace-health.functions";

export const Route = createFileRoute("/_authenticated/platform/marketplace-health")({
  head: () => ({
    meta: [
      { title: "Platform · Marketplace Health — Grain Hero" },
      { name: "description", content: "Platform · Marketplace Health workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Marketplace Health — Grain Hero" },
      { property: "og:description", content: "Platform · Marketplace Health workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MarketplaceHealthPage,
});

function MarketplaceHealthPage() {
  const load = useServerFn(getMarketplaceHealth);
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace-health", days],
    queryFn: () => load({ data: { days } }),
  });
  return (
    <AdminPageShell
      title="Marketplace health"
      subtitle="GMV, funnel, and quality signals across all sellers."
      actions={
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {isLoading || !data ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Tile label={`GMV (${data.currency})`} value={data.gmv.toFixed(2)} tone="emerald" />
            <Tile label="Refunded" value={data.refundedTotal.toFixed(2)} tone="rose" />
            <Tile label="Net revenue" value={data.netRevenue.toFixed(2)} />
            <Tile label="Listings created" value={data.funnel.listingsCreated} />
          </div>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Funnel</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <Cell label="Placed" v={data.funnel.ordersPlaced} />
              <Cell label="Paid" v={data.funnel.ordersPaid} />
              <Cell label="Delivered" v={data.funnel.ordersDelivered} />
              <Cell label="Reviewed" v={data.funnel.ordersReviewed} />
              <Cell label="Listings" v={data.funnel.listingsCreated} />
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <ReasonCard title="Cancellations" rows={data.cancelReasons} />
            <ReasonCard title="Disputes" rows={data.disputeCategories} />
            <ReasonCard title="Refunds" rows={data.refundReasons} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <SellerCard title="Top sellers" sellers={data.topSellers} scoreLabel="Score" scoreKey="score" verifiedMin={data.verifiedThreshold} />
            <SellerCard title="Highest dispute rate" sellers={data.worstByDisputes} scoreLabel="Disputes" scoreKey="disputeRate" verifiedMin={data.verifiedThreshold} pct />
          </div>
        </div>
      )}
    </AdminPageShell>
  );
}

function Tile({ label, value, tone }: { label: string; value: number | string; tone?: "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : "";
  return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className={`text-2xl font-semibold ${color}`}>{value}</div></CardContent></Card>;
}
function Cell({ label, v }: { label: string; v: number }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-semibold">{v}</div></div>;
}
function ReasonCard({ title, rows }: { title: string; rows: Array<{ key: string; count: number }> }) {
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="text-sm">
        {rows.length === 0 ? <div className="text-muted-foreground">None in window.</div> : (
          <ul className="space-y-1">
            {rows.slice(0, 8).map((r) => (
              <li key={r.key} className="flex justify-between"><span>{r.key}</span><span className="font-medium">{r.count}</span></li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
function SellerCard({ title, sellers, scoreLabel, scoreKey, verifiedMin, pct }: {
  title: string; sellers: Array<{ adminId: string; score: number; disputeRate: number; avgRating: number }>;
  scoreLabel: string; scoreKey: "score" | "disputeRate"; verifiedMin: number; pct?: boolean;
}) {
  return (
    <Card><CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="text-sm">
        {sellers.length === 0 ? <div className="text-muted-foreground">No data.</div> : (
          <ul className="space-y-1">
            {sellers.map((s) => {
              const v = s[scoreKey];
              const label = pct ? `${Math.round(v * 100)}%` : v;
              return (
                <li key={s.adminId} className="flex justify-between items-center">
                  <a href={`/admins/${s.adminId}`} className="font-mono text-xs text-emerald-700 hover:underline">{s.adminId.slice(0, 8)}</a>
                  <span className={s.score >= verifiedMin ? "text-emerald-700 font-semibold" : "text-foreground"}>{scoreLabel}: {label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}