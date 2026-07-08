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
import { validateEmail, validateName, validatePhone } from "@/lib/validation";

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

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  // Validation helper
  const validateField = (field: string, value: string) => {
    let result: { isValid: boolean; message: string };
    switch (field) {
      case "customerName":
        result = validateName(value);
        break;
      case "customerEmail":
        result = validateEmail(value);
        break;
      case "phone":
        result = validatePhone(value);
        break;
      case "address":
        result = !value.trim() || value.trim().length < 3
          ? { isValid: false, message: "Address must be at least 3 characters" }
          : { isValid: true, message: "" };
        break;
      case "city":
        result = !value.trim()
          ? { isValid: false, message: "City is required" }
          : { isValid: true, message: "" };
        break;
      case "country":
        result = !value.trim()
          ? { isValid: false, message: "Country is required" }
          : { isValid: true, message: "" };
        break;
      default:
        result = { isValid: true, message: "" };
    }
    
    setErrors(prev => ({ ...prev, [field]: result.message }));
    return result.isValid;
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

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

  // Wizard steps: 0 Plan · 1 Buyer · 2 Install · 3 Review & Pay
  const [step, setStep] = useState(0);
  const stepMeta = [
    { n: 1, label: "Plan", icon: Package },
    { n: 2, label: "Buyer", icon: User },
    { n: 3, label: "Install", icon: MapPin },
    { n: 4, label: "Review & Pay", icon: CreditCard },
  ];
  const stepValid = [
    !!selected && iotQuantity >= 1,
    customerName.trim().length > 1 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()),
    address.trim().length > 2 && city.trim().length > 0 && country.trim().length > 0 && phone.trim().length > 3,
    canPay,
  ];

  const goNext = () => {
    if (!stepValid[step]) {
      toast.error("Please complete the highlighted fields to continue.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

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
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" /> Set up in under 3 minutes
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-slate-900">{stepMeta[step].label}</h1>
          <p className="text-slate-600 mt-2">Step {step + 1} of 4 — {step === 3 ? "review and pay securely" : "we'll create your account after payment"}.</p>
        </div>

        <div className="rounded-2xl border border-white/70 bg-white/70 backdrop-blur p-3 shadow-sm">
          <div className="grid grid-cols-4 gap-2">
            {stepMeta.map((s, i) => {
              const Icon = s.icon;
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => { if (i < step || stepValid.slice(0, i).every(Boolean)) setStep(i); }}
                  className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition ${active ? "bg-emerald-600 text-white shadow" : done ? "bg-emerald-100 text-emerald-800" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white text-emerald-600" : done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"} text-xs font-bold`}>
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-[11px] font-semibold leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-sky-500 transition-all" style={{ width: `${((step + 1) / 4) * 100}%` }} />
          </div>
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

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Step content */}
          <div className="space-y-6">
            {step === 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  {pricingData.map((p) => {
                    const isSel = p.id === selected;
                    return (
                      <Card
                        key={p.id}
                        onClick={() => setSelected(p.id)}
                        className={`cursor-pointer transition ${isSel ? "border-emerald-500 ring-2 ring-emerald-200 shadow-lg scale-[1.01]" : "hover:border-slate-300 hover:shadow-md"}`}
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
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Cpu className="h-4 w-4 text-amber-600" /> IoT sensor setup</CardTitle>
                    <CardDescription>Rs. 7,000 per sensor · our technician installs on-site</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIotQuantity(Math.max(1, iotQuantity - 1))}>−</Button>
                      <input
                        type="number" min={1} max={50} value={iotQuantity}
                        onChange={(e) => setIotQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                        className="w-20 h-9 px-2 rounded border border-slate-200 text-sm text-center"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => setIotQuantity(Math.min(50, iotQuantity + 1))}>+</Button>
                      <span className="text-xs text-slate-500">= Rs. {(iotQuantity * 7000).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Grand Total Summary */}
                <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-sky-50">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Monthly subscription</span>
                        <span className="font-medium">Rs. {planData?.price.toLocaleString()}/mo</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">IoT setup (one-time)</span>
                        <span className="font-medium">Rs. {(iotQuantity * 7000).toLocaleString()}</span>
                      </div>
                      <Separator className="bg-slate-300" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-base font-semibold text-slate-900">Total due today</span>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-700">
                            Rs. {((planData?.price ?? 0) + iotQuantity * 7000).toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Then Rs. {planData?.price.toLocaleString()}/month
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {step === 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4 text-emerald-600" /> Buyer details</CardTitle>
                  <CardDescription>Your account will be created with this email after payment.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="customer-name">Full name *</Label>
                      <Input 
                        id="customer-name" 
                        value={customerName} 
                        onChange={(e) => {
                          setCustomerName(e.target.value);
                          if (touched.customerName) validateField("customerName", e.target.value);
                        }}
                        onBlur={() => {
                          handleBlur("customerName");
                          validateField("customerName", customerName);
                        }}
                        placeholder="e.g., Ahmed Khan" 
                        maxLength={160}
                        className={touched.customerName && errors.customerName ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {touched.customerName && errors.customerName && (
                        <p className="text-xs text-red-600 mt-1">{errors.customerName}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="customer-email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input 
                          id="customer-email" 
                          type="email" 
                          value={customerEmail} 
                          onChange={(e) => {
                            setCustomerEmail(e.target.value);
                            if (touched.customerEmail) validateField("customerEmail", e.target.value);
                          }}
                          onBlur={() => {
                            handleBlur("customerEmail");
                            validateField("customerEmail", customerEmail);
                          }}
                          placeholder="ahmed@grainstorage.pk" 
                          className={`pl-9 ${touched.customerEmail && errors.customerEmail ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          maxLength={180} 
                        />
                      </div>
                      {touched.customerEmail && errors.customerEmail && (
                        <p className="text-xs text-red-600 mt-1">{errors.customerEmail}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-600" /> Install details</CardTitle>
                  <CardDescription>Where our technician should install and how to reach you.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <Label htmlFor="addr">Install address *</Label>
                      <Input 
                        id="addr" 
                        value={address} 
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (touched.address) validateField("address", e.target.value);
                        }}
                        onBlur={() => {
                          handleBlur("address");
                          validateField("address", address);
                        }}
                        placeholder="e.g., Main Bazar Road, near Grain Market, Faisalabad" 
                        maxLength={300}
                        className={touched.address && errors.address ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {touched.address && errors.address && (
                        <p className="text-xs text-red-600 mt-1">{errors.address}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="city">City *</Label>
                      <Input 
                        id="city" 
                        value={city} 
                        onChange={(e) => {
                          setCity(e.target.value);
                          if (touched.city) validateField("city", e.target.value);
                        }}
                        onBlur={() => {
                          handleBlur("city");
                          validateField("city", city);
                        }}
                        placeholder="e.g., Lahore, Faisalabad, Multan" 
                        maxLength={120}
                        className={touched.city && errors.city ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {touched.city && errors.city && (
                        <p className="text-xs text-red-600 mt-1">{errors.city}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="country">Country *</Label>
                      <Input 
                        id="country" 
                        value={country} 
                        onChange={(e) => {
                          setCountry(e.target.value);
                          if (touched.country) validateField("country", e.target.value);
                        }}
                        onBlur={() => {
                          handleBlur("country");
                          validateField("country", country);
                        }}
                        maxLength={120}
                        className={touched.country && errors.country ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {touched.country && errors.country && (
                        <p className="text-xs text-red-600 mt-1">{errors.country}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="phone">Contact phone *</Label>
                      <Input 
                        id="phone" 
                        value={phone} 
                        onChange={(e) => {
                          setPhone(e.target.value);
                          if (touched.phone) validateField("phone", e.target.value);
                        }}
                        onBlur={() => {
                          handleBlur("phone");
                          validateField("phone", phone);
                        }}
                        placeholder="+92 300 1234567" 
                        maxLength={40}
                        className={touched.phone && errors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
                      />
                      {touched.phone && errors.phone && (
                        <p className="text-xs text-red-600 mt-1">{errors.phone}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="date">Preferred install date</Label>
                      <Input id="date" type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="biz">Business name (invoicing)</Label>
                      <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g., Khan Grain Storage Pvt. Ltd." maxLength={200} />
                    </div>
                    <div>
                      <Label htmlFor="tax">GST / Tax ID</Label>
                      <Input id="tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="e.g., 12-3456789-0" maxLength={80} />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="notes">Notes for the technician</Label>
                      <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="e.g., 3 warehouses, 12 silos total, access via back gate, need 2-day advance notice" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <Card className="border-emerald-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Review your order</CardTitle>
                  <CardDescription>Confirm everything looks right before we hand you to Stripe.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {/* Plan */}
                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-1">Plan</p>
                    <p className="font-medium text-slate-900">{planData?.name} — {planData?.priceFrontend}</p>
                  </div>

                  {/* Buyer */}
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Buyer</p>
                    <p className="text-slate-900">{customerName}</p>
                    <p className="text-slate-600 text-xs">{customerEmail}</p>
                    {businessName && <p className="text-slate-600 text-xs mt-0.5">Business: {businessName}</p>}
                    {taxId && <p className="text-slate-600 text-xs">GST / Tax ID: {taxId}</p>}
                  </div>

                  {/* Install site */}
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Install site</p>
                    <p className="text-slate-900">{address}</p>
                    <p className="text-slate-600 text-xs">{city}, {country}</p>
                    <p className="text-slate-600 text-xs">Phone: {phone}</p>
                    {preferredDate && <p className="text-slate-600 text-xs">Preferred date: {preferredDate}</p>}
                  </div>

                  {/* IoT setup */}
                  <div className="rounded-lg bg-amber-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold mb-1">IoT setup (one-time)</p>
                    <p className="text-slate-900">{iotQuantity} sensor(s) × Rs. 7,000 = <span className="font-semibold">Rs. {(iotQuantity * 7000).toLocaleString()}</span></p>
                  </div>

                  {/* Technician notes */}
                  {notes && (
                    <div className="rounded-lg bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-wide text-slate-500 font-semibold mb-1">Notes for technician</p>
                      <p className="text-slate-700 text-xs whitespace-pre-wrap">{notes}</p>
                    </div>
                  )}

                  {/* Pricing breakdown */}
                  <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Subscription (first month)</span>
                      <span>Rs. {planData?.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>IoT sensor setup</span>
                      <span>Rs. {(iotQuantity * 7000).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-bold text-slate-900">
                      <span>Total charged today</span>
                      <span>Rs. {((planData?.price ?? 0) + iotQuantity * 7000).toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Then Rs. {planData?.price.toLocaleString()}/mo recurring. Cancel anytime.</p>
                  </div>

                  <Button
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white text-base font-semibold shadow-md"
                    disabled={start.isPending || !canPay}
                    onClick={() => start.mutate()}
                  >
                    {start.isPending ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirecting to Stripe…</>) : (<><Shield className="h-4 w-4 mr-2" /> Pay securely with Stripe</>)}
                  </Button>
                  <p className="text-[11px] text-slate-500 text-center">You'll be redirected to Stripe's secure checkout. No charges until you confirm.</p>
                </CardContent>
              </Card>
            )}

            {/* Nav buttons */}
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {step < 3 ? (
                <Button type="button" onClick={goNext} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : null}
            </div>
          </div>

          {/* Sticky summary */}
          <aside className="lg:sticky lg:top-6 h-fit">
            <Card className="border-white/70 bg-white/80 backdrop-blur shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {planData && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">{planData.name} (monthly)</span>
                      <span className="font-medium">Rs. {planData.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">IoT setup × {iotQuantity}</span>
                      <span className="font-medium">Rs. {(iotQuantity * 7000).toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-base font-bold text-slate-900">
                      <span>Total due today</span>
                      <span>Rs. {(planData.price + iotQuantity * 7000).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Then every month</span>
                      <span>Rs. {planData.price.toLocaleString()}/mo</span>
                    </div>
                    <Separator />
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      <li className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-emerald-600" /> Secure Stripe checkout</li>
                      <li className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-emerald-600" /> Technician visit after payment</li>
                      <li className="flex items-center gap-2"><CreditCard className="h-3.5 w-3.5 text-emerald-600" /> Cancel anytime</li>
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}