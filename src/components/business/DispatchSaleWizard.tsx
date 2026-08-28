import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, FileText, Loader2, ScanLine, Truck, Upload, UserCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  listSiloAvailableBatches,
  createDispatchFromSilo,
  createDispatchPhotoUploadUrl,
  confirmDispatchBuyer,
  approveDispatch,
  listSilosWithActiveDispatch,
} from "@/lib/dispatches.functions";
import {
  createDispatchInvoice,
  recordDispatchPayment,
  createReceiptUploadUrl,
} from "@/lib/dispatch-sales.functions";
import { listBuyers, listSilos } from "@/lib/operations.functions";
import { extractPaymentDetails, type ExtractedPaymentDetails } from "@/lib/ocr-service";
import { supabase } from "@/integrations/supabase/client";
import { KG_PER_MAN, kgToMan, pricePerKgToPerMan } from "@/lib/units";
import { translateText, useI18n } from "@/i18n";

type Step = "details" | "invoice" | "dispatch" | "payment" | "complete";
type Batch = { id: string; batch_id: string; grain_type: string; remaining_kg: number | string };
type Buyer = { id: string; name: string; company_name: string | null };
type Silo = { id: string; name: string; silo_id: string };

function money(n: number, ccy: string) {
  return `${ccy} ${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function DispatchSaleWizard({
  open,
  onOpenChange,
  onDone,
  resumeDispatch,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onDone?: () => void;
  /** Reopen straight at the payment step for an already-approved dispatch that was closed before a receipt was recorded — see the Outstanding payments table in RevenueSection. */
  resumeDispatch?: { id: string; dispatchNumber: string } | null;
}) {
  const { locale } = useI18n();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("details");

  // --- shared sale details ---
  const [siloId, setSiloId] = useState("");
  const [grainType, setGrainType] = useState("");
  const [buyerId, setBuyerId] = useState("");
  const [newBuyer, setNewBuyer] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [currency] = useState("PKR");
  const [vehicle, setVehicle] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverContact, setDriverContact] = useState("");
  const [driverCnic, setDriverCnic] = useState("");
  const [destination, setDestination] = useState("");
  const [expected, setExpected] = useState("");
  const [notes, setNotes] = useState("");
  const [dispatchPhotoFile, setDispatchPhotoFile] = useState<File | null>(null);
  const [dispatchPhotoPath, setDispatchPhotoPath] = useState<string | null>(null);
  const [dispatchPhotoUploading, setDispatchPhotoUploading] = useState(false);

  // --- result state carried across steps ---
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState<string | null>(null);
  const [dispatchId, setDispatchId] = useState<string | null>(null);
  const [dispatchNumber, setDispatchNumber] = useState<string | null>(null);
  const [buyerConfirmed, setBuyerConfirmed] = useState(false);
  const [dispatchApproved, setDispatchApproved] = useState(false);

  // --- payment / OCR state ---
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedPaymentDetails | null>(null);
  const [receiptPath, setReceiptPath] = useState<string | null>(null);
  // OCR is best-effort auto-fill — when it errors out or can't find an amount,
  // fall back to letting the admin type the details in instead of hard-blocking.
  const [ocrFailed, setOcrFailed] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualReference, setManualReference] = useState("");
  const [manualDate, setManualDate] = useState("");

  useEffect(() => {
    if (open) {
      setSiloId("");
      setGrainType("");
      setBuyerId("");
      setNewBuyer("");
      setQty("");
      setPrice("");
      setVehicle("");
      setDriverName("");
      setDriverContact("");
      setDriverCnic("");
      setDestination("");
      setExpected("");
      setNotes("");
      setDispatchPhotoFile(null);
      setDispatchPhotoPath(null);
      setInvoiceId(null);
      setInvoiceNumber(null);
      setReceiptFile(null);
      setExtracted(null);
      setReceiptPath(null);
      setOcrFailed(false);
      setManualAmount("");
      setManualReference("");
      setManualDate("");
      if (resumeDispatch) {
        // Invoice/dispatch/approval already happened in an earlier session —
        // only the payment step was left incomplete.
        setDispatchId(resumeDispatch.id);
        setDispatchNumber(resumeDispatch.dispatchNumber);
        setBuyerConfirmed(true);
        setDispatchApproved(true);
        setStep("payment");
      } else {
        setDispatchId(null);
        setDispatchNumber(null);
        setBuyerConfirmed(false);
        setDispatchApproved(false);
        setStep("details");
      }
    }
  }, [open, resumeDispatch]);

  const listSilosFn = useServerFn(listSilos);
  const listBatchesFn = useServerFn(listSiloAvailableBatches);
  const listBuyersFn = useServerFn(listBuyers);
  const createInvoiceFn = useServerFn(createDispatchInvoice);
  const createDispatchFn = useServerFn(createDispatchFromSilo);
  const signDispatchPhotoFn = useServerFn(createDispatchPhotoUploadUrl);
  const confirmBuyerFn = useServerFn(confirmDispatchBuyer);
  const approveFn = useServerFn(approveDispatch);
  const signUploadFn = useServerFn(createReceiptUploadUrl);
  const recordPaymentFn = useServerFn(recordDispatchPayment);
  const listActiveFn = useServerFn(listSilosWithActiveDispatch);

  const silosQ = useQuery({
    queryKey: ["wizard-silos"],
    queryFn: () => listSilosFn(),
    enabled: open,
  });
  const buyersQ = useQuery({
    queryKey: ["buyers-mini"],
    queryFn: () => listBuyersFn(),
    enabled: open,
  });
  const activeDispatchQ = useQuery({
    queryKey: ["silos-active-dispatch"],
    queryFn: () => listActiveFn(),
    enabled: open,
  });
  const activeBySilo = useMemo(() => {
    const m = new Map<string, { dispatch_number: string; status: string }>();
    for (const a of activeDispatchQ.data?.active ?? []) m.set(a.silo_id, a);
    return m;
  }, [activeDispatchQ.data]);
  const siloPending = siloId ? activeBySilo.get(siloId) : undefined;
  const batchesQ = useQuery({
    queryKey: ["silo-batches", siloId],
    queryFn: () => listBatchesFn({ data: { siloId } }),
    enabled: open && !!siloId,
  });

  const silos = (silosQ.data ?? []) as Silo[];
  const batches = (batchesQ.data?.batches ?? []) as Batch[];
  const grainTypes = useMemo(
    () => Array.from(new Set(batches.map((b) => b.grain_type))),
    [batches],
  );
  useEffect(() => {
    if (!grainType && grainTypes.length > 0) setGrainType(grainTypes[0]);
  }, [grainTypes, grainType]);

  const qtyNum = Number(qty) || 0;
  const priceNum = Number(price) || 0;
  const total = qtyNum * priceNum;
  const available = batches
    .filter((b) => b.grain_type === grainType)
    .reduce((s, b) => s + Number(b.remaining_kg ?? 0), 0);

  const detailsValid =
    !!siloId &&
    !siloPending &&
    !!grainType &&
    qtyNum > 0 &&
    priceNum > 0 &&
    (!!buyerId || !!newBuyer.trim());

  const invoiceMut = useMutation({
    mutationFn: () => {
      // Validated here (not via a disabled button) so a missing/invalid field
      // always produces a clear toast instead of the button silently doing
      // nothing — same pattern as the silo-card DispatchDialog's mutationFn.
      if (!siloId) throw new Error("Pick a silo first");
      if (batches.length === 0) throw new Error("This silo has no available stock to invoice");
      if (!grainType) throw new Error("Pick a grain type");
      if (!(qtyNum > 0)) throw new Error("Enter a valid quantity greater than 0");
      if (qtyNum > available)
        throw new Error(
          `Only ${available.toLocaleString()} kg of ${grainType} available in this silo`,
        );
      if (!(priceNum > 0)) throw new Error("Enter a valid price greater than 0");
      if (!buyerId && !newBuyer.trim()) throw new Error("Pick a buyer or enter a new buyer name");
      return createInvoiceFn({
        data: {
          buyerId: buyerId || null,
          newBuyer: !buyerId && newBuyer.trim() ? { name: newBuyer.trim() } : null,
          grainType,
          qtyKg: qtyNum,
          pricePerKg: priceNum,
          currency,
          notes: notes || null,
        },
      });
    },
    onSuccess: (r) => {
      setInvoiceId(r.id);
      setInvoiceNumber(r.invoiceNumber);
      if (r.buyerId) setBuyerId(r.buyerId);
      toast.success(translateText(`Invoice ${r.invoiceNumber} generated`, locale));
      setStep("invoice");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleDispatchPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setDispatchPhotoFile(f);
    setDispatchPhotoUploading(true);
    try {
      const signed = await signDispatchPhotoFn({ data: { filename: f.name } });
      const up = await supabase.storage
        .from("dispatch-photos")
        .uploadToSignedUrl(signed.path, signed.token, f);
      if (up.error) throw up.error;
      setDispatchPhotoPath(signed.path);
    } catch (err) {
      toast.error((err as Error).message || translateText("Photo upload failed", locale));
      setDispatchPhotoFile(null);
    } finally {
      setDispatchPhotoUploading(false);
      e.target.value = "";
    }
  }

  const dispatchMut = useMutation({
    mutationFn: () =>
      createDispatchFn({
        data: {
          siloId,
          grainType,
          qtyKg: qtyNum,
          pricePerKg: priceNum,
          currency,
          buyerId: buyerId || null,
          newBuyer: !buyerId && newBuyer.trim() ? { name: newBuyer.trim() } : null,
          invoiceId: invoiceId,
          vehicleNumber: vehicle || null,
          driverName: driverName || null,
          driverContact: driverContact || null,
          driverCnic: driverCnic || null,
          dispatchPhotoPath: dispatchPhotoPath,
          destination: destination || null,
          notes: notes || null,
          expectedDate: expected || null,
          stage: "staged",
        },
      }),
    onSuccess: (r) => {
      setDispatchId(r.id);
      setDispatchNumber(r.dispatchNumber);
      toast.success(
        translateText(
          `Dispatch ${r.dispatchNumber} created — confirm with the buyer, then finalize`,
          locale,
        ),
      );
      qc.invalidateQueries({ queryKey: ["revenue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const confirmBuyerMut = useMutation({
    mutationFn: () => confirmBuyerFn({ data: { id: dispatchId! } }),
    onSuccess: () => {
      setBuyerConfirmed(true);
      toast.success(translateText("Buyer confirmation recorded", locale));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approveMut = useMutation({
    mutationFn: () => approveFn({ data: { id: dispatchId! } }),
    onSuccess: () => {
      setDispatchApproved(true);
      toast.success(translateText("Dispatch approved — stock deducted", locale));
      qc.invalidateQueries({ queryKey: ["revenue"] });
      qc.invalidateQueries({ queryKey: ["silos"] });
      setStep("payment");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleReceiptChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !dispatchId) return;
    setReceiptFile(f);
    setExtracted(null);
    setOcrFailed(false);
    setManualAmount("");
    setManualReference("");
    setManualDate("");
    setOcrBusy(true);
    try {
      // Upload first, independent of OCR — a receipt the admin picked should
      // still get attached to the payment even if the OCR pass below fails.
      const signed = await signUploadFn({ data: { dispatchId, filename: f.name } });
      const up = await supabase.storage
        .from("payment-receipts")
        .uploadToSignedUrl(signed.path, signed.token, f);
      if (up.error) throw up.error;
      setReceiptPath(signed.path);

      try {
        const ocrResult = await extractPaymentDetails(f);
        setExtracted(ocrResult);
        if (!ocrResult.amount) {
          setOcrFailed(true);
          toast.warning(
            translateText("Couldn't detect an amount on this receipt — enter it manually below", locale),
          );
        }
      } catch {
        setOcrFailed(true);
        toast.warning(
          "Couldn't scan this receipt automatically — enter the details manually below",
        );
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setOcrBusy(false);
      e.target.value = "";
    }
  }

  const manualAmountNum = Number(manualAmount) || 0;
  const effectiveAmount = extracted?.amount ?? (manualAmountNum > 0 ? manualAmountNum : null);

  const paymentMut = useMutation({
    mutationFn: () => {
      if (!effectiveAmount) throw new Error("Enter a payment amount");
      return recordPaymentFn({
        data: {
          dispatchId: dispatchId!,
          amount: effectiveAmount,
          paymentMethod: "bank_transfer",
          paymentReference: extracted?.paymentId ?? (manualReference.trim() || null),
          paymentDate: extracted?.date
            ? new Date(extracted.date).toISOString()
            : manualDate
              ? new Date(manualDate).toISOString()
              : null,
          receiptUrl: receiptPath,
          ocrExtracted: extracted
            ? {
                paymentId: extracted.paymentId,
                amount: extracted.amount,
                date: extracted.date,
                confidence: extracted.confidence,
              }
            : { manualEntry: true, amount: effectiveAmount },
        },
      });
    },
    onSuccess: () => {
      toast.success(translateText("Payment recorded", locale));
      qc.invalidateQueries({ queryKey: ["revenue"] });
      setStep("complete");
      onDone?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-emerald-600" />
            {resumeDispatch
              ? `Complete payment — ${resumeDispatch.dispatchNumber}`
              : "New sale — Invoice → Dispatch → Payment"}
          </SheetTitle>
          <SheetDescription>
            {step === "details" && "Step 1 of 3 · Sale details (invoice is optional)"}
            {step === "invoice" && "Step 1 of 3 · Invoice generated"}
            {step === "dispatch" &&
              "Step 2 of 3 · Dispatch (confirm with buyer, then finalize to deduct stock)"}
            {step === "payment" && "Step 3 of 3 · Payment (via OCR receipt scan)"}
            {step === "complete" && "Done"}
          </SheetDescription>
        </SheetHeader>

        {step === "details" && (
          <div className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Silo</Label>
                <Select value={siloId} onValueChange={setSiloId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select silo" />
                  </SelectTrigger>
                  <SelectContent>
                    {silos.map((s) => {
                      const pending = activeBySilo.get(s.id);
                      return (
                        <SelectItem key={s.id} value={s.id} disabled={!!pending}>
                          {s.name} ({s.silo_id}){pending ? " — dispatch pending" : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {siloPending && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    {siloPending.dispatch_number} is already {siloPending.status} against this silo
                    — resolve it first.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Grain</Label>
                <Select value={grainType} onValueChange={setGrainType} disabled={!siloId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Grain type" />
                  </SelectTrigger>
                  <SelectContent>
                    {grainTypes.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {siloId && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Available: {available.toLocaleString()} kg (~{kgToMan(available).toFixed(1)}{" "}
                    man)
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Quantity (kg)</Label>
                <Input
                  className="h-9"
                  type="number"
                  min="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="e.g. 2000"
                />
                {qtyNum > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ≈ {kgToMan(qtyNum).toFixed(2)} man
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Price / kg ({currency})</Label>
                <Input
                  className="h-9"
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 120"
                />
                {priceNum > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    ≈ {money(pricePerKgToPerMan(priceNum), currency)} / man
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-xs">Buyer</Label>
              <Select
                value={buyerId}
                onValueChange={(v) => {
                  setBuyerId(v);
                  setNewBuyer("");
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select existing buyer" />
                </SelectTrigger>
                <SelectContent>
                  {(buyersQ.data ?? []).map((b: Buyer) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                      {b.company_name ? ` · ${b.company_name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-9 mt-2"
                placeholder="…or new buyer name"
                value={newBuyer}
                onChange={(e) => {
                  setNewBuyer(e.target.value);
                  if (e.target.value) setBuyerId("");
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                className="h-9"
                placeholder="Vehicle / truck #"
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              />
              <Input
                className="h-9"
                placeholder="Driver name"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                className="h-9"
                placeholder="Driver phone"
                value={driverContact}
                onChange={(e) => setDriverContact(e.target.value)}
              />
              <Input
                className="h-9"
                placeholder="Driver CNIC"
                value={driverCnic}
                onChange={(e) => setDriverCnic(e.target.value)}
              />
            </div>
            <Input
              className="h-9"
              placeholder="Destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
            <Textarea
              rows={2}
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

            <div>
              <Label className="text-xs">Dispatch / truck photo (optional)</Label>
              <div className="mt-1 flex items-center gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs cursor-pointer hover:border-emerald-500/50">
                  <Upload className="h-3.5 w-3.5" />{" "}
                  {dispatchPhotoFile ? dispatchPhotoFile.name : "Choose photo…"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleDispatchPhotoChange}
                    disabled={dispatchPhotoUploading}
                  />
                </label>
                {dispatchPhotoUploading && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </div>
            </div>

            {qtyNum > 0 && priceNum > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue</span>
                  <span className="font-semibold tabular-nums">{money(total, currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priced at</span>
                  <span className="tabular-nums">
                    {money(priceNum, currency)}/kg · {money(pricePerKgToPerMan(priceNum), currency)}
                    /man ({KG_PER_MAN}kg)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "invoice" && (
          <div className="py-4 space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
              <FileText className="h-5 w-5 text-emerald-600 mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Invoice {invoiceNumber} generated</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {money(total, currency)} for {qtyNum.toLocaleString()} kg (~
                  {kgToMan(qtyNum).toFixed(1)} man) of {grainType}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Proceeding creates a dispatch draft — grain isn&apos;t deducted from the silo until an
              admin approves it.
            </p>
          </div>
        )}

        {step === "dispatch" && (
          <div className="py-4 space-y-3">
            {!dispatchId ? (
              <p className="text-sm text-muted-foreground">
                Ready to submit the dispatch request — sent to the buyer for confirmation before you
                finalize it.
              </p>
            ) : !buyerConfirmed ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                <Truck className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">
                    Dispatch {dispatchNumber} sent to buyer
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Awaiting buyer confirmation. Buyers don&apos;t have an account in this system,
                    so once they&apos;ve confirmed the sale (call, message, signed note), record it
                    below on their behalf.
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-emerald-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">Buyer confirmation recorded</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Ready to finalize — this deducts stock from the silo now.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "payment" && (
          <div className="py-2 space-y-3">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
              Dispatch {dispatchNumber} approved — stock deducted. Upload the payment receipt
              screenshot to record payment.
            </div>
            <div>
              <Label className="text-xs">Payment receipt screenshot</Label>
              <div className="mt-1 flex items-center gap-2">
                <label className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs cursor-pointer hover:border-emerald-500/50">
                  <Upload className="h-3.5 w-3.5" />{" "}
                  {receiptFile ? receiptFile.name : "Choose image…"}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleReceiptChange}
                    disabled={ocrBusy}
                  />
                </label>
                {ocrBusy && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ScanLine className="h-3.5 w-3.5 animate-pulse" /> Scanning…
                  </span>
                )}
              </div>
            </div>

            {extracted && (
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ScanLine className="h-3 w-3" /> Extracted from receipt (OCR — not editable)
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment ID</span>
                  <span className="font-mono">{extracted.paymentId ?? "not detected"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className={`font-semibold ${!extracted.amount ? "text-red-600" : ""}`}>
                    {extracted.amount ? money(extracted.amount, currency) : "not detected"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>{extracted.date ?? "not detected (will use today)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OCR confidence</span>
                  <span>{extracted.confidence.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {ocrFailed && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <ScanLine className="h-3 w-3" /> Couldn&apos;t read this automatically — enter it
                  manually
                </div>
                <div>
                  <Label className="text-xs">Amount ({currency}) *</Label>
                  <Input
                    className="h-9"
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="e.g. 240000"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Payment reference (optional)</Label>
                    <Input
                      className="h-9"
                      value={manualReference}
                      onChange={(e) => setManualReference(e.target.value)}
                      placeholder="Txn / ref #"
                      disabled={!!extracted?.paymentId}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Payment date (optional)</Label>
                    <Input
                      className="h-9"
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      disabled={!!extracted?.date}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "complete" && (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
            <div className="font-semibold">Sale complete</div>
            <div className="text-xs text-muted-foreground">
              Invoice → Dispatch → Payment recorded. Visible in Revenue.
            </div>
          </div>
        )}

        <SheetFooter className="gap-2">
          {step === "details" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                disabled={!detailsValid}
                onClick={() => setStep("dispatch")}
              >
                Skip invoice → Dispatch
              </Button>
              <Button
                disabled={invoiceMut.isPending}
                onClick={() => invoiceMut.mutate()}
                className="gap-1.5"
              >
                {invoiceMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}{" "}
                Generate invoice
              </Button>
            </>
          )}
          {step === "invoice" && (
            <Button onClick={() => setStep("dispatch")} className="gap-1.5">
              <Truck className="h-4 w-4" /> Proceed to dispatch
            </Button>
          )}
          {step === "dispatch" && !dispatchId && (
            <Button
              disabled={dispatchMut.isPending}
              onClick={() => dispatchMut.mutate()}
              className="gap-1.5"
            >
              {dispatchMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )}{" "}
              Submit dispatch request
            </Button>
          )}
          {step === "dispatch" && dispatchId && !buyerConfirmed && !dispatchApproved && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close (confirm/approve later in Grain Operations)
              </Button>
              <Button
                disabled={confirmBuyerMut.isPending}
                onClick={() => confirmBuyerMut.mutate()}
                className="gap-1.5"
              >
                {confirmBuyerMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}{" "}
                Confirm on buyer&apos;s behalf
              </Button>
            </>
          )}
          {step === "dispatch" && dispatchId && buyerConfirmed && !dispatchApproved && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close (approve later in Grain Operations)
              </Button>
              <Button
                disabled={approveMut.isPending}
                onClick={() => approveMut.mutate()}
                className="gap-1.5"
              >
                {approveMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}{" "}
                Approve & dispatch now
              </Button>
            </>
          )}
          {step === "payment" && (
            <Button
              disabled={!effectiveAmount || paymentMut.isPending}
              onClick={() => paymentMut.mutate()}
              className="gap-1.5"
            >
              {paymentMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}{" "}
              Confirm payment
            </Button>
          )}
          {step === "complete" && <Button onClick={() => onOpenChange(false)}>Close</Button>}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
