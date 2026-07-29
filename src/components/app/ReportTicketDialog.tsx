import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reportFieldIncident } from "@/lib/field-settings.functions";
import { getMyRole } from "@/lib/roles.functions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Ticket } from "lucide-react";

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "medium",   label: "Medium" },
  { value: "low",      label: "Low" },
] as const;

const ROUTE_OPTIONS = [
  { value: "admin",      label: "Admin" },
  { value: "technician", label: "Technician" },
] as const;

type Silo = { id: string; name: string; silo_id: string };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  silos?: Silo[];
  /** Extra query keys to invalidate on success (in addition to defaults) */
  extraInvalidate?: string[][];
}

export function ReportTicketDialog({ open, onOpenChange, silos = [], extraInvalidate = [] }: Props) {
  const qc = useQueryClient();
  const reportFn = useServerFn(reportFieldIncident);
  const getRoleFn = useServerFn(getMyRole);

  const { data: roleData } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => getRoleFn(),
    staleTime: 5 * 60_000,
  });

  const detectedRole = roleData?.role ?? "manager";
  const userProfileName = roleData?.profile?.name || roleData?.profile?.email || "";

  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "critical">("medium");
  const [targetRole, setTargetRole] = useState<"admin" | "technician">("technician");
  const [reporterName, setReporterName] = useState("");
  const [role, setRole] = useState("manager");
  const [description, setDescription] = useState("");
  const [siloId, setSiloId] = useState<string>("");

  useEffect(() => {
    if (detectedRole) {
      setRole(detectedRole);
      setTargetRole("technician");
    }
    if (userProfileName && !reporterName) {
      setReporterName(userProfileName);
    }
  }, [detectedRole, userProfileName]);

  function reset() {
    setTitle("");
    setSeverity("medium");
    setTargetRole("technician");
    setReporterName(userProfileName);
    setRole(detectedRole);
    setDescription("");
    setSiloId("");
  }

  const mut = useMutation({
    mutationFn: () =>
      reportFn({
        data: {
          title: title.trim(),
          category: title.trim(),
          severity,
          reporter_name: reporterName.trim() || undefined,
          reporter_role: role.trim() || undefined,
          target_role: targetRole,
          description: description.trim() || undefined,
          silo_id: siloId || null,
        },
      }),
    onSuccess: () => {
      toast.success(`Incident ticket reported and sent to ${targetRole.toUpperCase()}!`);
      reset();
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["manager-dashboard"] });
      qc.invalidateQueries({ queryKey: ["open-field-tickets"] });
      qc.invalidateQueries({ queryKey: ["field-incidents"] });
      extraInvalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSubmit = title.trim().length > 0 && !mut.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4 text-amber-600" />
            Report Incident Ticket
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 1. Title on top */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Title / Incident <span className="text-red-500">*</span>
            </Label>
            <Input
              id="ticket-title"
              placeholder="Enter incident title e.g. Conveyor Motor Overheating"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
              autoFocus
            />
          </div>

          {/* 2. Type / Stage of Incident - Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-severity" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Type / Stage of Incident
            </Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as "low" | "medium" | "critical")}>
              <SelectTrigger id="ticket-severity">
                <SelectValue placeholder="Select severity level" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Route Incident To - Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-target-role" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Route Incident To
            </Label>
            <Select value={targetRole} onValueChange={(v) => setTargetRole(v as "admin" | "technician")}>
              <SelectTrigger id="ticket-target-role">
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {ROUTE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4. Reporter Name & 5. Role field (2-col grid) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-reporter" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Reporter Name
              </Label>
              <Input
                id="ticket-reporter"
                placeholder="Reporter name"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-role" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                My Role
              </Label>
              <Input
                id="ticket-role"
                value={role}
                readOnly
                disabled
                className="text-sm bg-muted/50 capitalize font-medium cursor-not-allowed"
              />
            </div>
          </div>

          {/* Affected Silo (Optional if silos available) */}
          {silos.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Affected Silo <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Select value={siloId} onValueChange={setSiloId}>
                <SelectTrigger id="ticket-silo">
                  <SelectValue placeholder="None / General field" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None / General field</SelectItem>
                  {silos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.silo_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 6. Description at the end */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-description" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="ticket-description"
              rows={3}
              placeholder="Describe the incident, observed symptoms, or immediate actions taken…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-sm resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={mut.isPending}>
            Cancel
          </Button>
          <Button
            id="ticket-submit"
            onClick={() => mut.mutate()}
            disabled={!canSubmit}
            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium"
          >
            {mut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ticket className="h-3.5 w-3.5" />}
            Report Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
