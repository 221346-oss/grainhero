import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { reportMobileFieldIncident } from "@/lib/field-settings.functions";
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
import { Loader2, Ticket, ChevronDown, Upload, X } from "lucide-react";
import { INCIDENT_SUGGESTIONS } from "@/lib/field-incident-suggestions";

// ── Severity options (High removed per spec) ─────────────────────────────────
const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "medium",   label: "Medium"   },
  { value: "low",      label: "Low"      },
] as const;

const ROUTE_OPTIONS = [
  { value: "admin",      label: "Admin"      },
  { value: "technician", label: "Technician" },
] as const;

// Alias so existing TitleCombobox usage below is unchanged
const SUGGESTIONS = INCIDENT_SUGGESTIONS;

type Silo = { id: string; name: string; silo_id: string };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  silos?: Silo[];
  extraInvalidate?: string[][];
}

// ── TitleCombobox ─────────────────────────────────────────────────────────────
// Single input field with dropdown showing suggestions only (no embedded input).
// Selecting "Other" just closes the dropdown; user can type freely in the main input.
function TitleCombobox({
  value,
  onChange,
  targetRole,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  targetRole: "admin" | "manager" | "technician";
  error?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLInputElement>(null);

  const suggestions = SUGGESTIONS[targetRole];

  // Sync external value → local when dialog resets
  useEffect(() => {
    // Nothing to sync beyond the controlled value prop
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // When target role changes, clear the title so stale suggestion doesn't linger
  useEffect(() => {
    onChange("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole]);

  const filtered = suggestions.filter((s) =>
    s.toLowerCase().includes(value.toLowerCase()),
  );

  function select(s: string) {
    onChange(s);
    setOpen(false);
  }

  function selectOther() {
    // "Other" closes dropdown; user types freely in the main input
    setOpen(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Main input field */}
      <Input
        ref={inputRef}
        id="ticket-title"
        placeholder="Type or select from suggestions…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        className={`text-xs h-8 pr-8 ${error ? "border-red-400 focus-visible:ring-red-400" : ""}`}
      />
      {/* Dropdown toggle icon */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        aria-label="Toggle suggestions"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {error && !open && <p className="text-[10px] text-red-500 mt-0.5">Title is required.</p>}

      {/* Dropdown with suggestions only */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border-border bg-popover shadow-lg max-h-56 overflow-y-auto">
          <div className="py-1">
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No matches — select "Other" or type your own.</p>
            )}
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(s)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors"
              >
                {s}
              </button>
            ))}
            {/* Other always at bottom */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={selectOther}
              className="w-full text-left px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors border-t border-border mt-1 pt-2 font-medium"
            >
              Other
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export function ReportTicketDialog({
  open,
  onOpenChange,
  silos = [],
  extraInvalidate = [],
}: Props) {
  const qc        = useQueryClient();
  const reportFn  = useServerFn(reportMobileFieldIncident);
  const getRoleFn = useServerFn(getMyRole);

  const { data: roleData } = useQuery({
    queryKey: ["my-role"],
    queryFn: () => getRoleFn(),
    staleTime: 5 * 60_000,
  });

  const detectedRole    = roleData?.role ?? "manager";
  const userProfileName = roleData?.profile?.name || roleData?.profile?.email || "";

  const [title,        setTitle]        = useState("");
  const [severity,     setSeverity]     = useState<"low" | "medium" | "critical">("medium");
  const [targetRole,   setTargetRole]   = useState<"admin" | "manager" | "technician">("technician");
  const [reporterName, setReporterName] = useState("");
  const [role,         setRole]         = useState("manager");
  const [description,  setDescription]  = useState("");
  const [siloId,       setSiloId]       = useState<string>("");
  const [attachment,   setAttachment]   = useState<File | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    setAttachment(null);
    setErrors({});
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!title.trim())        e.title        = "Title is required.";
    if (!severity)            e.severity     = "Please select a severity level.";
    if (!targetRole)          e.targetRole   = "Please select a recipient.";
    if (!reporterName.trim()) e.reporterName = "Reporter name is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const mut = useMutation({
    mutationFn: () =>
      reportFn({
        data: {
          title:         title.trim(),
          category:      title.trim(),
          severity,
          reporter_name: reporterName.trim() || undefined,
          reporter_role: role.trim() || undefined,
          target_role:   targetRole,
          description:   description.trim() || undefined,
          silo_id:       siloId || null,
        },
      }),
    onSuccess: () => {
      toast.success(`Incident reported → ${targetRole.toUpperCase()}`);
      reset();
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["manager-dashboard"] });
      qc.invalidateQueries({ queryKey: ["open-field-tickets"] });
      qc.invalidateQueries({ queryKey: ["field-incidents"] });
      extraInvalidate.forEach((key) => qc.invalidateQueries({ queryKey: key }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function handleSubmit() {
    if (!validate()) return;
    // TODO: if attachment present, upload it to storage and attach reference
    // For now: just submit the form without attachment handling (future enhancement)
    mut.mutate();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      // Basic validation: max 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum 10MB.");
        return;
      }
      setAttachment(file);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">Report Incident</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">

          {/* 1. Title — FIRST per spec */}
          <div className="space-y-1">
            <Label htmlFor="ticket-title" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Title / Incident <span className="text-red-500">*</span>
            </Label>
            <TitleCombobox
              value={title}
              onChange={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: "" })); }}
              targetRole={targetRole}
              error={!!errors.title}
            />
          </div>

          {/* 2. Route Incident To — SECOND per spec */}
          <div className="space-y-1">
            <Label htmlFor="ticket-target-role" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Route Incident To <span className="text-red-500">*</span>
            </Label>
            <Select
              value={targetRole}
              onValueChange={(v) => {
                setTargetRole(v as "admin" | "manager" | "technician");
                setErrors((e) => ({ ...e, targetRole: "" }));
              }}
            >
              <SelectTrigger
                id="ticket-target-role"
                className={`text-xs h-8 ${errors.targetRole ? "border-red-400 ring-1 ring-red-400/40" : ""}`}
              >
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {ROUTE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetRole && <p className="text-[10px] text-red-500">{errors.targetRole}</p>}
          </div>

          {/* 3. Severity */}
          <div className="space-y-1">
            <Label htmlFor="ticket-severity" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Type / Stage of Incident <span className="text-red-500">*</span>
            </Label>
            <Select
              value={severity}
              onValueChange={(v) => {
                setSeverity(v as "low" | "medium" | "critical");
                setErrors((e) => ({ ...e, severity: "" }));
              }}
            >
              <SelectTrigger
                id="ticket-severity"
                className={`text-xs h-8 ${errors.severity ? "border-red-400 ring-1 ring-red-400/40" : ""}`}
              >
                <SelectValue placeholder="Select severity level" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.severity && <p className="text-[10px] text-red-500">{errors.severity}</p>}
          </div>

          {/* 4. Reporter Name + My Role */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="ticket-reporter" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Reporter Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ticket-reporter"
                placeholder="Your name"
                value={reporterName}
                onChange={(e) => { setReporterName(e.target.value); setErrors((er) => ({ ...er, reporterName: "" })); }}
                className={`text-xs h-8 ${errors.reporterName ? "border-red-400 focus-visible:ring-red-400" : ""}`}
              />
              {errors.reporterName && <p className="text-[10px] text-red-500">{errors.reporterName}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="ticket-role" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                My Role
              </Label>
              <Input
                id="ticket-role"
                value={role}
                readOnly
                disabled
                className="text-xs h-8 bg-muted/50 capitalize font-medium cursor-not-allowed"
              />
            </div>
          </div>

          {/* 5. Affected Silo (optional) */}
          {silos.length > 0 && (
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Affected Silo <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Select
                value={siloId || "__none__"}
                onValueChange={(v) => setSiloId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger id="ticket-silo" className="text-xs h-8">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">None</SelectItem>
                  {silos.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">
                      {s.name} ({s.silo_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 6. Description (optional) - max 400 words */}
          <div className="space-y-1">
            <Label htmlFor="ticket-description" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Description <span className="text-muted-foreground font-normal">(optional, max 400 words)</span>
            </Label>
            <Textarea
              id="ticket-description"
              rows={3}
              placeholder="Describe the incident, observed symptoms, or immediate actions taken…"
              value={description}
              onChange={(e) => {
                const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                if (words.length <= 400) {
                  setDescription(e.target.value);
                } else {
                  toast.error("Description cannot exceed 400 words.");
                }
              }}
              className="text-xs resize-none"
            />
            <p className="text-[10px] text-muted-foreground">
              {description.trim().split(/\s+/).filter(Boolean).length} / 400 words
            </p>
          </div>

          {/* 7. Attachment upload (optional) - pictures and files */}
          <div className="space-y-1">
            <Label htmlFor="ticket-attachment" className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Attachment <span className="text-muted-foreground font-normal">(optional — picture or file, max 10MB)</span>
            </Label>
            {!attachment ? (
              <label
                htmlFor="ticket-attachment"
                className="flex items-center justify-center gap-2 h-10 rounded-md border border-dashed border-border bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-xs text-muted-foreground"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload picture or file
                <input
                  id="ticket-attachment"
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
            ) : (
              <div className="flex items-center justify-between gap-2 p-2 rounded-md border-border bg-emerald-50/50 dark:bg-emerald-900/10">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Upload className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="text-xs truncate font-medium">{attachment.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    ({(attachment.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-muted-foreground hover:text-red-600 shrink-0"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>

        <DialogFooter className="gap-2 pt-1">
          <Button
            variant="outline"
            onClick={() => { reset(); onOpenChange(false); }}
            disabled={mut.isPending}
            size="sm"
            className="text-xs"
          >
            Cancel
          </Button>
          <Button
            id="ticket-submit"
            onClick={handleSubmit}
            disabled={mut.isPending}
            size="sm"
            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs"
          >
            {mut.isPending
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Ticket className="h-3 w-3" />
            }
            Report Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
