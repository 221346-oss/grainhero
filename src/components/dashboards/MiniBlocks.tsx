import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowUpRight, PackageOpen, CreditCard, Users2 } from "lucide-react";
import { getDashboardExtras } from "@/lib/dashboard-extras.functions";

function useExtras() {
  const fn = useServerFn(getDashboardExtras);
  return useQuery({ queryKey: ["dashboard-extras"], queryFn: () => fn(), refetchInterval: 30_000 });
}

function MiniCard({
  to,
  icon: Icon,
  label,
  children,
}: {
  to: string;
  icon: typeof Users2;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col rounded-2xl bg-card p-3 transition hover:ring-1 hover:ring-emerald-500/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-500/5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-emerald-600" />
          {label}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100 text-emerald-600" />
      </div>
      <div className="mt-2">{children}</div>
    </Link>
  );
}

export function TeamMini() {
  const { data } = useExtras();
  const rows = data?.team ?? [];
  const shown = rows.slice(0, 4);
  const extra = Math.max(0, rows.length - shown.length);
  return (
    <MiniCard to="/team-management" icon={Users2} label="Team">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {shown.length === 0 && (
            <span className="text-sm text-muted-foreground">No members yet</span>
          )}
          {shown.map((u) => (
            <div
              key={u.id}
              className="h-8 w-8 rounded-full ring-2 ring-background bg-emerald-100 text-emerald-700 grid place-items-center text-[10px] font-semibold"
            >
              {(u.name ?? u.email ?? "?").slice(0, 2).toUpperCase()}
            </div>
          ))}
          {extra > 0 && (
            <div className="h-8 w-8 rounded-full ring-2 ring-background bg-muted grid place-items-center text-[10px] font-medium text-muted-foreground">
              +{extra}
            </div>
          )}
        </div>
        <span className="ml-auto text-lg font-bold tabular-nums">{rows.length}</span>
      </div>
    </MiniCard>
  );
}

export function InstallOrdersMini() {
  const { data } = useExtras();
  const c = data?.installCounts ?? { pending: 0, scheduled: 0, completed: 0, total: 0 };
  return (
    <MiniCard to="/orders" icon={PackageOpen} label="Install orders">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-bold tabular-nums">{c.total}</div>
        <div className="text-[11px] text-muted-foreground text-right leading-tight">
          <div>
            <span className="font-semibold text-amber-600">{c.pending}</span> pending
          </div>
          <div>
            <span className="font-semibold text-sky-600">{c.scheduled}</span> in progress
          </div>
          <div>
            <span className="font-semibold text-emerald-600">{c.completed}</span> done
          </div>
        </div>
      </div>
    </MiniCard>
  );
}

export function RevenueMini() {
  const { data } = useExtras();
  const sub = data?.subscription;
  const rev = data?.revenue ?? 0;
  return (
    <MiniCard to="/subscription" icon={CreditCard} label="Revenue & plan">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold tabular-nums">
            PKR {Math.round(rev).toLocaleString()}
          </div>
          <div className="text-[10px] text-muted-foreground">Dispatched batches</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-emerald-600">
            {sub?.plan_name ?? "No plan"}
          </div>
          {sub?.next_payment_date && (
            <div className="text-[10px] text-muted-foreground">
              renews {new Date(sub.next_payment_date).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </MiniCard>
  );
}
