import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Warehouse, Search, FileText, DollarSign, Activity, Scale, CheckCircle2, ShieldCheck } from "lucide-react";

export type FlowGroup = {
  label: string;
  count: number;
  kg: number;
  tone: "yellow" | "orange" | "green" | "blue" | "purple" | "red";
};

// ── CUSTOM COLORFUL SVG FREIGHT TRUCK COMPONENT (Theme-Aware) ──
function CustomColorfulTruck({ stage }: { stage: number }) {
  const showGrains = stage <= 1 || stage >= 3;

  return (
    <div className="relative flex flex-col items-center">
      {/* Vector Freight Truck Graphic */}
      <div className="relative filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.35)] dark:drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)]">
        <svg width="115" height="54" viewBox="0 0 115 54" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Headlight Beam */}
          <path d="M102 30 L115 26 L115 38 L102 34 Z" fill="url(#headlight-beam)" opacity="0.85" />

          {/* Cargo Container */}
          <rect x="2" y="10" width="65" height="28" rx="4" fill="url(#navy-trailer-grad)" stroke="#475569" strokeWidth="1.8" />
          
          {/* Container Rib Accents */}
          <line x1="18" y1="12" x2="18" y2="36" stroke="#64748b" strokeWidth="1.5" opacity="0.7" />
          <line x1="34" y1="12" x2="34" y2="36" stroke="#64748b" strokeWidth="1.5" opacity="0.7" />
          <line x1="50" y1="12" x2="50" y2="36" stroke="#64748b" strokeWidth="1.5" opacity="0.7" />

          {/* HIGH-CONTRAST GOLDEN WHEAT GRAIN BED */}
          {showGrains && (
            <g>
              <path d="M4 11 Q 34 3, 64 11 L 64 19 L 4 19 Z" fill="#fde047" opacity="0.95" />
              <circle cx="16" cy="12" r="1" fill="#ca8a04" />
              <circle cx="28" cy="9" r="1.2" fill="#eab308" />
              <circle cx="40" cy="11" r="1" fill="#ca8a04" />
              <circle cx="52" cy="10" r="1.2" fill="#eab308" />
            </g>
          )}

          {/* Trailer Hitch */}
          <rect x="67" y="26" width="8" height="8" fill="#1e293b" />

          {/* Emerald Driver Cabin */}
          <path d="M73 16 L92 16 C97 16, 101 20, 102 26 L103 38 L73 38 Z" fill="url(#emerald-cab-grad)" stroke="#059669" strokeWidth="1.5" />
          
          {/* Blue Windshield Glass */}
          <path d="M83 18 L92 18 C95 18, 97 20, 98 24 L83 24 Z" fill="#38bdf8" opacity="0.85" stroke="#0284c7" strokeWidth="0.8" />
          
          {/* Chrome Bumper */}
          <rect x="101" y="30" width="4" height="8" rx="1" fill="#cbd5e1" />
          <circle cx="102" cy="32" r="1.5" fill="#fef08a" />

          {/* Wheels */}
          <g>
            <circle cx="15" cy="40" r="8.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
            <circle cx="15" cy="40" r="3.5" fill="#e2e8f0" />
            
            <circle cx="52" cy="40" r="8.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
            <circle cx="52" cy="40" r="3.5" fill="#e2e8f0" />

            <circle cx="89" cy="40" r="8.5" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
            <circle cx="89" cy="40" r="3.5" fill="#e2e8f0" />
          </g>

          <defs>
            <linearGradient id="navy-trailer-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id="emerald-cab-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="headlight-beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Dynamic Status Pill BELOW Truck */}
      <div className="mt-1.5 whitespace-nowrap flex items-center justify-center">
        {stage <= 1 && (
          <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap shrink-0 shadow-2xs">
            🌾 Loaded Harvest (15,000 kg)
          </span>
        )}
        {stage === 2 && (
          <span className="bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 whitespace-nowrap shrink-0 shadow-2xs">
            ⏳ Offloading Grain to Silo...
          </span>
        )}
        {stage === 3 && (
          <span className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap shrink-0 shadow-2xs">
            🌾 Reloaded Buyer Cargo (15,000 kg)
          </span>
        )}
        {stage === 4 && (
          <span className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-purple-500/30 animate-bounce whitespace-nowrap shrink-0 shadow-2xs">
            🚚 Outbound Buyer Dispatch
          </span>
        )}
      </div>
    </div>
  );
}

