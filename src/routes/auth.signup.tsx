import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Message, type Msg } from "@/components/auth/AuthShell";
import { SignupOrderSummary } from "@/components/auth/SignupOrderSummary";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { validateSignupForm, validatePassword, type PasswordStrength } from "@/lib/validation";
import { resolvePlanId, type PlanId } from "@/lib/pricing-data";
import { getCheckoutSessionSummary, claimPaidCheckoutForUser } from "@/lib/stripe-checkout.functions";
import { autoConfirmUserEmail } from "@/lib/auth-verification-email.functions";
import { sendWelcomeEmail } from "@/lib/email-automation.functions";
import { syncSignupToHubspot } from "@/lib/hubspot.functions";

const DRAFT_KEY = "grainhero.checkoutDraft.v1";

function parseSessionId(redirect?: string): string | null {
  if (!redirect?.includes("session_id=")) return null;
  try {
    const qs = redirect.includes("?") ? redirect.slice(redirect.indexOf("?")) : `?${redirect}`;
    return new URLSearchParams(qs).get("session_id");
  } catch {
    return null;
  }
}

function loadCheckoutDraft(): { planId: PlanId | null; iotQuantity: number } {
  if (typeof window === "undefined") return { planId: null, iotQuantity: 1 };
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    const draft = raw ? (JSON.parse(raw) as { selected?: string; iotQuantity?: number }) : null;
    const storedPlan = window.localStorage.getItem("selectedPlanId");
    const planId = resolvePlanId(draft?.selected ?? storedPlan);
    const iotQuantity = typeof draft?.iotQuantity === "number" ? draft.iotQuantity : 1;
    return { planId, iotQuantity };
  } catch {
    return { planId: null, iotQuantity: 1 };
  }
}

