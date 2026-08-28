import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import {
  ShieldCheck,
  AlertTriangle,
  Truck,
  Cpu,
  PauseCircle,
  AlertOctagon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/i18n";

type Tile = {
  key: string;
  label: string;
  value: string;
  hint?: string;
  to: string;
  search?: { tab: string };
  info: string;
  icon: LucideIcon;
  tone: "emerald" | "amber" | "slate";
  ratio: number; // 0..1 for the tiny progress bar
};

type PipelineStat = { count: number; kg: number };
export type PipelineInsight = {
  onHold: PipelineStat;
  atRisk: PipelineStat;
  damaged: PipelineStat;
};

function fmtKg(kg: number) {
  return `${Math.round(kg).toLocaleString()}kg`;
}

const toneVal: Record<Tile["tone"], string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  slate: "text-slate-600 dark:text-slate-300",
};
const toneBar: Record<Tile["tone"], string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  slate: "bg-slate-400",
};

export function InsightsStrip({
  insights,
  ordersOpen,
  alertsOpen,
  pipeline,
}: {
  insights?: {
    pendingQC: number;
    rejectedQC: number;
    atRisk: number;
    readyToShip: number;
    actuatorsOn: number;
    actuatorsTotal: number;
  };
  ordersOpen?: number;
  alertsOpen?: number;
  pipeline?: PipelineInsight;
}) {
  const i = insights ?? {
    pendingQC: 0,
    rejectedQC: 0,
    atRisk: 0,
    readyToShip: 0,
    actuatorsOn: 0,
    actuatorsTotal: 0,
  };
  const qcTotal = Math.max(1, i.pendingQC + i.rejectedQC + i.readyToShip);
  const qcHealth = Math.round((i.readyToShip / qcTotal) * 100);
  const actRatio = i.actuatorsTotal ? i.actuatorsOn / i.actuatorsTotal : 0;
  const { t } = useTranslation();

  const tiles: Tile[] = [
    {
      key: "qc",
      label: t("adminDash.qcHealth"),
      value: `${qcHealth}%`,
      hint: `${i.readyToShip} ready · ${i.pendingQC} pending`,
      to: "/grain-operations",
      search: { tab: "batches" },
      info: "Share of batches passing quality out of pending + rejected + ready.",
      icon: ShieldCheck,
      tone: qcHealth >= 70 ? "emerald" : "amber",
      ratio: qcHealth / 100,
    },
    {
      key: "risk",
      label: t("adminDash.storageRisk"),
      value: String(i.atRisk),
      hint: `${alertsOpen ?? 0} ${t("adminDash.openAlerts")}`,
      to: "/dashboard",
      info: "Batches with risk score ≥ 70, cross-checked with open alerts.",
      icon: AlertTriangle,
      tone: i.atRisk > 0 ? "amber" : "emerald",
      ratio: Math.min(1, i.atRisk / 10),
    },
    {
      key: "fulfil",
      label: t("adminDash.fulfillment"),
      value: String(i.readyToShip),
      hint: `${ordersOpen ?? 0} ${t("adminDash.ordersOpen")}`,
      to: "/orders",
      info: "Batches ready to ship and orders awaiting dispatch.",
      icon: Truck,
      tone: "emerald",
      ratio: Math.min(1, i.readyToShip / Math.max(1, i.readyToShip + (ordersOpen ?? 0))),
    },
    {
      key: "auto",
      label: t("adminDash.automation"),
      value: `${i.actuatorsOn}/${i.actuatorsTotal}`,
      to: "/actuators",
      info: "Live actuators reporting an 'on' state versus total provisioned.",
      icon: Cpu,
      tone: "slate",
      ratio: actRatio,
    },
  ];

  return (
    <section className="rounded-xl border bg-card/60 p-3 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">{t("adminDash.insightsPerformance")}</h2>
          <InfoDot text={t("adminDash.insightsHint")} />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <Link
              key={t.key}
              to={t.to}
              search={t.search as never}
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
                <span className={`text-xl font-bold tabular-nums leading-none ${toneVal[t.tone]}`}>
                  {t.value}
                </span>
                {t.hint && (
                  <span className="text-[10px] text-muted-foreground truncate">{t.hint}</span>
                )}
              </div>
              <div className="mt-2 h-1 rounded bg-muted overflow-hidden">
                <div
                  className={`h-full ${toneBar[t.tone]}`}
                  style={{ width: `${Math.max(4, Math.round(t.ratio * 100))}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {pipeline &&
        (pipeline.onHold.count > 0 || pipeline.atRisk.count > 0 || pipeline.damaged.count > 0) && (
          <div className="mt-2 pt-2 border-t border-border/60">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("adminDash.whyStuck")}
              </span>
              <InfoDot text="Grain batches currently flagged, at risk, or unusable — with the reason and weight involved, not just a count." />
            </div>
            <div className="space-y-1">
              {pipeline.onHold.count > 0 && (
                <Link
                  to="/grain-operations"
                  search={{ tab: "batches", status: "on_hold" }}
                  className="flex items-center gap-2 text-[11px] rounded-md px-2 py-1 hover:bg-amber-500/10 transition"
                >
                  <PauseCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="flex-1 text-foreground">
                    <span className="font-semibold tabular-nums">{fmtKg(pipeline.onHold.kg)}</span>{" "}
                    {t("adminDash.onHoldReview")}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {pipeline.onHold.count}
                  </span>
                </Link>
              )}
              {pipeline.atRisk.count > 0 && (
                <Link
                  to="/grain-operations"
                  search={{ tab: "batches" }}
                  className="flex items-center gap-2 text-[11px] rounded-md px-2 py-1 hover:bg-amber-500/10 transition"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="flex-1 text-foreground">
                    <span className="font-semibold tabular-nums">{fmtKg(pipeline.atRisk.kg)}</span>{" "}
                    {t("adminDash.atRisk")}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {pipeline.atRisk.count}
                  </span>
                </Link>
              )}
              {pipeline.damaged.count > 0 && (
                <Link
                  to="/grain-operations"
                  search={{ tab: "batches", status: "damaged" }}
                  className="flex items-center gap-2 text-[11px] rounded-md px-2 py-1 hover:bg-red-500/10 transition"
                >
                  <AlertOctagon className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="flex-1 text-foreground">
                    <span className="font-semibold tabular-nums">{fmtKg(pipeline.damaged.kg)}</span>{" "}
                    {t("adminDash.damagedExpired")}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {pipeline.damaged.count}
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}
    </section>
  );
}
