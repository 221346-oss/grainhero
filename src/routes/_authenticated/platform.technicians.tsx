import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  listGlobalTechnicians,
  createGlobalTechnician,
  updateGlobalTechnician,
  deleteGlobalTechnician,
  getGlobalTechnicianDetail,
} from "@/lib/technician-management.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  MoreHorizontal,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  Warehouse as WarehouseIcon,
  MapPin,
  CalendarClock,
} from "lucide-react";
import { SuperAdminTechnicianDashboard } from "@/components/dashboards/SuperAdminTechnicianDashboard";

export const Route = createFileRoute("/_authenticated/platform/technicians")({
  head: () => ({
    meta: [{ title: "Technicians — Platform" }],
  }),
  component: PlatformTechniciansPage,
});

const STATUS_CONFIG = {
  available: { label: "Available", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 },
  busy: { label: "Busy", color: "bg-amber-100 text-amber-800", icon: Clock },
  offline: { label: "Offline", color: "bg-slate-100 text-slate-700", icon: XCircle },
  on_leave: { label: "On Leave", color: "bg-rose-100 text-rose-800", icon: AlertCircle },
};

function PlatformTechniciansPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listGlobalTechnicians);
  const createFn = useServerFn(createGlobalTechnician);
  const deleteFn = useServerFn(deleteGlobalTechnician);
  const detailFn = useServerFn(getGlobalTechnicianDetail);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    max_concurrent_jobs: "3",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["global-technicians"],
    queryFn: () => listFn(),
    staleTime: 30000,
  });

  const technicians = data?.technicians ?? [];

  const { data: detailData, isLoading: detailLoading } = useQuery({
    queryKey: ["technician-detail", detailId],
    queryFn: () => detailFn({ data: { technicianId: detailId! } }),
    enabled: !!detailId,
  });

  const createMutation = useMutation({
    mutationFn: (v: {
      data: {
        name: string;
        email: string;
        phone?: string;
        password?: string;
        max_concurrent_jobs: number;
      };
    }) => createFn(v),
    onSuccess: () => {
      toast.success("Technician created successfully");
      qc.invalidateQueries({ queryKey: ["global-technicians"] });
      setCreateOpen(false);
      setFormData({ name: "", email: "", phone: "", password: "", max_concurrent_jobs: "3" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { technicianId: id } }),
    onSuccess: () => {
      toast.success("Technician removed");
      qc.invalidateQueries({ queryKey: ["global-technicians"] });
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateFn = useServerFn(updateGlobalTechnician);
  const resetCountMutation = useMutation({
    mutationFn: (id: string) => updateFn({ data: { technicianId: id, current_job_count: 0 } }),
    onSuccess: () => {
      toast.success("Job count reset — this technician can be assigned again");
      qc.invalidateQueries({ queryKey: ["global-technicians"] });
      qc.invalidateQueries({ queryKey: ["technician-detail", detailId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    createMutation.mutate({
      data: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password || undefined,
        max_concurrent_jobs: parseInt(formData.max_concurrent_jobs),
      },
    });
  };

  const detail = detailData as
    | {
        technician: Record<string, any>;
        installs: Array<Record<string, any>>;
        assignments: Array<Record<string, any>>;
      }
    | undefined;

  return (
    <AdminPageShell
      title="Company Technicians"
      subtitle="Create and manage global technicians for installation assignments"
      actions={
        <Button onClick={() => setCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Technician
        </Button>
      }
    >
      {/* Fleet Stats & Installations — superadmin only */}
      <SuperAdminTechnicianDashboard />

      {/* Technician Fleet Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading technicians...
        </div>
      ) : technicians.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No global technicians yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first technician to start assigning installations
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    Jobs
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-xs uppercase text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {technicians.map((tech: any) => {
                  const statusCfg =
                    STATUS_CONFIG[tech.technician_status as keyof typeof STATUS_CONFIG] ||
                    STATUS_CONFIG.available;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr
                      key={tech.id}
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => setDetailId(tech.id)}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{tech.name}</div>
                          {tech.phone && (
                            <div className="text-xs text-muted-foreground">{tech.phone}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{tech.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {tech.current_job_count ?? 0}/{tech.max_concurrent_jobs ?? 3}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(tech.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => setDetailId(tech.id)}>
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled>Edit (coming soon)</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteId(tech.id)}
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">
            {technicians.length} technician{technicians.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Create Sheet Sidebar */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-96">
          <SheetHeader>
            <SheetTitle>Add Company Technician</SheetTitle>
            <SheetDescription>
              Create a new global technician for installation assignments
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                className="mt-1 h-9"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
                className="mt-1 h-9"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+92 300 1234567"
                className="mt-1 h-9"
              />
            </div>

            <div>
              <Label htmlFor="password">Password (Optional)</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Leave empty to send invitation email"
                className="mt-1 h-9"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to send invitation email
              </p>
            </div>

            <div>
              <Label htmlFor="jobs">Max Concurrent Jobs</Label>
              <Select
                value={formData.max_concurrent_jobs}
                onValueChange={(v) => setFormData({ ...formData, max_concurrent_jobs: v })}
              >
                <SelectTrigger id="jobs" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} job{n !== 1 ? "s" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Maximum installations they can handle simultaneously
              </p>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Technician"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Detail Drawer */}
      <Sheet open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent side="right" className="w-[26rem] overflow-y-auto">
          {detailLoading || !detail ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>{detail.technician.name}</SheetTitle>
                <SheetDescription>
                  {detail.technician.email} ·{" "}
                  {(detail.technician as any).created_at
                    ? new Date((detail.technician as any).created_at).toLocaleDateString()
                    : "—"}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 py-4">
                {/* Contact + status */}
                <div className="rounded-lg border border-border p-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    {(() => {
                      const cfg =
                        STATUS_CONFIG[
                          detail.technician.technician_status as keyof typeof STATUS_CONFIG
                        ] || STATUS_CONFIG.available;
                      const Icon = cfg.icon;
                      return (
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          <Icon className="w-3 h-3 mr-1" /> {cfg.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Jobs</span>
                    <span className="font-medium flex items-center gap-2">
                      {(detail.technician as any).current_job_count ?? 0}/
                      {(detail.technician as any).max_concurrent_jobs ?? 3}
                      {((detail.technician as any).current_job_count ?? 0) >
                        ((detail.technician as any).max_concurrent_jobs ?? 3) && (
                        <button
                          onClick={() => {
                            const cur = (detail.technician as any).current_job_count ?? 0;
                            const max = (detail.technician as any).max_concurrent_jobs ?? 3;
                            if (
                              confirm(
                                `Reset job count from ${cur}/${max} to 0/? This frees slots for new assignments.`,
                              )
                            ) {
                              resetCountMutation.mutate((detail.technician as any).id);
                            }
                          }}
                          disabled={resetCountMutation.isPending}
                          className="text-[10px] font-semibold text-rose-700 border border-rose-200 rounded px-1.5 py-0.5 hover:bg-rose-50 disabled:opacity-50"
                        >
                          Reset count
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Phone</span>
                    {detail.technician.phone ? (
                      <a
                        href={`tel:${detail.technician.phone}`}
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {detail.technician.phone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <a
                      href={`mailto:${detail.technician.email}`}
                      className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Contact
                    </a>
                  </div>
                  {(detail.technician as any).last_active_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Last active</span>
                      <span>
                        {new Date((detail.technician as any).last_active_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Warehouse assignments */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <WarehouseIcon className="h-4 w-4 text-muted-foreground" /> Warehouse
                    assignments
                  </h4>
                  {detail.assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Not assigned to any warehouse yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {detail.assignments.map((a) => (
                        <li
                          key={a.id as string}
                          className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {a.city ?? "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {(a.warehouses as any)?.name ?? "—"}
                            {a.is_primary ? (
                              <Badge className="ml-2 bg-emerald-100 text-emerald-800 text-[10px]">
                                Primary
                              </Badge>
                            ) : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Install history */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <CalendarClock className="h-4 w-4 text-muted-foreground" /> Install history
                  </h4>
                  {detail.installs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No installs assigned yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {detail.installs.map((i) => {
                        const order = (i.hardware_orders ?? {}) as Record<string, any>;
                        return (
                          <li
                            key={i.id as string}
                            className="rounded-md border border-border p-3 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">
                                Order {(i.order_id as string)?.slice(0, 8)}
                              </span>
                              <Badge className="text-[10px] bg-slate-200 text-slate-700">
                                {(i.status as string).replace("_", " ")}
                              </Badge>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              {i.scheduled_for && (
                                <span className="inline-flex items-center gap-1">
                                  <CalendarClock className="h-3 w-3" />
                                  {new Date(i.scheduled_for as string).toLocaleString()}
                                </span>
                              )}
                              {(order.install_city || order.customer_name) && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {order.install_city ?? order.customer_name}
                                </span>
                              )}
                            </div>
                            {i.blocker_note && (
                              <p className="mt-1 text-xs text-rose-700">
                                Blocked: {i.blocker_note}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Technician?</AlertDialogTitle>
            <AlertDialogDescription>
              This technician will be marked as offline and removed from the assignment pool.
              Existing assignments will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