const search = z.object({
  plan: z.string().optional(),
  email: z.string().email().optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth/signup")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Create your account — GrainHero" },
      { name: "description", content: "Start monitoring your grain in minutes." },
      { property: 'og:title', content: "Create your account — GrainHero" },
      { property: 'og:description', content: "Start monitoring your grain in minutes." },
      { property: 'og:url', content: 'https://grainhero.app/auth/signup' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
    links: [{ rel: 'canonical', href: 'https://grainhero.app/auth/signup' }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { plan, email: prefillEmail, redirect } = Route.useSearch();
  const sessionId = useMemo(() => parseSessionId(redirect), [redirect]);
  const summaryFn = useServerFn(getCheckoutSessionSummary);
  const confirmEmailFn = useServerFn(autoConfirmUserEmail);
  const claimFn = useServerFn(claimPaidCheckoutForUser);
  const summaryQuery = useQuery({
    queryKey: ["signup-checkout-summary", sessionId],
    queryFn: () => summaryFn({ data: { sessionId: sessionId! } }),
    enabled: Boolean(sessionId),
  });
  const [draftPlan, setDraftPlan] = useState<{ planId: PlanId | null; iotQuantity: number }>({
    planId: null,
    iotQuantity: 1,
  });

  useEffect(() => {
    setDraftPlan(loadCheckoutDraft());

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate({ to: redirect ?? "/dashboard", replace: true });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        navigate({ to: redirect ?? "/dashboard", replace: true });
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [navigate, redirect]);

  const orderPlanId = useMemo(() => {
    if (summaryQuery.data?.planName) {
      const fromSummary = resolvePlanId(summaryQuery.data.planName);
      if (fromSummary) return fromSummary;
    }
    return resolvePlanId(plan) ?? draftPlan.planId;
  }, [summaryQuery.data?.planName, plan, draftPlan.planId]);

  const orderIotQuantity = useMemo(() => {
    const fromSummary = summaryQuery.data?.hardwareQuantity;
    if (typeof fromSummary === "number" && fromSummary > 0) return fromSummary;
    return draftPlan.iotQuantity;
  }, [summaryQuery.data?.hardwareQuantity, draftPlan.iotQuantity]);

  const showOrderSummary = Boolean(orderPlanId);
  const orderPaid = Boolean(summaryQuery.data?.paid);

  const [form, setForm] = useState({
    name: "",
    email: prefillEmail ?? "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [strength, setStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isValid: false });
  const [touched, setTouched] = useState<Record<keyof typeof form, boolean>>({
    name: false, email: false, phone: false, password: false, confirmPassword: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<keyof typeof form, string>>({
    name: "", email: "", phone: "", password: "", confirmPassword: "",
  });

  const update = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "password") setStrength(validatePassword(v).strength);
    
    // Real-time validation on change (if field was touched)
    if (touched[k]) {
      validateSingleField(k, v);
    }
  };

  const validateSingleField = (field: keyof typeof form, value: string) => {
    const result = validateSignupForm({ ...form, [field]: value });
    setFieldErrors(prev => ({
      ...prev,
      [field]: result.errors[field] || ""
    }));
  };

  const handleBlur = (field: keyof typeof form) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateSingleField(field, form[field]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const { isValid, errors } = validateSignupForm(form);
    if (!isValid) {
      setMsg({ type: "error", text: Object.values(errors)[0] });
      return;
    }
    setLoading(true);
    const safeRedirect = redirect?.startsWith("/") ? redirect : null;
    const normalizedEmail = form.email.trim().toLowerCase();

    // Step 1: Register account
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: form.password,
      options: {
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          business_type: "farm",
        },
        emailRedirectTo: `${window.location.origin}/auth/verify-otp`,
      },
    });
    
    if (error) {
      setMsg({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    // Check if email confirmation is required
    const needsEmailConfirmation = data?.user && !data.user.email_confirmed_at && data.user.identities?.length === 0;
    
    if (needsEmailConfirmation) {
      // Store email for verification page
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pendingVerificationEmail", normalizedEmail);
      }
      setMsg({ 
        type: "success", 
        text: "Account created! Please check your email to verify your account." 
      });
      setLoading(false);
      // Redirect to verification page after 2 seconds
      setTimeout(() => {
        navigate({ to: "/auth/verify-otp", search: { email: normalizedEmail } });
      }, 2000);
      return;
    }

    // Step 2: Auto-confirm email + assign admin role on server (only if email confirmation is disabled)
    try {
      await confirmEmailFn({ data: { email: normalizedEmail } });
    } catch (e) {
      console.warn("[signup] auto-confirm failed (continuing):", (e as Error).message);
    }

    // Step 3: Sign in with the same credentials
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: form.password,
    });
    setLoading(false);
    if (signInError) {
      setMsg({ type: "error", text: `Account created but sign-in failed: ${signInError.message}` });
      return;
    }

    if (orderPaid || sessionId) {
      try {
        await claimFn({ data: sessionId ? { sessionId } : {} });
      } catch (e) {
        console.warn("[signup] claim checkout failed:", (e as Error).message);
      }
    }

    // Fire-and-forget: welcome email + HubSpot sync (don't block the redirect).
    const [firstName, ...rest] = form.name.trim().split(/\s+/);
    void sendWelcomeEmail().catch((e) => console.warn("[signup] welcome email failed:", e));
    void syncSignupToHubspot({
      data: {
        email: normalizedEmail,
        firstName,
        lastName: rest.join(" ") || undefined,
        phone: form.phone.trim() || undefined,
        company: form.name.trim(),
      },
    }).catch((e) => console.warn("[signup] hubspot sync failed:", e));

    // Step 4: Redirect directly to dashboard (or original redirect target)
    if (safeRedirect) navigate({ to: safeRedirect as never });
    else if (plan) navigate({ to: "/checkout", search: { plan } as never });
    else navigate({ to: "/dashboard" });
  };


  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            {orderPaid ? "Finish setup for your paid plan" : "Start monitoring your grain in minutes"}
          </p>
        </div>
        {showOrderSummary && orderPlanId && (
          <SignupOrderSummary planId={orderPlanId} iotQuantity={orderIotQuantity} paid={orderPaid} />
        )}
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="su-name">Full name</Label>
            <Input 
              id="su-name" 
              value={form.name} 
              onChange={(e) => update("name", e.target.value)} 
              onBlur={() => handleBlur("name")}
              placeholder="e.g., Ahmed Khan" 
              required
              className={touched.name && fieldErrors.name ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {touched.name && fieldErrors.name && (
              <p className="text-xs text-red-600">{fieldErrors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-email">Email</Label>
            <Input 
              id="su-email" 
              type="email" 
              value={form.email} 
              onChange={(e) => update("email", e.target.value)} 
              onBlur={() => handleBlur("email")}
              placeholder="ahmed@grainstorage.pk" 
              required
              className={touched.email && fieldErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {touched.email && fieldErrors.email && (
              <p className="text-xs text-red-600">{fieldErrors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-phone">Phone (optional)</Label>
            <Input 
              id="su-phone" 
              value={form.phone} 
              onChange={(e) => update("phone", e.target.value)} 
              onBlur={() => handleBlur("phone")}
              placeholder="+92 300 1234567"
              className={touched.phone && fieldErrors.phone ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {touched.phone && fieldErrors.phone && (
              <p className="text-xs text-red-600">{fieldErrors.phone}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-password">Password</Label>
            <div className="relative">
              <Input
                id="su-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                required
                className={`pr-10 ${touched.password && fieldErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password && <PasswordStrengthIndicator strength={strength} />}
            {touched.password && fieldErrors.password && (
              <p className="text-xs text-red-600">{fieldErrors.password}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-confirm">Confirm password</Label>
            <Input
              id="su-confirm"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              required
              className={touched.confirmPassword && fieldErrors.confirmPassword ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {touched.confirmPassword && fieldErrors.confirmPassword && (
              <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
            )}
          </div>
          <Message msg={msg} />
          <Button type="submit" disabled={loading} className="w-full bg-[#00a63e] hover:bg-[#029238] text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-[#00a63e] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}