import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { Users } from "lucide-react";
import { initialsOf } from "@/hooks/useMyProfile";

type Technician = {
  id: string;
  name: string | null;
  email: string | null;
  department: string | null;
  shift_pattern: string | null;
};

export function ManagerTeamStrip({
  technicians,
}: {
  technicians: Technician[];
}) {
  return (
    <div className="w-full">
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
