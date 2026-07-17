import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, TrendingUp, TrendingDown, DollarSign, Wallet, Package, Shield, LineChart as LineIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, BarChart, Bar } from "recharts";
import { getFinancialSummary } from "@/lib/financials.functions";

export const Route = createFileRoute("/_authenticated/platform/financials")({
  component: FinancialsPage,
});

const money = (n: number) => `PKR ${Math.round(Number(n ?? 0)).toLocaleString()}`;
const COLORS = ["hsl(var(--primary))", "hsl(262 83% 58%)", "hsl(340 82% 60%)", "hsl(24 95% 55%)"];

function FinancialsPage() {
  const fn = useServerFn(getFinancialSummary);
  const { data, isLoading } = useQuery({ queryKey: ["platform-financials"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="p-8 text-sm text-muted-foreground">Loading financial dashboard…</div>;
  const { kpis, pnl, mix, planSplit, trend } = data;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financial dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide revenue, profit, and subscription health.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/pnl.pdf", "_blank")}><FileDown className="h-4 w-4 mr-1.5" /> P&L PDF</Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/revenue.pdf", "_blank")}><FileDown className="h-4 w-4 mr-1.5" /> Revenue PDF</Button>
          <Button variant="outline" size="sm" onClick={() => window.open("/api/reports/mrr.pdf", "_blank")}><FileDown className="h-4 w-4 mr-1.5" /> MRR PDF</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <KpiCard icon={<DollarSign className="h-4 w-4" />} label="Total revenue" value={money(kpis.totalRevenue)} accent="text-primary" />
        <KpiCard icon={<Wallet className="h-4 w-4" />} label="MRR" value={money(kpis.mrr)} delta={kpis.mrrDelta} accent="text-primary" />
        <KpiCard icon={<Package className="h-4 w-4" />} label="IoT hardware" value={money(kpis.iotRevenue)} sub={`${kpis.totalOrders} orders`} />
        <KpiCard icon={<Shield className="h-4 w-4" />} label="Insurance comm." value={money(kpis.insuranceCommission)} sub={`${kpis.totalPolicies} policies`} />
        <KpiCard icon={<TrendingUp className="h-4 w-4" />} label="Gross profit" value={money(kpis.grossProfit)} accent="text-emerald-600 dark:text-emerald-400" />
        <KpiCard icon={<LineIcon className="h-4 w-4" />} label="Net profit %" value={`${kpis.netProfitPct}%`} accent={kpis.netProfitPct >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* P&L Summary */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">P&L summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <PnlRow label="Total sales" value={money(pnl.sales)} />
            <PnlRow label="Cost of goods sold" value={`- ${money(pnl.cogs)}`} negative />
            <div className="border-t border-border pt-2"><PnlRow label="Gross profit" value={money(pnl.grossProfit)} bold accent="text-primary" /></div>
            <PnlRow label="Operating expenses" value={`- ${money(pnl.opex)}`} negative />
            <PnlRow label="Other income" value={money(pnl.otherIncome)} />
            <div className="border-t border-border pt-2"><PnlRow label="Net profit" value={money(pnl.netProfit)} bold accent={pnl.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"} /></div>
            <PnlRow label="Net profit %" value={`${pnl.netProfitPct}%`} bold />
          </CardContent>
        </Card>

        {/* Revenue mix donut */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">Revenue mix</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mix} innerRadius={55} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                    {mix.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1.5">
              {mix.map((m, i) => (
                <li key={m.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-muted-foreground">{m.name}</span></span>
                  <span className="font-semibold text-foreground">{money(m.value)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* MRR trend */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3"><CardTitle className="text-base">MRR trend (12 mo)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="mrr" name="MRR" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan split */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Revenue by plan</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planSplit} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis type="category" dataKey="plan" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={100} />
                <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Bar dataKey="mrr" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, delta, accent }: { icon: React.ReactNode; label: string; value: string; sub?: string; delta?: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2 text-muted-foreground text-xs uppercase tracking-wide font-semibold">
          <span>{label}</span>
          <span className="text-muted-foreground/70">{icon}</span>
        </div>
        <div className={`text-lg font-bold ${accent ?? "text-foreground"}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        {typeof delta === "number" && (
          <div className={`text-xs mt-1 inline-flex items-center gap-1 ${delta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {delta >= 0 ? "+" : ""}{money(delta)} MoM
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PnlRow({ label, value, bold, negative, accent }: { label: string; value: string; bold?: boolean; negative?: boolean; accent?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</span>
      <span className={`${bold ? "font-bold" : "font-medium"} ${accent ?? (negative ? "text-red-600 dark:text-red-400" : "text-foreground")}`}>{value}</span>
    </div>
  );
}
