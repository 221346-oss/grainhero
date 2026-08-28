import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinanceCommandSkeleton } from "@/components/app/skeletons";
import { getPlatformFinanceSummary } from "@/lib/finance-ledger.functions";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  NEON,
  NeonPatternDefs,
  neonGrid,
  neonAxis,
  neonTooltipStyle,
  NeonLegend,
  HairlineGrid,
  NeonPanel,
  ChartEmpty,
} from "@/components/charts/neon";
import { DollarSign, TrendingUp, Wallet, RefreshCcw, Package, Receipt, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/finance")({
  head: () => ({
    meta: [
      { title: "Platform · Finance — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Finance workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Finance — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Finance workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FinanceCommandPage,
});

function money(n: number, cur = "USD") {
  return `${cur} ${Math.round(Number(n ?? 0)).toLocaleString()}`;
}

function FinanceCommandPage() {
  const fn = useServerFn(getPlatformFinanceSummary);
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery({
    queryKey: ["finance-summary", days],
    queryFn: () => fn({ data: { days } }),
  });
  if (isLoading || !data)
    return (
      <AdminPageShell
        title="Finance"
        subtitle="Ledger-driven view of every money movement across the marketplace"
      >
        <FinanceCommandSkeleton />
      </AdminPageShell>
    );
  const { totals, trend, currency } = data;
  const tiles = [
    { label: "GMV", value: totals.gmv, icon: DollarSign },
    { label: "Platform fees", value: totals.platformFees, icon: TrendingUp },
    { label: "Net revenue", value: totals.netRevenue, icon: Wallet },
    { label: "Refunds", value: totals.refunds, icon: RefreshCcw },
    { label: "Tax collected", value: totals.tax, icon: Receipt },
    { label: "Logistics cost", value: totals.logistics, icon: Truck },
    { label: "Pending payouts", value: totals.pendingPayouts, icon: Package },
  ];
  return (
    <AdminPageShell
      title="Finance"
      subtitle="Ledger-driven view of every money movement across the marketplace"
      actions={
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      }
    >
      <div className="space-y-6 max-w-[1400px]">
        <NeonPatternDefs />

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {tiles.map((t) => (
            <Card key={t.label} className="hover:border-primary/40 transition-colors">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-wide">
                  <span>{t.label}</span>
                  <t.icon className="h-3.5 w-3.5" />
                </div>
                <div className="text-lg font-bold tabular-nums">{money(t.value, currency)}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <HairlineGrid cols="grid-cols-1">
          <NeonPanel title="Daily flow" subtitle={`Last ${days} days`}>
            {trend.length === 0 ? (
              <ChartEmpty label="No ledger activity in this range yet" height={300} />
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid {...neonGrid} />
                    <XAxis dataKey="day" {...neonAxis} />
                    <YAxis {...neonAxis} />
                    <Tooltip {...neonTooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="gmv"
                      name="GMV"
                      stroke={NEON.brand}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="fees"
                      name="Fees"
                      stroke={NEON.brand2}
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="refunds"
                      name="Refunds"
                      stroke={NEON.critical}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <NeonLegend
              items={[
                { label: "GMV", color: NEON.brand },
                { label: "Fees", color: NEON.brand2 },
                { label: "Refunds", color: NEON.critical },
              ]}
            />
          </NeonPanel>
        </HairlineGrid>
      </div>
    </AdminPageShell>
  );
}
