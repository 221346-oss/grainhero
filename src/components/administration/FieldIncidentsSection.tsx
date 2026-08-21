import { useEffect, useState } from "react";
import { Loader2, Flag, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  reportFieldIncident,
  listFieldIncidents,
  closeFieldIncident,
} from "@/lib/field-incidents.functions";
import { listTeamMembers } from "@/lib/team-settings-insurance.functions";
import { getMyRole } from "@/lib/roles.functions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const emptyForm = { title: "", description: "", recipientId: "" };

const ROUTING_COPY: Record<string, string> = {
  manager: "Auto-routed to your Admin.",
  admin: "Auto-routed to the Super Admin.",
};

function ReportFieldIncidentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const listMembersFn = useServerFn(listTeamMembers);
  const roleFn = useServerFn(getMyRole);
  const reportFn = useServerFn(reportFieldIncident);
  const [form, setForm] = useState(emptyForm);
  const [myId, setMyId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? null));
  }, []);

  const roleQ = useQuery({ queryKey: ["my-role"], queryFn: () => roleFn(), enabled: open });
  const myRole = roleQ.data?.role ?? null;
  const isTechnician = myRole === "technician";
  const isAdmin = myRole === "admin";
  const canAssign = isTechnician || isAdmin;

  const membersQ = useQuery({
    queryKey: ["team-members"],
    queryFn: () => listMembersFn() as Promise<any[]>,
    enabled: open && canAssign,
  });
  // Technician picks exactly one Manager. Admin can pick a Manager or Technician.
  const recipients = (membersQ.data ?? []).filter(
    (m: any) => m.id !== myId && (m.role === "manager" || (isAdmin && m.role === "technician")),
  );

  const mutation = useMutation({
    mutationFn: () =>
      reportFn({
        data: {
          title: form.title.trim(),
          description: form.description.trim(),
          recipientId:
            canAssign && form.recipientId && form.recipientId !== "none" ? form.recipientId : null,
        },
      }),
    onSuccess: () => {
      toast.success("Incident reported");
      qc.invalidateQueries({ queryKey: ["field-incidents"] });
      setForm(emptyForm);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not report incident"),
  });

  const canSubmit =
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 3 &&
    (!isTechnician || (form.recipientId && form.recipientId !== "none")) &&
    !!myRole;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setForm(emptyForm);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Report a field incident</DialogTitle>
          <DialogDescription>
            Only you and the recipient can see this — it isn&apos;t broadcast to the rest of your
            team.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
              minLength={3}
            />
          </div>
          {canAssign ? (
            <div className="grid gap-1.5">
              <Label>Send to {isAdmin ? "(optional)" : "(manager)"}</Label>
              <Select
                value={form.recipientId}
                onValueChange={(v) => setForm((f) => ({ ...f, recipientId: v }))}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={isAdmin ? "Pick a team member or leave default" : "Pick a manager"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="none">Route to Super Admin (Default)</SelectItem>}
                  {recipients.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name ?? m.email} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isTechnician && (
                <p className="text-[11px] text-muted-foreground">
                  Not acknowledged in 30 minutes? It&apos;s auto-reassigned to your Admin.
                </p>
              )}
            </div>
          ) : myRole ? (
            <p className="text-xs text-muted-foreground rounded-md bg-muted/40 px-3 py-2">
              {ROUTING_COPY[myRole] ?? "Auto-routed."}
            </p>
          ) : null}
          <div className="grid gap-1.5">
            <Label>What happened?</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              required
              minLength={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || !canSubmit} className="gap-2">
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Flag className="h-4 w-4" />
              )}
              {mutation.isPending ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function FieldIncidentsSection() {
  const listFn = useServerFn(listFieldIncidents);
  const closeFn = useServerFn(closeFieldIncident);
  const qc = useQueryClient();
  const [dlgOpen, setDlgOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["field-incidents"], queryFn: () => listFn() });
  const incidents = data?.incidents ?? [];

  const closeMut = useMutation({
    mutationFn: (id: string) => closeFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Marked closed");
      qc.invalidateQueries({ queryKey: ["field-incidents"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not close"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Auto-routed up your chain of command — private between you and the recipient.
        </p>
        <Button size="sm" className="gap-1.5" onClick={() => setDlgOpen(true)}>
          <Flag className="w-3.5 h-3.5" /> Report incident
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading field incidents…
        </div>
      ) : incidents.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm">No field incidents reported.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(incidents as any[]).map((i) => (
            <div key={i.id} className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Flag className="w-5 h-5 mt-0.5 shrink-0 text-amber-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-foreground">{i.title}</h3>
                    <Badge
                      className={
                        i.status === "closed"
                          ? "bg-emerald-500/20 text-emerald-600"
                          : "bg-amber-500/20 text-amber-600"
                      }
                    >
                      {i.status === "closed" ? "closed" : "open"}
                    </Badge>
                    {i.wasReassigned && (
                      <Badge variant="outline" className="text-[10px]">
                        reassigned
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{i.message}</p>
                  <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-3">
                    <span>From {i.reportedByName ?? "Unknown"}</span>
                    <span>To {i.recipientName ?? "Unknown"}</span>
                    <span>{new Date(i.created_at).toLocaleString()}</span>
                  </div>
                  {i.status !== "closed" && (i.isMine || i.isForMe) && (
                    <div className="mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        disabled={closeMut.isPending}
                        onClick={() => closeMut.mutate(i.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark closed
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReportFieldIncidentDialog open={dlgOpen} onOpenChange={setDlgOpen} />
    </div>
  );
}
