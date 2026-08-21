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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listThresholds, saveThreshold, deleteThreshold } from "@/lib/telemetry.functions";

type Metric = "temperature" | "humidity" | "moisture" | "co2";

export function ThresholdDrawer({
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
  const list = useServerFn(listThresholds);
  const save = useServerFn(saveThreshold);
  const del = useServerFn(deleteThreshold);
  const qc = useQueryClient();
  const [form, setForm] = useState<{
    metric: Metric;
    minValue: string;
    maxValue: string;
    criticalMin: string;
    criticalMax: string;
    hysteresis: string;
    enabled: boolean;
  }>({
    metric: "temperature",
    minValue: "",
    maxValue: "",
    criticalMin: "",
    criticalMax: "",
    hysteresis: "0",
    enabled: true,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["thresholds", siloId],
    queryFn: () => list({ data: { siloId } }),
    enabled: open,
  });

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          siloId,
          metric: form.metric,
          minValue: form.minValue === "" ? null : Number(form.minValue),
          maxValue: form.maxValue === "" ? null : Number(form.maxValue),
          criticalMin: form.criticalMin === "" ? null : Number(form.criticalMin),
          criticalMax: form.criticalMax === "" ? null : Number(form.criticalMax),
          hysteresis: Number(form.hysteresis) || 0,
          windowSeconds: 300,
          enabled: form.enabled,
        },
      }),
    onSuccess: () => {
      toast.success("Threshold saved");
      qc.invalidateQueries({ queryKey: ["thresholds", siloId] });
    },
    onError: (e: unknown) => {
      const msg = (e as Error).message || "";
      if (msg.startsWith("PLAN_LIMIT"))
        toast.error("Plan limit reached — upgrade to add more alert rules.");
      else toast.error(msg || "Save failed");
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["thresholds", siloId] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Alert thresholds · {siloName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 space-y-3">
            <div className="text-sm font-medium">Add / update</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Metric</Label>
                <Select
                  value={form.metric}
                  onValueChange={(v) => setForm({ ...form, metric: v as Metric })}
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
              <div>
                <Label className="text-xs">Warn min</Label>
                <Input
                  value={form.minValue}
                  onChange={(e) => setForm({ ...form, minValue: e.target.value })}
                  placeholder="e.g. 10"
                />
              </div>
              <div>
                <Label className="text-xs">Warn max</Label>
                <Input
                  value={form.maxValue}
                  onChange={(e) => setForm({ ...form, maxValue: e.target.value })}
                  placeholder="e.g. 30"
                />
              </div>
              <div>
                <Label className="text-xs">Critical min</Label>
                <Input
                  value={form.criticalMin}
                  onChange={(e) => setForm({ ...form, criticalMin: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Critical max</Label>
                <Input
                  value={form.criticalMax}
                  onChange={(e) => setForm({ ...form, criticalMax: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Hysteresis</Label>
                <Input
                  value={form.hysteresis}
                  onChange={(e) => setForm({ ...form, hysteresis: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) => setForm({ ...form, enabled: v })}
                />
                <Label className="text-xs">Enabled</Label>
              </div>
            </div>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Save threshold
            </Button>
          </div>

          <div className="rounded-lg border">
            <div className="px-3 py-2 text-sm font-medium border-b">Existing</div>
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Loading…</div>
            ) : (data?.thresholds ?? []).length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">No thresholds configured.</div>
            ) : (
              <ul className="divide-y">
                {(data?.thresholds ?? []).map((t) => (
                  <li
                    key={t.id as string}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {String(t.metric)}
                      </Badge>
                      <span className="text-muted-foreground">
                        warn {t.min_value ?? "—"} / {t.max_value ?? "—"} · crit{" "}
                        {t.critical_min ?? "—"} / {t.critical_max ?? "—"}
                      </span>
                      {!t.enabled && <Badge variant="secondary">disabled</Badge>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => delMut.mutate(t.id as string)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
