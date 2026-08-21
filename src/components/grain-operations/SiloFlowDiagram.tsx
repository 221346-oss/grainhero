import { motion } from "framer-motion";
import { ArrowRight, Warehouse, PackageCheck, Truck, ShieldCheck, Activity, FileCheck, Layers, Cpu, CheckCircle2 } from "lucide-react";

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
  const pct = Math.max(0, Math.min(100, occupancyPct ?? 72));

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card/95 via-card/70 to-muted/40 p-6 backdrop-blur-xl shadow-md">
      {/* Background Animated Pipeline Glowing Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-primary to-purple-500 blur-xs" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_1fr] items-center gap-6 relative z-10">
        
        {/* STEP 01: INTAKE & QC */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 relative group hover:border-emerald-500/50 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
              <PackageCheck className="h-3.5 w-3.5" /> Step 01 · Grain Intake
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          <h3 className="text-base font-extrabold text-foreground mb-1.5 flex items-center gap-2">
            Intake & Quality QC Check
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Farm harvest arrival, automated moisture testing, grain grade classification & admin intake approval.
          </p>

          <div className="space-y-2 text-xs font-semibold text-foreground">
            <div className="flex items-center gap-2.5 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border/60 shadow-2xs">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>1. Moisture & Spoilage Quality Test</span>
            </div>
            <div className="flex items-center gap-2.5 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border/60 shadow-2xs">
              <Layers className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>2. Batch Code & Silo Allocation</span>
            </div>
          </div>

          {/* Flow Indicator Animation */}
          <div className="mt-4 flex items-center justify-end gap-2 text-emerald-600 dark:text-emerald-400 font-mono text-xs font-bold">
            <span>Flowing into Silo Storage</span>
            <div className="overflow-hidden w-8 h-5 flex items-center relative">
              <motion.div
                animate={{ x: [-14, 14] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                className="flex gap-1"
              >
                <ArrowRight className="h-4 w-4 shrink-0" />
                <ArrowRight className="h-4 w-4 shrink-0 opacity-40" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* STEP 02: CENTER SILO TOWER (PROMINENT LARGE SILO VESSEL) */}
        <div className="flex flex-col items-center justify-center p-3 relative my-2 lg:my-0">
          
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/15 px-3 py-1 rounded-full border border-primary/30 mb-3 shadow-xs flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-primary" /> Step 02 · Center Storage Hub
          </span>

          {/* Silo Dome Roof */}
          <div className="w-28 h-6 rounded-t-full bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 dark:from-slate-300 dark:via-slate-200 dark:to-slate-400 shadow-md relative z-10 border border-slate-500 dark:border-slate-300 flex justify-center items-center">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_#34d399]" />
          </div>

          {/* Enlarged Silo Vessel Body (w-44, h-56) */}
          <div className="relative w-44 h-56 rounded-t-2xl rounded-b-xl border-4 border-slate-700 dark:border-slate-300 bg-slate-950 shadow-2xl overflow-hidden flex flex-col justify-end">
            
            {/* Animated Liquid/Grain Fluid Level */}
            <motion.div
              className="w-full relative bg-gradient-to-t from-emerald-700 via-emerald-500 to-teal-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]"
              initial={{ height: "0%" }}
              animate={{ height: `${pct}%` }}
              transition={{ duration: 1, ease: "easeInOut" }}
            >
              {/* Fluid Wave Animation */}
              <motion.div
                animate={{ x: [-30, 0, -30] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-1.5 left-0 right-0 h-3 bg-white/40 backdrop-blur-xs rounded-full opacity-90"
              />
            </motion.div>

            {/* Glass Sheen Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />

            {/* Vessel Measurement Markers */}
            <div className="absolute inset-0 flex flex-col justify-between p-2 text-[9px] font-mono font-bold text-slate-400/60 pointer-events-none">
              <span>100% — Max Capacity</span>
              <span>75%</span>
              <span>50%</span>
              <span>25%</span>
              <span>0% — Empty</span>
            </div>

            {/* Center 3D Icon & Live Capacity Badge */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-2 text-center">
              <Warehouse className="h-10 w-10 text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)] mb-1" />
              <div className="bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/30 shadow-2xl">
                <span className="text-sm font-black font-mono text-white tracking-wide">SILO STORAGE</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-300 font-bold mt-1 bg-black/50 px-2 py-0.5 rounded-md">
                {pct}% Filled
              </span>
            </div>
          </div>

          {/* Silo Heavy Base Stand */}
          <div className="w-36 h-3 bg-slate-800 dark:bg-slate-400 rounded-b border-x border-b border-slate-700 shadow-md" />
          <div className="flex gap-16 w-28 justify-between">
            <div className="w-1.5 h-4 bg-slate-700 dark:bg-slate-400" />
            <div className="w-1.5 h-4 bg-slate-700 dark:bg-slate-400" />
          </div>

          {/* Silo Title Badge */}
          <div className="mt-3 text-center">
            <p className="text-sm font-extrabold text-foreground">IoT Monitored Silo</p>
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
              <Activity className="h-3.5 w-3.5 animate-pulse" /> 24/7 Sensor Telemetry Live
            </span>
          </div>
        </div>

        {/* STEP 03: DISPATCH & SALES */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent p-5 relative group hover:border-purple-500/50 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/15 px-2.5 py-1 rounded-full border border-purple-500/30 flex items-center gap-1.5">
              <Truck className="h-3.5 w-3.5" /> Step 03 · Buyer Dispatch
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
            </span>
          </div>

          <h3 className="text-base font-extrabold text-foreground mb-1.5 flex items-center gap-2">
            Buyer Sales & Truck Outflow
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Sales quote creation, buyer confirmation, physical truck dispatch & payment receipt recording.
          </p>

          <div className="space-y-2 text-xs font-semibold text-foreground">
            <div className="flex items-center gap-2.5 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border/60 shadow-2xs">
              <FileCheck className="h-4 w-4 text-purple-500 shrink-0" />
              <span>1. Invoice Order & Buyer Approval</span>
            </div>
            <div className="flex items-center gap-2.5 bg-background/80 backdrop-blur-sm p-2 rounded-lg border border-border/60 shadow-2xs">
              <Truck className="h-4 w-4 text-purple-500 shrink-0" />
              <span>2. Truck Loading & Payment Complete</span>
            </div>
          </div>

          {/* Outflow Indicator Animation */}
          <div className="mt-4 flex items-center gap-2 text-purple-600 dark:text-purple-400 font-mono text-xs font-bold">
            <div className="overflow-hidden w-8 h-5 flex items-center relative">
              <motion.div
                animate={{ x: [-14, 14] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                className="flex gap-1"
              >
                <ArrowRight className="h-4 w-4 shrink-0" />
                <ArrowRight className="h-4 w-4 shrink-0 opacity-40" />
              </motion.div>
            </div>
            <span>Fulfilled & Delivered to Buyer</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
