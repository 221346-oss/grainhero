import { Link } from "@tanstack/react-router";
import { InfoDot } from "@/components/ui/InfoDot";
import { AlertTriangle, ClipboardCheck, Truck, ToggleRight, Package, Container, UserCheck, Loader2 } from "lucide-react";
import { type ReactNode, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { assignFieldIncident } from "@/lib/field-settings.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type Row = { id: string; primary: ReactNode; secondary?: ReactNode; badge?: ReactNode; action?: ReactNode; to?: string; search?: { tab: string } };

function BentoCard({
  title, icon: Icon, count, to, search, tooltip, rows, empty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  to: string;
  search?: { tab: string };
  tooltip: string;
  rows: Row[];
  empty: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 flex flex-col min-h-0">
      <header className="flex items-center justify-between px-3 py-2 border-b bg-card/40 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <h3 className="text-xs font-semibold truncate">{title}</h3>
          <InfoDot text={tooltip} />
          {typeof count === "number" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {count}
            </span>
          )}
        </div>
        <Link to={to} search={search as never} className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
          View all
        </Link>
      </header>
      <div className="max-h-[260px] overflow-auto">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground px-3 py-6 text-center">{empty}</p>
        ) : (
          <ul className="divide-y">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition">
                {r.to ? (
                  <Link to={r.to} search={r.search as never} className="flex-1 min-w-0 flex flex-col">
                    <div className="text-xs font-medium truncate">{r.primary}</div>
                    {r.secondary && (
                      <div className="text-[10px] text-muted-foreground truncate">{r.secondary}</div>
                    )}
                  </Link>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{r.primary}</div>
                    {r.secondary && (
                      <div className="text-[10px] text-muted-foreground truncate">{r.secondary}</div>
                    )}
                  </div>
                )}
                {r.badge}
                {r.action}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PriorityPill({ p }: { p?: string | null }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/10 text-red-600",
    high: "bg-amber-500/10 text-amber-600",
    medium: "bg-sky-500/10 text-sky-600",
    low: "bg-slate-500/10 text-slate-600",
  };
  const key = String(p ?? "medium").toLowerCase();
  return <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${map[key] ?? map.medium}`}>{key}</span>;
}

// ─── Assign Field Incident Button ─────────────────────────────────────────────
function AssignIncidentButton({
  incidentId, technicians,
}: {
  incidentId: string;
  technicians: Array<{ id: string; name: string | null; email: string | null; is_busy?: boolean; active_batch_id?: string | null }>;
}) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const assignFn = useServerFn(assignFieldIncident);

  const mut = useMutation({
    mutationFn: (techId: string) => assignFn({ data: { id: incidentId, assigned_to: techId } }),
    onSuccess: () => {
      toast.success("Field incident assigned to technician");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["manager-dashboard"] });
      qc.invalidateQueries({ queryKey: ["field-incidents"] });
      qc.invalidateQueries({ queryKey: ["tenant-technicians"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (technicians.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
          title="Assign incident technician"
        >
          <UserCheck className="h-3 w-3" />
          Assign Tech
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-2" align="end" side="left">
        <p className="text-xs font-semibold mb-2">Assign Technician (1-to-1 Incident)</p>
        <ul className="space-y-1 max-h-48 overflow-auto">
          {technicians.map((techObj) => {
            const isBusy = Boolean(techObj.is_busy);
            return (
              <li key={techObj.id}>
                <Button
                  variant="ghost" size="sm"
                  className={`w-full justify-start gap-2 h-auto py-1.5 ${isBusy ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900" : ""}`}
                  disabled={mut.isPending || isBusy}
                  onClick={() => mut.mutate(techObj.id)}
                  title={isBusy ? `Busy on ${techObj.active_batch_id}` : "Available for assignment"}
                >
                  {mut.isPending
                    ? <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                    : <div className={`h-5 w-5 grid place-items-center rounded-full text-[8px] font-bold shrink-0 ${isBusy ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                        {(techObj.name ?? techObj.email ?? "?").slice(0, 2).toUpperCase()}
                      </div>
                  }
                  <div className="flex-1 min-w-0 text-left">
                    <div className="text-xs truncate">{techObj.name ?? techObj.email ?? "Technician"}</div>
                    {isBusy && <div className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold">Busy: {techObj.active_batch_id}</div>}
                  </div>
                </Button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export function ManagerBento({
  silos, alerts, qcQueue, dispatchQueue, actuators, orders, technicians, incidents,
}: {
  silos: Array<{ id: string; name: string; silo_id: string; capacity_kg: number; current_occupancy_kg: number | null; status: string | null }>;
  alerts: Array<{ id: string; title: string; priority: string | null; alert_type: string | null; triggered_at: string | null }>;
  qcQueue: Array<{ id: string; batch_id: string; grain_type: string; quantity_kg: number; risk_score: number | null }>;
  dispatchQueue: Array<{ id: string; batch_id: string; grain_type: string; quantity_kg: number }>;
  actuators: Array<{ id: string; name: string; actuator_type: string; is_on: boolean | null; silo_id: string | null }>;
  orders: Array<{ id: string; order_number: string; status: string; total_amount: number | null; created_at: string }>;
  technicians?: Array<{ id: string; name: string | null; email: string | null; is_busy?: boolean; active_batch_id?: string | null }>;
  incidents?: Array<{ id: string; category: string; severity: string; status: string; created_at: string; assigned_to: string | null; silo_id?: string | null; notes?: string | null }>;
}) {
  // Map silo ID to current batch info for incident batch displaying
  const siloBatchMap = useMemo(() => {
    const map: Record<string, { batch_id: string; grain_type: string }> = {};
    silos.forEach((s) => {
      const batch = qcQueue.find((b) => (b as { silo_id?: string }).silo_id === s.id) ??
                    dispatchQueue.find((b) => (b as { silo_id?: string }).silo_id === s.id);
      if (batch) {
        map[s.id] = { batch_id: batch.batch_id, grain_type: batch.grain_type };
      }
    });
    return map;
  }, [silos, qcQueue, dispatchQueue]);

  const siloRows: Row[] = silos.map((s) => {
    const pct = s.capacity_kg ? Math.round((Number(s.current_occupancy_kg ?? 0) / s.capacity_kg) * 100) : 0;
    return {
      id: s.id,
      primary: s.name,
      secondary: `${s.silo_id} · ${pct}% full`,
      badge: (
        <div className="w-16">
          <div className="h-1.5 rounded-full bg-emerald-500/10 overflow-hidden">
            <div className={`h-full ${pct > 85 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
        </div>
      ),
      to: `/silos/${s.id}`,
    };
  });

  const alertRows: Row[] = alerts.map((a) => ({
    id: a.id,
    primary: a.title,
    secondary: a.alert_type ?? "alert",
    badge: <PriorityPill p={a.priority} />,
    to: "/grain-alerts",
  }));

  const qcRows: Row[] = qcQueue.map((b) => ({
    id: b.id,
    primary: b.batch_id,
    secondary: `${b.grain_type} · ${Number(b.quantity_kg).toLocaleString()} kg`,
    badge: (b.risk_score ?? 0) >= 70
      ? <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/10 text-red-600">risk</span>
      : <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">ok</span>,
    to: "/grain-operations",
    search: { tab: "batches" },
  }));

  const dispatchRows: Row[] = dispatchQueue.map((b) => ({
    id: b.id,
    primary: b.batch_id,
    secondary: `${b.grain_type} · ${Number(b.quantity_kg).toLocaleString()} kg`,
    to: "/grain-operations",
    search: { tab: "silos" },
  }));

  const actRows: Row[] = actuators.map((a) => ({
    id: a.id,
    primary: a.name,
    secondary: a.actuator_type,
    badge: (
      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${a.is_on ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-slate-500/10 text-slate-600"}`}>
        {a.is_on ? "on" : "off"}
      </span>
    ),
    to: "/actuators",
  }));

  const orderRows: Row[] = orders.map((o) => ({
    id: o.id,
    primary: o.order_number,
    secondary: `${o.status} · Rs. ${Number(o.total_amount ?? 0).toLocaleString()}`,
    to: "/orders",
  }));

  const techs = technicians ?? [];
  const incList = incidents ?? [];
  const incidentRows: Row[] = incList.map((inc) => {
    const silo = silos.find((s) => s.id === inc.silo_id);
    const batchInfo = inc.silo_id ? siloBatchMap[inc.silo_id] : null;
    const batchLabel = batchInfo ? `Batch: ${batchInfo.batch_id} (${batchInfo.grain_type})` : silo ? `Silo: ${silo.name}` : "General field incident";
    const assignedTech = inc.assigned_to ? techs.find((t) => t.id === inc.assigned_to) : null;

    return {
      id: inc.id,
      primary: `${inc.category} — ${batchLabel}`,
      secondary: inc.notes ? `"${inc.notes}"` : `Severity: ${inc.severity} · ${inc.status}`,
      badge: (
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${inc.severity === "high" || inc.severity === "critical" ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300"}`}>
          {inc.severity}
        </span>
      ),
      action: assignedTech ? (
        <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 shrink-0">
          Tech: {assignedTech.name ?? assignedTech.email}
        </span>
      ) : (
        <AssignIncidentButton incidentId={inc.id} technicians={techs} />
      ),
      to: "/platform/field-incidents",
    };
  });

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      <BentoCard title="Silos" icon={Container} count={silos.length} to="/grain-operations" search={{ tab: "silos" }}
        tooltip="Silo utilisation, sorted by fill. Click any silo for full detail."
        rows={siloRows} empty="No silos yet — provision from install orders." />
      <BentoCard title="Alert triage" icon={AlertTriangle} count={alerts.length} to="/grain-alerts"
        tooltip="Open alerts awaiting acknowledgement or escalation."
        rows={alertRows} empty="All clear — no open alerts." />
      <BentoCard title="QC queue" icon={ClipboardCheck} count={qcQueue.length} to="/grain-operations" search={{ tab: "batches" }}
        tooltip="Batches currently in intake / processing / treatment awaiting QC sign-off."
        rows={qcRows} empty="No batches pending QC." />
      <BentoCard title="Open field incidents" icon={AlertTriangle} count={incList.length} to="/platform/field-incidents"
        tooltip="Active field incidents with affected batches. Assign 1 technician per incident."
        rows={incidentRows} empty="No open field incidents." />
      <BentoCard title="Dispatch queue" icon={Truck} count={dispatchQueue.length} to="/grain-operations" search={{ tab: "silos" }}
        tooltip="Batches ready to be dispatched to buyers."
        rows={dispatchRows} empty="Nothing ready to ship." />
      <BentoCard title="Actuators" icon={ToggleRight} count={actuators.length} to="/actuators"
        tooltip="Latest actuator state. Click through to toggle from the Actuators page."
        rows={actRows} empty="No actuators registered." />
      <BentoCard title="Buyer orders" icon={Package} count={orders.length} to="/orders"
        tooltip="Open buyer orders — pending or confirmed. Fulfil from the orders page."
        rows={orderRows} empty="No open buyer orders." />
    </div>
  );
}
