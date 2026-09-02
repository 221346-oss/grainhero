import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { issueCommand, listCommands } from "@/lib/actuators.functions";
import { CommandStatusBadge } from "./CommandStatusBadge";
import { supabase } from "@/integrations/supabase/client";

type Cmd = "on" | "off" | "toggle" | "pulse" | "set_level";

export function CommandConsole({ actuatorId }: { actuatorId: string }) {
  const issue = useServerFn(issueCommand);
  const list = useServerFn(listCommands);
  const qc = useQueryClient();
  const [command, setCommand] = useState<Cmd>("on");
  const [level, setLevel] = useState("");

  const { data } = useQuery({
    queryKey: ["actuator-commands", actuatorId],
    queryFn: () => list({ data: { actuatorId, limit: 10 } }),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const ch = supabase
      .channel(`cmds:${actuatorId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "actuator_commands",
          filter: `actuator_id=eq.${actuatorId}`,
        },
        () => qc.invalidateQueries({ queryKey: ["actuator-commands", actuatorId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [actuatorId, qc]);

  const inFlight = (data?.commands ?? []).some((c) => c.status === "queued" || c.status === "sent");

  const mut = useMutation({
    mutationFn: () =>
      issue({
        data: {
          actuatorId,
          command,
          params: command === "set_level" && level !== "" ? { level: Number(level) } : {},
        },
      }),
    onSuccess: () => {
      toast.success("Command queued");
      qc.invalidateQueries({ queryKey: ["actuator-commands", actuatorId] });
    },
    onError: (e: unknown) => {
      const msg = (e as Error).message || "";
      if (msg.startsWith("RATE_LIMIT")) toast.error("Too many commands — wait a moment.");
      else toast.error(msg || "Command failed");
    },
  });

  return (
    <div className="rounded-lg p-3 space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Label className="text-xs">Command</Label>
          <Select value={command} onValueChange={(v) => setCommand(v as Cmd)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on">On</SelectItem>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="toggle">Toggle</SelectItem>
              <SelectItem value="pulse">Pulse</SelectItem>
              <SelectItem value="set_level">Set level</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {command === "set_level" && (
          <div className="w-24">
            <Label className="text-xs">Level %</Label>
            <Input value={level} onChange={(e) => setLevel(e.target.value)} placeholder="0-100" />
          </div>
        )}
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || inFlight}>
          {mut.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send
        </Button>
      </div>

      <div>
        <div className="text-xs text-muted-foreground mb-1">Recent commands</div>
        {(data?.commands ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">No commands yet.</div>
        ) : (
          <ul className="divide-y text-sm">
            {(data?.commands ?? []).map((c) => (
              <li key={c.id as string} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono capitalize">{String(c.command)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.created_at as string).toLocaleTimeString()}
                  </span>
                </div>
                <CommandStatusBadge status={String(c.status)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
