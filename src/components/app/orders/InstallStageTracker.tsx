import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type InstallStageKey = "paid" | "assigned" | "en_route" | "onsite" | "installed" | "completed";

export const STAGES: { key: InstallStageKey; label: string; short: string; actor: "system" | "super_admin" | "admin" }[] = [
  { key: "paid",      label: "Paid",      short: "1", actor: "system" },
  { key: "assigned",  label: "Assigned",  short: "2", actor: "super_admin" },
  { key: "en_route",  label: "En route",  short: "3", actor: "super_admin" },
  { key: "onsite",    label: "On-site",   short: "4", actor: "super_admin" },
  { key: "installed", label: "Installed", short: "5", actor: "super_admin" },
  { key: "completed", label: "Completed", short: "6", actor: "admin" },
];

export interface StageHistoryItem {
  stage: InstallStageKey | "blocked";
  at: string;
  note?: string | null;
}

function rank(stage: InstallStageKey) {
  return STAGES.findIndex((s) => s.key === stage);
}

export function InstallStageTracker({
  stage, blocked, blockerNote, history = [], variant = "row",
  canAdvanceAs, onAdvance,
}: {
  stage: InstallStageKey;
  blocked?: boolean;
  blockerNote?: string | null;
  history?: StageHistoryItem[];
  variant?: "row" | "full";
  canAdvanceAs?: { superAdmin: boolean; admin: boolean };
  onAdvance?: (next: "en_route" | "onsite" | "installed" | "completed" | "blocked", note?: string) => Promise<void> | void;
}) {
  const cur = rank(stage);
  const nextStage = STAGES[cur + 1];

  const stampOf = (k: InstallStageKey | "blocked") => history.find((h) => h.stage === k)?.at;

  const pillRow = (
    <TooltipProvider delayDuration={100}>
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const done = i < cur;
          const active = i === cur;
          const at = stampOf(s.key);
          return (
            <Tooltip key={s.key}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-1.5 flex-1 min-w-[14px] rounded-full transition-colors",
                    done && "bg-emerald-500",
                    active && !blocked && "bg-emerald-500 ring-2 ring-emerald-500/30",
                    active && blocked && "bg-amber-500 ring-2 ring-amber-500/30",
                    !done && !active && "bg-muted",
                  )}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <div className="font-medium">{s.short}. {s.label}</div>
                {at && <div className="text-muted-foreground">{new Date(at).toLocaleString()}</div>}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );

  const label = (
    <div className="flex items-center gap-1.5 text-xs">
      <span className={cn("font-medium", blocked ? "text-amber-600" : "text-emerald-600")}>
        {blocked ? "Blocked at " : ""}{STAGES[cur]?.label ?? stage}
      </span>
      {nextStage && !blocked && (
        <span className="text-muted-foreground flex items-center gap-0.5">
          <ArrowRight className="h-3 w-3" /> {nextStage.label}
        </span>
      )}
    </div>
  );

  if (variant === "row") {
    return (
      <div className="min-w-[160px] space-y-1">
        {pillRow}
        {label}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        {pillRow}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {label}
          <AdvanceButton
            stage={stage}
            blocked={!!blocked}
            canAdvanceAs={canAdvanceAs}
            onAdvance={onAdvance}
          />
        </div>
        {blocked && blockerNote && (
          <div className="flex gap-2 items-start text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
            <span>{blockerNote}</span>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Lifecycle timeline</div>
        <ol className="relative border-l border-border pl-4 space-y-3">
          {[...STAGES].map((s) => {
            const at = stampOf(s.key);
            const reached = rank(s.key) <= cur;
            return (
              <li key={s.key} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-background",
                    reached ? "bg-emerald-500" : "bg-muted",
                  )}
                >
                  {reached && <Check className="h-2.5 w-2.5 text-white" />}
                </span>
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-[11px] text-muted-foreground">
                  {at ? new Date(at).toLocaleString() : reached ? "—" : "Pending"}
                  {s.actor !== "system" && <span className="ml-1 opacity-70">· {s.actor === "admin" ? "Admin" : "SuperAdmin"}</span>}
                </div>
              </li>
            );
          })}
          {history.filter((h) => h.stage === "blocked").map((h, i) => (
            <li key={`blk-${i}`} className="relative">
              <span className="absolute -left-[21px] top-1 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-background bg-amber-500">
                <AlertTriangle className="h-2.5 w-2.5 text-white" />
              </span>
              <div className="text-sm font-medium text-amber-700">Blocked</div>
              <div className="text-[11px] text-muted-foreground">{new Date(h.at).toLocaleString()}</div>
              {h.note && <div className="text-xs text-muted-foreground mt-0.5">{h.note}</div>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function AdvanceButton({
  stage, blocked, canAdvanceAs, onAdvance,
}: {
  stage: InstallStageKey;
  blocked: boolean;
  canAdvanceAs?: { superAdmin: boolean; admin: boolean };
  onAdvance?: (next: "en_route" | "onsite" | "installed" | "completed" | "blocked", note?: string) => Promise<void> | void;
}) {
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockNote, setBlockNote] = useState("");
  const [busy, setBusy] = useState(false);
  const cur = rank(stage);
  const next = STAGES[cur + 1];
  if (!onAdvance || !canAdvanceAs) return null;

  const canForNext = next && (next.actor === "admin" ? canAdvanceAs.admin : canAdvanceAs.superAdmin);
  if (!next) return <span className="text-xs text-emerald-600 font-medium">All stages complete</span>;

  const call = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center gap-2">
      {canForNext && !blocked && (
        <Button
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8"
          disabled={busy}
          onClick={() => call(() => onAdvance(next.key as "en_route" | "onsite" | "installed" | "completed"))}
        >
          Advance to {next.label}
        </Button>
      )}
      {!canForNext && !blocked && (
        <span className="text-xs text-muted-foreground">
          Waiting on {next.actor === "admin" ? "admin sign-off" : "SuperAdmin"}
        </span>
      )}
      {canAdvanceAs.superAdmin && !blocked && cur < STAGES.length - 1 && (
        <Button size="sm" variant="outline" className="h-8 text-amber-700 border-amber-300"
          onClick={() => setBlockOpen(true)}>
          Mark blocked
        </Button>
      )}

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark install as blocked</DialogTitle>
            <DialogDescription>Add a short reason. Stage stays at {STAGES[cur]?.label}.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} placeholder="Reason…" value={blockNote} onChange={(e) => setBlockNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>Cancel</Button>
            <Button disabled={blockNote.trim().length < 3 || busy}
              onClick={() => call(async () => { await onAdvance("blocked", blockNote.trim()); setBlockOpen(false); setBlockNote(""); })}>
              Confirm block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Derive the current stage + history from raw order + installation rows.
 */
export function deriveStage(order: Record<string, unknown> | null | undefined, install: Record<string, unknown> | null | undefined, events: Array<Record<string, unknown>> = []): {
  stage: InstallStageKey; blocked: boolean; blockerNote?: string | null; history: StageHistoryItem[];
} {
  const status = (install?.status as string | undefined) ?? "scheduled";
  const paidAt = (order?.created_at as string | undefined) ?? undefined;
  const assignedAt = (install?.assigned_at as string | undefined) ?? undefined;
  const enRouteAt = (install?.en_route_at as string | undefined) ?? undefined;
  const onsiteAt = (install?.onsite_at as string | undefined) ?? undefined;
  const installedAt = (install?.installed_at as string | undefined) ?? (order?.installed_at as string | undefined);
  const completedAt = (install?.completed_at as string | undefined) ?? undefined;
  const orderStatus = (order?.status as string | undefined) ?? "pending_payment";

  const blocked = status === "blocked";
  const blockerNote = (install?.blocker_note as string | null | undefined) ?? null;

  let stage: InstallStageKey = "paid";
  if (completedAt || status === "completed" || orderStatus === "live") stage = "completed";
  else if (installedAt || status === "installed" || orderStatus === "installed") stage = "installed";
  else if (onsiteAt || status === "onsite") stage = "onsite";
  else if (enRouteAt || status === "en_route") stage = "en_route";
  else if (assignedAt || install || orderStatus === "tech_assigned" || orderStatus === "approved") stage = "assigned";
  else stage = "paid";
  if (blocked && stage === "paid") stage = "assigned";

  const history: StageHistoryItem[] = [];
  if (paidAt) history.push({ stage: "paid", at: paidAt });
  if (assignedAt) history.push({ stage: "assigned", at: assignedAt });
  if (enRouteAt) history.push({ stage: "en_route", at: enRouteAt });
  if (onsiteAt) history.push({ stage: "onsite", at: onsiteAt });
  if (installedAt) history.push({ stage: "installed", at: installedAt });
  if (completedAt) history.push({ stage: "completed", at: completedAt });
  for (const e of events) {
    if ((e.event_type as string) === "blocked") {
      history.push({ stage: "blocked", at: (e.event_at as string) ?? (e.created_at as string), note: (e.note as string) ?? null });
    }
  }
  return { stage, blocked, blockerNote, history };
}