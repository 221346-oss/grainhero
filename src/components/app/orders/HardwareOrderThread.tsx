import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { listOrderMessages, sendOrderMessage } from "@/lib/hardware-orders.functions";

export function HardwareOrderThread({
  orderId,
  as,
}: {
  orderId: string;
  as: "admin" | "super_admin";
}) {
  const listFn = useServerFn(listOrderMessages);
  const sendFn = useServerFn(sendOrderMessage);
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["hardware-order-messages", orderId],
    queryFn: () => listFn({ data: { orderId } }),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  const send = useMutation({
    mutationFn: () =>
      sendFn({ data: { orderId, message: body, emailBuyer: as === "super_admin" } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["hardware-order-messages", orderId] });
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
          {isLoading && <div className="text-muted-foreground text-xs">Loading…</div>}
          {!isLoading && !data?.messages?.length && (
            <div className="text-muted-foreground text-xs">No messages yet.</div>
          )}
          {data?.messages?.map((msg) => {
            const mine = (msg.sender_role as string) === as;
            return (
              <div key={msg.id as string} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    mine ? "bg-emerald-600 text-white" : "bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] opacity-80 mb-1 uppercase">
                    <span>{String(msg.sender_role).replace("_", " ")}</span>
                    <span>{new Date(msg.created_at as string).toLocaleString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{msg.message as string}</div>
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
            placeholder={as === "admin" ? "Reply to support…" : "Message the buyer…"}
            className="min-h-[60px]"
          />
          <Button
            onClick={() => body.trim() && send.mutate()}
            disabled={!body.trim() || send.isPending}
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}