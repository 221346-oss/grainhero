import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { Users, ShieldAlert } from "lucide-react";
import { initialsOf } from "@/hooks/useMyProfile";

export function ManagerTeamStrip({
  technicians, incidents,
}: {
  technicians: Array<{ id: string; name: string | null; email: string | null; department: string | null; shift_pattern: string | null }>;
  incidents: Array<{ id: string; title: string; severity: string | null; status: string; created_at: string; assigned_to: string | null }>;
}) {
  const sevColor = (s: string | null) =>
    s === "critical" ? "bg-red-500/10 text-red-600"
    : s === "high" ? "bg-amber-500/10 text-amber-600"
    : "bg-sky-500/10 text-sky-600";

  return (
    <div className="grid gap-3 md:grid-cols-2">
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
          <Link to="/team-management" className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
            Manage
          </Link>
        </header>
        <div className="max-h-[220px] overflow-auto p-2">
          {technicians.length === 0 ? (
            <p className="text-xs text-muted-foreground px-2 py-4">Invite team members to see them here.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-1.5">
              {technicians.map((t) => (
                <li key={t.id} className="flex items-center gap-2 rounded-lg border bg-card/50 px-2 py-1.5">
                  <div className="h-7 w-7 grid place-items-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {initialsOf(t.name, t.email)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{t.name ?? t.email}</div>
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

      <div className="rounded-xl border bg-card/60">
        <header className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-emerald-600" />
            <h3 className="text-xs font-semibold">Open field incidents</h3>
            <InfoDot text="Field incidents currently open or in progress. Escalate from the incidents page." />
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {incidents.length}
            </span>
          </div>
        </header>
        <div className="max-h-[220px] overflow-auto">
          {incidents.length === 0 ? (
            <p className="text-xs text-muted-foreground px-3 py-4">No open incidents.</p>
          ) : (
            <ul className="divide-y">
              {incidents.map((i) => (
                <li key={i.id} className="flex items-center justify-between px-3 py-1.5">
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">{i.title}</div>
                    <div className="text-[10px] text-muted-foreground">{i.status}</div>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${sevColor(i.severity)}`}>
                    {i.severity ?? "n/a"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}