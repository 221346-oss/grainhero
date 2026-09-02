import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Message, type Msg } from "@/components/auth/AuthShell";
import { getAuthRedirectOrigin } from "@/lib/app-url";

export const Route = createFileRoute("/auth/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — GrainHero" },
      { name: "description", content: "Request a password reset link for your GrainHero account." },
      { property: "og:title", content: "Reset password — GrainHero" },
      {
        property: "og:description",
        content: "Request a password reset link for your GrainHero account.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const redirectOrigin = getAuthRedirectOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${redirectOrigin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) setMsg({ type: "error", text: error.message });
    else setMsg({ type: "success", text: "Check your inbox for a reset link." });
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Reset password</h1>
          <p className="text-sm text-muted-foreground">We'll email you a secure reset link</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fp-email">Email</Label>
            <Input
              id="fp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Message msg={msg} />
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00a63e] hover:bg-[#029238] text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send reset link"}
          </Button>
        </form>
        <p className="text-sm text-center text-muted-foreground">
          <Link to="/auth/login" className="text-[#00a63e] hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
