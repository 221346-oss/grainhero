import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  listAutomationRules,
  saveAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
} from "@/lib/automation-rules.functions";
import { listActuators } from "@/lib/operations.functions";

type Metric = "temperature" | "humidity" | "moisture" | "co2";
type Op = "gt" | "lt";
type Cmd = "on" | "off" | "pulse" | "set_level" | "toggle";

export function AutomationRulesDrawer({
  open,
  onOpenChange,
  siloId,
  siloName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  siloId: string;
  siloName: string;
}) {
  const listFn = useServerFn(listAutomationRules);
  const listActFn = useServerFn(listActuators);
  const saveFn = useServerFn(saveAutomationRule);
  const delFn = useServerFn(deleteAutomationRule);
  const toggleFn = useServerFn(toggleAutomationRule);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    actuatorId: "",
    triggerMetric: "temperature" as Metric,
    triggerOp: "gt" as Op,
    triggerValue: "",
    command: "on" as Cmd,
    cooldownSeconds: "900",
    enabled: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["automation-rules", siloId],
    queryFn: () => listFn({ data: { siloId } }),
    enabled: open,
  });
  const { data: actData } = useQuery({
    queryKey: ["actuators-for-rule"],
    queryFn: () => listActFn(),
    enabled: open,
  });
  const actuators =
    (actData as { actuators?: Array<{ id: string; name: string }> } | undefined)?.actuators ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["automation-rules", siloId] });
  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          siloId,
          actuatorId: form.actuatorId,
          triggerMetric: form.triggerMetric,
          triggerOp: form.triggerOp,
          triggerValue: Number(form.triggerValue),
          command: form.command,
          commandParams: {},
          cooldownSeconds: Number(form.cooldownSeconds) || 900,
          enabled: form.enabled,
        },
      }),
    onSuccess: () => {
      toast.success("Rule saved");
      invalidate();
      setForm((f) => ({ ...f, triggerValue: "" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      invalidate();
    },
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; enabled: boolean }) => toggleFn({ data: v }),
    onSuccess: invalidate,
  });

  const rules = (data as { rules?: Array<Record<string, unknown>> } | undefined)?.rules ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-500" /> Automation rules — {siloName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-sm font-medium">Existing rules</div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rules.length === 0 ? (
            <div className="text-sm text-muted-foreground rounded-md border-dashed p-4">
              No rules yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {rules.map((r) => {
                const rr = r as Record<string, unknown>;
                const actName =
                  (rr.actuators as { name?: string } | null | undefined)?.name ?? "actuator";
                return (
                  <div
                    key={rr.id as string}
                    className="flex items-center justify-between rounded-md p-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {String(rr.trigger_metric)}
                      </Badge>
                      <span>
                        {rr.trigger_op === "gt" ? ">" : "<"} {String(rr.trigger_value)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20">
                        {String(rr.command)} {actName}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        cooldown {String(rr.cooldown_seconds)}s
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!rr.enabled}
                        onCheckedChange={(v) => toggle.mutate({ id: rr.id as string, enabled: v })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => del.mutate(rr.id as string)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-md p-3 space-y-3">
          <div className="text-sm font-medium">New rule</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Actuator</Label>
              <Select
                value={form.actuatorId}
                onValueChange={(v) => setForm({ ...form, actuatorId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select actuator" />
                </SelectTrigger>
                <SelectContent>
                  {actuators.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Metric</Label>
              <Select
                value={form.triggerMetric}
                onValueChange={(v) => setForm({ ...form, triggerMetric: v as Metric })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temperature">Temperature</SelectItem>
                  <SelectItem value="humidity">Humidity</SelectItem>
                  <SelectItem value="moisture">Moisture</SelectItem>
                  <SelectItem value="co2">CO₂</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Comparison</Label>
              <Select
                value={form.triggerOp}
                onValueChange={(v) => setForm({ ...form, triggerOp: v as Op })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gt">Greater than</SelectItem>
                  <SelectItem value="lt">Less than</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Value</Label>
              <Input
                type="number"
                value={form.triggerValue}
                onChange={(e) => setForm({ ...form, triggerValue: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Command</Label>
              <Select
                value={form.command}
                onValueChange={(v) => setForm({ ...form, command: v as Cmd })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on">On</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                  <SelectItem value="pulse">Pulse</SelectItem>
                  <SelectItem value="toggle">Toggle</SelectItem>
                  <SelectItem value="set_level">Set level</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cooldown (sec)</Label>
              <Input
                type="number"
                value={form.cooldownSeconds}
                onChange={(e) => setForm({ ...form, cooldownSeconds: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
            />
            <span className="text-sm">Enabled</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !form.actuatorId || form.triggerValue === ""}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Add rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
