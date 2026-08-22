import { Link } from "@tanstack/react-router";
import { Panel, SectionLabel, Rail } from "./super-ui";

type Total = { label: string; value: number; to: string; tone?: "success" | "critical" };

export function PlatformTotals({
  totalTenants,
  totalUsers,
  activeSubs,
  ordersOpen,
  criticalAlerts,
}: {
  totalTenants: number;
  totalUsers: number;
  activeSubs: number;
  ordersOpen: number;
  criticalAlerts: number;
}) {
  const rows: Total[] = [
    { label: "Tenants", value: totalTenants, to: "/platform/users" },
    { label: "Users", value: totalUsers, to: "/platform/users" },
    { label: "Active subs", value: activeSubs, to: "/platform/plans" },
    { label: "Install orders", value: ordersOpen, to: "/platform/orders" },
    {
      label: "Critical alerts",
      value: criticalAlerts,
      to: "/platform/health",
      tone: criticalAlerts > 0 ? "critical" : "success",
    },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));

  return (
    <Panel className="flex flex-col">
      <SectionLabel index="03" className="mb-5">
        Platform totals
      </SectionLabel>

      <div className="flex flex-1 flex-col justify-between gap-5">
        {rows.map((r) => (
          <Link key={r.label} to={r.to} className="group block">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {r.label}
              </span>
              <span
                className={`text-2xl font-bold tabular-nums leading-none ${
                  r.tone === "critical" ? "text-severity-critical" : "text-foreground"
                }`}
              >
                {r.value}
              </span>
            </div>
            <Rail pct={(r.value / max) * 100} tone={r.tone ?? "success"} />
          </Link>
        ))}
      </div>
    </Panel>
  );
}
