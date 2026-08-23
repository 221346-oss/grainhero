/**
 * Technician Assignment Dialog with Warehouse and Availability Tracking
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getAdminWarehouses,
  getTechniciansForWarehouse,
  assignTechnicianToOrder,
} from "@/lib/warehouse-assignment.functions";
import { Loader2, MapPin, User, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

interface TechnicianAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    admin_id: string;
    warehouse_id?: string | null;
    install_city?: string | null;
    plan_name?: string | null;
  };
}

const TECH_STATUS_CONFIG = {
  available: {
    label: "Available",
    color: "bg-emerald-100 text-emerald-800 border-emerald-300",
    icon: CheckCircle2,
  },
  busy: {
    label: "Busy",
    color: "bg-amber-100 text-amber-800 border-amber-300",
    icon: Clock,
  },
  offline: {
    label: "Offline",
    color: "bg-slate-100 text-slate-700 border-slate-300",
    icon: XCircle,
  },
  on_leave: {
    label: "On Leave",
    color: "bg-rose-100 text-rose-800 border-rose-300",
    icon: AlertCircle,
  },
};

export function TechnicianAssignmentDialog({
  open,
  onOpenChange,
  order,
}: TechnicianAssignmentDialogProps) {
  const qc = useQueryClient();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(order.warehouse_id || "");
  const [selectedTechnician, setSelectedTechnician] = useState<string>("");
  const [scheduledFor, setScheduledFor] = useState<string>("");

  const getWarehouses = useServerFn(getAdminWarehouses);
  const getTechnicians = useServerFn(getTechniciansForWarehouse);
  const assignTech = useServerFn(assignTechnicianToOrder);

  // Fetch warehouses for this admin
  const { data: warehousesData, isLoading: loadingWarehouses } = useQuery({
    queryKey: ["admin-warehouses", order.admin_id],
    queryFn: () => getWarehouses({ data: { adminId: order.admin_id } }),
    enabled: open && !!order.admin_id,
  });

  // Fetch technicians for selected warehouse
  const { data: techniciansData, isLoading: loadingTechnicians } = useQuery({
    queryKey: ["warehouse-technicians", selectedWarehouse],
    queryFn: () => getTechnicians({ data: { warehouseId: selectedWarehouse || null } }),
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: (data: {
      orderId: string;
      technicianId: string;
      warehouseId?: string | null;
      scheduledFor?: string | null;
    }) => assignTech({ data }),
    onSuccess: () => {
      toast.success("Technician assigned successfully");
      qc.invalidateQueries({ queryKey: ["platform-orders"] });
      qc.invalidateQueries({ queryKey: ["platform.order", order.id] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to assign technician");
    },
  });

  const warehouses = warehousesData?.warehouses ?? [];
  const technicians = techniciansData?.technicians ?? [];
  const isFiltered = techniciansData?.filtered_by_warehouse ?? false;

  // Auto-select warehouse if only one exists
  useEffect(() => {
    if (warehouses.length === 1 && !selectedWarehouse) {
      setSelectedWarehouse(warehouses[0].id);
    }
  }, [warehouses, selectedWarehouse]);

  const handleAssign = () => {
    if (!selectedTechnician) {
      toast.error("Please select a technician");
      return;
    }

    assignMutation.mutate({
      orderId: order.id,
      technicianId: selectedTechnician,
      warehouseId: selectedWarehouse || null,
      scheduledFor: scheduledFor || null,
    });
  };

  const selectedTech = technicians.find((t: any) => t.id === selectedTechnician);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Technician</DialogTitle>
          <DialogDescription>
            Order: {order.plan_name} · {order.id.slice(0, 8)}
            {order.install_city && (
              <span className="flex items-center gap-1 mt-1 text-xs">
                <MapPin className="h-3 w-3" />
                {order.install_city}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warehouse Selection */}
          {warehouses.length > 1 && (
            <div className="space-y-2">
              <Label>Warehouse</Label>
              {loadingWarehouses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading warehouses...
                </div>
              ) : warehouses.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No warehouses found for this customer. They may need to set up a warehouse first.
                </div>
              ) : (
                <Select
                  value={selectedWarehouse || "__all__"}
                  onValueChange={(v) => setSelectedWarehouse(v === "__all__" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All warehouses (no filter)</SelectItem>
                    {warehouses.map((w: any) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name} {w.city ? `· ${w.city}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isFiltered && selectedWarehouse && (
                <p className="text-xs text-muted-foreground">
                  Showing technicians assigned to this warehouse only
                </p>
              )}
            </div>
          )}

          {/* Technician Selection */}
          <div className="space-y-2">
            <Label>Technician</Label>
            {loadingTechnicians ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading technicians...
              </div>
            ) : technicians.length === 0 ? (
              <div className="p-4 border-dashed rounded-lg text-center text-sm text-muted-foreground">
                {isFiltered
                  ? "No technicians assigned to this warehouse yet."
                  : "No technicians available in the system."}
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto rounded-lg p-2">
                {technicians.map((tech: any) => {
                  const statusConfig =
                    TECH_STATUS_CONFIG[tech.technician_status as keyof typeof TECH_STATUS_CONFIG] ||
                    TECH_STATUS_CONFIG.available;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={tech.id}
                      onClick={() => setSelectedTechnician(tech.id)}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedTechnician === tech.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <div className="font-medium text-sm">{tech.name}</div>
                            <div className="text-xs text-muted-foreground">{tech.email}</div>
                            {tech.phone && (
                              <div className="text-xs text-muted-foreground">{tech.phone}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className={`text-xs ${statusConfig.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </Badge>
                          {tech.is_primary && (
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          )}
                          {tech.current_job_count !== undefined &&
                            tech.max_concurrent_jobs !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {tech.current_job_count}/{tech.max_concurrent_jobs} jobs
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Technician Summary */}
          {selectedTech && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium mb-2">Selected: {selectedTech.name}</div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  Status:{" "}
                  {TECH_STATUS_CONFIG[
                    selectedTech.technician_status as keyof typeof TECH_STATUS_CONFIG
                  ]?.label || "Unknown"}
                </span>
                <span>
                  Current jobs: {selectedTech.current_job_count ?? 0}/
                  {selectedTech.max_concurrent_jobs ?? 3}
                </span>
                {!selectedTech.is_available && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                    At capacity
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Schedule Date/Time */}
          <div className="space-y-2">
            <Label>Scheduled Installation (Optional)</Label>
            <Input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to schedule later. Customer will be notified once scheduled.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedTechnician || assignMutation.isPending}>
            {assignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Technician"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
