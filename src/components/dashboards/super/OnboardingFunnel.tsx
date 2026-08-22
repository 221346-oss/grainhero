import { ChevronDown } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Panel, SectionLabel, DeltaChip } from "./super-ui";

export type FunnelStage = {
  key: string;
  label: string;
  count: number;
  share: number;
  keptPct: number | null;
  lost: number;
};

export type FunnelData = {
  windowDays: number;
  stages: FunnelStage[];
  converted: number;
  convertedPrev: number;
  convertedDeltaPct: number | null;
  dropOff: number;
  dropOffDeltaPct: number | null;
  biggestDrop: { label: string; lost: number; of?: { label: string; count: number } } | null;
  timeToFirstSiloDays: number | null;
  verifyToTenantHrs: number | null;
  installCompletionPct: number | null;
};

const WINDOWS = [7, 30, 90] as const;

/** Wording for the users a stage lost, so each row reads as a sentence. */
function lossNote(key: string, lost: number): string {
  if (lost <= 0) return "no drop-off";
  if (key === "email_verified") return `${lost} never verified`;
  if (key === "silo_installed") return `${lost} awaiting install`;
  return `${lost} dropped here`;
}


/** Stage bar. The count sits inside the fill, or just past it when the bar is short. */
function BarCell({ count, pct }: { count: number; pct: number }) {
  const width = Math.max(2, Math.min(100, pct));
  const inside = width >= 24;
  return (
    <div className="relative h-9 w-full rounded-lg bg-muted/30">
      <div
        className="absolute inset-y-0 left-0 rounded-lg bg-success/90 transition-[width] duration-700"
        style={{ width: `${width}%` }}
      />
      <span
        className={`absolute inset-y-0 flex items-center whitespace-nowrap text-[11px] font-semibold ${
          inside ? "left-3 text-background" : "text-muted-foreground"
        }`}
        style={inside ? undefined : { left: `calc(${width}% + 10px)` }}
      >
        {count} users
      </span>
    </div>
  );
}

function StatRow({ label, value, delta }: { label: string; value: string; delta?: number | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tabular-nums text-foreground">{value}</span>
        {delta !== undefined && <DeltaChip value={delta} />}
      </div>
    </div>
  );
}

export function OnboardingFunnel({
  data, windowDays, onWindowChange,
}: {
  data?: FunnelData;
  windowDays: number;
  onWindowChange: (days: number) => void;
}) {
  const stages = data?.stages ?? [];
  const first = stages[0]?.count ?? 0;

  return (
    <Panel>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        {/* ── stages ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <SectionLabel index="06">Onboarding funnel</SectionLabel>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
                Last {windowDays} days
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {WINDOWS.map((d) => (
                  <DropdownMenuItem key={d} onClick={() => onWindowChange(d)} className="text-xs">
                    Last {d} days
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-5 grid grid-cols-[minmax(96px,1fr)_minmax(0,2fr)_auto_auto] items-end gap-x-4 text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <span>Stage</span>
            <span>Users reaching this stage</span>
            <span className="text-right">Share</span>
            <span className="text-right">Kept from previous</span>
          </div>

          <div className="mt-3 space-y-2.5">
            {stages.map((s, i) => (
              <div
                key={s.key}
                className="grid grid-cols-[minmax(96px,1fr)_minmax(0,2fr)_auto_auto] items-center gap-x-4"
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</span>

                <BarCell count={s.count} pct={first ? (s.count / first) * 100 : 0} />

                <span className="text-right text-[12px] tabular-nums text-muted-foreground">{s.share}%</span>

                <div className="w-[124px] text-right">
                  {i === 0 ? (
                    <>
                      <p className="text-[10px] font-bold text-foreground">Start</p>
                      <p className="text-[10px] text-muted-foreground">of the last {windowDays} days</p>
                    </>
                  ) : (
                    <>
                      <p className={`text-[11px] font-semibold tabular-nums ${
                        s.keptPct === null ? "text-muted-foreground" : s.keptPct < 80 ? "text-warning" : "text-foreground"
                      }`}>
                        {s.keptPct === null ? "—" : `${s.keptPct}% kept`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {s.keptPct === null ? "no users upstream" : lossNote(s.key, s.lost)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
            {stages.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">No signups in this window</p>
            )}
          </div>

          {data?.biggestDrop && (
            <div className="mt-5 flex items-center gap-3 rounded-lg bg-severity-critical/10 px-3 py-2.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-severity-critical">
                Biggest drop
              </span>
              <span className="text-[12px] text-foreground">
                {data.biggestDrop.lost} of {data.biggestDrop.of?.count ?? 0}{" "}
                {(data.biggestDrop.of?.label ?? "").toLowerCase()} users never reached{" "}
                {data.biggestDrop.label.toLowerCase()}.
              </span>
            </div>
          )}
        </div>

        {/* ── outcome ────────────────────────────────────────────────────── */}
        <div className="flex flex-col">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Converted</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold leading-none tabular-nums text-foreground">
                  {data?.converted ?? 0}
                </span>
                <DeltaChip value={data?.convertedDeltaPct} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                Compared to {data?.convertedPrev ?? 0} the window before
              </p>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Drop-off</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold leading-none tabular-nums text-severity-critical">
                  {data?.dropOff ?? 0}%
                </span>
                <DeltaChip value={data?.dropOffDeltaPct} good={(data?.dropOffDeltaPct ?? 0) < 0} />
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {data?.biggestDrop ? `${data.biggestDrop.lost} stalled at ${data.biggestDrop.label.toLowerCase()}` : "no stalled accounts"}
              </p>
            </div>
          </div>

          <div className="mt-6 divide-y divide-border/40 border-t border-border/40">
            <StatRow
              label="Time to first silo"
              value={data?.timeToFirstSiloDays === null || data?.timeToFirstSiloDays === undefined ? "—" : `${data.timeToFirstSiloDays} days`}
            />
            <StatRow
              label="Verify → tenant"
              value={data?.verifyToTenantHrs === null || data?.verifyToTenantHrs === undefined ? "—" : `${data.verifyToTenantHrs} hrs`}
            />
            <StatRow
              label="Install completion"
              value={data?.installCompletionPct === null || data?.installCompletionPct === undefined ? "—" : `${data.installCompletionPct}%`}
            />
          </div>
        </div>
      </div>
    </Panel>
  );
}
