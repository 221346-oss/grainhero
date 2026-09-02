import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSiloDraftRequest } from "@/lib/stripe-checkout.functions";
import { usePlanGate } from "@/lib/plan-gate";
import { toast } from "sonner";
import { ArrowLeft, PlusCircle, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/silo-request")({
  head: () => ({ meta: [{ title: "Request a silo — GrainHero" }] }),
  component: SiloRequestPage,
});

// Pakistani phone: +92 followed by exactly 10 digits (e.g. +923001234567)
// Total length: 13 chars. Also accept 03XXXXXXXXX (11 digits, auto-prefix).
function formatPakistaniPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("92") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+92${digits.slice(1)}`;
  if (digits.length === 10) return `+92${digits}`;
  return raw; // return as-is if unrecognisable
}

function validatePakistaniPhone(val: string): string | null {
  if (!val.trim()) return "Phone number is required";
  const formatted = formatPakistaniPhone(val.trim());
  // Valid: +92 followed by exactly 10 digits = 13 chars total
  if (/^\+92\d{10}$/.test(formatted)) return null;
  return "Enter a valid Pakistani number: +92XXXXXXXXXX (10 digits after +92)";
}

const emptyForm = { address: "", city: "", country: "", phone: "", notes: "" };

function SiloRequestPage() {
  const draftFn = useServerFn(createSiloDraftRequest);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const siloGate = usePlanGate("max_silos");

  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const draftMut = useMutation({
    mutationFn: () =>
      draftFn({
        data: {
          address: form.address.trim(),
          city: form.city.trim() || null,
          country: form.country.trim(),
          phone: formatPakistaniPhone(form.phone.trim()),
          notes: form.notes.trim() || null,
        },
      }),
    onSuccess: () => {
      setSubmitted(true);
      qc.invalidateQueries({ queryKey: ["my-hardware-orders"] });
      qc.invalidateQueries({ queryKey: ["plan-gate"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not submit request"),
  });

  // Plan limit reached — show upgrade prompt instead of the form
  const atLimit = siloGate.data && !siloGate.data.allowed;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <Link
        to="/orders"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> My install orders
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Request a new silo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in your install details and submit. Our team will review and approve your request —
          you'll be notified once it's ready for payment.
        </p>
      </div>

      {/* Success state */}
      {submitted ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-8 text-center space-y-4">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <div>
              <p className="text-lg font-semibold text-emerald-900">Request submitted!</p>
              <p className="text-sm text-emerald-700 mt-1">
                Our team will review your request and notify you once it's approved. You can then
                return to your orders page to complete payment.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setForm(emptyForm);
                  setSubmitted(false);
                }}
              >
                Submit another request
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => navigate({ to: "/orders" })}
              >
                View my orders
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : atLimit ? (
        /* Plan limit reached */
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center space-y-4">
            <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
            <div>
              <p className="text-lg font-semibold text-amber-900">Silo limit reached</p>
              <p className="text-sm text-amber-700 mt-1">
                Your current plan allows up to{" "}
                <strong>
                  {typeof siloGate.data?.limit === "number" ? siloGate.data.limit : "—"}
                </strong>{" "}
                silos and you are already using{" "}
                <strong>
                  {typeof siloGate.data?.used === "number" ? siloGate.data.used : "all"}
                </strong>{" "}
                of them.
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Upgrade your plan to request additional silos.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={() => navigate({ to: "/orders" })}>
                Back to orders
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => navigate({ to: "/plan-management" })}
              >
                Upgrade plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Request form */
        <Card>
          <CardHeader>
            <CardTitle>Install details</CardTitle>
            <CardDescription>Where should the silo hardware be installed?</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                const phoneErr = validatePakistaniPhone(form.phone);
                setPhoneError(phoneErr);
                if (phoneErr) return;
                draftMut.mutate();
              }}
            >
              <div className="grid gap-1.5">
                <Label htmlFor="req-address">Install address *</Label>
                <Input
                  id="req-address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Farm Road, Block A"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="req-city">City</Label>
                  <Input
                    id="req-city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    placeholder="Lahore"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="req-country">Country *</Label>
                  <Input
                    id="req-country"
                    value={form.country}
                    onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                    placeholder="Pakistan"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="req-phone">Contact phone *</Label>
                <Input
                  id="req-phone"
                  value={form.phone}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, phone: e.target.value }));
                    if (phoneError) setPhoneError(validatePakistaniPhone(e.target.value));
                  }}
                  onBlur={(e) => {
                    // Auto-format on blur
                    const formatted = formatPakistaniPhone(e.target.value);
                    setForm((f) => ({ ...f, phone: formatted }));
                    setPhoneError(validatePakistaniPhone(formatted));
                  }}
                  placeholder="+92 300 0000000"
                  maxLength={13}
                  required
                  className={phoneError ? "border-red-400 focus-visible:ring-red-400" : ""}
                />
                {phoneError && <p className="text-xs text-red-500">{phoneError}</p>}
                <p className="text-[11px] text-muted-foreground">
                  Pakistani number — e.g. +923001234567 or 03001234567
                </p>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="req-notes">Notes (optional)</Label>
                <Textarea
                  id="req-notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Preferred install time, access instructions, special requirements…"
                />
              </div>

              {/* What happens next info box */}
              <div className="rounded-lg bg-muted/20 border-border/40 p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">What happens next</p>
                <ol className="list-decimal pl-5 space-y-1 text-xs">
                  <li>Our team reviews your request (usually within 24 hours).</li>
                  <li>You'll receive an in-app notification once approved.</li>
                  <li>
                    Return to <strong>My install orders</strong> and click <strong>Pay now</strong>{" "}
                    to complete payment and lock in your install slot.
                  </li>
                </ol>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/orders" })}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={draftMut.isPending || siloGate.isLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  {draftMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlusCircle className="h-4 w-4" />
                  )}
                  {draftMut.isPending ? "Submitting…" : "Submit request"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
