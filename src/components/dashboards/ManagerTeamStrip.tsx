import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { initialsOf } from "@/hooks/useMyProfile";

type Technician = {
  id: string;
  name: string | null;
  email: string | null;
  department: string | null;
  shift_pattern: string | null;
};

export function ManagerTeamStrip({ technicians }: { technicians: Technician[] }) {
  return (
    <div className="w-full">
      <div className="rounded-2xl bg-card/60 flex flex-col h-[200px]">
        <header className="flex items-center justify-between px-3 py-2 border-b shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold">Team on shift</h3>
            <InfoDot text="Technicians working under this manager." />
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
        <div className="flex-1 overflow-y-auto">
          {technicians.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-xs text-muted-foreground text-center">
                No technicians assigned to this manager.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {technicians.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition"
                >
                  <div className="h-8 w-8 grid place-items-center rounded-full bg-emerald-500/10 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                    {initialsOf(t.name, t.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {t.name ?? t.email ?? "Unknown"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {t.department ? `${t.department}` : "Technician"}
                      {t.shift_pattern ? ` · ${t.shift_pattern}` : ""}
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
