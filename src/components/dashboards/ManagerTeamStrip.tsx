import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { Users, ShieldAlert, UserCheck, Loader2, CheckCircle } from "lucide-react";
import { initialsOf } from "@/hooks/useMyProfile";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { assignFieldIncident } from "@/lib/field-settings.functions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Technician = {
  id: string;
  name: string | null;
  email: string | null;
  department: string | null;
  shift_pattern: string | null;
};

type Incident = {
  id: string;
  category: string;
  severity: string | null;
  status: string;
  created_at: string;
  assigned_to: string | null;
};

function SevPill({ s }: { s: string | null }) {
  const cls =
    s === "critical"
      ? "bg-red-500/10 text-red-600"
      : s === "high"
        ? "bg-amber-500/10 text-amber-600"
        : "bg-sky-500/10 text-sky-600";
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${cls}`}>
      {s ?? "n/a"}
    </span>
  );
}

function StatusPill({ s }: { s: string }) {
  const cls =
    s === "investigating"
      ? "bg-blue-500/10 text-blue-600"
      : s === "resolved"
        ? "bg-emerald-500/10 text-emerald-700"
        : "bg-amber-500/10 text-amber-600";
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${cls}`}>
      {s}
    </span>
  );
}

function AssignButton({
  incident,
  technicians,
}: {
  incident: Incident;
  technicians: Technician[];
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const assignFn = useServerFn(assignFieldIncident);

  const assignMut = useMutation({
    mutationFn: (techId: string) =>
      assignFn({ data: { id: incident.id, assigned_to: techId } }),
    onSuccess: () => {
      toast.success("Technician assigned — incident now investigating");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["manager-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Find assigned technician name if already assigned
  const assignedTech = technicians.find((t) => t.id === incident.assigned_to);

  if (incident.assigned_to && assignedTech) {
    return (
      <div className="flex items-center gap-1 shrink-0">
        <div
          title={assignedTech.name ?? assignedTech.email ?? "Technician"}
          className="h-5 w-5 grid place-items-center rounded-full bg-blue-500/15 text-[8px] font-bold text-blue-700 dark:text-blue-300"
        >
          {initialsOf(assignedTech.name, assignedTech.email)}
        </div>
        <CheckCircle className="h-3 w-3 text-blue-500" />
      </div>
    );
  }

  if (incident.status !== "open") return null;

  const availableTechs = technicians.filter((t) => t.id !== incident.assigned_to);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          title="Assign a technician"
        >
          <UserCheck className="h-3 w-3" />
          Assign
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end" side="left">
        <div className="mb-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Assign technician
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5 capitalize">
            {incident.category.replace(/_/g, " ")}
          </p>
        </div>
        {availableTechs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            No technicians available.
          </p>
        ) : (
          <ul className="space-y-1 max-h-48 overflow-auto">
            {availableTechs.map((t) => (
              <li key={t.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-auto py-1.5"
                  disabled={assignMut.isPending}
                  onClick={() => assignMut.mutate(t.id)}
                >
                  {assignMut.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : (
                    <div className="h-6 w-6 grid place-items-center rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                      {initialsOf(t.name, t.email)}
                    </div>
                  )}
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-medium truncate">
                      {t.name ?? t.email}
                    </div>
                    {t.department && (
                      <div className="text-[10px] text-muted-foreground truncate">
                        {t.department}
                      </div>
                    )}
                  </div>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function ManagerTeamStrip({
  technicians,
}: {
  technicians: Technician[];
  incidents?: Incident[];
}) {
  return (
    <div className="w-full">
      {/* ── Team on shift ── */}
      <div className="rounded-xl border bg-card/60">
        <header className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-emerald-600" />
            <h3 className="text-xs font-semibold">Team on shift</h3>
            <InfoDot text="Technicians and staff attached to this tenant." />
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {technicians.length}
            </span>
          </div>
          <Link
            to="/team-management"
            className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Manage
          </Link>
        </header>
        <div className="max-h-[220px] overflow-auto p-2">
          {technicians.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4">
              Invite team members to see them here.
            </p>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {technicians.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 rounded-lg border bg-card/50 px-2.5 py-2"
                >
                  <div className="h-7 w-7 grid place-items-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {initialsOf(t.name, t.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">
                      {t.name ?? t.email}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {[t.department, t.shift_pattern].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}