import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FinanceCommandSkeleton } from "@/components/app/skeletons";
import { getPlatformFinanceSummary } from "@/lib/finance-ledger.functions";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DollarSign, TrendingUp, Wallet, RefreshCcw, Package, Receipt, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/finance")({
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
  if (isLoading || !data) return <FinanceCommandSkeleton />;
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Finance command center</h1>
          <p className="text-sm text-muted-foreground mt-1">Ledger-driven view of every money movement across the marketplace.</p>
        </div>
        <div className="flex gap-1">
          {[7,30,90].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d}d</Button>
          ))}
        </div>
      </div>

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

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Daily flow ({days}d)</CardTitle></CardHeader>
        <CardContent>
          {trend.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">No ledger activity in this range yet.</div>
          ) : (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="gmv" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="fees" stroke="hsl(142 76% 36%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="refunds" stroke="hsl(0 84% 60%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}