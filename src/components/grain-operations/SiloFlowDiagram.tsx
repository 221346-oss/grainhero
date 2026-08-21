import { motion } from "framer-motion";
import { ArrowRight, Warehouse, PackageCheck, Truck, ShieldCheck, Activity, FileCheck, Layers } from "lucide-react";

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

  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-gradient-to-br from-card/90 via-card/60 to-muted/30 p-5 backdrop-blur-md shadow-sm">
      {/* Background Animated Pipeline Connector */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 via-primary to-purple-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_1fr] items-center gap-6 relative z-10">
        
        {/* STEP 1: INTAKE & QC */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 relative group hover:border-emerald-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Step 01 · Intake
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>

          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
            <PackageCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Batch Receipt & QC
          </h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            Harvest intake, moisture testing, grade classification & admin approval.
          </p>

          <div className="space-y-1.5 text-[11px] text-foreground font-medium">
            <div className="flex items-center gap-2 bg-background/60 p-1.5 rounded border border-border/40">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>1. Moisture & Grade QC Check</span>
            </div>
            <div className="flex items-center gap-2 bg-background/60 p-1.5 rounded border border-border/40">
              <Layers className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>2. Batch Allocation to Silo</span>
            </div>
          </div>

          {/* Animated Flow Connector Arrow */}
          <div className="mt-3 flex items-center justify-end gap-1.5 text-emerald-600 dark:text-emerald-400 font-mono text-[10px]">
            <span>Moving to Storage</span>
            <div className="overflow-hidden w-6 h-4 flex items-center relative">
              <motion.div
                animate={{ x: [-10, 10] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* STEP 2: CENTER SILO TOWER (HUB) */}
        <div className="flex flex-col items-center justify-center p-2 relative">
          
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 mb-2">
            Step 02 · Center Hub
          </span>

          {/* Silo Roof */}
          <div className="w-16 h-4 rounded-t-full bg-slate-700 dark:bg-slate-300 shadow-md relative z-10 border border-slate-600 dark:border-slate-400 flex justify-center items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
          </div>

          {/* Silo Vessel Body */}
          <div className="relative w-28 h-40 rounded-t-xl rounded-b-lg border-2 border-slate-700/80 dark:border-slate-400/80 bg-slate-900/90 shadow-xl overflow-hidden flex flex-col justify-end">
            
            {/* Animated Fluid Grain Level */}
            <motion.div
              className="w-full relative bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
              initial={{ height: "0%" }}
              animate={{ height: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <motion.div
                animate={{ x: [-20, 0, -20] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-1 left-0 right-0 h-2 bg-white/30 backdrop-blur-xs rounded-full opacity-80"
              />
            </motion.div>

            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none" />

            {/* Vessel Glass Icon & Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-1 text-center">
              <Warehouse className="h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mb-1" />
              <div className="bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 shadow-lg">
                <span className="text-xs font-black font-mono text-white">Silo Storage</span>
              </div>
            </div>
          </div>

          {/* Silo Stand */}
          <div className="w-24 h-2 bg-slate-800 dark:bg-slate-400 rounded-b border-x border-b border-slate-700" />
          
          <div className="mt-2 text-center">
            <p className="text-xs font-bold text-foreground">IoT Monitored Silo</p>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
              <Activity className="h-3 w-3 text-emerald-500 animate-pulse" /> Temp / Humidity Live
            </span>
          </div>
        </div>

        {/* STEP 3: DISPATCH & SALES */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 relative group hover:border-purple-500/40 transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              Step 03 · Dispatch
            </span>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
            </span>
          </div>

          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Buyer Dispatch & Sales
          </h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
            Sales invoice creation, buyer confirmation, physical dispatch & payment.
          </p>

          <div className="space-y-1.5 text-[11px] text-foreground font-medium">
            <div className="flex items-center gap-2 bg-background/60 p-1.5 rounded border border-border/40">
              <FileCheck className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              <span>1. Invoice & Dispatch Order</span>
            </div>
            <div className="flex items-center gap-2 bg-background/60 p-1.5 rounded border border-border/40">
              <Truck className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              <span>2. Truck Outflow & Receipt</span>
            </div>
          </div>

          {/* Animated Outflow Connector Arrow */}
          <div className="mt-3 flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-mono text-[10px]">
            <div className="overflow-hidden w-6 h-4 flex items-center relative">
              <motion.div
                animate={{ x: [-10, 10] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </motion.div>
            </div>
            <span>Fulfilled to Buyer</span>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
