import { createFileRoute } from "@tanstack/react-router";
import { VariableFontText } from "@/components/app/VariableFontText";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { motion } from "framer-motion";
import { TeamSection } from "@/components/administration/TeamSection";
import { SecuritySection } from "@/components/administration/SecuritySection";
import { ActivityLogsSection } from "@/components/administration/ActivityLogsSection";
import { Users, ShieldCheck, ClipboardList, TrendingUp, TrendingDown } from "lucide-react";
import { getMyRole } from "@/lib/roles.functions";
import { listTeamMembers } from "@/lib/team-settings-insurance.functions";
import { getSecurityOverview } from "@/lib/operations2.functions";

export const Route = createFileRoute("/_authenticated/administration")({
  component: AdministrationWorkspace,
});

type Tab = "team" | "security" | "activity";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "team",     label: "Team Management", icon: Users },
  { key: "security", label: "Security Center", icon: ShieldCheck },
  { key: "activity", label: "Activity Logs",   icon: ClipboardList },
];

const BAR_COLORS = Array.from({ length: 12 }, () => "from-primary/70 to-primary");

function AdministrationWorkspace() {
  const [activeTab, setActiveTab] = useState<Tab>("team");

  const fetchRole = useServerFn(getMyRole);
  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const role = roleQ.data?.role ?? "pending";
  const isSuperAdmin = role === "super_admin";
  const isAdmin = ["super_admin", "admin"].includes(role);

  const fetchMembers = useServerFn(listTeamMembers);
  const fetchSecurity = useServerFn(getSecurityOverview);

  const { data: members } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => fetchMembers() as Promise<any[]>,
    enabled: !isSuperAdmin,
  });
  const { data: security } = useQuery({
    queryKey: ["security-center"],
    queryFn: () => fetchSecurity(),
    enabled: isAdmin,
  });

  const memberList = (members ?? []) as any[];
  const pendingMembers = memberList.filter((m) => m.role === "pending").length;
  const securityEvents = security?.logs?.length ?? 0;

  const counts = {
    team: memberList.length,
    security: securityEvents,
    activity: 0,
  };

  const maxCount = Math.max(...Object.values(counts), 1);

  const stats = [
    { label: "Team Members", value: memberList.length, up: true },
    { label: "Pending Invites", value: pendingMembers, up: pendingMembers === 0 },
    { label: "Security Events", value: securityEvents, up: securityEvents === 0 },
  ];

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-8"
      style={{
        fontFamily: "'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        backgroundImage:
          "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
            <VariableFontText text="Administration" base={650} hover={900} staggerMs={20} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Team, security and audit history
          </p>
        </div>

        {/* Top layout: chart + stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Bar Chart Panel */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-5">
              Administration Overview
            </p>
            <div className="space-y-4">
              {TABS.map((tab, i) => {
                const count = counts[tab.key];
                const pct = Math.max((count / maxCount) * 100, count > 0 ? 4 : 0);
                return (
                  <div key={tab.key} className="flex items-center gap-4">
                    <span className="w-24 text-xs text-muted-foreground font-mono truncate text-right shrink-0">
                      {tab.label.split(" ")[0]}…
                    </span>
                    <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                      <div
                        className={`h-full rounded-md bg-gradient-to-r ${BAR_COLORS[i]} transition-all duration-700`}
                        style={{ width: `${pct}%`, boxShadow: "0 0 12px rgba(99,102,241,0.3)" }}
                      />
                      <div
                        className="absolute inset-0 pointer-events-none opacity-10"
                        style={{
                          backgroundImage:
                            "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
                          backgroundSize: "8px 8px",
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-xs text-muted-foreground font-mono shrink-0">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-card border border-border rounded-2xl p-6 flex flex-col justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Key Metrics
            </p>
            <div className="space-y-0 divide-y divide-white/8 flex-1">
              {stats.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm font-mono">
                    <span className="text-muted-foreground/60">◇</span>
                    <span className="truncate max-w-[120px]">{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-white font-black text-base font-mono">{s.value}</span>
                    {s.up
                      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabbed Sections */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">

          {/* Tab Bar — variable-font hover nav */}
          <div className="border-b border-border px-4 md:px-6 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-8">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex items-center gap-2 py-4 text-sm uppercase tracking-[0.15em] whitespace-nowrap transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <VariableFontText text={tab.label} base={isActive ? 850 : 350} hover={850} staggerMs={30} />
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full font-mono transition-colors ${
                        isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground/60"
                      }`}
                    >
                      {counts[tab.key]}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="administration-tab-underline"
                        className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4 md:p-6">
            {activeTab === "team" && <TeamSection />}
            {activeTab === "security" && <SecuritySection />}
            {activeTab === "activity" && <ActivityLogsSection />}
          </div>
        </div>

      </div>
    </div>
  );
}
