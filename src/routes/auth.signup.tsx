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
import { getCheckoutSessionSummary } from "@/lib/stripe-checkout.functions";
import { autoConfirmUserEmail } from "@/lib/auth-verification-email.functions";

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
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { plan, email: prefillEmail, redirect } = Route.useSearch();
  const sessionId = useMemo(() => parseSessionId(redirect), [redirect]);
  const summaryFn = useServerFn(getCheckoutSessionSummary);
  const confirmEmailFn = useServerFn(autoConfirmUserEmail);
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
  }, []);

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

  const update = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === "password") setStrength(validatePassword(v).strength);
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
      },
    });
    if (error) {
      setMsg({ type: "error", text: error.message });
      setLoading(false);
      return;
    }

    // Step 2: Auto-confirm email + assign admin role on server
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
            <Input id="su-name" value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Doe" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-email">Email</Label>
            <Input id="su-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-phone">Phone (optional)</Label>
            <Input id="su-phone" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+92 300 0000000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-password">Password</Label>
            <div className="relative">
              <Input
                id="su-password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password && <PasswordStrengthIndicator strength={strength} />}
          </div>
          <div className="space-y-2">
            <Label htmlFor="su-confirm">Confirm password</Label>
            <Input
              id="su-confirm"
              type={showPassword ? "text" : "password"}
              value={form.confirmPassword}
              onChange={(e) => update("confirmPassword", e.target.value)}
              required
            />
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