/**
 * TicketCardForm
 * Open-field incident card form that admin fills to raise a ticket.
 * - Priority badge top-right (low / medium / high)
 * - "Send to super admin" button bottom-right
 * Design: minimalist, matches existing slate/emerald palette.
 */
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { createTicket } from "@/lib/tickets.functions";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Priority = "low" | "medium" | "high";
type ReporterRole = "admin" | "manager" | "technician";

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

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TicketCardForm({ onSuccess, onCancel }: Props) {
  const qc = useQueryClient();
  const createFn = useServerFn(createTicket);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [reporterName, setReporterName] = useState("");
  const [reporterRole, setReporterRole] = useState<ReporterRole>("admin");
  const [description, setDescription] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          title: title.trim(),
          priority,
          reporter_name: reporterName.trim(),
          reporter_role: reporterRole,
          description: description.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Ticket sent to super admin");
      // Reset form fields
      setTitle("");
      setReporterName("");
      setReporterRole("admin");
      setDescription("");
      setPriority("medium");
      qc.invalidateQueries({ queryKey: ["field-tickets"] });
      onSuccess?.();
    },
    onError: (e: unknown) =>
      toast.error((e as Error).message ?? "Failed to create ticket"),
  });

  const canSubmit =
    title.trim().length >= 3 &&
    reporterName.trim().length >= 1 &&
    description.trim().length >= 1 &&
    !mut.isPending;

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
      {/* Priority badge — top-right */}
      <div className="absolute top-4 right-4">
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as Priority)}
        >
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
        <p className="text-xs text-slate-500 mt-0.5">
          This ticket will be sent to super admin only.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="ticket-title" className="text-xs text-slate-600 font-medium">
          Issue title
        </Label>
        <Input
          id="ticket-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Brief description of the issue"
          className="text-sm"
          maxLength={200}
        />
      </div>

      {/* Reporter */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="reporter-name" className="text-xs text-slate-600 font-medium">
            Reporter name
          </Label>
          <Input
            id="reporter-name"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="Who found this issue"
            className="text-sm"
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-600 font-medium">Reporter role</Label>
          <Input
            value="Admin"
            readOnly
            className="text-sm h-9 bg-slate-100 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="ticket-desc" className="text-xs text-slate-600 font-medium">
          Description
        </Label>
        <Textarea
          id="ticket-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in detail…"
          rows={4}
          className="text-sm resize-none"
          maxLength={4000}
        />
        <p className="text-[10px] text-slate-400 text-right">
          {description.length}/4000
        </p>
      </div>

      {/* Actions — "Send to super admin" bottom-right, Cancel bottom-left */}
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
          {/* Priority pill — mirrors the top-right badge as a static label */}
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
