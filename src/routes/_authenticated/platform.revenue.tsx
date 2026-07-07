import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, AlertTriangle, Send, Loader2 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, AreaChart, Area,
} from "recharts";
import { getSaasRevenueAnalytics, triggerExpiryRemindersNow } from "@/lib/revenue-analytics.functions";

export const Route = createFileRoute("/_authenticated/platform/revenue")({ component: SaasRevenue });

const COLORS = ["#059669", "#0ea5e9", "#f59e0b", "#8b5cf6", "#ef4444"];

function KPI({ label, value, sub, icon: Icon, tone = "emerald" }: any) {
  const toneCls: any = { emerald: "text-emerald-600", sky: "text-sky-600", amber: "text-amber-600", rose: "text-rose-600" };
  return (
    <Card>
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <div className="text-xs uppercase text-slate-500 font-semibold">{label}</div>
          <div className={`text-2xl font-bold ${toneCls[tone]}`}>{value}</div>
          {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
        </div>
        <Icon className={`h-6 w-6 ${toneCls[tone]}`} />
      </CardContent>
    </Card>
  );
}

function SaasRevenue() {
  const fn = useServerFn(getSaasRevenueAnalytics);
  const triggerFn = useServerFn(triggerExpiryRemindersNow);
  const { data, isLoading, refetch } = useQuery({ queryKey: ["saas-revenue"], queryFn: () => fn() });

  const trigger = useMutation({
    mutationFn: () => triggerFn(),
    onSuccess: (r: any) => { toast.success(`Sent ${r.sent.length} reminder(s), ${r.failed.length} failed`); refetch(); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  if (isLoading || !data) return <div className="p-8 text-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  const k = data.kpis;
  const money = (n: number) => `$${n.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">SaaS Revenue</h2>
          <p className="text-sm text-slate-500">Subscription revenue across all tenants.</p>
        </div>
        <Button onClick={() => trigger.mutate()} disabled={trigger.isPending}>
          {trigger.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          Send expiry emails now
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="MRR" value={money(k.mrr)} sub={`ARR ${money(k.arr)}`} icon={DollarSign} tone="emerald" />
        <KPI label="Total revenue" value={money(k.totalRevenue)} sub="all-time paid" icon={TrendingUp} tone="sky" />
        <KPI label="Active" value={k.activeCount} sub={`${k.trialCount} trial · ${k.cancelledCount} cancelled`} icon={Users} tone="emerald" />
        <KPI label="Expiring ≤ 7d" value={k.expiringCount} sub={`churn ${k.churnRate}%`} icon={AlertTriangle} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue (last 12 months)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueSeries}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="revenue" stroke="#059669" fill="url(#rev)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Subscriber growth</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="subscribers" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">MRR by plan</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.planSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="plan" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="mrr" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Plan distribution</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.planSeries} dataKey="mrr" nameKey="plan" cx="50%" cy="50%" outerRadius={80} label>
                  {data.planSeries.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Expiring soon</CardTitle><CardDescription>Next 7 days · {data.expiring.length}</CardDescription></CardHeader>
        <CardContent className="p-0 divide-y">
          {data.expiring.map((s: any) => (
            <div key={s.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{s.plan_name ?? "—"}</div>
                <div className="text-xs text-slate-500">admin {String(s.admin_id).slice(0, 8)} · ends {new Date(s.end_date).toLocaleDateString()}</div>
              </div>
              <Badge variant="outline">{s.status}</Badge>
            </div>
          ))}
          {data.expiring.length === 0 && <div className="p-8 text-center text-sm text-slate-500">Nothing expiring soon.</div>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent invoices</CardTitle></CardHeader>
        <CardContent className="p-0 divide-y">
          {data.recentInvoices.map((i: any) => (
            <div key={i.id} className="p-3 flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">{i.invoice_number ?? i.id.slice(0, 8)}</div>
                <div className="text-xs text-slate-500">{i.billing_date ? new Date(i.billing_date).toLocaleDateString() : "—"}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{i.currency ?? "USD"} {Number(i.amount ?? 0).toFixed(2)}</span>
                <Badge variant="outline">{i.status ?? "pending"}</Badge>
              </div>
            </div>
          ))}
          {data.recentInvoices.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No invoices yet.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