export function SiloFlowDiagram({
  siloName,
  occupancyPct,
}: {
  siloName?: string;
  occupancyPct?: number;
  incoming?: FlowGroup[];
  outgoing?: FlowGroup[];
}) {
  const basePct = Math.max(0, Math.min(100, occupancyPct ?? 65));
  
  // 5 Journey stages
  const [stage, setStage] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 5);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  const getTruckAnimation = (st: number) => {
    switch (st) {
      case 0:
        return { left: ["-15%", "10%"] };
      case 1:
        return { left: "30%" };
      case 2:
        return { left: "50%" };
      case 3:
        return { left: "70%" };
      case 4:
        return { left: ["70%", "90%", "118%"] };
      default:
        return { left: "10%" };
    }
  };

  // DYNAMIC SILO FILL CYCLE:
  // Stage 0 (Card 1 Intake): 0% (Empty)
  // Stage 1 (Card 2 QC): 0% (Empty)
  // Stage 2 (Card 3 Silo Hub): Fills smoothly 0% -> 100% as truck offloads!
  // Stage 3 (Card 4 Billing): Truck moves past Card 3 -> Silo smoothly empties 100% -> 0%!
  // Stage 4 (Card 5 Dispatch): 0% (Empty)
  const siloFillHeights = ["0%", "0%", "100%", "0%", "0%"];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground p-4 md:p-6 backdrop-blur-2xl shadow-md">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-4 relative z-30">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <h3 className="text-sm md:text-base font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-400 font-mono">
            Supply Chain Live Simulation Track
          </h3>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/60 dark:bg-black/60 px-3 py-1 rounded-full border border-border/60 dark:border-emerald-500/30 font-mono text-xs self-start sm:self-auto text-muted-foreground dark:text-slate-300">
          <Activity className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
          <span>Active Stage:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {stage === 0 && "01 · Harvest Scale Intake"}
            {stage === 1 && "02 · QC Inspection Check"}
            {stage === 2 && "03 · Silo Offload & Storage"}
            {stage === 3 && "04 · Invoice Slip & Cash Received"}
            {stage === 4 && "05 · Outbound Buyer Dispatch"}
          </span>
        </div>
      </div>

      {/* Main Track Wrapper (w-full overflow-hidden) */}
      <div className="w-full overflow-hidden relative">

        {/* ── TOP SECTION: 5 ALIGNED CHECKPOINT CARDS (THEME MAPPED) ── */}
        <div className="grid grid-cols-5 gap-3 relative z-20 mb-3">
          
          {/* Node 01: Truck Intake */}
          <div className={`rounded-xl border p-3 flex flex-col justify-between backdrop-blur-md transition-all min-h-[155px] ${
            stage === 0
              ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              : "border-border/60 bg-card/80 dark:bg-slate-900/90"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                01 · Intake
              </span>
              <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-bold text-foreground mb-1">Truck Scale Intake</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">Harvest weighbridge scale & lot registration</p>
            </div>
          </div>

          {/* Node 02: Quality Inspection */}
          <div className={`rounded-xl border p-3 flex flex-col justify-between backdrop-blur-md transition-all min-h-[155px] ${
            stage === 1
              ? "border-cyan-500 bg-cyan-500/10 dark:bg-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              : "border-border/60 bg-card/80 dark:bg-slate-900/90"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/30">
                02 · QC Test
              </span>
              <Search className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-bold text-foreground mb-1">Quality Inspection</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">
                {stage === 1 ? <span className="text-cyan-700 dark:text-cyan-300 font-bold animate-pulse">Scanning moisture...</span> : "Automated moisture & grade check"}
              </p>
            </div>
          </div>

          {/* Node 03: Center Silo Hub */}
          <div className={`rounded-xl border-2 p-3 flex flex-col items-center justify-between transition-all min-h-[155px] ${
            stage === 2
              ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-950/90 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
              : "border-border/70 bg-card/90 dark:bg-slate-950"
          }`}>
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/40">
                03 · Silo Hub
              </span>
              <Warehouse className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>

            {/* Silo Fluid Vessel */}
            <div className="my-0.5 flex flex-col items-center">
              <div className="w-10 h-2 rounded-t-full bg-slate-300 dark:bg-slate-400 flex justify-center items-center">
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="relative w-14 h-12 rounded-b-lg border-2 border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-900 overflow-hidden flex flex-col justify-end shadow-inner">
                <motion.div
                  className="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400"
                  animate={{ height: siloFillHeights[stage] }}
                  transition={{ duration: 2.2, ease: "easeInOut" }}
                />
              </div>
            </div>
            <span className="text-[9px] font-mono text-muted-foreground font-medium">Automated Storage</span>
          </div>

          {/* Node 04: Order & Billing */}
          <div className={`rounded-xl border p-3 flex flex-col justify-between backdrop-blur-md transition-all min-h-[155px] relative overflow-hidden ${
            stage === 3
              ? "border-amber-500/80 bg-amber-500/10 dark:bg-amber-950/40 shadow-[0_0_25px_rgba(245,158,11,0.25)]"
              : "border-border/60 bg-card/80 dark:bg-slate-900/90"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                04 · Billing
              </span>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border transition-colors ${
                stage === 3
                  ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 animate-bounce"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
              }`}>
                {stage === 3 ? "PAID ✅" : "PENDING ⏳"}
              </span>
            </div>

            <div>
              <h4 className="text-xs md:text-sm font-bold text-foreground mb-1">Order & Cash Flow</h4>
              
              <AnimatePresence mode="wait">
                {stage === 3 ? (
                  <motion.div
                    key="cash-received"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-1 mt-1"
                  >
                    <div className="bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-bold text-[10px] font-mono px-2 py-1 rounded-md flex items-center gap-1 shadow-2xs">
                      <DollarSign className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> +PKR 750,000 Cash! 💸
                    </div>
                    <div className="text-[9px] font-mono text-emerald-700 dark:text-emerald-300 flex items-center gap-1 font-semibold">
                      <FileText className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> INV-2026-882 GENERATED
                    </div>
                  </motion.div>
                ) : (
                  <p className="text-[11px] text-muted-foreground leading-snug">Invoice creation & payment locking</p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Node 05: Dispatch Outflow */}
          <div className={`rounded-xl border p-3 flex flex-col justify-between backdrop-blur-md transition-all min-h-[155px] ${
            stage === 4
              ? "border-purple-500 bg-purple-500/10 dark:bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
              : "border-border/60 bg-card/80 dark:bg-slate-900/90"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/30">
                05 · Dispatch
              </span>
              <Warehouse className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h4 className="text-xs md:text-sm font-bold text-foreground mb-1">Outbound Dispatch</h4>
              <p className="text-[11px] text-muted-foreground leading-snug">Buyer truck loadout & freight delivery</p>
            </div>
          </div>

        </div>

        {/* ── BOTTOM SECTION: CLEAN HIGHWAY ROAD WITH CONTINUOUS FORWARD DRIVING ── */}
        <div className="relative pt-6 pb-4 min-h-[110px]">
          
          {/* Simple Clean Highway Road Line */}
          <div className="absolute top-[48px] left-4 right-4 h-2.5 bg-muted rounded-full border border-border shadow-inner z-10" />

          {/* DYNAMIC FORWARD DRIVING TRUCK */}
          <motion.div
            className="absolute top-0 z-40 -translate-x-1/2 flex flex-col items-center pointer-events-none"
            animate={getTruckAnimation(stage)}
            transition={{ duration: stage === 4 ? 2.8 : 1.8, ease: "easeInOut" }}
          >
            <CustomColorfulTruck stage={stage} />
          </motion.div>

          {/* QC MAGNIFYING SCANNER (Fixed over Card 2 at 30% position) */}
          <AnimatePresence mode="wait">
            {stage === 1 && (
              <motion.div
                key="qc-magnifier-card2-fixed"
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1.15, transition: { delay: 1.2, duration: 0.3 } }}
                exit={{ opacity: 0, scale: 0, transition: { duration: 0.2 } }}
                className="absolute -top-6 left-[30%] -translate-x-1/2 z-50 pointer-events-none flex flex-col items-center"
              >
                <div className="p-2 rounded-full bg-cyan-500/20 dark:bg-cyan-500/30 border-2 border-cyan-500 dark:border-cyan-400 shadow-[0_0_20px_#06b6d4] backdrop-blur-md">
                  <Search className="h-5 w-5 text-cyan-700 dark:text-cyan-300 animate-pulse" />
                </div>
                <span className="text-[9px] font-mono font-bold text-cyan-800 dark:text-cyan-300 bg-white/90 dark:bg-black/90 px-2 py-0.5 rounded border border-cyan-500/50 mt-0.5 shadow-md whitespace-nowrap">
                  Scanning Moisture & Purity 🔬
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GRAIN POURING STREAM OVER STAGE 3 (50% Position) */}
          <AnimatePresence>
            {stage === 2 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 28 }}
                exit={{ opacity: 0 }}
                className="absolute top-[20px] left-[50%] -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center"
              >
                <div className="w-2.5 bg-gradient-to-b from-amber-400 via-emerald-400 to-teal-300 rounded-full animate-pulse shadow-[0_0_18px_#f59e0b] h-full" />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
}
