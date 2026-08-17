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
} from "@/lib/technician-management.functions";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Users, Plus, MoreHorizontal, Loader2, CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";

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
  const updateFn = useServerFn(updateGlobalTechnician);
  const deleteFn = useServerFn(deleteGlobalTechnician);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const createMutation = useMutation({
    mutationFn: (formData: any) => createFn(formData),
    onSuccess: () => {
      toast.success("Technician created successfully");
      qc.invalidateQueries({ queryKey: ["global-technicians"] });
      setCreateOpen(false);
      setFormData({ name: "", email: "", phone: "", password: "", max_concurrent_jobs: "3" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ technicianId: id }),
    onSuccess: () => {
      toast.success("Technician removed");
      qc.invalidateQueries({ queryKey: ["global-technicians"] });
      setDeleteId(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error("Name and email are required");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || undefined,
      password: formData.password || undefined,
      max_concurrent_jobs: parseInt(formData.max_concurrent_jobs),
    });
  };

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
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading technicians...
        </div>
      ) : technicians.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No global technicians yet</p>
          <p className="text-sm text-muted-foreground mt-1">Create your first technician to start assigning installations</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">Jobs</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-right font-semibold text-xs uppercase text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {technicians.map((tech: any) => {
                  const statusCfg = STATUS_CONFIG[tech.technician_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.available;
                  const StatusIcon = statusCfg.icon;
                  return (
                    <tr key={tech.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{tech.name}</div>
                          {tech.phone && <div className="text-xs text-muted-foreground">{tech.phone}</div>}
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
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
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

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Company Technician</DialogTitle>
            <DialogDescription>
              Create a new global technician for installation assignments
            </DialogDescription>
          </DialogHeader>

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
                placeholder="Leave empty to send invite link"
                className="mt-1 h-9"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to send invitation email
              </p>
            </div>

            <div>
              <Label htmlFor="jobs">Max Concurrent Jobs</Label>
              <Select value={formData.max_concurrent_jobs} onValueChange={(v) => setFormData({ ...formData, max_concurrent_jobs: v })}>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Technician"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
