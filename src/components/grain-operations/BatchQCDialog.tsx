import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { translateText, useI18n } from "@/i18n";
import {
  Loader2,
  FlaskConical,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldX,
  Undo2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  submitBatchQC,
  reviewBatchQC,
  adminReviewBatch,
  resolveRejectedBatch,
} from "@/lib/batch-qc.functions";

export type QCMode = "submit" | "review" | "admin" | "resolve";

type Batch = {
  id: string;
  batch_id: string;
  status: string;
  moisture_content: number | null;
  protein_content: number | null;
  test_weight: number | null;
  intake_conditions: { temperature?: number | null; humidity?: number | null } | null;
};

function invalidateBatches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["grain-batches"] });
  qc.invalidateQueries({ queryKey: ["available-technicians"] });
  qc.invalidateQueries({ queryKey: ["batch-traceability"] });
}

export function BatchQCDialog({
  batch,
  mode,
  open,
  onOpenChange,
}: {
  batch: Batch | null;
  mode: QCMode | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { locale } = useI18n();
  const qc = useQueryClient();
  const submitFn = useServerFn(submitBatchQC);
  const reviewFn = useServerFn(reviewBatchQC);
  const adminFn = useServerFn(adminReviewBatch);
  const resolveFn = useServerFn(resolveRejectedBatch);

  const [moisture, setMoisture] = useState("");
  const [protein, setProtein] = useState("");
  const [testWeight, setTestWeight] = useState("");
  const [temp, setTemp] = useState("");
  const [humidity, setHumidity] = useState("");

  const submitMut = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          batchId: batch!.id,
          moisture_content: moisture ? Number(moisture) : null,
          protein_content: protein ? Number(protein) : null,
          test_weight: testWeight ? Number(testWeight) : null,
          intake_temperature: temp ? Number(temp) : null,
          intake_humidity: humidity ? Number(humidity) : null,
        },
      }),
    onSuccess: () => {
      toast.success(translateText("QC values submitted", locale));
      invalidateBatches(qc);
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error(e.message || translateText("Could not submit QC values", locale)),
  });

  const reviewMut = useMutation({
    mutationFn: (decision: "pass" | "fail") => reviewFn({ data: { batchId: batch!.id, decision } }),
    onSuccess: (_r, decision) => {
      toast.success(
        translateText(
          decision === "pass" ? "QC passed" : "QC failed — sent back to technician",
          locale,
        ),
      );
      invalidateBatches(qc);
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error(e.message || translateText("Could not record review", locale)),
  });

  const adminMut = useMutation({
    mutationFn: (decision: "approve" | "reject") =>
      adminFn({ data: { batchId: batch!.id, decision } }),
    onSuccess: (_r, decision) => {
      toast.success(
        translateText(
          decision === "approve" ? "Batch approved — now stored" : "Batch rejected",
          locale,
        ),
      );
      invalidateBatches(qc);
      onOpenChange(false);
    },
    onError: (e: Error) =>
      toast.error(e.message || translateText("Could not record decision", locale)),
  });

  const resolveMut = useMutation({
    mutationFn: (action: "resend_to_manager" | "mark_damaged") =>
      resolveFn({ data: { batchId: batch!.id, action } }),
    onSuccess: (_r, action) => {
      toast.success(
        translateText(
          action === "resend_to_manager"
            ? "Sent back to Manager for a fresh QC cycle"
            : "Marked damaged",
          locale,
        ),
      );
      invalidateBatches(qc);
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || translateText("Could not resolve", locale)),
  });

  if (!batch || !mode) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {mode === "submit" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-emerald-600" /> Submit QC values
              </DialogTitle>
              <DialogDescription>
                {batch.batch_id} — reviewed by your manager once submitted.
              </DialogDescription>
            </DialogHeader>
            <form
              id="qc-submit-form"
              className="grid grid-cols-2 gap-3 py-2"
              onSubmit={(e) => {
                e.preventDefault();
                submitMut.mutate();
              }}
            >
              <div>
                <Label>Moisture %</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  value={moisture}
                  onChange={(e) => setMoisture(e.target.value)}
                />
              </div>
              <div>
                <Label>Protein %</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
              <div>
                <Label>Test weight</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  value={testWeight}
                  onChange={(e) => setTestWeight(e.target.value)}
                />
              </div>
              <div>
                <Label>Temp °C</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label>Humidity %</Label>
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  value={humidity}
                  onChange={(e) => setHumidity(e.target.value)}
                />
              </div>
            </form>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                form="qc-submit-form"
                type="submit"
                disabled={submitMut.isPending}
                className="gap-2"
              >
                {submitMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FlaskConical className="w-4 h-4" />
                )}{" "}
                Submit for review
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === "review" && (
          <>
            <DialogHeader>
              <DialogTitle>Review QC — {batch.batch_id}</DialogTitle>
              <DialogDescription>Submitted values from the assigned technician.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2 text-sm">
              <div>
                <span className="text-muted-foreground">Moisture</span>
                <p className="font-medium">{batch.moisture_content ?? "—"}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Protein</span>
                <p className="font-medium">{batch.protein_content ?? "—"}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Test weight</span>
                <p className="font-medium">{batch.test_weight ?? "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Temp / Humidity</span>
                <p className="font-medium">
                  {batch.intake_conditions?.temperature ?? "—"}°C /{" "}
                  {batch.intake_conditions?.humidity ?? "—"}%
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={reviewMut.isPending}
                onClick={() => reviewMut.mutate("fail")}
                className="gap-2"
              >
                <XCircle className="w-4 h-4" /> Fail
              </Button>
              <Button
                disabled={reviewMut.isPending}
                onClick={() => reviewMut.mutate("pass")}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {reviewMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}{" "}
                Pass
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === "admin" && (
          <>
            <DialogHeader>
              <DialogTitle>Final review — {batch.batch_id}</DialogTitle>
              <DialogDescription>
                Passed QC. Approving makes it safe to store and fully usable (dispatchable, counted
                in silo occupancy).
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2 text-sm">
              <div>
                <span className="text-muted-foreground">Moisture</span>
                <p className="font-medium">{batch.moisture_content ?? "—"}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Protein</span>
                <p className="font-medium">{batch.protein_content ?? "—"}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Test weight</span>
                <p className="font-medium">{batch.test_weight ?? "—"}</p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={adminMut.isPending}
                onClick={() => adminMut.mutate("reject")}
                className="gap-2"
              >
                <ShieldX className="w-4 h-4" /> Reject
              </Button>
              <Button
                disabled={adminMut.isPending}
                onClick={() => adminMut.mutate("approve")}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {adminMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}{" "}
                Approve
              </Button>
            </DialogFooter>
          </>
        )}

        {mode === "resolve" && (
          <>
            <DialogHeader>
              <DialogTitle>Resolve rejected batch — {batch.batch_id}</DialogTitle>
              <DialogDescription>
                This batch was rejected at final review. Pick what happens next — nothing is
                discarded automatically.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={resolveMut.isPending}
                onClick={() => resolveMut.mutate("mark_damaged")}
                className="gap-2 text-rose-600 border-rose-200 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" /> Mark damaged
              </Button>
              <Button
                disabled={resolveMut.isPending}
                onClick={() => resolveMut.mutate("resend_to_manager")}
                className="gap-2"
              >
                {resolveMut.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Undo2 className="w-4 h-4" />
                )}{" "}
                Resend to Manager
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
