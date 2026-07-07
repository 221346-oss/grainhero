"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Fan,
  Lightbulb,
  Siren,
  Zap,
} from "lucide-react";

import { config } from "@/config";

const backendUrl = config.backendUrl;

type ShortcutKey = "fan" | "light" | "alarm";

interface IoTActuator {
  _id: string;
  name: string;
  category: string;
  status: string;
  current_value?: number;
  unit?: string;
  location?: string;
  last_activity?: string;
}

interface ShortcutDefinition {
  key: ShortcutKey;
  title: string;
  description: string;
  categories: string[];
  icon: React.ReactNode;
  actions: Array<{
    label: string;
    action: "turn_on" | "turn_off" | "set_value" | "alarm_on" | "alarm_off";
    variant?: "default" | "secondary" | "outline";
    value?: number;
    tone: "primary" | "danger" | "neutral";
  }>;
}

const shortcutDefinitions: ShortcutDefinition[] = [
  {
    key: "fan",
    title: "Ventilation Fans",
    description: "Purge moist air or halt aeration.",
    categories: ["ventilation", "fan", "sensor", "environmental"],
    icon: <Fan className="h-5 w-5 text-blue-600" />,
    actions: [
      { label: "Start Fans", action: "turn_on", variant: "default", tone: "primary" },
      { label: "Boost 5 min", action: "set_value", value: 1500, variant: "secondary", tone: "primary" },
      { label: "Stop Fans", action: "turn_off", variant: "outline", tone: "danger" },
    ],
  },
  {
    key: "light",
    title: "Silo Lights",
    description: "Inspection & tamper detection lights.",
    categories: ["lighting", "environmental", "sensor"],
    icon: <Lightbulb className="h-5 w-5 text-amber-500" />,
    actions: [
      { label: "Lights On", action: "turn_on", variant: "default", tone: "primary" },
      { label: "Night Mode", action: "set_value", value: 30, variant: "secondary", tone: "neutral" },
      { label: "Lights Off", action: "turn_off", variant: "outline", tone: "danger" },
    ],
  },
  {
    key: "alarm",
    title: "Audible Alarms",
    description: "Warn staff or silence sirens.",
    categories: ["alert", "alarm"],
    icon: <Siren className="h-5 w-5 text-red-600" />,
    actions: [
      { label: "Trigger Alarm", action: "alarm_on", variant: "default", tone: "danger" },
      { label: "Silence", action: "alarm_off", variant: "outline", tone: "primary" },
    ],
  },
];

interface ActuatorQuickActionsProps {
  compact?: boolean;
}

export function ActuatorQuickActions({ compact = false }: ActuatorQuickActionsProps) {
  const [actuators, setActuators] = useState<Record<ShortcutKey, IoTActuator | null>>({
    fan: null,
    light: null,
    alarm: null,
  });
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<ShortcutKey, boolean>>({
    fan: false,
    light: false,
    alarm: false,
  });
  const [lastMessage, setLastMessage] = useState<Record<ShortcutKey, string>>({
    fan: "",
    light: "",
    alarm: "",
  });

  useEffect(() => {
    loadActuators();
  }, []);

  const loadActuators = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${backendUrl}/api/iot/devices`, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        const mapping: Record<ShortcutKey, IoTActuator | null> = { fan: null, light: null, alarm: null };
        shortcutDefinitions.forEach((def) => {
          const match =
            data.devices?.find((device: IoTActuator) =>
              def.categories.includes(device.category),
            ) || null;
          mapping[def.key] = match;
        });
        setActuators(mapping);
      } else {
        // Gracefully handle unauthorized or server errors by clearing shortcuts
        setActuators({ fan: null, light: null, alarm: null });
      }
    } catch (error) {
      console.error("Actuator shortcuts load error:", error);
    } finally {
      setLoading(false);
    }
  };

  const controlDevice = async (
    shortcut: ShortcutKey,
    action: "turn_on" | "turn_off" | "set_value" | "alarm_on" | "alarm_off",
    value?: number,
  ) => {
    const device = actuators[shortcut];
    const deviceId = device?._id || device?.name || process.env.NEXT_PUBLIC_DEVICE_ID || '004B12387760';
    try {
      setActionLoading((prev) => ({ ...prev, [shortcut]: true }));
      const requestBody: { action: string; value?: number } = { action };
      if (value !== undefined) {
        requestBody.value = value;
      }

      const resp = await fetch(`${backendUrl}/api/iot/devices/${deviceId}/control-public`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      if (!resp.ok) throw new Error("Control command failed");
      const result = await resp.json();
      if (result?.status === "blocked") {
        setLastMessage((prev) => ({
          ...prev,
          [shortcut]: `Blocked: ${result.reason}`,
        }));
        return;
      }
      setLastMessage((prev) => ({
        ...prev,
        [shortcut]: result.message || `Sent ${action}`,
      }));
      loadActuators();
    } catch (error) {
      console.error("Actuator control error:", error);
      setLastMessage((prev) => ({
        ...prev,
        [shortcut]: "Command failed",
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [shortcut]: false }));
    }
  };

  return (
    <Card className="border border-gray-200">
      <CardHeader>
        <CardTitle>Actuator Command Center</CardTitle>
        <CardDescription>
          Direct control of fans, lighting, and alarm subsystems.
        </CardDescription>
      </CardHeader>
      <CardContent className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        {shortcutDefinitions.map((shortcut) => {
          const device = actuators[shortcut.key];
          return (
            <div
              key={shortcut.key}
              className="border rounded-lg p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {shortcut.icon}
                  <div>
                    <div className="font-semibold">{shortcut.title}</div>
                    <p className="text-xs text-gray-500">{shortcut.description}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={
                    device?.status === "online"
                      ? "text-green-600 border-green-200"
                      : "text-gray-600 border-gray-200"
                  }
                >
                  {device ? device.status : "No device"}
                </Badge>
              </div>

              <div className="space-y-2">
                {shortcut.actions.map((btn) => (
                  <Button
                    key={btn.label}
                    size="sm"
                    variant={btn.variant || "default"}
                    disabled={!device || actionLoading[shortcut.key]}
                    className={
                      btn.tone === "danger"
                        ? "bg-red-600 hover:bg-red-700"
                        : btn.tone === "primary"
                          ? undefined
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }
                    onClick={() => controlDevice(shortcut.key, btn.action, btn.value)}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>

              {lastMessage[shortcut.key] && (
                <p className="text-xs text-gray-500">
                  <Zap className="inline h-3 w-3 mr-1" />
                  {lastMessage[shortcut.key]}
                </p>
              )}

              {device?.location && (
                <p className="text-xs text-gray-400">Location: {device.location}</p>
              )}

              {loading && !device && (
                <p className="text-xs text-gray-400">Scanning for devices...</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

