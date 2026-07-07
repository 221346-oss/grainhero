import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Message, type Msg } from "@/components/auth/AuthShell";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { validateSignupForm, validatePassword, type PasswordStrength } from "@/lib/validation";

const search = z.object({
  plan: z.string().optional(),
  email: z.string().email().optional(),
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
  const { plan, email: prefillEmail } = Route.useSearch();
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
    const redirectQs = plan ? `?plan=${encodeURIComponent(plan)}&email=${encodeURIComponent(form.email)}` : "";
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/login${redirectQs}`,
        data: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          business_type: "farm",
        },
      },
    });
    setLoading(false);
    if (error) {
      setMsg({ type: "error", text: error.message });
      return;
    }
    if (data.user && !data.session) {
      setMsg({ type: "success", text: "Check your inbox to confirm your email, then sign in." });
      return;
    }
    // Auto-confirmed / already signed in
    if (plan) navigate({ to: "/checkout", search: { plan } as never });
    else navigate({ to: "/dashboard" });
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Create your account</h1>
          <p className="text-sm text-muted-foreground">Start monitoring your grain in minutes</p>
        </div>
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