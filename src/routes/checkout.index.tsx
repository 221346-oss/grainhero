import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Check, Shield, Clock, CreditCard, Cpu, ArrowLeft, ArrowRight, MapPin, RefreshCw, AlertCircle, User, Mail, Sparkles, Package, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { getStoredThemeMode, toggleThemeMode, type ThemeMode } from "@/lib/theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import pricingData, { getCheckoutTotals } from "@/lib/pricing-data";
import { supabase } from "@/integrations/supabase/client";
import { createStripeCheckoutSession } from "@/lib/stripe-checkout.functions";
import { getMyOnboardingStatus } from "@/lib/onboarding-status.functions";
import { validateEmail } from "@/lib/validation";
import { AddressMapPicker } from "@/components/checkout/AddressMapPicker";

const DRAFT_KEY = "grainhero.checkoutDraft.v1";
type Draft = {
  selected: string;
  iotQuantity: number;
  customerName: string;
  customerEmail: string;
  customerPassword: string;
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
  const [customerPassword, setCustomerPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Pakistan");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [notes, setNotes] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [taxId, setTaxId] = useState("");
  const draftLoaded = useRef(false);

  // Theme toggle
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  useEffect(() => { setThemeMode(getStoredThemeMode()); }, []);
  const handleThemeToggle = () => { setThemeMode(toggleThemeMode()); };

  // Field validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  // Just trim whitespace — no auto-conversion, user must include country code
  const normalizePhone = (value: string): string => value.trim();

  const isPhoneValid = (value: string): boolean => {
    const n = value.trim();
    if (!n.startsWith("+")) return false;
    const d = n.slice(1).replace(/[\s\-\(\)]/g, "");
    return /^\d+$/.test(d) && d.length >= 7 && d.length <= 15;
  };

  const isNameValid = (value: string): boolean => {
    const parts = value.trim().split(/\s+/).filter((p) => p.length > 0);
    return parts.length >= 2 && parts.every((p) => p.length >= 2);
  };

  // Validation helper
  const validateField = (field: string, value: string) => {
    let result: { isValid: boolean; message: string };
    switch (field) {
      case "customerName": {
        if (!value.trim()) {
          result = { isValid: false, message: "Full name is required" };
        } else if (!isNameValid(value)) {
          const parts = value.trim().split(/\s+/).filter((p) => p.length > 0);
          if (parts.length < 2) {
            result = { isValid: false, message: "Please enter first and last name" };
          } else {
            result = { isValid: false, message: "Each name part must be at least 2 characters" };
          }
        } else {
          result = { isValid: true, message: "" };
        }
        break;
      }
      case "customerEmail":
        result = validateEmail(value);
        break;
      case "phone": {
        const normalized = normalizePhone(value);
        if (!normalized) {
          result = { isValid: false, message: "Phone number is required" };
        } else if (!normalized.startsWith("+")) {
          result = { isValid: false, message: "Must start with + and country code e.g. +1, +44, +92" };
        } else {
          const digits = normalized.slice(1).replace(/[\s\-\(\)]/g, "");
          if (!/^\d+$/.test(digits) || digits.length < 7 || digits.length > 15) {
            result = { isValid: false, message: "Enter a valid phone number e.g. +92 300 1234567" };
          } else {
            result = { isValid: true, message: "" };
          }
        }
        break;
      }
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
    if (d.customerPassword) setCustomerPassword(d.customerPassword);
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
      selected, iotQuantity, customerName, customerEmail, customerPassword, address, city, country, phone,
      preferredDate, notes, businessName, taxId,
    };
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* quota */ }
  }, [selected, iotQuantity, customerName, customerEmail, customerPassword, address, city, country, phone, preferredDate, notes, businessName, taxId]);

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
            lat,
            lng,
            phone: normalizePhone(phone).trim(),
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
    isNameValid(customerName) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) &&
    customerPassword.length >= 8 &&
    address.trim().length > 2 &&
    country.trim().length > 0 &&
    isPhoneValid(phone);

  const planData = pricingData.find((p) => p.id === selected);
  const checkoutTotals = planData ? getCheckoutTotals(selected, iotQuantity) : null;

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
    isNameValid(customerName) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim()) && customerPassword.length >= 8,
    address.trim().length > 2 && country.trim().length > 0 && isPhoneValid(phone),
    canPay,
  ];

  const missingReasons: string[] = [];
  if (iotQuantity < 1) missingReasons.push("Add at least 1 IoT sensor");
  if (!isNameValid(customerName)) missingReasons.push("Enter your full name (first + last, 2+ chars each)");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) missingReasons.push("Enter a valid email");
  if (customerPassword.length < 8) missingReasons.push("Password must be at least 8 characters");
  if (address.trim().length <= 2) missingReasons.push("Enter your install address");
  if (!country.trim()) missingReasons.push("Enter your country");
  if (!isPhoneValid(phone)) missingReasons.push("Enter a valid phone with country code, e.g. +92 300 1234567");

  const goNext = () => {
    if (!stepValid[step]) {
      // Mark all fields on current step as touched so errors show
      if (step === 1) {
        setTouched(prev => ({ ...prev, customerName: true, customerEmail: true }));
        validateField("customerName", customerName);
        validateField("customerEmail", customerEmail);
      } else if (step === 2) {
        setTouched(prev => ({ ...prev, address: true, city: true, country: true, phone: true }));
        validateField("address", address);
        validateField("city", city);
        validateField("country", country);
        validateField("phone", phone);
      }
      toast.error("Please fix the errors above to continue.");
      return;
    }
    setStep((s) => Math.min(3, s + 1));
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goBack = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="min-h-screen py-10 px-4 checkout-bg checkout-inline-bg bg-background transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="text-sm text-muted-foreground hover:text-foreground">
              Already have an account? Sign in
            </Link>
            <button
              type="button"
              onClick={handleThemeToggle}
              aria-label="Toggle theme"
              className="h-8 w-8 grid place-items-center rounded-full border border-border bg-card/80 text-muted-foreground hover:text-foreground transition-colors"
            >
              {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-card/80 backdrop-blur px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 shadow-sm border border-border">
            <Sparkles className="h-3.5 w-3.5" /> Set up in under 3 minutes
          </div>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold text-foreground">{stepMeta[step].label}</h1>
          <p className="text-muted-foreground mt-2">Step {step + 1} of 4 — {step === 3 ? "review and pay securely" : "we'll create your account after payment"}.</p>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-3 shadow-sm">
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
                  className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition ${active ? "bg-emerald-600 text-white shadow" : done ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300" : "text-muted-foreground hover:bg-muted"}`}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full ${active ? "bg-white text-emerald-600" : done ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"} text-xs font-bold`}>
                    {done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className="text-[11px] font-semibold leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
                    <CardDescription>Rs. {(planData?.iotCharge ?? 7000).toLocaleString()} per sensor · our technician installs on-site</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" size="sm" onClick={() => setIotQuantity(Math.max(1, iotQuantity - 1))}>−</Button>
                      <input
                        type="number" min={1} max={50} value={iotQuantity}
                        onChange={(e) => setIotQuantity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                        className="w-20 h-9 px-2 rounded border border-input bg-background text-foreground text-sm text-center"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => setIotQuantity(Math.min(50, iotQuantity + 1))}>+</Button>
                      <span className="text-xs text-slate-500">
                        = Rs. {(checkoutTotals?.iotTotal ?? iotQuantity * 7000).toLocaleString()}
                      </span>
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
                    <div className="md:col-span-2">
                      <Label htmlFor="customer-password">Password * <span className="text-slate-400 font-normal text-xs">(min. 8 characters)</span></Label>
                      <div className="relative">
                        <Input
                          id="customer-password"
                          type={showPassword ? "text" : "password"}
                          value={customerPassword}
                          onChange={(e) => setCustomerPassword(e.target.value)}
                          placeholder="Create a password for your account"
                          className="pr-10"
                          maxLength={128}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {customerPassword.length > 0 && customerPassword.length < 8 && (
                        <p className="text-xs text-red-500 mt-1">Password must be at least 8 characters</p>
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
                      <Label htmlFor="addr">Install location *</Label>
                      <p className="text-xs text-muted-foreground mb-2">Search for an address, drop a pin on the map, or use your current location. Our technician will be routed here.</p>
                      <AddressMapPicker
                        value={{ address, lat, lng }}
                        onChange={(loc) => {
                          setAddress(loc.address);
                          setLat(loc.lat);
                          setLng(loc.lng);
                          if (loc.city) setCity(loc.city);
                          if (loc.country) setCountry(loc.country);
                          if (touched.address) validateField("address", loc.address);
                        }}
                      />
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
                        placeholder="+92 300 1234567 / +1 555 0000" 
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
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-400 font-semibold mb-1">Plan</p>
                    <p className="font-medium text-foreground">{planData?.name} — {planData?.priceFrontend}</p>
                  </div>

                  {/* Buyer */}
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold mb-1">Buyer</p>
                    <p className="text-foreground">{customerName}</p>
                    <p className="text-muted-foreground text-xs">{customerEmail}</p>
                    {businessName && <p className="text-muted-foreground text-xs mt-0.5">Business: {businessName}</p>}
                    {taxId && <p className="text-muted-foreground text-xs">GST / Tax ID: {taxId}</p>}
                  </div>

                  {/* Install site */}
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Install site</p>
                    <p className="text-foreground">{address}, {country}</p>
                    <p className="text-muted-foreground text-xs">Phone: {phone}{preferredDate ? ` · Preferred: ${preferredDate}` : ""}</p>
                  </div>

                  {/* IoT setup */}
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                    <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400 font-semibold">IoT setup</p>
                    <p className="text-foreground">
                      {iotQuantity} sensor(s) × Rs. {(checkoutTotals?.iotUnit ?? 7000).toLocaleString()} = Rs. {(checkoutTotals?.iotTotal ?? iotQuantity * 7000).toLocaleString()}
                    </p>
                  </div>
                  {notes.trim() && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Notes for technician</p>
                      <p className="text-foreground text-sm mt-1 whitespace-pre-wrap">{notes.trim()}</p>
                    </div>
                  )}
                  {checkoutTotals && (
                    <div className="rounded-lg border border-emerald-300 dark:border-emerald-800 bg-card p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Plan (first month)</span>
                        <span className="font-medium">Rs. {checkoutTotals.monthlyPrice.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-muted-foreground">Sensor setup</span>
                        <span className="font-medium">Rs. {checkoutTotals.iotTotal.toLocaleString()}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between font-semibold text-foreground">
                        <span>Total due today</span>
                        <span className="text-emerald-600 dark:text-emerald-400">Rs. {checkoutTotals.dueToday.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                  <Button
                    className="w-full h-11 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white text-base font-semibold shadow-md"
                    disabled={start.isPending || !canPay}
                    onClick={() => start.mutate()}
                  >
                    {start.isPending ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" /> Redirecting to Stripe…</>) : (<><Shield className="h-4 w-4 mr-2" /> Pay securely with Stripe</>)}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">You'll be redirected to Stripe's secure checkout. No charges until you confirm.</p>
                  {!canPay && missingReasons.length > 0 && (
                    <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-3 text-xs text-amber-900 dark:text-amber-300">
                      <p className="font-semibold mb-1">Complete these to enable payment:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {missingReasons.map((r) => (<li key={r}>{r}</li>))}
                      </ul>
                    </div>
                  )}
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
            <Card className="border-border bg-card/90 backdrop-blur shadow-md">
              <CardHeader>
                <CardTitle className="text-base">Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {checkoutTotals && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{checkoutTotals.plan.name} (1st month)</span>
                      <span className="font-medium">Rs. {checkoutTotals.monthlyPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IoT sensors × {checkoutTotals.iotQuantity}</span>
                      <span className="font-medium">Rs. {checkoutTotals.iotTotal.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total due today</span>
                      <span className="text-emerald-600 dark:text-emerald-400">Rs. {checkoutTotals.dueToday.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Then monthly</span>
                      <span>Rs. {checkoutTotals.monthlyPrice.toLocaleString()}/mo</span>
                    </div>
                    <Separator />
                    <ul className="space-y-1.5 text-xs text-muted-foreground">
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