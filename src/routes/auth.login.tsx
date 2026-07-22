import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Message, type Msg } from "@/components/auth/AuthShell";

const search = z.object({
  prefill: z.string().email().optional(),
  redirect: z.string().optional(),
  reason: z.enum(["idle", "expired", "external"]).optional(),
});

export const Route = createFileRoute("/auth/login")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — GrainHero" },
      { name: "description", content: "Sign in to your GrainHero account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { prefill, redirect, reason } = Route.useSearch();
  const [email, setEmail] = useState(prefill ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(
    reason === "idle"
      ? { type: "info", text: "You were signed out for inactivity." }
      : reason === "expired"
        ? { type: "info", text: "Your session expired. Please sign in again." }
        : reason === "external"
          ? { type: "info", text: "Signed out from another tab." }
          : null,
  );

  // If already signed in, go straight to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate({ to: redirect ?? "/dashboard", replace: true });
      }
    });
  }, [navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { 
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin + (redirect ?? "/dashboard"),
      },
    });
    setLoading(false);
    if (error) {
      setMsg({ type: "error", text: error.message });
      return;
    }
    navigate({ to: "/auth/verify-otp", search: { email: normalizedEmail } });
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email — we'll send a 6-digit code
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="li-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="li-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="pl-9"
                required
                autoFocus
              />
            </div>
          </div>

          <Message msg={msg} />

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send code"}
          </Button>
        </form>

        <p className="text-sm text-center text-muted-foreground">
          New to GrainHero?{" "}
          <Link to="/checkout" className="text-[#00a63e] font-medium hover:underline">
            Choose a plan first
          </Link>
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors inline-flex items-center gap-1">
            ← Go to home
          </Link>
          <span>·</span>
          <Link to="/auth/forgot-password" className="hover:text-[#00a63e] hover:underline transition-colors">
            Forgot password?
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
