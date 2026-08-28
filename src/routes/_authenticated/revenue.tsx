import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DollarSign,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Search,
  Wallet,
} from "lucide-react";
import { getRevenueOverview, markInvoicePaid } from "@/lib/billing.functions";
import { KpiChartHubSkeleton } from "@/components/app/skeletons";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { LocalizedContent, translateText, useI18n } from "@/i18n";

export const Route = createFileRoute("/_authenticated/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue — Grain Hero" },
      {
        name: "description",
        content: "Revenue workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Revenue — Grain Hero" },
      { property: "og:description", content: "Revenue workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RevenuePage,
});

function payBadge(s: string | null) {
  switch (s) {
    case "paid":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "partial":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "overdue":
      return "bg-red-100 text-red-800 border-red-200";
    case "cancelled":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-blue-100 text-blue-800 border-blue-200";
  }
}

function money(n: number, ccy: string | null | undefined) {
  return `${ccy ?? "PKR"} ${Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to aggregate revenue data by month
function aggregateByMonth(invoices: any[]) {
  const monthMap = new Map<string, { invoiced: number; collected: number; count: number }>();

  for (const inv of invoices) {
    const date = new Date(inv.created_at);
    const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = monthMap.get(yearMonth) || { invoiced: 0, collected: 0, count: 0 };

    existing.invoiced += Number(inv.total_amount ?? 0);
    existing.count += 1;
    if (inv.payment_status === "paid") {
      existing.collected += Number(inv.total_amount ?? 0);
    }

    monthMap.set(yearMonth, existing);
  }

  // Sort and format for chart
  return Array.from(monthMap.entries())
    .sort()
    .map(([month, data]) => {
      const [year, monthNum] = month.split("-");
      const date = new Date(Number(year), Number(monthNum) - 1);
      const label = date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
      return {
        month: label,
        invoiced: Math.round(data.invoiced),
        collected: Math.round(data.collected),
        count: data.count,
      };
    });
}

// Helper to aggregate revenue data by year
function aggregateByYear(invoices: any[]) {
  const yearMap = new Map<string, { invoiced: number; collected: number; count: number }>();

  for (const inv of invoices) {
    const date = new Date(inv.created_at);
    const year = String(date.getFullYear());
    const existing = yearMap.get(year) || { invoiced: 0, collected: 0, count: 0 };

    existing.invoiced += Number(inv.total_amount ?? 0);
    existing.count += 1;
    if (inv.payment_status === "paid") {
      existing.collected += Number(inv.total_amount ?? 0);
    }

    yearMap.set(year, existing);
  }

  // Sort and format for chart
  return Array.from(yearMap.entries())
    .sort()
    .map(([year, data]) => ({
      year,
      invoiced: Math.round(data.invoiced),
      collected: Math.round(data.collected),
      count: data.count,
    }));
}


function RevenuePage() {
  const { locale } = useI18n();
  const fn = useServerFn(getRevenueOverview);
  const markFn = useServerFn(markInvoicePaid);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["revenue"], queryFn: () => fn() });

  const [q, setQ] = useState("");
  const [chartPeriod, setChartPeriod] = useState<"month" | "year">("month");

  const markM = useMutation({
    mutationFn: (id: string) => markFn({ data: { id } }),
    onSuccess: () => {
      toast.success(translateText("Invoice marked paid", locale));
      qc.invalidateQueries({ queryKey: ["revenue"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const invoices = data?.invoices ?? [];
  const payments = data?.payments ?? [];
  const totals = data?.totals ?? {
    invoiced: 0,
    paid: 0,
    outstanding: 0,
    overdue: 0,
    countInvoices: 0,
    countPayments: 0,
    collected: 0,
  };
  const byStatus = data?.byStatus ?? {};

  const filteredInv = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter(
      (i: any) =>
        i.invoice_number?.toLowerCase().includes(term) ||
        i.buyer_name?.toLowerCase().includes(term) ||
        i.buyer_company?.toLowerCase().includes(term) ||
        i.batch_ref?.toLowerCase().includes(term),
    );
  }, [invoices, q]);

  // Compute chart data
  const monthlyData = useMemo(() => aggregateByMonth(invoices), [invoices]);
  const yearlyData = useMemo(() => aggregateByYear(invoices), [invoices]);
  const chartData = chartPeriod === "month" ? monthlyData : yearlyData;
  const xAxisKey = chartPeriod === "month" ? "month" : "year";

  if (isLoading) return <KpiChartHubSkeleton />;

  return (
    <LocalizedContent>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="h-6 w-6 text-emerald-600" /> Revenue
        </h1>
        <p className="text-sm text-slate-500 mt-1">Buyer invoices, collections and cash flow.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Invoiced</div>
              <div className="text-2xl font-bold">{money(totals.invoiced, "PKR")}</div>
              <div className="text-xs text-slate-500 mt-1">{totals.countInvoices} invoices</div>
            </div>
            <FileText className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Collected</div>
              <div className="text-2xl font-bold text-emerald-600">{money(totals.paid, "PKR")}</div>
              <div className="text-xs text-slate-500 mt-1">{totals.countPayments} payments</div>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Outstanding</div>
              <div className="text-2xl font-bold text-amber-600">
                {money(totals.outstanding, "PKR")}
              </div>
            </div>
            <TrendingUp className="h-6 w-6 text-amber-600" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <div className="text-xs uppercase text-slate-500 font-semibold">Overdue</div>
              <div className="text-2xl font-bold text-red-600">{totals.overdue}</div>
              <div className="text-xs text-slate-500 mt-1">past due</div>
            </div>
            <AlertCircle className="h-6 w-6 text-red-600" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">By status</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {Object.entries(byStatus).map(([k, v]) => (
            <Badge key={k} className={payBadge(k)}>
              {k}: {String(v)}
            </Badge>
          ))}
          {Object.keys(byStatus).length === 0 && (
            <span className="text-sm text-slate-500">No invoices yet.</span>
          )}
        </CardContent>
      </Card>

      {/* Revenue Analytics Charts */}
      {chartData.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Revenue Analytics</h2>
              <p className="text-sm text-slate-500 mt-1">
                Invoiced vs collected revenue over time
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={chartPeriod === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartPeriod("month")}
                className="text-xs"
              >
                Monthly
              </Button>
              <Button
                variant={chartPeriod === "year" ? "default" : "outline"}
                size="sm"
                onClick={() => setChartPeriod("year")}
                className="text-xs"
              >
                Yearly
              </Button>
            </div>
          </div>

          {/* Bar Chart - Invoiced vs Collected */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Invoiced vs Collected</CardTitle>
              <CardDescription>Revenue comparison by {chartPeriod}</CardDescription>
            </CardHeader>
            <CardContent className="pl-0 pr-4">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey={xAxisKey} 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: any) => [
                      `PKR ${Number(value).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}`,
                      value === "invoiced" ? "Invoiced" : "Collected",
                    ]}
                    labelFormatter={(label) => `${chartPeriod === "month" ? "Month" : "Year"}: ${label}`}
                    contentStyle={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: "20px" }}
                    iconType="square"
                  />
                  <Bar 
                    dataKey="invoiced" 
                    fill="#10b981" 
                    name="Invoiced"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="collected" 
                    fill="#059669" 
                    name="Collected"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Line Chart - Revenue Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Revenue Trend</CardTitle>
              <CardDescription>Total invoiced amount trend over time</CardDescription>
            </CardHeader>
            <CardContent className="pl-0 pr-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={chartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey={xAxisKey} 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(value: any) => `PKR ${Number(value).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}`}
                    labelFormatter={(label) => `${chartPeriod === "month" ? "Month" : "Year"}: ${label}`}
                    contentStyle={{
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                  <Line 
                    type="monotone" 
                    dataKey="invoiced" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Invoiced"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="collected" 
                    stroke="#059669" 
                    strokeWidth={2}
                    dot={{ fill: "#059669", r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Collected"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center gap-3">
              <div>
                <CardTitle>Buyer invoices</CardTitle>
                <CardDescription>
                  {filteredInv.length} of {invoices.length}
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search…"
                  className="pl-8 w-64"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredInv.map((i: any) => {
                  const remaining = Math.max(
                    0,
                    Number(i.total_amount) - Number(i.amount_paid ?? 0),
                  );
                  return (
                    <div key={i.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{i.invoice_number}</span>
                          <Badge className={payBadge(i.payment_status)}>
                            {i.payment_status ?? "pending"}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {i.buyer_name ?? "—"}
                          {i.buyer_company ? ` · ${i.buyer_company}` : ""}
                          {i.batch_ref ? ` · ${i.batch_ref}` : ""}
                          {i.due_date ? ` · due ${new Date(i.due_date).toLocaleDateString()}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{money(i.total_amount, i.currency)}</div>
                        {remaining > 0 && (
                          <div className="text-xs text-amber-600">
                            {money(remaining, i.currency)} due
                          </div>
                        )}
                      </div>
                      {remaining > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markM.mutate(i.id)}
                          disabled={markM.isPending}
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" /> Mark paid
                        </Button>
                      )}
                    </div>
                  );
                })}
                {filteredInv.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">No invoices.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Recent payments</CardTitle>
              <CardDescription>{payments.length} entries</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {payments.map((p: any) => (
                  <div key={p.id} className="p-3 flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{p.payment_reference ?? p.id.slice(0, 8)}</div>
                      <div className="text-xs text-slate-500">
                        {p.payment_method}
                        {p.payment_date
                          ? ` · ${new Date(p.payment_date).toLocaleDateString()}`
                          : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{money(p.amount, p.currency)}</span>
                      <Badge variant="outline">{p.status ?? "completed"}</Badge>
                    </div>
                  </div>
                ))}
                {payments.length === 0 && (
                  <div className="p-8 text-center text-sm text-slate-500">
                    No payments recorded.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </LocalizedContent>
  );
}
