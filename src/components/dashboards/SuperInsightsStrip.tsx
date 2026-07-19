import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { UserPlus, MessageSquare, TrendingUp, Activity, type LucideIcon } from "lucide-react";

type Tile = {
  key: string;
  label: string;
  value: string;
  hint: string;
  to: string;
  info: string;
  icon: LucideIcon;
  tone: "emerald" | "amber" | "slate" | "red";
  ratio: number;
};

const toneVal: Record<Tile["tone"], string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  slate: "text-slate-600 dark:text-slate-300",
  red: "text-red-600",
};
const toneBar: Record<Tile["tone"], string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  slate: "bg-slate-400",
  red: "bg-red-500",
};

export function SuperInsightsStrip({
  signupsTotal, wowDelta, ticketsTotal, pipelineTotal, criticalAlerts,
}: {
  signupsTotal: number;
  wowDelta: number;
  ticketsTotal: number;
  pipelineTotal: number;
  criticalAlerts: number;
}) {
  const signPositive = wowDelta >= 0;
  const tiles: Tile[] = [
    {
      key: "signups",
      label: "Signups (30d)",
      value: String(signupsTotal),
      hint: `${signPositive ? "+" : ""}${wowDelta}% WoW`,
      to: "/platform/users",
      info: "New profiles created in the last 30 days, with week-over-week change.",
      icon: UserPlus,
      tone: signPositive ? "emerald" : "amber",
      ratio: Math.min(1, signupsTotal / 30),
    },
    {
      key: "tickets",
      label: "Support tickets",
      value: String(ticketsTotal),
      hint: "Hardware · bugs · queries",
      to: "/platform/reporting",
      info: "Combined hardware issues, bug reports and manager queries awaiting action.",
      icon: MessageSquare,
      tone: ticketsTotal > 0 ? "amber" : "emerald",
      ratio: Math.min(1, ticketsTotal / 20),
    },
    {
      key: "pipeline",
      label: "Pipeline",
      value: String(pipelineTotal),
      hint: "CRM contacts in flight",
      to: "/platform/pipeline",
      info: "Total leads/contacts across all pipeline stages.",
      icon: TrendingUp,
      tone: "slate",
      ratio: Math.min(1, pipelineTotal / 50),
    },
    {
      key: "health",
      label: "Critical alerts",
      value: String(criticalAlerts),
      hint: criticalAlerts > 0 ? "Action required" : "System healthy",
      to: "/platform/health",
      info: "Grain alerts flagged critical across every tenant.",
      icon: Activity,
      tone: criticalAlerts > 0 ? "red" : "emerald",
      ratio: Math.min(1, criticalAlerts / 10),
    },
  ];

  return (
    <section className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <h2 className="text-sm font-semibold text-foreground">Platform Insights</h2>
        <InfoDot text="Cross-cutting signals across signups, support, pipeline and system health." />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              to={t.to}
              className="rounded-lg border bg-card px-3 py-2.5 transition hover:ring-1 hover:ring-emerald-500/40 hover:border-emerald-500/40"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-emerald-600" />
                  {t.label}
                </span>
                <InfoDot text={t.info} />
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <span className={`text-xl font-bold tabular-nums leading-none ${toneVal[t.tone]}`}>{t.value}</span>
                <span className="text-[10px] text-muted-foreground truncate">{t.hint}</span>
              </div>
              <div className="mt-2 h-1 rounded bg-muted overflow-hidden">
                <div className={`h-full ${toneBar[t.tone]}`} style={{ width: `${Math.max(4, Math.round(t.ratio * 100))}%` }} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}