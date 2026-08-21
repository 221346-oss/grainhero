/**
 * TicketCardForm
 * Open-field incident card. Title is chosen from a predefined list of
 * issue types relevant to the GrainHero platform. Description placeholder
 * updates based on the selected type to guide the admin.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createTicket } from "@/lib/tickets.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Priority = "low" | "medium" | "high";
type ReporterRole = "admin" | "manager" | "technician";

// ── Issue type catalogue ──────────────────────────────────────────────────────

type IssueType = {
  value: string; // stored as the ticket title
  label: string; // shown in dropdown
  group: string; // group header
  placeholder: string; // description hint
  defaultPriority: Priority;
};

const ISSUE_TYPES: IssueType[] = [
  // Sensor & Hardware
  {
    value: "Sensor malfunction",
    label: "Sensor malfunction",
    group: "Sensor & Hardware",
    placeholder:
      "Which sensor(s) are affected? Describe the readings or error observed and since when.",
    defaultPriority: "high",
  },
  {
    value: "Sensor data not updating",
    label: "Sensor data not updating",
    group: "Sensor & Hardware",
    placeholder: "Which silo/sensor? How long since last reading? Any recent changes to setup?",
    defaultPriority: "medium",
  },
  {
    value: "Hardware device offline",
    label: "Hardware device offline",
    group: "Sensor & Hardware",
    placeholder: "Device name/ID, last known online time, and steps already taken to reconnect.",
    defaultPriority: "high",
  },
  {
    value: "Actuator not responding",
    label: "Actuator not responding",
    group: "Sensor & Hardware",
    placeholder:
      "Which actuator? What command was sent? Describe the expected vs actual behaviour.",
    defaultPriority: "high",
  },
  {
    value: "Calibration required",
    label: "Calibration required",
    group: "Sensor & Hardware",
    placeholder: "Which sensor needs calibration? What readings suggest it is out of range?",
    defaultPriority: "low",
  },
  // Grain & Storage
  {
    value: "Grain quality alert",
    label: "Grain quality alert",
    group: "Grain & Storage",
    placeholder:
      "Which batch/silo? Describe the quality concern (moisture, temperature, spoilage risk, etc.).",
    defaultPriority: "high",
  },
  {
    value: "Abnormal temperature reading",
    label: "Abnormal temperature reading",
    group: "Grain & Storage",
    placeholder: "Silo name, current reading, safe range, and how long the anomaly has persisted.",
    defaultPriority: "high",
  },
  {
    value: "Abnormal humidity reading",
    label: "Abnormal humidity reading",
    group: "Grain & Storage",
    placeholder: "Silo name, current humidity %, normal range, and any visible signs of moisture.",
    defaultPriority: "medium",
  },
  {
    value: "Silo capacity issue",
    label: "Silo capacity issue",
    group: "Grain & Storage",
    placeholder: "Which silo? Is it over- or under-reported? Actual vs system-reported capacity.",
    defaultPriority: "medium",
  },
  // Software & Platform
  {
    value: "Bug report",
    label: "Bug report",
    group: "Software & Platform",
    placeholder:
      "Page/feature where the bug occurs, steps to reproduce, and what you expected to happen.",
    defaultPriority: "medium",
  },
  {
    value: "Dashboard data mismatch",
    label: "Dashboard data mismatch",
    group: "Software & Platform",
    placeholder:
      "Which metric looks wrong? What value is shown vs what you expect? Any recent changes?",
    defaultPriority: "medium",
  },
  {
    value: "Alert not triggering",
    label: "Alert not triggering",
    group: "Software & Platform",
    placeholder: "What threshold was crossed? Which alert rule? When did it happen?",
    defaultPriority: "high",
  },
  {
    value: "False alert triggered",
    label: "False alert triggered",
    group: "Software & Platform",
    placeholder: "Alert ID or type, time it fired, and why you believe it is a false positive.",
    defaultPriority: "low",
  },
  {
    value: "Mobile app issue",
    label: "Mobile app issue",
    group: "Software & Platform",
    placeholder: "Device OS, app version, screen/feature affected, and steps to reproduce.",
    defaultPriority: "medium",
  },
  // Operations
  {
    value: "Installation issue",
    label: "Installation issue",
    group: "Operations",
    placeholder: "Location, device type, installer name, and what went wrong during installation.",
    defaultPriority: "high",
  },
  {
    value: "Technician visit required",
    label: "Technician visit required",
    group: "Operations",
    placeholder: "Site name, reason for visit, urgency, and preferred date/time if any.",
    defaultPriority: "medium",
  },
  {
    value: "Network connectivity issue",
    label: "Network connectivity issue",
    group: "Operations",
    placeholder:
      "Which site/device lost connectivity? Since when? Any changes to network infrastructure?",
    defaultPriority: "high",
  },
  {
    value: "Power supply issue",
    label: "Power supply issue",
    group: "Operations",
    placeholder:
      "Device/location affected, nature of the power issue, and any backup power status.",
    defaultPriority: "high",
  },
  // Billing & Account
  {
    value: "Billing discrepancy",
    label: "Billing discrepancy",
    group: "Billing & Account",
    placeholder: "Invoice or subscription ID, expected amount, actual amount, and billing period.",
    defaultPriority: "low",
  },
  {
    value: "Subscription plan query",
    label: "Subscription plan query",
    group: "Billing & Account",
    placeholder: "Current plan name and the specific question or issue regarding the plan.",
    defaultPriority: "low",
  },
];

const GROUPS = [...new Set(ISSUE_TYPES.map((i) => i.group))];

// ── Styles ────────────────────────────────────────────────────────────────────

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "bg-slate-100 text-slate-600 border-slate-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TicketCardForm({ onSuccess, onCancel }: Props) {
  const qc = useQueryClient();
  const createFn = useServerFn(createTicket);

  const [issueValue, setIssueValue] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [reporterName, setReporterName] = useState("");
  const [description, setDescription] = useState("");

  // Derived: the selected IssueType object
  const selected = ISSUE_TYPES.find((i) => i.value === issueValue) ?? null;

  function handleIssueChange(val: string) {
    setIssueValue(val);
    const issue = ISSUE_TYPES.find((i) => i.value === val);
    if (issue) {
      setPriority(issue.defaultPriority);
      // Clear description so the placeholder is visible and guides the admin
      setDescription("");
    }
  }

  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: issueValue,
          priority,
          reporter_name: reporterName.trim(),
          reporter_role: "admin" as ReporterRole,
          description: description.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Ticket sent to super admin");
      setIssueValue("");
      setReporterName("");
      setDescription("");
      setPriority("medium");
      qc.invalidateQueries({ queryKey: ["field-tickets"] });
      onSuccess?.();
    },
    onError: (e: unknown) => toast.error((e as Error).message ?? "Failed to create ticket"),
  });

  const canSubmit =
    issueValue.length > 0 &&
    reporterName.trim().length >= 1 &&
    description.trim().length >= 1 &&
    !mut.isPending;

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
      {/* Priority badge — top-right, auto-set by issue type but editable */}
      <div className="absolute top-4 right-4">
        <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
          <SelectTrigger
            className={cn(
              "h-7 px-2.5 text-xs font-semibold border rounded-md w-auto gap-1.5",
              PRIORITY_STYLES[priority],
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Header */}
      <div className="pr-24">
        <p className="text-sm font-semibold text-slate-900">Open-field incident</p>
        <p className="text-xs text-slate-500 mt-0.5">Sent to super admin only.</p>
      </div>

      {/* Issue type — replaces free-text title */}
      <div className="space-y-1.5">
        <Label className="text-xs text-slate-600 font-medium">Issue type</Label>
        <Select value={issueValue} onValueChange={handleIssueChange}>
          <SelectTrigger className="text-sm h-9 w-full">
            <SelectValue placeholder="Select an issue type…" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {GROUPS.map((group) => (
              <SelectGroup key={group}>
                <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                  {group}
                </SelectLabel>
                {ISSUE_TYPES.filter((i) => i.group === group).map((issue) => (
                  <SelectItem key={issue.value} value={issue.value} className="text-sm">
                    {issue.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reporter name */}
      <div className="space-y-1.5">
        <Label htmlFor="reporter-name" className="text-xs text-slate-600 font-medium">
          Reporter name
        </Label>
        <input
          id="reporter-name"
          value={reporterName}
          onChange={(e) => setReporterName(e.target.value)}
          placeholder="Who found this issue"
          maxLength={120}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      {/* Description — placeholder changes based on issue type */}
      <div className="space-y-1.5">
        <Label htmlFor="ticket-desc" className="text-xs text-slate-600 font-medium">
          Description
        </Label>
        <Textarea
          id="ticket-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={
            selected ? selected.placeholder : "Select an issue type above, then describe it here…"
          }
          rows={4}
          className="text-sm resize-none"
          maxLength={4000}
        />
        <p className="text-[10px] text-slate-400 text-right">{description.length}/4000</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={mut.isPending}
            className="text-slate-500 text-xs"
          >
            Cancel
          </Button>
        )}
        <div className={cn("flex items-center gap-2", !onCancel && "ml-auto")}>
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded border",
              PRIORITY_STYLES[priority],
            )}
          >
            {PRIORITY_LABEL[priority]}
          </span>
          <Button
            type="button"
            size="sm"
            onClick={() => mut.mutate()}
            disabled={!canSubmit}
            className="text-xs"
          >
            {mut.isPending ? "Sending…" : "Send to super admin"}
          </Button>
        </div>
      </div>
    </div>
  );
}
