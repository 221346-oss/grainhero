import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { listMessages, sendMessage, markMessagesRead } from "@/lib/messaging.functions";

export function OrderMessageThread({ orderId, as }: { orderId: string; as: "seller" | "buyer" }) {
  const load = useServerFn(listMessages);
  const send = useServerFn(sendMessage);
  const markRead = useServerFn(markMessagesRead);
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["order-messages", orderId],
    queryFn: () => load({ data: { orderId } }),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    if (data?.messages?.length) {
      void markRead({ data: { orderId, as } });
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [data?.messages?.length, orderId, as, markRead]);

  const m = useMutation({
    mutationFn: () => send({ data: { orderId, body } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["order-messages", orderId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-600" /> Messages
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="max-h-72 overflow-y-auto space-y-2 text-sm">
          {isLoading && <div className="text-muted-foreground">Loading…</div>}
          {!isLoading && !data?.messages?.length && (
            <div className="text-muted-foreground text-xs">No messages yet.</div>
          )}
          {data?.messages?.map((msg) => {
            const mine = msg.sender_role === as;
            return (
              <div
                key={msg.id as string}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${mine ? "bg-emerald-600 text-white" : "bg-slate-100"}`}
                >
                  <div className="flex items-center gap-2 text-[10px] opacity-80 mb-1">
                    <span className="uppercase">{String(msg.sender_role)}</span>
                    {msg.moderation_reason && (
                      <Badge variant="destructive" className="h-4 text-[10px]">
                        flagged
                      </Badge>
                    )}
                    <span>{new Date(msg.created_at as string).toLocaleString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{msg.body as string}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="flex gap-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type a message…"
            className="min-h-[60px]"
          />
          <Button
            onClick={() => body.trim() && m.mutate()}
            disabled={!body.trim() || m.isPending}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
