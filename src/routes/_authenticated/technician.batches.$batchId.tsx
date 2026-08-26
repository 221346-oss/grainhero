import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { submitBatchQC, getMyAssignedBatches } from "@/lib/batch-qc.functions";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Beaker,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MapPin,
  Droplet,
  Thermometer,
  Wind,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/technician/batches/$batchId")({
  head: () => ({ meta: [{ title: "Batch QC — Technician" }] }),
  component: TechnicianBatchDetailPage,
});

const STATUS_LABELS: Record<string, string> = {
  pending_qc: "Awaiting QC",
  qc_submitted: "Submitted",
  qc_failed: "Failed - Resubmit",
  qc_passed: "Passed",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending_qc: { bg: "bg-blue-100", text: "text-blue-800" },
  qc_submitted: { bg: "bg-indigo-100", text: "text-indigo-800" },
  qc_failed: { bg: "bg-red-100", text: "text-red-800" },
  qc_passed: { bg: "bg-emerald-100", text: "text-emerald-800" },
};

type Batch = {
  id: string;
  batch_id: string;
  grain_type: string;
  variety?: string;
  quantity_kg: number;
  status: string;
  created_at: string;
  farmer_name?: string;
  risk_score?: number;
  silo_id?: string;
  moisture_content?: number;
  protein_content?: number;
  test_weight?: number;
  intake_conditions?: { temperature?: number; humidity?: number };
  silos?: { id: string; name: string; silo_id: string }[];
};

function TechnicianBatchDetailPage() {
  const { batchId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const fetchFn = useServerFn(getMyAssignedBatches);
  const submitFn = useServerFn(submitBatchQC);

  const { data } = useQuery({
    queryKey: ["technician.batches"],
    queryFn: () => fetchFn(),
  });

  const batches: Batch[] = data?.batches ?? [];
  const batch = batches.find((b) => b.id === batchId);

  // Form state
  const [moisture, setMoisture] = useState(batch?.moisture_content?.toString() ?? "");
  const [protein, setProtein] = useState(batch?.protein_content?.toString() ?? "");
  const [testWeight, setTestWeight] = useState(batch?.test_weight?.toString() ?? "");
  const [temperature, setTemperature] = useState(
    batch?.intake_conditions?.temperature?.toString() ?? ""
  );
  const [humidity, setHumidity] = useState(batch?.intake_conditions?.humidity?.toString() ?? "");
  const [notes, setNotes] = useState("");

  const submitMut = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          batchId,
          moisture_content: moisture ? parseFloat(moisture) : undefined,
          protein_content: protein ? parseFloat(protein) : undefined,
          test_weight: testWeight ? parseFloat(testWeight) : undefined,
          intake_temperature: temperature ? parseFloat(temperature) : undefined,
          intake_humidity: humidity ? parseFloat(humidity) : undefined,
        },
      }),
    onSuccess: () => {
      toast.success("QC submitted successfully!");
      qc.invalidateQueries({ queryKey: ["technician.batches"] });
      setTimeout(() => navigate({ to: "/technician/batches" }), 1000);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!batch) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Batch not found</p>
      </div>
    );
  }

  const isAwaitingSubmission = batch.status === "pending_qc" || batch.status === "qc_failed";
  const statusColor = STATUS_COLORS[batch.status] || STATUS_COLORS.pending_qc;
  const statusLabel = STATUS_LABELS[batch.status] || batch.status;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/technician/batches" })}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold">{batch.batch_id}</h1>
            <Badge className={`${statusColor.bg} ${statusColor.text} border-0`}>
              {statusLabel}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {batch.grain_type} {batch.variety ? `• ${batch.variety}` : ""}
          </p>
        </div>
      </div>

      {/* Batch Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Quantity</p>
              <p className="text-sm font-semibold">{Number(batch.quantity_kg).toLocaleString()} kg</p>
            </div>
            {batch.silos?.[0] && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Silo
                </p>
                <p className="text-sm font-semibold">{batch.silos[0].name}</p>
              </div>
            )}
            {batch.farmer_name && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Farmer</p>
                <p className="text-sm font-semibold truncate">{batch.farmer_name}</p>
              </div>
            )}
            {batch.risk_score != null && (
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Risk Score</p>
                <p className={`text-sm font-semibold ${batch.risk_score > 7 ? "text-red-600" : ""}`}>
                  {batch.risk_score.toFixed(1)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* QC Form */}
      {isAwaitingSubmission && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5 text-emerald-600" />
              Quality Control (QC) Report
            </CardTitle>
            <CardDescription>
              Submit QC measurements for this batch. All fields are optional but recommended.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Grain Quality Measurements */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Grain Quality Measurements</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="moisture" className="text-xs font-semibold">
                    Moisture Content (%)
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Droplet className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      id="moisture"
                      type="number"
                      placeholder="0.0"
                      min="0"
                      max="100"
                      step="0.1"
                      value={moisture}
                      onChange={(e) => setMoisture(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="protein" className="text-xs font-semibold">
                    Protein Content (%)
                  </Label>
                  <Input
                    id="protein"
                    type="number"
                    placeholder="0.0"
                    min="0"
                    max="100"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="testWeight" className="text-xs font-semibold">
                    Test Weight (lbs/bu or kg)
                  </Label>
                  <Input
                    id="testWeight"
                    type="number"
                    placeholder="0.0"
                    min="0"
                    step="0.1"
                    value={testWeight}
                    onChange={(e) => setTestWeight(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Intake Conditions */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Intake Conditions</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="temperature" className="text-xs font-semibold">
                    Temperature (°C)
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Thermometer className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      id="temperature"
                      type="number"
                      placeholder="0.0"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">°C</span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="humidity" className="text-xs font-semibold">
                    Humidity (%)
                  </Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Wind className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      id="humidity"
                      type="number"
                      placeholder="0.0"
                      min="0"
                      max="100"
                      step="0.1"
                      value={humidity}
                      onChange={(e) => setHumidity(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any observations or comments…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none"
                rows={3}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex gap-2">
              <Button
                onClick={() => submitMut.mutate()}
                disabled={submitMut.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 flex-1"
              >
                {submitMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Submit QC Report
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/technician/batches" })}
                disabled={submitMut.isPending}
              >
                Cancel
              </Button>
            </div>

            {batch.status === "qc_failed" && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">QC Submission Failed</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This batch was returned for resubmission. Please correct the QC values and
                    resubmit.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Info Cards */}
      {batch.status === "qc_submitted" && (
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardContent className="p-4 flex items-start gap-3">
            <Beaker className="h-5 w-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">QC Submitted</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your QC report has been submitted and is awaiting manager review.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {batch.status === "qc_passed" && (
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">QC Approved</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your QC report has been approved by the manager and is now awaiting final admin
                approval.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
