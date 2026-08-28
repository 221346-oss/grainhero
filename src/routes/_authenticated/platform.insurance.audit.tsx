import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Download, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { listInsuranceAudit, exportInsuranceAuditCsv } from "@/lib/insurance.functions";

export const Route = createFileRoute("/_authenticated/platform/insurance/audit")({
  head: () => ({
    meta: [
      { title: "Platform · Insurance · Audit — Grain Hero" },
      {
        name: "description",
        content:
          "Platform · Insurance · Audit workspace in the Grain Hero platform — private, sign-in required.",
      },
      { property: "og:title", content: "Platform · Insurance · Audit — Grain Hero" },
      {
        property: "og:description",
        content: "Platform · Insurance · Audit workspace in the Grain Hero platform.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InsuranceAuditPage,
});

const ACTIONS = [
  "all",
  "policy.bind",
  "policy.cancel",
  "policy.renew",
  "policy.active",
  "policy.expired",
  "claim.open",
  "claim.approved",
  "claim.rejected",
  "claim.paid",
  "claim.under_review",
  "claim.cancelled",
];
const SUBJECTS = ["all", "policy", "claim", "webhook", "carrier", "product"];

function InsuranceAuditPage() {
  const listFn = useServerFn(listInsuranceAudit);
  const exportFn = useServerFn(exportInsuranceAuditCsv);
  const [action, setAction] = useState("all");
  const [subject, setSubject] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, refetch, isFetching } = useQuery({
    queryKey: ["ins-audit", action, subject, from, to],
    queryFn: () =>
      listFn({
        data: {
          scope: "all" as const,
          action: action === "all" ? undefined : action,
          subject_type: subject === "all" ? undefined : subject,
          from: from || undefined,
          to: to || undefined,
        },
      }),
  });

  const download = async () => {
    try {
      const res = await exportFn({
        data: {
          action: action === "all" ? undefined : action,
          subject_type: subject === "all" ? undefined : subject,
          from: from || undefined,
          to: to || undefined,
        },
      });
      const blob = new Blob([res.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <AdminPageShell
      title="Insurance audit log"
      subtitle="Every policy, claim, and webhook change with actor and payload"
    >
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Action</div>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Subject</div>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">From</div>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">To</div>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              Refresh
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={download}>
              <Download className="h-4 w-4 mr-1" /> Export CSV
            </Button>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.entries ?? []).map((e: Record<string, unknown>) => (
                  <TableRow key={e.id as string} className="hover:bg-emerald-50/30 align-top">
                    <TableCell className="text-xs tabular-nums whitespace-nowrap">
                      {new Date(e.created_at as string).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{e.action as string}</TableCell>
                    <TableCell className="text-xs">
                      {(e.subject_type as string) ?? "—"}{" "}
                      <span className="text-muted-foreground">
                        {(e.subject_id as string)?.slice(0, 8)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(e.actor_id as string)?.slice(0, 8) ?? "system"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={e.source === "webhook" ? "outline" : "secondary"}>
                        {e.source as string}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className="text-xs font-mono max-w-md truncate"
                      title={JSON.stringify(e.payload)}
                    >
                      {JSON.stringify(e.payload)}
                    </TableCell>
                  </TableRow>
                ))}
                {!(data?.entries ?? []).length && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-sm text-muted-foreground py-8"
                    >
                      <ScrollText className="h-6 w-6 mx-auto mb-2 opacity-50" /> No audit entries
                      match these filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}
