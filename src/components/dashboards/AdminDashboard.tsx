import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Wallet, Package, Cpu, AlertTriangle, ArrowUpRight } from "lucide-react";
import { useDashboardStats } from "./useDashboardStats";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";
import { getAnalyticsOverview } from "@/lib/analytics.functions";
import { VariableFontText } from "@/components/app/VariableFontText";
import { Progress } from "@/components/ui/progress";

function useExtras() {
  const fn = useServerFn(getDashboardExtras);
  return useQuery({ queryKey: ["dashboard-extras"], queryFn: () => fn(), refetchInterval: 30_000 });
}

function money(n: number) {
  return `PKR ${Number(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function timeAgo(s: string | null) {
  if (!s) return "";
  const d = (Date.now() - new Date(s).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function riskChip(score: number) {
  if (score >= 70) return "bg-rose-500/20 text-rose-400";
  if (score >= 40) return "bg-amber-500/20 text-amber-400";
  return "bg-emerald-500/20 text-emerald-400";
}

function priorityChip(p: string) {
  return p === "critical"
    ? "bg-rose-500/20 text-rose-400"
    : p === "high"
      ? "bg-orange-500/20 text-orange-400"
      : p === "medium"
        ? "bg-amber-500/20 text-amber-400"
        : "bg-white/10 text-white/60";
}

const chartTooltip = {
  contentStyle: {
    background: "#161616",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "10px",
    fontSize: "12px",
    color: "#fff",
  },
  labelStyle: { color: "rgba(255,255,255,0.5)" },
};

export function AdminDashboard({ name }: { name?: string }) {
  const { data: s } = useDashboardStats();
  const { data: extras } = useExtras();
  const fetchOverview = useServerFn(getAnalyticsOverview);
  const { data: analytics } = useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 60_000,
  });

  const trend = analytics?.trend ?? [];
  const chartData = useMemo(() => {
    let cum = 0;
    return trend.map((d: any) => {
      cum += d.kg;
      return { date: String(d.date).slice(5), kg: d.kg, cumulative: cum };
    });
  }, [trend]);

  const kpis = [
    { label: "Revenue (dispatched)", value: money(extras?.revenue ?? 0), icon: Wallet, tint: "text-emerald-400 bg-emerald-500/15" },
    { label: "Active Batches", value: `${s?.batches.active ?? "—"}`, sub: `of ${s?.batches.total ?? "—"} total`, icon: Package, tint: "text-indigo-400 bg-indigo-500/15" },
    { label: "Sensors Online", value: `${s?.sensors.online ?? "—"}`, sub: `of ${s?.sensors.total ?? "—"} devices`, icon: Cpu, tint: "text-cyan-400 bg-cyan-500/15" },
    { label: "Open Alerts", value: `${s?.alerts?.open ?? "—"}`, sub: `${s?.alerts?.critical ?? 0} critical`, icon: AlertTriangle, tint: "text-rose-400 bg-rose-500/15" },
  ];

  const batches = extras?.recentBatches ?? [];
  const alerts = extras?.recentAlerts ?? [];
  const silos = extras?.silos ?? [];
  const actuators = extras?.actuators ?? [];
  const team = extras?.team ?? [];

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] p-4 md:p-8"
      style={{
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              <VariableFontText text="Home" base={650} hover={900} staggerMs={20} />
            </h1>
            <p className="mt-1 text-sm text-white/40">
              {name ? `Welcome back, ${name}. ` : ""}Tenant overview: revenue, operations and live activity
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/60">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            LIVE
          </span>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-[#111111] border border-white/8 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">{k.label}</p>
                <span className={`grid h-8 w-8 place-items-center rounded-full ${k.tint}`}>
                  <k.icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-white font-mono">{k.value}</p>
              {"sub" in k && k.sub && <p className="mt-1 text-xs text-white/40">{k.sub}</p>}
            </div>
          ))}
        </div>

        {/* Charts + live feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#111111] border border-white/8 rounded-2xl p-6">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
                Daily Intake — last 30 days
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="intakeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip {...chartTooltip} />
                    <Area type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={2} fill="url(#intakeFill)" name="Intake (kg)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#111111] border border-white/8 rounded-2xl p-6">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-4">
                Cumulative Volume Trend
              </p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip {...chartTooltip} />
                    <Line type="monotone" dataKey="cumulative" stroke="#818cf8" strokeWidth={2} dot={false} name="Cumulative (kg)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Live feed */}
          <div className="bg-[#111111] border border-white/8 rounded-2xl p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Latest Batches</p>
              <Link to="/grain-operations" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2 flex-1">
              {batches.length === 0 && <p className="text-sm text-white/30 text-center py-8">No batches yet</p>}
              {batches.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 border border-white/8 p-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{b.batch_id}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${riskChip(Number(b.risk_score ?? 0))}`}>
                        risk {Number(b.risk_score ?? 0).toFixed(0)}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">
                      {Number(b.quantity_kg).toLocaleString()} kg · {b.grain_type} · {b.status}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/30 shrink-0">{timeAgo(b.created_at)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 mb-3">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Recent Alerts</p>
              <Link to="/monitoring" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1">
                Monitoring <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {alerts.length === 0 && <p className="text-sm text-white/30 text-center py-4">No open alerts 🎉</p>}
              {alerts.slice(0, 3).map((a: any) => (
                <div key={a.id} className="rounded-lg bg-white/5 border border-white/8 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full uppercase font-mono ${priorityChip(String(a.priority))}`}>{a.priority}</span>
                    <span className="text-sm font-medium text-white truncate">{a.title}</span>
                  </div>
                  <p className="text-[10px] text-white/30 mt-1">{timeAgo(a.triggered_at)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom row: silos, actuators, team */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-[#111111] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Silo Occupancy</p>
              <Link to="/grain-operations" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">Details</Link>
            </div>
            <div className="space-y-4">
              {silos.length === 0 && <p className="text-sm text-white/30 text-center py-6">No silos yet</p>}
              {silos.slice(0, 5).map((si: any) => {
                const cap = Number(si.capacity_kg ?? 0);
                const occ = Number(si.current_occupancy_kg ?? 0);
                const pct = cap ? Math.round((occ / cap) * 100) : 0;
                return (
                  <div key={si.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70 truncate">{si.name}</span>
                      <span className="font-bold text-white font-mono">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5 bg-white/10" />
                    <p className="text-[10px] text-white/30 mt-1">{occ.toLocaleString()} / {cap.toLocaleString()} kg</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#111111] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Actuators</p>
              <Link to="/monitoring" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">Control</Link>
            </div>
            <div className="space-y-2">
              {actuators.length === 0 && <p className="text-sm text-white/30 text-center py-6">No actuators yet</p>}
              {actuators.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between gap-3 rounded-lg bg-white/5 border border-white/8 p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{a.name}</p>
                    <p className="text-xs text-white/40 truncate">{a.actuator_type} · {a.silos?.name ?? "—"}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono shrink-0 ${a.is_on ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"}`}>
                    {a.is_on ? `ON ${a.power_level ?? 0}%` : "OFF"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111111] border border-white/8 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Team</p>
              <Link to="/administration" className="text-xs font-semibold text-emerald-400 hover:text-emerald-300">Manage</Link>
            </div>
            <div className="space-y-2">
              {team.length === 0 && <p className="text-sm text-white/30 text-center py-6">No members yet</p>}
              {team.map((u: any) => (
                <div key={u.id} className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/8 p-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-400 grid place-items-center text-xs font-bold shrink-0">
                    {(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{u.name ?? "—"}</p>
                    <p className="text-xs text-white/40 truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] text-white/30 shrink-0">{u.updated_at ? timeAgo(u.updated_at) : "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
