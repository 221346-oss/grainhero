"use client";

import { useState } from "react";
import { Loader2, Wrench } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMaintenanceOverview } from "@/lib/operations2.functions";
import { listSensorDevices } from "@/lib/operations.functions";
import {
  createMaintenanceRequest,
  listMaintenanceRequests,
} from "@/lib/maintenance-requests.functions";
import { getMyRole } from "@/lib/roles.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptyForm = { title: "", description: "", deviceId: "", priority: "normal" as const };

function RequestMaintenanceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const listDevicesFn = useServerFn(listSensorDevices);
  const createFn = useServerFn(createMaintenanceRequest);
  const [form, setForm] = useState(emptyForm);

  const devicesQ = useQuery({
    queryKey: ["sensor-devices"],
    queryFn: () => listDevicesFn(),
    enabled: open,
  });
  const devices = (devicesQ.data ?? []) as Array<{
    id: string;
    device_name: string | null;
    device_id: string;
  }>;

  const mutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: form.title.trim(),
          description: form.description.trim() || null,
          deviceId: form.deviceId || null,
          priority: form.priority,
        },
      }),
    onSuccess: () => {
      toast.success("Maintenance requested");
      qc.invalidateQueries({ queryKey: ["maintenance-requests"] });
      setForm(emptyForm);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit request"),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setForm(emptyForm);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request maintenance</DialogTitle>
          <DialogDescription>
            Flag a device or silo sensor for Super Admin to schedule maintenance on.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              minLength={3}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Device (optional)</Label>
            <Select
              value={form.deviceId}
              onValueChange={(v) => setForm((f) => ({ ...f, deviceId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pick a device" />
              </SelectTrigger>
              <SelectContent>
                {devices.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.device_name ?? d.device_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Priority</Label>
            <Select
              value={form.priority}
              onValueChange={(v) => setForm((f) => ({ ...f, priority: v as typeof form.priority }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Description (optional)</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || form.title.trim().length < 3}
              className="gap-2"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4" />
              )}
              {mutation.isPending ? "Submitting…" : "Submit request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function statusTone(status: string) {
  if (status === "completed") return "bg-emerald-500/20 text-emerald-400";
  if (status === "cancelled") return "bg-muted text-muted-foreground";
  if (status === "in_progress") return "bg-sky-500/20 text-sky-400";
  return "bg-amber-500/20 text-amber-400";
}

export function MaintenanceSection() {
  const getFn = useServerFn(getMaintenanceOverview);
  const listRequestsFn = useServerFn(listMaintenanceRequests);
  const fetchRole = useServerFn(getMyRole);
  const [dlgOpen, setDlgOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-overview"],
    queryFn: () => getFn(),
  });
  const { data: me } = useQuery({ queryKey: ["my-role"], queryFn: () => fetchRole() });
  const canRequest = me?.role === "admin";

  // This tab only renders for admin/manager/technician (super_admin is
  // routed to /platform/monitoring instead) — only admins can read
  // maintenance_requests per RLS, so this stays empty for manager/technician.
  const requestsQ = useQuery({
    queryKey: ["maintenance-requests"],
    queryFn: () => listRequestsFn(),
    enabled: canRequest,
  });
  const myRequests = requestsQ.data?.requests ?? [];

  const dueSoon = (data?.devices ?? [])
    .filter((d: any) => d.next_maintenance_date || d.calibration_due_date)
    .map((d: any) => {
      const due = d.next_maintenance_date ?? d.calibration_due_date;
      return {
        id: d.id,
        task_description: `${d.device_name ?? d.device_id} — ${d.next_maintenance_date ? "scheduled maintenance" : "calibration"}`,
        maintenance_type: d.device_type,
        status: due && new Date(due).getTime() < Date.now() ? "pending" : "scheduled",
        due_date: due,
      };
    });

  return (
    <div className="space-y-6">
      {canRequest && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Flag a device for Super Admin to schedule maintenance.
          </p>
          <Button size="sm" className="gap-1.5" onClick={() => setDlgOpen(true)}>
            <Wrench className="w-3.5 h-3.5" /> Request maintenance
          </Button>
        </div>
      )}

      {canRequest && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your maintenance requests
          </h3>
          {myRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No maintenance requests yet.</p>
          ) : (
            <div className="bg-muted/30 border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Requested
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {myRequests.map((r: any) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-foreground font-medium">{r.title}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs capitalize">
                        {r.priority}
                      </td>
                      <td className="px-4 py-2">
                        <Badge className={statusTone(r.status)}>{r.status.replace("_", " ")}</Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Due soon (from calibration schedule)
        </h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading maintenance tasks…
          </div>
        ) : dueSoon.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm">No maintenance tasks.</p>
          </div>
        ) : (
          <div className="bg-muted/30 border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">
                      Due
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(dueSoon as any[]).map((m) => (
                    <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">
                        {m.task_description}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {m.maintenance_type ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={
                            m.status === "pending"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }
                        >
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {m.due_date ? new Date(m.due_date).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <RequestMaintenanceDialog open={dlgOpen} onOpenChange={setDlgOpen} />
    </div>
  );
}
