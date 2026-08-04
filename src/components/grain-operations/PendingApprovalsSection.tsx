import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Package, User, Calendar, Weight, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { listPendingApprovalBatches, reviewManagerBatch } from "@/lib/batch-qc.functions";

type Batch = {
  id: string;
  batch_id: string;
  grain_type: string;
  variety: string | null;
  quantity_kg: number;
  silo: { id: string; name: string } | null;
  warehouse: { id: string; name: string } | null;
  created_by_profile: { id: string; name: string | null; email: string | null } | null;
  created_at: string;
  farmer_name: string | null;
  source_location: string | null;
  notes: string | null;
};

export function PendingApprovalsSection() {
  const qc = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const listFn = useServerFn(listPendingApprovalBatches);
  const reviewFn = useServerFn(reviewManagerBatch);

  const { data, isLoading } = useQuery({
    queryKey: ["pending-approval-batches"],
    queryFn: () => listFn(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const batches = (data?.batches ?? []) as Batch[];

  const reviewMutation = useMutation({
    mutationFn: (params: {
      batchId: string;
      decision: "approve" | "reject";
      rejectionReason?: string;
    }) => reviewFn({ data: params }),
    onSuccess: (result, variables) => {
      toast.success(
        variables.decision === "approve"
          ? "Batch approved and added to storage"
          : "Batch rejected and manager notified",
      );
      setReviewDialogOpen(false);
      setSelectedBatch(null);
      setDecision(null);
      setRejectionReason("");
      qc.invalidateQueries({ queryKey: ["pending-approval-batches"] });
      qc.invalidateQueries({ queryKey: ["grain-batches"] });
      qc.invalidateQueries({ queryKey: ["silos"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleReview = (batch: Batch, reviewDecision: "approve" | "reject") => {
    setSelectedBatch(batch);
    setDecision(reviewDecision);
    setReviewDialogOpen(true);
  };

  const confirmReview = () => {
    if (!selectedBatch || !decision) return;
    reviewMutation.mutate({
      batchId: selectedBatch.id,
      decision,
      rejectionReason: decision === "reject" ? rejectionReason : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No batches pending approval</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pending Approvals</h3>
          <p className="text-sm text-muted-foreground">
            {batches.length} batch{batches.length !== 1 ? "es" : ""} awaiting your review
          </p>
        </div>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          {batches.length} Pending
        </Badge>
      </div>

      <div className="grid gap-4">
        {batches.map((batch) => (
          <Card key={batch.id} className="overflow-hidden">
            <CardHeader className="pb-3 bg-muted/30">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {batch.batch_id}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {batch.grain_type}
                    {batch.variety ? ` · ${batch.variety}` : ""}
                  </CardDescription>
                </div>
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  Pending Approval
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                <div className="flex items-center gap-2">
                  <Weight className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-medium">{batch.quantity_kg.toLocaleString()} kg</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created by</p>
                    <p className="font-medium truncate">
                      {batch.created_by_profile?.name ||
                        batch.created_by_profile?.email ||
                        "Unknown"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(batch.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Destination</p>
                    <p className="font-medium truncate">{batch.silo?.name || "—"}</p>
                  </div>
                </div>
              </div>

              {(batch.farmer_name || batch.source_location || batch.notes) && (
                <div className="text-xs text-muted-foreground space-y-1 mb-3 p-3 bg-muted/30 rounded-lg">
                  {batch.farmer_name && (
                    <p>
                      <strong>Farmer:</strong> {batch.farmer_name}
                    </p>
                  )}
                  {batch.source_location && (
                    <p>
                      <strong>Source:</strong> {batch.source_location}
                    </p>
                  )}
                  {batch.notes && (
                    <p>
                      <strong>Notes:</strong> {batch.notes}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleReview(batch, "approve")}
                  disabled={reviewMutation.isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                  onClick={() => handleReview(batch, "reject")}
                  disabled={reviewMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision === "approve" ? "Approve Batch" : "Reject Batch"}</DialogTitle>
            <DialogDescription>
              {decision === "approve"
                ? `Approving ${selectedBatch?.batch_id} will add ${selectedBatch?.quantity_kg.toLocaleString()}kg to ${selectedBatch?.silo?.name || "the silo"} and mark it as stored.`
                : `Rejecting ${selectedBatch?.batch_id} will notify the manager and prevent this batch from entering storage.`}
            </DialogDescription>
          </DialogHeader>

          {decision === "reject" && (
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="Explain why this batch is being rejected..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={confirmReview}
              disabled={
                reviewMutation.isPending || (decision === "reject" && !rejectionReason.trim())
              }
              className={
                decision === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {reviewMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : decision === "approve" ? (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {decision === "approve" ? "Approve Batch" : "Reject Batch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
