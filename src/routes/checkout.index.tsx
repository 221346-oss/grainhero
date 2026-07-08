import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, Shield, Clock, CreditCard, Cpu, ArrowLeft, ArrowRight, MapPin, RefreshCw, AlertCircle, User, Mail, Sparkles, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import pricingData from "@/lib/pricing-data";
import { supabase } from "@/integrations/supabase/client";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout.functions";
import { getMyOnboardingStatus } from "@/lib/onboarding-status.functions";

const DRAFT_KEY = "grainhero.checkoutDraft.v1";
type Draft = {
  selected: string;
  iotQuantity: number;
  customerName: string;
  customerEmail: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  preferredDate: string;
  notes: string;
  businessName: string;
  taxId: string;
};

function loadDraft(): Partial<Draft> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : null;
  } catch {
    return null;
  }
}

const search = z.object({
  plan: z.enum(["basic", "intermediate", "pro"]).optional(),
  canceled: z.union([z.literal("1"), z.literal(1)]).optional(),
});

export const Route = createFileRoute("/checkout/")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Checkout — GrainHero" },
      { name: "description", content: "Choose your plan and start monitoring your grain." },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const { plan: initial, canceled } = Route.useSearch();
  const [selected, setSelected] = useState<string>(initial ?? "intermediate");
  const [iotQuantity, setIotQuantity] = useState(1);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const draftLoaded = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  // Restore any locally-saved draft (from an interrupted session).
  useEffect(() => {
    if (draftLoaded.current) return;
    draftLoaded.current = true;
    const d = loadDraft();
    if (!d) return;
    const storedPlan = (() => {
      try { return window.localStorage.getItem("selectedPlanId"); } catch { return null; }
    })();
    if (!initial && d.selected) setSelected(d.selected);
    else if (!initial && (storedPlan === "basic" || storedPlan === "intermediate" || storedPlan === "pro")) setSelected(storedPlan);
    if (typeof d.iotQuantity === "number") setIotQuantity(d.iotQuantity);
    if (d.customerName) setCustomerName(d.customerName);
    if (d.customerEmail) setCustomerEmail(d.customerEmail);
    if (d.address) setAddress(d.address);
    if (d.city) setCity(d.city);
    if (d.country) setCountry(d.country);
    if (d.phone) setPhone(d.phone);
    if (d.preferredDate) setPreferredDate(d.preferredDate);
    if (d.notes) setNotes(d.notes);
    if (d.businessName) setBusinessName(d.businessName);
    if (d.taxId) setTaxId(d.taxId);
    if (d.address || d.phone) {
      toast("↩️ Restored your previous checkout details");
    }
  }, [initial]);

  // Persist to localStorage so a page refresh / dropped payment doesn't lose progress.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft: Draft = {
      selected, iotQuantity, customerName, customerEmail, address, city, country, phone,
      preferredDate, notes, businessName, taxId,
    };
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota */ }
  }, [selected, iotQuantity, customerName, customerEmail, address, city, country, phone, preferredDate, notes, businessName, taxId]);

  useEffect(() => {
    if (canceled) toast("Checkout canceled. You can pick a plan and try again.");
  }, [canceled]);

  // If the buyer is logged in, look up any incomplete orders so we can show a resume banner.
  const statusFn = useServerFn(getMyOnboardingStatus);
  const statusQuery = useQuery({
    queryKey: ["checkout-onboarding-status"],
    queryFn: () => statusFn(),
    enabled: authed === true,
  });
  const pending = (statusQuery.data?.pendingOrders ?? []) as Array<{
    id: string; plan_id?: string; plan_name?: string; hardware_quantity?: number;
  }>;

  const startFn = useServerFn(createStripeCheckoutSession);
  const start = useMutation({
    mutationFn: () =>
      startFn({
        data: {
          planId: selected as "basic" | "intermediate" | "pro",
          iotQuantity,
          customer: {
            name: customerName.trim(),
            email: customerEmail.trim().toLowerCase(),
          },
          install: {
            address: address.trim(),
            city: city.trim(),
            country: country.trim(),
            phone: phone.trim(),
            preferredDate: preferredDate || null,
            notes: notes.trim() || null,
            businessName: businessName.trim() || null,
            taxId: taxId.trim() || null,
          },
        },
      }),
    onSuccess: ({ url }) => {
      // Payment is being handed off to Stripe. Keep the draft in localStorage
      // (so the user can resume if Stripe closes without a webhook) — it's
      // cleared from /checkout/success once we detect the subscription is live.
      window.location.href = url;
    },
    onError: (e: Error) => toast.error(e.message ?? "Could not start checkout"),
  });

  const canPay =
    iotQuantity >= 1 &&
    customerName.trim().length > 1 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) &&
    address.trim().length > 2 &&
    city.trim().length > 0 &&
    country.trim().length > 0 &&
    phone.trim().length > 3;

  const planData = pricingData.find((p) => p.id === selected);

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)" }}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <Link to="/auth/login" className="text-sm text-slate-600 hover:text-slate-900">
            Already have an account? Sign in
          </Link>
        </div>

        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Choose your plan</h1>
          <p className="text-slate-600 mt-2">Choose a plan, pay securely, then create your account after payment.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {[
            ["1", "Plan"],
            ["2", "Payment"],
            ["3", "Account"],
            ["4", "Technician"],
          ].map(([n, label]) => (
            <div key={label} className="rounded-xl border border-white/70 bg-white/80 px-4 py-3 text-center shadow-sm">
              <div className="mx-auto mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{n}</div>
              <p className="text-xs font-semibold text-slate-700">{label}</p>
            </div>
          ))}
        </div>

        {canceled && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-amber-900">Payment was canceled</p>
                <p className="text-amber-800">No charges yet — your details are saved and you can try again below.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {authed && pending.length > 0 && (
          <Card className="border-emerald-300 bg-emerald-50">
            <CardContent className="p-4 flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-medium text-emerald-900">Resume your previous checkout</p>
                <p className="text-emerald-800">
                  We saved your {pending[0].plan_name ?? pending[0].plan_id ?? "plan"} order
                  {typeof pending[0].hardware_quantity === "number" ? ` with ${pending[0].hardware_quantity} sensor(s)` : ""}. Pick up right where you left off.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-600 text-emerald-700 hover:bg-emerald-100"
                onClick={() => {
                  const p = pending[0];
                  if (p.plan_id === "basic" || p.plan_id === "intermediate" || p.plan_id === "pro") {
                    setSelected(p.plan_id);
                  }
                  if (typeof p.hardware_quantity === "number") setIotQuantity(p.hardware_quantity);
                }}
              >
                Resume
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          {pricingData.map((p) => {
            const isSel = p.id === selected;
            return (
              <Card
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={`cursor-pointer transition ${isSel ? "border-emerald-500 ring-2 ring-emerald-200 shadow-lg" : "hover:border-slate-300"}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    {p.popular && <Badge className="bg-emerald-600">Popular</Badge>}
                  </div>
                  <CardDescription className="text-xs">{p.description}</CardDescription>
                  <div className="pt-2">
                    <div className="text-2xl font-bold text-slate-900">{p.priceFrontend}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5 text-xs">
                    {p.features.slice(0, 5).map((f: string) => (
                      <li key={f} className="flex items-start gap-2 text-slate-700">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">IoT sensor setup</CardTitle>
              <CardDescription>Rs. 7,000 per sensor · our technician will install on-site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5 text-amber-600" />
                <label htmlFor="iot-qty" className="text-sm">Quantity</label>
                <input
                  id="iot-qty"
                  type="number"
                  min={0}
                  max={50}
                  value={iotQuantity}
                  onChange={(e) => setIotQuantity(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                  className="w-20 h-9 px-2 rounded border border-slate-200 text-sm"
                />
                <span className="text-xs text-slate-500">
                  × Rs. 7,000 = Rs. {(iotQuantity * 7000).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {planData && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>{planData.name}</span>
                    <span>Rs. {planData.price.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>IoT setup × {iotQuantity}</span>
                    <span>Rs. {(iotQuantity * 7000).toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-emerald-600" /> Secure payment via Stripe
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" /> Technician visit scheduled after payment
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Cancel anytime
                    </div>
                  </div>
                  <Button
                    className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
                    disabled={start.isPending || !canPay}
                    onClick={() => start.mutate()}
                  >
                    {start.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay securely with Stripe"}
                  </Button>
                  {!canPay && (
                    <p className="text-[11px] text-amber-700">Fill your name, email, install address, city, country and phone to continue.</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" /> Buyer details</CardTitle>
            <CardDescription>Your account will be created with this email after payment.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="customer-name">Full name *</Label>
                <Input id="customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your name" maxLength={160} />
              </div>
              <div>
                <Label htmlFor="customer-email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input id="customer-email" type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="you@example.com" className="pl-9" maxLength={180} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Install details</CardTitle>
            <CardDescription>Where our technician should install and how to reach you.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="addr">Install address *</Label>
                <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, landmark" maxLength={300} />
              </div>
              <div>
                <Label htmlFor="city">City *</Label>
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={120} />
              </div>
              <div>
                <Label htmlFor="country">Country *</Label>
                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} maxLength={120} />
              </div>
              <div>
                <Label htmlFor="phone">Contact phone *</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 …" maxLength={40} />
              </div>
              <div>
                <Label htmlFor="date">Preferred install date</Label>
                <Input id="date" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="biz">Business name (invoicing)</Label>
                <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={200} />
              </div>
              <div>
                <Label htmlFor="tax">GST / Tax ID</Label>
                <Input id="tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} maxLength={80} />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes for the technician</Label>
                <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Warehouse count, silo count, access instructions, etc." />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}