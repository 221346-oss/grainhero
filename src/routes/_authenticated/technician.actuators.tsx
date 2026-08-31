import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getTechnicianActuators, sendActuatorCommand } from "@/lib/operations.functions";
import {
  Wind,
  Lightbulb,
  Power,
  Zap,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Thermometer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { DashboardSkeleton } from "@/components/app/skeletons";

export const Route = createFileRoute("/_authenticated/technician/actuators")({
  head: () => ({
    meta: [
      { title: "Actuators — Technician" },
      { name: "description", content: "Control fans, lights, and other actuators in your assigned silos" },
    ],
  }),
  component: TechnicianActuatorsPage,
});

type Actuator = {
  id: string;
  actuator_id: string;
  name: string;
  actuator_type: string;
  silo_id: string;
  status: string;
  control_mode: string;
  is_enabled: boolean;
  is_on: boolean;
  power_level: number | null;
  target_fan_speed: number | null;
  current_operation: any;
  silos?: { id: string; silo_id: string; name: string }[];
};

// Type icons
const ACTUATOR_ICONS: Record<string, any> = {
  fan: Wind,
  light: Lightbulb,
  heater: Thermometer,
  cooler: Thermometer,
  vent: Wind,
  alarm: AlertCircle,
};

// Status colors
const STATUS_COLOR: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  offline: "bg-slate-100 text-slate-800 border-slate-200",
  error: "bg-red-100 text-red-800 border-red-200",
  maintenance: "bg-amber-100 text-amber-800 border-amber-200",
};

const STATUS_ICON: Record<string, any> = {
  active: CheckCircle2,
  offline: AlertCircle,
  error: AlertCircle,
  maintenance: Zap,
};

function ActuatorCard({ actuator, onCommand, isLoading }: { actuator: Actuator; onCommand: (action: string, value?: number) => Promise<void>; isLoading: boolean }) {
  const [powerValue, setPowerValue] = useState(actuator.power_level ?? 50);
  const ActuatorIcon = ACTUATOR_ICONS[actuator.actuator_type] || Wind;
  const StatusIcon = STATUS_ICON[actuator.status] || AlertCircle;
  const isDisabled = actuator.status !== "active" || !actuator.is_enabled;

  return (
    <Card className={`overflow-hidden ${isDisabled ? "opacity-60" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <ActuatorIcon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{actuator.name}</CardTitle>
              <CardDescription className="text-xs capitalize">{actuator.actuator_type}</CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${STATUS_COLOR[actuator.status] || STATUS_COLOR.offline}`}
          >
            <StatusIcon className="h-3 w-3 mr-1 inline" />
            {actuator.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current State */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
          <span className="text-sm font-semibold">Power</span>
          {actuator.is_on ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-emerald-600">ON</span>
              {actuator.power_level !== null && (
                <span className="text-xs text-muted-foreground">{actuator.power_level}%</span>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-600">OFF</span>
          )}
        </div>

        {/* ON/OFF Toggle */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={actuator.is_on ? "default" : "outline"}
            className={`flex-1 gap-2 ${
              actuator.is_on
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : ""
            }`}
            disabled={isDisabled || isLoading}
            onClick={() =>
              onCommand(actuator.is_on ? "turn_off" : "turn_on", powerValue)
            }
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Power className="h-4 w-4" />
            )}
            {actuator.is_on ? "On" : "Off"}
          </Button>
        </div>

        {/* Power Level Slider */}
        {(actuator.actuator_type === "fan" || actuator.actuator_type === "light") && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold">Power Level</label>
              <span className="text-xs font-bold text-muted-foreground">{powerValue}%</span>
            </div>
            <Slider
              value={[powerValue]}
              onValueChange={(v) => setPowerValue(v[0])}
              min={0}
              max={100}
              step={5}
              disabled={isDisabled || isLoading || !actuator.is_on}
              className="w-full"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              disabled={isDisabled || isLoading}
              onClick={() => onCommand("set_value", powerValue)}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
              ) : (
                <Zap className="h-3 w-3 mr-2" />
              )}
              Apply Power Level
            </Button>
          </div>
        )}

        {/* Control Mode Info */}
        <div className="text-[10px] text-muted-foreground p-2 bg-slate-50 dark:bg-slate-900/20 rounded">
          <div>Mode: <span className="font-semibold capitalize">{actuator.control_mode}</span></div>
          {actuator.current_operation?.at && (
            <div>Last: {new Date(actuator.current_operation.at).toLocaleString()}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TechnicianActuatorsPage() {
  const fn = useServerFn(getTechnicianActuators);
  const sendCommandFn = useServerFn(sendActuatorCommand);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["technician-actuators"],
    queryFn: () => fn({ data: { limit: 100 } }),
    refetchInterval: 30_000,
  });

  const commandMut = useMutation({
    mutationFn: async (params: { actuatorId: string; action: string; value?: number }) => {
      await sendCommandFn({
        data: {
          id: params.actuatorId,
          action: params.action,
          value: params.value,
        },
      });
    },
    onSuccess: () => {
      toast.success("Command sent");
      qc.invalidateQueries({ queryKey: ["technician-actuators"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const actuatorsBySilo = (data?.actuatorsBySilo ?? {}) as Record<string, Actuator[]>;
  const allActuators = (data?.allActuators ?? []) as Actuator[];

  // Calculate stats
  const stats = {
    total: allActuators.length,
    active: allActuators.filter((a) => a.is_on).length,
    offline: allActuators.filter((a) => a.status === "offline").length,
    fans: allActuators.filter((a) => a.actuator_type === "fan").length,
    lights: allActuators.filter((a) => a.actuator_type === "light").length,
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const silos = Object.keys(actuatorsBySilo)
    .map((siloId) => ({
      id: siloId,
      name: actuatorsBySilo[siloId][0]?.silos?.[0]?.name || `Silo ${siloId.slice(0, 8)}`,
      actuators: actuatorsBySilo[siloId],
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-amber-600" />
          Actuators
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control fans, lights, and other actuators in your assigned silos
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Active</div>
            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Offline</div>
            <div className="text-2xl font-bold text-slate-600">{stats.offline}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Fans</div>
            <div className="text-2xl font-bold text-blue-600">{stats.fans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Lights</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.lights}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actuators Grouped by Silo */}
      {silos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              No actuators assigned to your silos yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        silos.map((silo) => (
          <div key={silo.id} className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold">{silo.name}</h2>
              <p className="text-xs text-muted-foreground">{silo.actuators.length} actuators</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {silo.actuators.map((actuator) => (
                <ActuatorCard
                  key={actuator.id}
                  actuator={actuator}
                  onCommand={(action, value) =>
                    commandMut.mutateAsync({
                      actuatorId: actuator.id,
                      action,
                      value,
                    })
                  }
                  isLoading={commandMut.isPending}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
