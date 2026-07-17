import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitReview } from "@/lib/reviews.functions";

export function BuyerReviewForm({ orderId }: { orderId: string }) {
  const fn = useServerFn(submitReview);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const mut = useMutation({
    mutationFn: () => fn({ data: { orderId, direction: "buyer_to_seller", rating, title, body } }),
    onSuccess: (r) => { toast.success(r.status === "pending" ? "Review submitted for review" : "Review published"); setDone(true); },
    onError: (e) => toast.error((e as Error).message),
  });
  if (done) return null;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Rate this order</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1">
          {[1,2,3,4,5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)}
              className={`text-2xl ${n <= rating ? "text-amber-500" : "text-slate-300"}`}>★</button>
          ))}
        </div>
        <div>
          <Label className="text-xs">Title (optional)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Review</Label>
          <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || body.length < 5}>
          Submit review
        </Button>
      </CardContent>
    </Card>
  );
}