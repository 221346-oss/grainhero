import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { HairlineGrid, NeonPanel } from "@/components/charts/neon";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "@/i18n";

export function SuperInsightsStrip({
  signupsTotal,
  wowDelta,
  ticketsTotal,
  pipelineTotal,
  criticalAlerts,
  onCriticalAlertsClick,
}: {
  signupsTotal: number;
  wowDelta: number;
  ticketsTotal: number;
  pipelineTotal: number;
  criticalAlerts: number;
  onCriticalAlertsClick?: () => void;
}) {
  const signPositive = wowDelta >= 0;
  const { t } = useTranslation();

  const tiles = [
    {
      key: "signups",
      label: t("superAdmin.signups30d"),
      value: signupsTotal,
      hint: `${signPositive ? "+" : ""}${wowDelta}% WoW`,
      to: "/platform/users",
      positive: signPositive,
      hasChange: true,
    },
    {
      key: "tickets",
      label: t("superAdmin.incidents"),
      value: ticketsTotal,
      hint: ticketsTotal === 0 ? t("superAdmin.allResolved") : t("superAdmin.needAttention"),
      to: "/platform/reporting",
      positive: ticketsTotal === 0,
      hasChange: false,
    },
    {
      key: "pipeline",
      label: t("superAdmin.pipeline"),
      value: pipelineTotal,
      hint: t("superAdmin.crmContacts"),
      to: "/platform/pipeline",
      positive: true,
      hasChange: false,
    },
    {
      key: "alerts",
      label: t("superAdmin.criticalAlerts"),
      value: criticalAlerts,
      hint: criticalAlerts === 0 ? t("superAdmin.systemHealthy") : t("superAdmin.actionRequired"),
      to: "/platform/health",
      positive: criticalAlerts === 0,
      hasChange: false,
      onClick: onCriticalAlertsClick,
      showPulse: criticalAlerts > 0,
    },
  ];

  return (
    <section className="rounded-xl border border-border bg-card/60 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <h2 className="text-sm font-semibold text-foreground">{t("superAdmin.platformInsights")}</h2>
        <InfoDot text={t("superAdmin.platformInsightsHint")} />
      </div>

      <HairlineGrid cols="grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => {
          const tile = (
            <NeonPanel className="hover:bg-muted/30 cursor-pointer transition-colors">
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  {t.label}
                </span>
                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(t as any).showPulse && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-severity-critical opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-severity-critical" />
                      </span>
                    )}
                    <span
                      className={`text-2xl font-bold tabular-nums leading-none ${
                        t.positive ? "text-success" : "text-warning"
                      }`}
                    >
                      {t.value}
                    </span>
                  </div>
                  {t.hasChange && (
                    <div
                      className={`flex items-center gap-0.5 text-[11px] font-semibold ${
                        t.positive ? "text-success" : "text-warning"
                      }`}
                    >
                      {t.positive ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground block">{t.hint}</span>
              </div>
            </NeonPanel>
          );
          if (t.onClick) {
            return (
              <div key={t.key} onClick={t.onClick}>
                {tile}
              </div>
            );
          }
          return (
            <Link key={t.key} to={t.to}>
              {tile}
            </Link>
          );
        })}
      </HairlineGrid>
    </section>
  );
}
