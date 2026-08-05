import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listFlaggedMessages, moderateMessage } from "@/lib/messaging.functions";
import { toast } from "sonner";
import { MessageSquareWarning } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform/messages")({
  head: () => ({
    meta: [
      { title: "Platform · Messages — Grain Hero" },
      { name: "description", content: "Platform · Messages workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Messages — Grain Hero" },
      { property: "og:description", content: "Platform · Messages workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FlaggedMessagesPage,
});

function FlaggedMessagesPage() {
  const list = useServerFn(listFlaggedMessages);
  const moderate = useServerFn(moderateMessage);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-flagged-messages"], queryFn: () => list(),
  });
  const m = useMutation({
    mutationFn: (args: { id: string; action: "approve" | "hide" }) =>
      moderate({ data: { messageId: args.id, action: args.action } }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["platform-flagged-messages"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <AdminPageShell title="Flagged messages" subtitle="Review buyer/seller messages auto-flagged for moderation.">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquareWarning className="h-4 w-4 text-emerald-600" />
            {data?.messages?.length ?? 0} flagged
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground text-left border-b">
              <tr><th className="p-3">Order</th><th>Sender</th><th>Reason</th><th>Body</th><th>When</th><th></th></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!isLoading && (data?.messages?.length ?? 0) === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nothing flagged.</td></tr>
              )}
              {data?.messages?.map((msg) => (
                <tr key={msg.id as string} className="border-b hover:bg-emerald-50/30 align-top">
                  <td className="p-3 font-mono text-xs">
                    {(msg.buyer_orders as { order_number?: string } | null)?.order_number ?? String(msg.order_id).slice(0, 8)}
                  </td>
                  <td><Badge variant="outline" className="capitalize">{msg.sender_role as string}</Badge></td>
                  <td className="text-xs text-rose-600">{msg.moderation_reason as string}</td>
                  <td className="max-w-[380px] truncate">{msg.body as string}</td>
                  <td className="text-xs text-muted-foreground">{new Date(msg.created_at as string).toLocaleString()}</td>
                  <td className="space-x-2">
                    <Button size="sm" onClick={() => m.mutate({ id: msg.id as string, action: "approve" })} disabled={m.isPending}>Approve</Button>
                    <Button size="sm" variant="destructive" onClick={() => m.mutate({ id: msg.id as string, action: "hide" })} disabled={m.isPending}>Hide</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </AdminPageShell>
  );
}