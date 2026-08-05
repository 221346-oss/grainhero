import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageShell } from "@/components/app/admin/AdminPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { listReviewsForModeration, moderateReview } from "@/lib/reviews.functions";

export const Route = createFileRoute("/_authenticated/platform/reviews")({
  head: () => ({
    meta: [
      { title: "Platform · Reviews — Grain Hero" },
      { name: "description", content: "Platform · Reviews workspace in the Grain Hero platform — private, sign-in required." },
      { property: "og:title", content: "Platform · Reviews — Grain Hero" },
      { property: "og:description", content: "Platform · Reviews workspace in the Grain Hero platform." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReviewModerationPage,
});

function ReviewModerationPage() {
  const load = useServerFn(listReviewsForModeration);
  const decide = useServerFn(moderateReview);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["review-moderation"],
    queryFn: () => load(),
  });
  const mut = useMutation({
    mutationFn: (v: { reviewId: string; decision: "published" | "rejected" }) => decide({ data: v }),
    onSuccess: () => {
      toast.success("Review updated");
      qc.invalidateQueries({ queryKey: ["review-moderation"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const rows = data?.reviews ?? [];
  return (
    <AdminPageShell
      title="Review moderation"
      subtitle="Approve or reject buyer and seller reviews before they appear on the marketplace."
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">No reviews to moderate.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-sm">
                  {r.direction === "buyer_to_seller" ? "Buyer → Seller" : "Seller → Buyer"} · {"★".repeat(r.rating)}
                </CardTitle>
                <Badge variant={r.status === "pending" ? "secondary" : "outline"}>{r.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                {r.title && <div className="text-sm font-medium">{r.title}</div>}
                <div className="text-sm whitespace-pre-wrap">{r.body}</div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => mut.mutate({ reviewId: r.id, decision: "published" })}
                    disabled={mut.isPending || r.status === "published"}>Publish</Button>
                  <Button size="sm" variant="outline"
                    onClick={() => mut.mutate({ reviewId: r.id, decision: "rejected" })}
                    disabled={mut.isPending || r.status === "rejected"}>Reject</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}