import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitPlatformQuery } from "@/lib/platform-no-admin.functions";
import { Send } from "lucide-react";

export function PlatformQueryForm() {
  const submitFn = useServerFn(submitPlatformQuery);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => submitFn({ data: { subject, message } }),
    onSuccess: () => {
      toast.success("Query sent to platform team");
      setSubject("");
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Contact platform support</CardTitle>
        <CardDescription>Send a question or issue directly to the GrainHero super admin team.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="pq-subject">Subject</Label>
          <Input
            id="pq-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Billing question, hardware issue"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pq-message">Message</Label>
          <Textarea
            id="pq-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your question or issue…"
            rows={3}
          />
        </div>
        <Button
          size="sm"
          disabled={!subject.trim() || message.trim().length < 10 || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {mutation.isPending ? "Sending…" : "Send query"}
        </Button>
      </CardContent>
    </Card>
  );
}
