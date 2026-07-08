import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: redirect ?? "/dashboard", replace: true });
    });
  }, [navigate, redirect]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      setMsg({ type: "error", text: error.message });
      return;
    }
    setMsg({ type: "success", text: "Signed in! Redirecting…" });
    setTimeout(() => navigate({ to: redirect ?? "/dashboard", replace: true }), 400);
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to your GrainHero account</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="li-email">Email</Label>
            <Input id="li-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="li-password">Password</Label>
            <div className="relative">
              <Input
                id="li-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Link to="/auth/forgot-password" className="text-xs text-[#00a63e] hover:underline">
              Forgot password?
            </Link>
          </div>
          <Message msg={msg} />
          <Button type="submit" disabled={loading} className="w-full bg-[#00a63e] hover:bg-[#029238] text-white">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          New to GrainHero?{" "}
          <Link to="/checkout" className="text-[#00a63e] font-medium hover:underline">
            Choose a plan first
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}