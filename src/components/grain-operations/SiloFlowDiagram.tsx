import { motion } from "framer-motion";
import { ArrowRight, Warehouse, Truck, FlaskConical, FileCheck, PackageCheck, Activity, ShieldCheck, Scale, CheckCircle2 } from "lucide-react";

export type FlowGroup = {
  label: string;
  count: number;
  kg: number;
  tone: "yellow" | "orange" | "green" | "blue" | "purple" | "red";
};

export function SiloFlowDiagram({
  siloName,
  occupancyPct,
}: {
  siloName?: string;
  occupancyPct?: number;
  incoming?: FlowGroup[];
  outgoing?: FlowGroup[];
}) {
  const pct = Math.max(0, Math.min(100, occupancyPct ?? 65));

  const steps = [
    {
      num: "01",
      title: "Truck Arrival",
      tag: "Intake Scale",
      desc: "Farm harvest intake & weighbridge scale",
      icon: Truck,
      color: "emerald",
      borderCls: "border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60",
      tagCls: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      iconCls: "text-emerald-500",
    },
    {
      num: "02",
      title: "Quality Check",
      tag: "QC Testing",
      desc: "Automated moisture & grade classification",
      icon: FlaskConical,
      color: "cyan",
      borderCls: "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/60",
      tagCls: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      iconCls: "text-cyan-500",
    },
    {
      num: "03",
      title: "Silo Storage",
      tag: "IoT Silo Hub",
      desc: "24/7 Temp, CO2 & moisture telemetry",
      icon: Warehouse,
      color: "primary",
      borderCls: "border-primary/40 bg-primary/5 hover:border-primary/70",
      tagCls: "text-primary bg-primary/10 border-primary/20",
      iconCls: "text-primary",
      isCenterHub: true,
    },
    {
      num: "04",
      title: "Invoice & Order",
      tag: "Buyer Billing",
      desc: "Contract creation & payment locking",
      icon: FileCheck,
      color: "amber",
      borderCls: "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60",
      tagCls: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      iconCls: "text-amber-500",
    },
    {
      num: "05",
      title: "Dispatch Outflow",
      tag: "Freight Loadout",
      desc: "Physical truck loading & buyer delivery",
      icon: PackageCheck,
      color: "purple",
      borderCls: "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60",
      tagCls: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
      iconCls: "text-purple-500",
    },
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card/95 via-card/70 to-muted/20 p-5 backdrop-blur-xl shadow-md">
      
      {/* Background Animated Laser Stream Line */}
      <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-0.5 -translate-y-1/2 pointer-events-none opacity-30">
        <div className="w-full h-full bg-gradient-to-r from-emerald-500 via-cyan-400 via-primary via-amber-400 to-purple-500" />
      </div>

      {/* 5 Distinct Horizontal Step Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 relative z-10">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={s.num} className="relative flex flex-col justify-between">
              
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
                className={`h-full rounded-xl border ${s.borderCls} p-3.5 flex flex-col justify-between backdrop-blur-md transition-all duration-200 group relative shadow-xs`}
              >
                {/* Header Badge & Pulse */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.tagCls}`}>
                      Step {s.num} · {s.tag}
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                  </div>

                  {/* Title & Icon */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1.5 rounded-lg bg-background/80 border border-border/40 shadow-2xs">
                      <Icon className={`h-4 w-4 ${s.iconCls}`} />
                    </div>
                    <h4 className="text-xs font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {s.title}
                    </h4>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {s.desc}
                  </p>
                </div>

                {/* Center Hub Specific Vessel Render (Step 03) */}
                {s.isCenterHub && (
                  <div className="my-2.5 flex flex-col items-center justify-center p-2 rounded-lg bg-slate-900/90 border border-slate-700/80 shadow-inner">
                    <div className="w-12 h-2.5 rounded-t-full bg-slate-400 border border-slate-300 flex justify-center items-center">
                      <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="relative w-16 h-12 rounded-b-md border border-slate-600 bg-slate-950 overflow-hidden flex flex-col justify-end">
                      <motion.div
                        className="w-full bg-gradient-to-t from-emerald-600 to-teal-400"
                        initial={{ height: "0%" }}
                        animate={{ height: `${pct}%` }}
                        transition={{ duration: 0.8 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-mono font-black text-white drop-shadow-md">{pct}%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step Connector Indicator */}
                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1 text-[9px]">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Active
                  </span>
                  {idx < steps.length - 1 && (
                    <div className="overflow-hidden w-5 h-3 flex items-center relative text-primary">
                      <motion.div
                        animate={{ x: [-8, 8] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      >
                        <ArrowRight className="h-3 w-3" />
                      </motion.div>
                    </div>
                  )}
                </div>

              </motion.div>

            </div>
          );
        })}
      </div>
    </div>
  );
}
